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

// Algı selamı: halkın seni görüşü (feared/beloved...) sohbet açılışına yansır. Anahtar yoksa boş döner (ham anahtar sızmaz).
export function perceptionGreeting(lang: Lang, key: string): string {
  const base = "pp.greet." + key;
  const roll = Math.random(); // üç ağız: aynı algının farklı selamları
  if (roll < 0.34) { const alt = tFor(lang, base + ".c"); if (alt !== base + ".c") return alt; }
  if (roll < 0.67) { const alt = tFor(lang, base + ".b"); if (alt !== base + ".b") return alt; }
  const v = tFor(lang, base); return v === base ? "" : v;
}

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
  // Tekrarı azalt: aynı niyetin sıcak/olumlu satırı birkaç çeşitten rastgele seçilir (base + base2…).
  const pick = (base: string, n: number) => { const i = Math.floor(Math.random() * n); return L(i === 0 ? base : base + (i + 1)); };

  if (intent === "hosbes") {
    const line = hitch ? L("dlg.hosbes.hitch") : rt === "yabancı" ? pick("dlg.hosbes.stranger", 2) : pick("dlg.hosbes.warm", 2);
    return { line, moodDelta: hitch ? 2 : 5, relDelta: hitch ? 2 : 4, memory: L("dlg.hosbes.m") };
  }
  if (intent === "iltifat") {
    const backfire = t === "kibirli" || t === "ciddi" || mt === "küs";
    if (backfire) return { line: pick("dlg.iltifat.bad", 2), moodDelta: -3, relDelta: -2, memory: L("dlg.iltifat.bad.m") };
    const gain = 5 + Math.floor(charisma);
    return { line: pick("dlg.iltifat.good", 2), moodDelta: 8, relDelta: gain, memory: L("dlg.iltifat.good.m") };
  }
  if (intent === "dert") {
    const opens = t === "dertli" || t === "yalnız" || t === "sıcakkanlı" || rt !== "yabancı";
    if (!opens) return { line: pick("dlg.dert.closed", 2), moodDelta: 1, relDelta: 2, memory: L("dlg.dert.closed.m") };
    return { line: pick("dlg.dert.open", 2), moodDelta: 10, relDelta: 8, memory: L("dlg.dert.open.m") };
  }
  if (intent === "is") {
    const pn = professionNameL(npc.profession, lang);
    const line = (hitch ? pick("dlg.is.cold", 2) : pick("dlg.is.warm", 2)).replace("%p", pn);
    return { line, moodDelta: hitch ? 1 : 4, relDelta: hitch ? 1 : 3, memory: L("dlg.is.m") };
  }
  if (intent === "aile") {
    const opens = rt !== "yabancı" || t === "sıcakkanlı" || t === "dertli";
    if (!opens) return { line: pick("dlg.aile.closed", 2), moodDelta: 1, relDelta: 1, memory: L("dlg.aile.closed.m") };
    return { line: pick("dlg.aile.open", 2), moodDelta: 6, relDelta: 5, memory: L("dlg.aile.open.m") };
  }
  if (intent === "dunya") {
    return { line: pick("dlg.dunya.line", 2), moodDelta: 3, relDelta: 3, memory: L("dlg.dunya.m") };
  }
  if (intent === "hedef") {
    const line = pick("dlg.hedef.line", 2).replace("%g", goalL(npc.goal, lang));
    return { line, moodDelta: rt === "yabancı" ? 2 : 7, relDelta: rt === "yabancı" ? 2 : 6, memory: L("dlg.hedef.m") };
  }
  // şaka
  const likes = t === "neşeli" || t === "sıcakkanlı";
  const dislikes = t === "ciddi" || t === "dindar" || t === "kibirli";
  if (dislikes && mt !== "neşeli") return { line: pick("dlg.saka.bad", 2), moodDelta: -4, relDelta: -3, memory: L("dlg.saka.bad.m") };
  if (likes) return { line: pick("dlg.saka.good", 2), moodDelta: 12, relDelta: 7, memory: L("dlg.saka.good.m") };
  return { line: pick("dlg.saka.mild", 2), moodDelta: 5, relDelta: 4, memory: L("dlg.saka.mild.m") };
}

// NPC bazen kendi gündemini açar (Vercel _spontaneous_line). Ruh haline/hedefe göre; boş dönebilir.
export function spontaneousLine(npc: NPC, mood: number, lang: Lang = "tr"): string {
  const fn = npc.name.split(" ")[0];
  const L = (k: string) => tFor(lang, k).replace("%n", fn).replace("%g", goalL(npc.goal, lang));
  const pick = (base: string, n: number) => { const i = Math.floor(Math.random() * n); return L(i === 0 ? base : base + (i + 1)); };
  const mt = moodTier(mood);
  if (mt === "neşeli") return pick("dlg.spont.happy", 4);
  if (mt === "küs" || mt === "soğuk") return pick("dlg.spont.sad", 4);
  return Math.random() < 0.5 ? pick("dlg.spont.goal", 4) : "";
}
// Yapısal anı türüne göre sohbette geçmişe gönderme (Vercel _memory_callback). Boş dönebilir.
export function callbackLine(npc: NPC, memTur: string, lang: Lang = "tr"): string {
  const map: Record<string, string> = {
    hediye: "dlg.cb.gift", comert_hediye: "dlg.cb.gift", yardim: "dlg.cb.help",
    hakaret: "dlg.cb.insult", alay: "dlg.cb.insult", somuru: "dlg.cb.exploit",
    icten_sohbet: "dlg.cb.warm", guzel_sohbet: "dlg.cb.warm",
    tatsiz_konu: "dlg.cb.sour", rahatsizlik: "dlg.cb.sour",
  };
  const k = map[memTur]; if (!k) return "";
  const key = Math.random() < 0.5 ? k : k + "2"; // her göndermenin iki varyantı — uzun oyunda ezber kırılır
  return tFor(lang, key).replace("%n", npc.name.split(" ")[0]);
}

export function moodLabel(m: number): string {
  return { "küs": "Küskün", "soğuk": "Soğuk", "nötr": "Kayıtsız", "sıcak": "Sıcak", "neşeli": "Neşeli" }[moodTier(m)];
}
// Yerelleştirme için ruh hali anahtarı (i18n: dlg.mood.<key>).
export function moodKey(m: number): string {
  return { "küs": "kus", "soğuk": "soguk", "nötr": "notr", "sıcak": "sicak", "neşeli": "neseli" }[moodTier(m)];
}
