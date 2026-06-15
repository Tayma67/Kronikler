// Bağlamlı diyalog — NPC kişiliği + ruh hali + ilişki + hafızaya göre cevap.
import { NPC } from "./world";
import { tFor } from "./i18n";
import { quirkL, goalL, professionNameL, Lang } from "./locale-data";

export interface Intent { id: string; label: string; icon: string; }
export const INTENTS: Intent[] = [
  { id: "hosbes",  label: "Hoşbeş et",  icon: "speaker" },
  { id: "iltifat", label: "İltifat et",  icon: "lyre" },
  { id: "dert",    label: "Dert dinle",  icon: "prayer-beads" },
  { id: "saka",    label: "Şaka yap",    icon: "party" },
  { id: "is",      label: "İşini sor",   icon: "anvil" },
  { id: "aile",    label: "Ailesini sor",icon: "baby" },
  { id: "dunya",   label: "Dünyayı konuş",icon: "scroll" },
  { id: "hedef",   label: "Hayalini sor", icon: "star" },
];

export interface ConvResult { line: string; moodDelta: number; relDelta: number; memory: string; }

function moodTier(m: number): "küs" | "soğuk" | "nötr" | "sıcak" | "neşeli" {
  if (m <= -40) return "küs"; if (m < -10) return "soğuk"; if (m <= 10) return "nötr"; if (m < 45) return "sıcak"; return "neşeli";
}
function relTier(r: number): "yabancı" | "tanıdık" | "dost" | "candost" {
  if (r >= 70) return "candost"; if (r >= 40) return "dost"; if (r >= 15) return "tanıdık"; return "yabancı";
}

// Bir konuşma niyetini, NPC'nin kişilik/ruh hali/ilişki bağlamında çözer. Metin seçilen dile göre.
export function converse(npc: NPC, mood: number, rel: number, charisma: number, intent: string, lang: Lang = "tr"): ConvResult {
  const mt = moodTier(mood); const rt = relTier(rel); const t = npc.trait;
  const hitch = mt === "küs" || mt === "soğuk";
  const fn = (npc.name.split(" ")[0]);
  const q = quirkL(npc.quirk, lang);
  const L = (k: string) => tFor(lang, k).replace("%n", fn).replace("%q", q);

  if (intent === "hosbes") {
    const line = hitch ? L("dlg.hosbes.hitch") : rt === "yabancı" ? L("dlg.hosbes.stranger") : L("dlg.hosbes.warm");
    return { line, moodDelta: hitch ? 2 : 5, relDelta: hitch ? 2 : 4, memory: L("dlg.hosbes.m") };
  }
  if (intent === "iltifat") {
    const backfire = t === "kibirli" || t === "ciddi" || mt === "küs";
    if (backfire) return { line: L("dlg.iltifat.bad"), moodDelta: -3, relDelta: -2, memory: L("dlg.iltifat.bad.m") };
    const gain = 5 + Math.floor(charisma);
    return { line: L("dlg.iltifat.good"), moodDelta: 8, relDelta: gain, memory: L("dlg.iltifat.good.m") };
  }
  if (intent === "dert") {
    const opens = t === "dertli" || t === "yalnız" || t === "sıcakkanlı" || rt !== "yabancı";
    if (!opens) return { line: L("dlg.dert.closed"), moodDelta: 1, relDelta: 2, memory: L("dlg.dert.closed.m") };
    return { line: L("dlg.dert.open"), moodDelta: 10, relDelta: 8, memory: L("dlg.dert.open.m") };
  }
  if (intent === "is") {
    const pn = professionNameL(npc.profession, lang);
    const line = (hitch ? L("dlg.is.cold") : L("dlg.is.warm")).replace("%p", pn);
    return { line, moodDelta: hitch ? 1 : 4, relDelta: hitch ? 1 : 3, memory: L("dlg.is.m") };
  }
  if (intent === "aile") {
    const opens = rt !== "yabancı" || t === "sıcakkanlı" || t === "dertli";
    if (!opens) return { line: L("dlg.aile.closed"), moodDelta: 1, relDelta: 1, memory: L("dlg.aile.closed.m") };
    return { line: L("dlg.aile.open"), moodDelta: 6, relDelta: 5, memory: L("dlg.aile.open.m") };
  }
  if (intent === "dunya") {
    return { line: L("dlg.dunya.line"), moodDelta: 3, relDelta: 3, memory: L("dlg.dunya.m") };
  }
  if (intent === "hedef") {
    const line = L("dlg.hedef.line").replace("%g", goalL(npc.goal, lang));
    return { line, moodDelta: rt === "yabancı" ? 2 : 7, relDelta: rt === "yabancı" ? 2 : 6, memory: L("dlg.hedef.m") };
  }
  // şaka
  const likes = t === "neşeli" || t === "sıcakkanlı";
  const dislikes = t === "ciddi" || t === "dindar" || t === "kibirli";
  if (dislikes && mt !== "neşeli") return { line: L("dlg.saka.bad"), moodDelta: -4, relDelta: -3, memory: L("dlg.saka.bad.m") };
  if (likes) return { line: L("dlg.saka.good"), moodDelta: 12, relDelta: 7, memory: L("dlg.saka.good.m") };
  return { line: L("dlg.saka.mild"), moodDelta: 5, relDelta: 4, memory: L("dlg.saka.mild.m") };
}

// NPC bazen kendi gündemini açar (Vercel _spontaneous_line). Ruh haline/hedefe göre; boş dönebilir.
export function spontaneousLine(npc: NPC, mood: number, lang: Lang = "tr"): string {
  const fn = npc.name.split(" ")[0];
  const L = (k: string) => tFor(lang, k).replace("%n", fn).replace("%g", goalL(npc.goal, lang));
  const mt = moodTier(mood);
  if (mt === "neşeli") return L("dlg.spont.happy");
  if (mt === "küs" || mt === "soğuk") return L("dlg.spont.sad");
  return Math.random() < 0.5 ? L("dlg.spont.goal") : "";
}
// Yapısal anı türüne göre sohbette geçmişe gönderme (Vercel _memory_callback). Boş dönebilir.
export function callbackLine(npc: NPC, memTur: string, lang: Lang = "tr"): string {
  const map: Record<string, string> = {
    hediye: "dlg.cb.gift", comert_hediye: "dlg.cb.gift", yardim: "dlg.cb.help",
    hakaret: "dlg.cb.insult", alay: "dlg.cb.insult", somuru: "dlg.cb.exploit",
    icten_sohbet: "dlg.cb.warm", guzel_sohbet: "dlg.cb.warm",
  };
  const k = map[memTur]; if (!k) return "";
  return tFor(lang, k).replace("%n", npc.name.split(" ")[0]);
}

export function moodLabel(m: number): string {
  return { "küs": "Küskün", "soğuk": "Soğuk", "nötr": "Kayıtsız", "sıcak": "Sıcak", "neşeli": "Neşeli" }[moodTier(m)];
}
// Yerelleştirme için ruh hali anahtarı (i18n: dlg.mood.<key>).
export function moodKey(m: number): string {
  return { "küs": "kus", "soğuk": "soguk", "nötr": "notr", "sıcak": "sicak", "neşeli": "neseli" }[moodTier(m)];
}
