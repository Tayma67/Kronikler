// Dünya modeli — NPC'ler, eşyalar, pazar. Offline, deterministik üretim.
export interface NPC { id: string; name: string; age: number; gender: "erkek" | "kadın"; profession: string; trait: string; quirk: string; goal: string; }
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

export function generateNPCs(seed: number, n = 30): NPC[] {
  const r = mkRng(seed);
  const out: NPC[] = [];
  for (let i = 0; i < n; i++) {
    const gender: "erkek" | "kadın" = r() < 0.5 ? "erkek" : "kadın";
    const ad = gender === "erkek" ? pick(AD_E, r) : pick(AD_K, r);
    out.push({
      id: "npc_" + i, name: `${ad} ${pick(SOYAD, r)}`,
      age: 14 + Math.floor(r() * 55), gender, profession: pick(NPC_PROFS, r),
      trait: pick(TRAITS, r), quirk: pick(QUIRKS, r), goal: pick(GOALS, r),
    });
  }
  return out;
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
const SPECIALTIES: { name: string; goods: string[] }[] = [
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
// Pazar malları — yerel uzmanlık (ucuz) + kıtlık (pahalı) + küçük dalgalanma.
export function marketGoods(locationSeed: number): Item[] {
  const r = mkRng(locationSeed);
  const spec = localSpecialty(locationSeed);
  const scarce = SPECIALTIES[(locationSeed + 3) % SPECIALTIES.length]; // burada üretilmeyen, pahalı grup
  return Object.values(ITEMS).map((it) => {
    let m = 0.9 + r() * 0.25;
    if (spec.goods.includes(it.id)) m *= 0.72;        // yerel bolluk
    else if (scarce.goods.includes(it.id)) m *= 1.28; // yerel kıtlık
    return { ...it, buy: Math.max(1, Math.round(it.buy * m)), sell: Math.max(1, Math.round(it.sell * m)) };
  });
}

export function locSeed(name: string): number {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h;
}

// Şehir detayı — deterministik (vali, güvenlik, refah, nüfus).
export interface CityInfo { governor: string; security: number; prosperity: number; population: number; blurb: string; }
const GOV_TITLES = ["Subaşı", "Voyvoda", "Dizdar", "Kethüda", "Bey"];
export function cityInfo(name: string, kind: string): CityInfo {
  const r = mkRng(locSeed(name) ^ 0x5bd1e995);
  const gov = `${pick(GOV_TITLES, r)} ${pick(AD_E, r)} ${pick(SOYAD, r)}`;
  const base = kind === "şehir" ? 4000 : kind === "kale" ? 300 : 200;
  const population = base + Math.floor(r() * (kind === "şehir" ? 8000 : kind === "kale" ? 400 : 500));
  const security = (kind === "kale" ? 55 : 30) + Math.floor(r() * 40);
  const prosperity = (kind === "şehir" ? 45 : 25) + Math.floor(r() * 45);
  const blurbs = [
    "Çarşısı erken kurulur, geç dağılır.", "Sur dibinde bir çeşme, gün boyu işler.",
    "Kervanların uğrak yeri.", "Geceleri bekçi sesleri duyulur.", "Pazarında her dilden tüccar var.",
  ];
  return { governor: gov, security, prosperity, population, blurb: pick(blurbs, r) };
}

// Rakip hanedanlar — diyarın güç odakları (deterministik).
export interface RivalHouse { id: string; name: string; power: number; pride: number; trait: string; }
const HOUSE_NAMES = ["Karaoğulları","Akhanlılar","Demiroğulları","Şahinoğulları","Bozkurtlar","Yıldızoğulları","Çelikhanlar","Aslanoğulları","Toprakoğulları","Gümüşhanlılar","Kayıoğulları","Doğanoğulları"];
const HOUSE_TRAITS = ["gururlu","ihtiraslı","temkinli","cömert","kindar","sadık"];
export function generateDynasties(seed: number, n = 10): RivalHouse[] {
  const r = mkRng((seed ^ 0x9e3779b9) >>> 0);
  const names = [...HOUSE_NAMES];
  const out: RivalHouse[] = [];
  for (let i = 0; i < n && names.length; i++) {
    const idx = Math.floor(r() * names.length);
    const name = names.splice(idx, 1)[0];
    out.push({ id: "house_" + i, name, power: 40 + Math.floor(r() * 56), pride: 20 + Math.floor(r() * 60), trait: pick(HOUSE_TRAITS, r) });
  }
  return out;
}
