// Bağlamlı diyalog — NPC kişiliği + ruh hali + ilişki + hafızaya göre cevap.
import { NPC } from "./world";

export interface Intent { id: string; label: string; icon: string; }
export const INTENTS: Intent[] = [
  { id: "hosbes",  label: "Hoşbeş et",  icon: "speaker" },
  { id: "iltifat", label: "İltifat et",  icon: "lyre" },
  { id: "dert",    label: "Dert dinle",  icon: "prayer-beads" },
  { id: "saka",    label: "Şaka yap",    icon: "party" },
];

export interface ConvResult { line: string; moodDelta: number; relDelta: number; memory: string; }

function moodTier(m: number): "küs" | "soğuk" | "nötr" | "sıcak" | "neşeli" {
  if (m <= -40) return "küs"; if (m < -10) return "soğuk"; if (m <= 10) return "nötr"; if (m < 45) return "sıcak"; return "neşeli";
}
function relTier(r: number): "yabancı" | "tanıdık" | "dost" | "candost" {
  if (r >= 70) return "candost"; if (r >= 40) return "dost"; if (r >= 15) return "tanıdık"; return "yabancı";
}

// Bir konuşma niyetini, NPC'nin kişilik/ruh hali/ilişki bağlamında çözer.
export function converse(npc: NPC, mood: number, rel: number, charisma: number, intent: string): ConvResult {
  const mt = moodTier(mood); const rt = relTier(rel); const t = npc.trait;
  const hitch = mt === "küs" || mt === "soğuk";
  const fn = (npc.name.split(" ")[0]);

  if (intent === "hosbes") {
    const line = hitch
      ? `${fn} kısa kesti: "İşim var, başka zaman."`
      : rt === "yabancı" ? `${fn} ölçüp biçerek selam verdi. ${npc.quirk[0].toUpperCase()}${npc.quirk.slice(1)}.`
      : `${fn} ile hoşbeş ettiniz; ${npc.quirk}.`;
    return { line, moodDelta: hitch ? 2 : 5, relDelta: hitch ? 2 : 4, memory: "Hoşbeş ettiniz." };
  }
  if (intent === "iltifat") {
    const backfire = t === "kibirli" || t === "ciddi" || mt === "küs";
    if (backfire) return { line: `${fn} iltifatını ciddiye almadı: "Yağ çekmeye gerek yok."`, moodDelta: -3, relDelta: -2, memory: "İltifatın yersiz kaçtı." };
    const gain = 5 + Math.floor(charisma);
    return { line: `${fn} iltifatından hoşnut kaldı, yüzü güldü.`, moodDelta: 8, relDelta: gain, memory: "Ona iltifat ettin." };
  }
  if (intent === "dert") {
    const opens = t === "dertli" || t === "yalnız" || t === "sıcakkanlı" || rt !== "yabancı";
    if (!opens) return { line: `${fn} pek açılmadı, derdini paylaşmadı.`, moodDelta: 1, relDelta: 2, memory: "Dertleşmeye çalıştın." };
    return { line: `${fn} içini döktü; dinlediğin için minnettar.`, moodDelta: 10, relDelta: 8, memory: "Derdini dinledin, sana güveniyor." };
  }
  // şaka
  const likes = t === "neşeli" || t === "sıcakkanlı";
  const dislikes = t === "ciddi" || t === "dindar" || t === "kibirli";
  if (dislikes && mt !== "neşeli") return { line: `${fn} şakana yüzünü astı: "Şimdi sırası mı?"`, moodDelta: -4, relDelta: -3, memory: "Şakan tutmadı." };
  if (likes) return { line: `${fn} kahkahayı bastı; aranız iyice ısındı.`, moodDelta: 12, relDelta: 7, memory: "Birlikte güldünüz." };
  return { line: `${fn} hafifçe gülümsedi.`, moodDelta: 5, relDelta: 4, memory: "Ufak bir şaka yaptınız." };
}

export function moodLabel(m: number): string {
  return { "küs": "Küskün", "soğuk": "Soğuk", "nötr": "Kayıtsız", "sıcak": "Sıcak", "neşeli": "Neşeli" }[moodTier(m)];
}
