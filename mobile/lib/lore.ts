// Yaşayan diyar — turdan ve tohumdan deterministik üretilen haber & dedikodu.
// Tamamen çevrimdışı; her ay aynı tur için aynı sonucu verir.
import { mkRng, generateNPCs } from "./world";
import { Lang, placeName, goalL } from "./locale-data";
import { tFor } from "./i18n";

export interface NewsItem { id: string; kind: "haber" | "dedikodu"; title: string; body: string; cat?: string; local?: boolean; } // cat: haber kategorisi (görsel simge için); local: oyuncunun kendi şehrinden

const DIYAR = ["Üzümlü", "Akpınar", "Demirhan", "Yenişehir", "Karaağaç", "Söğütlü", "Bozkır"];
// Bey: unvan anahtarı (yerelleşir) + özel ad (korunur).
const BEY: { tk: string; n: string }[] = [
  { tk: "bey.sancakbeyi", n: "Alpaslan" }, { tk: "bey.voyvoda", n: "Konur" },
  { tk: "bey.tekfur", n: "Leon" }, { tk: "bey.subasi", n: "Demir" }, { tk: "bey.kadi", n: "Sinaneddin" },
];
const NEWS_IDS = ["hasat", "kuraklik", "kervan", "vergi", "sinir", "salgin", "han", "kitlik"];
const LOCAL_OK = new Set(["hasat", "kuraklik", "kervan", "salgin", "han"]); // yalnız metninde şehir (%p) geçen şablonlar yerel işaretlenebilir

function pick<T>(a: T[], r: () => number): T { return a[Math.floor(r() * a.length)]; }

// Bir tur için diyar haberleri (1-2 adet) üretir; seçilen dile göre.
export function worldNews(turn: number, seed: number, lang: Lang = "tr", playerPlace?: string): NewsItem[] { // playerPlace: verilirse haberler ara sıra oyuncunun şehrinden düşer
  const r = mkRng((seed ^ (turn * 2654435761)) >>> 0);
  const n = 1 + Math.floor(r() * 2);
  const out: NewsItem[] = [];
  const used = new Set<number>();
  for (let i = 0; i < n; i++) {
    let idx = Math.floor(r() * NEWS_IDS.length);
    while (used.has(idx) && used.size < NEWS_IDS.length) idx = (idx + 1) % NEWS_IDS.length;
    used.add(idx);
    const id = NEWS_IDS[idx];
    const isLocal = !!playerPlace && LOCAL_OK.has(id) && r() < 0.56; // ~üç haberden biri kendi diyarından (yalnız şehirli şablonlar)
    const place = isLocal ? playerPlace : placeName(pick(DIYAR, r), lang);
    const bey = BEY[Math.floor(r() * BEY.length)];
    const beyStr = `${tFor(lang, bey.tk)} ${bey.n}`;
    const title = tFor(lang, `news.${id}.t`);
    const body = tFor(lang, `news.${id}.b`).replace("%p", place).replace("%b", beyStr);
    out.push({ id: `news_${turn}_${i}`, kind: "haber", title, body, cat: id, local: isLocal });
  }
  return out;
}

export function rumors(turn: number, seed: number, lang: Lang = "tr", roster?: { name: string; goal: string }[]): NewsItem[] {
  // Dedikodu GERÇEK kadroyu ansın: çağıran, bulunduğu yerin yaşayan ahalisini (rosterAt) verir —
  // oyuncunun tanışabileceği, yaşlanan/ölen kişiler konuşulur. Verilmezse eski hayalet havuza düşer (geriye uyumlu).
  const npcs = roster && roster.length ? roster : generateNPCs(seed, 30, lang);
  if (npcs.length === 0) return [];
  const r = mkRng((seed ^ (turn * 40503)) >>> 0);
  const n = 1 + Math.floor(r() * 2);
  const out: NewsItem[] = [];
  for (let i = 0; i < n; i++) {
    const npc = npcs[Math.floor(r() * npcs.length)];
    // Bazen NPC'nin hayat hedefine dair, bazen yerelleşmiş genel dedikodu (çocukların hedefi yok → genel).
    const body = npc.goal && r() < 0.45 ? `${npc.name} ${goalL(npc.goal, lang)}.` : tFor(lang, `gossip.${Math.floor(r() * 44)}`).replace("%n", npc.name);
    out.push({ id: `rumor_${turn}_${i}`, kind: "dedikodu", title: npc.name, body });
  }
  return out;
}
