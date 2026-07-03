// Dünya modeli — NPC'ler, eşyalar, pazar. Offline, deterministik üretim.
import { NAME_POOLS, Lang } from "./locale-data";
import { tFor } from "./i18n";
export interface NPC { id: string; name: string; age: number; gender: "erkek" | "kadın"; profession: string; trait: string; quirk: string; goal: string; loc?: string; alive?: boolean; bornY?: number; nameSeed?: number; }
// Kişilik özellikleri (deterministik atanır).
export const TRAITS = ["neşeli","ciddi","kibirli","cömert","dertli","yalnız","kurnaz","mert","dindar","hırslı","utangaç","sıcakkanlı"];
const QUIRKS = ["sürekli hava durumundan dert yanar","eski günleri anlatmayı sever","herkese lakap takar","az konuşur çok dinler","yüksek sesle güler","pazarlığa bayılır","komşularını çekiştirir","bir türküyü mırıldanır"];
// NPC'nin peşinde olduğu hayat hedefi (söylenti ve sohbete renk katar).
const GOALS = ["bir dükkân açmanın hayalini kuruyor","kızını/oğlunu evermek istiyor","borçlarından kurtulmaya çalışıyor","hacca gitmeyi diliyor","toprak satın almak için biriktiriyor","ustabaşı olmak istiyor","küs olduğu kardeşiyle barışmak istiyor","bir ev yaptırmanın derdinde","kervan ticaretine atılmak istiyor","adını duyurmak istiyor"];
export type WClass = "hizli" | "kesici" | "ezici" | "delici" | "menzilli";
export interface Item { id: string; name: string; icon: string; buy: number; sell: number; kind: "yiyecek" | "esya" | "silah" | "zirh" | "kalkan" | "baslik" | "eldiven" | "ayakkabi" | "kiyafet"; heal?: number; feed?: number; power?: number; defense?: number; charisma?: number; prestige?: number; wclass?: WClass; twoHanded?: boolean; }

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
// Yaşa göre meslek gösterimi: küçük çocuk "çocuk", ergen "çırak", aksi halde saklı yetişkin mesleği.
export function npcAgeProfession(profession: string, age: number): string {
  if (age < 7) return "çocuk";
  if (age < 14) return "çırak";
  return profession;
}
export function generateNPCs(seed: number, n = 30, lang: Lang = "tr", prefix = "npc"): NPC[] {
  const r = mkRng(seed);
  const pool = NAME_POOLS[lang] || NAME_POOLS.tr;
  const out: NPC[] = [];
  for (let i = 0; i < n; i++) {
    const gender: "erkek" | "kadın" = r() < 0.5 ? "erkek" : "kadın";
    const ad = gender === "erkek" ? pick(pool.m, r) : pick(pool.f, r);
    // r() tüketim sırası korunur (soyad, yaş, meslek, huy, tuhaflık, hedef) → deterministik.
    const surname = pick(pool.s, r);
    const age = 5 + Math.floor(r() * 68); // 5–72: yaşıt/çocuk da bulunsun (oyuncu 7'de başlar)
    // profession = "yetişkin mesleği" olarak saklanır; gösterimde yaşa göre çocuk/çırak'a indirgenir (npcByAge).
    const profession = pick(NPC_PROFS, r);
    const trait = pick(TRAITS, r);
    const quirk = pick(QUIRKS, r);
    const goal = pick(GOALS, r);
    out.push({ id: `${prefix}_${i}`, name: `${ad} ${surname}`, age, gender, profession, trait, quirk, goal });
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
    const pair = pairs.find(([x, y]) => x !== c.id && y !== c.id && (byId(x)?.age ?? 0) >= c.age + 17 && (byId(y)?.age ?? 0) >= c.age + 17);
    if (!pair || pair.includes(c.id)) continue;
    // c = çocuk, pair = ebeveynler. c'nin listesinde ebeveyne doğru "ebeveyn",
    // ebeveynin listesinde c'ye doğru "evlat" görünmeli (etiketler düzeltildi).
    link(c.id, pair[0], "ebeveyn", "evlat", 65);
    link(c.id, pair[1], "ebeveyn", "evlat", 65);
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

// Aile soyadı paylaşımı: aynı aileye (eş/ebeveyn/evlat/kardeş bağı) mensup NPC'ler
// tek bir soyadı paylaşsın ki "aile" oldukları belli olsun. NPC dizisini yerinde günceller.
// Sosyal grafik deterministik olduğundan sonuç da deterministik ve kararlıdır.
const FAMILY_KINDS: TieKind[] = ["es", "ebeveyn", "evlat", "kardes"];
export function applyFamilySurnames(locationName: string, npcs: NPC[]): void {
  const graph = npcSocialGraph(locationName, npcs);
  const root: Record<string, string> = {};
  for (const n of npcs) root[n.id] = n.id;
  const find = (x: string): string => { while (root[x] !== x) { root[x] = root[root[x]]; x = root[x]; } return x; };
  const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) root[ra] = rb; };
  for (const n of npcs) for (const t of graph[n.id] || []) if (FAMILY_KINDS.includes(t.kind)) union(n.id, t.otherId);
  const fams: Record<string, NPC[]> = {};
  for (const n of npcs) { const r = find(n.id); (fams[r] = fams[r] || []).push(n); }
  for (const id in fams) {
    const members = fams[id];
    if (members.length < 2) continue; // tek kişilik "aile" kendi soyadını korur
    // Soyadı kaynağı: ailenin en yaşlı erkeği (ataerkil), yoksa en yaşlı üye — deterministik.
    const males = members.filter((m) => m.gender === "erkek");
    const src = (males.length ? males : members).slice().sort((a, b) => b.age - a.age || (a.id < b.id ? -1 : 1))[0];
    const surname = src.name.split(" ").slice(1).join(" ");
    if (!surname) continue;
    for (const m of members) { const fn = m.name.split(" ")[0]; m.name = `${fn} ${surname}`; }
  }
}

export const ITEMS: Record<string, Item> = {
  // Yiyecek
  ekmek:   { id: "ekmek",   name: "Ekmek",      icon: "bread", buy: 3,  sell: 1,  kind: "yiyecek", feed: 25 },
  peynir:  { id: "peynir",  name: "Peynir",     icon: "amphora", buy: 5,  sell: 2,  kind: "yiyecek", feed: 30 },
  et:      { id: "et",      name: "Et",         icon: "sheep", buy: 9,  sell: 4,  kind: "yiyecek", feed: 45 },
  balik:   { id: "balik",   name: "Balık",      icon: "fishing", buy: 6,  sell: 2,  kind: "yiyecek", feed: 35 },
  corba:   { id: "corba",   name: "Çorba",      icon: "bucket", buy: 4,  sell: 1,  kind: "yiyecek", feed: 28 },
  bal:     { id: "bal",     name: "Bal",        icon: "amphora", buy: 8,  sell: 3,  kind: "yiyecek", feed: 20, heal: 8 },
  sarap:   { id: "sarap",   name: "Şarap",      icon: "beer", buy: 10, sell: 4,  kind: "yiyecek", feed: 12 },
  sifa:    { id: "sifa",    name: "Şifalı Ot",  icon: "herbs", buy: 12, sell: 5,  kind: "yiyecek", heal: 30 },
  iksir:   { id: "iksir",   name: "Şifa İksiri",icon: "potion", buy: 25, sell: 10, kind: "yiyecek", heal: 60 },
  // Hammadde / eşya
  bugday:  { id: "bugday",  name: "Buğday",     icon: "wheat", buy: 2,  sell: 1,  kind: "esya" },
  un:      { id: "un",      name: "Un",         icon: "wheat", buy: 4,  sell: 2,  kind: "esya" },
  yun:     { id: "yun",     name: "Yün",        icon: "wool", buy: 5,  sell: 2,  kind: "esya" },
  demir:   { id: "demir",   name: "Demir",      icon: "anvil",  buy: 14, sell: 6,  kind: "esya" },
  kereste: { id: "kereste", name: "Kereste",    icon: "saw", buy: 7,  sell: 3,  kind: "esya" },
  deri:    { id: "deri",    name: "Deri",       icon: "backpack", buy: 9,  sell: 4,  kind: "esya" },
  // Silahlar (power). wclass = arketip (savaşta farklı davranır), twoHanded = kalkanla kullanılamaz.
  bicak:        { id: "bicak",        name: "Bıçak",        icon: "crossed-swords", buy: 20,  sell: 8,   kind: "silah", power: 4,  wclass: "hizli" },
  hancer:       { id: "hancer",       name: "Hançer",       icon: "crossed-swords", buy: 32,  sell: 13,  kind: "silah", power: 5,  wclass: "hizli" },
  yay:          { id: "yay",          name: "Av Yayı",      icon: "bow", buy: 50,  sell: 20,  kind: "silah", power: 7,  wclass: "menzilli", twoHanded: true },
  kilic:        { id: "kilic",        name: "Kılıç",        icon: "crossed-swords", buy: 60,  sell: 24,  kind: "silah", power: 8,  wclass: "kesici" },
  gurz:         { id: "gurz",         name: "Gürz",         icon: "crossed-swords", buy: 88,  sell: 35,  kind: "silah", power: 9,  wclass: "ezici" },
  mizrak:       { id: "mizrak",       name: "Mızrak",       icon: "crossed-swords", buy: 100, sell: 40,  kind: "silah", power: 10, wclass: "delici", twoHanded: true },
  savas_balta:  { id: "savas_balta",  name: "Savaş Baltası",icon: "crossed-swords", buy: 110, sell: 44,  kind: "silah", power: 11, wclass: "ezici", twoHanded: true },
  celik_kilic:  { id: "celik_kilic",  name: "Çelik Kılıç",  icon: "crossed-swords", buy: 140, sell: 56,  kind: "silah", power: 13, wclass: "kesici" },
  yatagan:      { id: "yatagan",      name: "Yatağan",      icon: "crossed-swords", buy: 210, sell: 84,  kind: "silah", power: 15, wclass: "kesici" },
  // Gövde zırhı (defense)
  deri_zirh:    { id: "deri_zirh",    name: "Deri Zırh",    icon: "shield", buy: 45,  sell: 18,  kind: "zirh", defense: 4 },
  pamuk_zirh:   { id: "pamuk_zirh",   name: "Pamuklu Zırh", icon: "shield", buy: 82,  sell: 33,  kind: "zirh", defense: 6 },
  zincir_zirh:  { id: "zincir_zirh",  name: "Zincir Zırh",  icon: "shield", buy: 120, sell: 48,  kind: "zirh", defense: 9 },
  plaka_zirh:   { id: "plaka_zirh",   name: "Plaka Zırh",   icon: "shield", buy: 250, sell: 100, kind: "zirh", defense: 13 },
  // Kalkan (defense, ayrı slot)
  kalkan:       { id: "kalkan",       name: "Kalkan",       icon: "kite", buy: 70,  sell: 28,  kind: "kalkan", defense: 6 },
  buyuk_kalkan: { id: "buyuk_kalkan", name: "Büyük Kalkan", icon: "kite", buy: 135, sell: 54,  kind: "kalkan", defense: 9 },
  // Başlık / miğfer (defense)
  deri_baslik:  { id: "deri_baslik",  name: "Deri Başlık",  icon: "hood", buy: 26,  sell: 10,  kind: "baslik", defense: 2 },
  demir_migfer: { id: "demir_migfer", name: "Demir Miğfer", icon: "hood", buy: 78,  sell: 31,  kind: "baslik", defense: 5 },
  tolga:        { id: "tolga",        name: "Tolga",        icon: "hood", buy: 165, sell: 66,  kind: "baslik", defense: 8 },
  // Eldiven (defense)
  deri_eldiven: { id: "deri_eldiven", name: "Deri Eldiven", icon: "fist", buy: 18,  sell: 7,   kind: "eldiven", defense: 1 },
  zincir_eldiven:{ id: "zincir_eldiven",name: "Zincir Eldiven",icon: "fist",buy: 56, sell: 22,  kind: "eldiven", defense: 3 },
  // Ayakkabı / çizme (defense)
  carik:        { id: "carik",        name: "Çarık",        icon: "boot", buy: 15,  sell: 6,   kind: "ayakkabi", defense: 1 },
  demir_cizme:  { id: "demir_cizme",  name: "Demir Çizme",  icon: "boot", buy: 62,  sell: 25,  kind: "ayakkabi", defense: 3 },
  // Kıyafet (karizma + itibar/prestij)
  gunluk_kiyafet:{ id: "gunluk_kiyafet",name: "Günlük Kıyafet",icon: "wool",buy: 22, sell: 9,   kind: "kiyafet", charisma: 0, prestige: 1 },
  yun_cubbe:    { id: "yun_cubbe",    name: "Yün Cübbe",    icon: "wool", buy: 64,  sell: 26,  kind: "kiyafet", charisma: 1, prestige: 3 },
  resmi_kaftan: { id: "resmi_kaftan", name: "Resmi Kaftan", icon: "wool", buy: 130, sell: 52,  kind: "kiyafet", charisma: 2, prestige: 6 },
  ipek_kaftan:  { id: "ipek_kaftan",  name: "İpek Kaftan",  icon: "wool", buy: 330, sell: 132, kind: "kiyafet", charisma: 4, prestige: 12 },
};

// Her yerleşimin bir geçim uzmanlığı vardır; o gruptaki mallar yerel üretimle ucuzlar.
export const SPECIALTIES: { name: string; goods: string[] }[] = [
  { name: "Tahıl ambarı", goods: ["bugday", "un", "ekmek"] },
  { name: "Balıkçı iskelesi", goods: ["balik", "corba"] },
  { name: "Demirci ocağı", goods: ["demir", "bicak", "kilic", "celik_kilic", "savas_balta", "gurz", "mizrak", "yatagan", "kalkan", "buyuk_kalkan", "zincir_zirh", "plaka_zirh", "demir_migfer", "tolga", "zincir_eldiven", "demir_cizme"] },
  { name: "Avcı yatağı", goods: ["et", "deri", "deri_zirh", "yay", "hancer", "deri_baslik", "deri_eldiven", "carik"] },
  { name: "Bağ & arı", goods: ["bal", "sarap"] },
  { name: "Şifacı yurdu", goods: ["sifa", "iksir"] },
  { name: "Dokuma tezgâhı", goods: ["yun", "pamuk_zirh", "gunluk_kiyafet", "yun_cubbe", "resmi_kaftan", "ipek_kaftan"] },
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

// Bayrak yerleşimlerin elle yazılmış tasvirleri: şehirler birbirinden gerçekten farklı hissetsin.
// Haritada olmayan adlar genel havuza (cityblurb.0-4) düşer; RNG sırası değişmez.
const BESPOKE_BLURB: Record<string, string> = { "Yenişehir": "cityblurb.c.yenisehir", "Gümüşhisar": "cityblurb.c.gumushisar", "Akşehir": "cityblurb.c.aksehir", "Demirhan": "cityblurb.c.demirhan", "Develi": "cityblurb.c.develi", "Konuralp": "cityblurb.c.konuralp", "Alaşehir": "cityblurb.c.alasehir", "Beyşehir": "cityblurb.c.beysehir", "Eğirdir": "cityblurb.c.egirdir", "Honaz": "cityblurb.c.honaz", "Ilgın": "cityblurb.c.ilgin" };

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
  const bi = Math.floor(r() * 5); // RNG sırası için her zaman tüketilir
  return { governor: gov, security, prosperity, population, blurb: tFor(lang, BESPOKE_BLURB[name] || `cityblurb.${bi}`) };
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
