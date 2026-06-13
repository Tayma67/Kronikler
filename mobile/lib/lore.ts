// Yaşayan diyar — turdan ve tohumdan deterministik üretilen haber & dedikodu.
// Tamamen çevrimdışı; her ay aynı tur için aynı sonucu verir.
import { mkRng, generateNPCs } from "./world";
import { Lang } from "./locale-data";

export interface NewsItem { id: string; kind: "haber" | "dedikodu"; title: string; body: string; }

const DIYAR = ["Üzümlü", "Akpınar", "Demirhan", "Yenişehir", "Karaağaç", "Söğütlü", "Bozkır"];
const BEY = ["Sancakbeyi Alpaslan", "Voyvoda Konur", "Tekfur Leon", "Subaşı Demir", "Kadı Sinaneddin"];

const HABER: ((r: () => number) => { t: string; b: string })[] = [
  (r) => ({ t: "Hasat Vakti", b: `${pick(DIYAR, r)} köyünde bereketli bir hasat kaldırıldı; ambarlar doldu.` }),
  (r) => ({ t: "Kuraklık Söylentisi", b: `${pick(DIYAR, r)} yöresinde kuyular çekildi, ekinler sarardı.` }),
  (r) => ({ t: "Kervan Geldi", b: `Doğudan gelen ipek kervanı ${pick(DIYAR, r)} pazarını şenlendirdi.` }),
  (r) => ({ t: "Vergi Fermanı", b: `${pick(BEY, r)} yeni bir öşür fermanı çıkardı; halk homurdanıyor.` }),
  (r) => ({ t: "Sınırda Hareket", b: `Sınır boylarında atlı birlikler görüldü; ${pick(BEY, r)} tedbir aldı.` }),
  (r) => ({ t: "Salgın Korkusu", b: `${pick(DIYAR, r)} çevresinde ateşli bir hastalık baş gösterdi, şifacılar seferber oldu.` }),
  (r) => ({ t: "Yeni Cami/Han", b: `${pick(BEY, r)} ${pick(DIYAR, r)} yolunda bir han yaptırdı; yolcular sevindi.` }),
  (r) => ({ t: "Kıtlık Geçti", b: `Geçen kışın kıtlığı geride kaldı; ekmek yeniden ucuzladı.` }),
];

function pick<T>(a: T[], r: () => number): T { return a[Math.floor(r() * a.length)]; }

// Bir tur için diyar haberleri (1-2 adet) üretir.
export function worldNews(turn: number, seed: number): NewsItem[] {
  const r = mkRng((seed ^ (turn * 2654435761)) >>> 0);
  const n = 1 + Math.floor(r() * 2);
  const out: NewsItem[] = [];
  const used = new Set<number>();
  for (let i = 0; i < n; i++) {
    let idx = Math.floor(r() * HABER.length);
    while (used.has(idx) && used.size < HABER.length) idx = (idx + 1) % HABER.length;
    used.add(idx);
    const h = HABER[idx](r);
    out.push({ id: `news_${turn}_${i}`, kind: "haber", title: h.t, body: h.b });
  }
  return out;
}

// NPC'lere dair dedikodular (deterministik, mevcut dünya NPC'leriyle).
const DEDIKODU = [
  (n: string) => `${n} pazarda kavgaya karışmış, herkes konuşuyor.`,
  (n: string) => `${n} gizlice bir define aradığını söylüyorlarmış.`,
  (n: string) => `${n} ile komşusu arasında miras kavgası çıkmış.`,
  (n: string) => `${n} yakında evlenecekmiş diye fısıldıyorlar.`,
  (n: string) => `${n} borç batağında, alacaklılar kapısında.`,
  (n: string) => `${n} hayırsever biri çıktı, yoksullara yardım dağıtmış.`,
  (n: string) => `${n} sancakbeyinin gözüne girmiş, yükseliyor.`,
];

export function rumors(turn: number, seed: number, lang: Lang = "tr"): NewsItem[] {
  const npcs = generateNPCs(seed, 30, lang);
  if (npcs.length === 0) return [];
  const r = mkRng((seed ^ (turn * 40503)) >>> 0);
  const n = 1 + Math.floor(r() * 2);
  const out: NewsItem[] = [];
  for (let i = 0; i < n; i++) {
    const npc = npcs[Math.floor(r() * npcs.length)];
    // Bazen NPC'nin hayat hedefine dair, bazen genel dedikodu.
    const body = r() < 0.45 ? `${npc.name} ${npc.goal}.` : DEDIKODU[Math.floor(r() * DEDIKODU.length)](npc.name);
    out.push({ id: `rumor_${turn}_${i}`, kind: "dedikodu", title: npc.name, body });
  }
  return out;
}
