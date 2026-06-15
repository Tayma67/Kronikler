// Offline oyun çekirdeği (sürüm 3) — hayat döngüsü + NPC/ilişki/envanter/pazar.
import { currentCalendar, playerAge, CalendarInfo } from "./calendar";
import { ITEMS, marketGoods, locSeed, generateNPCs, NPC, generateDynasties, cityInfo } from "./world";
import { Lang } from "./locale-data";
import { converse, ConvResult } from "./dialogue";
import { arcById, ArcChoice, availableArcs } from "./arcs";

export interface Stats { strength: number; intelligence: number; charisma: number; stamina: number; }
export interface Skills { combat: number; trade: number; crafting: number; social: number; }
export interface Injury { label: string; stat: keyof Stats; delta: number; weeks_left: number; permanent: boolean; }
export interface Player {
  name: string; surname: string; gender: "erkek" | "kadın"; base_age: number; age: number;
  money: number; profession: string; health: number; hunger: number;
  reputation: number; honor: number; fear: number; fame: number;
  stats: Stats; stat_points: number; dead: boolean; location_name: string; home_name: string;
  married: boolean; spouse_name: string | null; children: string[];
  mother?: string; father?: string;
  inventory: Record<string, number>; properties: Property[]; generation: number;
  faction: string | null; faction_standing: Record<string, number>;
  skills: Skills; skill_xp: Skills; perks: string[];
  injuries: Injury[]; career_xp: number;
  nam: Nam; child_invests: Record<string, string[]>;
  equipped: { silah: string | null; zirh: string | null };
  crowned?: boolean; will_pref?: string;
  fates?: string[]; // tetiklenen kader anları (yaş dönümleri)
  claimed?: string[]; // ödülü alınan başarımlar
  last_study_turn?: number; lesson_count?: number; // mektep: ayda 1 ders + sınav sayacı
  governorships?: string[]; // valisi olunan şehirler
}
// Çocuğa yatırım — vâris olursa başlangıç avantajı verir.
export interface Investment { id: string; label: string; icon: string; cost: number; desc: string; }
export const INVESTMENTS: Investment[] = [
  { id: "egitim", label: "Eğitim",        icon: "graduate-cap",   cost: 50, desc: "Vâris olursa +2 zekâ, +1 özellik puanı." },
  { id: "savas",  label: "Savaş Eğitimi", icon: "crossed-swords", cost: 50, desc: "Vâris olursa +2 güç, savaş becerisi." },
  { id: "zanaat", label: "Zanaat",        icon: "anvil",          cost: 40, desc: "Vâris olursa zanaat becerisi + akçe." },
  { id: "sosyal", label: "Sosyal Terbiye",icon: "lyre",           cost: 40, desc: "Vâris olursa +2 karizma, sosyal beceri." },
  { id: "saglik", label: "Sağlık Bakımı", icon: "healing",        cost: 30, desc: "Vâris olursa dinç başlar (+itibar)." },
];
// Vasiyet stilleri — miras oranı ve yeni nesle etki.
export interface WillStyle { id: string; label: string; desc: string; frac: number; repBonus: number; }
export const WILL_STYLES: WillStyle[] = [
  { id: "esit",  label: "Eşit Pay",   desc: "Mirasın yarısı vârise; huzurlu geçiş.", frac: 0.5, repBonus: 0 },
  { id: "tek",   label: "Tek Vâris",  desc: "Servetin çoğu vârise; ama dedikodu artar.", frac: 0.75, repBonus: -4 },
  { id: "hayir", label: "Hayır İşleri",desc: "Servetin bir kısmı yoksullara; yeni nesle saygınlık.", frac: 0.4, repBonus: 14 },
];
// Nam profili — 5 boyut (söylentilerle halkın gözündeki kişiliğin).
export interface Nam { comert: number; zalim: number; capkin: number; dindar: number; mert: number; }
export const NAM_META: { key: keyof Nam; label: string; icon: string }[] = [
  { key: "comert", label: "Cömert", icon: "coins" },
  { key: "zalim",  label: "Zalim",  icon: "skull" },
  { key: "capkin", label: "Çapkın", icon: "ring" },
  { key: "dindar", label: "Dindar", icon: "prayer-beads" },
  { key: "mert",   label: "Mert",   icon: "shield" },
];
function bumpNam(p: Player, key: keyof Nam, amt: number) { if (p.nam) p.nam[key] = Math.max(0, Math.min(100, p.nam[key] + amt)); }
// Yaralanmalar bir özelliği geçici/kalıcı düşürür. Etkili (effective) değer.
export function effStat(p: Player, key: keyof Stats): number {
  const pen = (p.injuries || []).filter((i) => i.stat === key).reduce((a, i) => a + i.delta, 0);
  return Math.max(0, p.stats[key] - pen);
}
// Mülk: konuma bağlı (loc) + kondisyon (cond 0..100) + kademe (level 1..3). Gelir refah×kondisyon×kademe.
export interface Property { type: string; loc: string; cond: number; level?: number; workers?: string[]; }
export const PROP_MAX_LEVEL = 3;
export function propUpgradeCost(pr: Property): number { return Math.round((PROPERTY_TYPES[pr.type]?.cost || 100) * (pr.level || 1) * 0.8); }
export function upgradeProperty(prev: GameState, index: number): GameState {
  const s = clone(prev); const p = s.player; const pr = p.properties[index];
  if (!pr || (pr.level || 1) >= PROP_MAX_LEVEL) return s;
  const cost = propUpgradeCost(pr); if (p.money < cost) return s;
  p.money -= cost; pr.level = (pr.level || 1) + 1;
  push(s, "mülk", `${PROPERTY_TYPES[pr.type]?.name || "Mülk"} (${pr.loc}) büyütüldü — kademe ${pr.level} (−${cost} akçe).`, "kişisel", true);
  return s;
}
export const PROPERTY_TYPES: Record<string, { name: string; icon: string; cost: number; income: number; slots: number }> = {
  tarla:    { name: "Tarla",    icon: "🌾", cost: 80,  income: 6,  slots: 3 },
  ev:       { name: "Ev",       icon: "🏠", cost: 150, income: 10, slots: 1 },
  dukkan:   { name: "Dükkân",   icon: "🏪", cost: 300, income: 22, slots: 2 },
  degirmen: { name: "Değirmen", icon: "🏭", cost: 600, income: 48, slots: 4 },
};
// ── Mülk-işçi (NPC istihdamı) ekonomisi — Vercel property_system.py portu ──
// Bir mülkün işçi alabileceği yer sayısı: tip slotu + her kademe için +1.
export function propWorkerSlots(pr: Property): number { return (PROPERTY_TYPES[pr.type]?.slots || 0) + ((pr.level || 1) - 1); }
// Bir mülkün şehrinin işçi havuzu (deterministik; NPC istatistikleri dilden bağımsız).
export function townNpcsOf(loc: string, lang: Lang = "tr"): NPC[] { return generateNPCs(locSeed(loc), 12, lang, loc); }
// Mesleğe göre üretkenlik uyumu (çiftçi tarlada, demirci değirmende daha verimli).
const PROP_PROF_FIT: Record<string, string[]> = {
  tarla: ["çiftçi", "çoban"],
  ev: ["şifacı", "müzisyen"],
  dukkan: ["tüccar", "fırıncı", "balıkçı"],
  degirmen: ["demirci", "çiftçi"],
};
// İşçi üretkenliği (Vercel _worker_productivity portu): yaş eğrisi + meslek uyumu + mizaç. 0.6–1.6.
export function workerProductivity(npc: NPC, propType: string): number {
  let p = 1.0;
  if (npc.age < 18) p -= 0.3; else if (npc.age <= 45) p += 0.2; else if (npc.age > 55) p -= 0.25;
  if ((PROP_PROF_FIT[propType] || []).includes(npc.profession)) p += 0.3;
  if (npc.trait === "hırslı") p += 0.1; else if (npc.trait === "yalnız" || npc.trait === "dertli") p -= 0.05;
  return Math.max(0.6, Math.min(1.6, p));
}
const WORKER_GROSS = 0.45, WORKER_WAGE = 0.24;
// Bir mülkün işçilerinden gelen brüt katkı ve toplam ücret (tik + UI ortak).
export function propWorkerStats(pr: Property, base: number, condProspLevel: number, lang: Lang = "tr"): { gross: number; wage: number; count: number } {
  const ids = pr.workers || [];
  if (!ids.length) return { gross: 0, wage: 0, count: 0 };
  const npcs = townNpcsOf(pr.loc, lang);
  let gross = 0, wage = 0;
  for (const id of ids) {
    const npc = npcs.find((x) => x.id === id); if (!npc) continue;
    const prod = workerProductivity(npc, pr.type);
    gross += base * WORKER_GROSS * prod * condProspLevel;
    wage += base * WORKER_WAGE * prod;
  }
  return { gross, wage, count: ids.length };
}
// İşçi işe al (mülkün bulunduğu şehrin NPC'lerinden, boş slot varsa).
export function hireWorker(prev: GameState, index: number, npcId: string): GameState {
  const s = clone(prev); const pr = s.player.properties[index];
  if (!pr) return s;
  pr.workers = pr.workers || [];
  if (pr.workers.includes(npcId) || pr.workers.length >= propWorkerSlots(pr)) return s;
  pr.workers.push(npcId);
  const npc = townNpcsOf(pr.loc).find((x) => x.id === npcId);
  push(s, "mülk", `${npc?.name || "Bir işçi"}, ${PROPERTY_TYPES[pr.type]?.name || "mülkünde"} (${pr.loc}) işe alındı.`, "kişisel", true);
  return s;
}
// İşçi çıkar.
export function fireWorker(prev: GameState, index: number, npcId: string): GameState {
  const s = clone(prev); const pr = s.player.properties[index];
  if (!pr || !pr.workers) return s;
  pr.workers = pr.workers.filter((id) => id !== npcId);
  return s;
}
// ── Örgütler / Loncalar — 1247 Anadolu'sunun güç odakları ──
export interface Faction {
  id: string; name: string; icon: string; blurb: string;
  stat: keyof Stats;            // örgüte uygun temel özellik
  joinRep: number;              // katılmak için gereken örgüt itibarı (görevle kazanılır)
  perk: string;                 // üyelik avantajı açıklaması
  task: { label: string; reward: number; standing: number; desc: string };
}
export const FACTIONS: Faction[] = [
  { id: "tuccar", name: "Tüccarlar Loncası", icon: "⚖️", blurb: "İpek yolunun akçesi onların avucunda döner.", stat: "charisma", joinRep: 30, perk: "Pazarda alış fiyatları senin için biraz düşer.", task: { label: "Kervan hesabı tut", reward: 28, standing: 10, desc: "Loncanın defterlerini denkleştir." } },
  { id: "demirci", name: "Demirciler Loncası", icon: "⚒", blurb: "Köz ve örs; her kılıcın ve sabanın atası.", stat: "strength", joinRep: 30, perk: "İşten kazancın artar (zanaat eli).", task: { label: "Ocakta körük çek", reward: 24, standing: 10, desc: "Usta için ağır bir sipariş bitir." } },
  { id: "asker", name: "Asker Ocağı", icon: "🛡", blurb: "Sınır boylarının kalkanı; sancağın gölgesi.", stat: "strength", joinRep: 40, perk: "Suç ve tehlikede sağlık kaybın azalır.", task: { label: "Devriyeye çık", reward: 32, standing: 12, desc: "Gece nöbetinde yolları kolla." } },
  { id: "sifaci", name: "Şifacılar Meclisi", icon: "🌿", blurb: "Ot, dua ve sabır; canın sessiz bekçileri.", stat: "intelligence", joinRep: 30, perk: "Her ay az da olsa sağlık tazelenir.", task: { label: "Hastalara bak", reward: 18, standing: 10, desc: "Köyün dermansızlarına şifa dağıt." } },
  { id: "golge", name: "Gölge Kardeşliği", icon: "🌒", blurb: "Adı anılmaz, yüzü görülmez; ama her kapıda bir kulağı vardır.", stat: "charisma", joinRep: 25, perk: "Gölge işlerinde yakalanma riskin azalır.", task: { label: "Haber taşı", reward: 22, standing: 12, desc: "Kardeşlik için sessizce bir sır ulaştır." } },
];
export function factionById(id: string | null): Faction | undefined { return FACTIONS.find((f) => f.id === id); }
// Loncaya katılım eşiği (karizmatik hüneri %20 indirir). UI ile çekirdek tutarlı olsun diye.
export function joinThreshold(p: Player, f: Faction): number { return p.perks.includes("karizmatik") ? Math.round(f.joinRep * 0.8) : f.joinRep; }

export interface GameEvent { day: number; type: string; text: string; scope: "kişisel" | "makro"; landmark?: boolean; k?: string; p?: (string | number)[]; }
export interface DynastyRecord { generation: number; name: string; profession: string; diedAge: number; fame: number; reputation: number; faction: string | null; note: string; }
export interface NpcState { mood: number; memories: string[]; }
export interface StoryProgress { active: { id: string; stage: string } | null; completed: string[]; tension: number; nemesis?: { name: string; power: number } | null; }
export interface GameState {
  turn: number; seed: number; player: Player; history: GameEvent[];
  relationships: Record<string, number>; world: { ready: boolean };
  dynasty: DynastyRecord[];
  npc_state: Record<string, NpcState>;
  story: StoryProgress;
  wars: FactionWar[];
  realm?: SancakHold[]; // 4 sancağın fraksiyon hakimiyeti (emergent şehir-kontrolü)
  caravan: { invested: number; dest: string; route?: string[]; step?: number; lost?: number; returnTurn?: number } | null;
  econ: number; // piyasa çarpanı (kıtlık>1, bolluk<1)
  settlements?: Settlement[]; // hanedanın kurduğu yerleşimler
  marketEvent?: { goods: string[]; mult: number; until: number; key: string } | null; // geçici piyasa olayı
}
// Hanedanın kurduğu yerleşim — mezra olarak başlar, yıllarca gelişir, vergi getirir.
export interface Settlement { name: string; founded: number; dev: number; }
// Piyasa çarpanına göre fiyat.
export function marketPrice(base: number, econ: number): number { return Math.max(1, Math.round(base * (econ || 1))); }
// Mevsimsel fiyat çarpanları (Vercel SEASON_PRICE_MULT portu; mobil eşya kimlikleriyle).
const SEASON_MULT: Record<string, Record<string, number>> = {
  "Kış":      { kereste: 1.25, bugday: 1.15, et: 1.10, ekmek: 1.10, corba: 1.10 },
  "İlkbahar": { yun: 0.9, deri: 0.95 },
  "Yaz":      { kereste: 0.9, et: 0.95, balik: 0.9 },
  "Sonbahar": { bugday: 0.85, sarap: 1.10, kereste: 1.05, un: 0.9 },
};
// Geçici piyasa olayları havuzu (Vercel market_events.py portu, sadeleştirilmiş).
export const MARKET_EVENTS: { key: string; goods: string[]; mult: number; months: number; text: string }[] = [
  { key: "kithasat", goods: ["bugday", "un", "ekmek"], mult: 1.5, months: 4, text: "Kötü hasat: tahıl fiyatları fırladı." },
  { key: "bolluk",   goods: ["bugday", "un", "ekmek"], mult: 0.7, months: 4, text: "Bereketli hasat: tahıl ucuzladı." },
  { key: "savas",    goods: ["demir", "bicak", "kilic", "kalkan"], mult: 1.45, months: 5, text: "Savaş söylentisi: silah ve demir pahalandı." },
  { key: "kervanb",  goods: ["sarap", "bal", "iksir", "sifa"], mult: 1.4, months: 3, text: "Kervan baskını: lüks mallar kıtlaştı." },
  { key: "kuraklik", goods: ["bugday", "et", "balik"], mult: 1.35, months: 5, text: "Kuraklık: yiyecek fiyatları yükseldi." },
  // ── Vercel market_events.py'den ek olaylar (mevcut mallarla) ──
  { key: "loncagrev", goods: ["bicak", "kilic", "celik_kilic", "demir"], mult: 1.4, months: 3, text: "Demirciler lonca grevinde: âlet ve silah kıtlaştı." },
  { key: "panayir",  goods: ["sarap", "bal", "peynir", "et"], mult: 1.3, months: 2, text: "Şehirde panayır: şenlik malları kapışılıyor." },
  { key: "ipekkerv", goods: ["iksir", "sifa", "sarap"], mult: 0.72, months: 3, text: "Doğudan ipek kervanı geldi: lüks mallar ucuzladı." },
  { key: "yolkapan", goods: ["bugday", "un", "demir", "kereste", "deri"], mult: 1.25, months: 3, text: "Geçitler kapandı: her şeyin nakli pahalandı." },
  { key: "bagbozumu",goods: ["sarap", "bal"], mult: 0.7, months: 3, text: "Bağ bozumu: şarap ve bal bollaştı." },
  { key: "deritalep",goods: ["deri", "deri_zirh", "yay"], mult: 1.35, months: 4, text: "Tabakhaneler deriye talip: deri ürünleri pahalandı." },
  { key: "koyunveba",goods: ["yun", "et", "peynir"], mult: 1.4, months: 5, text: "Koyun vebası: yün ve et fiyatları yükseldi." },
  { key: "ormanyang",goods: ["kereste", "kalkan", "yay"], mult: 1.45, months: 5, text: "Orman yangını: kereste ve odun işi pahalandı." },
  { key: "sogukdalg",goods: ["kereste", "et", "corba"], mult: 1.3, months: 4, text: "Sert kış: yakacak ve sıcak yemek arandı." },
  { key: "madendam", goods: ["demir", "bicak", "kilic", "zincir_zirh"], mult: 0.7, months: 4, text: "Yeni maden damarı: demir ve demir işi ucuzladı." },
];
// Bir malın anlık fiyat çarpanı: mevsim × aktif piyasa olayı.
export function goodPriceMult(s: GameState, goodId: string): number {
  let m = (SEASON_MULT[currentCalendar(s.turn).season] || {})[goodId] || 1;
  const ev = s.marketEvent;
  if (ev && ev.until > s.turn && ev.goods.includes(goodId)) m *= ev.mult;
  return m;
}
export function econLabel(econ: number): string {
  if (econ >= 1.18) return "Kıtlık — fiyatlar yüksek";
  if (econ >= 1.06) return "Pahalılık";
  if (econ <= 0.85) return "Bolluk — fiyatlar düşük";
  if (econ <= 0.94) return "Ucuzluk";
  return "Piyasa dengeli";
}
export function econKey(econ: number): string {
  if (econ >= 1.18) return "scarcity";
  if (econ >= 1.06) return "pricey";
  if (econ <= 0.85) return "abundance";
  if (econ <= 0.94) return "cheap";
  return "balanced";
}
// Ocak savaşı — iki lonca arasında, birkaç ay süren çatışma.
export interface FactionWar { a: string; b: string; turnsLeft: number; aScore: number; bScore: number; prize?: string; }
// Sancak hakimiyeti (Vercel faction_system şehir-kontrolü ruhu): her sancağın bir hâkim
// fraksiyonu, yükselen bir rakibi ve gerilimi vardır; gerilim dorukta savaş patlar.
export interface SancakHold { id: string; holder: string; contender: string | null; tension: number; }
// NPC ruh hali/hafıza kaydını getir veya başlat (saf değil — clone'lanmış state'te çağrılır).
export function npcStateOf(s: GameState, id: string): NpcState {
  if (!s.npc_state) s.npc_state = {};
  if (!s.npc_state[id]) s.npc_state[id] = { mood: 0, memories: [] };
  return s.npc_state[id];
}

// Yerleşimler — şehir/köy/kale, beyliklere (region) bağlı. Seyahat ve atmosfer.
export interface Place { name: string; kind: "şehir" | "köy" | "kale"; region: string; }
export const PLACES: Place[] = [
  { name: "Üzümlü", kind: "köy", region: "demirhan" }, { name: "Akpınar", kind: "köy", region: "demirhan" }, { name: "Demirhan", kind: "kale", region: "demirhan" },
  { name: "Yenişehir", kind: "şehir", region: "yenisehir" }, { name: "Karaağaç", kind: "köy", region: "yenisehir" }, { name: "Söğütlü", kind: "köy", region: "yenisehir" },
  { name: "Bozkır", kind: "kale", region: "gumushisar" }, { name: "Gümüşhisar", kind: "şehir", region: "gumushisar" }, { name: "Çakıllı", kind: "köy", region: "gumushisar" },
  { name: "Kavaklı", kind: "köy", region: "aksehir" }, { name: "Sarıkaya", kind: "kale", region: "aksehir" }, { name: "Akşehir", kind: "şehir", region: "aksehir" },
];
export const LOCATIONS = PLACES.map((p) => p.name);
// Beylikler — 4 sancak; her birinin merkezi (şehir/kale) ve rengi.
export const BEYLIKS: { id: string; name: string; tone: string }[] = [
  { id: "demirhan",   name: "Demirhan Beyliği",   tone: "#E0922E" },
  { id: "yenisehir",  name: "Yenişehir Sancağı",  tone: "#6FA0C0" },
  { id: "gumushisar", name: "Gümüşhisar Beyliği", tone: "#9C7BC4" },
  { id: "aksehir",    name: "Akşehir Sancağı",    tone: "#7FA66A" },
];
export function regionOf(name: string): string { return PLACES.find((p) => p.name === name)?.region || "demirhan"; }
export function beylikOf(name: string): { id: string; name: string; tone: string } { const r = regionOf(name); return BEYLIKS.find((b) => b.id === r) || BEYLIKS[0]; }
export function beylikName(id: string): string { return BEYLIKS.find((b) => b.id === id)?.name || id; }
export function sameBeylik(a: string, b: string): boolean { return regionOf(a) === regionOf(b); }
export function placeKind(name: string): string { return PLACES.find((p) => p.name === name)?.kind || "köy"; }

// Meslekler — kariyer merdivenli (15 meslek). Unvanlar deneyimle yükselir.
export interface Profession { id: string; name: string; stat: keyof Stats; base: number; tiers: string[]; }
export const PROFESSIONS: Profession[] = [
  { id: "çiftçi",    name: "Çiftçi",    stat: "stamina",      base: 4, tiers: ["Irgat", "Çiftçi", "Toprak Sahibi"] },
  { id: "demirci",   name: "Demirci",   stat: "strength",     base: 5, tiers: ["Demirci Çırağı", "Demirci", "Usta Demirci"] },
  { id: "tüccar",    name: "Tüccar",    stat: "charisma",     base: 5, tiers: ["Seyyar Satıcı", "Tüccar", "Tüccar Başı"] },
  { id: "balıkçı",   name: "Balıkçı",   stat: "stamina",      base: 4, tiers: ["Ağcı", "Balıkçı", "Reis"] },
  { id: "avcı",      name: "Avcı",      stat: "strength",     base: 4, tiers: ["İzci", "Avcı", "Usta Avcı"] },
  { id: "marangoz",  name: "Marangoz",  stat: "intelligence", base: 5, tiers: ["Çırak", "Marangoz", "Usta Marangoz"] },
  { id: "çoban",     name: "Çoban",     stat: "stamina",      base: 3, tiers: ["Sürü Yamağı", "Çoban", "Sürü Sahibi"] },
  { id: "fırıncı",   name: "Fırıncı",   stat: "intelligence", base: 4, tiers: ["Hamurkâr", "Fırıncı", "Ekmekçi Başı"] },
  { id: "asker",     name: "Asker",     stat: "strength",     base: 5, tiers: ["Acemi", "Asker", "Onbaşı", "Sipahi"] },
  { id: "müzisyen",  name: "Müzisyen",  stat: "charisma",     base: 4, tiers: ["Çırak Ozan", "Müzisyen", "Saz Üstadı"] },
  { id: "şifacı",    name: "Şifacı",    stat: "intelligence", base: 5, tiers: ["Otacı", "Şifacı", "Hekim"] },
  { id: "katip",     name: "Kâtip",     stat: "intelligence", base: 5, tiers: ["Çömez", "Kâtip", "Divan Kâtibi"] },
  { id: "kuyumcu",   name: "Kuyumcu",   stat: "intelligence", base: 6, tiers: ["Çırak", "Kuyumcu", "Usta Kuyumcu"] },
  { id: "dokumacı",  name: "Dokumacı",  stat: "intelligence", base: 4, tiers: ["Çırak", "Dokumacı", "Usta Dokumacı"] },
  { id: "hancı",     name: "Hancı",     stat: "charisma",     base: 5, tiers: ["Hizmetkâr", "Hancı", "Han Sahibi"] },
];
export function professionById(id: string): Profession | undefined { return PROFESSIONS.find((p) => p.id === id); }
// Unvan kademesi: kariyer deneyimine göre (her 30 ay bir kademe).
export function careerTier(prof: Profession, careerXp: number): number {
  return Math.min(prof.tiers.length - 1, Math.floor(careerXp / 30));
}
export function careerTitle(profId: string, careerXp: number): string {
  const pr = professionById(profId); if (!pr) return profId;
  return pr.tiers[careerTier(pr, careerXp)];
}
const PROFS = PROFESSIONS.map((p) => p.id);
const PROF_STAT: Record<string, keyof Stats> = Object.fromEntries(PROFESSIONS.map((p) => [p.id, p.stat])) as Record<string, keyof Stats>;
// Mesleğin geliştirdiği beceri — çalışmak, mesleğin kimliğini pekiştirir (varsayılan zanaat).
const PROF_SKILL: Record<string, "combat" | "trade" | "crafting" | "social"> = {
  tüccar: "trade", hancı: "trade", kuyumcu: "trade", katip: "trade",
  asker: "combat", avcı: "combat",
  müzisyen: "social",
  // çiftçi, demirci, balıkçı, marangoz, çoban, fırıncı, şifacı, dokumacı → crafting (varsayılan)
};
const SPOUSE_K = ["Ayşe","Fatma","Zeynep","Emine","Hatice","Elif","Nur","Reyhan"];
const SPOUSE_E = ["Mehmet","Ahmet","Mustafa","Hasan","Hüseyin","İbrahim","Osman","Yusuf"];
const CHILD = ["Ali","Veli","Can","Ece","Mert","Naz","Kerem","Defne","Arda","Mira"];

const rnd = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

// NPC'ler KONUMA bağlı: her şehrin kendi insanları (konum tohumlu + konum-önekli kimlik).
export function npcsOf(s: GameState, lang: Lang = "tr"): NPC[] { return generateNPCs(locSeed(s.player.location_name), 12, lang, s.player.location_name); }

export function newGame(first: string, surname: string, gender: "erkek" | "kadın"): GameState {
  const birthplace = rnd(LOCATIONS);
  return {
    turn: 0, seed: Math.floor(Math.random() * 1e9), world: { ready: true },
    relationships: {}, dynasty: [], npc_state: {}, story: { active: null, completed: [], tension: 0 }, wars: [], caravan: null, econ: 1,
    player: {
      name: surname ? `${first} ${surname}` : first, surname, gender, base_age: 7, age: 7,
      money: 12, profession: "işsiz", health: 100, hunger: 100,
      reputation: 0, honor: 0, fear: 0, fame: 0,
      stats: { strength: 1, intelligence: 1, charisma: 1, stamina: 2 },
      stat_points: 0, dead: false, location_name: birthplace, home_name: birthplace,
      married: false, spouse_name: null, children: [], mother: rnd(SPOUSE_K), father: rnd(SPOUSE_E), inventory: { ekmek: 2 },
      properties: [], generation: 1,
      faction: null, faction_standing: {},
      skills: { combat: 0, trade: 0, crafting: 0, social: 0 },
      skill_xp: { combat: 0, trade: 0, crafting: 0, social: 0 }, perks: [], injuries: [], career_xp: 0,
      nam: { comert: 0, zalim: 0, capkin: 0, dindar: 0, mert: 0 }, child_invests: {}, equipped: { silah: null, zirh: null },
      crowned: false, will_pref: "esit", fates: [], claimed: [],
    },
    settlements: [],
    history: [],
  };
}

// Doğuştan mizaç — açılışta seçilir; kimlik eksenini ta başından tohumlar.
export const TEMPERAMENTS = ["yigit", "kurnaz", "merhametli", "hirsli"] as const;
export function applyTemperament(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player;
  if (id === "yigit") { p.stats.strength += 1; p.skill_xp.combat += 60; bumpNam(p, "mert", 10); }
  else if (id === "kurnaz") { p.stats.charisma += 1; p.skill_xp.social += 60; bumpNam(p, "capkin", 6); }
  else if (id === "merhametli") { p.honor = clampStat(p.honor + 8); bumpNam(p, "comert", 12); }
  else if (id === "hirsli") { p.stats.intelligence += 1; p.reputation = Math.min(100, p.reputation + 5); }
  p.skills.combat = skillLevel(p.skill_xp.combat);
  p.skills.social = skillLevel(p.skill_xp.social);
  return s;
}

// loc: dilden bağımsız çeviri anahtarı + parametreler (sayı/id). Gösterimde çözülür; yoksa text (TR) yedeği.
function push(s: GameState, type: string, text: string, scope: "kişisel" | "makro" = "kişisel", landmark = false, loc?: { k: string; p?: (string | number)[] }) {
  s.history.push({ day: s.turn, type, text, scope, landmark, k: loc?.k, p: loc?.p });
}
function clone(s: GameState): GameState { return JSON.parse(JSON.stringify(s)); }
function die(s: GameState, text: string) { s.player.dead = true; push(s, "ölüm", text, "kişisel", true); }

function monthlyFlavor(s: GameState, cal: CalendarInfo): string {
  const child = s.player.age < 13; const pool: string[] = [];
  if (cal.season === "Kış") pool.push("Soğuk sert geçti; ocağın başında ısındın.","Kar yolları kapadı, evde kaldın.");
  if (cal.season === "İlkbahar") pool.push("Tarlalar yeşerdi, içine umut düştü.","Kuşlar döndü; köy canlandı.");
  if (cal.season === "Yaz") pool.push("Sıcak günlerde gölgede dinlendin.","Hasada yardım ettin.");
  if (cal.season === "Sonbahar") pool.push("Yapraklar döküldü; kışa hazırlık başladı.","Pazarda son ürünler satıldı.");
  pool.push(child ? "Sokakta oyun oynadın." : "Gününü işinle geçirdin.", child ? "Annen masal anlattı." : "Çarşıda dolaştın.");
  return rnd(pool);
}

function rollLifeEvents(s: GameState, cal: CalendarInfo) {
  const p = s.player;
  if (p.age === 13 && p.profession === "işsiz") { p.profession = rnd(PROFS); p.stat_points += 3; push(s, "meslek_edinme", `Reşit oldun. ${cap(p.profession)} olarak hayata atıldın — dünya sana açıldı.`, "kişisel", true); }
  // ── Kader anları: hayatın belirli dönümlerinde kimliğe ayna tutan sahneler ──
  if (!p.fates) p.fates = [];
  const fate = (id: string) => { if (!p.fates!.includes(id)) { p.fates!.push(id); return true; } return false; };
  const whoAmI = (): string => {
    const nm = p.nam || ({} as Nam);
    if (p.crowned) return "bir hükümdar";
    if (p.fear >= 50 || (nm.zalim || 0) >= 50) return "korkulan biri";
    if (p.honor >= 50 || (nm.mert || 0) >= 50) return "şerefli biri";
    if ((nm.comert || 0) >= 50) return "eli açık biri";
    if ((nm.dindar || 0) >= 50) return "dindar biri";
    if (p.fame >= 50) return "tanınan biri";
    if (p.reputation >= 40) return "saygın biri";
    return "sıradan biri";
  };
  if (p.age >= 40 && fate("40")) push(s, "kader", `Kırkına vardın. Aynaya baktığında ${whoAmI()} görüyorsun. Ömrün yarılandı; bundan sonrası bir miras meselesi.`, "kişisel", true);
  if (p.age >= 60 && fate("60")) push(s, "kader", `Altmışını devirdin. Saçlar ağardı, geçmişin gölgesi uzadı. Ömrün akşamında ${whoAmI()} olarak anılıyorsun — geriye ne bırakacaksın?`, "kişisel", true);
  if (p.age < 13 && chance(0.25)) { p.stat_points += 1; push(s, "cocukluk", "Yeni bir şeyler öğrendin (özellik puanı kazandın).", "kişisel", false, { k: "ev.cocukluk" }); }
  if (p.dead) return;
  // Görücü usulü evlilik — yalnızca FALLBACK: oyuncu birini kur yapıyorsa (ilişki ≥50) araya girmez, geç başlar, seyrektir.
  const courting = Object.values(s.relationships || {}).some((v) => (v as number) >= 50);
  if (!p.married && !courting && p.age >= 24 && p.age < 55 && chance(0.035 + p.fame / 2000)) { const name = p.gender === "erkek" ? rnd(SPOUSE_K) : rnd(SPOUSE_E); p.married = true; p.spouse_name = name; p.reputation += 5; push(s, "evlilik", `Ailelerin görüşmesiyle ${name} ile evlendin — yeni bir ocak kuruldu.`, "kişisel", true); }
  if (p.married && p.age >= 18 && p.age < 50 && p.children.length < 5 && chance(0.07)) { const c = rnd(CHILD); p.children.push(c); push(s, "doğum", `Bir evladın dünyaya geldi: ${c}.`, "kişisel", true); }
  // ── Yaşam-evresi anıları: her döneme doku katan küçük anlar (ara sıra; bazıları aileyi isimle anar) ──
  if (!p.dead && chance(0.14)) {
    const child = p.children.length ? rnd(p.children) : null;
    const mem: { text: string; fn?: () => void }[] = [];
    if (p.age < 13) {
      mem.push(
        { text: "Annen bir masal anlattı; kahramanı sendin." },
        { text: "Bir sokak köpeğiyle dost oldun, peşinden ayrılmadı." },
        { text: "Bir büyüğün elini izleyip zanaatı merak ettin.", fn: () => { p.skill_xp.crafting += 8; p.skills.crafting = skillLevel(p.skill_xp.crafting); } },
      );
    } else if (p.age < 25) {
      mem.push(
        { text: "İlk kez birine gönül kaptırdın; dilin tutuldu.", fn: () => bumpNam(p, "capkin", 2) },
        { text: "Bir ihtiyardan iki çift söz dinledin, aklına kazıdın.", fn: () => { p.skill_xp.social += 8; p.skills.social = skillLevel(p.skill_xp.social); } },
        { text: "Geç saatlere dek bir dostunla dertleştin." },
      );
    } else if (p.age < 46) {
      mem.push(
        { text: "Aynada ilk ak telini gördün; zaman akıp gidiyor." },
        { text: p.married && p.spouse_name ? `${p.spouse_name} ile sessiz bir akşam geçirdin; 'iyi ki varsın' dedin.` : "Yalnız bir akşam, geçmişini düşündün." },
        { text: child ? `${child} masum bir soru sordu; cevabını ararken sen de düşündün.` : "Bir komşuyla eski günleri yâd ettin." },
      );
    } else {
      mem.push(
        { text: "Dizlerin sızlıyor ama hatıraların zengin." },
        { text: child ? `${child}'a gençlik hikâyelerini anlattın; gözleri parladı.` : "Gençlere akıl verdin; dinlediler mi, bilinmez.", fn: () => bumpNam(p, "dindar", 1) },
        { text: "Bir mezar taşı okudun; kendi faniliğini düşündün." },
      );
    }
    const m = rnd(mem); m.fn?.();
    push(s, p.age < 13 ? "cocukluk" : "gunluk", m.text);
  }
  if (chance(0.05)) { const g = 5 + Math.floor(Math.random() * 20); p.money += g; push(s, "gunluk", `Yolda ${g} akçe buldun.`); }
  if (chance(0.04)) { p.health = Math.max(0, p.health - 12); push(s, "hastalik", "Hastalandın, birkaç gün yatakta kaldın."); }
  // ── Nemesis dünyada yaşıyor: musallat olur; yoksa derin bir husumet amansız hasma dönüşebilir ──
  if (!p.dead && p.age >= 14 && s.story) {
    if (s.story.nemesis && chance(0.10)) {
      const n = s.story.nemesis;
      const txt = rnd([
        () => { p.reputation = Math.max(-100, p.reputation - 4); return `${n.name} arkandan kuyunu kazıyor; itibarın sarsıldı.`; },
        () => { const loss = Math.min(p.money, 8); p.money -= loss; return `${n.name}'ın adamları malına dokundu (−${loss} akçe).`; },
        () => { p.health = Math.max(1, p.health - 5); return `${n.name} pusu kurdu; sıyrıklarla kurtuldun.`; },
        () => `${n.name} bir tehdit daha yolladı; hesap görülmeyi bekliyor.`,
      ])();
      s.story.tension = Math.min(100, s.story.tension + 3);
      push(s, "nemesis", txt, "kişisel");
    } else if (!s.story.nemesis && chance(0.03)) {
      const rivals = Object.entries(s.relationships || {}).filter(([, v]) => (v as number) <= -55);
      if (rivals.length) {
        const rid = rnd(rivals)[0];
        const npc = npcsOf(s).find((x) => x.id === rid);
        if (npc) { s.story.nemesis = { name: npc.name, power: 14 + Math.floor(Math.random() * 10) }; push(s, "nemesis", `${npc.name} ile husumetiniz kan davasına döndü; artık amansız bir hasımsın.`, "kişisel", true); }
      }
    }
  }
  // Yaşlanma + ölümlülük — geniş dağılım: bazıları genç hastalık/kazaya, sağlıklılar 70-80'e
  if (p.age >= 50) p.health = Math.max(0, p.health - Math.floor((p.age - 48) / 5));
  const accident = (p.age >= 25 ? 0.0008 : 0) + (p.health < 25 ? 0.012 : 0);
  const aging = p.age >= 58 ? (p.age - 58) * 0.006 + (p.health < 40 ? 0.01 : 0) : 0;
  if (chance(accident + aging)) {
    const old = p.age >= 60;
    die(s, old ? `${p.name}, ${p.age} yaşında huzur içinde göçtü.` : `${p.name}, ${p.age} yaşında ${p.health < 25 ? "amansız bir hastalığa" : "ecel"} yenik düştü.`);
  }
}

// Yeni tamamlanan başarımları ödüllendir (tek seferlik): +1 özellik puanı + şöhret.
function claimAchievements(s: GameState) {
  const p = s.player; if (!p.claimed) p.claimed = [];
  for (const { a, done } of achievementsOf(s)) {
    if (done && !p.claimed.includes(a.id)) {
      p.claimed.push(a.id);
      p.stat_points += 1;
      p.fame = Math.min(100, p.fame + 2);
      push(s, "basarim", `Başarım açıldı: ${a.name} (+1 özellik puanı).`, "kişisel", false, { k: "ev.ach", p: [a.name] });
    }
  }
}

export function advance(prev: GameState, n = 1): GameState {
  const s = clone(prev);
  for (let i = 0; i < n; i++) {
    if (s.player.dead) break;
    s.turn += 1; const cal = currentCalendar(s.turn);
    s.player.age = playerAge(s.player.base_age, s.turn);
    const child = s.player.age < 13;
    // Çocuğu ailesi besler: açlık daha yavaş düşer ve dipte aile karnını doyurur.
    const drop = Math.round((child ? 4 : 8) * (cal.season === "Kış" ? 1.3 : 1.0));
    s.player.hunger = Math.max(0, s.player.hunger - drop);
    if (child && s.player.hunger < 30) s.player.hunger = Math.min(100, s.player.hunger + 20); // anne-baba sofrası
    if (s.player.hunger < 20 && !child) s.player.health = Math.max(0, s.player.health - 6);
    else if (s.player.health < 100) s.player.health = Math.min(100, s.player.health + 2);
    if (s.player.faction === "sifaci" && s.player.health < 100) s.player.health = Math.min(100, s.player.health + 2);
    if (s.player.health <= 0 && !child) { die(s, `${s.player.name} açlık ve hastalığa yenik düştü.`); break; }
    // Yaralar zamanla iyileşir (kalıcı olanlar kalır)
    if (s.player.injuries?.length) {
      for (const inj of s.player.injuries) if (!inj.permanent) inj.weeks_left -= 1;
      const healed = s.player.injuries.filter((inj) => !inj.permanent && inj.weeks_left <= 0);
      if (healed.length && i === n - 1) push(s, "iyilesme", `Yaraların iyileşti: ${healed.map((h) => h.label).join(", ")}.`);
      s.player.injuries = s.player.injuries.filter((inj) => inj.permanent || inj.weeks_left > 0);
    }
    // Mülk pasif geliri — KONUMA (şehir refahı) + KONDİSYONA göre; düşük güvenlikte yağma + aşınma
    let pmult = 1;
    if (hasPerk(s.player, "tuccar_prensi")) pmult += 0.3;
    if (hasPerk(s.player, "tamirci")) pmult += 0.15;
    let inc = 0;
    let wages = 0; // işçi ücretleri (ekonomiden çıkan; pmult'tan bağımsız)
    const cityCache: Record<string, { prosperity: number; security: number }> = {};
    const cityOf = (loc: string) => cityCache[loc] || (cityCache[loc] = cityInfo(loc, placeKind(loc)));
    for (const pr of s.player.properties) {
      const base = PROPERTY_TYPES[pr.type]?.income || 0;
      const ci = cityOf(pr.loc || s.player.location_name);
      const condProspLevel = (0.75 + ci.prosperity / 200) * (pr.cond / 100) * (1 + ((pr.level || 1) - 1) * 0.5);
      inc += base * condProspLevel;
      // İşçi ekonomisi: çalışan NPC'ler üretimi artırır ama ücret ister.
      const w = propWorkerStats(pr, base, condProspLevel);
      inc += w.gross; wages += w.wage;
      if (pr.cond > 40 && chance(0.2)) pr.cond -= 1;                                   // zamanla aşınma
      if (ci.security < 30 && chance(0.02)) {                                          // düşük güvenlikte yağma
        pr.cond = Math.max(20, pr.cond - 15);
        if (i === n - 1) push(s, "mülk_yagma", `${PROPERTY_TYPES[pr.type]?.name || "Mülkün"} (${pr.loc}) yağmaya uğradı; onarım gerek.`);
      }
    }
    inc = Math.round(inc * pmult);
    // Kurulan yerleşimler yavaşça gelişir ve vergi getirir
    if (s.settlements?.length) {
      for (const st of s.settlements) if (st.dev < 100) st.dev = Math.min(100, st.dev + 1);
      inc += settlementIncome(s);
    }
    if (s.player.crowned) inc += 15; // hükümdar hazinesi
    inc += governorIncome(s); // valilik vergi payı
    const wageCost = Math.round(wages);
    if (wageCost > 0) s.player.money -= wageCost; // işçi maaşları (her hâlükârda ödenir)
    if (inc > 0) { s.player.money += inc; if (i === n - 1) push(s, "mülk_hasat", wageCost > 0 ? `Mülk ve yerleşimlerinden ${inc} akçe gelir geldi (${wageCost} akçe işçi ücreti ödendi).` : `Mülk ve yerleşimlerinden ${inc} akçe gelir geldi.`); }
    // Aylık geçim gideri (yaş + servetle hafifçe artar) — para birikimini dengeler
    if (s.player.age >= 13 && s.player.money > 0) {
      const upkeep = Math.min(s.player.money, 2 + Math.floor(s.player.age / 12) + Math.floor(s.player.money / 600));
      s.player.money -= upkeep;
    }
    push(s, s.player.age < 13 ? "cocukluk" : "gunluk", monthlyFlavor(s, cal));
    rollLifeEvents(s, cal);
    tickFactions(s, i === n - 1);
    tickWars(s, i === n - 1);
    tickCaravan(s);
    tickEconomy(s, i === n - 1);
    if (i === n - 1 && !s.player.dead && chance(0.16)) worldNews(s);  // diyarın diline düşenler
    if (i === n - 1) claimAchievements(s); // ay sonunda yeni başarımları ödüllendir
    if (s.story) s.story.tension = Math.min(100, s.story.tension + 1); // gerilim zamanla birikir
    // Proaktif hikâye: dünya ara sıra kendiliğinden bir yay açar (gerilim arttıkça daha olası).
    if (s.story && !s.story.active && i === n - 1 && !s.player.dead && s.player.age >= 14) {
      const avail = availableArcs(s.player, s.story.completed, s.story.tension, null);
      if (avail.length && chance(0.09 + s.story.tension / 500)) {
        const a = rnd(avail);
        s.story.active = { id: a.id, stage: a.start };
        s.story.tension = Math.max(0, s.story.tension - 4);
        push(s, "hikaye_basladi", `Bir hikâye kapını çaldı: "${a.title}". (Hikâyelerim'den sürdür.)`, "kişisel", true);
      }
    }
    // İlk aylarda yeni oyuncuya garantili olumlu an (tempo: önce kazandır)
    if (s.turn <= 3 && !s.player.dead && i === n - 1) {
      const g = 6 + Math.floor(Math.random() * 8); s.player.money += g;
      push(s, "gunluk", rnd(["Komşun sıcak bir çorba ikram etti.", "Pazarda biri eline birkaç akçe sıkıştırdı.", "Anlatılan bir masal yüreğini ısıttı."]) + ` (+${g} akçe)`);
    }
    // Cliffhanger: ayın sonunda ara sıra bir sonraki ayı tease et
    if (!s.player.dead && i === n - 1 && s.player.age >= 13 && chance(0.3)) {
      push(s, "fisilti", rnd([
        "Çarşıda bir fısıltı: önümüzdeki ay bir şeyler olacak gibi…",
        "Yolcular tuhaf haberler getiriyor; ay dönmeden öğrenirsin.",
        "İçine bir his düştü — bu ay bitmeden kapın çalınabilir.",
        "Ufukta toz bulutu; haberi yakında gelir.",
      ]));
    }
  }
  if (s.history.length > 250) s.history = s.history.slice(-250);
  return s;
}

// Ocak savaşlarını ilerlet: yeni savaş çıkar, sürenleri yürüt, biteni çöz.
// Sancak hakimiyetinin başlangıç hâli: her sancağa deterministik bir hâkim fraksiyon.
export function defaultRealm(): SancakHold[] {
  const ids = FACTIONS.map((f) => f.id);
  return BEYLIKS.map((b, i) => ({ id: b.id, holder: ids[i % ids.length], contender: null, tension: 0 }));
}
// Sancak hakimiyetini başlat (yoksa).
export function ensureRealm(s: GameState): SancakHold[] {
  if (!s.realm) s.realm = defaultRealm();
  return s.realm;
}
// Fraksiyon şehir-kontrolü tikİ (Vercel faction_system gain/lose_influence + _should_attack portu):
// her sancakta gerilim birikir, rakip fraksiyon yükselir, gerilim dorukta ödüllü savaş patlar.
function tickFactions(s: GameState, announce: boolean) {
  const realm = ensureRealm(s);
  const ids = FACTIONS.map((f) => f.id);
  for (const sn of realm) {
    // Bu sancak için zaten bir savaş varsa karışma.
    if (s.wars.some((w) => w.prize === sn.id)) continue;
    sn.tension = Math.min(120, sn.tension + Math.floor(Math.random() * 5)); // 0-4 sürtüşme
    // Rakip fraksiyon yoksa ve gerilim arttıysa biri göz diker.
    if (!sn.contender && sn.tension > 40 && Math.random() < 0.35) {
      const rivals = ids.filter((id) => id !== sn.holder);
      sn.contender = rivals[Math.floor(Math.random() * rivals.length)];
      if (announce) push(s, "ocak_savasi", `${factionById(sn.contender)?.name}, ${beylikName(sn.id)} üzerinde hak iddia ediyor.`, "makro", true);
    }
    // Gerilim dorukta + rakip var → savaş patlar.
    if (sn.tension >= 100 && sn.contender) {
      s.wars.push({ a: sn.holder, b: sn.contender, turnsLeft: 4 + Math.floor(Math.random() * 4), aScore: 0, bScore: 0, prize: sn.id });
      sn.tension = 55;
      if (announce) push(s, "ocak_savasi", `${factionById(sn.holder)?.name} ile ${factionById(sn.contender)?.name}, ${beylikName(sn.id)} için savaşa tutuştu!`, "makro", true);
    } else if (!sn.contender) {
      sn.tension = Math.max(0, sn.tension - 2); // rakip yoksa gerilim yavaşça söner
    }
  }
}
function tickWars(s: GameState, announce: boolean) {
  if (!s.wars) s.wars = [];
  // Yeni jenerik savaş (ödülsüz arka plan; en fazla bağımsız 1 tane, %6 şans)
  if (s.wars.filter((w) => !w.prize).length === 0 && Math.random() < 0.06) {
    const ids = FACTIONS.map((f) => f.id);
    const a = ids[Math.floor(Math.random() * ids.length)];
    let b = ids[Math.floor(Math.random() * ids.length)];
    if (b === a) b = ids[(ids.indexOf(a) + 1) % ids.length];
    s.wars.push({ a, b, turnsLeft: 4 + Math.floor(Math.random() * 4), aScore: 0, bScore: 0 });
    if (announce) push(s, "ocak_savasi", `${factionById(a)?.name} ile ${factionById(b)?.name} arasında savaş çıktı!`, "makro", true);
  }
  for (const w of s.wars) {
    w.turnsLeft -= 1;
    // doğal gidişat
    w.aScore += Math.floor(Math.random() * 3); w.bScore += Math.floor(Math.random() * 3);
  }
  const ended = s.wars.filter((w) => w.turnsLeft <= 0);
  for (const w of ended) {
    const winner = w.aScore >= w.bScore ? w.a : w.b;
    const wf = factionById(winner);
    // Ödüllü savaşsa kazanan sancağı ele geçirir (emergent şehir-kontrolü).
    if (w.prize) {
      const sn = (s.realm || []).find((r) => r.id === w.prize);
      if (sn) {
        const flipped = sn.holder !== winner;
        sn.holder = winner; sn.contender = null; sn.tension = 20;
        if (announce) push(s, "ocak_savasi", flipped ? `${wf?.name}, ${beylikName(w.prize)}'ni ele geçirdi!` : `${wf?.name}, ${beylikName(w.prize)} üzerindeki hakimiyetini korudu.`, "makro", true);
      }
    } else if (announce) {
      push(s, "ocak_savasi", `Savaş sona erdi: ${wf?.name} üstün geldi.`, "makro", true);
    }
    // Oyuncu kazanan tarafın üyesiyse itibar
    if (s.player.faction === winner) { s.player.faction_standing[winner] = (s.player.faction_standing[winner] || 0) + 8; s.player.fame = Math.min(100, s.player.fame + 4); }
  }
  s.wars = s.wars.filter((w) => w.turnsLeft > 0);
}

// Dünya olayları / söylentiler (Vercel world_events.py + rumors.py portu, anlatısal) — makro akış.
const WORLD_NEWS: string[] = [
  "%b'nde voyvoda değişti; halk yeni efendisini tartıyor.",
  "%b ile %b2 arasında sınır anlaşmazlığı büyüyor.",
  "Uzak diyarlardan gelen bir kervan ipek ve baharat getirdi; çarşı canlandı.",
  "%b'nde kuraklık söylentileri dolaşıyor, fiyatlar ürkek.",
  "Bir derviş diyarı dolaşıp kıyamet vaaz ediyor; kimi inanıyor, kimi gülüyor.",
  "%b beyi büyük bir av tertip etti; ileri gelenler davetli.",
  "Sınır boylarında akıncı hareketliliği arttı.",
  "%b pazarında bir vurguncu yakalanıp teşhir edildi.",
  "Güneydeki köylerde hastalık söylentileri tedirginlik yaratıyor.",
  "%b'nde yeni bir han açıldı; yollar daha kalabalık.",
  "Gökte görülen kuyruklu yıldız kötüye yoruluyor.",
  "Bir ozan, %b beyini öven kasidesiyle dilden dile dolaşıyor.",
  "%b'nde ağır vergiler halkı homurdandırıyor.",
  "İki tüccar loncası %b çarşısında rekabete tutuştu.",
  "Yağmurların gecikmesi %b çiftçisini endişelendiriyor.",
];
function worldNews(s: GameState) {
  const b1 = BEYLIKS[Math.floor(Math.random() * BEYLIKS.length)].name;
  let b2 = BEYLIKS[Math.floor(Math.random() * BEYLIKS.length)].name; if (b2 === b1) b2 = BEYLIKS[0].name === b1 ? BEYLIKS[1].name : BEYLIKS[0].name;
  const line = WORLD_NEWS[Math.floor(Math.random() * WORLD_NEWS.length)].replace("%b2", b2).replace("%b", b1);
  push(s, "dunya", line, "makro");
}

// Ekonomi: piyasa zamanla dengeye döner; ara sıra kıtlık/bolluk şoku.
function tickEconomy(s: GameState, announce: boolean) {
  if (s.econ === undefined) s.econ = 1;
  // dengeye dön
  s.econ += (1 - s.econ) * 0.25;
  if (Math.random() < 0.08) {
    if (Math.random() < 0.5) { s.econ = Math.min(1.5, s.econ + 0.22); if (announce) push(s, "piyasa", "Kıtlık baş gösterdi; pazarda fiyatlar fırladı.", "makro"); }
    else { s.econ = Math.max(0.7, s.econ - 0.18); if (announce) push(s, "piyasa", "Bereketli hasat; pazarda fiyatlar düştü.", "makro"); }
  }
  s.econ = Math.round(s.econ * 100) / 100;
  // Geçici piyasa olayı: süresi dolanı kapat, ara sıra yenisini başlat
  if (s.marketEvent && s.marketEvent.until <= s.turn) s.marketEvent = null;
  if (!s.marketEvent && Math.random() < 0.07) {
    const ev = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
    s.marketEvent = { goods: ev.goods, mult: ev.mult, until: s.turn + ev.months, key: ev.key };
    if (announce) push(s, "piyasa", ev.text, "makro");
  }
}

// Kervan saldırı şansı (Vercel caravan._attack_chance portu): taban %12,
// itibar/savaş/ticaret becerisi/korku ile değişir, %3–40 arası kıstırılır.
function caravanAttackChance(s: GameState): number {
  const p = s.player;
  let c = 0.12;
  if (p.reputation > 60) c -= 0.04;
  if (p.reputation > 80) c -= 0.03;
  if (p.skills.trade >= 4) c -= 0.03;
  if (p.skills.trade >= 8) c -= 0.03;
  if (p.fear > 50) c -= 0.03;            // korkulan biri daha az gözü kara saldırı çeker
  if (s.wars.some((w) => w.turnsLeft > 0)) c += 0.08; // diyar savaştaysa yollar tehlikeli
  return Math.max(0.03, Math.min(0.4, c));
}
// Saldırı kaybı oranı (Vercel caravan._attack_outcome portu): savunma = güç×0.4 + dövüş×0.6.
function caravanLossPct(s: GameState): number {
  const p = s.player;
  const def = p.stats.strength * 0.4 + p.skills.combat * 0.6;
  if (def >= 12) return 0.10 + Math.random() * 0.20;  // direndin, az kaybettin
  if (def >= 6) return 0.30 + Math.random() * 0.30;   // yarısı gitti
  return 0.55 + Math.random() * 0.35;                  // güçsüz kaldın, çoğu gitti
}
// Kervanı her ay bir konak ilerlet; yolda saldırı riski, varışta kâr (Vercel process_caravan_tick portu).
function tickCaravan(s: GameState) {
  const c = s.caravan; if (!c) return;
  const p = s.player;
  // Eski kayıt göçü: çok-adımlı rota yoksa basit iki-konaklı rota kur.
  if (!c.route) { c.route = [p.location_name, c.dest]; c.step = 0; c.lost = 0; }
  const route = c.route; const last = route.length - 1;
  c.step = Math.min((c.step ?? 0) + 1, last);
  // Ara konaklarda saldırı kontrolü (varış adımında değil).
  if (c.step < last) {
    if (Math.random() < caravanAttackChance(s)) {
      const lost = Math.round(c.invested * caravanLossPct(s));
      c.invested -= lost; c.lost = (c.lost ?? 0) + lost;
      push(s, "kervan", `Kervan ${route[c.step]} yakınında eşkıyaya uğradı! ${lost} akçelik mal yağmalandı.`, "kişisel", true);
      if (c.invested <= 0) {
        push(s, "kervan", "Kervan tümüyle yağmalandı; elde bir şey kalmadı.", "kişisel", true);
        s.caravan = null;
      }
    }
    return; // hâlâ yolda
  }
  // Varış: hayatta kalan sermaye üzerinden kâr çöz.
  const mult = 1.35 + Math.random() * 0.4 + p.skills.trade * 0.03;
  const ret = Math.round(c.invested * mult);
  p.money += ret; gainSkill(s, "trade", 10);
  if (ret - c.invested > 200) p.reputation = Math.min(100, p.reputation + 2); // büyük kâr nam getirir
  const note = (c.lost ?? 0) > 0 ? ` (yolda ${c.lost} akçe yağmaya gitti)` : "";
  push(s, "kervan", `${c.dest} kervanın vardı ve mallarını sattı: ${ret} akçe${note}.`, "kişisel", true);
  s.caravan = null;
}
// Kervan gönder: akçe yatır; çok konaklı bir rota kur, her ay bir konak ilerlesin.
export function launchCaravan(prev: GameState, amount: number): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || s.caravan || amount <= 0 || p.money < amount) return s;
  const origin = p.location_name;
  const others = LOCATIONS.filter((l) => l !== origin);
  if (others.length === 0) return s;
  const dest = others[Math.floor(Math.random() * others.length)];
  // 1-2 ara konak (origin ve hedef hariç).
  const pool = others.filter((l) => l !== dest);
  const nwp = Math.min(pool.length, 1 + (Math.random() < 0.5 ? 1 : 0));
  const waypoints: string[] = [];
  for (let i = 0; i < nwp; i++) waypoints.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  const route = [origin, ...waypoints, dest];
  p.money -= amount;
  s.caravan = { invested: amount, dest, route, step: 0, lost: 0 };
  push(s, "kervan", `${amount} akçelik kervan yola çıktı: ${route.join(" → ")}. ${route.length - 1} konak sürecek.`);
  return s;
}

// Oyuncunun loncasının dahil olduğu aktif savaş (varsa).
export function playerWar(s: GameState): FactionWar | null {
  if (!s.player.faction) return null;
  return s.wars.find((w) => w.a === s.player.faction || w.b === s.player.faction) || null;
}
// Cepheye git: loncan için savaş — risk/ödül, savaş skoruna katkı.
export function supportWar(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  const w = playerWar(s); if (!w || p.dead || p.age < 13) return s;
  const mine = w.a === p.faction ? "a" : "b";
  const pw = combatPower(p);
  const win = Math.random() < Math.max(0.2, Math.min(0.9, 0.4 + pw * 0.02));
  gainSkill(s, "combat", 8);
  if (win) {
    if (mine === "a") w.aScore += 3; else w.bScore += 3;
    const loot = 20 + Math.floor(Math.random() * 25);
    p.money += loot; p.fame = Math.min(100, p.fame + 4); p.faction_standing[p.faction!] = (p.faction_standing[p.faction!] || 0) + 6;
    bumpNam(p, "mert", 4);
    p.health = Math.max(1, p.health - (8 - Math.min(6, Math.round(armorDefense(p) / 2))));
    push(s, "ocak_savasi", `Cephede loncan için savaştın ve üstün geldin (+${loot} akçe, itibar).`, "kişisel", true);
  } else {
    const hurt = 14 + Math.floor(Math.random() * 12) - armorDefense(p);
    p.health = Math.max(0, p.health - Math.max(4, hurt));
    push(s, "ocak_savasi", `Cephede ağır bir gün; yaralandın.`, "kişisel");
    if (p.health <= 0) die(s, `${p.name}, ocak savaşında şehit düştü.`);
  }
  return s;
}

const TITLE_MULT = [1, 1.4, 1.9, 2.4];
// Çalışma stilleri (Vercel work_rework.py portu): risk/ödül dengesi.
export type WorkStyle = "garantici" | "normal" | "hirsli" | "kaytarici";
export const WORK_STYLES: { id: WorkStyle; mult: number; fail: number }[] = [
  { id: "garantici", mult: 0.8, fail: 0.0 },
  { id: "normal",    mult: 1.0, fail: 0.0 },
  { id: "hirsli",    mult: 1.4, fail: 0.15 },
  { id: "kaytarici", mult: 0.4, fail: 0.20 },
];
export function work(prev: GameState, style: WorkStyle = "normal"): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || p.profession === "işsiz") return s;
  const ws = WORK_STYLES.find((w) => w.id === style) || WORK_STYLES[1];
  const pr = professionById(p.profession);
  const stat = effStat(p, PROF_STAT[p.profession] || "stamina");
  let mult = 1;
  if (p.faction === "demirci") mult += 0.2;
  if (hasPerk(p, "tefeci")) mult += 0.2;
  if (hasPerk(p, "becerikli")) mult += 0.15;
  if (hasPerk(p, "usta_eli")) mult += 0.2;
  if (hasPerk(p, "basyapit")) mult += 0.25;
  const tierBefore = pr ? careerTier(pr, p.career_xp) : 0;
  const titleMult = TITLE_MULT[tierBefore] || 1;
  const base = pr ? pr.base : 4;
  let earn = Math.round((base + stat * 2 + Math.floor(Math.random() * 6)) * mult * titleMult * ws.mult);
  p.career_xp += 1;
  gainSkill(s, PROF_SKILL[p.profession] || "crafting", 8);
  p.hunger = Math.max(0, p.hunger - (style === "kaytarici" ? 3 : 6));
  // Risk: hırslı bedenini yorar, kaytarıcı yakalanabilir
  const failed = ws.fail > 0 && Math.random() < ws.fail;
  if (failed) {
    earn = Math.round(earn * 0.3);
    if (style === "hirsli") { const hurt = 4 + Math.floor(Math.random() * 6); p.health = Math.max(0, p.health - hurt); p.money += earn; push(s, "çalışma", `Hırslı çalışırken sakatlandın (−${hurt} sağlık); kazanç düştü (${earn} akçe).`); }
    else { p.reputation = Math.max(-100, p.reputation - 2); p.money += earn; push(s, "çalışma", `Kaytarırken yakalandın; itibarın sarsıldı, az kazandın (${earn} akçe).`); }
  } else {
    p.money += earn;
    if (style === "kaytarici") p.health = Math.min(100, p.health + 2);
    push(s, "çalışma", `${careerTitle(p.profession, p.career_xp - 1)} olarak çalıştın, ${earn} akçe kazandın.`);
  }
  if (pr) { const after = careerTier(pr, p.career_xp); if (after > tierBefore) push(s, "terfi", `Yükseldin: artık ${pr.tiers[after]}!`, "kişisel", true); }
  if (!failed && chance(0.3)) rollWorkEvent(s);                 // %30 meslek mini-olayı
  return s;
}

// ── Meslek mini-olayları (Vercel work_rework.py portu) — stat testli, otomatik çözümlü ──
interface WorkEvent { text: string; stat: keyof Stats; win: string; lose: string; wMoney?: number; wHealth?: number; wRep?: number; lHealth?: number; lRep?: number; skill?: SkillKey; }
const WORK_EVENTS: Record<string, WorkEvent[]> = {
  demirci:  [{ text: "Çetin bir sipariş", stat: "strength", win: "Zorlu siparişi ustaca bitirdin", lose: "Örste elin ezildi", wMoney: 18, lHealth: 5, skill: "crafting" }],
  tüccar:   [{ text: "Kurnaz bir müşteri", stat: "charisma", win: "Müşteriyi ikna ettin, kârlı sattın", lose: "Müşteri seni dolandırdı", wMoney: 25, lRep: 2, skill: "trade" }],
  çiftçi:   [{ text: "Hava kapanıyor", stat: "stamina", win: "Hasadı vaktinde topladın", lose: "Yağmur ürünü vurdu", wMoney: 15, lHealth: 3 }],
  avcı:     [{ text: "İz süren bir av", stat: "strength", win: "Büyük bir av düşürdün", lose: "Av elinden kaçtı, yoruldun", wMoney: 20, lHealth: 4, skill: "combat" }],
  asker:    [{ text: "Ani bir devriye", stat: "strength", win: "Devriyede yararlık gösterdin", lose: "Çatışmada sıyrık aldın", wMoney: 16, wRep: 2, lHealth: 6, skill: "combat" }],
  şifacı:   [{ text: "Ağır bir hasta", stat: "intelligence", win: "Hastayı iyileştirdin, dualar aldın", lose: "Hastayı kurtaramadın", wMoney: 22, wRep: 3, lRep: 3 }],
  müzisyen: [{ text: "Bir düğün daveti", stat: "charisma", win: "Sazınla meclisi coşturdun", lose: "Telin koptu, mahcup oldun", wMoney: 18, wRep: 2, lRep: 1, skill: "social" }],
  hancı:    [{ text: "Kalabalık bir gece", stat: "charisma", win: "Hanı tıka basa doldurdun", lose: "Sarhoş kavgası çıktı", wMoney: 20, lRep: 2 }],
  kuyumcu:  [{ text: "Nazik bir takı işi", stat: "intelligence", win: "İnce işçiliğin takdir topladı", lose: "Taşı çatlattın", wMoney: 28, lHealth: 0, skill: "crafting" }],
  _:        [{ text: "Sıradan bir gün", stat: "stamina", win: "İşini sağlam yaptın, fazladan kazandın", lose: "Yorgun bir gündü", wMoney: 10, lHealth: 2 }],
};
function rollWorkEvent(s: GameState) {
  const p = s.player;
  const pool = WORK_EVENTS[p.profession] || WORK_EVENTS._;
  const ev = pool[Math.floor(Math.random() * pool.length)];
  const ok = Math.random() < 0.4 + effStat(p, ev.stat) * 0.06;
  if (ok) {
    if (ev.wMoney) p.money += ev.wMoney;
    if (ev.wHealth) p.health = Math.min(100, p.health + ev.wHealth);
    if (ev.wRep) p.reputation = Math.min(100, p.reputation + ev.wRep);
    if (ev.skill) gainSkill(s, ev.skill, 4);
    push(s, "çalışma", `${ev.text}: ${ev.win}${ev.wMoney ? ` (+${ev.wMoney} akçe)` : ""}.`);
  } else {
    if (ev.lHealth) p.health = Math.max(0, p.health - ev.lHealth);
    if (ev.lRep) p.reputation = Math.max(-100, p.reputation - ev.lRep);
    push(s, "çalışma", `${ev.text}: ${ev.lose}.`);
  }
}

export function eat(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  // önce envanterdeki yiyecek, yoksa 2 akçeye sokak yemeği
  const bonus = hasPerk(p, "tutumlu") ? 10 : 0;
  const foodId = Object.keys(p.inventory).find((id) => p.inventory[id] > 0 && ITEMS[id]?.feed);
  if (foodId) { const it = ITEMS[foodId]; p.inventory[foodId] -= 1; if (p.inventory[foodId] <= 0) delete p.inventory[foodId]; p.hunger = Math.min(100, p.hunger + (it.feed || 20) + bonus); push(s, "gunluk", `${it.name} yedin.`); return s; }
  if (p.money < 2) { push(s, "gunluk", "Yemek alacak akçen yok."); return s; }
  p.money -= 2; p.hunger = Math.min(100, p.hunger + 25 + bonus); push(s, "gunluk", "Sokaktan karnını doyurdun (2 akçe).");
  return s;
}

export function useItem(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const it = ITEMS[id];
  if (!it || !(p.inventory[id] > 0)) return s;
  p.inventory[id] -= 1; if (p.inventory[id] <= 0) delete p.inventory[id];
  if (it.feed) p.hunger = Math.min(100, p.hunger + it.feed);
  if (it.heal) p.health = Math.min(100, p.health + it.heal);
  push(s, "kullanım", `${it.name} kullandın.`);
  return s;
}

export function buyItem(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return s;
  let disc = p.faction === "tuccar" ? 0.85 : 1;
  if (hasPerk(p, "pazarlikci")) disc -= 0.10;
  const price = Math.max(1, Math.round(marketPrice(g.buy, s.econ) * disc * goodPriceMult(s, id)));
  if (p.money < price) return s;
  p.money -= price; p.inventory[id] = (p.inventory[id] || 0) + 1;
  gainSkill(s, "trade", 5);
  push(s, "ticaret", `${g.name} aldın (${price} akçe).`);
  return s;
}
// Pazarlık ederek al — karizma+ticaret başarıyı belirler; başarısızsa satıcı surat asar (tam fiyat).
export function bargainBuy(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return s;
  let disc = p.faction === "tuccar" ? 0.85 : 1;
  if (hasPerk(p, "pazarlikci")) disc -= 0.10;
  const base = Math.max(1, Math.round(marketPrice(g.buy, s.econ) * disc * goodPriceMult(s, id)));
  const ok = Math.random() < 0.4 + effStat(p, "charisma") * 0.04 + p.skills.trade * 0.03 + bargainBonus(s);
  const price = ok ? Math.max(1, Math.round(base * 0.8)) : base;
  if (p.money < price) return s;
  p.money -= price; p.inventory[id] = (p.inventory[id] || 0) + 1;
  gainSkill(s, "trade", ok ? 8 : 4);
  if (ok) {
    const why = dread(s) > 25 ? " Esnaf senden çekindi." : esteem(s) > 25 ? " İtibarın işine yaradı." : "";
    push(s, "ticaret", `Pazarlık tuttu! ${g.name} ucuza aldın (${price} akçe).${why}`);
  } else {
    const why = recognition(s) < 0.2 ? " Burada kimse seni tanımıyor, sözün geçmedi." : "";
    push(s, "ticaret", `Pazarlık tutmadı; ${g.name} tam fiyata aldın (${price} akçe).${why}`);
  }
  return s;
}
// Pazarlık taban fiyatı (lonca/perk indirimi dâhil) — müzakere ekranı için.
export function bargainBase(s: GameState, id: string): number {
  const p = s.player;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return 0;
  let disc = p.faction === "tuccar" ? 0.85 : 1;
  if (hasPerk(p, "pazarlikci")) disc -= 0.10;
  return Math.max(1, Math.round(marketPrice(g.buy, s.econ) * disc * goodPriceMult(s, id)));
}
// Pazarlık başarı olasılığı (karizma + ticaret becerisi).
export function bargainChance(s: GameState): number {
  const p = s.player;
  return Math.max(0.15, Math.min(0.95, 0.42 + effStat(p, "charisma") * 0.035 + p.skills.trade * 0.025 + bargainBonus(s)));
}
// Müzakere sonunda anlaşılan fiyattan alım.
export function negotiatedBuy(prev: GameState, id: string, price: number): GameState {
  const s = clone(prev); const p = s.player;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return s;
  if (p.money < price) return s;
  p.money -= price; p.inventory[id] = (p.inventory[id] || 0) + 1;
  gainSkill(s, "trade", 6);
  push(s, "ticaret", `Pazarlıkla ${g.name} aldın (${price} akçe).`);
  return s;
}
export function sellItem(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!(p.inventory[id] > 0)) return s;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return s;
  p.inventory[id] -= 1; if (p.inventory[id] <= 0) delete p.inventory[id];
  let sell = Math.round(marketPrice(g.sell, s.econ) * goodPriceMult(s, id));
  if (hasPerk(p, "dilbaz")) sell = Math.round(sell * 1.25);
  p.money += sell; gainSkill(s, "trade", 5); push(s, "ticaret", `${g.name} sattın (+${sell} akçe).`);
  return s;
}

// İlişki: niyetli sohbet (bağlamlı), hediye ver.
export function talkWith(prev: GameState, npc: NPC, intent: string, lang: string = "tr"): { state: GameState; line: string } {
  const s = clone(prev); const p = s.player;
  const ns = npcStateOf(s, npc.id);
  const rel = s.relationships[npc.id] || 0;
  const r: ConvResult = converse(npc, ns.mood, rel, p.stats.charisma, intent, lang as any);
  let relDelta = r.relDelta;
  if (relDelta > 0) {
    relDelta *= talkWarmthMod(s);                                  // sıcak/korkulan tanınmanın etkisi
    if (intent === "iltifat") relDelta *= 1 + allureBonus(s);      // çapkınlık iltifatı güçlendirir
    if (hasPerk(p, "dil_dokme")) relDelta *= 1.5;
    relDelta = Math.round(relDelta);
  }
  s.relationships[npc.id] = Math.max(-100, Math.min(100, rel + relDelta));
  ns.mood = Math.max(-100, Math.min(100, ns.mood + r.moodDelta));
  ns.memories.push(r.memory);
  if (ns.memories.length > 8) ns.memories = ns.memories.slice(-8);
  gainSkill(s, "social", 5);
  push(s, "sohbet", `${npc.name}: ${r.line}`);
  return { state: s, line: r.line };
}
// Eski API ile uyumluluk (basit sohbet = hoşbeş).
export function giftTo(prev: GameState, npc: NPC, itemId: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!(p.inventory[itemId] > 0)) return s;
  p.inventory[itemId] -= 1; if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
  const ns = npcStateOf(s, npc.id);
  const generous = npc.trait === "cömert" ? 4 : 0;
  s.relationships[npc.id] = Math.min(100, (s.relationships[npc.id] || 0) + 12 + generous);
  ns.mood = Math.max(-100, Math.min(100, ns.mood + 14));
  ns.memories.push(`${ITEMS[itemId]?.name || "Bir hediye"} hediye ettin.`);
  if (ns.memories.length > 8) ns.memories = ns.memories.slice(-8);
  push(s, "sohbet", `${npc.name}'a ${ITEMS[itemId]?.name || "bir hediye"} verdin. Çok sevindi.`);
  return s;
}

// Dünür gönderebilir misin? (Bekâr, 18+, karşı cinsten yetişkin, yakınlık yeterli.)
export function canCourt(p: Player, npc: NPC, rel: number): boolean {
  return !p.dead && !p.married && p.age >= 18 && npc.age >= 18 && npc.gender !== p.gender && rel >= 50;
}
// Evlenme teklifi: yakınlık + karizmaya göre kabul/ret.
export function proposeMarriage(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player; const rel = s.relationships[npc.id] || 0;
  if (!canCourt(p, npc, rel)) return s;
  const karizmaBonus = hasPerk(p, "karizmatik") ? 0.2 : 0;
  const ok = Math.random() < Math.min(0.97, 0.25 + (rel - 50) * 0.012 + p.stats.charisma * 0.03 + karizmaBonus + courtBonus(s));
  if (ok) {
    p.married = true; p.spouse_name = npc.name; p.reputation = Math.min(100, p.reputation + 5);
    bumpNam(p, "capkin", 5);
    push(s, "evlilik", `${npc.name} ile evlendin — yeni bir ocak kuruldu.`, "kişisel", true);
  } else {
    s.relationships[npc.id] = Math.max(0, rel - 8);
    push(s, "sohbet", `${npc.name} teklifini şimdilik geri çevirdi. Vakit ister.`);
  }
  return s;
}

// Seyahat: başka bir yerleşime git (pazar/atmosfer değişir, biraz tokluk gider).
export function travelTo(prev: GameState, dest: string): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || dest === p.location_name) return s;
  p.location_name = dest; p.hunger = Math.max(0, p.hunger - 5);
  push(s, "yolculuk", `${dest} yerleşimine gittin.`);
  return s;
}

// Çok rotalı seyahat: ana yol (güvenli), patika (hızlı/riskli), kervan (rahat, ücretli).
export type TravelRoute = "anayol" | "patika" | "kervan";
export const TRAVEL_ROUTES: { id: TravelRoute; label: string; desc: string }[] = [
  { id: "anayol", label: "Ana Yol", desc: "Güvenli ama yorucu." },
  { id: "patika", label: "Patika", desc: "Kestirme — ama haydut riski var." },
  { id: "kervan", label: "Kervanla", desc: "Rahat ve güvenli (8 akçe)." },
];
// ── Yol olayları (Vercel travel_rework.py portu) — otomatik stat-testli, mevcut akışa additif ──
// Rotaya göre yolda bir olay tetiklenebilir; sonuç oyuncunun istatistiğiyle çözülür ve günlüğe düşer.
function rollTravelEvent(s: GameState, route: TravelRoute) {
  const p = s.player;
  if (p.dead || p.age < 13) return;
  const chance = route === "patika" ? 0.42 : route === "kervan" ? 0.5 : 0.34;
  if (Math.random() >= chance) return;
  const test = (stat: keyof Stats, per = 0.05, base = 0.4) => Math.random() < Math.min(0.9, base + effStat(p, stat) * per);
  // Kervan rotası güvenli/sosyal olaylara yönelir; diğerleri tüm havuzu çeker.
  const pool = route === "kervan" ? ["han", "yolcu", "tuccar"] : ["han", "yolcu", "tuccar", "firtina", "gecit", "kervanf"];
  const ev = pool[Math.floor(Math.random() * pool.length)];
  if (ev === "han") {
    const cost = Math.min(p.money, 4 + Math.floor(Math.random() * 4));
    if (cost > 0) { p.money -= cost; p.health = Math.min(100, p.health + 8); p.hunger = Math.min(100, p.hunger + 12); push(s, "yolculuk", `Yol üstü bir handa mola verdin (−${cost} akçe); dinlenip karnını doyurdun.`); }
  } else if (ev === "tuccar") {
    // Gezgin satıcı: ucuza yararlı bir mal.
    const goods = ["sifa", "ekmek", "et", "bal"]; const g = goods[Math.floor(Math.random() * goods.length)];
    if (test("charisma", 0.06, 0.45)) { p.inventory[g] = (p.inventory[g] || 0) + 1; push(s, "yolculuk", `Gezgin bir satıcıyla karşılaştın; pazarlıkla ucuza bir ${ITEMS[g]?.name || g} kaptın.`, "kişisel", true); }
    else push(s, "yolculuk", "Gezgin bir satıcı malını fazla pahalı istedi; eli boş yürüdün.");
  } else if (ev === "yolcu") {
    // Yol arkadaşı (derviş/kaçak/tüccar/asker) — sohbetten beceri/irfan.
    const kinds = ["derviş", "kaçak tüccar", "yaşlı asker", "seyyah"]; const who = kinds[Math.floor(Math.random() * kinds.length)];
    if (test("charisma", 0.05, 0.5)) { gainSkill(s, "social", 12); push(s, "yolculuk", `Yolda bir ${who} ile dertleştin; sohbetinden hisse kaptın (sosyal beceri arttı).`, "kişisel", true); }
    else push(s, "yolculuk", `Yolda bir ${who} ile yürüdün; lafı pek tutmadı.`);
  } else if (ev === "firtina") {
    if (test("stamina", 0.06, 0.45)) push(s, "yolculuk", "Yolda fırtınaya yakalandın ama sağlam bir kayalığa sığınıp atlattın.");
    else { const hurt = 5 + Math.floor(Math.random() * 8); p.health = Math.max(1, p.health - hurt); p.hunger = Math.max(0, p.hunger - 8); push(s, "yolculuk", `Yolda fırtına seni hırpaladı (−${hurt} sağlık).`, "kişisel", true); }
  } else if (ev === "gecit") {
    if (test("strength", 0.06, 0.42)) { gainSkill(s, "combat", 6); push(s, "yolculuk", "Sarp bir geçidi güçle aşıp kestirme yaptın."); }
    else { const hurt = 4 + Math.floor(Math.random() * 7); p.health = Math.max(1, p.health - hurt); push(s, "yolculuk", `Sarp geçitte ayağın kaydı, biraz hırpalandın (−${hurt} sağlık).`); }
  } else if (ev === "kervanf") {
    // Kervan fırsatı: ticaret testiyle küçük kâr.
    if (test("intelligence", 0.05, 0.4)) { const gain = 10 + Math.floor(Math.random() * 25); p.money += gain; gainSkill(s, "trade", 6); push(s, "yolculuk", `Yolda bir kervana ufak bir ticaret yaptın (+${gain} akçe).`, "kişisel", true); }
    else push(s, "yolculuk", "Yolda bir kervan gördün ama denk bir alışveriş çıkmadı.");
  }
  if (p.health <= 0) die(s, `${p.name}, yolda can verdi.`);
}

export function travelBy(prev: GameState, dest: string, route: TravelRoute): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || dest === p.location_name) return s;
  if (route === "kervan") {
    if (p.money < 8) { push(s, "yolculuk", "Kervana verecek akçen yok."); return s; }
    p.money -= 8; p.hunger = Math.max(0, p.hunger - 3); p.location_name = dest;
    push(s, "yolculuk", `Kervana katılıp ${dest}'e rahatça vardın.`);
  } else if (route === "patika") {
    p.hunger = Math.max(0, p.hunger - 7); p.location_name = dest;
    const ambush = Math.random() < Math.max(0.08, 0.3 - combatPower(p) * 0.012);
    if (ambush) {
      const hurt = 8 + Math.floor(Math.random() * 10) - armorDefense(p);
      const loss = Math.min(p.money, 5 + Math.floor(Math.random() * 15));
      p.health = Math.max(0, p.health - Math.max(3, hurt)); p.money -= loss;
      push(s, "yolculuk", `Patikada haydut bastı! ${dest}'e zor ulaştın (−sağlık, −${loss} akçe).`, "kişisel", true);
      if (p.health <= 0) die(s, `${p.name}, patikada haydutlara yenik düştü.`);
    } else {
      push(s, "yolculuk", `Patikadan kestirerek ${dest}'e vardın.`);
    }
  } else {
    p.hunger = Math.max(0, p.hunger - 5); p.location_name = dest;
    push(s, "yolculuk", `Ana yoldan ${dest} yerleşimine gittin.`);
  }
  return s;
}

export const ALL_PROFS = PROFS;
// Meslek değiştir (13+). Yeni bir zanaata geçersin.
export function changeProfession(prev: GameState, prof: string): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || prof === p.profession || !PROFS.includes(prof)) return s;
  p.profession = prof; p.career_xp = 0;
  push(s, "meslek_değişimi", `${professionById(prof)?.name || cap(prof)} mesleğine geçtin — yeniden en alttan.`, "kişisel", true);
  return s;
}

// Özellik puanı harca.
export function allocateStat(prev: GameState, key: keyof Stats): GameState {
  const s = clone(prev); const p = s.player;
  if (p.stat_points <= 0) return s;
  p.stat_points -= 1; p.stats[key] += 1;
  return s;
}

// ── Mektep: 4 ders, her biri farklı yön geliştirir ──
export interface Subject { id: string; name: string; icon: string; desc: string; }
export const SUBJECTS: Subject[] = [
  { id: "din",      name: "Din", icon: "prayer-beads", desc: "Dindarlık ve gönül huzuru." },
  { id: "matematik",name: "Matematik", icon: "scales", desc: "Zekâ ve ticaret aklı." },
  { id: "edebiyat", name: "Edebiyat", icon: "book", desc: "Karizma ve hitabet." },
  { id: "beden",    name: "Beden", icon: "fist", desc: "Güç ve savaş kabiliyeti." },
];
export interface StudyResult { state: GameState; key: string; chips: { label: string; col: string }[]; blocked?: boolean; }
// Bir derste bu ay çalışıldı mı? (Vercel: haftada 1 ders → mobilde ayda 1 ders.)
export function studiedThisTurn(s: GameState): boolean { return s.player.last_study_turn === s.turn; }
// Sınava kaç ders kaldı (4 derste bir sınav).
export function lessonsToExam(p: Player): number { return 4 - ((p.lesson_count || 0) % 4); }
const EXAM_STAT: Record<string, keyof Stats> = { din: "intelligence", matematik: "intelligence", edebiyat: "charisma", beden: "strength" };
// Bir ders çalış — ayda 1 ders sınırı + 4 derste bir sınav (school.py portu).
export function studySubject(prev: GameState, id: string): StudyResult {
  const s = clone(prev); const p = s.player;
  if (p.dead) return { state: s, key: "", chips: [] };
  if (p.last_study_turn === s.turn) return { state: s, key: "", chips: [], blocked: true }; // bu ay ders işlendi
  p.last_study_turn = s.turn;
  p.lesson_count = (p.lesson_count || 0) + 1;
  p.hunger = Math.max(0, p.hunger - 5);
  const lucky = hasPerk(p, "mucit") || chance(0.5);
  const chips: { label: string; col: string }[] = [];
  let key = "";
  if (id === "din") {
    bumpNam(p, "dindar", 4); chips.push({ label: "Dindar +4", col: "#9C7BC4" });
    if (lucky) { p.honor = Math.min(100, p.honor + 2); chips.push({ label: "Şeref +2", col: "#7FA66A" }); key = "ev.study.din.l"; push(s, "mektep", "Dini ilimler okudun; gönlün huzur buldu.", "kişisel", false, { k: key }); }
    else { key = "ev.study.din.p"; push(s, "mektep", "Mektepte dua ve hikmet dinledin.", "kişisel", false, { k: key }); }
  } else if (id === "matematik") {
    gainSkill(s, "trade", 5); chips.push({ label: "Ticaret +5", col: "#C9A84C" });
    if (lucky) { p.stat_points += 1; chips.push({ label: "Özellik Puanı +1", col: "#E0BC5A" }); key = "ev.study.matematik.l"; push(s, "mektep", "Hesap çalıştın; bir özellik puanı kazandın.", "kişisel", false, { k: key }); }
    else { key = "ev.study.matematik.p"; push(s, "mektep", "Rakamlarla boğuştun.", "kişisel", false, { k: key }); }
  } else if (id === "edebiyat") {
    gainSkill(s, "social", 5); chips.push({ label: "Sosyal +5", col: "#C9A84C" });
    if (lucky) { p.stat_points += 1; chips.push({ label: "Özellik Puanı +1", col: "#E0BC5A" }); key = "ev.study.edebiyat.l"; push(s, "mektep", "Edebiyat çalıştın; bir özellik puanı kazandın.", "kişisel", false, { k: key }); }
    else { key = "ev.study.edebiyat.p"; push(s, "mektep", "Beyitler ezberledin.", "kişisel", false, { k: key }); }
  } else {
    gainSkill(s, "combat", 5); chips.push({ label: "Savaş +5", col: "#C9A84C" });
    if (lucky) { p.stat_points += 1; chips.push({ label: "Özellik Puanı +1", col: "#E0BC5A" }); key = "ev.study.beden.l"; push(s, "mektep", "Beden çalıştın; bir özellik puanı kazandın.", "kişisel", false, { k: key }); }
    else { key = "ev.study.beden.p"; push(s, "mektep", "Ter döktün, güçlendin.", "kişisel", false, { k: key }); }
  }
  // ── Sınav: her 4 derste bir (ilgili statla test) ──
  if (p.lesson_count % 4 === 0) {
    const passed = Math.random() < Math.min(0.9, 0.35 + effStat(p, EXAM_STAT[id] || "intelligence") * 0.12);
    if (passed) { p.stat_points += 1; chips.push({ label: "📜 Sınav geçildi · Puan +1", col: "#E0BC5A" }); push(s, "mektep", "Sınava girdin ve geçtin — bir özellik puanı kazandın.", "kişisel", true); }
    else { chips.push({ label: "📜 Sınavda zorlandın", col: "#C0556B" }); push(s, "mektep", "Sınava girdin ama zorlandın; daha çok çalışmalısın.", "kişisel", false); }
  }
  return { state: s, key, chips };
}

// ── Suç/Gölge: risk/ödül ──
export function doCrime(prev: GameState, kind: "yankesicilik" | "soygun"): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13) return s;
  const base = kind === "soygun" ? 0.45 : 0.7;            // başarı şansı
  const golgeBonus = p.faction === "golge" ? 0.12 : 0;     // Gölge Kardeşliği avantajı
  const success = Math.random() < base + p.stats.charisma * 0.01 + golgeBonus + crimeSuccessMod(s);
  gainSkill(s, "social", 4);
  if (success) {
    const loot = kind === "soygun" ? 25 + Math.floor(Math.random() * 40) : 6 + Math.floor(Math.random() * 16);
    p.money += loot; p.fear = Math.min(100, p.fear + (kind === "soygun" ? 5 : 2));
    bumpNam(p, "zalim", kind === "soygun" ? 5 : 2);
    const why = dread(s) > 30 ? " Korkulan adın kurbanını dondurdu." : "";
    push(s, "suç", `${kind === "soygun" ? "Bir soygun" : "Bir yankesicilik"} işini başardın (+${loot} akçe).${why}`);
  } else {
    const fine = Math.min(p.money, kind === "soygun" ? 30 : 10);
    const hurt = (kind === "soygun" ? 10 : 3) * (p.faction === "asker" ? 0.5 : 1);
    const extra = crimeCaughtPenalty(s);
    p.money -= fine; p.reputation = Math.max(-100, p.reputation - 8 - extra); p.health = Math.max(0, p.health - hurt);
    const why = extra >= 4 ? " Senin gibi tanınmış birinden beklenmezdi; ceza ağır oldu." : "";
    push(s, "suç_yakalandı", `Yakalandın! ${fine} akçe ceza, itibarın sarsıldı.${why}`, "kişisel");
  }
  return s;
}

// ── Fırsat: kabul edilince stat'a göre çözülür ──
export interface Opportunity { id: string; title: string; desc: string; reward: number; risk: number; stat: keyof Stats; }
export function resolveOpportunity(prev: GameState, opp: Opportunity): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead) return s;
  const success = Math.random() > opp.risk - p.stats[opp.stat] * 0.03;
  p.hunger = Math.max(0, p.hunger - 5);
  if (success) {
    let reward = opp.reward;
    if (hasPerk(p, "keskin_goz")) reward = Math.round(reward * 1.3);
    p.money += reward; p.reputation = Math.min(100, p.reputation + 4);
    gainSkill(s, opp.stat === "strength" ? "combat" : opp.stat === "charisma" ? "social" : "trade", 7);
    push(s, "görev_tamamlandı", `"${opp.title}" görevini başardın (+${reward} akçe).`, "kişisel", true);
  }
  else { p.reputation = Math.max(-100, p.reputation - 3); push(s, "görev_başarısız", `"${opp.title}" görevinde başarısız oldun.`); }
  return s;
}

// Tura göre deterministik fırsat listesi.
export function opportunitiesFor(s: GameState): Opportunity[] {
  const pool: Omit<Opportunity, "id">[] = [
    { title: "Pazarda Düzen", desc: "Voyvoda kavgayı yatıştırmanı istiyor.", reward: 30, risk: 0.4, stat: "charisma" },
    { title: "Kervan Muhafızlığı", desc: "Tehlikeli yolda kervana eşlik et.", reward: 60, risk: 0.6, stat: "strength" },
    { title: "Şifalı Ot Topla", desc: "Şifacı için dağdan ot getir.", reward: 20, risk: 0.25, stat: "stamina" },
    { title: "Hesap Tut", desc: "Tüccarın defterini düzelt.", reward: 25, risk: 0.3, stat: "intelligence" },
    // ── Vercel opportunities.py'den ek fırsatlar ──
    { title: "Kurt Avı", desc: "Köyü basan kurt sürüsünü avla.", reward: 55, risk: 0.55, stat: "strength" },
    { title: "Alacak Tahsili", desc: "Borçlu bir esnaftan tüccarın alacağını topla.", reward: 35, risk: 0.45, stat: "charisma" },
    { title: "Haber Götür", desc: "Komşu sancağa acele bir mektup ulaştır.", reward: 28, risk: 0.35, stat: "stamina" },
    { title: "Köprü Onarımı", desc: "Sel basmış köprünün onarımına el ver.", reward: 32, risk: 0.4, stat: "strength" },
    { title: "Sınır Devriyesi", desc: "Sancak beyi için sınır yolunu kolla.", reward: 48, risk: 0.5, stat: "strength" },
    { title: "Düğün Kâhyalığı", desc: "Bir konağın düğün hazırlığını yönet.", reward: 38, risk: 0.3, stat: "charisma" },
    { title: "Mahkeme Şahitliği", desc: "Kadı huzurunda adil bir ifade ver.", reward: 26, risk: 0.35, stat: "intelligence" },
    { title: "Maden Keşfi", desc: "Dağ eteğinde damar olduğu söylenen yeri araştır.", reward: 70, risk: 0.65, stat: "intelligence" },
  ];
  const seed = (s.turn * 2654435761) >>> 0;
  return pool.filter((_, i) => ((seed >> i) & 1) === 1 || i === seed % pool.length)
    .map((o, i) => ({ ...o, id: `opp_${s.turn}_${i}` }));
}

// Mülk satın al
export function buyProperty(prev: GameState, type: string): GameState {
  const s = clone(prev); const p = s.player; const t = PROPERTY_TYPES[type];
  if (!t || p.dead || p.money < t.cost) return s;
  p.money -= t.cost; p.properties.push({ type, loc: p.location_name, cond: 100 });
  push(s, "mülk_alım", `${p.location_name}'de ${t.name} satın aldın. Adına bir tapu daha.`, "kişisel", true);
  return s;
}
// Onarım bedeli (eksik kondisyonla orantılı).
export function repairCost(pr: Property): number { return Math.max(1, Math.round((PROPERTY_TYPES[pr.type]?.cost || 100) * 0.3 * (100 - pr.cond) / 100)); }
export function repairProperty(prev: GameState, index: number): GameState {
  const s = clone(prev); const p = s.player; const pr = p.properties[index];
  if (!pr || pr.cond >= 100) return s;
  const cost = repairCost(pr); if (p.money < cost) return s;
  p.money -= cost; pr.cond = 100;
  push(s, "mülk", `${PROPERTY_TYPES[pr.type]?.name || "Mülk"} (${pr.loc}) onarıldı (−${cost} akçe).`);
  return s;
}

// Atayı bir cümlede özetle (hanedan defteri için).
function dynastyNote(p: Player): string {
  if (p.fame >= 60) return "Adı destanlara karıştı.";
  if (p.reputation >= 50) return "Diyarda saygın bir isimdi.";
  if (p.properties.length >= 3) return "Geride büyük bir mülk bıraktı.";
  if (p.fear >= 50) return "Korkulan bir isimdi.";
  if (p.children.length >= 3) return "Kalabalık bir soy bıraktı.";
  return "Sade bir hayat sürdü.";
}

// ── Mersiye: bir hayat biterken kişiye özel kapanış ──
export interface Eulogy { epithet: string; lines: string[]; close: string; }
// Lakap: kişiyi en çok tanımlayan tek vasıf.
export function deathEpithet(s: GameState): string {
  const p = s.player; const n = p.nam || ({} as Nam);
  if (p.crowned) return "Hükümdar";
  if (p.fame >= 80) return "Destan Olan";
  if (p.fear >= 60) return "Korkulan";
  if ((n.dindar || 0) >= 55) return "Hacı";
  if (p.honor >= 60) return "Adil";
  if ((n.comert || 0) >= 60) return "Eli Açık";
  if ((n.zalim || 0) >= 60) return "Zalim";
  if ((n.mert || 0) >= 55) return "Mert";
  if ((n.capkin || 0) >= 60) return "Gönül Çelen";
  if (p.reputation >= 45) return "Saygın";
  if (p.fame < 12) return "Meçhul";
  return "";
}
// Hayatı dokuyan 2-4 cümle (Türkçe anlatı, oyunun sesi).
export function eulogy(s: GameState): Eulogy {
  const p = s.player; const n = p.nam || ({} as Nam);
  const lines: string[] = [];
  // Tanınma / kimlik
  if (p.fame >= 60) lines.push("Adı diyarın dört bir yanında bilinir, sofralarda anılırdı.");
  else if (p.fame >= 30) lines.push("Çevresinde tanınan, sözü geçen biriydi.");
  else lines.push("Sade, tanıdık bir hayat sürdü; adı kendi diyarında kaldı.");
  // En belirgin huy
  if (p.fear >= 50 || (n.zalim || 0) >= 50) lines.push("Geçtiği yerde insanlar sesini alçaltırdı.");
  else if (p.honor >= 50 || (n.mert || 0) >= 50) lines.push("Sözünün eri, adaletiyle anılan biriydi.");
  else if ((n.comert || 0) >= 50) lines.push("Kapısı yoksula açık, eli bol bir gönül insanıydı.");
  else if ((n.dindar || 0) >= 50) lines.push("Dindarlığı ve gönül huzuruyla bilinirdi.");
  // Taht & mülk
  if (p.crowned) lines.push("Bir gün tahta çıkıp diyara hükmetti; tacı soyuna emanet etti.");
  const holds: string[] = [];
  if (p.properties.length) holds.push(`${p.properties.length} mülk`);
  const settleN = s.settlements?.length || 0;
  if (settleN) holds.push(`${settleN} yerleşim`);
  if (holds.length) lines.push(`Geride ${holds.join(" ve ")} bıraktı.`);
  // Aile
  if (p.children.length) lines.push(p.spouse_name ? `${p.spouse_name} ile bir ocak kurdu, ${p.children.length} evlat yetiştirdi.` : `${p.children.length} evlat yetiştirdi; soyu devam edecek.`);
  else lines.push("Soyunu sürdürecek bir evlat bırakmadı; hikâyesi onunla kapandı.");
  return { epithet: deathEpithet(s), lines, close: dynastyNote(p) };
}

// Çocuğa yatırım yap (hayattayken).
export function investInChild(prev: GameState, childName: string, investId: string): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || !p.children.includes(childName)) return s;
  const inv = INVESTMENTS.find((x) => x.id === investId); if (!inv) return s;
  if (!p.child_invests) p.child_invests = {};
  const list = p.child_invests[childName] || [];
  if (list.includes(investId) || p.money < inv.cost) return s;
  p.money -= inv.cost; p.child_invests[childName] = [...list, investId];
  push(s, "nesil_yatirim", `${childName} için ${inv.label.toLowerCase()} yatırımı yaptın.`);
  return s;
}

// Nesil mirası: ölünce vâris (varsayılan ilk çocuk) ile devam et. Vasiyet stili miras oranını belirler.
export function continueAsHeir(prev: GameState, willId = "esit", heirName?: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!p.dead || p.children.length === 0) return s;
  const heir = heirName && p.children.includes(heirName) ? heirName : p.children[0];
  const will = WILL_STYLES.find((w) => w.id === willId) || WILL_STYLES[0];
  const inheritMoney = Math.floor(p.money * will.frac) + 20;
  const props = [...p.properties];
  const gen = p.generation + 1;
  const surname = p.surname;
  // Vârise yapılan yatırımların başlangıç avantajları
  const invests = (p.child_invests && p.child_invests[heir]) || [];
  const stats = { strength: 1, intelligence: 1, charisma: 1, stamina: 2 };
  const skills = { combat: 0, trade: 0, crafting: 0, social: 0 };
  let startPoints = gen; let startMoney = inheritMoney; let startHealth = 100; let startRep = Math.floor(p.reputation / 2) + will.repBonus;
  const investNotes: string[] = [];
  for (const inv of invests) {
    if (inv === "egitim") { stats.intelligence += 2; startPoints += 1; investNotes.push("eğitimli"); }
    if (inv === "savas") { stats.strength += 2; skills.combat = 2; investNotes.push("savaş görmüş"); }
    if (inv === "zanaat") { skills.crafting = 2; startMoney += 30; investNotes.push("zanaat öğrenmiş"); }
    if (inv === "sosyal") { stats.charisma += 2; skills.social = 2; investNotes.push("terbiyeli"); }
    if (inv === "saglik") { startHealth = 100; startRep += 6; investNotes.push("dinç"); }
  }
  const ancestor: DynastyRecord = {
    generation: p.generation, name: p.name, profession: p.profession === "işsiz" ? "—" : p.profession,
    diedAge: p.age, fame: Math.round(p.fame), reputation: Math.round(p.reputation), faction: p.faction,
    note: dynastyNote(p),
  };
  const dynasty = [...(prev.dynasty || []), ancestor];
  const noteStr = investNotes.length ? ` ${heir}, ${investNotes.join(", ")} olarak yetişti.` : "";
  const ns: GameState = {
    turn: 0, seed: Math.floor(Math.random() * 1e9), world: { ready: true }, relationships: {}, dynasty, npc_state: {}, story: { active: null, completed: [], tension: 0 }, wars: [], caravan: null, econ: 1,
    settlements: prev.settlements || [], // dynastinin kurduğu yerleşimler vârise kalır
    player: {
      name: surname ? `${heir} ${surname}` : heir, surname, gender: Math.random() < 0.5 ? "erkek" : "kadın",
      base_age: 7, age: 7, money: startMoney, profession: "işsiz", health: startHealth, hunger: 100,
      reputation: Math.max(-100, Math.min(100, startRep)), honor: 0, fear: 0, fame: Math.floor(p.fame / 3),
      stats, stat_points: startPoints,
      dead: false, location_name: p.location_name, home_name: p.home_name || p.location_name, married: false, spouse_name: null, children: [],
      mother: p.gender === "erkek" ? (p.spouse_name || rnd(SPOUSE_K)) : p.name, father: p.gender === "erkek" ? p.name : (p.spouse_name || rnd(SPOUSE_E)),
      inventory: { ekmek: 2 }, properties: props, generation: gen,
      faction: null, faction_standing: {},
      skills, skill_xp: { combat: skills.combat * 100, trade: 0, crafting: skills.crafting * 100, social: skills.social * 100 },
      perks: [], injuries: [], career_xp: 0, nam: { comert: 0, zalim: 0, capkin: 0, dindar: 0, mert: 0 }, child_invests: {}, equipped: { silah: null, zirh: null },
      crowned: p.crowned || false, will_pref: "esit", fates: [], claimed: [], governorships: [], // taht irsîdir; kader/başarım/valilik yeni baştan
    },
    history: [{ day: 0, type: "nesil_devri", text: `${gen}. nesil: ${heir}, ${will.label.toLowerCase()} vasiyetiyle mirası devraldı (${inheritMoney} akçe, ${props.length} mülk).${noteStr}`, scope: "kişisel", landmark: true }],
  };
  return ns;
}

// ── Örgüt eylemleri ──
// Örgüt için bir görev üstlen: akçe + örgüt itibarı kazandırır, biraz tokluk götürür.
// Lonca rütbeleri — standing'e göre yükseliş (unvan + ödül çarpanı).
export const FACTION_RANKS = [
  { min: 0, title: "Yeni Üye", mult: 1.0 },
  { min: 30, title: "Güvenilir", mult: 1.15 },
  { min: 70, title: "Kıdemli", mult: 1.3 },
  { min: 120, title: "Lonca Büyüğü", mult: 1.5 },
];
export function factionRankIndex(standing: number): number {
  let idx = 0; for (let i = 0; i < FACTION_RANKS.length; i++) if (standing >= FACTION_RANKS[i].min) idx = i; return idx;
}
export function factionRank(standing: number) { return FACTION_RANKS[factionRankIndex(standing)]; }

export function doFactionTask(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const f = factionById(id);
  if (!f || p.dead || p.age < 13) return s;
  const rank = factionRank(p.faction_standing[id] || 0);            // rütbe ödülü ölçekler
  const statBonus = p.stats[f.stat] * 2;
  let reward = Math.round((f.task.reward + statBonus + Math.floor(Math.random() * 8)) * rank.mult);
  if (id === "tuccar" && hasPerk(p, "guvenli_kervan")) reward = Math.round(reward * 1.5);
  p.money += reward; p.hunger = Math.max(0, p.hunger - 6);
  let standing = f.task.standing * factionStandingMod(s, id);
  if (hasPerk(p, "lider")) standing = standing * 1.5;
  standing = Math.round(standing);
  p.faction_standing[id] = (p.faction_standing[id] || 0) + standing;
  p.reputation = Math.min(100, p.reputation + 2);
  gainSkill(s, f.stat === "strength" ? "combat" : f.stat === "charisma" ? "social" : "trade", 6);
  push(s, "örgüt_görev", `${f.name} için "${f.task.label}" görevini gördün (+${reward} akçe, itibar arttı).`);
  return s;
}

// Bir örgüte katıl: yeterli örgüt itibarı (görevle kazanılır) gerekir. Tek örgüt üyeliği.
export function joinFaction(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const f = factionById(id);
  if (!f || p.dead || p.age < 13) return s;
  if (p.faction === id) return s;
  const need = hasPerk(p, "karizmatik") ? Math.round(f.joinRep * 0.8) : f.joinRep;
  if ((p.faction_standing[id] || 0) < need) return s;
  p.faction = id; p.reputation = Math.min(100, p.reputation + 6);
  push(s, "örgüt_katılım", `${f.name} saflarına katıldın. ${f.perk}`, "kişisel", true);
  return s;
}

// Örgütten ayrıl.
export function leaveFaction(prev: GameState): GameState {
  const s = clone(prev); const p = s.player; const f = factionById(p.faction);
  if (!f) return s;
  p.faction = null; p.reputation = Math.max(-100, p.reputation - 4);
  push(s, "örgüt_ayrılma", `${f.name} saflarından ayrıldın.`, "kişisel");
  return s;
}

// ── Sosyal mevki: itibar · şeref · korku · şöhret ──
// Mevki kademeleri (değere göre unvan).
export interface SocialAxis { key: "reputation" | "honor" | "fear" | "fame"; label: string; icon: string; tiers: string[]; desc: string; }
export const SOCIAL_AXES: SocialAxis[] = [
  { key: "reputation", label: "İtibar", icon: "⚜", desc: "Halkın gözündeki saygınlığın.", tiers: ["Lekeli", "Sıradan", "Hatırı Sayılır", "Saygın", "Diyarın İncisi"] },
  { key: "honor", label: "Şeref", icon: "🕊", desc: "Sözünün ve adaletinin ağırlığı.", tiers: ["Onursuz", "Sıradan", "Mert", "Şerefli", "Erdemin Timsali"] },
  { key: "fear", label: "Korku", icon: "🌒", desc: "Adının uyandırdığı çekince.", tiers: ["Zararsız", "Bilinen", "Çekinilen", "Korkulan", "Diyarın Kâbusu"] },
  { key: "fame", label: "Şöhret", icon: "🔥", desc: "Adının ne kadar uzağa ulaştığı.", tiers: ["Meçhul", "Tanınan", "Ünlü", "Meşhur", "Destanlaşan"] },
];
export function socialTierIndex(value: number): number {
  const v = Math.max(0, value);
  if (v >= 80) return 4;
  if (v >= 55) return 3;
  if (v >= 30) return 2;
  if (v >= 10) return 1;
  return 0;
}
export function socialTier(axis: SocialAxis, value: number): string {
  return axis.tiers[socialTierIndex(value)];
}

// Ziyafet ver: akçe harcayıp şöhret + itibar kazan.
export function hostFeast(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13) return s;
  const cost = 40;
  if (p.money < cost) { push(s, "sosyal", "Ziyafet verecek akçen yok."); return s; }
  let fame = 8, rep = 5;
  if (hasPerk(p, "sohret_avcisi")) fame += 5;
  if (hasPerk(p, "diplomat")) { fame = Math.round(fame * 1.5); rep = Math.round(rep * 1.5); }
  p.money -= cost; p.fame = Math.min(100, p.fame + fame); p.reputation = Math.min(100, p.reputation + rep);
  gainSkill(s, "social", 5); bumpNam(p, "comert", 8);
  const why = recognition(s) > 0.5 ? " Tanınan biri olduğundan ziyafetin çok konuşuldu." : "";
  push(s, "sosyal", `Köye bir ziyafet verdin; adın dilden dile dolaştı.${why}`, "kişisel", true);
  return s;
}

// Sadaka dağıt: akçe harcayıp şeref + itibar kazan.
export function giveAlms(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13) return s;
  const cost = 15;
  if (p.money < cost) { push(s, "sosyal", "Sadaka verecek akçen yok."); return s; }
  let honor = 7, rep = 3;
  if (hasPerk(p, "hosgoru")) honor += 5;
  if (hasPerk(p, "diplomat")) { honor = Math.round(honor * 1.5); rep = Math.round(rep * 1.5); }
  p.money -= cost; p.honor = Math.min(100, p.honor + honor); p.reputation = Math.min(100, p.reputation + rep);
  gainSkill(s, "social", 5);
  bumpNam(p, "comert", 6); bumpNam(p, "dindar", 5);
  push(s, "sosyal", "Yoksullara sadaka dağıttın; vicdanın hafifledi, şerefin yükseldi.");
  return s;
}

// Gözdağı ver: korku kazan, itibarı biraz zedeler.
export function intimidate(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13) return s;
  const ok = hasPerk(p, "kan_donduran") || Math.random() < 0.5 + p.stats.strength * 0.04 + dread(s) / 300;
  if (ok) { let fear = hasPerk(p, "kan_donduran") ? 12 : 8; if (hasPerk(p, "diplomat")) fear = Math.round(fear * 1.5); p.fear = Math.min(100, p.fear + fear); p.reputation = Math.max(-100, p.reputation - 3); bumpNam(p, "zalim", 7); const why = dread(s) > 30 ? " Zaten korkulan adın, bir bakışın yetti." : ""; push(s, "sosyal", `Birine gözdağı verdin; adın çekinilen biri oldu.${why}`); }
  else { p.reputation = Math.max(-100, p.reputation - 5); p.honor = Math.max(0, p.honor - 3); const why = esteem(s) > 25 ? " Sevilen biri olduğundan kimse seni ciddiye almadı." : ""; push(s, "sosyal", `Gözdağın ters tepti; itibarın zarar gördü.${why}`); }
  return s;
}

// ── Savaş / Çatışma ──
export interface Encounter { id: string; title: string; desc: string; power: number; reward: number; fame: number; honor: number; danger: number; }
export const ENCOUNTERS: Encounter[] = [
  { id: "haydut",  title: "Yol Haydutları",   desc: "Pusudaki haydutlar kervanına göz dikti.", power: 6,  reward: 35,  fame: 4,  honor: 3,  danger: 14 },
  { id: "ayi",     title: "Dağda Ayı",        desc: "Patikada azgın bir ayıyla burun buruna geldin.", power: 8,  reward: 30,  fame: 5,  honor: 4,  danger: 20 },
  { id: "duello",  title: "Meydan Okuma",     desc: "Bir yiğit seni teke tek dövüşe çağırdı.", power: 9,  reward: 25,  fame: 7,  honor: 6,  danger: 18 },
  { id: "turnuva", title: "Cirit Turnuvası",  desc: "Meydanda cirit oynanıyor; gözler üstünde.", power: 10, reward: 45,  fame: 11, honor: 7,  danger: 12 },
  { id: "korsan",  title: "Nehir Korsanları", desc: "Geçidi tutan korsanlar haraç istiyor.",     power: 12, reward: 60,  fame: 9,  honor: 6,  danger: 24 },
  { id: "sinir",   title: "Sınır Çatışması",  desc: "Sancak beyinin emrinde sınırı koru.",      power: 13, reward: 70,  fame: 12, honor: 10, danger: 26 },
  { id: "reis",    title: "Eşkıya Reisi",     desc: "Diyarı kasıp kavuran eşkıya reisini avla.", power: 15, reward: 95,  fame: 15, honor: 11, danger: 30 },
  { id: "akin",    title: "Akın",             desc: "Akıncılarla düşman topraklarına bir akın.", power: 16, reward: 110, fame: 17, honor: 12, danger: 33 },
  { id: "kusatma", title: "Kale Kuşatması",   desc: "Surların önünde kanlı bir kuşatma.",        power: 18, reward: 130, fame: 20, honor: 14, danger: 38 },
];
// Oyuncunun savaş gücü: kuvvet + dayanıklılık/2 + silah + asker avantajı.
export function combatPower(p: Player): number {
  let pw = effStat(p, "strength") * 2 + effStat(p, "stamina") + p.skills.combat;
  const wid = p.equipped?.silah; const w = wid ? ITEMS[wid] : null;
  pw += w?.power || ((p.inventory["bicak"] || 0) > 0 ? 4 : 0); // kuşanılı silah, yoksa elindeki bıçak
  if (p.faction === "asker") pw += 3;
  if (hasPerk(p, "cevik")) pw += 3;
  if (hasPerk(p, "nisanci")) pw += 5;
  return pw;
}
// Kuşanılı zırhın savunması (savaşta alınan hasarı azaltır).
export function armorDefense(p: Player): number {
  const aid = p.equipped?.zirh; return aid ? (ITEMS[aid]?.defense || 0) : 0;
}
// Eşya kuşan (silah/zırh) — envanterden çıkarıp slota koyar, eskisini geri verir.
export function equipItem(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const it = ITEMS[id];
  if (!it || !(p.inventory[id] > 0) || (it.kind !== "silah" && it.kind !== "zirh")) return s;
  const slot: "silah" | "zirh" = it.kind === "silah" ? "silah" : "zirh";
  p.inventory[id] -= 1; if (p.inventory[id] <= 0) delete p.inventory[id];
  const old = p.equipped[slot];
  if (old) p.inventory[old] = (p.inventory[old] || 0) + 1;
  p.equipped[slot] = id;
  push(s, "kusanma", `${it.name} kuşandın.`);
  return s;
}
export function unequipItem(prev: GameState, slot: "silah" | "zirh"): GameState {
  const s = clone(prev); const p = s.player; const old = p.equipped[slot];
  if (!old) return s;
  p.inventory[old] = (p.inventory[old] || 0) + 1; p.equipped[slot] = null;
  push(s, "kusanma", `${ITEMS[old]?.name || "Teçhizat"} çıkardın.`);
  return s;
}

// Olası yaralanma havuzu (taktik savaş sonucu).
const INJURY_POOL: { label: string; stat: keyof Stats; delta: number; weeks: number; perm: number }[] = [
  { label: "Çürük kaburga",  stat: "stamina",  delta: 1, weeks: 4, perm: 0 },
  { label: "Kılıç yarası",   stat: "strength", delta: 1, weeks: 6, perm: 0.12 },
  { label: "Burkulan bilek", stat: "strength", delta: 1, weeks: 3, perm: 0 },
  { label: "Yüz yarası",     stat: "charisma", delta: 1, weeks: 8, perm: 0.2 },
];
function maybeInjure(s: GameState, heavy: boolean) {
  const p = s.player;
  if (!Math.random || Math.random() > (heavy ? 0.5 : 0.18)) return;
  const t = INJURY_POOL[Math.floor(Math.random() * INJURY_POOL.length)];
  const permanent = Math.random() < t.perm;
  p.injuries.push({ label: t.label, stat: t.stat, delta: t.delta, weeks_left: t.weeks, permanent });
  push(s, "yaralanma", `${t.label} aldın${permanent ? " — kalıcı iz bıraktı" : ""}.`);
}

// Tur-tabanlı savaşın sonucunu uygula (savas ekranı çağırır).
export function applyBattleOutcome(prev: GameState, id: string, won: boolean, finalHp: number): GameState {
  const s = clone(prev); const p = s.player; const e = ENCOUNTERS.find((x) => x.id === id);
  if (!e) return s;
  gainSkill(s, "combat", won ? 14 : 7);
  if (won) {
    let reward = e.reward;
    if (hasPerk(p, "savas_ustasi")) reward = Math.round(reward * 1.5);
    p.money += reward; p.fame = Math.min(100, p.fame + e.fame); p.honor = Math.min(100, p.honor + e.honor);
    p.fear = Math.min(100, p.fear + Math.round(e.fame / 2));
    bumpNam(p, "mert", 6);
    const floor = hasPerk(p, "yilmaz") ? 5 : 1;
    p.health = Math.max(floor, Math.round(finalHp));
    maybeInjure(s, false);
    push(s, "savaş_zafer", `${e.title}: Zafer senin! (+${reward} akçe, şöhretin arttı.)`, "kişisel", true);
  } else {
    p.health = Math.max(0, Math.round(finalHp));
    if (p.health <= 0) { die(s, `${p.name}, ${e.title.toLowerCase()} sırasında can verdi.`); return s; }
    maybeInjure(s, true);
    push(s, "savaş_yenilgi", `${e.title}: Yenildin, yaralarını sardın.`, "kişisel");
    // Yenilgi bir düşmanlık doğurabilir (nemesis)
    if (s.story && !s.story.nemesis && Math.random() < 0.4) {
      const name = `${NEMESIS_NAMES[Math.floor(Math.random() * NEMESIS_NAMES.length)]}`;
      s.story.nemesis = { name, power: e.power + 4 };
      push(s, "nemesis", `${name} seni yendiğiyle övünüyor; bir gün hesaplaşacaksınız.`, "kişisel", true);
    }
  }
  return s;
}
const NEMESIS_NAMES = ["Kara Yusuf", "Çolak Murat", "Deli Hasan", "Topal Bekir", "Azrail Şahin", "Kanlı Doğan"];
// Nemesis'le hesaplaşma çatışması (sentetik, ENCOUNTERS'ta değil).
export function nemesisEncounter(s: GameState): Encounter | null {
  const n = s.story?.nemesis; if (!n) return null;
  return { id: "nemesis", title: `Nemesis: ${n.name}`, desc: `${n.name} ile son hesaplaşma.`, power: n.power, reward: 90, fame: 16, honor: 8, danger: 30 };
}
export function applyNemesisOutcome(prev: GameState, won: boolean, finalHp: number): GameState {
  const s = clone(prev); const p = s.player; const n = s.story?.nemesis; if (!n) return s;
  gainSkill(s, "combat", won ? 16 : 8);
  if (won) {
    p.money += 90; p.fame = Math.min(100, p.fame + 16); p.honor = Math.min(100, p.honor + 8);
    bumpNam(p, "mert", 8);
    const floor = hasPerk(p, "yilmaz") ? 5 : 1; p.health = Math.max(floor, Math.round(finalHp));
    s.story.nemesis = null;
    push(s, "nemesis", `${n.name}'ı alt ettin! Hesap kapandı, adın korkusuz diye anıldı.`, "kişisel", true);
  } else {
    p.health = Math.max(0, Math.round(finalHp));
    if (p.health <= 0) { die(s, `${p.name}, ${n.name} ile hesaplaşmada can verdi.`); return s; }
    maybeInjure(s, true);
    push(s, "nemesis", `${n.name} yine üstün geldi; intikam bir başka bahara kaldı.`, "kişisel");
  }
  return s;
}

// ── Başarımlar — durumdan türetilir (kalıcı sayaç gerektirmez) ──
export interface Achievement { id: string; name: string; desc: string; icon: string; done: (s: GameState) => boolean; }
export const ACHIEVEMENTS: Achievement[] = [
  { id: "resit",    name: "Reşit Oldun",     desc: "13 yaşına ulaş ve bir meslek edin.", icon: "anvil",        done: (s) => s.player.age >= 13 && s.player.profession !== "işsiz" },
  { id: "ilkakce",  name: "İlk Kese",        desc: "100 akçe biriktir.",                icon: "coins",        done: (s) => s.player.money >= 100 },
  { id: "zengin",   name: "Diyarın Zengini", desc: "1000 akçeye ulaş.",                 icon: "gems",         done: (s) => s.player.money >= 1000 },
  { id: "mulk",     name: "Mülk Sahibi",     desc: "İlk mülkünü edin.",                 icon: "house",        done: (s) => s.player.properties.length >= 1 },
  { id: "toprak",   name: "Toprak Ağası",    desc: "5 mülkün sahibi ol.",               icon: "castle",       done: (s) => s.player.properties.length >= 5 },
  { id: "evli",     name: "Ocak Kuruldu",    desc: "Evlen.",                            icon: "ring",         done: (s) => s.player.married },
  { id: "baba",     name: "Soyun Sürüyor",   desc: "İlk evladın olsun.",                icon: "baby",         done: (s) => s.player.children.length >= 1 },
  { id: "kalabalik",name: "Kalabalık Sofra", desc: "4 evladın olsun.",                  icon: "family",       done: (s) => s.player.children.length >= 4 },
  { id: "loncali",  name: "Loncalı",         desc: "Bir loncaya katıl.",                icon: "crown",        done: (s) => !!s.player.faction },
  { id: "savasci",  name: "Savaş Görmüş",    desc: "Bir çatışmadan zaferle dön.",       icon: "trophy",       done: (s) => s.history.some((e) => e.type === "savaş_zafer") },
  { id: "sohret",   name: "Destanlaşan",     desc: "Şöhretin 80'i aşsın.",              icon: "star",         done: (s) => s.player.fame >= 80 },
  { id: "seref",    name: "Erdemin Timsali", desc: "Şerefin 80'i aşsın.",               icon: "medal",        done: (s) => s.player.honor >= 80 },
  { id: "korku",    name: "Diyarın Kâbusu",  desc: "Korku salgını 80'i aşsın.",         icon: "hood",         done: (s) => s.player.fear >= 80 },
  { id: "itibar",   name: "Diyarın İncisi",  desc: "İtibarın 80'i aşsın.",              icon: "prayer-beads", done: (s) => s.player.reputation >= 80 },
  { id: "uzunomur", name: "Uzun Ömür",       desc: "60 yaşını gör.",                    icon: "hourglass",    done: (s) => s.player.age >= 60 },
  { id: "hanedan",  name: "Hanedan Kuruldu", desc: "İkinci nesle geç.",                 icon: "banner",       done: (s) => s.player.generation >= 2 },
  { id: "kokluhan", name: "Köklü Hanedan",   desc: "Dördüncü nesle ulaş.",              icon: "scroll-open",  done: (s) => s.player.generation >= 4 },
  { id: "usta",     name: "Çok Yönlü",       desc: "Tüm özelliklerin 5+ olsun.",        icon: "shield",       done: (s) => Object.values(s.player.stats).every((v) => v >= 5) },
  // Beceri & teçhizat
  { id: "savas_sv", name: "Kılıç Ustası",    desc: "Savaş becerini 6'ya çıkar.",        icon: "crossed-swords", done: (s) => s.player.skills.combat >= 6 },
  { id: "tic_sv",   name: "Bezirgân",        desc: "Ticaret becerini 6'ya çıkar.",      icon: "scales",       done: (s) => s.player.skills.trade >= 6 },
  { id: "zan_sv",   name: "Usta Zanaatkâr",  desc: "Zanaat becerini 6'ya çıkar.",       icon: "anvil",        done: (s) => s.player.skills.crafting >= 6 },
  { id: "sos_sv",   name: "Dilbaz",          desc: "Sosyal becerini 6'ya çıkar.",       icon: "lyre",         done: (s) => s.player.skills.social >= 6 },
  { id: "hunerli",  name: "Hünerli",         desc: "En az 6 hüner edin.",               icon: "medal",        done: (s) => s.player.perks.length >= 6 },
  { id: "kusanmis", name: "Teçhizatlı",      desc: "Hem silah hem zırh kuşan.",         icon: "shield",       done: (s) => !!s.player.equipped?.silah && !!s.player.equipped?.zirh },
  { id: "celikli",  name: "Çelik Kılıç",     desc: "Çelik kılıç kuşan.",                icon: "crossed-swords", done: (s) => s.player.equipped?.silah === "celik_kilic" },
  // Kariyer & ekonomi
  { id: "kariyer",  name: "Zirvede",         desc: "Mesleğinde en üst unvana ulaş.",    icon: "crown",        done: (s) => { const pr = professionById(s.player.profession); return !!pr && careerTier(pr, s.player.career_xp) >= pr.tiers.length - 1; } },
  { id: "tüccar2",  name: "Servet Sahibi",   desc: "5000 akçeye ulaş.",                 icon: "gems",         done: (s) => s.player.money >= 5000 },
  // Hikâye & sosyal
  { id: "hikayeci", name: "Hikâye Anlatıcısı",desc: "Bir hikâye yayını tamamla.",        icon: "scroll-open",  done: (s) => s.story.completed.length >= 1 },
  { id: "destanci", name: "Kader Dokuyucusu",desc: "Üç hikâye yayını tamamla.",         icon: "book",         done: (s) => s.story.completed.length >= 3 },
  { id: "comert_a", name: "Eli Açık",        desc: "Cömert namın 60'ı aşsın.",          icon: "coins",        done: (s) => (s.player.nam?.comert || 0) >= 60 },
  { id: "zalim_a",  name: "Acımasız",        desc: "Zalim namın 60'ı aşsın.",           icon: "skull",        done: (s) => (s.player.nam?.zalim || 0) >= 60 },
  { id: "dindar_a", name: "Sofu",            desc: "Dindar namın 50'yi aşsın.",         icon: "prayer-beads", done: (s) => (s.player.nam?.dindar || 0) >= 50 },
  // Aile & gezi
  { id: "yatirim",  name: "İyi Baba/Ana",    desc: "Bir çocuğa 3 yatırım yap.",         icon: "family",       done: (s) => Object.values(s.player.child_invests || {}).some((l) => l.length >= 3) },
  { id: "gezgin",   name: "Diyar Gezgini",   desc: "Bir şehirde bulun.",                icon: "house",        done: (s) => placeKind(s.player.location_name) === "şehir" },
  { id: "lonca2",   name: "Lonca Üstadı",    desc: "Bir loncada 60 itibar topla.",      icon: "crown",        done: (s) => Object.values(s.player.faction_standing || {}).some((v) => v >= 60) },
  { id: "bilge",    name: "Yaşlı Bilge",     desc: "70 yaşını gör.",                    icon: "prayer-beads", done: (s) => s.player.age >= 70 },
  { id: "imparator",name: "Mülk İmparatoru", desc: "8 mülke sahip ol.",                 icon: "castle",       done: (s) => s.player.properties.length >= 8 },
  { id: "hunerbaz", name: "Hünerbaz",        desc: "10 hüner edin.",                    icon: "medal",        done: (s) => s.player.perks.length >= 10 },
  { id: "onder",    name: "Diyar Önderi",    desc: "İtibarın 90'ı aşsın.",              icon: "crown",        done: (s) => s.player.reputation >= 90 },
  { id: "kervanci", name: "Kervancı",        desc: "Ticaret becerini 8'e çıkar.",       icon: "scales",       done: (s) => s.player.skills.trade >= 8 },
  { id: "efsane",   name: "Yaşayan Efsane",  desc: "Şöhretin 95'i aşsın.",              icon: "trophy",       done: (s) => s.player.fame >= 95 },
];
export function achievementsOf(s: GameState): { a: Achievement; done: boolean }[] {
  return ACHIEVEMENTS.map((a) => ({ a, done: a.done(s) }));
}

// ── İkilem/olay sonucu uygula (tüm durum değişimi çekirdekte) ──
export interface Delta {
  money?: number; health?: number; hunger?: number;
  reputation?: number; honor?: number; fear?: number; fame?: number;
  stat_points?: number; addItem?: string;
  nam?: { [k in keyof Nam]?: number };
}
const clampStat = (x: number) => Math.max(0, Math.min(100, x));
export function applyDilemma(prev: GameState, delta: Delta, resultText: string): GameState {
  const s = clone(prev); const p = s.player;
  if (delta.money) p.money = Math.max(0, p.money + delta.money);
  if (delta.health) p.health = clampStat(p.health + delta.health);
  if (delta.hunger) p.hunger = clampStat(p.hunger + delta.hunger);
  if (delta.reputation) p.reputation = Math.max(-100, Math.min(100, p.reputation + delta.reputation));
  if (delta.honor) p.honor = clampStat(p.honor + delta.honor);
  if (delta.fear) p.fear = clampStat(p.fear + delta.fear);
  if (delta.fame) p.fame = clampStat(p.fame + delta.fame);
  if (delta.stat_points) p.stat_points += delta.stat_points;
  if (delta.addItem) p.inventory[delta.addItem] = (p.inventory[delta.addItem] || 0) + 1;
  if (delta.nam) for (const k of Object.keys(delta.nam) as (keyof Nam)[]) bumpNam(p, k, delta.nam[k]!);
  push(s, "olay", resultText, "kişisel");
  if (p.health <= 0) die(s, `${p.name} bu olaydan sağ çıkamadı.`);
  return s;
}

// ── Beceri Ağacı — 4 dal (savaş/ticaret/zanaat/sosyal), her dalda 3/6/9'da perk seçimi ──
export type SkillKey = keyof Skills;
export const SKILL_META: { key: SkillKey; name: string; icon: string; blurb: string }[] = [
  { key: "combat",   name: "Savaş",   icon: "crossed-swords", blurb: "Kılıç, kalkan ve cesaret." },
  { key: "trade",    name: "Ticaret", icon: "scales",         blurb: "Pazarın ve kervanın dili." },
  { key: "crafting", name: "Zanaat",  icon: "anvil",          blurb: "El emeği, göz nuru." },
  { key: "social",   name: "Sosyal",  icon: "lyre",           blurb: "Söz, saygı ve nüfuz." },
];
export interface Perk { id: string; tree: SkillKey; tier: number; name: string; desc: string; }
// Her dal için 3 kademe (3/6/9), her kademede 2 seçenek.
export const PERKS: Perk[] = [
  // SAVAŞ
  { id: "cevik",      tree: "combat", tier: 3, name: "Çevik",         desc: "Savaş gücün +3." },
  { id: "kalkanli",   tree: "combat", tier: 3, name: "Kalkanlı",      desc: "Çatışmada aldığın hasar %25 azalır." },
  { id: "nisanci",    tree: "combat", tier: 6, name: "Nişancı",       desc: "Savaş gücün +5." },
  { id: "kan_donduran",tree:"combat", tier: 6, name: "Kan Donduran",  desc: "Gözdağı her zaman tutar, korku kazancın artar." },
  { id: "savas_ustasi",tree:"combat", tier: 9, name: "Savaş Ustası",  desc: "Çatışma ödülleri %50 artar." },
  { id: "yilmaz",     tree: "combat", tier: 9, name: "Yılmaz",        desc: "Zafer kazandığında sağlığın 5'in altına düşmez." },
  // TİCARET
  { id: "pazarlikci", tree: "trade",  tier: 3, name: "Pazarlıkçı",    desc: "Alışta %10 indirim." },
  { id: "dilbaz",     tree: "trade",  tier: 3, name: "Dilbaz Tâcir",  desc: "Satışta %25 fazla akçe." },
  { id: "keskin_goz", tree: "trade",  tier: 6, name: "Keskin Göz",    desc: "Fırsat ödülleri %30 artar." },
  { id: "guvenli_kervan",tree:"trade",tier: 6, name: "Güvenli Kervan",desc: "Tüccar lonca görevleri %50 fazla kazandırır." },
  { id: "tuccar_prensi",tree:"trade", tier: 9, name: "Tüccar Prensi", desc: "Mülk gelirin %30 artar." },
  { id: "tefeci",     tree: "trade",  tier: 9, name: "Tefeci",        desc: "Çalışma kazancın %20 artar." },
  // ZANAAT
  { id: "becerikli",  tree: "crafting",tier:3, name: "Becerikli",     desc: "Çalışma kazancın %15 artar." },
  { id: "tutumlu",    tree: "crafting",tier:3, name: "Tutumlu",       desc: "Yemek 10 fazla tokluk verir." },
  { id: "usta_eli",   tree: "crafting",tier:6, name: "Usta Eli",      desc: "Çalışma kazancın ek %20 artar." },
  { id: "tamirci",    tree: "crafting",tier:6, name: "Tamirci",       desc: "Mülk gelirin %15 artar." },
  { id: "basyapit",   tree: "crafting",tier:9, name: "Başyapıt",      desc: "Çalışma kazancın ek %25 artar." },
  { id: "mucit",      tree: "crafting",tier:9, name: "Mucit",         desc: "Mektepte her çalışma puan kazandırır." },
  // SOSYAL
  { id: "dil_dokme",  tree: "social", tier: 3, name: "Dil Dökme",     desc: "Sohbette ilişki kazancın %50 artar." },
  { id: "hosgoru",    tree: "social", tier: 3, name: "Hoşgörü",       desc: "Sadaka şeref kazancını artırır." },
  { id: "karizmatik", tree: "social", tier: 6, name: "Karizmatik",    desc: "Evlilik teklifin ve loncaya katılımın kolaylaşır." },
  { id: "sohret_avcisi",tree:"social",tier: 6, name: "Şöhret Avcısı", desc: "Ziyafet şöhret kazancını artırır." },
  { id: "diplomat",   tree: "social", tier: 9, name: "Diplomat",      desc: "Tüm itibar eylemleri %50 daha etkili." },
  { id: "lider",      tree: "social", tier: 9, name: "Lider",         desc: "Lonca görev itibarın %50 artar." },
];
export function perkById(id: string): Perk | undefined { return PERKS.find((p) => p.id === id); }
export function hasPerk(p: Player, id: string): boolean { return p.perks.includes(id); }

// Beceri seviyesi: her 100 xp = 1 seviye (maks 10).
export function skillLevel(xp: number): number { return Math.max(0, Math.min(10, Math.floor(xp / 100))); }
const SKILL_TIERS = [3, 6, 9];
// Bir dalda hak edilmiş ama henüz seçilmemiş perk kademesi var mı?
export function pendingPerkTier(p: Player, tree: SkillKey): number | null {
  const lvl = p.skills[tree];
  for (const t of SKILL_TIERS) {
    if (lvl >= t) {
      const chosen = p.perks.some((id) => { const pk = perkById(id); return pk && pk.tree === tree && pk.tier === t; });
      if (!chosen) return t;
    }
  }
  return null;
}
export function pendingPerkCount(p: Player): number {
  return SKILL_META.reduce((n, m) => n + (pendingPerkTier(p, m.key) !== null ? 1 : 0), 0);
}
// XP ekle; seviye atlarsa günlüğe işle (saf — clone edilmiş state üstünde çağrılır).
function gainSkill(s: GameState, key: SkillKey, xp: number) {
  const p = s.player;
  const before = p.skills[key];
  p.skill_xp[key] += xp;
  const after = skillLevel(p.skill_xp[key]);
  if (after > before) {
    p.skills[key] = after;
    const m = SKILL_META.find((x) => x.key === key)!;
    const perk = SKILL_TIERS.includes(after);
    push(s, "beceri", `${m.name} becerin ${after}. seviyeye yükseldi.${perk ? " Yeni bir hüner seçebilirsin!" : ""}`, "kişisel", false, { k: `ev.su.${key}${perk ? ".perk" : ""}`, p: [after] });
  } else {
    p.skills[key] = after;
  }
}
// Bir perk seç (kademe hak edilmişse).
export function choosePerk(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const pk = perkById(id);
  if (!pk || hasPerk(p, id)) return s;
  if (p.skills[pk.tree] < pk.tier) return s;
  if (pendingPerkTier(p, pk.tree) !== pk.tier) return s; // bu kademe zaten doldurulmuş
  p.perks.push(id);
  push(s, "hüner", `Yeni hüner: ${pk.name} — ${pk.desc}`, "kişisel", true);
  return s;
}

// ── Hikâye yayları ──
export function beginArc(prev: GameState, id: string): GameState {
  const s = clone(prev); const a = arcById(id);
  if (!a || s.player.dead) return s;
  if (s.story.active || s.story.completed.includes(id)) return s;
  s.story.active = { id, stage: a.start };
  push(s, "hikaye_basladi", `Yeni bir hikâye başladı: ${a.title}.`, "kişisel", true);
  return s;
}
// Aktif yayda bir seçim yap: etkiyi uygula, sahneyi ilerlet ya da bitir.
export function advanceArc(prev: GameState, choiceIdx: number, loc?: { result?: string; endLabel?: string }): GameState {
  const s = clone(prev);
  if (!s.story.active) return s;
  const a = arcById(s.story.active.id); if (!a) { s.story.active = null; return s; }
  const stage = a.stages[s.story.active.stage]; if (!stage) { s.story.active = null; return s; }
  const c: ArcChoice | undefined = stage.choices[choiceIdx]; if (!c) return s;
  if (c.delta) {
    const p = s.player; const d = c.delta;
    if (d.money) p.money = Math.max(0, p.money + d.money);
    if (d.health) p.health = Math.max(0, Math.min(100, p.health + d.health));
    if (d.hunger) p.hunger = Math.max(0, Math.min(100, p.hunger + d.hunger));
    if (d.reputation) p.reputation = Math.max(-100, Math.min(100, p.reputation + d.reputation));
    if (d.honor) p.honor = Math.max(0, Math.min(100, p.honor + d.honor));
    if (d.fear) p.fear = Math.max(0, Math.min(100, p.fear + d.fear));
    if (d.fame) p.fame = Math.max(0, Math.min(100, p.fame + d.fame));
    if (d.stat_points) p.stat_points += d.stat_points;
    if (d.addItem) p.inventory[d.addItem] = (p.inventory[d.addItem] || 0) + 1;
    if (d.nam) for (const k of Object.keys(d.nam) as (keyof Nam)[]) bumpNam(p, k, d.nam[k]!);
  }
  push(s, "hikaye", loc?.result || c.result, "kişisel");
  if (c.next === "end") {
    push(s, "hikaye_bitti", loc?.endLabel || `"${a.title}" sona erdi.`, "kişisel", true);
    s.story.completed.push(a.id);
    s.story.active = null;
    s.story.tension = Math.max(0, s.story.tension - 2);
  } else {
    s.story.active = { id: a.id, stage: c.next };
  }
  if (s.player.health <= 0) die(s, `${s.player.name} hikâyesinin ortasında can verdi.`);
  return s;
}

// ── Rakip hanedanlar: oyuncunun gücü ve hanedanlara tavrı ──
export function playerHousePower(p: Player): number {
  return Math.round(p.fame + p.generation * 10 + p.properties.length * 6 + p.reputation / 2 + p.skills.combat);
}
// Bir hanedanın oyuncuya tavrı (-100..100): nam/itibar artırır, gurur+korku düşürür.
export function houseAttitude(p: Player, house: { pride: number; trait: string }): number {
  let a = (p.reputation + p.honor / 2) - house.pride / 2 - p.fear / 3;
  if (house.trait === "kindar") a -= p.fear / 4;
  if (house.trait === "cömert") a += (p.nam?.comert || 0) / 4;
  if (house.trait === "sadık") a += p.honor / 4;
  if (house.trait === "ihtiraslı") a -= p.fame / 6;
  // Mertlik her hanede saygı görür; zalimlik her yerde iter; çapkın namı köklü/sadık haneleri ürkütür.
  a += (p.nam?.mert || 0) / 6;
  a -= (p.nam?.zalim || 0) / 6;
  if (house.trait === "sadık") a -= (p.nam?.capkin || 0) / 5;
  return Math.max(-100, Math.min(100, Math.round(a)));
}
export function attitudeLabel(a: number): string {
  if (a >= 40) return "Dost"; if (a >= 10) return "Dostane"; if (a > -10) return "Tarafsız"; if (a > -40) return "Soğuk"; return "Hasım";
}

// ── İtibar & Tanınma: gerçekçi sosyal mantık ──
// fame (şöhret) = adının ne kadar/ne uzağa ulaştığı. şeref/korku/nam = nasıl tanındığın.
// Temel ilke: bir yabancı, karakterine ancak adını DUYDUĞU ölçüde tepki verir.
export function atHome(p: Player): boolean { return !!p.home_name && p.location_name === p.home_name; }

// 0..1 — bulunduğun yerde sıradan birinin seni tanıma / adına göre davranma derecesi.
// Memleketinde herkes seni biraz tanır (yerel taban); uzakta yalnızca şöhretin taşır.
export function recognition(s: GameState): number {
  const p = s.player;
  const reach = Math.max(0, Math.min(100, p.fame)) / 100;
  const localFloor = atHome(p) ? 0.45 : 0;
  return Math.max(0, Math.min(1, reach + localFloor));
}

// İmzalı "ne kadar olumlu tanınıyorsun" — tanınma ile kapılı.
export function esteem(s: GameState): number {
  const p = s.player; const n = p.nam || ({} as Nam);
  const ch = p.reputation + p.honor * 0.8 + (n.comert || 0) * 0.5 + (n.mert || 0) * 0.5 + (n.dindar || 0) * 0.3 - (n.zalim || 0) * 0.7 - p.fear * 0.4;
  return Math.round(ch * recognition(s));
}
// "Ne kadar korkulan/çekinilen" (0..+) — tanınma ile kapılı; cömertlik/mertlik korkuyu yumuşatır.
export function dread(s: GameState): number {
  const p = s.player; const n = p.nam || ({} as Nam);
  const menace = p.fear + (n.zalim || 0) * 0.6 - (n.comert || 0) * 0.3 - (n.mert || 0) * 0.2;
  return Math.max(0, Math.round(menace * recognition(s)));
}

// Pazarlık şansına ek: tanınan (sevilen ya da korkulan) kişinin sözü geçer; meçhul birinin pazarlık gücü zayıftır.
export function bargainBonus(s: GameState): number {
  const e = esteem(s) / 100, d = dread(s) / 100;
  return Math.max(-0.12, Math.min(0.18, e * 0.12 + d * 0.12 - (1 - recognition(s)) * 0.04));
}
// Suç başarısına ek: korku/zalim (tanınmışsa) kurbanı dondurur (+); mertlik/şeref sinsiliği zorlaştırır (−).
export function crimeSuccessMod(s: GameState): number {
  const p = s.player; const n = p.nam || ({} as Nam);
  return dread(s) / 100 * 0.18 - ((n.mert || 0) + p.honor * 0.5) / 100 * 0.10;
}
// Yakalanınca EK itibar cezası: tanınan, şerefli ya da dindar birinin kaybedecek adı çoktur.
export function crimeCaughtPenalty(s: GameState): number {
  const p = s.player; const n = p.nam || ({} as Nam);
  return Math.round(((p.honor + (n.mert || 0) + (n.dindar || 0)) / 100) * 8 * recognition(s));
}
// Sohbette olumlu ilişki kazancı çarpanı (~0.7..1.3): sıcak tanınana herkes açılır; korkulan/zalimden çekinilir.
export function talkWarmthMod(s: GameState): number {
  const e = esteem(s) / 100, d = dread(s) / 100;
  return Math.max(0.7, Math.min(1.3, 1 + e * 0.3 - d * 0.3));
}
// Çapkınlık: flört/iltifatla ilişki kurmada çekicilik (0..+). Kişisel olduğu için tanınmaya az bağlı.
export function allureBonus(s: GameState): number {
  return Math.min(0.2, (s.player.nam?.capkin || 0) / 100 * 0.2);
}
// Evlilik teklifi şansına ek: mert/şeref/dindar (tanınmışsa) güven verir; çapkın namı saygın aileyi ürkütür; korku düşürür.
export function courtBonus(s: GameState): number {
  const p = s.player; const n = p.nam || ({} as Nam);
  const trust = ((n.mert || 0) + p.honor * 0.6 + (n.dindar || 0) * 0.4) / 100;
  const scandal = (n.capkin || 0) / 100, menace = dread(s) / 100;
  return Math.max(-0.25, Math.min(0.25, recognition(s) * trust * 0.2 - scandal * 0.12 - menace * 0.15));
}
// Lonca itibar kazancı çarpanı: onurlu loncalar mert/şerefe değer verir; Gölge Kardeşliği zalim/korkuya.
export function factionStandingMod(s: GameState, faction: string): number {
  const p = s.player; const n = p.nam || ({} as Nam);
  const honorable = (p.honor + (n.mert || 0)) / 100, shadow = (p.fear + (n.zalim || 0)) / 100;
  if (faction === "golge") return Math.max(0.7, Math.min(1.4, 1 + shadow * 0.4 - honorable * 0.2));
  return Math.max(0.7, Math.min(1.4, 1 + honorable * 0.3 - shadow * 0.2));
}
// Karakter ekranı için: bulunduğun yerde halkın algısı.
export function publicPerception(s: GameState): { recog: number; key: string } {
  const recog = recognition(s);
  if (recog < 0.12) return { recog, key: "unknown" };
  const e = esteem(s), d = dread(s);
  if (d > 25 && d >= e) return { recog, key: d > 55 ? "feared" : "wary" };
  if (e > 25) return { recog, key: e > 55 ? "beloved" : "esteemed" };
  if (e < -15) return { recog, key: "disliked" };
  return { recog, key: "neutral" };
}

// ── Hanedan: mühür kademesi, hanedan gücü, taht ve yerleşim ──
// Hanedanın toplam gücü (kişisel güç + irsî birikim + tahta + yerleşimler).
export function dynastyPower(s: GameState): number {
  const p = s.player;
  return playerHousePower(p) + (s.settlements?.length || 0) * 8 + (p.crowned ? 40 : 0);
}
// Mühür kademesi (0..4) — gerçekçi: köklü bir hane nesillerce inşa edilir.
export function houseSeal(power: number): { tier: number; key: string } {
  if (power >= 200) return { tier: 4, key: "pillar" };
  if (power >= 140) return { tier: 3, key: "great" };
  if (power >= 90) return { tier: 2, key: "respected" };
  if (power >= 50) return { tier: 1, key: "known" };
  return { tier: 0, key: "ordinary" };
}

// ── TAHT YOLU (gerçekçi, çekişmeli) ──
export interface ThroneReq { key: string; cur: number; need: number; ok: boolean; }
export const THRONE_COST = 5000;
// Meşruiyet + güç tabanı şartları. Bir teşkilat desteği de gerekir (ayrı kontrol edilir).
export function throneRequirements(s: GameState): ThroneReq[] {
  const p = s.player;
  return [
    { key: "age",   cur: p.age,                   need: 35 },
    { key: "power", cur: dynastyPower(s),          need: 140 },
    { key: "rep",   cur: Math.round(p.reputation), need: 70 },
    { key: "fame",  cur: Math.round(p.fame),       need: 60 },
    { key: "gold",  cur: p.money,                  need: THRONE_COST },
  ].map((r) => ({ ...r, ok: r.cur >= r.need }));
}
export function throneBacking(p: Player): boolean { return !!p.faction; }
export function canClaimThrone(s: GameState): boolean {
  return !s.player.crowned && !s.player.dead && throneBacking(s.player) && throneRequirements(s).every((r) => r.ok);
}
// İddianın başarı şansı: hane gücü en güçlü rakibe karşı, şöhret, savaş ve lonca desteğiyle ölçülür.
export function throneOdds(s: GameState): number {
  const p = s.player;
  const rivals = generateDynasties(s.seed);
  const topRival = Math.max(100, ...rivals.map((h) => h.power));
  const odds = 0.45 + (dynastyPower(s) - topRival) / 220 + p.fame / 400 + p.skills.combat / 40 + (esteem(s) / 400);
  return Math.max(0.12, Math.min(0.9, odds));
}
// Tahta iddia — sefer parası her hâlükârda harcanır; başarısızlık ağır bedel.
export function claimThrone(prev: GameState): { state: GameState; success: boolean } {
  const s = clone(prev); const p = s.player;
  if (!canClaimThrone(s)) return { state: s, success: false };
  const odds = throneOdds(s);
  p.money -= THRONE_COST;
  const success = Math.random() < odds;
  if (success) {
    p.crowned = true;
    p.fame = Math.min(100, p.fame + 25); p.reputation = Math.min(100, p.reputation + 15);
    bumpNam(p, "mert", 6);
    push(s, "taht", `Tahta çıktın! Bundan böyle ${p.surname || p.name} Hanedanı diyara hükmediyor.`, "kişisel", true, { k: "ev.throne.win" });
  } else {
    p.reputation = Math.max(-100, p.reputation - 30); p.fame = Math.max(0, p.fame - 15);
    p.fear = Math.min(100, p.fear + 10); p.health = Math.max(1, p.health - 25);
    push(s, "taht_basarisiz", "Taht iddian bastırıldı — hain ilan edildin, itibarın yerle bir oldu.", "kişisel", true, { k: "ev.throne.lose" });
  }
  return { state: s, success };
}

// ── YERLEŞİM KUR (gerçekçi: mevki + sermaye; mezradan gelişir) ──
export const SETTLE_COST = 1500;
export const SETTLE_MAX = 3;
export function canFoundSettlement(s: GameState): { ok: boolean; reason: string } {
  const p = s.player;
  if (p.dead) return { ok: false, reason: "dead" };
  if ((s.settlements?.length || 0) >= SETTLE_MAX) return { ok: false, reason: "max" };
  if (dynastyPower(s) < 80) return { ok: false, reason: "power" };
  if (p.properties.length < 1) return { ok: false, reason: "prop" };
  if (p.money < SETTLE_COST) return { ok: false, reason: "gold" };
  return { ok: true, reason: "" };
}
export function foundSettlement(prev: GameState, name: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!canFoundSettlement(s).ok || !name.trim()) return s;
  p.money -= SETTLE_COST;
  if (!s.settlements) s.settlements = [];
  s.settlements.push({ name: name.trim().slice(0, 24), founded: s.turn, dev: 8 });
  p.fame = Math.min(100, p.fame + 5); p.reputation = Math.min(100, p.reputation + 4);
  push(s, "yerlesim", `${name.trim()} adıyla yeni bir mezra kurdun — zamanla gelişip vergi getirecek.`, "kişisel", true, { k: "ev.settle.found", p: [name.trim()] });
  return s;
}
// Bir yerleşimin yıllık vergi geliri (gelişmişliğe + halk desteğine göre).
export function settlementIncome(s: GameState): number {
  if (!s.settlements?.length) return 0;
  const repMult = 1 + Math.max(0, s.player.reputation) / 300;
  return Math.round(s.settlements.reduce((a, st) => a + st.dev * 0.25, 0) * repMult);
}

// ── Şehir Yönetimi (Vercel city_governance.py portu) ──
export const GOV_TITLE: Record<string, string> = { "köy": "Muhtar", "kale": "Kale Beyi", "şehir": "Büyük Lord" };
export function govReqRep(kind: string): number { return kind === "şehir" ? 50 : kind === "kale" ? 40 : 20; }
export function isGovernor(p: Player, name: string): boolean { return (p.governorships || []).includes(name); }
export function canRunForGovernor(s: GameState, name: string): boolean {
  const p = s.player;
  return !p.dead && p.age >= 18 && !isGovernor(p, name) && p.reputation >= govReqRep(placeKind(name));
}
export function runForGovernor(prev: GameState, name: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!canRunForGovernor(s, name)) return s;
  if (!p.governorships) p.governorships = [];
  p.governorships.push(name);
  p.reputation = Math.min(100, p.reputation + 5); p.fame = Math.min(100, p.fame + 6);
  push(s, "yonetim", `${name} valiliğine getirildin — artık ${GOV_TITLE[placeKind(name)] || "Vali"}sin.`, "kişisel", true);
  return s;
}
// Valilik vergi payı (her tur): şehrin refahına göre.
export function governorIncome(s: GameState): number {
  const list = s.player.governorships; if (!list?.length) return 0;
  return list.reduce((a, loc) => a + Math.max(1, Math.round(cityInfo(loc, placeKind(loc)).prosperity / 4)), 0);
}

// ── Zanaat / üretim zincirleri — hammaddeyi mamule çevir ──
export interface Recipe { id: string; out: string; outQty: number; inputs: Record<string, number>; minSkill: number; }
export const RECIPES: Recipe[] = [
  { id: "un",        out: "un",        outQty: 1, inputs: { bugday: 2 },  minSkill: 0 },
  { id: "ekmek",     out: "ekmek",     outQty: 2, inputs: { un: 1 },      minSkill: 0 },
  { id: "corba",     out: "corba",     outQty: 1, inputs: { balik: 1 },   minSkill: 0 },
  { id: "iksir",     out: "iksir",     outQty: 1, inputs: { sifa: 2 },    minSkill: 2 },
  { id: "bicak",     out: "bicak",     outQty: 1, inputs: { demir: 2 },   minSkill: 1 },
  { id: "kilic",     out: "kilic",     outQty: 1, inputs: { demir: 3 },   minSkill: 3 },
  { id: "celik_kilic",out:"celik_kilic",outQty: 1, inputs: { demir: 5, kereste: 1 }, minSkill: 6 },
  { id: "deri_zirh", out: "deri_zirh", outQty: 1, inputs: { deri: 2 },    minSkill: 2 },
  { id: "kalkan",    out: "kalkan",    outQty: 1, inputs: { kereste: 2, demir: 1 }, minSkill: 3 },
  // ── Vercel production_chains.py'den ek tarifler (mevcut mallarla) ──
  { id: "yay",         out: "yay",         outQty: 1, inputs: { kereste: 1, deri: 1 }, minSkill: 2 },
  { id: "savas_balta", out: "savas_balta", outQty: 1, inputs: { demir: 4, kereste: 1 }, minSkill: 5 },
  { id: "zincir_zirh", out: "zincir_zirh", outQty: 1, inputs: { demir: 4 }, minSkill: 5 },
];
export function canCraft(p: Player, r: Recipe): boolean {
  if (p.skills.crafting < r.minSkill) return false;
  return Object.entries(r.inputs).every(([id, q]) => (p.inventory[id] || 0) >= q);
}
export function craft(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const r = RECIPES.find((x) => x.id === id);
  if (!r || p.dead || !canCraft(p, r)) return s;
  for (const [iid, q] of Object.entries(r.inputs)) { p.inventory[iid] -= q; if (p.inventory[iid] <= 0) delete p.inventory[iid]; }
  p.inventory[r.out] = (p.inventory[r.out] || 0) + r.outQty;
  gainSkill(s, "crafting", 6);
  push(s, "zanaat", `${ITEMS[r.out]?.name || r.out} ürettin${r.outQty > 1 ? ` (×${r.outQty})` : ""}.`);
  return s;
}
