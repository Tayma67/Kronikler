// Dünya modeli — NPC'ler, eşyalar, pazar. Offline, deterministik üretim.
import { NAME_POOLS, Lang } from "./locale-data";
import { tFor } from "./i18n";
export interface NPC { id: string; name: string; age: number; gender: "erkek" | "kadın"; profession: string; trait: string; quirk: string; goal: string; loc?: string; alive?: boolean; bornY?: number; nameSeed?: number; }
// Kişilik özellikleri (deterministik atanır).
export const TRAITS = ["neşeli","ciddi","kibirli","cömert","dertli","yalnız","kurnaz","mert","dindar","hırslı","utangaç","sıcakkanlı"];
const QUIRKS = ["sürekli hava durumundan dert yanar","eski günleri anlatmayı sever","herkese lakap takar","az konuşur çok dinler","yüksek sesle güler","pazarlığa bayılır","komşularını çekiştirir","bir türküyü mırıldanır"];
// NPC'nin peşinde olduğu hayat hedefi (söylenti ve sohbete renk katar).
const GOALS = ["bir dükkân açmanın hayalini kuruyor","kızını/oğlunu evermek istiyor","borçlarından kurtulmaya çalışıyor","hacca gitmeyi diliyor","toprak satın almak için biriktiriyor","ustabaşı olmak istiyor","küs olduğu kardeşiyle barışmak istiyor","bir ev yaptırmanın derdinde","kervan ticaretine atılmak istiyor","adını duyurmak istiyor"];
export interface Item { id: string; name: string; icon: string; buy: number; sell: number; kind: "yiyecek" | "esya" | "silah" | "zirh"; heal?: number; feed?: number; power?: number; defense?: number; }

const AD_E = ["Mehmet","Ahmet","Mustafa","Hasan","Hüseyin","İbrahim","Osman","Yusuf","Murat","Kerem","Emre","Cihan","Barış","Tolga","Mert"];
const AD_K = ["Ayşe","Fatma","Zeynep","Emine","Hatice","Elif","Nur","Reyhan","Cansu","Derya","Sevda","Pınar","Gül","Nazlı","Hande"];
const SOYAD = ["Atay","Bircan","Demirhan","Saygı","Açıkel","Dalkılıç","Kayhan","Bal","Yıldırım","Toprak","Çelik","Aydın","Korkmaz","Şahin"];
const NPC_PROFS = ["çiftçi","demirci","tüccar","balıkçı","avcı","çoban","fırıncı","müzisyen","şifacı","asker","işsiz"];

function pick<T>(a: T[], r: () => number): T { return a[Math.floor(r() * a.length)]; }

// Tohumlu basit RNG (deterministik dünya). mulberry32.
export function mkRng(seed: number) {
  let s = seed >>> 0;
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Tohumdan, seçilen dilin kültürüne göre tek ad (eş/ebeveyn isimleri için).
export function localFirstName(seed: number, gender: "erkek" | "kadın", lang: Lang = "tr"): string {
  const pool = NAME_POOLS[lang] || NAME_POOLS.tr;
  const arr = gender === "erkek" ? pool.m : pool.f;
  return arr[(seed >>> 0) % arr.length];
}
// Tohumdan dile göre soyad (doğan NPC'lerin ismini dile göre çözmek için).
export function localSurname(seed: number, lang: Lang = "tr"): string {
  const pool = NAME_POOLS[lang] || NAME_POOLS.tr;
  return pool.s[(seed >>> 0) % pool.s.length];
}
export function generateNPCs(seed: number, n = 30, lang: Lang = "tr", prefix = "npc"): NPC[] {
  const r = mkRng(seed);
  const pool = NAME_POOLS[lang] || NAME_POOLS.tr;
  const out: NPC[] = [];
  for (let i = 0; i < n; i++) {
    const gender: "erkek" | "kadın" = r() < 0.5 ? "erkek" : "kadın";
    const ad = gender === "erkek" ? pick(pool.m, r) : pick(pool.f, r);
    out.push({
      id: `${prefix}_${i}`, name: `${ad} ${pick(pool.s, r)}`,
      age: 14 + Math.floor(r() * 55), gender, profession: pick(NPC_PROFS, r),
      trait: pick(TRAITS, r), quirk: pick(QUIRKS, r), goal: pick(GOALS, r),
    });
  }
  return out;
}

// ── NPC↔NPC ilişki grafiği (Vercel npc_profile/npc_mind ruhu, deterministik port) ──
// NPC'ler lokasyon tohumundan üretildiği için ilişki ağı da tohumdan türetilir:
// hiçbir şey saklanmaz, kayıt göçü gerekmez, aynı şehirde ağ hep aynıdır.
export type TieKind = "es" | "ebeveyn" | "evlat" | "kardes" | "dost" | "rakip";
export interface Tie { otherId: string; kind: TieKind; score: number; }
const RIVAL_TRAITS = ["kibirli", "hırslı", "kurnaz"];
export function npcSocialGraph(locationName: string, npcs: NPC[]): Record<string, Tie[]> {
  const r = mkRng((locSeed(locationName) ^ 0x1a2b3c4d) >>> 0);
  const adj: Record<string, Tie[]> = {};
  for (const n of npcs) adj[n.id] = [];
  const byId = (id: string) => npcs.find((n) => n.id === id);
  const link = (a: string, b: string, ka: TieKind, kb: TieKind, score: number) => {
    if (a === b || adj[a].some((t) => t.otherId === b)) return;
    adj[a].push({ otherId: b, kind: ka, score });
    adj[b].push({ otherId: a, kind: kb, score });
  };
  // 1) Eşler — karşı cins, yakın yaş, kişi başı tek eş.
  const spouseOf: Record<string, string> = {};
  const adults = npcs.filter((n) => n.age >= 20);
  for (const a of adults) {
    if (spouseOf[a.id] || r() > 0.55) continue;
    const cand = adults.find((b) => !spouseOf[b.id] && b.id !== a.id && b.gender !== a.gender && Math.abs(b.age - a.age) <= 14);
    if (cand) { spouseOf[a.id] = cand.id; spouseOf[cand.id] = a.id; link(a.id, cand.id, "es", "es", 75); }
  }
  // 2) Çocuklar + kardeşler — bir eş çiftine yeterince genç NPC bağlanır.
  const pairs = Object.keys(spouseOf).filter((id) => id < spouseOf[id]).map((id) => [id, spouseOf[id]] as [string, string]);
  for (const c of npcs.filter((n) => n.age < 30)) {
    if (r() > 0.5) continue;
    const pair = pairs.find(([x, y]) => !x.includes(c.id) && (byId(x)?.age ?? 0) >= c.age + 17 && (byId(y)?.age ?? 0) >= c.age + 17);
    if (!pair || pair.includes(c.id)) continue;
    link(c.id, pair[0], "evlat", "ebeveyn", 65);
    link(c.id, pair[1], "evlat", "ebeveyn", 65);
    for (const sib of npcs) {
      if (sib.id === c.id) continue;
      const sp = adj[sib.id].filter((t) => t.kind === "ebeveyn").map((t) => t.otherId);
      if (sp.includes(pair[0]) && sp.includes(pair[1])) link(c.id, sib.id, "kardes", "kardes", 55);
    }
  }
  // 3) Dostluk & rakiplik — kalan çiftler arasında kişilik/meslek eğilimiyle, kişi başı ~4 bağ.
  for (const a of npcs) {
    for (const b of npcs) {
      if (a.id >= b.id || adj[a.id].length >= 4) continue;
      if (adj[a.id].some((t) => t.otherId === b.id)) continue;
      const roll = r();
      const rivalish = RIVAL_TRAITS.includes(a.trait) && RIVAL_TRAITS.includes(b.trait);
      const friendish = a.profession === b.profession || a.trait === b.trait;
      if (rivalish && roll < 0.3) link(a.id, b.id, "rakip", "rakip", -(30 + Math.floor(r() * 20)));
      else if (friendish && roll < 0.35) link(a.id, b.id, "dost", "dost", 25 + Math.floor(r() * 20));
      else if (roll < 0.08) link(a.id, b.id, "dost", "dost", 25 + Math.floor(r() * 15));
      else if (roll > 0.96) link(a.id, b.id, "rakip", "rakip", -(25 + Math.floor(r() * 20)));
    }
  }
  return adj;
}

export const ITEMS: Record<string, Item> = {
  // Yiyecek
  ekmek:   { id: "ekmek",   name: "Ekmek",      icon: "🍞", buy: 3,  sell: 1,  kind: "yiyecek", feed: 25 },
  peynir:  { id: "peynir",  name: "Peynir",     icon: "🧀", buy: 5,  sell: 2,  kind: "yiyecek", feed: 30 },
  et:      { id: "et",      name: "Et",         icon: "🍖", buy: 9,  sell: 4,  kind: "yiyecek", feed: 45 },
  balik:   { id: "balik",   name: "Balık",      icon: "🐟", buy: 6,  sell: 2,  kind: "yiyecek", feed: 35 },
  corba:   { id: "corba",   name: "Çorba",      icon: "🍲", buy: 4,  sell: 1,  kind: "yiyecek", feed: 28 },
  bal:     { id: "bal",     name: "Bal",        icon: "🍯", buy: 8,  sell: 3,  kind: "yiyecek", feed: 20, heal: 8 },
  sarap:   { id: "sarap",   name: "Şarap",      icon: "🍷", buy: 10, sell: 4,  kind: "yiyecek", feed: 12 },
  sifa:    { id: "sifa",    name: "Şifalı Ot",  icon: "🌿", buy: 12, sell: 5,  kind: "yiyecek", heal: 30 },
  iksir:   { id: "iksir",   name: "Şifa İksiri",icon: "🧪", buy: 25, sell: 10, kind: "yiyecek", heal: 60 },
  // Hammadde / eşya
  bugday:  { id: "bugday",  name: "Buğday",     icon: "🌾", buy: 2,  sell: 1,  kind: "esya" },
  un:      { id: "un",      name: "Un",         icon: "🌾", buy: 4,  sell: 2,  kind: "esya" },
  yun:     { id: "yun",     name: "Yün",        icon: "🧶", buy: 5,  sell: 2,  kind: "esya" },
  demir:   { id: "demir",   name: "Demir",      icon: "⛏",  buy: 14, sell: 6,  kind: "esya" },
  kereste: { id: "kereste", name: "Kereste",    icon: "🪵", buy: 7,  sell: 3,  kind: "esya" },
  deri:    { id: "deri",    name: "Deri",       icon: "🟫", buy: 9,  sell: 4,  kind: "esya" },
  // Silahlar (power)
  bicak:        { id: "bicak",        name: "Bıçak",        icon: "🗡", buy: 20,  sell: 8,   kind: "silah", power: 4 },
  kilic:        { id: "kilic",        name: "Kılıç",        icon: "⚔", buy: 60,  sell: 24,  kind: "silah", power: 8 },
  celik_kilic:  { id: "celik_kilic",  name: "Çelik Kılıç",  icon: "⚔", buy: 140, sell: 56,  kind: "silah", power: 13 },
  savas_balta:  { id: "savas_balta",  name: "Savaş Baltası",icon: "🪓", buy: 110, sell: 44,  kind: "silah", power: 11 },
  yay:          { id: "yay",          name: "Av Yayı",      icon: "🏹", buy: 50,  sell: 20,  kind: "silah", power: 7 },
  // Zırh (defense)
  deri_zirh:    { id: "deri_zirh",    name: "Deri Zırh",    icon: "🦺", buy: 45,  sell: 18,  kind: "zirh", defense: 4 },
  zincir_zirh:  { id: "zincir_zirh",  name: "Zincir Zırh",  icon: "🛡", buy: 120, sell: 48,  kind: "zirh", defense: 9 },
  kalkan:       { id: "kalkan",       name: "Kalkan",       icon: "🛡", buy: 70,  sell: 28,  kind: "zirh", defense: 6 },
};

// Her yerleşimin bir geçim uzmanlığı vardır; o gruptaki mallar yerel üretimle ucuzlar.
export const SPECIALTIES: { name: string; goods: string[] }[] = [
  { name: "Tahıl ambarı", goods: ["bugday", "un", "ekmek"] },
  { name: "Balıkçı iskelesi", goods: ["balik", "corba"] },
  { name: "Demirci ocağı", goods: ["demir", "bicak", "kilic", "celik_kilic", "savas_balta", "kalkan"] },
  { name: "Avcı yatağı", goods: ["et", "deri", "deri_zirh", "yay"] },
  { name: "Bağ & arı", goods: ["bal", "sarap"] },
  { name: "Şifacı yurdu", goods: ["sifa", "iksir"] },
  { name: "Dokuma tezgâhı", goods: ["yun"] },
];
export function localSpecialty(locationSeed: number): { name: string; goods: string[] } {
  return SPECIALTIES[locationSeed % SPECIALTIES.length];
}
// Geçim uzmanlığının yerelleştirilmiş adı (gösterim için).
export function localSpecialtyName(locationSeed: number, lang: Lang = "tr"): string {
  return tFor(lang, `spec.${locationSeed % SPECIALTIES.length}`);
}
// Pazar malları — yerel uzmanlık (ucuz) + kıtlık (pahalı) + küçük dalgalanma.
// Saf ve deterministik (yalnızca locationSeed'e bağlı) → önbelleğe alınır.
// (42 yerleşimli dünyada arbitraj/ipucu taramaları bunu döngüde çağırıyordu.)
const _marketCache: Record<number, Item[]> = {};
export function marketGoods(locationSeed: number): Item[] {
  const hit = _marketCache[locationSeed]; if (hit) return hit;
  const r = mkRng(locationSeed);
  const spec = localSpecialty(locationSeed);
  const scarce = SPECIALTIES[(locationSeed + 3) % SPECIALTIES.length]; // burada üretilmeyen, pahalı grup
  const out = Object.values(ITEMS).map((it) => {
    let m = 0.9 + r() * 0.25;
    if (spec.goods.includes(it.id)) m *= 0.72;        // yerel bolluk
    else if (scarce.goods.includes(it.id)) m *= 1.28; // yerel kıtlık
    return { ...it, buy: Math.max(1, Math.round(it.buy * m)), sell: Math.max(1, Math.round(it.sell * m)) };
  });
  _marketCache[locationSeed] = out;
  return out;
}

export function locSeed(name: string): number {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h;
}

// Şehir detayı — deterministik (vali, güvenlik, refah, nüfus).
export interface CityInfo { governor: string; security: number; prosperity: number; population: number; blurb: string; }
const GOV_KEYS = ["gov.subasi", "gov.voyvoda", "gov.dizdar", "gov.kethuda", "gov.bey"];
export function cityInfo(name: string, kind: string, lang: Lang = "tr"): CityInfo {
  const r = mkRng(locSeed(name) ^ 0x5bd1e995);
  // RNG sırası korunur: unvan, ad, soyad, ... , tasvir.
  const ti = Math.floor(r() * GOV_KEYS.length);
  // Vali adı seçilen dilin kültürüne göre (NAME_POOLS); RNG sırası AD_E/SOYAD ile birebir korunur.
  const pool = NAME_POOLS[lang] || NAME_POOLS.tr;
  const ad = pool.m[Math.floor(r() * pool.m.length)];
  const soyad = pool.s[Math.floor(r() * pool.s.length)];
  const gov = `${tFor(lang, GOV_KEYS[ti])} ${ad} ${soyad}`;
  const base = kind === "şehir" ? 4000 : kind === "kale" ? 300 : 200;
  const population = base + Math.floor(r() * (kind === "şehir" ? 8000 : kind === "kale" ? 400 : 500));
  const security = (kind === "kale" ? 55 : 30) + Math.floor(r() * 40);
  const prosperity = (kind === "şehir" ? 45 : 25) + Math.floor(r() * 45);
  const bi = Math.floor(r() * 5);
  return { governor: gov, security, prosperity, population, blurb: tFor(lang, `cityblurb.${bi}`) };
}

// Rakip hanedanlar — diyarın güç odakları (deterministik). nameIdx = kültürel havuz indeksi.
export interface RivalHouse { id: string; name: string; nameIdx: number; power: number; pride: number; trait: string; tutum?: number; }
const HOUSE_NAMES = ["Karaoğulları","Akhanlılar","Demiroğulları","Şahinoğulları","Bozkurtlar","Yıldızoğulları","Çelikhanlar","Aslanoğulları","Toprakoğulları","Gümüşhanlılar","Kayıoğulları","Doğanoğulları"];
// Hanedan adları seçilen dilin kültürüne göre (index-index TR ile eşleşir).
const HOUSE_POOLS: Record<Lang, string[]> = {
  tr: HOUSE_NAMES,
  en: ["Blackmane","Ironhold","Falconcrest","Greywolf","Starhaven","Steelborn","Lionheart","Earthford","Silverhall","Hawkwind","Oakenshield","Ravenscar"],
  es: ["Casa Cuervo","Casa Halcón","Casa de Hierro","Casa Lobo","Casa Estrella","Casa Acero","Casa León","Casa Tierra","Casa Plata","Casa Águila","Casa Roble","Casa Toro"],
  pt: ["Casa Corvo","Casa Falcão","Casa do Ferro","Casa Lobo","Casa Estrela","Casa Aço","Casa Leão","Casa Terra","Casa Prata","Casa Águia","Casa Carvalho","Casa Touro"],
  ar: ["بنو غُراب","آل الصقر","بنو الحديد","بنو الذئب","آل النجم","بنو الفولاذ","آل الأسد","بنو الأرض","آل الفضّة","بنو النسر","آل البلّوط","بنو الثور"],
  ru: ["Воронцовы","Соколовы","Железновы","Волковы","Звездины","Стальновы","Львовы","Земцовы","Серебровы","Орловы","Дубовы","Турановы"],
};
// Hanedanın seçilen dildeki adı.
export function houseName(nameIdx: number, lang: Lang = "tr"): string {
  const pool = HOUSE_POOLS[lang] || HOUSE_NAMES;
  return pool[nameIdx] ?? HOUSE_NAMES[nameIdx] ?? "";
}
// Eski kayıt göçü: TR hanedan adından kültürel indeks.
export function houseNameIdx(name: string): number { const i = HOUSE_NAMES.indexOf(name); return i < 0 ? 0 : i; }
const HOUSE_TRAITS = ["gururlu","ihtiraslı","temkinli","cömert","kindar","sadık"];
export function generateDynasties(seed: number, n = 10): RivalHouse[] {
  const r = mkRng((seed ^ 0x9e3779b9) >>> 0);
  const idxPool = HOUSE_NAMES.map((_, i) => i);
  const out: RivalHouse[] = [];
  for (let i = 0; i < n && idxPool.length; i++) {
    const pickIdx = Math.floor(r() * idxPool.length);
    const nameIdx = idxPool.splice(pickIdx, 1)[0];
    out.push({ id: "house_" + i, name: HOUSE_NAMES[nameIdx], nameIdx, power: 40 + Math.floor(r() * 56), pride: 20 + Math.floor(r() * 60), trait: pick(HOUSE_TRAITS, r) });
  }
  return out;
}
