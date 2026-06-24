// Offline oyun çekirdeği (sürüm 3) — hayat döngüsü + NPC/ilişki/envanter/pazar.
import type { EvtParam } from "./i18n";
import { currentCalendar, playerAge, CalendarInfo } from "./calendar";
import { ITEMS, marketGoods, locSeed, generateNPCs, NPC, generateDynasties, cityInfo, RivalHouse, houseNameIdx, localFirstName, localSurname, SPECIALTIES, Item, WClass } from "./world";
import { Lang } from "./locale-data";
import { converse, ConvResult, spontaneousLine, callbackLine } from "./dialogue";
import { Memory, addMemory, decayMemories, effectiveRel, behaviorTier, MEMORY_TYPES, RUMOR_VARIANTS } from "./npc-mind";
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
  mother_seed?: number; father_seed?: number; spouse_seed?: number; // kültürel isim için tohum (dile göre çözülür)
  inventory: Record<string, number>; properties: Property[]; generation: number;
  faction: string | null; faction_standing: Record<string, number>;
  skills: Skills; skill_xp: Skills; perks: string[];
  stat_xp?: Stats; // özellik tecrübesi (kullanımla birikir; stat_points'e EK — Vercel add_stat_xp)
  injuries: Injury[]; career_xp: number;
  nam: Nam; child_invests: Record<string, string[]>;
  child_edu?: Record<string, { track: string; weeks: number }>; // süregelen evlat eğitimi (haftalık biriken)
  equipped: { silah: string | null; zirh: string | null } & Partial<Record<EquipSlot, string | null>>;
  equipped_q?: Partial<Record<EquipSlot, QualityTier>>; // kuşanılı teçhizatın kalite kademesi
  crowned?: boolean; will_pref?: string;
  fates?: string[]; // tetiklenen kader anları (yaş dönümleri)
  claimed?: string[]; // ödülü alınan başarımlar
  fq_claimed?: string[]; // tamamlanan aile/yaşam görevleri (family_quests portu)
  inv_q?: Record<string, Partial<Record<QualityTier, number>>>; // eşya kalite kırılımı (quality.py portu; sıradan izlenmez)
  last_study_turn?: number; lesson_count?: number; // mektep: sınav sayacı (eski gate; enerji sistemine taşındı)
  study_energy?: number; // aylık çalışma gücü — ders + kulüp meşki bundan harcanır
  club?: string; teacherBond?: number; // mektep kulübü (haftalık pasif XP) + hoca bağı
  club_standing?: number; last_club_turn?: number; club_grad?: string; // kulüp itibarı + aylık meşk kapısı + mezun olunan kulüp
  horse?: boolean; // bir atın var mı (hızlı/güvenli "at ile" yolculuğu açar)
  child_acts?: Partial<Record<"oyun" | "yardim" | "yaramazlik" | "kesif", number>>; childhood?: string; // çocukluk eğilim sayacı + reşitlikte belirlenen çocukluk karakteri
  child_friend?: { id: string; seed: number; gender: "erkek" | "kadın"; bond: number }; // oyun yoldaşı: oyunla büyüyen bağ; bağ güçlüyse reşitlikte ömürlük dosta dönüşür
  hotGoods?: number; // satılmamış sıcak mal değeri (büyük soygunlardan; eritilmesi riskli)
  governorships?: string[]; // valisi olunan şehirler
  legacy?: Record<string, boolean>; // kalıcı görkem eserleri (vakıf/anıt/imaret) — bir kez kurulur
  govLeg?: Record<string, number>; // valilik meşruiyeti (şehir → 0-100); düşerse isyan/azil
  govTax?: Record<string, number>; // valilikte vergi oranı (şehir → %; default 15)
  govHappy?: Record<string, number>; // valilikte halk memnuniyeti (0-100)
  govTreasury?: Record<string, number>; // şehir hazinesi (vergiyle dolar, projeye harcanır)
  factionBans?: Record<string, number>; // fraksiyon id → geri dönüş yasağının bittiği tur (FACTION_MEMBERSHIP)
  factionLeaves?: Record<string, number>; // fraksiyondan kaç kez ayrıldın (yasak süresi tırmanır)
  priceMem?: Record<string, number>; // fiyat hafızası: "loc|good" → geçen ay kaydedilen alış fiyatı (pazar 'geçen fiyat' göstergesi)
  debt?: number; loan_turn?: number; // tefeci borcu (aylık faiz işler) + ilk ödünç alınan tur
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
// Süregelen eğitim yolu — tek-seferlik yatırımdan farklı olarak HER AY emek+akçe ister ve birikir;
// vâris olunca biriken aylara göre ölçekli bonus verir (Vercel legacy_system EDUCATION_TRACKS portu).
export interface EduTrack { id: string; label: string; icon: string; weekly: number; stat?: keyof Stats; skill?: keyof Skills; }
export const EDU_TRACKS: EduTrack[] = [
  { id: "ilim",    label: "İlim Yolu",    icon: "graduate-cap",   weekly: 3, stat: "intelligence" },
  { id: "savas",   label: "Savaş Yolu",   icon: "crossed-swords", weekly: 3, stat: "strength", skill: "combat" },
  { id: "zanaat",  label: "Zanaat Yolu",  icon: "anvil",          weekly: 2, skill: "crafting" },
  { id: "ticaret", label: "Ticaret Yolu", icon: "coins",          weekly: 2, stat: "charisma", skill: "trade" },
];
// Biriken ay sayısı → bonus kademesi: <10 ay etkisiz, ~6 ayda +1 (max +3). Vercel apply_child_bonus hizası.
export function eduLevel(weeks: number): number { return weeks < 10 ? 0 : Math.max(1, Math.min(3, Math.floor(weeks / 26))); }
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
  let base = p.stats[key];
  if (key === "charisma" && p.equipped?.kiyafet) base += attireScore(p).charisma; // kıyafet karizmaya katkı
  return Math.max(0, base - pen);
}
// Mülk: konuma bağlı (loc) + kondisyon (cond 0..100) + kademe (level 1..3). Gelir refah×kondisyon×kademe.
export interface Property { type: string; loc: string; cond: number; level?: number; workers?: string[]; ledger?: { y: number; net: number }[]; }
export const PROP_MAX_LEVEL = 3;
export function propUpgradeCost(pr: Property): number { return Math.round((PROPERTY_TYPES[pr.type]?.cost || 100) * (pr.level || 1) * 0.8); }
export function upgradeProperty(prev: GameState, index: number): GameState {
  const s = clone(prev); const p = s.player; const pr = p.properties[index];
  if (!pr || (pr.level || 1) >= PROP_MAX_LEVEL) return s;
  const cost = propUpgradeCost(pr); if (p.money < cost) return s;
  p.money -= cost; pr.level = (pr.level || 1) + 1;
  push(s, "mülk", `${PROPERTY_TYPES[pr.type]?.name || "Mülk"} (${pr.loc}) büyütüldü — kademe ${pr.level} (−${cost} akçe).`, "kişisel", true, { k: "evj.propUp", p: [{ pt2: pr.type }, { pl: pr.loc }, pr.level || 1, cost] });
  return s;
}
// Gerçekçi fiyatlar: bir mülk yıllarca geri ödenen ciddi bir yatırımdır (en ucuzu ~2.000 akçe).
// Nominal "cost" enflasyonla çarpılarak güncel alış bedeli bulunur (propBuyCost).
export const PROPERTY_TYPES: Record<string, { name: string; icon: string; cost: number; income: number; slots: number }> = {
  tarla:    { name: "Tarla",    icon: "wheat", cost: 2000,  income: 30,  slots: 3 },
  ev:       { name: "Ev",       icon: "house", cost: 2500,  income: 36,  slots: 1 },
  dukkan:   { name: "Dükkân",   icon: "coins", cost: 6500,  income: 90,  slots: 2 },
  han:      { name: "Han",      icon: "castle", cost: 11000, income: 150, slots: 3 },
  degirmen: { name: "Değirmen", icon: "anvil", cost: 18000, income: 210, slots: 4 },
};
// Güncel alış bedeli = nominal × enflasyon (geç-oyunda mülk pahalanır → nakit erir, değer korunur).
export function propBuyCost(s: GameState, type: string): number { return Math.round((PROPERTY_TYPES[type]?.cost || 0) * inflationFactor(s)); }
// Bir konumdaki (bölge) sahip olunan mülk sayısı — kademeli yerleşim kurma şartı.
export function propsInLoc(s: GameState, loc: string): number { return s.player.properties.filter((pr) => pr.loc === loc).length; }
// Aylık yaşam gideri (gerçek hayat filtresi): hane masrafı + mülk/yerleşim bakımı + servete göre
// artan maiyet/ziyafet/sadaka/vergi yükü. Zengin oldukça gider de büyür → para hep önemli kalır.
// Bu enflasyon DEĞİL; soylunun kendi yaşam masrafıdır (oyuncu-bazlı, dünya enflasyonundan ayrı).
export function lifestyleUpkeep(s: GameState): number {
  const p = s.player; const inf = inflationFactor(s);
  let u = (4 + Math.floor(p.age / 10)) * inf;                    // hane geçim gideri (yaş + enflasyonla artar)
  u += p.properties.length * 3 * inf;                            // mülk bakımı & tapu vergisi
  u += (s.settlements?.length || 0) * 8 * inf;                   // yerleşim idare gideri
  // Servete göre kademeli yaşam yükü (maiyet, ziyafet, sadaka beklentisi, divan vergisi) — zengini ısırır.
  const w = p.money; const b1 = 5000 * inf, b2 = 20000 * inf, b3 = 100000 * inf;
  let annual = 0;
  if (w > b1) annual += (Math.min(w, b2) - b1) * 0.03;
  if (w > b2) annual += (Math.min(w, b3) - b2) * 0.06;
  if (w > b3) annual += (w - b3) * 0.10;
  u += annual / 12;
  return Math.max(0, Math.round(u));
}
// ── Tefeci (sarraf) borç sistemi — gerçek ekonomi: nakit sıkışınca ödünç al, ama faiz acımasız işler ──
// Aylık ~%2.5 (yıllık ~%34, dönem-gerçekçi tefecilik). Tüccar loncası/Tefeci pâyesi şartları yumuşatır.
export const LOAN_MONTHLY_RATE = 0.025;
export function loanRate(s: GameState): number {
  let r = LOAN_MONTHLY_RATE;
  if (s.player.faction === "tuccar") r -= 0.006;       // tüccar loncası → tefeciyle araları iyi
  if (hasPerk(s.player, "tefeci")) r -= 0.005;          // tefecilik ağını bilirsin
  return Math.max(0.012, Math.round(r * 1000) / 1000);
}
// Kredi tavanı: itibar + mülk teminatı (enflasyonla ölçekli). İtibarın dipteyse tefeci güvenmez, az verir.
export function creditLimit(s: GameState): number {
  const p = s.player;
  const propVal = p.properties.reduce((a, pr) => a + (PROPERTY_TYPES[pr.type]?.cost || 0), 0);
  const repFactor = Math.max(0.05, (p.reputation + 100) / 200); // -100..100 → 0.05..1
  const base = (1000 + propVal * 0.4) * repFactor;
  return Math.round(base * inflationFactor(s));
}
// O an alınabilecek azami ödünç (tavan − mevcut borç).
export function loanCapacity(s: GameState): number { return Math.max(0, creditLimit(s) - Math.round(s.player.debt || 0)); }
export function borrow(prev: GameState, amount: number): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 16) return s;                   // borç ehliyeti reşit yaşta
  const amt = Math.min(Math.max(0, Math.round(amount)), loanCapacity(s));
  if (amt <= 0) return s;
  p.money += amt; p.debt = Math.round((p.debt || 0) + amt);
  if (!p.loan_turn) p.loan_turn = s.turn;
  push(s, "ticaret", `Sarraftan ${amt} akçe ödünç aldın; borcun ${p.debt} akçe oldu (aylık faiz işler).`, "kişisel", false, { k: "evj.borrow", p: [amt, p.debt] });
  return s;
}
export function repay(prev: GameState, amount: number): GameState {
  const s = clone(prev); const p = s.player;
  const amt = Math.min(Math.max(0, Math.round(amount)), Math.min(p.money, p.debt || 0));
  if (amt <= 0) return s;
  p.money -= amt; p.debt = Math.round((p.debt || 0) - amt);
  if (p.debt <= 0) {
    p.debt = 0; p.loan_turn = undefined; p.reputation = Math.min(100, p.reputation + 2);
    push(s, "ticaret", `Borcunu tümüyle kapattın; sarraf defterini sildi, sözün yeniden geçer oldu (+itibar).`, "kişisel", true, { k: "evj.repayFull" });
  } else {
    push(s, "ticaret", `Borcuna ${amt} akçe ödedin; kalan borç ${p.debt} akçe.`, "kişisel", false, { k: "evj.repay", p: [amt, p.debt] });
  }
  return s;
}
// ── Mülk-işçi (NPC istihdamı) ekonomisi — Vercel property_system.py portu ──
// Bir mülkün işçi alabileceği yer sayısı: tip slotu + her kademe için +1.
export function propWorkerSlots(pr: Property): number { return (PROPERTY_TYPES[pr.type]?.slots || 0) + ((pr.level || 1) - 1); }
// Yaşayan dünya kadrosu: deterministik temel (isim dile göre çözülür) + kalıcı evrim katmanı (ölüm/yaş/doğum).
// Kadro büyüklüğü yerleşim tipine göre: şehir kalabalık, köy tenha (canlı dünya hissi).
export function rosterSize(loc: string): number { const k = placeKind(loc); return k === "şehir" ? 18 : k === "kale" ? 12 : 8; }
// Dünya saati: nesiller boyu biriken yıl (NPC'ler bununla yaşlanır).
export function worldYears(s: GameState): number { return (s.world?.npcYears || 0) + Math.floor(s.turn / 12); }
// Deterministik temel kadro önbelleği: generateNPCs(loc,lang) saf ve değişmez → sonsuza dek memo'lanır.
// (42 yerleşimli dünyada yaşayan-dünya tikinin her yıl tüm lokasyonları taramasını ucuzlatır.)
const _rosterBaseCache: Record<string, NPC[]> = {};
function rosterBase(loc: string, lang: Lang): NPC[] {
  const key = loc + "|" + lang;
  let b = _rosterBaseCache[key];
  if (!b) { b = generateNPCs(locSeed(loc), rosterSize(loc), lang, loc); _rosterBaseCache[key] = b; }
  return b;
}
export function rosterAt(s: GameState, loc: string, lang: Lang = "tr"): NPC[] {
  const wy = worldYears(s); const evo = s.world?.npcEvo;
  const base = rosterBase(loc, lang)
    .map((n) => ({ ...n, age: Math.min(95, n.age + wy), alive: evo?.[n.id]?.dead ? false : true }))
    .filter((n) => n.alive !== false);
  const born = (s.world?.npcBorn || []).filter((n) => n.loc === loc && n.alive !== false)
    .map((n) => ({ ...n, age: Math.min(95, n.age + Math.max(0, wy - (n.bornY ?? wy))), name: n.nameSeed != null ? `${localFirstName(n.nameSeed, n.gender, lang)} ${localSurname(n.nameSeed * 2 + 1, lang)}` : n.name }));
  return born.length ? [...base, ...born] : base;
}
// Bir mülkün şehrinin işçi havuzu (yaşayan kadrodan).
export function townNpcsOf(s: GameState, loc: string, lang: Lang = "tr"): NPC[] { return rosterAt(s, loc, lang); }
// Yaşayan dünya tiki (Vercel simulation _age_and_die / _marry_and_birth): yılda bir yaşa-bağlı ölüm + dengeli doğum (nüfus stabil) + evlilik haberi.
function npcBaby(s: GameState, loc: string): NPC {
  const n = generateNPCs((locSeed(loc) ^ s.turn ^ Math.floor(Math.random() * 1e6)) >>> 0, 1, "tr", "born")[0];
  n.id = `born_${loc}_${s.turn}_${Math.floor(Math.random() * 1e6)}`; n.loc = loc; n.alive = true; n.age = 0; n.bornY = worldYears(s);
  n.nameSeed = (Math.floor(Math.random() * 1e9)) >>> 0; // isim dile göre çözülsün
  return n;
}
function npcLifeTick(s: GameState) {
  if (s.turn === 0 || s.turn % 12 !== 0) return; // yılda bir
  if (!s.world.npcEvo) s.world.npcEvo = {};
  if (!s.world.npcBorn) s.world.npcBorn = [];
  let knownGone: string | null = null;
  for (const loc of LOCATIONS) {
    for (const n of rosterAt(s, loc)) {
      const dc = n.age < 55 ? 0 : n.age < 70 ? 0.02 : n.age < 82 ? 0.07 : 0.18; // yaşa göre ölüm şansı
      if (dc <= 0 || Math.random() >= dc) continue;
      if (n.id.startsWith("born_")) { const b = s.world.npcBorn.find((x) => x.id === n.id); if (b) b.alive = false; }
      else s.world.npcEvo[n.id] = { dead: true };
      s.world.npcBorn.push(npcBaby(s, loc)); // her ölüm bir doğumla dengelenir → nüfus stabil
      // Ölen NPC oyuncunun işçisiyse mülkten çıkar (slot boşalsın) + haber ver.
      for (const pr of s.player.properties) { if (pr.workers?.includes(n.id)) { pr.workers = pr.workers.filter((id) => id !== n.id); push(s, "mülk", `İşçin ${n.name} vefat etti; ${PROPERTY_TYPES[pr.type]?.name || "mülkünde"} bir yer boşaldı.`, "kişisel", false, { k: "npclife.workerDied", p: [n.name, { pt2: pr.type }] }); } }
      if (!knownGone && s.npc_state?.[n.id]) knownGone = n.name;
    }
  }
  if (knownGone) push(s, "dunya_olayi", `${knownGone} bu dünyadan göçtü; tanıdık bir yüz eksildi.`, "kişisel", true, { k: "npclife.deathKnown", p: [knownGone] });
  else if (Math.random() < 0.5) { // evlilik haberi (nüfus etkisi yok)
    const loc = rnd(LOCATIONS); const r = rosterAt(s, loc);
    const m = r.find((n) => n.gender === "erkek" && n.age >= 18 && n.age < 55);
    const f = r.find((n) => n.gender === "kadın" && n.age >= 18 && n.age < 55);
    if (m && f) push(s, "dunya_olayi", `${loc}'de ${m.name} ile ${f.name} dünyaevi kurdu.`, "makro", false, { k: "npclife.marry", p: [m.name, f.name] });
  }
  if (s.world.npcBorn.length > 260) s.world.npcBorn = s.world.npcBorn.filter((n) => n.alive !== false).slice(-260);
}
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
export function propWorkerStats(s: GameState, pr: Property, base: number, condProspLevel: number, lang: Lang = "tr"): { gross: number; wage: number; count: number } {
  const ids = pr.workers || [];
  if (!ids.length) return { gross: 0, wage: 0, count: 0 };
  const npcs = townNpcsOf(s, pr.loc, lang);
  let gross = 0, wage = 0;
  for (const id of ids) {
    const npc = npcs.find((x) => x.id === id); if (!npc) continue;
    const prod = workerProductivity(npc, pr.type);
    gross += base * WORKER_GROSS * prod * condProspLevel;
    wage += base * WORKER_WAGE * prod;
  }
  return { gross, wage, count: ids.length };
}
// Üretim zinciri (Vercel production_chains.py): işçili mülk gerçek hammadde üretir → zanaat/ticaret beslenir.
export const PROP_YIELD: Record<string, string> = { tarla: "bugday", degirmen: "un" };
export function propYield(s: GameState, pr: Property, lang: Lang = "tr"): { good: string; qty: number } | null {
  const good = PROP_YIELD[pr.type]; const ids = pr.workers || [];
  if (!good || !ids.length) return null;
  const npcs = townNpcsOf(s, pr.loc, lang);
  let units = 0;
  for (const id of ids) { const npc = npcs.find((x) => x.id === id); if (npc) units += workerProductivity(npc, pr.type) * (1 + ((pr.level || 1) - 1) * 0.3); }
  const qty = Math.floor(units); // ~işçi başına ayda ~1 birim (üretkenlikle ölçekli)
  return qty > 0 ? { good, qty } : null;
}
// İşçi işe al (mülkün bulunduğu şehrin NPC'lerinden, boş slot varsa).
export function hireWorker(prev: GameState, index: number, npcId: string): GameState {
  const s = clone(prev); const pr = s.player.properties[index];
  if (!pr) return s;
  pr.workers = pr.workers || [];
  if (pr.workers.includes(npcId) || pr.workers.length >= propWorkerSlots(pr)) return s;
  pr.workers.push(npcId);
  const npc = townNpcsOf(s, pr.loc).find((x) => x.id === npcId);
  push(s, "mülk", `${npc?.name || "Bir işçi"}, ${PROPERTY_TYPES[pr.type]?.name || "mülkünde"} (${pr.loc}) işe alındı.`, "kişisel", true, { k: "evj.workerHired", p: [npc?.name || "Bir işçi", { pt2: pr.type }, { pl: pr.loc }] });
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
  { id: "tuccar", name: "Tüccarlar Loncası", icon: "pazar", blurb: "İpek yolunun akçesi onların avucunda döner.", stat: "charisma", joinRep: 30, perk: "Pazarda alış fiyatları senin için biraz düşer.", task: { label: "Kervan hesabı tut", reward: 28, standing: 10, desc: "Loncanın defterlerini denkleştir." } },
  { id: "demirci", name: "Demirciler Loncası", icon: "anvil", blurb: "Köz ve örs; her kılıcın ve sabanın atası.", stat: "strength", joinRep: 30, perk: "İşten kazancın artar (zanaat eli).", task: { label: "Ocakta körük çek", reward: 24, standing: 10, desc: "Usta için ağır bir sipariş bitir." } },
  { id: "asker", name: "Asker Ocağı", icon: "karakter", blurb: "Sınır boylarının kalkanı; sancağın gölgesi.", stat: "strength", joinRep: 40, perk: "Suç ve tehlikede sağlık kaybın azalır.", task: { label: "Devriyeye çık", reward: 32, standing: 12, desc: "Gece nöbetinde yolları kolla." } },
  { id: "sifaci", name: "Şifacılar Meclisi", icon: "healing", blurb: "Ot, dua ve sabır; canın sessiz bekçileri.", stat: "intelligence", joinRep: 30, perk: "Her ay az da olsa sağlık tazelenir.", task: { label: "Hastalara bak", reward: 18, standing: 10, desc: "Köyün dermansızlarına şifa dağıt." } },
  { id: "golge", name: "Gölge Kardeşliği", icon: "hood", blurb: "Adı anılmaz, yüzü görülmez; ama her kapıda bir kulağı vardır.", stat: "charisma", joinRep: 25, perk: "Gölge işlerinde yakalanma riskin azalır.", task: { label: "Haber taşı", reward: 22, standing: 12, desc: "Kardeşlik için sessizce bir sır ulaştır." } },
];
export function factionById(id: string | null): Faction | undefined { return FACTIONS.find((f) => f.id === id); }
// Fraksiyon arketipleri — AI'ın MANTIKLI davranması için (şifacı savaş açmaz, müttefikler birbirine saldırmaz).
//  aggression: savaşa/darbeye iştah (0 barışçıl … 1 savaşçı) · enemies/allies: doğal husumet/dostluk · acts: karaktere uygun AI eylemleri.
export interface FactionTrait { aggression: number; enemies: string[]; allies: string[]; acts: string[]; }
export const FACTION_TRAITS: Record<string, FactionTrait> = {
  asker:   { aggression: 0.90, enemies: ["golge"],            allies: ["demirci"],        acts: ["nufuz", "darbe", "bagis"] },
  golge:   { aggression: 0.70, enemies: ["asker", "tuccar"],  allies: [],                 acts: ["sabotaj", "suikast", "nufuz"] },
  tuccar:  { aggression: 0.35, enemies: ["golge"],            allies: ["demirci"],        acts: ["bagis", "nufuz"] },
  demirci: { aggression: 0.40, enemies: [],                   allies: ["asker", "tuccar"], acts: ["nufuz", "bagis"] },
  sifaci:  { aggression: 0.05, enemies: [],                   allies: [],                 acts: ["bagis", "uye"] }, // barışçıl: asla savaş/darbe/suikast
};
export function factionTrait(id: string): FactionTrait { return FACTION_TRAITS[id] || { aggression: 0.3, enemies: [], allies: [], acts: ["bagis"] }; }
// İki fraksiyon arasındaki doğal duruş: -1 düşman, +1 dost, 0 nötr (UI + AI için).
export function factionStance(a: string, b: string): number {
  if (a === b) return 1;
  const ta = factionTrait(a);
  if (ta.allies.includes(b)) return 1;
  if (ta.enemies.includes(b)) return -1;
  if (factionTrait(b).enemies.includes(a)) return -1;
  return 0;
}
// İki lonca arası ateşkes (savaştan sonra hemen tekrar savaşmasınlar).
function warPairKey(a: string, b: string): string { return [a, b].sort().join("|"); }
function onWarCooldown(s: GameState, a: string, b: string): boolean { return (s.warCooldowns?.[warPairKey(a, b)] ?? 0) > s.turn; }
function setWarCooldown(s: GameState, a: string, b: string, turns: number) { if (!s.warCooldowns) s.warCooldowns = {}; s.warCooldowns[warPairKey(a, b)] = s.turn + turns; }
// Loncaya katılım eşiği (karizmatik hüneri %20 indirir). UI ile çekirdek tutarlı olsun diye.
export function joinThreshold(p: Player, f: Faction): number { return p.perks.includes("karizmatik") ? Math.round(f.joinRep * 0.8) : f.joinRep; }

export interface GameEvent { day: number; type: string; text: string; scope: "kişisel" | "makro"; landmark?: boolean; k?: string; p?: EvtParam[]; }
export interface DynastyRecord { generation: number; name: string; profession: string; diedAge: number; fame: number; reputation: number; faction: string | null; note: string; }
export interface NpcState { mood: number; memories: string[]; anilar?: Memory[]; }
// İlişkinin etkin değeri: kalıcı taban + yapısal anıların toplam yükü (Vercel effective_rel).
export function relWith(s: GameState, id: string): number {
  return effectiveRel(s.relationships[id] || 0, s.npc_state?.[id]?.anilar);
}
// Bir NPC'ye yapısal anı ekle (kişiselleştirilmiş hatırlama + dedikodu + nam kaynağı).
function remember(s: GameState, npc: { id: string; name: string }, tur: string, opts?: { yuk?: number; taniklar?: string[] }) {
  const ns = npcStateOf(s, npc.id);
  if (!ns.anilar) ns.anilar = [];
  addMemory(ns.anilar, tur, s.turn, { ...opts, kaynak: npc.name });
}
// ── Sonuç tohumları (Vercel story_director sow_seed): bugün ektiğin yıllar sonra biçilir ──
export interface Seed { id: string; kaynak: string; ekim: number; hmin: number; hmax: number; agirlik: "kucuk" | "orta" | "buyuk"; nesil: boolean; etki?: { money?: number; reputation?: number; health?: number }; npcName?: string; }
function sowSeed(s: GameState, opts: Omit<Seed, "id" | "ekim">) {
  if (!s.seeds) s.seeds = [];
  s.seeds.push({ ...opts, id: opts.kaynak + "_" + Math.random().toString(36).slice(2, 8), ekim: s.turn });
  if (s.seeds.length > 30) s.seeds = s.seeds.slice(-30);
}
function seedKosulOk(s: GameState, t: Seed): boolean {
  return true; // (ileride itibar/para koşulu eklenebilir)
}
function germinateSeed(s: GameState, t: Seed) {
  s.seeds = (s.seeds || []).filter((x) => x.id !== t.id);
  const p = s.player;
  if (t.etki?.money) p.money = Math.max(0, p.money + t.etki.money);
  if (t.etki?.reputation) p.reputation = Math.max(-100, Math.min(100, p.reputation + t.etki.reputation));
  if (t.etki?.health) p.health = Math.max(1, Math.min(100, p.health + t.etki.health));
  push(s, "tohum", `Geçmiş kapını çaldı.`, "kişisel", true, { k: "seed." + t.kaynak, p: [t.npcName || "", p.name] });
}
function seedTick(s: GameState) {
  const seeds = s.seeds; if (!seeds || !seeds.length) return;
  const turn = s.turn; const ready: [Seed, boolean][] = [];
  for (const t of seeds) {
    const yas = turn - t.ekim;
    if (yas >= t.hmax) ready.push([t, true]); // vadesi doldu — zorla biçilir
    // Büyük tohumlar doruğu bekler (directorTick'te biçilir); küçük/orta tohumlar kendiliğinden filizlenir.
    else if (yas >= t.hmin && seedKosulOk(s, t) && t.agirlik !== "buyuk" && Math.random() < 0.05) ready.push([t, false]);
  }
  if (!ready.length) return;
  ready.sort((a, b) => (a[1] === b[1] ? a[0].ekim - b[0].ekim : (a[1] ? -1 : 1)));
  germinateSeed(s, ready[0][0]);
}
// (Nesil devri tohum aktarımı continueAsHeir içinde: sadece nesil aşabilenler kalır.)

// ── Çağ olayları (Vercel legacy_system epoch_tick): her ~60-90 turda kalıcı dünya kırılması ──
function epochTick(s: GameState) {
  if (s.player.dead) return;
  if (s.epochNext == null) { s.epochNext = s.turn + 60 + Math.floor(Math.random() * 36); return; }
  if (s.turn < s.epochNext) return;
  s.epochNext = s.turn + 60 + Math.floor(Math.random() * 36);
  const k = rnd(["savas", "salgin", "taht", "altincag"]);
  if (k === "savas") {
    s.econ = Math.max(0.7, (s.econ || 1) - 0.2); s.player.fear = Math.min(100, s.player.fear + 2);
    if (s.realm) for (const sn of s.realm) sn.tension = Math.min(120, sn.tension + 15); // savaş sancakları kızıştırır
    push(s, "cag", `Çağın gölgesi: diyarı büyük bir savaş sardı; yollar tehlikeli, pazar daraldı.`, "makro", true, { k: "epoch.savas" });
  } else if (k === "salgin") {
    s.econ = Math.max(0.7, (s.econ || 1) - 0.15);
    if (Math.random() < 0.3) s.player.health = Math.max(1, s.player.health - 10);
    push(s, "cag", `Çağın gölgesi: bir salgın diyarı kırıp geçiyor; herkes kapısını sıkı tuttu.`, "makro", true, { k: "epoch.salgin" });
  } else if (k === "taht") {
    if (s.realm && s.realm.length) { const sn = rnd(s.realm); sn.tension = Math.min(120, sn.tension + 25); }
    push(s, "cag", `Çağın gölgesi: tahtta el değişti; yeni efendiler, yeni dengeler.`, "makro", true, { k: "epoch.taht" });
  } else {
    s.econ = Math.min(1.5, (s.econ || 1) + 0.25);
    push(s, "cag", `Çağın aydınlığı: bir altın çağ başladı; bolluk ve bereket diyara yayıldı.`, "makro", true, { k: "epoch.altincag" });
  }
}

// ── Hikâye Yönetmeni (Vercel story_director): doruk üretimi + nefes kuralı ──
// Gerilim 80+ → tek büyük dramatik an (olgun büyük tohum varsa onu doruğa saklamıştı);
// sonra gerilim düşer ve birkaç tur "nefes" (sakin dönem) garanti edilir.
function directorTick(s: GameState) {
  const st = s.story; if (!st || s.player.dead) return;
  if ((st.breath || 0) > 0) {
    st.breath = (st.breath || 0) - 1;
    st.tension = Math.max(0, st.tension - 2);
    if (st.breath === 0) push(s, "huzur", `Fırtına dindi; bir süre sular durulur.`, "kişisel", false, { k: "dir.breathEnd" });
    return;
  }
  if (st.tension < 80) return;
  // 1) Olgunlaşmış büyük tohum varsa doruğa o saklanmıştı — şimdi biçilir.
  const big = (s.seeds || []).filter((t) => t.agirlik === "buyuk" && s.turn - t.ekim >= t.hmin).sort((a, b) => a.ekim - b.ekim)[0];
  if (big) {
    germinateSeed(s, big);
  } else if (st.nemesis && Math.random() < 0.6) {
    push(s, "doruk", `Husumet doruğa çıktı: ${st.nemesis.name} gölgeden çıkıp üstüne geldi.`, "kişisel", true, { k: "dir.climaxNemesis", p: [st.nemesis.name] });
    s.player.fear = Math.min(100, s.player.fear + 4);
    st.nemesis.power += 3;
  } else if (Math.random() < 0.5) {
    s.player.reputation = Math.min(100, s.player.reputation + 5); s.player.fame = Math.min(100, s.player.fame + 4);
    push(s, "doruk", `Yıllardır biriken gerilim doruğa vardı — ve bu kez talih senden yana döndü.`, "kişisel", true, { k: "dir.climaxWin" });
  } else {
    push(s, "doruk", `Hayatın bir dönüm noktasına geldi; eski dengeler sarsıldı.`, "kişisel", true, { k: "dir.climaxTurn" });
  }
  st.tension = 30; st.breath = 4; st.lull = 0;
}

// Skandal bir eyleme yakındaki bir NPC tanık olur → skandal anı (dedikodu kaynağı).
function witnessScandal(s: GameState, tur: string, chance: number) {
  if (Math.random() >= chance) return;
  const npcs = npcsOf(s); if (!npcs.length) return;
  remember(s, npcs[Math.floor(Math.random() * npcs.length)], tur);
}
// Dedikodu turu: işlenmemiş skandal anılar oyuncu söylentisine dönüşür (Vercel gossip_tick).
function gossipTick(s: GameState) {
  const turn = s.turn;
  let rumors = s.player_rumors || [];
  for (const r of rumors) r.siddet = Math.round((r.siddet - 0.15) * 100) / 100;
  rumors = rumors.filter((r) => r.siddet > 0).slice(-12);
  if (s.npc_state) for (const id in s.npc_state) {
    const anilar = s.npc_state[id].anilar; if (!anilar) continue;
    for (const m of anilar) {
      if (m.yayildi || (turn - m.hafta) > 4) { m.yayildi = true; continue; }
      const skandal = MEMORY_TYPES[m.tur]?.skandal || 0;
      if (skandal <= 0 || !RUMOR_VARIANTS[m.tur]) { m.yayildi = true; continue; }
      m.yayildi = true;
      const tanik = 1 + (m.taniklar?.length || 0);
      const sans = Math.min(0.9, tanik * skandal * 0.55);     // yoğunluk ~orta varsayılır (offline)
      if (Math.random() >= sans) continue;
      const vc = RUMOR_VARIANTS[m.tur];
      rumors.push({
        id: Math.random().toString(36).slice(2, 12), hafta: turn, tur: m.tur, vi: Math.floor(Math.random() * vc),
        nam: MEMORY_TYPES[m.tur]?.nam || null, yon: m.yuk > 0 ? 1 : -1,
        siddet: Math.min(3, Math.max(1, Math.round(Math.abs(m.yuk) / 12))), kaynak: m.kaynak || "",
      });
    }
  }
  s.player_rumors = rumors.slice(-12);
}
// ── Eyleme dönük duyumlar (Vercel rumors.py actionable_rumors portu) ──
// Piyasa ipucu: deterministik fiyat modelinden GERÇEK arbitraj (ucuz şehir → pahalı şehir); takip eden kazanır.
// Fraksiyon istihbaratı: süren bir savaşın önceden duyulması.
export interface Tip { id: string; kind: "market" | "intel"; hafta: number; good?: string; cheap?: string; expensive?: string; fac?: string; vsFac?: string; }
function makeMarketTip(turn: number): Tip | null {
  const goods = Object.keys(ITEMS);
  const gid = goods[Math.floor(Math.random() * goods.length)];
  let cheap = "", exp = ""; let lowBuy = Infinity, highSell = -Infinity;
  for (const loc of LOCATIONS) {
    const g = marketGoods(locSeed(loc)).find((x) => x.id === gid); if (!g) continue;
    if (g.buy < lowBuy) { lowBuy = g.buy; cheap = loc; }
    if (g.sell > highSell) { highSell = g.sell; exp = loc; }
  }
  if (!cheap || !exp || cheap === exp || highSell < lowBuy * 1.15) return null; // anlamlı marj yoksa ipucu üretme
  return { id: Math.random().toString(36).slice(2, 10), kind: "market", hafta: turn, good: gid, cheap, expensive: exp };
}
function tipsTick(s: GameState) {
  let tips = (s.tips || []).filter((tp) => s.turn - tp.hafta <= 6); // ~6 ay sonra bayatlar
  if (Math.random() < 0.22 && tips.length < 4) {
    const war = (s.wars || [])[0];
    if (war && Math.random() < 0.5) {
      if (!tips.some((tp) => tp.kind === "intel" && tp.fac === war.a && tp.vsFac === war.b))
        tips.push({ id: Math.random().toString(36).slice(2, 10), kind: "intel", hafta: s.turn, fac: war.a, vsFac: war.b });
    } else {
      const mt = makeMarketTip(s.turn);
      if (mt && !tips.some((tp) => tp.kind === "market" && tp.good === mt.good && tp.cheap === mt.cheap)) tips.push(mt);
    }
  }
  s.tips = tips.slice(-4);
}
// Söylenti eylemi: yüzleş / yay / sustur (Vercel rumor_action). Döndürür yeni state.
export function rumorAction(prev: GameState, rumorId: string, eylem: "yuzles" | "yay" | "sustur"): GameState {
  const s = clone(prev); const p = s.player;
  const rumors = s.player_rumors || [];
  const r = rumors.find((x) => x.id === rumorId);
  if (!r) return s;
  const social = p.skills?.social || 0;
  if (eylem === "yuzles") {
    const sans = Math.max(0.15, Math.min(0.85, 0.40 + social * 0.05 + socialPresence(p) * 0.03 - r.siddet * 0.08));
    if (Math.random() < sans) {
      s.player_rumors = rumors.filter((x) => x.id !== rumorId);
      p.reputation = Math.min(100, p.reputation + 2); bumpNam(p, "mert", 3);
      push(s, "söylenti", `"${r.kaynak}" yüzüne karşı sözünü yutmak zorunda kaldı; söylenti söndü.`, "kişisel", false, { k: "rum.confront.win" });
    } else {
      r.siddet = Math.min(4, r.siddet + 1);
      push(s, "söylenti", `Yüzleşme ters tepti — söylenti alevlendi.`, "kişisel", false, { k: "rum.confront.lose" });
    }
    return s;
  }
  if (eylem === "yay") {
    if (r.yon <= 0) return s; // kendi aleyhine lafı yaymak akıl kârı değil
    r.siddet = Math.min(4, r.siddet + 1); p.reputation = Math.min(100, p.reputation + 1);
    push(s, "söylenti", `Sözü sen de salladın; namın büyüyor.`, "kişisel", false, { k: "rum.spread.win" });
    return s;
  }
  // sustur
  const cost = 15 * Math.round(r.siddet);
  if (p.money < cost) return s;
  p.money -= cost;
  if (Math.random() < 0.70) {
    s.player_rumors = rumors.filter((x) => x.id !== rumorId);
    push(s, "söylenti", `${cost} akçe doğru ellere dağıldı; konuşan diller unutkanlaştı.`, "kişisel", false, { k: "rum.silence.win", p: [cost] });
  } else {
    bumpNam(p, "zalim", 3);
    rumors.push({ id: Math.random().toString(36).slice(2, 12), hafta: s.turn, tur: "dolandiricilik", vi: 0, nam: "zalim", yon: -1, siddet: 2, kaynak: r.kaynak });
    s.player_rumors = rumors.slice(-12);
    push(s, "söylenti", `Para el değiştirdi ama biri boşboğazlık etti: "Rüşvet dağıtıyor!" İş büyüdü.`, "kişisel", true, { k: "rum.bribe" });
  }
  return s;
}
export interface StoryProgress { active: { id: string; stage: string } | null; completed: string[]; tension: number; nemesis?: { name: string; power: number } | null; flags?: Record<string, boolean>; lull?: number; breath?: number; }
export interface GameState {
  turn: number; seed: number; player: Player; history: GameEvent[];
  relationships: Record<string, number>; world: { ready: boolean; npcEvo?: Record<string, { dead?: boolean; age?: number; married?: boolean }>; npcBorn?: NPC[]; npcYears?: number; inflation?: number; marketLeverUntil?: number; mkt?: Record<string, number> };
  dynasty: DynastyRecord[];
  npc_state: Record<string, NpcState>;
  story: StoryProgress;
  wars: FactionWar[];
  warCooldowns?: Record<string, number>; // iki lonca arası ateşkes: pair → bu tura kadar yeni savaş yok
  realm?: SancakHold[]; // 4 sancağın fraksiyon hakimiyeti (emergent şehir-kontrolü)
  rivals?: RivalHouse[]; // rakip hanedanların yaşayan gücü (zamanla değişir + hamle yapar)
  caravan: { invested: number; dest: string; route?: string[]; step?: number; lost?: number; returnTurn?: number; good?: string; spread?: number } | null;
  econ: number; // piyasa çarpanı (kıtlık>1, bolluk<1)
  settlements?: Settlement[]; // hanedanın kurduğu yerleşimler
  marketEvent?: { goods: string[]; mult: number; until: number; key: string } | null; // geçici piyasa olayı
  player_rumors?: Rumor[]; // oyuncu hakkında dolaşan söylentiler (npc_mind dedikodu ağı)
  seeds?: Seed[]; // sonuç tohumları (geçmişin geleceğe etkisi)
  dynastyOffers?: DynastyOffer[]; // dost hanelerden ittifak/evlilik teklifleri
  allied_houses?: string[]; // ittifak kurulan hanelerin id'leri
  epochNext?: number; // bir sonraki çağ olayının turu (legacy_system epoch_tick)
  pendingScene?: { kind: string; ctx: Record<string, string> } | null; // oyuncu seçimi bekleyen interaktif sahne (suç kesintisi vb.)
  tips?: Tip[]; // eyleme dönük duyumlar (piyasa ipucu / fraksiyon istihbaratı)
  locEvents?: LocEvent[]; // lokasyon-bazlı tipli dünya olayları (kuraklık/panayır/veba...)
}
// Dost bir hanedanın oyuncuya teklifi (ittifak veya evlilik).
export interface DynastyOffer { id: string; houseId: string; nameIdx: number; type: "ittifak" | "evlilik"; }
// Oyuncu hakkında söylenti — tanıklı skandal anıdan doğar, zamanla söner.
export interface Rumor { id: string; hafta: number; tur: string; vi: number; nam: string | null; yon: number; siddet: number; kaynak: string; }
// Hanedanın kurduğu yerleşim — mezra olarak başlar, yıllarca gelişir, vergi getirir.
export interface Settlement { name: string; founded: number; dev: number; tier?: string; loc?: string; }
// Piyasa çarpanına göre fiyat.
export function marketPrice(base: number, econ: number): number { return Math.max(1, Math.round(base * (econ || 1))); }
// ── Enflasyon (gerçek hayattaki gibi: dünya tabanlı, oyuncudan bağımsız) ──
// Para yıllar geçtikçe yavaşça değer kaybeder (sikke tağşişi); savaş/kıtlık hızlandırır.
// Hisse: biriken nakit erir, üretken mülk değerini korur → para hep önemli kalır.
export function inflationFactor(s: GameState): number { return s.world?.inflation || 1; }
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
// Bir malın anlık fiyat çarpanı: mevsim × aktif piyasa olayı × ARZ-TALEP (NPC meslekleri) × oyuncu baskısı.
export function goodPriceMult(s: GameState, goodId: string): number {
  let m = (SEASON_MULT[currentCalendar(s.turn).season] || {})[goodId] || 1;
  const ev = s.marketEvent;
  if (ev && ev.until > s.turn && ev.goods.includes(goodId)) m *= ev.mult;
  m *= locPriceMult(s, s.player.location_name, goodId); // bulunduğun şehirdeki olaylar (kuraklık/panayır...) fiyata yansır
  m *= supplyDemandMult(s, s.player.location_name, goodId); // şehrin NPC meslekleri → gerçek yerel arz
  m *= tradePressureMult(s, s.player.location_name, goodId); // oyuncunun alış-satış baskısı (kıtlaştırma/doldurma)
  return m;
}
// Pazarda gösterilen anlık alış fiyatı (pazar.tsx ile birebir aynı formül). Bulunduğun şehir için geçerli.
export function effectiveBuyPrice(s: GameState, baseBuy: number, goodId: string): number {
  return Math.max(1, Math.round(marketPrice(baseBuy, s.econ || 1) * goodPriceMult(s, goodId)));
}
// Fiyat hafızası anlık-görüntüsü: bulunduğun şehrin güncel alış fiyatlarını "loc|good" anahtarıyla kaydet.
// advance'te tur ilerlemeden ÖNCE çağrılır → ayrılan ayın fiyatı saklanır; sonraki ay pazarda "geçen X" olarak görünür.
function snapshotPrices(s: GameState) {
  const loc = s.player.location_name;
  if (!s.player.priceMem) s.player.priceMem = {};
  for (const g of marketGoods(locSeed(loc))) s.player.priceMem[loc + "|" + g.id] = effectiveBuyPrice(s, g.buy, g.id);
}

// ── ARZ–TALEP: şehrin NPC meslekleri gerçek yerel arzı belirler (yaşayan dünyayla değişir) ──
// Hangi meslek hangi malı üretir (ağırlıklı): çiftçi buğday yetiştirir, demirci demir/silah döver...
const GOOD_PRODUCERS: Record<string, [string, number][]> = {
  bugday: [["çiftçi", 1]], un: [["çiftçi", 0.5], ["fırıncı", 0.5]], ekmek: [["fırıncı", 1]], corba: [["fırıncı", 0.4], ["hancı", 0.6]],
  peynir: [["çoban", 1]], et: [["avcı", 0.6], ["çoban", 0.5]], balik: [["balıkçı", 1]], yun: [["çoban", 0.7], ["dokumacı", 0.4]],
  bal: [["çiftçi", 0.5]], sarap: [["çiftçi", 0.5]], sifa: [["şifacı", 1]], iksir: [["şifacı", 0.7]],
  demir: [["demirci", 1]], kereste: [["marangoz", 1]], deri: [["avcı", 0.7]],
  bicak: [["demirci", 1]], kilic: [["demirci", 1]], celik_kilic: [["demirci", 1]], savas_balta: [["demirci", 1]], kalkan: [["demirci", 1]], zincir_zirh: [["demirci", 1]],
  yay: [["marangoz", 0.6], ["avcı", 0.4]], deri_zirh: [["avcı", 0.5], ["demirci", 0.3]],
};
// Malın talep yoğunluğu (nüfusa oranlı): yiyecek herkesçe tüketilir; silah/zırh azdır; hammadde zanaatkârlarca aranır.
const DEMAND_COEF: Record<string, number> = {
  ekmek: 0.16, corba: 0.12, peynir: 0.10, et: 0.12, balik: 0.10, bugday: 0.14, un: 0.10,
  bal: 0.06, sarap: 0.07, sifa: 0.06, iksir: 0.04, yun: 0.07, demir: 0.09, kereste: 0.08, deri: 0.07,
  bicak: 0.05, kilic: 0.04, celik_kilic: 0.03, savas_balta: 0.03, kalkan: 0.03, zincir_zirh: 0.03, yay: 0.04, deri_zirh: 0.03,
};
function workerAgeProd(age: number): number { return age < 16 ? 0.3 : age <= 50 ? 1 : age <= 65 ? 0.7 : 0.4; }
// Çok-girişli memo (42 yerleşimli dünyada kervan arbitrajı tüm lokasyonları taradığından tek-giriş thrash ediyordu).
let _profCache: Record<string, Record<string, number>> = {};
// Şehrin yaşayan kadrosundaki meslek dağılımı (yaşa göre üretkenlik ağırlıklı). Yılda bir değişir → memo.
function cityProfCounts(s: GameState, loc: string): Record<string, number> {
  const key = loc + "@" + worldYears(s) + "#" + s.seed;
  let counts = _profCache[key];
  if (counts) return counts;
  if (Object.keys(_profCache).length > 600) _profCache = {}; // sınır: ara sıra tümden temizle (tembelce yeniden dolar)
  counts = {};
  for (const n of rosterAt(s, loc)) counts[n.profession] = (counts[n.profession] || 0) + workerAgeProd(n.age);
  _profCache[key] = counts;
  return counts;
}
// Oyuncunun bir şehirdeki işçili mülklerinin o malı aylık üretimi (üretim zinciri → şehir arzı).
// Çiftliğin buğdayı sadece oyuncu envanterine değil, o şehrin pazarına da akar → yerel fiyatı düşürür.
function playerPropSupply(s: GameState, loc: string, good: string): number {
  let extra = 0;
  for (const pr of s.player.properties || []) {
    if (pr.loc !== loc || !(pr.workers?.length)) continue;
    const y = propYield(s, pr);
    if (y && y.good === good) extra += y.qty;
  }
  return extra;
}
// Bir malın yerel arzı: üreten mesleklerin ağırlıklı sayısı × mevsim + oyuncu mülklerinin üretimi.
export function cityGoodSupply(s: GameState, loc: string, good: string): number {
  const prod = GOOD_PRODUCERS[good]; if (!prod) return 0;
  const counts = cityProfCounts(s, loc);
  let sup = 0; for (const [prof, w] of prod) sup += (counts[prof] || 0) * w;
  if (prod.some(([p]) => p === "çiftçi" || p === "çoban" || p === "balıkçı"))
    sup *= ({ "İlkbahar": 1.0, "Yaz": 1.1, "Sonbahar": 1.5, "Kış": 0.5 }[currentCalendar(s.turn).season] ?? 1); // mevsim üretimi etkiler
  sup += playerPropSupply(s, loc, good); // oyuncunun çiftlik/değirmen üretimi yerel arzı şişirir
  return sup;
}
// Şehrin GERÇEK geçim uzmanlığı: yaşayan kadronun en çok ürettiği mal grubu (SPECIALTIES indeksi).
// Statik tohum yerine canlı dünyaya bağlı: demirciler ölüp çiftçiler çoğaldıkça uzmanlık kayar.
export function citySpecialtyIdx(s: GameState, loc: string): number {
  let best = 0, bestSup = -1;
  for (let i = 0; i < SPECIALTIES.length; i++) {
    let sup = 0; for (const g of SPECIALTIES[i].goods) sup += cityGoodSupply(s, loc, g);
    if (sup > bestSup) { bestSup = sup; best = i; }
  }
  return best;
}
// Bir malın o şehirdeki anlık pazar durumu (UI rozeti): bol (ucuz) / kıt (pahalı) / dengeli / izlenmiyor.
export function goodMarketTag(s: GameState, loc: string, good: string): "bol" | "kit" | "denge" | null {
  if (!GOOD_PRODUCERS[good]) return null; // arz-talebi modellenmeyen mal (rozet yok)
  const sd = supplyDemandMult(s, loc, good);
  if (sd <= 0.85) return "bol";   // arz bol → ucuz
  if (sd >= 1.18) return "kit";   // arz kıt → pahalı
  return "denge";
}
// Bir malın yerel fiyat yönü (trend oku): oyuncu baskısı + aktif piyasa/şehir olayları. +1 yükseliyor, -1 düşüyor.
export function goodTrend(s: GameState, loc: string, good: string): -1 | 0 | 1 {
  let dir = s.world?.mkt?.[loc + "|" + good] || 0; // oyuncunun alış(+)/satış(−) baskısı
  const me = s.marketEvent;
  if (me && me.until > s.turn && me.goods.includes(good)) dir += (me.mult - 1); // diyar piyasa olayı
  dir += (locPriceMult(s, loc, good) - 1); // şehir olayları (kuraklık/panayır/veba...)
  if (dir > 0.06) return 1;
  if (dir < -0.06) return -1;
  return 0;
}
// Bir malın yerel talebi (nüfusa oranlı). Savaşta silah/zırh talebi artar.
export function cityGoodDemand(s: GameState, loc: string, good: string): number {
  let d = (DEMAND_COEF[good] || 0.06) * rosterSize(loc);
  if ((s.wars?.length || 0) > 0 && (ITEMS[good]?.kind === "silah" || ITEMS[good]?.kind === "zirh")) d *= 1.6;
  return d;
}
// Arz/talep fiyat çarpanı: arz bolsa ucuz, kıt/yoksa pahalı (~0.65–1.6). +0.3: dışarıdan az da olsa mal sızar.
export function supplyDemandMult(s: GameState, loc: string, good: string): number {
  const dem = cityGoodDemand(s, loc, good); if (dem <= 0) return 1;
  const ratio = (cityGoodSupply(s, loc, good) + 0.3) / dem;
  return Math.max(0.65, Math.min(1.6, 1 / (0.55 + 0.45 * ratio)));
}
// Oyuncunun alış-satış baskısı (kıtlaştırma/doldurma) — kalıcı, zamanla söner. Alış fiyatı yukarı, satış aşağı iter.
export function tradePressureMult(s: GameState, loc: string, good: string): number {
  return 1 + Math.max(-0.4, Math.min(0.6, s.world?.mkt?.[loc + "|" + good] || 0));
}
function addTradePressure(s: GameState, loc: string, good: string, delta: number) {
  if (!s.world) return; s.world.mkt = s.world.mkt || {};
  const key = loc + "|" + good;
  s.world.mkt[key] = Math.max(-0.5, Math.min(0.8, (s.world.mkt[key] || 0) + delta));
}
// ── Tipli lokasyon-bazlı dünya olayları (Vercel world_events.py portu) ──
// Her olay BİR şehri vurur: refah/güvenlik + fiyat etkisi + (oradaysan) seni etkiler. Haftalık söner.
export interface LocEvent { id: string; loc: string; type: string; hafta: number; until: number; }
export interface LocEventType { id: string; icon: string; prosp: number; sec: number; goods: string[]; priceMult: number; months: [number, number] }
export const LOC_EVENT_TYPES: Record<string, LocEventType> = {
  kuraklik: { id: "kuraklik", icon: "sun", prosp: -12, sec: 0,   goods: ["bugday", "un", "ekmek", "et", "balik"], priceMult: 1.4, months: [4, 7] },
  bereket:  { id: "bereket",  icon: "wheat", prosp: 10,  sec: 0,   goods: ["bugday", "un", "ekmek"],               priceMult: 0.7, months: [3, 5] },
  eskiya:   { id: "eskiya",   icon: "crossed-swords", prosp: -6,  sec: -22, goods: [],                                       priceMult: 1.0, months: [3, 6] },
  panayir:  { id: "panayir",  icon: "party", prosp: 8,   sec: 0,   goods: ["sarap", "bal", "peynir", "et"],         priceMult: 1.3, months: [2, 3] },
  yangin:   { id: "yangin",   icon: "flame", prosp: -14, sec: -5,  goods: ["kereste"],                              priceMult: 1.4, months: [3, 5] },
  veba:     { id: "veba",     icon: "skull", prosp: -16, sec: 0,   goods: ["sifa", "iksir"],                        priceMult: 1.6, months: [4, 7] },
  ticaret:  { id: "ticaret",  icon: "camel", prosp: 12,  sec: 0,   goods: ["sarap", "bal", "iksir", "sifa"],        priceMult: 0.75, months: [3, 5] },
  isyan:    { id: "isyan",    icon: "crossed-swords", prosp: -10, sec: -18, goods: [],                                       priceMult: 1.0,  months: [3, 5] },
};
const LOC_EVENT_LABEL: Record<string, string> = { kuraklik: "Kuraklık baş gösterdi", bereket: "Bereketli hasat", eskiya: "Eşkıya türedi", panayir: "Panayır kuruldu", yangin: "Yangın çıktı", veba: "Veba salgını", ticaret: "Ticaret patlaması", isyan: "Ayaklanma çıktı" };
// Bir şehirde aktif olayların toplam refah/güvenlik etkisi (mülk geliri, seyahat için).
export function cityFx(s: GameState, loc: string): { prosp: number; sec: number } {
  let prosp = 0, sec = 0;
  for (const e of s.locEvents || []) {
    if (e.loc !== loc || e.until <= s.turn) continue;
    const t = LOC_EVENT_TYPES[e.type]; if (t) { prosp += t.prosp; sec += t.sec; }
  }
  return { prosp, sec };
}
// Bir şehirdeki aktif olayların bir mala uyguladığı fiyat çarpanı.
function locPriceMult(s: GameState, loc: string, goodId: string): number {
  let m = 1;
  for (const e of s.locEvents || []) {
    if (e.loc !== loc || e.until <= s.turn) continue;
    const t = LOC_EVENT_TYPES[e.type]; if (t && t.goods.includes(goodId)) m *= t.priceMult;
  }
  return m;
}
// Bir şehirdeki aktif olay tiplerini döndür (UI için).
export function locEventsAt(s: GameState, loc: string): string[] {
  return (s.locEvents || []).filter((e) => e.loc === loc && e.until > s.turn).map((e) => e.type);
}
// Haftalık: eski olaylar söner, ara sıra yeni olay doğar (oyuncunun yeri + mülk şehirleri biraz daha olası).
function locEventTick(s: GameState) {
  let evs = (s.locEvents || []).filter((e) => e.until > s.turn);
  if (evs.length < 3 && Math.random() < 0.12) {
    const types = Object.keys(LOC_EVENT_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const pool = [s.player.location_name, ...(s.player.properties || []).map((p) => p.loc), rnd(LOCATIONS)].filter(Boolean);
    const loc = pool[Math.floor(Math.random() * pool.length)];
    if (loc && !evs.some((e) => e.loc === loc)) { // bir şehirde aynı anda tek olay
      const t = LOC_EVENT_TYPES[type];
      const dur = t.months[0] + Math.floor(Math.random() * (t.months[1] - t.months[0] + 1));
      evs.push({ id: Math.random().toString(36).slice(2, 10), loc, type, hafta: s.turn, until: s.turn + dur });
      push(s, "dunya_olayi", `${loc}: ${LOC_EVENT_LABEL[type]} (${LOC_EVENT_TYPES[type].icon})`, "makro", true, { k: "lev." + type, p: [{ pl: loc }] });
    }
  }
  s.locEvents = evs.slice(-4);
}
// Oyuncu olaylı bir şehirdeyse doğrudan hisseder (veba→sağlık, panayır→kazanç, kuraklık→açlık, eşkıya→korku).
function locEventPersonal(s: GameState) {
  for (const e of s.locEvents || []) {
    if (e.loc !== s.player.location_name || e.until <= s.turn) continue;
    if (e.type === "veba" && chance(0.15)) { const h = 6 + Math.floor(Math.random() * 8); s.player.health = Math.max(1, s.player.health - h); push(s, "saglik", `${e.loc}'deki veba sana da bulaştı; halsiz düştün (−${h} sağlık).`, "kişisel", false, { k: "lev.veba.hit", p: [h] }); }
    else if (e.type === "panayir" && chance(0.30)) { const g = 5 + Math.floor(Math.random() * 10); s.player.money += g; s.player.reputation = Math.min(100, s.player.reputation + 1); push(s, "gunluk", `${e.loc} panayırında eğlendin, biraz da kazandın (+${g} akçe).`, "kişisel", false, { k: "lev.panayir.gain", p: [g] }); }
    else if (e.type === "kuraklik" && chance(0.25)) { s.player.hunger = Math.max(0, s.player.hunger - 6); push(s, "gunluk", `${e.loc}'de kuraklık; karın doyurmak zorlaştı.`, "kişisel", false, { k: "lev.kuraklik.hit" }); }
    else if (e.type === "yangin" && chance(0.10)) { s.player.fear = Math.min(100, s.player.fear + 3); push(s, "gunluk", `${e.loc}'deki yangın korku saldı.`, "kişisel", false, { k: "lev.yangin.hit" }); }
  }
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
// Beylikler — 5 sancak; her birinin merkezi (şehir/kale) ve rengi.
export const BEYLIKS: { id: string; name: string; tone: string }[] = [
  { id: "demirhan",   name: "Demirhan Beyliği",   tone: "#E0922E" },
  { id: "yenisehir",  name: "Yenişehir Sancağı",  tone: "#6FA0C0" },
  { id: "gumushisar", name: "Gümüşhisar Beyliği", tone: "#9C7BC4" },
  { id: "aksehir",    name: "Akşehir Sancağı",    tone: "#7FA66A" },
  { id: "karahisar",  name: "Karahisar Beyliği",  tone: "#C56B5C" },
];
// ── Dünya üretimi (Vercel world_gen.py ölçeği): 5 beylik · 8 şehir · 12 kale · 22 köy = 42 yerleşim ──
// Mevcut 12 yerleşim KORUNUR (kayıt/çeviri/harita sürekliliği); üstüne deterministik olarak yenileri eklenir.
const BASE_PLACES: Place[] = [
  { name: "Üzümlü", kind: "köy", region: "demirhan" }, { name: "Akpınar", kind: "köy", region: "demirhan" }, { name: "Demirhan", kind: "kale", region: "demirhan" },
  { name: "Yenişehir", kind: "şehir", region: "yenisehir" }, { name: "Karaağaç", kind: "köy", region: "yenisehir" }, { name: "Söğütlü", kind: "köy", region: "yenisehir" },
  { name: "Bozkır", kind: "kale", region: "gumushisar" }, { name: "Gümüşhisar", kind: "şehir", region: "gumushisar" }, { name: "Çakıllı", kind: "köy", region: "gumushisar" },
  { name: "Kavaklı", kind: "köy", region: "aksehir" }, { name: "Sarıkaya", kind: "kale", region: "aksehir" }, { name: "Akşehir", kind: "şehir", region: "aksehir" },
];
// Yeni yerleşim ad havuzları (Anadolu toponimleri) — tür bazlı, mevcut adlarla çakışmaz.
const NEW_CITY = ["Develi", "Konuralp", "Alaşehir", "Beyşehir", "Eğirdir", "Honaz", "Ilgın"];
const NEW_CASTLE = ["Akkale", "Karakale", "Şahinkaya", "Kızılhisar", "Gökçekale", "Boğazkale", "Aslanhisar", "Demirkapı", "Yarhisar", "Uçhisar", "Kovalı", "Taşköprü"];
const NEW_VILLAGE = ["Çamlıca", "Gökçeören", "Yeşilköy", "Taşpınar", "Karadere", "Akören", "Yaylabaşı", "Çukurca", "Gümüşköy", "Derbent", "Sazak", "Kuyucak", "Ballıca", "Çiğdemli", "Ovacık", "Pınarbaşı", "Gölcük", "Çayırlı"];
// Her beyliğe eklenecek (şehir, kale, köy) sayısı — toplamlar hedefe (8/12/22) tamamlanır.
const EXTRA_DIST: Record<string, [number, number, number]> = {
  demirhan:   [2, 2, 3], // mevcut 0ş/1k/2v → 2ş/3k/5v
  yenisehir:  [1, 2, 3], // 1/0/2 → 2/2/5
  gumushisar: [0, 2, 3], // 1/1/1 → 1/3/4
  aksehir:    [0, 1, 3], // 1/1/1 → 1/2/4
  karahisar:  [2, 2, 4], // 0/0/0 → 2/2/4
};
function buildPlaces(): Place[] {
  const out: Place[] = [...BASE_PLACES];
  let ci = 0, ki = 0, vi = 0;
  for (const b of BEYLIKS) {
    const d = EXTRA_DIST[b.id]; if (!d) continue;
    for (let i = 0; i < d[0]; i++) out.push({ name: NEW_CITY[ci++], kind: "şehir", region: b.id });
    for (let i = 0; i < d[1]; i++) out.push({ name: NEW_CASTLE[ki++], kind: "kale", region: b.id });
    for (let i = 0; i < d[2]; i++) out.push({ name: NEW_VILLAGE[vi++], kind: "köy", region: b.id });
  }
  return out;
}
export const PLACES: Place[] = buildPlaces();
export const LOCATIONS = PLACES.map((p) => p.name);
// O(1) ada-göre yer tablosu: regionOf/placeKind sıcak yolda milyonlarca kez çağrılıyor (PLACES.find O(n)'di → 42 yerle ağırlaştı).
const _placeByName: Record<string, Place> = (() => { const m: Record<string, Place> = {}; for (const p of PLACES) m[p.name] = p; return m; })();
export function regionOf(name: string): string { return _placeByName[name]?.region || "demirhan"; }
export function beylikOf(name: string): { id: string; name: string; tone: string } { const r = regionOf(name); return BEYLIKS.find((b) => b.id === r) || BEYLIKS[0]; }
export function beylikName(id: string): string { return BEYLIKS.find((b) => b.id === id)?.name || id; }
export function sameBeylik(a: string, b: string): boolean { return regionOf(a) === regionOf(b); }
export function placeKind(name: string): string { return _placeByName[name]?.kind || "köy"; }

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
export function npcsOf(s: GameState, lang: Lang = "tr"): NPC[] { return rosterAt(s, s.player.location_name, lang); }

export function newGame(first: string, surname: string, gender: "erkek" | "kadın"): GameState {
  const birthplace = rnd(LOCATIONS);
  return {
    turn: 0, seed: Math.floor(Math.random() * 1e9), world: { ready: true, inflation: 1 },
    relationships: {}, dynasty: [], npc_state: {}, story: { active: null, completed: [], tension: 0 }, wars: [], caravan: null, econ: 1,
    player: {
      name: surname ? `${first} ${surname}` : first, surname, gender, base_age: 7, age: 7,
      money: 12, profession: "işsiz", health: 100, hunger: 100,
      reputation: 0, honor: 0, fear: 0, fame: 0,
      stats: { strength: 1, intelligence: 1, charisma: 1, stamina: 2 },
      stat_points: 0, dead: false, location_name: birthplace, home_name: birthplace,
      married: false, spouse_name: null, children: [], mother: rnd(SPOUSE_K), father: rnd(SPOUSE_E), mother_seed: Math.floor(Math.random() * 1e9), father_seed: Math.floor(Math.random() * 1e9), inventory: { ekmek: 2 },
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
function push(s: GameState, type: string, text: string, scope: "kişisel" | "makro" = "kişisel", landmark = false, loc?: { k: string; p?: EvtParam[] }) {
  s.history.push({ day: s.turn, type, text, scope, landmark, k: loc?.k, p: loc?.p });
}
function clone(s: GameState): GameState { return JSON.parse(JSON.stringify(s)); }
function die(s: GameState, text: string, loc?: { k: string; p?: EvtParam[] }) { s.player.dead = true; push(s, "ölüm", text, "kişisel", true, loc); }

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
  if (p.age === 13 && p.profession === "işsiz") { p.profession = rnd(PROFS); p.stat_points += 3; push(s, "meslek_edinme", `Reşit oldun. ${cap(p.profession)} olarak hayata atıldın — dünya sana açıldı.`, "kişisel", true, { k: "evj.profGain", p: [{ pr: p.profession }] }); shapeChildhood(s); }
  // ── Kader anları: hayatın belirli dönümlerinde kimliğe ayna tutan sahneler ──
  if (!p.fates) p.fates = [];
  const fate = (id: string) => { if (!p.fates!.includes(id)) { p.fates!.push(id); return true; } return false; };
  const whoAmIId = (): string => {
    const nm = p.nam || ({} as Nam);
    if (p.crowned) return "crowned";
    if (p.fear >= 50 || (nm.zalim || 0) >= 50) return "fear";
    if (p.honor >= 50 || (nm.mert || 0) >= 50) return "honor";
    if ((nm.comert || 0) >= 50) return "comert";
    if ((nm.dindar || 0) >= 50) return "dindar";
    if (p.fame >= 50) return "fame";
    if (p.reputation >= 40) return "rep";
    return "plain";
  };
  const WHOAMI_TR: Record<string, string> = { crowned: "bir hükümdar", fear: "korkulan biri", honor: "şerefli biri", comert: "eli açık biri", dindar: "dindar biri", fame: "tanınan biri", rep: "saygın biri", plain: "sıradan biri" };
  if (p.age >= 40 && fate("40")) { const w = whoAmIId(); push(s, "kader", `Kırkına vardın. Aynaya baktığında ${WHOAMI_TR[w]} görüyorsun. Ömrün yarılandı; bundan sonrası bir miras meselesi.`, "kişisel", true, { k: "evj.fate40", p: [{ wai: w }] }); }
  if (p.age >= 60 && fate("60")) { const w = whoAmIId(); push(s, "kader", `Altmışını devirdin. Saçlar ağardı, geçmişin gölgesi uzadı. Ömrün akşamında ${WHOAMI_TR[w]} olarak anılıyorsun — geriye ne bırakacaksın?`, "kişisel", true, { k: "evj.fate60", p: [{ wai: w }] }); }
  if (p.age >= 70 && fate("70")) { const w = whoAmIId(); p.reputation = Math.min(100, p.reputation + 6); push(s, "kader", `Yetmişine vardın — az kimseye nasip olan bir ömür. Torunlar dizinin dibinde, diyar seni ${WHOAMI_TR[w]} olarak biliyor; yaşın sana hürmet getiriyor.`, "kişisel", true, { k: "evj.fate70", p: [{ wai: w }] }); }
  if (p.age >= 80 && fate("80")) { const w = whoAmIId(); p.fame = Math.min(100, p.fame + 8); push(s, "kader", `Sekseni devirdin. Çağın canlı tanığısın; senin gördüklerini gören kalmadı. Adın ${WHOAMI_TR[w]} olmanın ötesinde, bir efsane gibi anılıyor.`, "kişisel", true, { k: "evj.fate80", p: [{ wai: w }] }); }
  if (p.age < 13 && chance(0.25)) { p.stat_points += 1; push(s, "cocukluk", "Yeni bir şeyler öğrendin (özellik puanı kazandın).", "kişisel", false, { k: "ev.cocukluk" }); }
  // ── Çocukluk dönüm anıları: 8/10/12 yaşında bir kez tetiklenen, ize bırakan anlar (bazıları yoldaşı anar) ──
  if (p.age >= 8 && p.age < 13 && fate("child8")) {
    addStatXp(s, "intelligence", 8); p.health = Math.min(100, p.health + 4);
    const cf = p.child_friend;
    if (cf) push(s, "cocukluk", "Yoldaşınla ilk kez şehrin surlarına tırmandınız; diyar gözünüzde büyüdü.", "kişisel", true, { k: "evj.child8f", p: [{ fn: [cf.seed, cf.gender] }] });
    else push(s, "cocukluk", "İlk kez şehrin surlarına tırmandın; diyar gözünde büyüdü.", "kişisel", true, { k: "evj.child8" });
  }
  if (p.age >= 10 && p.age < 13 && fate("child10")) {
    gainSkill(s, "social", 12); gainSkill(s, "crafting", 8);
    push(s, "cocukluk", "Çarşıda bir usta elinin marifetini izledin; parmakların kaşındı, aklın açıldı.", "kişisel", true, { k: "evj.child10" });
  }
  if (p.age >= 12 && p.age < 13 && fate("child12")) {
    p.stat_points += 1;
    push(s, "cocukluk", "Çocukluğun eşiğinde durdun; yarın büyüyeceksin, bugün son bir kez doyasıya oynadın (özellik puanı).", "kişisel", true, { k: "evj.child12" });
  }
  if (p.dead) return;
  // Görücü usulü evlilik — yalnızca FALLBACK: oyuncu birini kur yapıyorsa (ilişki ≥50) araya girmez, geç başlar, seyrektir.
  const courting = Object.values(s.relationships || {}).some((v) => (v as number) >= 50);
  if (!p.married && !courting && p.age >= 24 && p.age < 55 && chance(0.035 + p.fame / 2000)) { const name = p.gender === "erkek" ? rnd(SPOUSE_K) : rnd(SPOUSE_E); p.married = true; p.spouse_name = name; p.spouse_seed = Math.floor(Math.random() * 1e9); p.reputation += 5; push(s, "evlilik", `Ailelerin görüşmesiyle ${name} ile evlendin — yeni bir ocak kuruldu.`, "kişisel", true, { k: "evj.marry", p: [{ fn: [p.spouse_seed, p.gender === "erkek" ? "kadın" : "erkek"] }] }); }
  if (p.married && p.age >= 18 && p.age < 50 && p.children.length < 5 && chance(0.07)) { const c = rnd(CHILD); p.children.push(c); push(s, "doğum", `Bir evladın dünyaya geldi: ${c}.`, "kişisel", true, { k: "evj.childBorn", p: [c] }); }
  // ── Ömürlük çocukluk dostu: reşitlikte yanında kalan yoldaş, hayat boyu ara sıra ortaya çıkar (sadakat) ──
  if (!p.dead && p.age >= 16 && p.child_friend && (s.relationships[p.child_friend.id] || 0) > 0 && chance(0.025)) {
    const cf = p.child_friend;
    const alive = !s.world.npcBorn || (s.world.npcBorn.find((n) => n.id === cf.id)?.alive !== false);
    if (alive) {
      const r = Math.random();
      if (r < 0.4) { p.health = Math.min(100, p.health + 4); s.relationships[cf.id] = Math.min(100, (s.relationships[cf.id] || 0) + 2); push(s, "gunluk", "Çocukluk dostun çıkageldi; eski günleri yâd ettiniz, içine bir ferahlık doldu.", "kişisel", false, { k: "evj.oldFriendVisit", p: [{ fn: [cf.seed, cf.gender] }] }); }
      else if ((p.money < 30 || (p.debt || 0) > 0) && r < 0.7) { const help = 20 + Math.floor(Math.random() * 30); p.money += help; push(s, "gunluk", "Çocukluk dostun darda olduğunu duydu; sessizce kesene biraz akçe bıraktı.", "kişisel", false, { k: "evj.oldFriendHelp", p: [{ fn: [cf.seed, cf.gender] }, help] }); }
      else { p.reputation = Math.min(100, p.reputation + 2); push(s, "gunluk", "Çocukluk dostun seni mecliste övdü; sözü itibarına itibar kattı.", "kişisel", false, { k: "evj.oldFriendVouch", p: [{ fn: [cf.seed, cf.gender] }] }); }
    }
  }
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
  if (chance(0.05)) { const g = 5 + Math.floor(Math.random() * 20); p.money += g; push(s, "gunluk", `Yolda ${g} akçe buldun.`, "kişisel", false, { k: "evj.foundCoin", p: [g] }); }
  if (chance(0.04)) { p.health = Math.max(0, p.health - 12); push(s, "hastalik", "Hastalandın, birkaç gün yatakta kaldın.", "kişisel", false, { k: "evj.sick" }); }
  // ── Nemesis dünyada yaşıyor: musallat olur; yoksa derin bir husumet amansız hasma dönüşebilir ──
  if (!p.dead && p.age >= 14 && s.story) {
    if (s.story.nemesis && chance(0.10)) {
      const n = s.story.nemesis;
      const nemIdx = Math.floor(Math.random() * 4);
      let txt: string; let nemP: EvtParam[];
      if (nemIdx === 0) { p.reputation = Math.max(-100, p.reputation - 4); txt = `${n.name} arkandan kuyunu kazıyor; itibarın sarsıldı.`; nemP = [n.name]; }
      else if (nemIdx === 1) { const loss = Math.min(p.money, 8); p.money -= loss; txt = `${n.name}'ın adamları malına dokundu (−${loss} akçe).`; nemP = [n.name, loss]; }
      else if (nemIdx === 2) { p.health = Math.max(1, p.health - 5); txt = `${n.name} pusu kurdu; sıyrıklarla kurtuldun.`; nemP = [n.name]; }
      else { txt = `${n.name} bir tehdit daha yolladı; hesap görülmeyi bekliyor.`; nemP = [n.name]; }
      s.story.tension = Math.min(100, s.story.tension + 3);
      push(s, "nemesis", txt, "kişisel", false, { k: "evj.nem" + nemIdx, p: nemP });
    } else if (!s.story.nemesis && chance(0.03)) {
      const rivals = Object.entries(s.relationships || {}).filter(([, v]) => (v as number) <= -55);
      if (rivals.length) {
        const rid = rnd(rivals)[0];
        const npc = npcsOf(s).find((x) => x.id === rid);
        if (npc) { s.story.nemesis = { name: npc.name, power: 14 + Math.floor(Math.random() * 10) }; push(s, "nemesis", `${npc.name} ile husumetiniz kan davasına döndü; artık amansız bir hasımsın.`, "kişisel", true, { k: "evj.nemFeud", p: [npc.name] }); }
      }
    }
  }
  // Yaşlanma + ölümlülük — geniş dağılım: bazıları genç hastalık/kazaya, sağlıklı & bakımlı olanlar 70-80'e ulaşabilir.
  // Sağlık aşınması daha yumuşak (ayda değil seyrek) → servetle hekim tutan uzun yaşar (gerçek hayat filtresi).
  if (p.age >= 52 && chance(0.5)) p.health = Math.max(0, p.health - Math.floor((p.age - 48) / 7));
  const accident = (p.age >= 25 ? 0.0008 : 0) + (p.health < 25 ? 0.012 : 0);
  const frail = p.health < 40 ? 0.008 : 0;
  const aging = p.age >= 62 ? (p.age - 62) * 0.0045 + frail : frail;
  if (chance(accident + aging)) {
    const old = p.age >= 60;
    die(s, old ? `${p.name}, ${p.age} yaşında huzur içinde göçtü.` : `${p.name}, ${p.age} yaşında ${p.health < 25 ? "amansız bir hastalığa" : "ecel"} yenik düştü.`, old ? { k: "evj.dieOld", p: [p.name, p.age] } : (p.health < 25 ? { k: "evj.dieIll", p: [p.name, p.age] } : { k: "evj.dieAge", p: [p.name, p.age] }));
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
    snapshotPrices(s); // ayrılan ayın pazar fiyatlarını hafızaya al (R3.3 'geçen fiyat')
    s.turn += 1; const cal = currentCalendar(s.turn);
    s.player.age = playerAge(s.player.base_age, s.turn);
    // NPC anıları haftalık söner (travmalar kalıcı); anlamsız geçici girdiler budanır (perf + temizlik).
    if (s.npc_state) for (const id in s.npc_state) {
      const ns = s.npc_state[id];
      if (ns.anilar && ns.anilar.length) ns.anilar = decayMemories(ns.anilar);
      if ((!ns.anilar || !ns.anilar.length) && Math.abs(s.relationships[id] || 0) < 5 && Math.abs(ns.mood) < 5 && (!ns.memories || !ns.memories.length)) delete s.npc_state[id];
    }
    gossipTick(s); // tanıklı skandallar → oyuncu söylentileri (haftalık)
    seedTick(s);   // geçmişin tohumları filizlenir (haftalık en çok 1)
    // Süregelen evlat eğitimi: haftalık masraf düşer, birikim vâris olunca bonusa döner (Vercel child_investment_tick).
    if (s.player.child_edu) {
      for (const cn in s.player.child_edu) {
        if (!s.player.children.includes(cn)) { delete s.player.child_edu[cn]; continue; } // ölen/ayrılan çocuğu temizle
        const tr = EDU_TRACKS.find((x) => x.id === s.player.child_edu![cn].track);
        if (!tr || s.player.money < tr.weekly) continue; // parasızken eğitim duraklar (birikim de durur)
        s.player.money -= tr.weekly;
        s.player.child_edu![cn].weeks += 1;
      }
    }
    // Çalışma gücü: her ay yenilenir (ders + kulüp meşki bundan harcanır).
    s.player.study_energy = maxStudyEnergy(s.player.age);
    // Mektep kulübü: okul çağında (7-17) her ay sessiz pasif beceri kazanımı (Vercel öğrenci topluluğu).
    if (s.player.club && s.player.age >= 7 && s.player.age < 18) { const cl = CLUBS.find((c) => c.id === s.player.club); if (cl) gainSkill(s, cl.skill, 2); }
    // Mezuniyet: 18'inde kulüpten ayrılırken, yılların kulüp itibarı kalıcı bir hüner bırakır.
    else if (s.player.club && s.player.age >= 18) {
      const p2 = s.player; const cl = CLUBS.find((c) => c.id === p2.club);
      if (cl) { gainSkill(s, cl.skill, 60 + (p2.club_standing || 0) * 6); p2.club_grad = p2.club;
        push(s, "mektep", `${CLUB_TR[p2.club!] || "Kulüp"} kulübünden mezun oldun; yılların emeği kalıcı bir hüner bıraktı.`, "kişisel", true, { k: "club.grad." + p2.club }); }
      p2.club = undefined;
    }
    const child = s.player.age < 13;
    // Çocuğu ailesi besler: açlık daha yavaş düşer ve dipte aile karnını doyurur.
    const seasonMult = ({ "İlkbahar": 1.0, "Yaz": 1.1, "Sonbahar": 0.9, "Kış": 1.3 } as Record<string, number>)[cal.season] ?? 1; // 4 mevsim eğrisi (Vercel season_hunger_mult)
    const stamReduce = child ? 0 : Math.min(0.3, effStat(s.player, "stamina") * 0.03); // dayanıklılık açlığı yavaşlatır (Vercel stamina_hunger_reduction)
    const drop = Math.max(child ? 2 : 3, Math.round((child ? 4 : 8) * seasonMult * (1 - stamReduce)));
    s.player.hunger = Math.max(0, s.player.hunger - drop);
    if (child && s.player.hunger < 30) s.player.hunger = Math.min(100, s.player.hunger + 20); // anne-baba sofrası
    if (s.player.hunger < 20 && !child) s.player.health = Math.max(0, s.player.health - 6);
    else if (s.player.health < 100) s.player.health = Math.min(100, s.player.health + 2);
    if (s.player.faction === "sifaci" && s.player.health < 100) s.player.health = Math.min(100, s.player.health + 2);
    if (s.player.health <= 0 && !child) { die(s, `${s.player.name} açlık ve hastalığa yenik düştü.`, { k: "evj.dieStarve", p: [s.player.name] }); break; }
    // Yaralar zamanla iyileşir (kalıcı olanlar kalır)
    if (s.player.injuries?.length) {
      for (const inj of s.player.injuries) if (!inj.permanent) inj.weeks_left -= 1;
      const healed = s.player.injuries.filter((inj) => !inj.permanent && inj.weeks_left <= 0);
      if (healed.length && i === n - 1) push(s, "iyilesme", `Yaraların iyileşti: ${healed.map((h) => h.label).join(", ")}.`, "kişisel", false, { k: "evj.heal", p: [{ wds: healed.map((h) => Math.max(0, INJURY_POOL.findIndex((w) => w.label === h.label))) }] });
      s.player.injuries = s.player.injuries.filter((inj) => inj.permanent || inj.weeks_left > 0);
    }
    // Mülk pasif geliri — KONUMA (şehir refahı) + KONDİSYONA göre; düşük güvenlikte yağma + aşınma
    let pmult = 1;
    if (hasPerk(s.player, "tuccar_prensi")) pmult += 0.3;
    if (hasPerk(s.player, "tamirci")) pmult += 0.15;
    let inc = 0;
    let wages = 0; // işçi ücretleri (ekonomiden çıkan; pmult'tan bağımsız)
    const produced: Record<string, number> = {}; // işçilerin ürettiği gerçek hammadde (üretim zinciri)
    const cityCache: Record<string, { prosperity: number; security: number }> = {};
    const cityOf = (loc: string) => cityCache[loc] || (cityCache[loc] = cityInfo(loc, placeKind(loc)));
    for (const pr of s.player.properties) {
      const base = PROPERTY_TYPES[pr.type]?.income || 0;
      const ci = cityOf(pr.loc || s.player.location_name);
      const fx = cityFx(s, pr.loc || s.player.location_name); // aktif dünya olayları (kuraklık/yangın/panayır...)
      const effProsp = Math.max(5, ci.prosperity + fx.prosp);
      const effSec = Math.max(0, ci.security + fx.sec);
      const condProspLevel = (0.75 + effProsp / 200) * (pr.cond / 100) * (1 + ((pr.level || 1) - 1) * 0.5);
      // Tipe özgü davranış (Vercel property_system per-tip tick ruhu): tarla mevsimlik, dükkân refaha duyarlı.
      const typeMult = pr.type === "tarla" ? ({ "İlkbahar": 1.0, "Yaz": 1.15, "Sonbahar": 1.7, "Kış": 0.25 }[cal.season] ?? 1)
        : pr.type === "dukkan" ? (1 + effProsp / 300)
        : pr.type === "han" ? (0.6 + (effProsp + effSec) / 250)  // han: yolcu trafiği refah+güvenlikle artar
        : pr.type === "ev" ? 0.7 : 1;
      inc += base * condProspLevel * typeMult;
      if (pr.type === "ev" && (pr.level || 1) >= 2 && chance(0.04)) s.player.reputation = Math.min(100, s.player.reputation + 1); // köklü ev → itibar damlası
      // İşçi ekonomisi: çalışan NPC'ler üretimi artırır ama ücret ister.
      const w = propWorkerStats(s, pr, base, condProspLevel);
      inc += w.gross; wages += w.wage;
      // Mülk defteri: yıllık net (gelir − ücret) geçmişi (Vercel property ledger; şeffaflık).
      if (i === n - 1 && s.turn > 0 && s.turn % 12 === 0) { pr.ledger = pr.ledger || []; pr.ledger.push({ y: Math.floor(s.turn / 12), net: Math.round((base * condProspLevel * typeMult + w.gross - w.wage) * pmult) }); if (pr.ledger.length > 6) pr.ledger = pr.ledger.slice(-6); }
      const y = propYield(s, pr); if (y) { const sm = pr.type === "tarla" ? ({ "İlkbahar": 0.6, "Yaz": 1.0, "Sonbahar": 1.8, "Kış": 0.2 }[cal.season] ?? 1) : 1; const q = Math.round(y.qty * sm); if (q > 0) produced[y.good] = (produced[y.good] || 0) + q; } // işçi emeği → gerçek hammadde (tarla mevsimlik)
      if (pr.cond > 40 && chance(0.2)) pr.cond -= 1;                                   // zamanla aşınma
      if (effSec < 30 && chance(0.02 + (effSec < 10 ? 0.03 : 0))) {                    // düşük güvenlikte (eşkıya/yangın olayı kötüleştirir) yağma
        pr.cond = Math.max(20, pr.cond - 15);
        if (i === n - 1) push(s, "mülk_yagma", `${PROPERTY_TYPES[pr.type]?.name || "Mülkün"} (${pr.loc}) yağmaya uğradı; onarım gerek.`, "kişisel", false, { k: "evj.propRaid", p: [{ pt2: pr.type }, { pl: pr.loc }] });
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
    // Enflasyon nominal gelirleri de yükseltir (gerçek ekonomi): üretken servet değerini korur, biriken nakit erir.
    const inf = inflationFactor(s);
    inc = Math.round(inc * inf);
    wages = wages * inf;
    const wageCost = Math.round(wages);
    if (wageCost > 0) s.player.money -= wageCost; // işçi maaşları (her hâlükârda ödenir)
    if (inc > 0) { s.player.money += inc; if (i === n - 1) push(s, "mülk_hasat", wageCost > 0 ? `Mülk ve yerleşimlerinden ${inc} akçe gelir geldi (${wageCost} akçe işçi ücreti ödendi).` : `Mülk ve yerleşimlerinden ${inc} akçe gelir geldi.`, "kişisel", false, wageCost > 0 ? { k: "evj.propHarvestW", p: [inc, wageCost] } : { k: "evj.propHarvest", p: [inc] }); }
    // Üretim zinciri: işçilerin ürettiği hammadde envantere girer (tarla→buğday, değirmen→un) → zanaata/ticarete besler
    { const goods = Object.keys(produced).filter((g) => produced[g] > 0);
      if (goods.length) {
        for (const g of goods) s.player.inventory[g] = (s.player.inventory[g] || 0) + produced[g];
        if (i === n - 1) { const g0 = goods[0]; push(s, "mülk_hasat", `Mülklerinde işçilerin ${produced[g0]} ${ITEMS[g0]?.name || g0} üretti.`, "kişisel", false, { k: "evj.propProduce", p: [produced[g0], { i: g0 }] }); }
      } }
    // Aylık geçim gideri (yaş + servetle hafifçe artar) — para birikimini dengeler
    if (s.player.age >= 13 && s.player.money > 0) {
      const upkeep = Math.min(s.player.money, lifestyleUpkeep(s));
      s.player.money -= upkeep;
    }
    // Tefeci faizi: borç her ay büyür. Teminat eşiğini aşarsa sarraf alacağına karşılık mülke/nakde el koyar.
    if ((s.player.debt || 0) > 0) {
      s.player.debt = Math.round((s.player.debt || 0) * (1 + loanRate(s)));
      const ceiling = Math.round(creditLimit(s) * 1.6) + 500; // borç bunu aşınca tefeci harekete geçer
      if ((s.player.debt || 0) > ceiling) {
        const props = s.player.properties;
        if (props.length) { // önce en ucuz mülke el koy (teminat satışı)
          let idx = 0, lo = Infinity;
          props.forEach((pr, k) => { const v = PROPERTY_TYPES[pr.type]?.cost || 0; if (v < lo) { lo = v; idx = k; } });
          const seized = props[idx];
          const credit = Math.round((PROPERTY_TYPES[seized.type]?.cost || 0) * inflationFactor(s) * 0.6);
          props.splice(idx, 1);
          s.player.debt = Math.max(0, (s.player.debt || 0) - credit);
          s.player.reputation = Math.max(-100, s.player.reputation - 6);
          push(s, "mülk", `Borcunu ödeyemedin: sarraf ${PROPERTY_TYPES[seized.type]?.name || "mülküne"} (${seized.loc}) el koydu; itibarın sarsıldı. Kalan borç ${s.player.debt} akçe.`, "kişisel", true, { k: "evj.seizeProp", p: [{ pt2: seized.type }, { pl: seized.loc }, s.player.debt] });
        } else { // mülk yok: nakdin bir kısmını zorla alır + itibar
          const grab = Math.round(Math.min(s.player.money, (s.player.debt || 0) * 0.3));
          s.player.money = Math.max(0, s.player.money - grab);
          s.player.debt = Math.max(0, (s.player.debt || 0) - grab);
          s.player.reputation = Math.max(-100, s.player.reputation - 5);
          push(s, "ticaret", `Tefecinin adamları kapına dayandı; ${grab} akçene zorla el koydular, itibarın zedelendi.`, "kişisel", true, { k: "evj.seizeCash", p: [grab] });
        }
        if ((s.player.debt || 0) <= 0) { s.player.debt = 0; s.player.loan_turn = undefined; }
      }
    }
    push(s, s.player.age < 13 ? "cocukluk" : "gunluk", monthlyFlavor(s, cal));
    rollLifeEvents(s, cal);
    tickFactions(s, i === n - 1);
    tickDynasties(s, i === n - 1);
    tickWars(s, i === n - 1);
    tickCaravan(s);
    tickEconomy(s, i === n - 1);
    if (i === n - 1 && !s.player.dead && chance(0.16)) worldNews(s);  // diyarın diline düşenler
    if (i === n - 1) tipsTick(s); // eyleme dönük duyumlar (piyasa ipucu / fraksiyon istihbaratı)
    if (i === n - 1) { locEventTick(s); locEventPersonal(s); } // tipli lokasyon olayları (kuraklık/panayır/veba) + oradaysan hisset
    if (i === n - 1) factionAITick(s); // fraksiyonlar dünyada görünür eylemler yapar (bağış/sabotaj/nüfuz/suikast)
    if (i === n - 1) npcLifeTick(s); // yaşayan dünya: NPC ölüm/yeni nesil + evlilik/doğum (yılda bir)
    if (i === n - 1) claimAchievements(s); // ay sonunda yeni başarımları ödüllendir
    if (i === n - 1) claimFamilyQuests(s); // ay sonunda tamamlanan aile/yaşam görevlerini ödüllendir
    const inBreath = (s.story?.breath || 0) > 0; // doruk sonrası sakin dönem
    if (s.story && !inBreath) s.story.tension = Math.min(100, s.story.tension + 1); // gerilim zamanla birikir (nefeste durur)
    // Durgunluk dedektörü (Vercel story_director "Nefes Kuralı" portu): sessiz aylar birikince
    // dünya kendini hatırlatır — gerilim ve proaktif hikâye şansı tırmanır.
    if (s.story && i === n - 1) {
      const hadLandmark = s.history.some((e) => e.day === s.turn && e.landmark);
      s.story.lull = hadLandmark ? 0 : (s.story.lull || 0) + 1;
      if (!inBreath && (s.story.lull || 0) >= 5) s.story.tension = Math.min(100, s.story.tension + 2); // uzayan sessizlik gerilimi körükler
      directorTick(s); // doruk üretimi + nefes kuralı (gerilim 80+ → tek büyük an)
      epochTick(s);    // çağ olayları (her ~60-90 turda kalıcı dünya kırılması)
      governorTick(s); // valilik meşruiyeti + isyan/azil (yalnız vali ise)
    }
    // Proaktif hikâye: dünya ara sıra kendiliğinden bir yay açar (gerilim + durgunluk arttıkça daha olası; nefes/dorukta bastırılır).
    if (s.story && !s.story.active && (s.story.breath || 0) === 0 && i === n - 1 && !s.player.dead && s.player.age >= 14) {
      const avail = availableArcs(s.player, s.story.completed, s.story.tension, null);
      const lullBoost = Math.max(0, (s.story.lull || 0) - 4) * 0.04;
      if (avail.length && chance(0.09 + s.story.tension / 500 + lullBoost)) {
        const a = rnd(avail);
        s.story.active = { id: a.id, stage: a.start };
        s.story.tension = Math.max(0, s.story.tension - 4); s.story.lull = 0;
        push(s, "hikaye_basladi", `Bir hikâye kapını çaldı: "${a.title}". (Hikâyelerim'den sürdür.)`, "kişisel", true, { k: "evj.arcKnock", p: [a.title] });
      } else if ((s.story.lull || 0) >= 4 && chance(0.35)) { sparkCard(s); } // durgunlukta kıvılcım kartı (Vercel _draw_spark)
    }
    // İlk aylarda yeni oyuncuya garantili olumlu an (tempo: önce kazandır)
    if (s.turn <= 3 && !s.player.dead && i === n - 1) {
      const g = 6 + Math.floor(Math.random() * 8); s.player.money += g;
      const NBR = ["Komşun sıcak bir çorba ikram etti.", "Pazarda biri eline birkaç akçe sıkıştırdı.", "Anlatılan bir masal yüreğini ısıttı."];
      const ni = Math.floor(Math.random() * NBR.length);
      push(s, "gunluk", NBR[ni] + ` (+${g} akçe)`, "kişisel", false, { k: "evj.nbrGift", p: [{ sfx: "nbr." + ni }, g] });
    }
    // Cliffhanger: ayın sonunda ara sıra bir sonraki ayı tease et
    if (!s.player.dead && i === n - 1 && s.player.age >= 13 && chance(0.3)) {
      const FIS = [
        "Çarşıda bir fısıltı: önümüzdeki ay bir şeyler olacak gibi…",
        "Yolcular tuhaf haberler getiriyor; ay dönmeden öğrenirsin.",
        "İçine bir his düştü — bu ay bitmeden kapın çalınabilir.",
        "Ufukta toz bulutu; haberi yakında gelir.",
      ];
      const fi = Math.floor(Math.random() * FIS.length);
      push(s, "fisilti", FIS[fi], "kişisel", false, { k: "fis." + fi });
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
    // Rakip fraksiyon yoksa ve gerilim arttıysa, KARAKTERE UYGUN bir aday göz diker.
    // Müttefikler saldırmaz; iştahsız (şifacı gibi barışçıl) fraksiyonlar göz dikmez; düşmanlık iştahı katlar.
    if (!sn.contender && sn.tension > 40) {
      const holderAllies = factionTrait(sn.holder).allies;
      const weighted = ids
        .filter((id) => id !== sn.holder && !holderAllies.includes(id))
        .filter((id) => !onWarCooldown(s, sn.holder, id)) // yeni ateşkesteki loncalar göz dikmez
        .map((id) => { let w = factionTrait(id).aggression; if (factionStance(id, sn.holder) < 0) w *= 2.2; return { id, w }; })
        .filter((x) => x.w > 0.12); // barışçıl fraksiyonlar (şifacı) hak iddia etmez
      const total = weighted.reduce((a, x) => a + x.w, 0);
      if (total > 0 && Math.random() < 0.30 * Math.min(1, total)) {
        let r = Math.random() * total; let pick = weighted[0].id;
        for (const x of weighted) { r -= x.w; if (r <= 0) { pick = x.id; break; } }
        sn.contender = pick;
        if (announce) push(s, "ocak_savasi", `${factionById(sn.contender)?.name}, ${beylikName(sn.id)} üzerinde hak iddia ediyor.`, "makro", true, { k: "evj.warClaim", p: [{ fc: sn.contender! }, { bl: sn.id }] });
      }
    }
    // Gerilim dorukta + rakip var → savaş patlar (ateşkes yoksa).
    if (sn.tension >= 100 && sn.contender && onWarCooldown(s, sn.holder, sn.contender)) {
      sn.contender = null; sn.tension = 70; // ateşkes sürüyor: savaş ertelenir
    } else if (sn.tension >= 100 && sn.contender) {
      s.wars.push({ a: sn.holder, b: sn.contender, turnsLeft: 4 + Math.floor(Math.random() * 4), aScore: 0, bScore: 0, prize: sn.id });
      sn.tension = 55;
      if (announce) push(s, "ocak_savasi", `${factionById(sn.holder)?.name} ile ${factionById(sn.contender)?.name}, ${beylikName(sn.id)} için savaşa tutuştu!`, "makro", true, { k: "evj.warStart", p: [{ fc: sn.holder }, { fc: sn.contender! }, { bl: sn.id }] });
    } else if (!sn.contender) {
      sn.tension = Math.max(0, sn.tension - 2); // rakip yoksa gerilim yavaşça söner
    }
  }
  // Koalisyon (Vercel _check_coalition_trigger): bir lonca aşırı baskınsa (3+ sancak) zayıflar birleşip bir sancağına yüklenir.
  const counts: Record<string, number> = {};
  for (const sn of realm) counts[sn.holder] = (counts[sn.holder] || 0) + 1;
  const dominant = ids.find((id) => (counts[id] || 0) >= 3);
  if (dominant && Math.random() < 0.12) {
    const target = realm.find((sn) => sn.holder === dominant && !sn.contender && !s.wars.some((w) => w.prize === sn.id));
    const challenger = ids
      .filter((id) => id !== dominant && !factionTrait(dominant).allies.includes(id) && factionTrait(id).aggression > 0.12 && !onWarCooldown(s, dominant, id))
      .sort((a, b) => factionTrait(b).aggression - factionTrait(a).aggression)[0];
    if (target && challenger) {
      target.contender = challenger; target.tension = Math.max(target.tension, 92);
      if (announce) push(s, "ocak_savasi", `${factionById(dominant)?.name} fazla güçlendi; zayıf loncalar ${factionById(challenger)?.name} öncülüğünde koalisyon kurdu.`, "makro", true, { k: "fai.coalition", p: [{ fc: dominant }, { fc: challenger }] });
    }
  }
}
// Rakip hanedanların yaşayan durumu (yoksa tohumdan başlat).
export function ensureRivals(s: GameState): RivalHouse[] {
  if (!s.rivals) s.rivals = generateDynasties(s.seed);
  // Eski kayıt göçü: nameIdx yoksa TR addan türet (kültürel yerelleştirme için).
  for (const h of s.rivals) if (h.nameIdx == null) h.nameIdx = houseNameIdx(h.name);
  return s.rivals;
}
// Rakip hanedan tikİ (Vercel dynasties.py portu): güç mizaca göre sürüklenir + ara sıra hamle yaparlar.
function tickDynasties(s: GameState, announce: boolean) {
  const rivals = ensureRivals(s);
  const p = s.player;
  for (const h of rivals) {
    const drift = (h.trait === "ihtiraslı" ? 1 : 0) + Math.floor(Math.random() * 4) - 1;
    h.power = Math.max(20, Math.min(100, h.power + drift));
    // Oyuncuya tutum: yaşayan değer — oyuncunun nam/itibarına göre hedefe doğru sürüklenir (Vercel oyuncuya_tutum).
    const target = houseAttitude(p, h);
    h.tutum = Math.round(Math.max(-100, Math.min(100, (h.tutum ?? target) * 0.85 + target * 0.15)));
  }
  // Düşman hane sabotajı: tutumu çok düşük bir hane oyuncunun mülküne el uzatır (gerçek zarar).
  if (announce && p.properties.length) {
    const foes = rivals.filter((h) => (h.tutum ?? 0) <= -25);
    if (foes.length && Math.random() < 0.12) {
      const h = foes[Math.floor(Math.random() * foes.length)];
      const pr = p.properties[Math.floor(Math.random() * p.properties.length)];
      pr.cond = Math.max(15, pr.cond - 22);
      h.tutum = Math.max(-100, (h.tutum ?? 0) - 3);
      push(s, "hanedan_haber", `${h.name} adamları ${PROPERTY_TYPES[pr.type]?.name || "mülküne"} (${pr.loc}) zarar verdi; hesap büyüyor.`, "makro", true, { k: "evj.houseSabotage", p: [{ hn: h.nameIdx }, { pt2: pr.type }, { pl: pr.loc }] });
    }
  }
  // Dost hane teklifi: tutumu yüksek bir hane ittifak ya da evlilik önerir (oyuncu kabul/ret eder).
  if (announce) {
    const offers = s.dynastyOffers || [];
    const allied = s.allied_houses || [];
    const friends = rivals.filter((h) => (h.tutum ?? 0) >= 35 && !offers.some((o) => o.houseId === h.id) && !allied.includes(h.id));
    if (friends.length && Math.random() < 0.08) {
      const h = friends[Math.floor(Math.random() * friends.length)];
      const canMarry = !p.married && p.age >= 16 && p.age < 55;
      const type: "ittifak" | "evlilik" = canMarry && Math.random() < 0.45 ? "evlilik" : "ittifak";
      (s.dynastyOffers = offers).push({ id: "off_" + Math.random().toString(36).slice(2, 8), houseId: h.id, nameIdx: h.nameIdx, type });
      push(s, "hanedan_haber", type === "evlilik" ? `${h.name} hanedanı sana evlilik ittifakı teklif etti.` : `${h.name} hanedanı sana ittifak teklif etti.`, "makro", true, { k: type === "evlilik" ? "evj.houseMarryOffer" : "evj.houseAllyOffer", p: [{ hn: h.nameIdx }] });
    }
  }
  if (!announce || rivals.length < 2 || Math.random() >= 0.14) return;
  const h = rivals[Math.floor(Math.random() * rivals.length)];
  const other = rivals[(rivals.indexOf(h) + 1 + Math.floor(Math.random() * (rivals.length - 1))) % rivals.length];
  const roll = Math.random();
  if (h.trait === "ihtiraslı" || roll < 0.4) {
    h.power = Math.min(100, h.power + 4);
    push(s, "hanedan_haber", `${h.name} yeni bir kale ele geçirdi; gücü artıyor.`, "makro", true, { k: "evj.houseCastle", p: [{ hn: h.nameIdx }] });
  } else if (h.trait === "kindar" || roll < 0.7) {
    push(s, "hanedan_haber", `${h.name} ile ${other.name} arasında husumet alevlendi.`, "makro", true, { k: "evj.houseFeud", p: [{ hn: h.nameIdx }, { hn: other.nameIdx }] });
  } else {
    push(s, "hanedan_haber", `${h.name} ile ${other.name} bir ittifak kurdu; diyarda dengeler değişiyor.`, "makro", true, { k: "evj.houseAlly", p: [{ hn: h.nameIdx }, { hn: other.nameIdx }] });
  }
}
// Dost hane teklifini kabul et (ittifak veya evlilik).
export function acceptDynastyOffer(prev: GameState, offerId: string): GameState {
  const s = clone(prev); const p = s.player;
  const offer = (s.dynastyOffers || []).find((o) => o.id === offerId);
  if (!offer) return s;
  s.dynastyOffers = (s.dynastyOffers || []).filter((o) => o.id !== offerId);
  const h = ensureRivals(s).find((x) => x.id === offer.houseId);
  if (h) h.tutum = Math.min(100, (h.tutum ?? 0) + (offer.type === "evlilik" ? 40 : 30));
  if (!s.allied_houses) s.allied_houses = [];
  if (!s.allied_houses.includes(offer.houseId)) s.allied_houses.push(offer.houseId);
  if (offer.type === "evlilik" && !p.married) {
    const name = p.gender === "erkek" ? rnd(SPOUSE_K) : rnd(SPOUSE_E);
    p.married = true; p.spouse_name = name; p.spouse_seed = Math.floor(Math.random() * 1e9);
    p.reputation = Math.min(100, p.reputation + 8); p.fame = Math.min(100, p.fame + 6);
    push(s, "evlilik", `${h?.name || "Köklü bir hanedan"} ile evlilik ittifakı kurdun; iki ocak birleşti.`, "kişisel", true, { k: "evj.houseMarryAccept", p: [h ? { hn: h.nameIdx } : "", { fn: [p.spouse_seed, p.gender === "erkek" ? "kadın" : "erkek"] }] });
  } else {
    p.reputation = Math.min(100, p.reputation + 5);
    push(s, "hanedan_haber", `${h?.name || "Bir hanedan"} ile ittifak kurdun; artık arkanı kollayan bir gücün var.`, "makro", true, { k: "evj.houseAllyAccept", p: [h ? { hn: h.nameIdx } : ""] });
  }
  return s;
}
// Hane teklifini geri çevir (tutum biraz düşer).
export function declineDynastyOffer(prev: GameState, offerId: string): GameState {
  const s = clone(prev);
  const offer = (s.dynastyOffers || []).find((o) => o.id === offerId);
  if (!offer) return s;
  s.dynastyOffers = (s.dynastyOffers || []).filter((o) => o.id !== offerId);
  const h = ensureRivals(s).find((x) => x.id === offer.houseId);
  if (h) h.tutum = Math.max(-100, (h.tutum ?? 0) - 8);
  return s;
}
function tickWars(s: GameState, announce: boolean) {
  if (!s.wars) s.wars = [];
  // Yeni jenerik savaş (ödülsüz arka plan; en fazla bağımsız 1 tane, %6 şans) — KARAKTERE UYGUN
  if (s.wars.filter((w) => !w.prize).length === 0 && Math.random() < 0.06) {
    const ids = FACTIONS.map((f) => f.id);
    // saldırgan başlatıcı (agresyona göre ağırlıklı; barışçıl şifacı savaş başlatmaz)
    const aw = ids.map((id) => ({ id, w: factionTrait(id).aggression })).filter((x) => x.w > 0.12);
    const at = aw.reduce((acc, x) => acc + x.w, 0);
    let r = Math.random() * at; let a = aw[0].id;
    for (const x of aw) { r -= x.w; if (r <= 0) { a = x.id; break; } }
    // hedef: müttefik değil; mümkünse doğal düşman
    const targets = ids.filter((id) => id !== a && factionStance(a, id) <= 0);
    const enemies = targets.filter((id) => factionStance(a, id) < 0);
    const pool = enemies.length ? enemies : targets;
    if (pool.length) {
      const b = pool[Math.floor(Math.random() * pool.length)];
      if (!onWarCooldown(s, a, b)) {
        s.wars.push({ a, b, turnsLeft: 4 + Math.floor(Math.random() * 4), aScore: 0, bScore: 0 });
        if (announce) push(s, "ocak_savasi", `${factionById(a)?.name} ile ${factionById(b)?.name} arasında savaş çıktı!`, "makro", true, { k: "evj.warGeneric", p: [{ fc: a }, { fc: b }] });
      }
    }
  }
  for (const w of s.wars) {
    w.turnsLeft -= 1;
    // doğal gidişat + müttefik takviyesi (dostu çok olan tarafa fazladan ağırlık)
    const aRein = factionTrait(w.a).allies.length * 0.5;
    const bRein = factionTrait(w.b).allies.length * 0.5;
    w.aScore += Math.floor(Math.random() * 3) + (Math.random() < aRein ? 1 : 0);
    w.bScore += Math.floor(Math.random() * 3) + (Math.random() < bRein ? 1 : 0);
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
        if (announce) push(s, "ocak_savasi", flipped ? `${wf?.name}, ${beylikName(w.prize)}'ni ele geçirdi!` : `${wf?.name}, ${beylikName(w.prize)} üzerindeki hakimiyetini korudu.`, "makro", true, flipped ? { k: "evj.prizeWin", p: [{ fc: winner }, { bl: w.prize }] } : { k: "evj.prizeHold", p: [{ fc: winner }, { bl: w.prize }] });
      }
    } else if (announce) {
      push(s, "ocak_savasi", `Savaş sona erdi: ${wf?.name} üstün geldi.`, "makro", true, { k: "evj.warEnd", p: [{ fc: winner }] });
    }
    // Oyuncu kazanan tarafın üyesiyse itibar
    if (s.player.faction === winner) { s.player.faction_standing[winner] = (s.player.faction_standing[winner] || 0) + 8; s.player.fame = Math.min(100, s.player.fame + 4); }
    setWarCooldown(s, w.a, w.b, 12); // savaş sonrası ~1 yıl ateşkes (sürekli savaş döngüsünü kırar)
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
  const i1 = Math.floor(Math.random() * BEYLIKS.length);
  let i2 = Math.floor(Math.random() * BEYLIKS.length); if (i2 === i1) i2 = (i1 + 1) % BEYLIKS.length;
  const b1 = BEYLIKS[i1], b2 = BEYLIKS[i2];
  const ni = Math.floor(Math.random() * WORLD_NEWS.length);
  const line = WORLD_NEWS[ni].replace("%b2", b2.name).replace("%b", b1.name);
  push(s, "dunya", line, "makro", false, { k: "wnews." + ni, p: [{ bl: b1.id }, { bl: b2.id }] });
}

// Ekonomi: piyasa zamanla dengeye döner; ara sıra kıtlık/bolluk şoku.
function tickEconomy(s: GameState, announce: boolean) {
  if (s.econ === undefined) s.econ = 1;
  // Oyuncunun alış-satış baskısı zamanla normale döner (piyasa kendini toparlar).
  if (s.world?.mkt) { for (const k in s.world.mkt) { s.world.mkt[k] *= 0.82; if (Math.abs(s.world.mkt[k]) < 0.02) delete s.world.mkt[k]; } }
  // dengeye dön
  s.econ += (1 - s.econ) * 0.25;
  if (Math.random() < 0.08) {
    if (Math.random() < 0.5) { s.econ = Math.min(1.5, s.econ + 0.22); if (announce) push(s, "piyasa", "Kıtlık baş gösterdi; pazarda fiyatlar fırladı.", "makro", false, { k: "evj.scarcity" }); }
    else { s.econ = Math.max(0.7, s.econ - 0.18); if (announce) push(s, "piyasa", "Bereketli hasat; pazarda fiyatlar düştü.", "makro", false, { k: "evj.abundance" }); }
  }
  s.econ = Math.round(s.econ * 100) / 100;
  // Gerçek enflasyon–deflasyon döngüsü (dünya tabanlı, oyuncudan bağımsız): sikkenin değeri iki yönlü oynar.
  // Savaş + kıtlık → enflasyon (yukarı). Uzun barış + bolluk → deflasyon (aşağı, nakit değer kazanır).
  // Nadiren gümüş/sikke kıtlığı belirgin deflasyon getirir. Hafif tağşiş tabanı uzun vadede yukarı eğilimli.
  if (s.turn > 0 && s.turn % 12 === 0 && s.world) {
    let inf = s.world.inflation || 1;
    let drift = 0.002 + Math.random() * 0.004;               // hafif tağşiş tabanı (~%0.2–0.6)
    const wars = (s.wars?.length || 0);
    if (wars > 0) drift += 0.006 * Math.min(3, wars);        // savaş finansmanı → enflasyon
    else drift -= 0.005;                                      // barış yılı → fiyatlar gevşer (deflasyon baskısı)
    if (s.econ < 0.85) drift -= 0.005;                        // bolluk/bereket → deflasyon
    else if (s.econ > 1.2) drift += 0.004;                    // kıtlık → enflasyon
    if (Math.random() < 0.025) drift -= 0.018;               // nadir gümüş/sikke kıtlığı → belirgin deflasyon
    inf = Math.max(0.8, Math.min(2.5, inf * (1 + drift)));
    s.world.inflation = Math.round(inf * 1000) / 1000;
    if (announce && Math.random() < 0.3) {
      if (s.world.inflation > 1.15) push(s, "piyasa", `Diyarda hayat pahalılığı arttı; sikke eski değerinde değil (enflasyon %${Math.round((s.world.inflation - 1) * 100)}).`, "makro", false, { k: "evj.inflation", p: [Math.round((s.world.inflation - 1) * 100)] });
      else if (s.world.inflation < 0.92) push(s, "piyasa", `Fiyatlar geneline düştü; sikke değer kazandı (deflasyon %${Math.round((1 - s.world.inflation) * 100)}).`, "makro", false, { k: "evj.deflation", p: [Math.round((1 - s.world.inflation) * 100)] });
    }
  }
  // Geçici piyasa olayı: süresi dolanı kapat, ara sıra yenisini başlat
  if (s.marketEvent && s.marketEvent.until <= s.turn) s.marketEvent = null;
  if (!s.marketEvent && Math.random() < 0.07) {
    const ev = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
    s.marketEvent = { goods: ev.goods, mult: ev.mult, until: s.turn + ev.months, key: ev.key };
    if (announce) push(s, "piyasa", ev.text, "makro", false, { k: "mev." + ev.key });
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
      push(s, "kervan", `Kervan ${route[c.step]} yakınında eşkıyaya uğradı! ${lost} akçelik mal yağmalandı.`, "kişisel", true, { k: "evj.carRaid", p: [{ pl: route[c.step] }, lost] });
      if (c.invested <= 0) {
        push(s, "kervan", "Kervan tümüyle yağmalandı; elde bir şey kalmadı.", "kişisel", true, { k: "evj.carLost" });
        s.caravan = null;
      }
    }
    return; // hâlâ yolda
  }
  // Varış: hayatta kalan sermaye üzerinden kâr çöz — fiyat farkı (arbitraj) kârı belirler.
  // spread = malın hedefteki/çıkıştaki fiyat endeksi (1 = fark yok, >1 kârlı, <1 zarar). Eski kayıt: spread yoksa 1.
  const spread = c.spread ?? (c.good ? cityGoodPriceIndex(s, c.dest, c.good) / Math.max(0.5, cityGoodPriceIndex(s, route[0], c.good)) : 1.2);
  const mult = Math.max(0.4, (0.85 + 0.5 * spread) * (1 + p.skills.trade * 0.03) + (Math.random() * 0.3 - 0.05));
  const ret = Math.round(c.invested * mult);
  p.money += ret; gainSkill(s, "trade", 10);
  const paid = c.invested + (c.lost ?? 0); const net = ret - paid; // gerçek kâr/zarar (yağma dahil)
  if (net > 200) p.reputation = Math.min(100, p.reputation + 2); // büyük kâr nam getirir
  const carried = c.good ? { i: c.good } : { i: "bugday" };
  push(s, "kervan", `${c.dest} kervanın vardı: ${paid} akçe yatırmıştın, ${ret} akçe döndü (net ${net >= 0 ? "+" : ""}${net}).`, "kişisel", true, { k: "evj.carArrive2", p: [{ pl: c.dest }, paid, ret, (net >= 0 ? "+" : "") + net, carried] });
  s.caravan = null;
}
// Bir malın bir şehirdeki yapısal fiyat endeksi (arz-talep; ~0.65 bol/ucuz .. 1.6 kıt/pahalı). Oyuncu baskısı hariç.
function cityGoodPriceIndex(s: GameState, loc: string, good: string): number {
  return supplyDemandMult(s, loc, good);
}
// En kârlı kervan rotası: bir malı ucuz olduğu (bol) şehirden alıp pahalı olduğu (kıt) şehirde satmak.
// Şehirler-arası gerçek fiyat farkını tarar; çıkışta bol + hedefte kıt olan malı/şehri seçer.
function bestCaravanRoute(s: GameState, origin: string): { dest: string; good: string; spread: number } | null {
  const goods = Object.keys(GOOD_PRODUCERS);
  const oIdx: Record<string, number> = {};
  for (const g of goods) oIdx[g] = Math.max(0.5, cityGoodPriceIndex(s, origin, g)); // çıkış fiyatı (ucuza al)
  let best: { dest: string; good: string; spread: number } | null = null;
  for (const dest of LOCATIONS) {
    if (dest === origin) continue;
    for (const g of goods) {
      const spread = cityGoodPriceIndex(s, dest, g) / oIdx[g]; // hedefte pahalı / çıkışta ucuz
      if (!best || spread > best.spread) best = { dest, good: g, spread };
    }
  }
  return best;
}
// Kervan gönder: en kârlı şehirler-arası rotayı bul, çok konaklı yol kur, her ay bir konak ilerlesin.
export function launchCaravan(prev: GameState, amount: number): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || s.caravan || amount <= 0 || p.money < amount) return s;
  const origin = p.location_name;
  const others = LOCATIONS.filter((l) => l !== origin);
  if (others.length === 0) return s;
  // Arbitraj: en iyi fiyat farkını veren mal+hedef. Bulunamazsa rastgele hedef (emniyet).
  const arb = bestCaravanRoute(s, origin);
  const dest = arb ? arb.dest : others[Math.floor(Math.random() * others.length)];
  // 1-2 ara konak (origin ve hedef hariç).
  const pool = others.filter((l) => l !== dest);
  const nwp = Math.min(pool.length, 1 + (Math.random() < 0.5 ? 1 : 0));
  const waypoints: string[] = [];
  for (let i = 0; i < nwp; i++) waypoints.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  const route = [origin, ...waypoints, dest];
  p.money -= amount;
  s.caravan = { invested: amount, dest, route, step: 0, lost: 0, good: arb?.good, spread: arb?.spread };
  const carried = arb ? { i: arb.good } : { i: "bugday" };
  push(s, "kervan", `${amount} akçelik kervan yola çıktı: ${route.join(" → ")}. ${route.length - 1} konak sürecek.`, "kişisel", false, { k: "evj.carLaunch", p: [amount, { route }, route.length - 1, carried] });
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
  addStatXp(s, "strength", 3); // cephe tecrübesi gücü geliştirir
  if (win) {
    if (mine === "a") w.aScore += 3; else w.bScore += 3;
    const loot = 20 + Math.floor(Math.random() * 25);
    p.money += loot; p.fame = Math.min(100, p.fame + 4); p.faction_standing[p.faction!] = (p.faction_standing[p.faction!] || 0) + 6;
    bumpNam(p, "mert", 4);
    p.health = Math.max(1, p.health - (8 - Math.min(6, Math.round(armorDefense(p) / 2))));
    push(s, "ocak_savasi", `Cephede loncan için savaştın ve üstün geldin (+${loot} akçe, itibar).`, "kişisel", true, { k: "evj.frontWin", p: [loot] });
  } else {
    const hurt = 14 + Math.floor(Math.random() * 12) - armorDefense(p);
    p.health = Math.max(0, p.health - Math.max(4, hurt));
    push(s, "ocak_savasi", `Cephede ağır bir gün; yaralandın.`, "kişisel", false, { k: "evj.frontLose" });
    if (p.health <= 0) die(s, `${p.name}, ocak savaşında şehit düştü.`, { k: "evj.dieWar", p: [p.name] });
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
  let earn = Math.round((base + stat * 2 + Math.floor(Math.random() * 6)) * mult * titleMult * ws.mult * inflationFactor(s));
  p.career_xp += 1;
  gainSkill(s, PROF_SKILL[p.profession] || "crafting", 8);
  addStatXp(s, PROF_STAT[p.profession] || "stamina", 4); // meslek özelliğin işle gelişir
  p.hunger = Math.max(0, p.hunger - (style === "kaytarici" ? 3 : 6));
  // Risk: hırslı bedenini yorar, kaytarıcı yakalanabilir
  const failed = ws.fail > 0 && Math.random() < ws.fail;
  if (failed) {
    earn = Math.round(earn * 0.3);
    if (style === "hirsli") { const hurt = 4 + Math.floor(Math.random() * 6); p.health = Math.max(0, p.health - hurt); p.money += earn; push(s, "çalışma", `Hırslı çalışırken sakatlandın (−${hurt} sağlık); kazanç düştü (${earn} akçe).`, "kişisel", false, { k: "evj.workHurt", p: [hurt, earn] }); }
    else { p.reputation = Math.max(-100, p.reputation - 2); p.money += earn; push(s, "çalışma", `Kaytarırken yakalandın; itibarın sarsıldı, az kazandın (${earn} akçe).`, "kişisel", false, { k: "evj.workSlack", p: [earn] }); }
  } else {
    p.money += earn;
    if (style === "kaytarici") p.health = Math.min(100, p.health + 2);
    push(s, "çalışma", `${careerTitle(p.profession, p.career_xp - 1)} olarak çalıştın, ${earn} akçe kazandın.`, "kişisel", false, { k: "evj.work", p: [{ c: [p.profession, p.career_xp - 1] }, earn] });
  }
  if (pr) { const after = careerTier(pr, p.career_xp); if (after > tierBefore) push(s, "terfi", `Yükseldin: artık ${pr.tiers[after]}!`, "kişisel", true, { k: "evj.promote", p: [{ c: [p.profession, p.career_xp] }] }); }
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
  balıkçı:  [{ text: "Fırtınalı bir deniz", stat: "stamina", win: "Ağları dolu çektin", lose: "Dalga teknene vurdu", wMoney: 16, lHealth: 4, skill: "trade" }],
  marangoz: [{ text: "İnce bir doğrama işi", stat: "intelligence", win: "Kusursuz bir dolap çıkardın", lose: "Tahta çatladı", wMoney: 18, lHealth: 2, skill: "crafting" }],
  çoban:    [{ text: "Sürüde huzursuzluk", stat: "stamina", win: "Sürüyü kurttan kolladın", lose: "Birkaç koyun telef oldu", wMoney: 14, wRep: 1, lHealth: 3 }],
  fırıncı:  [{ text: "Şafak vakti fırın", stat: "stamina", win: "Ekmekler altın gibi çıktı", lose: "Hamur ekşidi", wMoney: 15, lRep: 1, skill: "crafting" }],
  katip:    [{ text: "Çetrefil bir ferman", stat: "intelligence", win: "Belgeyi kusursuz yazdın", lose: "Mürekkep dağıldı", wMoney: 20, wRep: 2, lRep: 1, skill: "social" }],
  dokumacı: [{ text: "Nazik bir sipariş", stat: "intelligence", win: "Kumaşın göz kamaştırdı", lose: "İplik koptu", wMoney: 17, lHealth: 1, skill: "crafting" }],
  _:        [{ text: "Sıradan bir gün", stat: "stamina", win: "İşini sağlam yaptın, fazladan kazandın", lose: "Yorgun bir gündü", wMoney: 10, lHealth: 2 }],
};
function rollWorkEvent(s: GameState) {
  const p = s.player;
  const wevKey = WORK_EVENTS[p.profession] ? p.profession : "_";
  const pool = WORK_EVENTS[p.profession] || WORK_EVENTS._;
  const ev = pool[Math.floor(Math.random() * pool.length)];
  const ok = Math.random() < 0.4 + effStat(p, ev.stat) * 0.06;
  if (ok) {
    if (ev.wMoney) p.money += ev.wMoney;
    if (ev.wHealth) p.health = Math.min(100, p.health + ev.wHealth);
    if (ev.wRep) p.reputation = Math.min(100, p.reputation + ev.wRep);
    if (ev.skill) gainSkill(s, ev.skill, 4);
    push(s, "çalışma", `${ev.text}: ${ev.win}${ev.wMoney ? ` (+${ev.wMoney} akçe)` : ""}.`, "kişisel", false, { k: "evj.workWin", p: [{ wevt: wevKey }, { wevw: wevKey }, ev.wMoney || 0] });
  } else {
    if (ev.lHealth) p.health = Math.max(0, p.health - ev.lHealth);
    if (ev.lRep) p.reputation = Math.max(-100, p.reputation - ev.lRep);
    push(s, "çalışma", `${ev.text}: ${ev.lose}.`, "kişisel", false, { k: "evj.workLose", p: [{ wevt: wevKey }, { wevl: wevKey }] });
  }
}

export function eat(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  // önce envanterdeki yiyecek, yoksa 2 akçeye sokak yemeği
  const bonus = hasPerk(p, "tutumlu") ? 10 : 0;
  const foodId = Object.keys(p.inventory).find((id) => p.inventory[id] > 0 && ITEMS[id]?.feed);
  if (foodId) { const it = ITEMS[foodId]; p.inventory[foodId] -= 1; if (p.inventory[foodId] <= 0) delete p.inventory[foodId]; p.hunger = Math.min(100, p.hunger + (it.feed || 20) + bonus); push(s, "gunluk", `${it.name} yedin.`, "kişisel", false, { k: "evj.eat", p: [{ i: foodId }] }); return s; }
  if (p.money < 2) { push(s, "gunluk", "Yemek alacak akçen yok.", "kişisel", false, { k: "evj.noFood" }); return s; }
  p.money -= 2; p.hunger = Math.min(100, p.hunger + 25 + bonus); push(s, "gunluk", "Sokaktan karnını doyurdun (2 akçe).", "kişisel", false, { k: "evj.eatStreet" });
  return s;
}

export function useItem(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const it = ITEMS[id];
  if (!it || !(p.inventory[id] > 0)) return s;
  p.inventory[id] -= 1; if (p.inventory[id] <= 0) delete p.inventory[id];
  if (it.feed) p.hunger = Math.min(100, p.hunger + it.feed);
  if (it.heal) p.health = Math.min(100, p.health + it.heal);
  push(s, "kullanım", `${it.name} kullandın.`, "kişisel", false, { k: "evj.useItem", p: [{ i: id }] });
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
  addTradePressure(s, p.location_name, id, 0.05); // alım yerel arzı azaltır → fiyat tırmanır
  gainSkill(s, "trade", 5);
  push(s, "ticaret", `${g.name} aldın (${price} akçe).`, "kişisel", false, { k: "evj.buy", p: [{ i: id }, price] });
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
// Pazarlıkta satıcı kişiliği (Vercel bargain.py): şehre göre deterministik mizaç; pazarlık havasını belirler.
export const SELLER_PERSONAS: { id: string; mult: number }[] = [
  { id: "comert", mult: 1.18 }, { id: "durust", mult: 1.0 }, { id: "tuccar", mult: 0.9 }, { id: "inatci", mult: 0.78 }, { id: "cimri", mult: 0.68 },
];
export function sellerPersona(loc: string): { id: string; mult: number } { return SELLER_PERSONAS[locSeed(loc + "satici") % SELLER_PERSONAS.length]; }
export function sellerPersonaOf(s: GameState): { id: string; mult: number } { return sellerPersona(s.player.location_name); }
// Pazarlık başarı olasılığı (karizma + ticaret becerisi × satıcı mizacı).
export function bargainChance(s: GameState): number {
  const p = s.player;
  const favor = 1 + factionLocalFavor(s) * 0.08; // loncanın hâkim olduğu sancakta pazarlık kolay, düşmanın elinde zor
  return Math.max(0.1, Math.min(0.95, (0.42 + effStat(p, "charisma") * 0.035 + p.skills.trade * 0.025 + bargainBonus(s)) * sellerPersona(p.location_name).mult * favor));
}
// Müzakere sonunda anlaşılan fiyattan alım.
export function negotiatedBuy(prev: GameState, id: string, price: number): GameState {
  const s = clone(prev); const p = s.player;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return s;
  if (p.money < price) return s;
  p.money -= price; p.inventory[id] = (p.inventory[id] || 0) + 1;
  addTradePressure(s, p.location_name, id, 0.05);
  gainSkill(s, "trade", 6);
  push(s, "ticaret", `Pazarlıkla ${g.name} aldın (${price} akçe).`, "kişisel", false, { k: "evj.buyHaggle", p: [{ i: id }, price] });
  return s;
}
export function sellItem(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!(p.inventory[id] > 0)) return s;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return s;
  // Kalite kademeli malda en iyi birimi sat; fiyata kalite çarpanı uygula.
  const tier = QUALITY_GOODS.has(id) ? takeQualityUnit(p, id) : "siradan";
  p.inventory[id] -= 1; if (p.inventory[id] <= 0) delete p.inventory[id];
  let sell = Math.round(marketPrice(g.sell, s.econ) * goodPriceMult(s, id) * QUALITY_MULT[tier]);
  if (hasPerk(p, "dilbaz")) sell = Math.round(sell * 1.25);
  p.money += sell; addTradePressure(s, p.location_name, id, -0.045); // satış yerel arzı artırır → fiyat düşer
  gainSkill(s, "trade", 5);
  const qNote = tier !== "siradan" ? ` (${QUALITY_LABEL[tier]})` : "";
  if (tier !== "siradan") push(s, "ticaret", `${g.name}${qNote} sattın (+${sell} akçe).`, "kişisel", false, { k: "evj.sellQ", p: [{ i: id }, { q: tier }, sell] });
  else push(s, "ticaret", `${g.name} sattın (+${sell} akçe).`, "kişisel", false, { k: "evj.sell", p: [{ i: id }, sell] });
  return s;
}
// Pazarlıkta satış için taban fiyat (satıcı yükseltmeye direnir; tavan bunun üstünde).
export function bargainSellBase(s: GameState, id: string): number {
  const p = s.player;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return 0;
  return Math.max(1, Math.round(marketPrice(g.sell, s.econ) * goodPriceMult(s, id)));
}
// Müzakereyle satış: anlaşılan fiyattan bir birim satar (kalite çarpanı korunur).
export function negotiatedSell(prev: GameState, id: string, price: number): GameState {
  const s = clone(prev); const p = s.player;
  if (!(p.inventory[id] > 0)) return s;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return s;
  const tier = QUALITY_GOODS.has(id) ? takeQualityUnit(p, id) : "siradan";
  p.inventory[id] -= 1; if (p.inventory[id] <= 0) delete p.inventory[id];
  let earn = Math.round(price * QUALITY_MULT[tier]);
  if (hasPerk(p, "dilbaz")) earn = Math.round(earn * 1.25);
  p.money += earn; addTradePressure(s, p.location_name, id, -0.045); gainSkill(s, "trade", 6);
  push(s, "ticaret", `Pazarlıkla ${g.name} sattın (+${earn} akçe).`, "kişisel", false, { k: "evj.sellHaggle", p: [{ i: id }, earn] });
  return s;
}

// İlişki: niyetli sohbet (bağlamlı), hediye ver.
export function talkWith(prev: GameState, npc: NPC, intent: string, lang: string = "tr"): { state: GameState; line: string } {
  const s = clone(prev); const p = s.player;
  const ns = npcStateOf(s, npc.id);
  const rel = s.relationships[npc.id] || 0;
  // NPC, sohbette etkin ilişkiye (taban + anılar) göre davranır — hatırladıkları konuşmasına yansır.
  const r: ConvResult = converse(npc, ns.mood, effectiveRel(rel, ns.anilar), socialPresence(p), intent, lang as any);
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
  // Diyalog katmanları (Vercel): NPC bazen kendi gündemini açar (spontane) + geçmişi hatırlar (callback).
  let line = r.line;
  if (intent === "hosbes" && Math.random() < 0.3) { const sp = spontaneousLine(npc, ns.mood, lang as any); if (sp) line = sp + " " + line; }
  const lastAni = ns.anilar && ns.anilar.length ? ns.anilar[ns.anilar.length - 1] : null;
  if (lastAni && Math.random() < 0.3) { const cb = callbackLine(npc, lastAni.tur, lang as any); if (cb) line = line + " " + cb; }
  // Yapısal anı: sohbet sonucuna göre türlenir (decay'li, ilişkiye etkin).
  const memTur = relDelta >= 8 ? "icten_sohbet" : relDelta > 0 ? "guzel_sohbet" : relDelta <= -3 ? "alay" : relDelta < 0 ? "rahatsizlik" : "guzel_sohbet";
  remember(s, npc, memTur);
  gainSkill(s, "social", 5);
  push(s, "sohbet", `${npc.name}: ${line}`);
  return { state: s, line };
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
  remember(s, npc, (ITEMS[itemId]?.buy || 0) >= 25 ? "comert_hediye" : "hediye");
  push(s, "sohbet", `${npc.name}'a ${ITEMS[itemId]?.name || "bir hediye"} verdin. Çok sevindi.`, "kişisel", false, { k: "evj.gift", p: [npc.name, { i: itemId }] });
  return s;
}

// ── NPC'nin amacına yardım/sömürü (Vercel npc_mind goal_action portu) ──
// Her NPC'nin bir hayat hedefi var (npc.goal); ona yardım büyük yakınlık + cömert nam,
// istismar ise akçe + zalim nam getirir ama ilişkiyi yakar.
export const GOAL_HELP_COST = 25;
export function helpNpcGoal(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || p.money < GOAL_HELP_COST) return s;
  p.money -= GOAL_HELP_COST;
  const ns = npcStateOf(s, npc.id);
  const rel = s.relationships[npc.id] || 0;
  // Azalan getiri: zaten yakın birine yardım daha az yakınlık/itibar getirir (farm engeli).
  const fresh = rel < 70;
  s.relationships[npc.id] = Math.min(100, rel + (fresh ? 18 : 6));
  ns.mood = Math.max(-100, Math.min(100, ns.mood + (fresh ? 18 : 8)));
  if (fresh) { p.reputation = Math.min(100, p.reputation + 3); bumpNam(p, "comert", 4); }
  gainSkill(s, "social", 6);
  ns.memories.push(`Amacına omuz verdin: ${npc.goal}.`);
  if (ns.memories.length > 8) ns.memories = ns.memories.slice(-8);
  remember(s, npc, "yardim"); // kalıcıya yakın +20 anı (Vercel: "sana borçlu")
  // Velinimet tohumu: bu iyilik yıllar sonra keseyle ve itibarla döner (nesil aşabilir).
  sowSeed(s, { kaynak: "velinimet", hmin: 24, hmax: 96, agirlik: "buyuk", nesil: true, etki: { money: 90, reputation: 6 }, npcName: npc.name });
  push(s, "sohbet", `${npc.name}'in "${npc.goal}" derdine ${GOAL_HELP_COST} akçeyle omuz verdin; sana minnettar kaldı.`, "kişisel", true, { k: "evj.helpGoal", p: [npc.name, { goalk: npc.goal }, GOAL_HELP_COST] });
  return s;
}
export function exploitNpcGoal(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13) return s;
  const rel = s.relationships[npc.id] || 0;
  // Sana güvenmeyen kanmaz — bu, istismarın tekrar tekrar farm'lanmasını engeller.
  if (rel <= -25) { push(s, "sohbet", `${npc.name} sana zaten güvenmiyor; oyununa gelmez.`, "kişisel", false, { k: "evj.distrust", p: [npc.name] }); return s; }
  // Kazanç güvene bağlı: ne kadar çok güveniyorsa o kadar koparırsın (ve o güveni yakarsın).
  const gain = Math.round(8 + Math.max(0, rel) * 0.4 + Math.random() * 10);
  p.money += gain;
  const ns = npcStateOf(s, npc.id);
  s.relationships[npc.id] = Math.max(-100, rel - 22);
  ns.mood = Math.max(-100, ns.mood - 25);
  p.reputation = Math.max(-100, p.reputation - 4); p.fear = Math.min(100, p.fear + 3);
  bumpNam(p, "zalim", 5);
  ns.memories.push(`Amacını istismar edip seni kullandı.`);
  if (ns.memories.length > 8) ns.memories = ns.memories.slice(-8);
  remember(s, npc, "somuru"); // skandal anı → ileride dedikoduya dönüşür
  // İstismar tohumu: kullandığın kişi güçlenince geri döner (nesil aşabilir).
  sowSeed(s, { kaynak: "somuru_intikam", hmin: 36, hmax: 144, agirlik: "orta", nesil: true, etki: { reputation: -5, money: -25 }, npcName: npc.name });
  push(s, "sohbet", `${npc.name}'in "${npc.goal}" umudunu istismar edip ${gain} akçe kopardın; sana diş biledi.`, "kişisel", true, { k: "evj.exploitGoal", p: [npc.name, { goalk: npc.goal }, gain] });
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
  const ok = Math.random() < Math.min(0.97, 0.25 + (rel - 50) * 0.012 + socialPresence(p) * 0.03 + karizmaBonus + courtBonus(s));
  if (ok) {
    p.married = true; p.spouse_name = npc.name; p.spouse_seed = locSeed(npc.id); p.reputation = Math.min(100, p.reputation + 5);
    bumpNam(p, "capkin", 5);
    push(s, "evlilik", `${npc.name} ile evlendin — yeni bir ocak kuruldu.`, "kişisel", true, { k: "evj.marryNpc", p: [{ fn: [p.spouse_seed!, p.gender === "erkek" ? "kadın" : "erkek"] }] });
  } else {
    s.relationships[npc.id] = Math.max(0, rel - 8);
    push(s, "sohbet", `${npc.name} teklifini şimdilik geri çevirdi. Vakit ister.`, "kişisel", false, { k: "evj.proposeNo", p: [npc.name] });
  }
  return s;
}

// ── Ek NPC etkileşim eylemleri (Vercel npc_interactions.py portu): hakaret / flört / dedikodu / para ──
export function insultNpc(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player; if (p.dead || p.age < 13) return s;
  const ns = npcStateOf(s, npc.id); const rel = s.relationships[npc.id] || 0;
  let drop = 8 + Math.floor(Math.random() * 8);
  if (npc.trait === "öfkeli") { drop += 5; p.fear = Math.min(100, p.fear + 2); } // öfkeli sert karşılık verir
  s.relationships[npc.id] = Math.max(-100, rel - drop);
  ns.mood = Math.max(-100, ns.mood - 20);
  p.honor = Math.max(0, p.honor - 2);
  remember(s, npc, "hakaret");
  witnessScandal(s, "hakaret", 0.4); // tanık varsa dedikodu kaynağı
  push(s, "sohbet", `${npc.name}'a ağzına geleni söyledin; aranıza duvar girdi (−${drop} ilişki).`, "kişisel", false, { k: "npca.insult", p: [npc.name, drop] });
  return s;
}
export function canFlirt(p: Player, npc: NPC, rel: number): boolean {
  return !p.dead && !p.married && p.age >= 16 && npc.age >= 16 && npc.gender !== p.gender && rel >= 15;
}
export function flirtWith(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player; const rel = s.relationships[npc.id] || 0;
  if (!canFlirt(p, npc, rel)) return s;
  const ns = npcStateOf(s, npc.id);
  const ok = Math.random() < Math.min(0.9, 0.35 + (rel - 15) * 0.01 + socialPresence(p) * 0.04 + allureBonus(s));
  if (ok) {
    const up = 6 + Math.floor(Math.random() * 8);
    s.relationships[npc.id] = Math.min(100, rel + up); ns.mood = Math.max(-100, Math.min(100, ns.mood + 12));
    bumpNam(p, "capkin", 3); remember(s, npc, "guzel_sohbet");
    push(s, "sohbet", `${npc.name} ile gönül eğlendirdin; arana kıvılcım düştü (+${up} ilişki).`, "kişisel", false, { k: "npca.flirtWin", p: [npc.name, up] });
  } else {
    s.relationships[npc.id] = Math.max(-100, rel - 5); ns.mood = Math.max(-100, ns.mood - 6);
    push(s, "sohbet", `${npc.name} yüz vermedi; mahcup oldun.`, "kişisel", false, { k: "npca.flirtLose", p: [npc.name] });
  }
  return s;
}
export function gossipAbout(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player; if (p.dead || p.age < 13) return s;
  const ns = npcStateOf(s, npc.id); const rel = s.relationships[npc.id] || 0;
  const ok = Math.random() < Math.min(0.85, 0.4 + (p.skills?.social || 0) * 0.05 + p.stats.charisma * 0.02);
  if (ok) {
    s.relationships[npc.id] = Math.max(-100, rel - 4); ns.mood = Math.max(-100, ns.mood - 4); bumpNam(p, "zalim", 2);
    push(s, "sohbet", `${npc.name} hakkında diller döktürdün; namı sarsıldı.`, "kişisel", false, { k: "npca.gossipWin", p: [npc.name] });
  } else {
    s.relationships[npc.id] = Math.max(-100, rel - 12); ns.mood = Math.max(-100, ns.mood - 14); remember(s, npc, "hakaret");
    push(s, "sohbet", `Dedikodun ${npc.name}'in kulağına gitti; sana diş biledi (−12 ilişki).`, "kişisel", false, { k: "npca.gossipLose", p: [npc.name] });
  }
  return s;
}
export const GIVE_MONEY_AMT = 10;
export function giveMoneyTo(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player; if (p.dead || p.money < GIVE_MONEY_AMT) return s;
  p.money -= GIVE_MONEY_AMT;
  const ns = npcStateOf(s, npc.id); const rel = s.relationships[npc.id] || 0;
  const up = rel < 70 ? 9 : 3; // azalan getiri
  s.relationships[npc.id] = Math.min(100, rel + up); ns.mood = Math.max(-100, Math.min(100, ns.mood + 10));
  p.reputation = Math.min(100, p.reputation + 1); bumpNam(p, "comert", 3); remember(s, npc, "hediye");
  push(s, "sohbet", `${npc.name}'in avucuna ${GIVE_MONEY_AMT} akçe sıkıştırdın; duası seninle.`, "kişisel", false, { k: "npca.money", p: [npc.name, GIVE_MONEY_AMT] });
  return s;
}

// Seyahat: başka bir yerleşime git (pazar/atmosfer değişir, biraz tokluk gider).
export function travelTo(prev: GameState, dest: string): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || dest === p.location_name) return s;
  p.location_name = dest; p.hunger = Math.max(0, p.hunger - 5);
  push(s, "yolculuk", `${dest} yerleşimine gittin.`, "kişisel", false, { k: "evj.travel", p: [{ pl: dest }] });
  return s;
}

// Çok rotalı seyahat: ana yol (güvenli), patika (hızlı/riskli), kervan (rahat, ücretli), at (kendi atın: hızlı + güvenli + bedava).
export type TravelRoute = "anayol" | "patika" | "kervan" | "at";
export const TRAVEL_ROUTES: { id: TravelRoute; label: string; desc: string }[] = [
  { id: "anayol", label: "Ana Yol", desc: "Güvenli ama yorucu." },
  { id: "patika", label: "Patika", desc: "Kestirme — ama haydut riski var." },
  { id: "kervan", label: "Kervanla", desc: "Rahat ve güvenli (8 akçe)." },
  { id: "at", label: "Atınla", desc: "Hızlı, güvenli ve bedava — atın varsa." },
];
// At satın alma — bir kez; hızlı/güvenli "at ile" yolculuğunu açar.
export const HORSE_COST = 200;
export function buyHorse(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.horse || p.money < HORSE_COST) return s;
  p.money -= HORSE_COST; p.horse = true; p.reputation = Math.min(100, p.reputation + 2);
  push(s, "yolculuk", "Kendine sağlam bir at aldın; artık yollar daha kısa ve emniyetli.", "kişisel", true, { k: "horse.bought" });
  return s;
}
// ── Yol olayları (Vercel travel_rework.py portu) — otomatik stat-testli, mevcut akışa additif ──
// Rotaya göre yolda bir olay tetiklenebilir; sonuç oyuncunun istatistiğiyle çözülür ve günlüğe düşer.
function rollTravelEvent(s: GameState, route: TravelRoute) {
  const p = s.player;
  if (p.dead || p.age < 13) return;
  const insec = Math.max(0, -cityFx(s, p.location_name).sec); // eşkıya/yangın olayı varış şehrini tehlikeli yapar
  const chance = (route === "patika" ? 0.42 : route === "kervan" ? 0.5 : 0.34) + insec * 0.012;
  if (Math.random() >= chance) return;
  const test = (stat: keyof Stats, per = 0.05, base = 0.4) => Math.random() < Math.min(0.9, base + effStat(p, stat) * per);
  // Kervan rotası güvenli/sosyal olaylara yönelir; diğerleri tüm havuzu çeker.
  const pool = route === "kervan" ? ["han", "yolcu", "tuccar"] : ["han", "yolcu", "tuccar", "firtina", "gecit", "kervanf"];
  const ev = pool[Math.floor(Math.random() * pool.length)];
  if (ev === "han") {
    const cost = Math.min(p.money, 4 + Math.floor(Math.random() * 4));
    if (cost > 0) { p.money -= cost; p.health = Math.min(100, p.health + 8); p.hunger = Math.min(100, p.hunger + 12); push(s, "yolculuk", `Yol üstü bir handa mola verdin (−${cost} akçe); dinlenip karnını doyurdun.`, "kişisel", false, { k: "evj.trHan", p: [cost] }); }
  } else if (ev === "tuccar") {
    // Gezgin satıcı: ucuza yararlı bir mal.
    const goods = ["sifa", "ekmek", "et", "bal"]; const g = goods[Math.floor(Math.random() * goods.length)];
    if (test("charisma", 0.06, 0.45)) { p.inventory[g] = (p.inventory[g] || 0) + 1; push(s, "yolculuk", `Gezgin bir satıcıyla karşılaştın; pazarlıkla ucuza bir ${ITEMS[g]?.name || g} kaptın.`, "kişisel", true, { k: "evj.trMerchWin", p: [{ i: g }] }); }
    else push(s, "yolculuk", "Gezgin bir satıcı malını fazla pahalı istedi; eli boş yürüdün.", "kişisel", false, { k: "evj.trMerchLose" });
  } else if (ev === "yolcu") {
    // Yol arkadaşı (derviş/kaçak/tüccar/asker) — sohbetten beceri/irfan.
    const kinds = ["derviş", "kaçak tüccar", "yaşlı asker", "seyyah"]; const whoIdx = Math.floor(Math.random() * kinds.length); const who = kinds[whoIdx];
    if (test("charisma", 0.05, 0.5)) { gainSkill(s, "social", 12); push(s, "yolculuk", `Yolda bir ${who} ile dertleştin; sohbetinden hisse kaptın (sosyal beceri arttı).`, "kişisel", true, { k: "evj.trCompWin", p: [{ wc: whoIdx }] }); }
    else push(s, "yolculuk", `Yolda bir ${who} ile yürüdün; lafı pek tutmadı.`, "kişisel", false, { k: "evj.trCompLose", p: [{ wc: whoIdx }] });
  } else if (ev === "firtina") {
    if (test("stamina", 0.06, 0.45)) push(s, "yolculuk", "Yolda fırtınaya yakalandın ama sağlam bir kayalığa sığınıp atlattın.", "kişisel", false, { k: "evj.trStormWin" });
    else { const hurt = 5 + Math.floor(Math.random() * 8); p.health = Math.max(1, p.health - hurt); p.hunger = Math.max(0, p.hunger - 8); push(s, "yolculuk", `Yolda fırtına seni hırpaladı (−${hurt} sağlık).`, "kişisel", true, { k: "evj.trStormLose", p: [hurt] }); }
  } else if (ev === "gecit") {
    if (test("strength", 0.06, 0.42)) { gainSkill(s, "combat", 6); push(s, "yolculuk", "Sarp bir geçidi güçle aşıp kestirme yaptın.", "kişisel", false, { k: "evj.trPassWin" }); }
    else { const hurt = 4 + Math.floor(Math.random() * 7); p.health = Math.max(1, p.health - hurt); push(s, "yolculuk", `Sarp geçitte ayağın kaydı, biraz hırpalandın (−${hurt} sağlık).`, "kişisel", false, { k: "evj.trPassLose", p: [hurt] }); }
  } else if (ev === "kervanf") {
    // Kervan fırsatı: ticaret testiyle küçük kâr.
    if (test("intelligence", 0.05, 0.4)) { const gain = 10 + Math.floor(Math.random() * 25); p.money += gain; gainSkill(s, "trade", 6); push(s, "yolculuk", `Yolda bir kervana ufak bir ticaret yaptın (+${gain} akçe).`, "kişisel", true, { k: "evj.trCarWin", p: [gain] }); }
    else push(s, "yolculuk", "Yolda bir kervan gördün ama denk bir alışveriş çıkmadı.", "kişisel", false, { k: "evj.trCarLose" });
  }
  if (p.health <= 0) die(s, `${p.name}, yolda can verdi.`, { k: "evj.dieRoad", p: [p.name] });
}

export function travelBy(prev: GameState, dest: string, route: TravelRoute): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || dest === p.location_name) return s;
  if (route === "at" && !p.horse) route = "anayol"; // at yoksa ana yola düş
  if (route === "kervan") {
    if (p.money < 8) { push(s, "yolculuk", "Kervana verecek akçen yok.", "kişisel", false, { k: "evj.noCar" }); return s; }
    p.money -= 8; p.hunger = Math.max(0, p.hunger - 3); p.location_name = dest;
    push(s, "yolculuk", `Kervana katılıp ${dest}'e rahatça vardın.`, "kişisel", false, { k: "evj.carJoin", p: [{ pl: dest }] });
  } else if (route === "patika") {
    p.hunger = Math.max(0, p.hunger - 7); p.location_name = dest;
    const ambush = Math.random() < Math.max(0.08, 0.3 - combatPower(p) * 0.012);
    if (ambush) {
      const hurt = 8 + Math.floor(Math.random() * 10) - armorDefense(p);
      const loss = Math.min(p.money, 5 + Math.floor(Math.random() * 15));
      p.health = Math.max(0, p.health - Math.max(3, hurt)); p.money -= loss;
      push(s, "yolculuk", `Patikada haydut bastı! ${dest}'e zor ulaştın (−sağlık, −${loss} akçe).`, "kişisel", true, { k: "evj.pathAmbush", p: [{ pl: dest }, loss] });
      if (p.health <= 0) die(s, `${p.name}, patikada haydutlara yenik düştü.`, { k: "evj.diePath", p: [p.name] });
    } else {
      push(s, "yolculuk", `Patikadan kestirerek ${dest}'e vardın.`, "kişisel", false, { k: "evj.pathOk", p: [{ pl: dest }] });
    }
  } else if (route === "at") {
    p.hunger = Math.max(0, p.hunger - 4); p.location_name = dest;
    // At hızlı: pusu nadir, baskına uğrasan da dörtnala sıyrılırsın.
    const ambush = Math.random() < Math.max(0.03, 0.12 - combatPower(p) * 0.01);
    if (ambush) {
      const loss = Math.min(p.money, 4 + Math.floor(Math.random() * 8));
      p.money -= loss; p.health = Math.max(1, p.health - (4 + Math.floor(Math.random() * 5)));
      push(s, "yolculuk", `Atınla giderken haydutlar çıktı ama dörtnala sıyrıldın (−${loss} akçe).`, "kişisel", false, { k: "evj.rideAmbush", p: [{ pl: dest }, loss] });
    } else {
      push(s, "yolculuk", `Atına atlayıp ${dest} yerleşimine çabucak vardın.`, "kişisel", false, { k: "evj.rideOk", p: [{ pl: dest }] });
    }
  } else {
    p.hunger = Math.max(0, p.hunger - 5); p.location_name = dest;
    push(s, "yolculuk", `Ana yoldan ${dest} yerleşimine gittin.`, "kişisel", false, { k: "evj.travel", p: [{ pl: dest }] });
  }
  if (!p.dead) rollTravelEvent(s, route); // yol olayları (han/yolcu/tüccar/fırtına/geçit/kervan) — artık etkin
  return s;
}

export const ALL_PROFS = PROFS;
// Meslek değiştir (13+). Yeni bir zanaata geçersin.
export function changeProfession(prev: GameState, prof: string): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || prof === p.profession || !PROFS.includes(prof)) return s;
  p.profession = prof; p.career_xp = 0;
  push(s, "meslek_değişimi", `${professionById(prof)?.name || cap(prof)} mesleğine geçtin — yeniden en alttan.`, "kişisel", true, { k: "evj.profSwitch", p: [{ pr: prof }] });
  return s;
}

// Özellik puanı harca.
export function allocateStat(prev: GameState, key: keyof Stats): GameState {
  const s = clone(prev); const p = s.player;
  if (p.stat_points <= 0) return s;
  p.stat_points -= 1; p.stats[key] += 1;
  return s;
}
// ── Stat-XP (Vercel skills.add_stat_xp portu): özellikler kullanımla yavaşça büyür (stat_points'e EK) ──
const STAT_LABEL: Record<keyof Stats, string> = { strength: "Güç", intelligence: "Zekâ", charisma: "Karizma", stamina: "Dayanıklılık" };
export function statXpForNext(level: number): number { return 25 + level * 15; } // bir üst seviye için gereken tecrübe
export function statXpOf(p: Player, key: keyof Stats): number { return p.stat_xp?.[key] ?? 0; }
function addStatXp(s: GameState, key: keyof Stats, amt: number) {
  const p = s.player;
  if (p.stats[key] >= 10) return;
  if (!p.stat_xp) p.stat_xp = { strength: 0, intelligence: 0, charisma: 0, stamina: 0 };
  p.stat_xp[key] += amt;
  while (p.stats[key] < 10 && p.stat_xp[key] >= statXpForNext(p.stats[key])) {
    p.stat_xp[key] -= statXpForNext(p.stats[key]);
    p.stats[key] += 1;
    push(s, "beceri", `${STAT_LABEL[key]} özelliğin tecrübeyle gelişti (${p.stats[key]}).`, "kişisel", false, { k: "statxp.up", p: [{ statk: key }, p.stats[key]] });
  }
  if (p.stats[key] >= 10) p.stat_xp[key] = 0;
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
// ── Çalışma gücü (enerji sistemi) — her ay yenilenir; ders/kulüp meşki harcar ──
export const STUDY_COST = 2; // ders / kulüp meşki başına enerji
export function maxStudyEnergy(age: number): number { return age >= 7 && age < 18 ? 4 : 2; } // okul çağı 2 iş, yetişkin 1 iş/ay
export function studyEnergy(s: GameState): number { return s.player.study_energy ?? maxStudyEnergy(s.player.age); }
// Bu ay artık çalışılamıyor mu? (enerji ders maliyetinin altında).
export function studiedThisTurn(s: GameState): boolean { return studyEnergy(s) < STUDY_COST; }
// Sınava kaç ders kaldı (4 derste bir sınav).
export function lessonsToExam(p: Player): number { return 4 - ((p.lesson_count || 0) % 4); }
const EXAM_STAT: Record<string, keyof Stats> = { din: "intelligence", matematik: "intelligence", edebiyat: "charisma", beden: "strength" };
// Ders-içi olaylar (Vercel school.py ders olayları): mektep günlerine doku katar; stat testli.
interface SchoolEvent { id: string; stat: keyof Stats; }
const SCHOOL_EVENTS: SchoolEvent[] = [
  { id: "kopya", stat: "intelligence" }, { id: "kavga", stat: "strength" }, { id: "siir", stat: "charisma" },
  { id: "soru", stat: "intelligence" }, { id: "yaramazlik", stat: "charisma" }, { id: "yardim", stat: "intelligence" },
];
const SCHOOL_EV_TR: Record<string, string> = {
  "kopya.win":"Sınavda kopya teklif edildi; reddedip kendi emeğine güvendin.", "kopya.lose":"Kopyaya kalkıştın ve yakalandın; yüzün kızardı.",
  "kavga.win":"Avluda zayıf bir arkadaşını korudun; biraz hırpalandın ama dimdik durdun.", "kavga.lose":"Bir kavgaya karıştın ve dayak yedin.",
  "siir.win":"Mecliste bir beyit okudun; alkış topladın.", "siir.lose":"Söz alırken dilin dolaştı; biraz utandın.",
  "soru.win":"Hocanın çetin sorusunu bildin; takdir kazandın (özellik puanı).", "soru.lose":"Hocanın sorusunda bocaladın.",
  "yaramazlik.win":"Sınıfta küçük bir muziplik yaptın; herkes güldü.", "yaramazlik.lose":"Muzipliğin ters tepti; hoca kızdı.",
  "yardim.win":"Geri kalan bir arkadaşına ders çalıştırdın; ikiniz de kazandınız.", "yardim.lose":"Yardım etmeye çalıştın ama anlatamadın.",
};
// Mektep kulüpleri (Vercel school.py öğrenci topluluğu): okul çağında (7-17) haftalık pasif beceri XP'si.
export interface SchoolClub { id: string; skill: SkillKey; }
export const CLUBS: SchoolClub[] = [{ id: "koro", skill: "social" }, { id: "gures", skill: "combat" }, { id: "cirak", skill: "crafting" }];
const CLUB_TR: Record<string, string> = { koro: "Koro", gures: "Güreş", cirak: "Çıraklık" };
export function joinClub(prev: GameState, id: string | null): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead) return s;
  if (!id) { p.club = undefined; return s; }
  if (!CLUBS.find((c) => c.id === id)) return s;
  if (p.club !== id) p.club_standing = 0; // başka kulübe geçince itibar sıfırdan
  p.club = id;
  push(s, "mektep", `${CLUB_TR[id]} kulübüne katıldın; her ay sessizce gelişeceksin.`, "kişisel", false, { k: "club.join." + id });
  return s;
}
// Bir ders çalış — ayda 1 ders sınırı + 4 derste bir sınav (school.py portu).
export function studySubject(prev: GameState, id: string): StudyResult {
  const s = clone(prev); const p = s.player;
  if (p.dead) return { state: s, key: "", chips: [] };
  if (studyEnergy(s) < STUDY_COST) return { state: s, key: "", chips: [], blocked: true }; // çalışma gücü yetmiyor
  p.study_energy = studyEnergy(s) - STUDY_COST;
  p.lesson_count = (p.lesson_count || 0) + 1;
  p.hunger = Math.max(0, p.hunger - 5);
  addStatXp(s, EXAM_STAT[id] || "intelligence", 5); // dersin özelliği tecrübeyle gelişir
  const lucky = hasPerk(p, "mucit") || chance(0.5);
  const statBonus = hasPerk(p, "mucit") || chance(0.12); // serbest özellik puanı artık nadir (grind sömürüsü kapatıldı)
  const chips: { label: string; col: string }[] = [];
  let key = "";
  p.teacherBond = (p.teacherBond || 0) + 1; // hoca bağı çalıştıkça güçlenir
  if (p.teacherBond % 12 === 0) { p.stat_points += 1; chips.push({ label: "Hoca takdiri · Puan +1", col: "#E0BC5A" }); push(s, "mektep", "Hocan emeğini gördü ve seni takdir etti (özellik puanı).", "kişisel", true, { k: "club.bond" }); }
  if (id === "din") {
    bumpNam(p, "dindar", 4); chips.push({ label: "Dindar +4", col: "#9C7BC4" });
    if (lucky) { p.honor = Math.min(100, p.honor + 2); chips.push({ label: "Şeref +2", col: "#7FA66A" }); key = "ev.study.din.l"; push(s, "mektep", "Dini ilimler okudun; gönlün huzur buldu.", "kişisel", false, { k: key }); }
    else { key = "ev.study.din.p"; push(s, "mektep", "Mektepte dua ve hikmet dinledin.", "kişisel", false, { k: key }); }
  } else if (id === "matematik") {
    gainSkill(s, "trade", 5); chips.push({ label: "Ticaret +5", col: "#C9A84C" });
    if (statBonus) { p.stat_points += 1; chips.push({ label: "Özellik Puanı +1", col: "#E0BC5A" }); key = "ev.study.matematik.l"; push(s, "mektep", "Hesap çalıştın; bir özellik puanı kazandın.", "kişisel", false, { k: key }); }
    else { addStatXp(s, "intelligence", 6); key = "ev.study.matematik.p"; push(s, "mektep", "Rakamlarla boğuştun.", "kişisel", false, { k: key }); }
  } else if (id === "edebiyat") {
    gainSkill(s, "social", 5); chips.push({ label: "Sosyal +5", col: "#C9A84C" });
    if (statBonus) { p.stat_points += 1; chips.push({ label: "Özellik Puanı +1", col: "#E0BC5A" }); key = "ev.study.edebiyat.l"; push(s, "mektep", "Edebiyat çalıştın; bir özellik puanı kazandın.", "kişisel", false, { k: key }); }
    else { addStatXp(s, "charisma", 6); key = "ev.study.edebiyat.p"; push(s, "mektep", "Beyitler ezberledin.", "kişisel", false, { k: key }); }
  } else {
    gainSkill(s, "combat", 5); chips.push({ label: "Savaş +5", col: "#C9A84C" });
    if (statBonus) { p.stat_points += 1; chips.push({ label: "Özellik Puanı +1", col: "#E0BC5A" }); key = "ev.study.beden.l"; push(s, "mektep", "Beden çalıştın; bir özellik puanı kazandın.", "kişisel", false, { k: key }); }
    else { addStatXp(s, "strength", 6); key = "ev.study.beden.p"; push(s, "mektep", "Ter döktün, güçlendin.", "kişisel", false, { k: key }); }
  }
  // ── Ders-içi olay (Vercel school.py ders olayları): %40, stat testli; "cesur" sonuç anlatılır ──
  if (chance(0.4)) {
    const ev = rnd(SCHOOL_EVENTS);
    const pass = Math.random() < Math.min(0.9, 0.4 + effStat(p, ev.stat) * 0.06);
    const w = pass ? "win" : "lose";
    if (ev.id === "kopya") { if (pass) { p.honor = Math.min(100, p.honor + 4); chips.push({ label: "Şeref +4", col: "#7FA66A" }); } else { p.honor = Math.max(0, p.honor - 3); p.reputation = Math.max(-100, p.reputation - 2); chips.push({ label: "Şeref −3", col: "#C0556B" }); } }
    else if (ev.id === "kavga") { if (pass) { p.honor = Math.min(100, p.honor + 5); p.reputation = Math.min(100, p.reputation + 2); p.health = Math.max(1, p.health - 3); chips.push({ label: "Şeref +5", col: "#7FA66A" }); } else { p.health = Math.max(1, p.health - 5); chips.push({ label: "Sağlık −5", col: "#C0556B" }); } }
    else if (ev.id === "siir") { if (pass) { gainSkill(s, "social", 8); p.fame = Math.min(100, p.fame + 1); chips.push({ label: "Sosyal +8", col: "#C9A84C" }); } else { p.honor = Math.max(0, p.honor - 1); } }
    else if (ev.id === "soru") { if (pass) { p.stat_points += 1; chips.push({ label: "Özellik Puanı +1", col: "#E0BC5A" }); } }
    else if (ev.id === "yaramazlik") { if (pass) { bumpNam(p, "capkin", 2); } else { p.honor = Math.max(0, p.honor - 2); chips.push({ label: "Şeref −2", col: "#C0556B" }); } }
    else { if (pass) { p.honor = Math.min(100, p.honor + 3); gainSkill(s, "social", 6); chips.push({ label: "Sosyal +6", col: "#C9A84C" }); } }
    push(s, "mektep", `Mektep: ${SCHOOL_EV_TR[ev.id + "." + w]}`, "kişisel", false, { k: "sch." + ev.id + "." + w });
  }
  // ── Sınav: her 4 derste bir (ilgili statla test) ──
  if (p.lesson_count % 4 === 0) {
    const passed = Math.random() < Math.min(0.9, 0.35 + effStat(p, EXAM_STAT[id] || "intelligence") * 0.12);
    if (passed) { p.stat_points += 1; chips.push({ label: "Sınav geçildi · Puan +1", col: "#E0BC5A" }); push(s, "mektep", "Sınava girdin ve geçtin — bir özellik puanı kazandın.", "kişisel", true, { k: "evj.examPass" }); }
    else { chips.push({ label: "Sınavda zorlandın", col: "#C0556B" }); push(s, "mektep", "Sınava girdin ama zorlandın; daha çok çalışmalısın.", "kişisel", false, { k: "evj.examFail" }); }
  }
  return { state: s, key, chips };
}

// Kulüpte meşk et — ayda 1, kulüp çağında (7-17). Aktif çalışma: derse ek, kulübe özgü sonuç + kulüp itibarı.
export function clubPractice(prev: GameState): StudyResult {
  const s = clone(prev); const p = s.player;
  if (p.dead || !p.club) return { state: s, key: "", chips: [] };
  if (p.age < 7 || p.age >= 18) return { state: s, key: "", chips: [], blocked: true };
  if (studyEnergy(s) < STUDY_COST) return { state: s, key: "", chips: [], blocked: true }; // çalışma gücü yetmiyor
  p.study_energy = studyEnergy(s) - STUDY_COST;
  p.hunger = Math.max(0, p.hunger - 4);
  const chips: { label: string; col: string }[] = [];
  let gain = 1; let key = "";
  if (p.club === "gures") {
    const win = Math.random() < Math.min(0.9, 0.4 + effStat(p, "strength") * 0.05);
    if (win) { gainSkill(s, "combat", 10); addStatXp(s, "strength", 4); p.fame = Math.min(100, p.fame + 2); gain = 2;
      chips.push({ label: "Dövüş +10", col: "#C9A84C" }, { label: "Şöhret +2", col: "#7B4FAF" }); key = "club.gures.win";
      push(s, "mektep", "Güreş minderinde rakibini yendin; adın delikanlılar arasında anıldı.", "kişisel", true, { k: "club.gures.win" }); }
    else { gainSkill(s, "combat", 4); p.health = Math.max(1, p.health - 3);
      chips.push({ label: "Dövüş +4", col: "#C9A84C" }, { label: "Sağlık −3", col: "#C0556B" }); key = "club.gures.lose";
      push(s, "mektep", "Güreşte sırtın yere geldi; ama mindere her düşüş bir ders.", "kişisel", false, { k: "club.gures.lose" }); }
  } else if (p.club === "cirak") {
    gainSkill(s, "crafting", 10); addStatXp(s, "intelligence", 2);
    const pay = 5 + Math.floor(Math.random() * 12); p.money += pay;
    chips.push({ label: "Zanaat +10", col: "#C9A84C" }, { label: `+${pay} akçe`, col: "#E0BC5A" }); key = "club.cirak.win";
    push(s, "mektep", "Ustanın yanında bir işi bitirdin; emeğinin karşılığını cebine koydun.", "kişisel", true, { k: "club.cirak.win", p: [pay] });
  } else { // koro
    const win = Math.random() < Math.min(0.9, 0.4 + effStat(p, "charisma") * 0.05);
    if (win) { gainSkill(s, "social", 10); addStatXp(s, "charisma", 4); p.reputation = Math.min(100, p.reputation + 1); gain = 2;
      chips.push({ label: "Sosyal +10", col: "#C9A84C" }, { label: "İtibar +1", col: "#7FA66A" }); key = "club.koro.win";
      push(s, "mektep", "Koroda sesin meclisi büyüledi; el üstünde tutuldun.", "kişisel", true, { k: "club.koro.win" }); }
    else { gainSkill(s, "social", 4);
      chips.push({ label: "Sosyal +4", col: "#C9A84C" }); key = "club.koro.lose";
      push(s, "mektep", "Koroda biraz tutuldun ama gayretten geri durmadın.", "kişisel", false, { k: "club.koro.lose" }); }
  }
  p.club_standing = (p.club_standing || 0) + gain;
  if (p.club_standing % 12 === 0) { p.stat_points += 1; chips.push({ label: "Kulüp ustalığı · Puan +1", col: "#E0BC5A" }); push(s, "mektep", "Kulüpte göze girdin; ustalığın bir özellik puanıyla taçlandı.", "kişisel", true, { k: "club.milestone" }); }
  return { state: s, key, chips };
}

// Çocukluk uğraşları (7-12): okul çağı öncesi/yanı sıra çocuğa hareket alanı. Çalışma gücünden harcar.
export type ChildAct = "oyun" | "yardim" | "yaramazlik" | "kesif";
export function childAction(prev: GameState, kind: ChildAct): StudyResult {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age >= 13) return { state: s, key: "", chips: [] };
  if (studyEnergy(s) < STUDY_COST) return { state: s, key: "", chips: [], blocked: true };
  p.study_energy = studyEnergy(s) - STUDY_COST;
  p.child_acts = p.child_acts || {}; p.child_acts[kind] = (p.child_acts[kind] || 0) + 1; // çocukluk eğilimi birikir
  const chips: { label: string; col: string }[] = []; let key = "";
  if (kind === "oyun") {
    p.health = Math.min(100, p.health + 5); addStatXp(s, "stamina", 6); gainSkill(s, "social", 4);
    chips.push({ label: "Sağlık +5", col: "#7FA66A" }, { label: "Dayanıklılık ↑", col: "#C9A84C" });
    if (!p.child_friend) { // ilk oyunda bir can yoldaşı belirir
      const seed = (Math.floor(Math.random() * 1e9)) >>> 0;
      const gender: "erkek" | "kadın" = Math.random() < 0.5 ? "erkek" : "kadın";
      p.child_friend = { id: `cf_${s.turn}_${seed % 100000}`, seed, gender, bond: 14 };
      chips.push({ label: "Yeni yoldaş", col: "#C0556B" }); key = "child.friend.new";
      push(s, "cocukluk", "Oyun sırasında bir can yoldaşı edindin; günler artık daha şen.", "kişisel", true, { k: "child.friend.new", p: [{ fn: [seed, gender] }] });
    } else { // her oyun bağı güçlendirir
      const before = p.child_friend.bond;
      p.child_friend.bond = Math.min(100, before + 8 + Math.floor(Math.random() * 5));
      chips.push({ label: "Bağ ↑", col: "#C0556B" });
      const cf = p.child_friend;
      if (before < 50 && cf.bond >= 50) { key = "child.friend.close"; push(s, "cocukluk", "Yoldaşınla aranızdaki bağ pekişti; sırdaş oldunuz.", "kişisel", true, { k: "child.friend.close", p: [{ fn: [cf.seed, cf.gender] }] }); }
      else if (Math.random() < 0.35) { // küçük ortak macera (oyunu çeşitlendirir)
        const adv = Math.floor(Math.random() * 4);
        if (adv === 0) { addStatXp(s, "intelligence", 6); chips.push({ label: "Zekâ ↑", col: "#6FA0C0" }); key = "child.adv.nest"; push(s, "cocukluk", "Yoldaşınla bir kuş yuvası buldunuz; saatlerce izleyip merak ettiniz.", "kişisel", false, { k: "child.adv.nest", p: [{ fn: [cf.seed, cf.gender] }] }); }
        else if (adv === 1) { addStatXp(s, "stamina", 6); p.health = Math.min(100, p.health + 3); chips.push({ label: "Dayanıklılık ↑", col: "#C9A84C" }); key = "child.adv.hide"; push(s, "cocukluk", "Saklambaçta sokağın bütün köşelerini avucunuzun içi gibi öğrendiniz.", "kişisel", false, { k: "child.adv.hide" }); }
        else if (adv === 2) { const coin = 2 + Math.floor(Math.random() * 6); p.money += coin; chips.push({ label: `+${coin} akçe`, col: "#E0BC5A" }); key = "child.adv.find"; push(s, "cocukluk", "Yıkık bir duvarın dibinde eski bir akçe buldunuz; paylaştınız.", "kişisel", false, { k: "child.adv.find", p: [coin] }); }
        else { cf.bond = Math.min(100, cf.bond + 5); bumpNam(p, "mert", 2); chips.push({ label: "Bağ ↑↑", col: "#C0556B" }); key = "child.adv.bully"; push(s, "cocukluk", "Bir kabadayı yolunuzu kesti; yoldaşınla sırt sırta verip göğüs gerdiniz, bağınız perçinlendi.", "kişisel", true, { k: "child.adv.bully", p: [{ fn: [cf.seed, cf.gender] }] }); }
      }
      else { key = "child.oyun"; push(s, "cocukluk", "Yoldaşınla sokakta oyun oynadınız; soluk soluğa ama mutlu.", "kişisel", false, { k: "child.oyun" }); }
    }
  } else if (kind === "yardim") {
    const earn = 3 + Math.floor(Math.random() * 6); p.money += earn; p.reputation = Math.min(100, p.reputation + 1); gainSkill(s, "crafting", 4);
    chips.push({ label: `+${earn} akçe`, col: "#E0BC5A" }, { label: "İtibar +1", col: "#7FA66A" }); key = "child.yardim";
    push(s, "cocukluk", "Ev işlerinde aileye el verdin; eline biraz harçlık geçti.", "kişisel", false, { k: "child.yardim", p: [earn] });
  } else if (kind === "yaramazlik") {
    if (Math.random() < 0.5) { bumpNam(p, "capkin", 2); gainSkill(s, "social", 5); p.health = Math.min(100, p.health + 2);
      chips.push({ label: "Sosyal +5", col: "#C9A84C" }); key = "child.yaramazlik.win";
      push(s, "cocukluk", "Bir yaramazlık çevirdin ve yakayı sıyırdın; akranların kıkırdadı.", "kişisel", false, { k: "child.yaramazlik.win" }); }
    else { p.reputation = Math.max(-100, p.reputation - 2); p.honor = Math.max(0, p.honor - 1);
      chips.push({ label: "İtibar −2", col: "#C0556B" }); key = "child.yaramazlik.lose";
      push(s, "cocukluk", "Yaramazlığın elinde patladı; yakalanıp azar işittin.", "kişisel", false, { k: "child.yaramazlik.lose" }); }
  } else { // kesif
    const r = Math.random();
    if (r < 0.4) { const coin = 2 + Math.floor(Math.random() * 8); p.money += coin; chips.push({ label: `+${coin} akçe`, col: "#E0BC5A" }); key = "child.kesif.coin"; push(s, "cocukluk", "Çarşıyı arşınlarken yerde birkaç akçe buldun.", "kişisel", false, { k: "child.kesif.coin", p: [coin] }); }
    else if (r < 0.65) { const g = rnd(["ekmek", "bal", "sifa", "balik"]); p.inventory[g] = (p.inventory[g] || 0) + 1; chips.push({ label: `+${ITEMS[g]?.name || g}`, col: "#7FA66A" }); key = "child.kesif.item"; push(s, "cocukluk", "Keşfe çıktın; iyi kalpli biri eline bir şey tutuşturdu.", "kişisel", false, { k: "child.kesif.item", p: [{ i: g }] }); }
    else { addStatXp(s, "intelligence", 6); chips.push({ label: "Zekâ ↑", col: "#6FA0C0" }); key = "child.kesif.none"; push(s, "cocukluk", "Diyarı merakla gezdin; gördüklerin aklına kazındı.", "kişisel", false, { k: "child.kesif.none" }); }
  }
  return { state: s, key, chips };
}

// Çocukluk karakteri etiketleri (reşitlikte belirlenir; karakter ekranında gösterilir).
export const CHILDHOOD_LABEL: Record<string, string> = { hasari: "Haşarı", uslu: "Uslu", canli: "Canlı", merakli: "Meraklı" };
// Reşit olurken çocukluk eğilimini değerlendir: baskın uğraş kalıcı bir başlangıç izi bırakır.
function shapeChildhood(s: GameState) {
  const p = s.player; const c = p.child_acts || {};
  // Oyun yoldaşı: bağ güçlüyse seninle birlikte büyür ve ömürlük gerçek bir dosta dönüşür (ilişki grafiğine girer).
  const cf = p.child_friend;
  if (cf && cf.bond >= 40) {
    if (!s.world.npcBorn) s.world.npcBorn = [];
    if (!s.world.npcBorn.some((n) => n.id === cf.id)) {
      const tmpl = generateNPCs((cf.seed ^ 0x5bd1e995) >>> 0, 1, "tr", "cf")[0];
      s.world.npcBorn.push({ ...tmpl, id: cf.id, gender: cf.gender, nameSeed: cf.seed, loc: p.location_name, alive: true, age: p.age, bornY: worldYears(s) });
    }
    s.relationships[cf.id] = Math.max(s.relationships[cf.id] || 0, Math.min(80, cf.bond));
    push(s, "cocukluk", "Çocukluk yoldaşın seninle birlikte büyüdü; artık ömürlük bir dostun var.", "kişisel", true, { k: "child.friend.grown", p: [{ fn: [cf.seed, cf.gender] }] });
  } else if (cf) {
    push(s, "cocukluk", "Çocukluk yoldaşınla yollarınız ayrıldı; çocukluk işte, gelip geçti.", "kişisel", false, { k: "child.friend.lost", p: [{ fn: [cf.seed, cf.gender] }] });
  }
  const total = (c.oyun || 0) + (c.yardim || 0) + (c.yaramazlik || 0) + (c.kesif || 0);
  if (total < 4) return; // yeterince çocukluk geçirmedi → nötr başlar
  const entries: [string, number][] = [["yaramazlik", c.yaramazlik || 0], ["yardim", c.yardim || 0], ["oyun", c.oyun || 0], ["kesif", c.kesif || 0]];
  entries.sort((a, b) => b[1] - a[1]);
  const dom = entries[0][0];
  if (dom === "yaramazlik") { p.childhood = "hasari"; p.fear = Math.min(100, p.fear + 6); p.honor = Math.max(0, p.honor - 3); bumpNam(p, "capkin", 8); gainSkill(s, "social", 40);
    push(s, "cocukluk", "Haşarı bir çocuk olarak büyüdün; sokağın diline çabuk düştün, kimse sana laf geçiremedi.", "kişisel", true, { k: "child.grow.hasari" }); }
  else if (dom === "yardim") { p.childhood = "uslu"; p.reputation = Math.min(100, p.reputation + 6); p.honor = Math.min(100, p.honor + 4); bumpNam(p, "comert", 6); bumpNam(p, "mert", 4);
    push(s, "cocukluk", "Uslu, eli işe yatkın bir çocuk olarak büyüdün; mahalle seni hayırla anar.", "kişisel", true, { k: "child.grow.uslu" }); }
  else if (dom === "oyun") { p.childhood = "canli"; if (p.stats.stamina < 10) p.stats.stamina += 1; p.health = Math.min(100, p.health + 6); gainSkill(s, "social", 30);
    push(s, "cocukluk", "Canlı, çevik bir çocuk olarak büyüdün; bedenin sağlam, dilin tatlı.", "kişisel", true, { k: "child.grow.canli" }); }
  else { p.childhood = "merakli"; if (p.stats.intelligence < 10) p.stats.intelligence += 1; gainSkill(s, "trade", 25); gainSkill(s, "crafting", 25);
    push(s, "cocukluk", "Meraklı, gözü açık bir çocuk olarak büyüdün; her şeyi sorar, çabuk kaparsın.", "kişisel", true, { k: "child.grow.merakli" }); }
}

// İhtiyarlık uğraşları (55+): hayatın akşamına anlam — nasihat, hayır, dinlenme, anı. Çalışma gücünden harcar.
export type ElderAct = "nasihat" | "hayir" | "dinlen" | "ani";
export function elderAction(prev: GameState, kind: ElderAct): StudyResult {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 55) return { state: s, key: "", chips: [] };
  if (studyEnergy(s) < STUDY_COST) return { state: s, key: "", chips: [], blocked: true };
  p.study_energy = studyEnergy(s) - STUDY_COST;
  const chips: { label: string; col: string }[] = []; let key = "";
  if (kind === "nasihat") {
    p.reputation = Math.min(100, p.reputation + 2); p.honor = Math.min(100, p.honor + 1); gainSkill(s, "social", 6);
    chips.push({ label: "İtibar +2", col: "#7FA66A" }, { label: "Şeref +1", col: "#6FA0C0" }); key = "elder.nasihat";
    push(s, "ihtiyarlik", "Gençlere ve torunlara akıl verdin; sözün hürmetle dinlendi.", "kişisel", false, { k: "elder.nasihat" });
  } else if (kind === "hayir") {
    const cost = Math.min(p.money, 12 + Math.floor(Math.random() * 10));
    p.money -= cost; p.reputation = Math.min(100, p.reputation + 2); p.honor = Math.min(100, p.honor + 1); bumpNam(p, "comert", 5);
    chips.push({ label: `−${cost} akçe`, col: "#C0556B" }, { label: "İtibar +2", col: "#7FA66A" }, { label: "Cömert +5", col: "#7FA66A" }); key = "elder.hayir";
    push(s, "ihtiyarlik", `Yoksula sadaka, yolcuya aş dağıttın (−${cost} akçe); hayır duası aldın.`, "kişisel", false, { k: "elder.hayir", p: [cost] });
  } else if (kind === "dinlen") {
    p.health = Math.min(100, p.health + 8); p.hunger = Math.min(100, p.hunger + 5);
    chips.push({ label: "Sağlık +8", col: "#7FA66A" }); key = "elder.dinlen";
    push(s, "ihtiyarlik", "Ocağın başında dinlenip biraz toparlandın; yaşlı beden mola ister.", "kişisel", false, { k: "elder.dinlen" });
  } else {
    p.fame = Math.min(100, p.fame + 2); addStatXp(s, "intelligence", 6); gainSkill(s, "social", 4);
    chips.push({ label: "Şöhret +2", col: "#7B4FAF" }); key = "elder.ani";
    push(s, "ihtiyarlik", "Ömrünün hikâyesini anlattın; adın dilden dile dolaşacak.", "kişisel", false, { k: "elder.ani" });
  }
  return { state: s, key, chips };
}

// ── Suç/Gölge: risk/ödül ──
// Suç türleri (Vercel crime_rework.py portu): risk/ödül kademeleri + şiddet.
export type CrimeKind = "yankesicilik" | "dukkan_soyma" | "soygun" | "konak_soygunu";
export const CRIME_TYPES: Record<CrimeKind, { base: number; lootMin: number; lootMax: number; fine: number; hurt: number; fear: number; nam: number; sev: number; label: string }> = {
  yankesicilik:  { base: 0.70, lootMin: 6,  lootMax: 22,  fine: 10, hurt: 3,  fear: 2, nam: 2, sev: 1, label: "Bir yankesicilik" },
  dukkan_soyma:  { base: 0.55, lootMin: 18, lootMax: 45,  fine: 22, hurt: 6,  fear: 4, nam: 4, sev: 2, label: "Bir dükkân soygunu" },
  soygun:        { base: 0.45, lootMin: 25, lootMax: 65,  fine: 30, hurt: 10, fear: 5, nam: 5, sev: 3, label: "Bir yol soygunu" },
  konak_soygunu: { base: 0.34, lootMin: 50, lootMax: 110, fine: 50, hurt: 14, fear: 7, nam: 7, sev: 4, label: "Bir konak soygunu" },
};
export function doCrime(prev: GameState, kind: CrimeKind): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13) return s;
  const ct = CRIME_TYPES[kind] || CRIME_TYPES.yankesicilik;
  const golgeBonus = p.faction === "golge" ? 0.12 : 0;     // Gölge Kardeşliği avantajı
  const hasariBonus = p.childhood === "hasari" ? 0.07 : 0; // haşarı çocukluk: sokak kurnazlığı işe yarar
  const success = Math.random() < ct.base + p.stats.charisma * 0.01 + golgeBonus + hasariBonus + crimeSuccessMod(s);
  gainSkill(s, "social", 4);
  if (success) {
    const loot = ct.lootMin + Math.floor(Math.random() * (ct.lootMax - ct.lootMin + 1));
    // Büyük soygunlarda ganimetin bir kısmı SICAK MAL: nakde çevrilmesi (eritme) riskli.
    const hot = ct.sev >= 3 ? Math.round(loot * 0.45) : 0;
    const cash = loot - hot;
    p.money += cash; if (hot > 0) p.hotGoods = (p.hotGoods || 0) + hot;
    p.fear = Math.min(100, p.fear + ct.fear);
    bumpNam(p, "zalim", ct.nam);
    witnessScandal(s, kind === "yankesicilik" || kind === "dukkan_soyma" ? "hirsizlik_tanigi" : "suc_tanigi", 0.22);
    const why = dread(s) > 30 ? " Korkulan adın kurbanını dondurdu." : "";
    push(s, "suç", `${ct.label} işini başardın (+${cash} akçe).${why}`, "kişisel", false, { k: "evj.crimeWin", p: [{ cr: kind }, cash, dread(s) > 30 ? { sfx: "sfx.crimeDread" } : ""] });
    if (hot > 0) push(s, "suç", `Ganimetin ${hot} akçelik kısmı sıcak mal; eritmek için kara borsa lazım.`, "kişisel", false, { k: "crime.hotGot", p: [hot] });
    return s;
  }
  // ── Kesinti anı (Vercel interrupt sahnesi): yakalanmak üzeresin — oyuncu seçer (Saklan/Rüşvet/Kaç).
  s.pendingScene = { kind: "crime", ctx: { crime: kind } };
  return s;
}

// Sıcak malı erit (kara borsa): gölge loncası iyi oran + düşük risk; diğerleri kötü oran + yakalanma riski.
export function fenceHotGoods(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  const hot = p.hotGoods || 0; if (hot <= 0 || p.dead) return s;
  const golge = p.faction === "golge";
  p.hotGoods = 0;
  if (Math.random() < (golge ? 0.05 : 0.18)) {
    const fine = Math.round(hot * 0.4);
    p.money = Math.max(0, p.money - fine); p.fear = Math.min(100, p.fear + 3); p.reputation = Math.max(-100, p.reputation - 3);
    push(s, "suç", `Sıcak malı eritirken yakalandın; ${fine} akçe ceza ve leke.`, "kişisel", true, { k: "crime.fenceCaught", p: [fine] });
  } else {
    const got = Math.round(hot * (golge ? 0.8 : 0.55));
    p.money += got; gainSkill(s, "trade", 4);
    push(s, "suç", `Sıcak malı kara borsada erittin (+${got} akçe).`, "kişisel", false, { k: "crime.fenceWin", p: [got] });
  }
  return s;
}
// Suç kesinti sahnesinin sonucunu uygula (Saklan/Rüşvet/Kaç). UI s.pendingScene'i görünce çağırır.
export function resolveCrimeScene(prev: GameState, choice: "saklan" | "rusvet" | "kac"): GameState {
  const s = clone(prev); const p = s.player;
  const kind = (s.pendingScene?.ctx?.crime as CrimeKind) || "yankesicilik";
  s.pendingScene = null;
  const ct = CRIME_TYPES[kind] || CRIME_TYPES.yankesicilik;
  const golgeBonus = p.faction === "golge" ? 0.12 : 0;
  let escaped = false; let scratch = 0; let note: { k: string; p?: EvtParam[] };
  if (choice === "saklan") {
    // Saklan: gizlenme testi (dayanıklılık + gölge). Sessiz kaçış.
    const chance = 0.42 + p.stats.stamina * 0.03 + golgeBonus - ct.sev * 0.04;
    escaped = Math.random() < Math.max(0.08, chance);
    gainSkill(s, "social", 3);
    note = { k: escaped ? "crimesc.hideWin" : "crimesc.hideLose" };
  } else if (choice === "rusvet") {
    // Rüşvet: para ile sustur. Yeterli akçe varsa kaçarsın ama %30 rüşvet söylentisi doğar.
    const cost = Math.round(ct.fine * 1.2);
    if (p.money >= cost) {
      p.money -= cost; escaped = true;
      if (Math.random() < 0.3) { bumpNam(p, "zalim", 3); p.reputation = Math.max(-100, p.reputation - 3); note = { k: "crimesc.bribeLeak", p: [cost] }; }
      else note = { k: "crimesc.bribeWin", p: [cost] };
    } else { escaped = false; note = { k: "crimesc.bribePoor" }; }
  } else {
    // Kaç: atletik test (güç + dayanıklılık). Başarırsan sıyrıkla kurtulursun.
    const chance = 0.34 + (p.stats.strength + p.stats.stamina) * 0.025 + golgeBonus - ct.sev * 0.03;
    escaped = Math.random() < Math.max(0.06, chance);
    if (escaped) { scratch = 2 + Math.floor(Math.random() * (ct.sev * 2)); p.health = Math.max(1, p.health - scratch); }
    gainSkill(s, "combat", 4);
    note = { k: escaped ? "crimesc.runWin" : "crimesc.runLose", p: escaped ? [scratch] : undefined };
  }
  if (escaped) {
    p.fear = Math.min(100, p.fear + 1);
    push(s, "suç", `Kesintiyi atlattın.`, "kişisel", true, note);
    return s;
  }
  // Kaçamadın → yakalandın.
  crimeCaught(s, kind);
  return s;
}

// Yakalanma cezasını uygula (kesinti sahnesinden veya doğrudan). Şiddete göre ceza + tanık + tohum.
function crimeCaught(s: GameState, kind: CrimeKind) {
  const p = s.player; const ct = CRIME_TYPES[kind] || CRIME_TYPES.yankesicilik;
  const fine = Math.min(p.money, ct.fine);
  const hurt = Math.round(ct.hurt * (p.faction === "asker" ? 0.5 : 1));
  const extra = crimeCaughtPenalty(s);
  p.money -= fine; p.reputation = Math.max(-100, p.reputation - 6 - ct.sev * 2 - extra); p.health = Math.max(0, p.health - hurt);
  witnessScandal(s, kind === "yankesicilik" || kind === "dukkan_soyma" ? "hirsizlik_tanigi" : "suc_tanigi", 0.7);
  if (ct.sev >= 3 && Math.random() < 0.5) sowSeed(s, { kaynak: "suc_gecmisi", hmin: 24, hmax: 120, agirlik: "orta", nesil: false, etki: { money: -30, reputation: -4 } });
  push(s, "suç_yakalandı", `Yakalandın! ${fine} akçe ceza, itibarın sarsıldı.`, "kişisel", true, { k: "evj.crimeCaught", p: [fine, extra >= 4 ? { sfx: "sfx.crimeHard" } : ""] });
  if (p.health <= 0) die(s, `${p.name}, suçüstü yakalanıp can verdi.`, { k: "evj.dieCrime", p: [p.name] });
}

// ── Fırsat: kabul edilince stat'a göre çözülür ──
export interface Opportunity { id: string; key: string; title: string; desc: string; reward: number; risk: number; stat: keyof Stats; }
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
    push(s, "görev_tamamlandı", `"${opp.title}" görevini başardın (+${reward} akçe).`, "kişisel", true, { k: "evj.oppWin", p: [{ opp: opp.key }, reward] });
  }
  else { p.reputation = Math.max(-100, p.reputation - 3); push(s, "görev_başarısız", `"${opp.title}" görevinde başarısız oldun.`, "kişisel", false, { k: "evj.oppLose", p: [{ opp: opp.key }] }); }
  return s;
}

// Tura göre deterministik fırsat listesi.
export function opportunitiesFor(s: GameState): Opportunity[] {
  const pool: Omit<Opportunity, "id">[] = [
    { key: "pazar_duzen", title: "Pazarda Düzen", desc: "Voyvoda kavgayı yatıştırmanı istiyor.", reward: 30, risk: 0.4, stat: "charisma" },
    { key: "kervan_muhafiz", title: "Kervan Muhafızlığı", desc: "Tehlikeli yolda kervana eşlik et.", reward: 60, risk: 0.6, stat: "strength" },
    { key: "sifa_ot", title: "Şifalı Ot Topla", desc: "Şifacı için dağdan ot getir.", reward: 20, risk: 0.25, stat: "stamina" },
    { key: "hesap_tut", title: "Hesap Tut", desc: "Tüccarın defterini düzelt.", reward: 25, risk: 0.3, stat: "intelligence" },
    // ── Vercel opportunities.py'den ek fırsatlar ──
    { key: "kurt_avi", title: "Kurt Avı", desc: "Köyü basan kurt sürüsünü avla.", reward: 55, risk: 0.55, stat: "strength" },
    { key: "alacak_tahsil", title: "Alacak Tahsili", desc: "Borçlu bir esnaftan tüccarın alacağını topla.", reward: 35, risk: 0.45, stat: "charisma" },
    { key: "haber_gotur", title: "Haber Götür", desc: "Komşu sancağa acele bir mektup ulaştır.", reward: 28, risk: 0.35, stat: "stamina" },
    { key: "kopru_onarim", title: "Köprü Onarımı", desc: "Sel basmış köprünün onarımına el ver.", reward: 32, risk: 0.4, stat: "strength" },
    { key: "sinir_devriye", title: "Sınır Devriyesi", desc: "Sancak beyi için sınır yolunu kolla.", reward: 48, risk: 0.5, stat: "strength" },
    { key: "dugun_kahya", title: "Düğün Kâhyalığı", desc: "Bir konağın düğün hazırlığını yönet.", reward: 38, risk: 0.3, stat: "charisma" },
    { key: "mahkeme_sahit", title: "Mahkeme Şahitliği", desc: "Kadı huzurunda adil bir ifade ver.", reward: 26, risk: 0.35, stat: "intelligence" },
    { key: "maden_kesfi", title: "Maden Keşfi", desc: "Dağ eteğinde damar olduğu söylenen yeri araştır.", reward: 70, risk: 0.65, stat: "intelligence" },
    // ── Yaşayan dünyaya bağlı fırsatlar (vefat/düğün/yetim) ──
    { key: "miras_katibi", title: "Miras Kâtibi", desc: "Vefat eden bir konak sahibinin mirasını adilce paylaştır.", reward: 42, risk: 0.4, stat: "intelligence" },
    { key: "dugun_sazi", title: "Düğün Sazı", desc: "Bir düğünde saz çalıp meclisi şenlendir.", reward: 30, risk: 0.3, stat: "charisma" },
    { key: "yetime_kanat", title: "Yetime Kanat", desc: "Kimsesiz kalmış bir çocuğa kol kanat ger.", reward: 24, risk: 0.3, stat: "charisma" },
    { key: "hasat_imece", title: "Hasat İmecesi", desc: "Köyün hasadına imece ile omuz ver.", reward: 28, risk: 0.35, stat: "stamina" },
    { key: "kayip_cocuk", title: "Kayıp Çocuk", desc: "Pazarda kaybolan bir çocuğu bul.", reward: 34, risk: 0.45, stat: "intelligence" },
    { key: "esnaf_arasi", title: "Esnaf Arası", desc: "Kavgaya tutuşan iki esnafı ayır.", reward: 30, risk: 0.45, stat: "strength" },
  ];
  const seed = (s.turn * 2654435761) >>> 0;
  return pool.filter((_, i) => ((seed >> i) & 1) === 1 || i === seed % pool.length)
    .map((o, i) => ({ ...o, id: `opp_${s.turn}_${i}` }));
}

// Mülk satın al
export function buyProperty(prev: GameState, type: string): GameState {
  const s = clone(prev); const p = s.player; const t = PROPERTY_TYPES[type];
  const cost = propBuyCost(s, type);
  if (!t || p.dead || p.money < cost) return s;
  p.money -= cost; p.properties.push({ type, loc: p.location_name, cond: 100 });
  push(s, "mülk_alım", `${p.location_name}'de ${t.name} satın aldın. Adına bir tapu daha.`, "kişisel", true, { k: "evj.propBuy", p: [{ pl: p.location_name }, { pt2: type }] });
  return s;
}
// Onarım bedeli (eksik kondisyonla orantılı).
export function repairCost(pr: Property): number { return Math.max(1, Math.round((PROPERTY_TYPES[pr.type]?.cost || 100) * 0.3 * (100 - pr.cond) / 100)); }
export function repairProperty(prev: GameState, index: number): GameState {
  const s = clone(prev); const p = s.player; const pr = p.properties[index];
  if (!pr || pr.cond >= 100) return s;
  const cost = repairCost(pr); if (p.money < cost) return s;
  p.money -= cost; pr.cond = 100;
  push(s, "mülk", `${PROPERTY_TYPES[pr.type]?.name || "Mülk"} (${pr.loc}) onarıldı (−${cost} akçe).`, "kişisel", false, { k: "evj.propRepair", p: [{ pt2: pr.type }, { pl: pr.loc }, cost] });
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
  push(s, "nesil_yatirim", `${childName} için ${inv.label.toLowerCase()} yatırımı yaptın.`, "kişisel", false, { k: "evj.genInvest", p: [childName, { invl: inv.id }] });
  return s;
}

// Çocuk için süregelen eğitim yolu belirle/kaldır — haftalık masraf advance() içinde işlenir.
// Aynı yola devam edersen birikim korunur; yön değiştirirsen sıfırdan başlar (emek boşa gitmesin diye uyarı UI'da).
export function setChildEducation(prev: GameState, childName: string, trackId: string | null): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || !p.children.includes(childName)) return s;
  if (!p.child_edu) p.child_edu = {};
  if (!trackId) { delete p.child_edu[childName]; return s; }
  const tr = EDU_TRACKS.find((x) => x.id === trackId); if (!tr) return s;
  const cur = p.child_edu[childName];
  p.child_edu[childName] = { track: trackId, weeks: cur && cur.track === trackId ? cur.weeks : 0 };
  push(s, "nesil_yatirim", `${childName} ${tr.label.toLowerCase()}'na verildi; her ay emek ve akçe ister.`, "kişisel", false, { k: "edu.set", p: [childName, { edul: trackId }] });
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
  // Süregelen eğitim yolu: biriken aylara göre ölçekli bonus (Vercel apply_child_bonus portu).
  const edu = p.child_edu && p.child_edu[heir];
  if (edu) {
    const tr = EDU_TRACKS.find((x) => x.id === edu.track);
    const lvl = eduLevel(edu.weeks);
    if (tr && lvl > 0) {
      if (tr.stat) stats[tr.stat] = Math.min(10, stats[tr.stat] + lvl);
      if (tr.skill) skills[tr.skill] = Math.min(10, skills[tr.skill] + lvl);
      startRep += lvl; // köklü eğitim saygınlık katar
      investNotes.push(`${tr.label.toLowerCase()}nda yetişmiş (${lvl}. kademe)`);
    }
  }
  const ancestor: DynastyRecord = {
    generation: p.generation, name: p.name, profession: p.profession === "işsiz" ? "—" : p.profession,
    diedAge: p.age, fame: Math.round(p.fame), reputation: Math.round(p.reputation), faction: p.faction,
    note: dynastyNote(p),
  };
  const dynasty = [...(prev.dynasty || []), ancestor];
  const noteStr = investNotes.length ? ` ${heir}, ${investNotes.join(", ")} olarak yetişti.` : "";
  const ns: GameState = {
    turn: 0, seed: Math.floor(Math.random() * 1e9), world: { ready: true, npcEvo: prev.world?.npcEvo, npcBorn: prev.world?.npcBorn, npcYears: (prev.world?.npcYears || 0) + Math.floor(prev.turn / 12), inflation: prev.world?.inflation || 1 }, relationships: {}, dynasty, npc_state: {},
    // Hanedan hafızası vârise geçer: ataların tamamladığı yaylar bayrak olarak kalır, az da olsa anlatı momentumu verir.
    story: { active: null, completed: [], tension: Math.min(20, Object.keys(prev.story?.flags || {}).length * 3), nemesis: null, flags: { ...(prev.story?.flags || {}) }, lull: 0 }, wars: [], caravan: null, econ: 1,
    settlements: prev.settlements || [], // dynastinin kurduğu yerleşimler vârise kalır
    seeds: (prev.seeds || []).filter((t) => t.nesil), // sadece nesil aşabilen tohumlar vârise geçer
    player_rumors: [],
    player: {
      name: surname ? `${heir} ${surname}` : heir, surname, gender: Math.random() < 0.5 ? "erkek" : "kadın",
      base_age: 7, age: 7, money: startMoney, profession: "işsiz", health: startHealth, hunger: 100,
      reputation: Math.max(-100, Math.min(100, startRep)), honor: 0, fear: 0, fame: Math.floor(p.fame / 3),
      stats, stat_points: startPoints,
      dead: false, location_name: p.location_name, home_name: p.home_name || p.location_name, married: false, spouse_name: null, children: [],
      mother: p.gender === "erkek" ? (p.spouse_name || rnd(SPOUSE_K)) : p.name, father: p.gender === "erkek" ? p.name : (p.spouse_name || rnd(SPOUSE_E)),
      // Eş tarafı ebeveyn kültürel tohumla (dile göre çözülür); önceki oyuncu tarafı kendi adıyla kalır.
      mother_seed: p.gender === "erkek" ? p.spouse_seed : undefined, father_seed: p.gender === "erkek" ? undefined : p.spouse_seed,
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

// Bir fraksiyon, oyuncunun bulunduğu yerin sancağına hâkim mi? (emergent şehir-kontrolü etkisi)
export function factionHoldsHere(s: GameState, factionId: string | null): boolean {
  if (!factionId) return false;
  const region = regionOf(s.player.location_name);
  return (s.realm || defaultRealm()).some((r) => r.id === region && r.holder === factionId);
}
// Bulunduğun sancağı tutan lonca, senin loncana göre dost mu düşman mı? +1 dost/kendi, -1 düşman, 0 nötr/loncasız.
export function factionLocalFavor(s: GameState): number {
  const fid = s.player.faction; if (!fid) return 0;
  const region = regionOf(s.player.location_name);
  const sn = (s.realm || defaultRealm()).find((r) => r.id === region); if (!sn) return 0;
  if (sn.holder === fid) return 1;
  const st = factionStance(fid, sn.holder);
  return st > 0 ? 1 : st < 0 ? -1 : 0;
}
export function doFactionTask(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const f = factionById(id);
  if (!f || p.dead || p.age < 13) return s;
  const rank = factionRank(p.faction_standing[id] || 0);            // rütbe ödülü ölçekler
  const statBonus = p.stats[f.stat] * 2;
  // Loncan bu sancağa hâkimse burada daha güçlüsün: görev daha çok kazandırır.
  const dom = factionHoldsHere(s, id) ? 1.25 : 1;
  let reward = Math.round((f.task.reward + statBonus + Math.floor(Math.random() * 8)) * rank.mult * dom);
  if (id === "tuccar" && hasPerk(p, "guvenli_kervan")) reward = Math.round(reward * 1.5);
  p.money += reward; p.hunger = Math.max(0, p.hunger - 6);
  let standing = f.task.standing * factionStandingMod(s, id) * dom;
  if (hasPerk(p, "lider")) standing = standing * 1.5;
  standing = Math.round(standing);
  p.faction_standing[id] = (p.faction_standing[id] || 0) + standing;
  p.reputation = Math.min(100, p.reputation + 2);
  gainSkill(s, f.stat === "strength" ? "combat" : f.stat === "charisma" ? "social" : "trade", 6);
  const domNote = dom > 1 ? " Loncan bu sancağa hâkim — sözün daha çok geçti." : "";
  push(s, "örgüt_görev", `${f.name} için "${f.task.label}" görevini gördün (+${reward} akçe, itibar arttı).${domNote}`, "kişisel", false, { k: "evj.factionTask", p: [{ fc: id }, { ftl: id }, reward, dom > 1 ? { sfx: "sfx.factionDom" } : ""] });
  return s;
}

// ── Fraksiyon AI (Vercel faction_system AI özü) — örgütler dünyada görünür eylemler yapar (haber + gerçek etki) ──
// Kıvılcım kartları (Vercel story_director _draw_spark): durgunlukta küçük bir an dünyayı hatırlatır.
function sparkCard(s: GameState) {
  const p = s.player;
  const card = rnd(["yabanci", "eskidost", "kese", "yolcu", "ruya"]);
  if (card === "yabanci") { p.reputation = Math.min(100, p.reputation + 1); push(s, "fisilti", "Bir yabancı yolda iki çift laf edip bir haber bıraktı.", "kişisel", false, { k: "spark.yabanci" }); }
  else if (card === "eskidost") { gainSkill(s, "social", 6); push(s, "sohbet", "Eski bir dost çıkageldi; hâl hatır sorup gönlünü ferahlattın.", "kişisel", false, { k: "spark.eskidost" }); }
  else if (card === "kese") { const g = 5 + Math.floor(Math.random() * 9); p.money += g; push(s, "gunluk", `Yolda küçük bir kese buldun (+${g} akçe).`, "kişisel", false, { k: "spark.kese", p: [g] }); }
  else if (card === "yolcu") { p.fame = Math.min(100, p.fame + 1); push(s, "fisilti", "Bir yolcunun uzak diyar masalı dilden dile yayıldı; adın da geçti.", "kişisel", false, { k: "spark.yolcu" }); }
  else { push(s, "gunluk", "Gece tuhaf bir rüya gördün; sabaha içinde bir his kaldı.", "kişisel", false, { k: "spark.ruya" }); }
  if (s.story) s.story.lull = 0;
}
function factionAITick(s: GameState) {
  if (Math.random() >= 0.14) return;
  const f = FACTIONS[Math.floor(Math.random() * FACTIONS.length)];
  const act = rnd(factionTrait(f.id).acts); // eylem fraksiyonun karakterine göre (şifacı asla sabotaj/suikast/darbe yapmaz)
  if (act === "bagis") {
    if (s.player.faction === f.id) { s.player.faction_standing[f.id] = (s.player.faction_standing[f.id] || 0) + 4; const g = 6 + Math.floor(Math.random() * 10); s.player.money += g; push(s, "örgüt", `${f.name} kasasını açtı; üyelerine pay dağıttı (+${g} akçe).`, "makro", false, { k: "fai.bagis.member", p: [{ fc: f.id }, g] }); }
    else push(s, "örgüt", `${f.name} yoksullara sadaka dağıttı; halkın gözünde itibar kazandı.`, "makro", false, { k: "fai.bagis", p: [{ fc: f.id }] });
  } else if (act === "sabotaj") {
    const loc = rnd(LOCATIONS);
    if (!(s.locEvents || []).some((e) => e.loc === loc)) { if (!s.locEvents) s.locEvents = []; s.locEvents.push({ id: Math.random().toString(36).slice(2, 10), loc, type: "eskiya", hafta: s.turn, until: s.turn + 3 + Math.floor(Math.random() * 3) }); s.locEvents = s.locEvents.slice(-4); }
    push(s, "örgüt", `${f.name}'in eli olduğu söylenen bir karışıklık ${loc}'i sardı.`, "makro", true, { k: "fai.sabotaj", p: [{ fc: f.id }, { pl: loc }] });
  } else if (act === "nufuz") {
    const realm = ensureRealm(s); const sn = realm[Math.floor(Math.random() * realm.length)];
    sn.tension = Math.min(120, sn.tension + 12);
    push(s, "örgüt", `${f.name}, ${beylikName(sn.id)} üzerinde nüfuzunu artırıyor.`, "makro", false, { k: "fai.nufuz", p: [{ fc: f.id }, { bl: sn.id }] });
  } else if (act === "suikast") {
    const rivals = ensureRivals(s); if (rivals.length) { const rv = rivals[Math.floor(Math.random() * rivals.length)]; rv.power = Math.max(1, Math.round(rv.power * 0.85)); }
    push(s, "örgüt", `Karanlık bir suikast şehirleri çalkaladı; parmaklar ${f.name}'i gösteriyor.`, "makro", true, { k: "fai.suikast", p: [{ fc: f.id }] });
  } else if (act === "darbe") { // darbe: SALDIRGAN fraksiyon (f) sahibi olmadığı, müttefiki olmayan yüksek-gerilimli sancağı ele geçirmeye çalışır
    const realm = ensureRealm(s);
    const hot = realm.filter((sn) => sn.tension >= 45 && sn.holder !== f.id && factionStance(f.id, sn.holder) <= 0 && !s.wars.some((w) => w.prize === sn.id));
    if (hot.length) {
      const sn = hot[Math.floor(Math.random() * hot.length)];
      if (Math.random() < 0.5) {
        const old = sn.holder; sn.holder = f.id; sn.contender = null; sn.tension = 40;
        if (f.id === s.player.faction) s.player.faction_standing[f.id] = (s.player.faction_standing[f.id] || 0) + 8;
        push(s, "ocak_savasi", `Darbe! ${f.name}, ${beylikName(sn.id)}'i ${factionById(old)?.name}'in elinden aldı.`, "makro", true, { k: "fai.darbe", p: [{ fc: f.id }, { bl: sn.id }, { fc: old }] });
      } else {
        sn.tension = Math.max(0, sn.tension - 20);
        push(s, "ocak_savasi", `${beylikName(sn.id)}'de bir darbe girişimi bastırıldı; ortalık yatıştı.`, "makro", false, { k: "fai.darbeFail", p: [{ bl: sn.id }] });
      }
    }
  } else { // üye toplama — sadece oyuncu aday durumundaysa anlamlı
    if (s.player.faction !== f.id && (s.player.faction_standing[f.id] || 0) < f.joinRep)
      push(s, "örgüt", `${f.name} saflarına yeni yiğitler arıyor; kapısı çalınmayı bekliyor.`, "makro", false, { k: "fai.uye", p: [{ fc: f.id }] });
  }
}
// Oyuncu-güç yüzeyi: örgütün gücünü kullan (Güvenilir rütbe+). İtibar harcar, gerçek fayda verir.
export const FAC_POWER_COST = 20;
export function canUseFactionPower(p: Player): boolean {
  const fid = p.faction; if (!fid) return false;
  const st = p.faction_standing[fid] || 0;
  return factionRankIndex(st) >= 1 && st >= FAC_POWER_COST;
}
export function useFactionPower(prev: GameState, kind: "himaye" | "kese"): GameState {
  const s = clone(prev); const p = s.player; const fid = p.faction;
  if (!fid || !canUseFactionPower(p)) return s;
  const f = factionById(fid);
  p.faction_standing[fid] = (p.faction_standing[fid] || 0) - FAC_POWER_COST;
  if (kind === "himaye") { // örgüt himayesi: korku düşer, itibar artar, bir söylenti bastırılır
    p.fear = Math.max(0, p.fear - 6); p.reputation = Math.min(100, p.reputation + 3);
    if (s.player_rumors?.length) s.player_rumors = s.player_rumors.slice(1);
    push(s, "örgüt", `${f?.name} seni kanadı altına aldı; düşmanların geri çekildi.`, "kişisel", true, { k: "fac.powHimaye", p: [{ fc: fid }] });
  } else { // örgüt kasası: para desteği
    const g = 25 + Math.floor(Math.random() * 25); p.money += g;
    push(s, "örgüt", `${f?.name} kasasından destek aldın (+${g} akçe).`, "kişisel", false, { k: "fac.powKese", p: [{ fc: fid }, g] });
  }
  return s;
}
// Bir örgüte katıl: yeterli örgüt itibarı (görevle kazanılır) gerekir. Tek örgüt üyeliği.
// Bir fraksiyona geri dönüş yasağı sürüyor mu (kaç tur kaldı; 0 = yasak yok).
export function factionBanLeft(p: Player, id: string, turn: number): number {
  return Math.max(0, (p.factionBans?.[id] ?? 0) - turn);
}
export function joinFaction(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const f = factionById(id);
  if (!f || p.dead || p.age < 13) return s;
  if (p.faction === id) return s;
  if (factionBanLeft(p, id, s.turn) > 0) { push(s, "örgüt_katılım", `${f.name} seni henüz geri almıyor; saflarını terk edenin sözü ağır.`, "kişisel", false, { k: "evj.facBanned", p: [{ fc: f.id }] }); return s; }
  const need = hasPerk(p, "karizmatik") ? Math.round(f.joinRep * 0.8) : f.joinRep;
  if ((p.faction_standing[id] || 0) < need) return s;
  p.faction = id; p.reputation = Math.min(100, p.reputation + 6);
  push(s, "örgüt_katılım", `${f.name} saflarına katıldın. ${f.perk}`, "kişisel", true, { k: "evj.facJoin", p: [{ fc: f.id }, f.perk] });
  return s;
}

// Örgütten ayrıl.
export function leaveFaction(prev: GameState): GameState {
  const s = clone(prev); const p = s.player; const f = factionById(p.faction);
  if (!f) return s;
  const fid = f.id;
  p.faction = null; p.reputation = Math.max(-100, p.reputation - 4);
  // Geri dönüş yasağı tırmanır: ilk ayrılış 26 tur, ikinci 52, üçüncü+ kalıcıya yakın (156).
  if (!p.factionLeaves) p.factionLeaves = {};
  if (!p.factionBans) p.factionBans = {};
  p.factionLeaves[fid] = (p.factionLeaves[fid] || 0) + 1;
  const cd = p.factionLeaves[fid] >= 3 ? 156 : p.factionLeaves[fid] === 2 ? 52 : 26;
  p.factionBans[fid] = s.turn + cd;
  p.faction_standing[fid] = Math.round((p.faction_standing[fid] || 0) * 0.5); // itibar yarılanır
  push(s, "örgüt_ayrılma", `${f.name} saflarından ayrıldın; bir süre geri alınmazsın.`, "kişisel", false, { k: "evj.facLeave", p: [{ fc: f.id }] });
  return s;
}

// ── Sosyal mevki: itibar · şeref · korku · şöhret ──
// Mevki kademeleri (değere göre unvan).
export interface SocialAxis { key: "reputation" | "honor" | "fear" | "fame"; label: string; icon: string; tiers: string[]; desc: string; }
export const SOCIAL_AXES: SocialAxis[] = [
  { key: "reputation", label: "İtibar", icon: "karakter", desc: "Halkın gözündeki saygınlığın.", tiers: ["Lekeli", "Sıradan", "Hatırı Sayılır", "Saygın", "Diyarın İncisi"] },
  { key: "honor", label: "Şeref", icon: "medal", desc: "Sözünün ve adaletinin ağırlığı.", tiers: ["Onursuz", "Sıradan", "Mert", "Şerefli", "Erdemin Timsali"] },
  { key: "fear", label: "Korku", icon: "skull", desc: "Adının uyandırdığı çekince.", tiers: ["Zararsız", "Bilinen", "Çekinilen", "Korkulan", "Diyarın Kâbusu"] },
  { key: "fame", label: "Şöhret", icon: "crown", desc: "Adının ne kadar uzağa ulaştığı.", tiers: ["Meçhul", "Tanınan", "Ünlü", "Meşhur", "Destanlaşan"] },
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
  if (p.money < cost) { push(s, "sosyal", "Ziyafet verecek akçen yok.", "kişisel", false, { k: "evj.noFeast" }); return s; }
  let fame = 8, rep = 5;
  if (hasPerk(p, "sohret_avcisi")) fame += 5;
  if (hasPerk(p, "diplomat")) { fame = Math.round(fame * 1.5); rep = Math.round(rep * 1.5); }
  p.money -= cost; p.fame = Math.min(100, p.fame + fame); p.reputation = Math.min(100, p.reputation + rep);
  gainSkill(s, "social", 5); bumpNam(p, "comert", 8);
  const why = recognition(s) > 0.5 ? " Tanınan biri olduğundan ziyafetin çok konuşuldu." : "";
  push(s, "sosyal", `Köye bir ziyafet verdin; adın dilden dile dolaştı.${why}`, "kişisel", true, { k: "evj.feast", p: [recognition(s) > 0.5 ? { sfx: "sfx.feastWhy" } : ""] });
  return s;
}

// Sadaka dağıt: akçe harcayıp şeref + itibar kazan.
export function giveAlms(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13) return s;
  const cost = 15;
  if (p.money < cost) { push(s, "sosyal", "Sadaka verecek akçen yok.", "kişisel", false, { k: "evj.noAlms" }); return s; }
  let honor = 7, rep = 3;
  if (hasPerk(p, "hosgoru")) honor += 5;
  if (hasPerk(p, "diplomat")) { honor = Math.round(honor * 1.5); rep = Math.round(rep * 1.5); }
  p.money -= cost; p.honor = Math.min(100, p.honor + honor); p.reputation = Math.min(100, p.reputation + rep);
  gainSkill(s, "social", 5);
  bumpNam(p, "comert", 6); bumpNam(p, "dindar", 5);
  push(s, "sosyal", "Yoksullara sadaka dağıttın; vicdanın hafifledi, şerefin yükseldi.", "kişisel", false, { k: "evj.alms" });
  return s;
}

// Gözdağı ver: korku kazan, itibarı biraz zedeler.
export function intimidate(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13) return s;
  const ok = hasPerk(p, "kan_donduran") || Math.random() < 0.5 + p.stats.strength * 0.04 + dread(s) / 300;
  if (ok) { let fear = hasPerk(p, "kan_donduran") ? 12 : 8; if (hasPerk(p, "diplomat")) fear = Math.round(fear * 1.5); p.fear = Math.min(100, p.fear + fear); p.reputation = Math.max(-100, p.reputation - 3); bumpNam(p, "zalim", 7); witnessScandal(s, "tehdit", 0.5); const why = dread(s) > 30 ? " Zaten korkulan adın, bir bakışın yetti." : ""; push(s, "sosyal", `Birine gözdağı verdin; adın çekinilen biri oldu.${why}`, "kişisel", false, { k: "evj.intimWin", p: [dread(s) > 30 ? { sfx: "sfx.intimWinWhy" } : ""] }); }
  else { p.reputation = Math.max(-100, p.reputation - 5); p.honor = Math.max(0, p.honor - 3); const why = esteem(s) > 25 ? " Sevilen biri olduğundan kimse seni ciddiye almadı." : ""; push(s, "sosyal", `Gözdağın ters tepti; itibarın zarar gördü.${why}`, "kişisel", false, { k: "evj.intimLose", p: [esteem(s) > 25 ? { sfx: "sfx.intimLoseWhy" } : ""] }); }
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
  let weaponPw = Math.round((w?.power || 0) * equippedQualityMult(p, "silah"));
  if (w?.twoHanded) weaponPw = Math.round(weaponPw * 1.32); // çift elli silah daha sert vurur (kalkan feda edilir)
  pw += weaponPw || ((p.inventory["bicak"] || 0) > 0 ? 4 : 0); // kalite-ölçekli silah, yoksa elindeki bıçak
  if (p.faction === "asker") pw += 3;
  if (p.childhood === "canli") pw += 2; // canlı çocukluk: ömür boyu dinç beden
  if (hasPerk(p, "cevik")) pw += 3;
  if (hasPerk(p, "nisanci")) pw += 5;
  return pw;
}
// Kuşanılı zırhın toplam savunması (gövde + kalkan + miğfer + eldiven + çizme). Savaşta hasarı azaltır.
export function armorDefense(p: Player): number {
  let d = 0;
  for (const sl of DEFENSE_SLOTS) {
    const id = p.equipped?.[sl];
    if (id) d += Math.round((ITEMS[id]?.defense || 0) * equippedQualityMult(p, sl));
  }
  return d;
}
// Kuşanılı silah (varsa) ve arketipi.
export function equippedWeapon(p: Player): Item | null { const id = p.equipped?.silah; return id ? (ITEMS[id] || null) : null; }
export function weaponClass(p: Player): WClass | null { return equippedWeapon(p)?.wclass || null; }
export function hasShield(p: Player): boolean { return !!p.equipped?.kalkan; }
// Kalkanla darbe savma ihtimali (savunmacı duruşta artar). Çift elli silahta kalkan olmaz → 0.
export function shieldBlockChance(p: Player, defensive: boolean): number {
  const id = p.equipped?.kalkan; if (!id) return 0;
  const def = Math.round((ITEMS[id]?.defense || 0) * equippedQualityMult(p, "kalkan"));
  return Math.min(0.45, 0.05 + def * 0.025 + (defensive ? 0.12 : 0));
}
export function isTwoHanded(id: string | null | undefined): boolean { return !!(id && ITEMS[id]?.twoHanded); }
// "Cenk yükü" (0..1): ne kadar savaşa hazır görünüyorsun. Sosyal zarafeti bastırır
// — ipek kaftanın zırhın altında görünmez, kalkanlı adam zarif değil heybetli durur.
export function martialLoad(p: Player): number {
  let m = 0;
  if (p.equipped?.zirh) m += 0.5;
  if (p.equipped?.kalkan) m += 0.25;
  if (p.equipped?.baslik) m += 0.15;
  if (isTwoHanded(p.equipped?.silah)) m += 0.3;
  return Math.min(1, m);
}
// Kuşanılı kıyafetin sosyal katkısı (karizma + itibar/prestij). Kalite kademesiyle ölçeklenir,
// cenk yükü (zırh/kalkan/miğfer) zarafeti gizlediği için kırpılır.
export function attireScore(p: Player): { charisma: number; prestige: number } {
  const id = p.equipped?.kiyafet;
  if (!id) return { charisma: 0, prestige: 0 };
  const it = ITEMS[id]; const m = equippedQualityMult(p, "kiyafet");
  const damp = 1 - 0.7 * martialLoad(p); // tam zırhta sosyal katkı %70 kırpılır
  return { charisma: Math.round((it?.charisma || 0) * m * damp), prestige: Math.round((it?.prestige || 0) * m * damp) };
}
// Sosyal varlık: karizma (kıyafet dahil) eksi cenk yükü cezası. Silahlı/zırhlı biri divanda,
// düğünde, flörtte çekici değil tehditkâr/heybetli durur — bu yüzden ikna gücü düşer.
export function socialPresence(p: Player): number {
  return Math.max(0, effStat(p, "charisma") - Math.round(martialLoad(p) * 2));
}
// Eşya kuşan (silah/zırh) — envanterden çıkarıp slota koyar, eskisini geri verir.
export function equipItem(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const it = ITEMS[id];
  if (!it || !(p.inventory[id] > 0)) return s;
  const slot = slotOfKind(it.kind);
  if (!slot) return s;
  // Çift elli silah ↔ kalkan birlikte taşınamaz: çakışan slotu envantere geri koy.
  const stowSlot = (sl: EquipSlot) => { const cur = p.equipped[sl]; if (cur) { p.inventory[cur] = (p.inventory[cur] || 0) + 1; const cq = p.equipped_q?.[sl]; if (cq) addQuality(p, cur, cq); p.equipped[sl] = null; if (p.equipped_q) delete p.equipped_q[sl]; return cur; } return null; };
  let bumped: string | null = null;
  if (slot === "silah" && it.twoHanded) bumped = stowSlot("kalkan");               // çift elli silah → kalkanı bırak
  else if (slot === "kalkan" && isTwoHanded(p.equipped?.silah)) bumped = stowSlot("silah"); // kalkan → çift elli silahı bırak
  // Eskisini (kalitesiyle) envantere geri koy.
  const old = p.equipped[slot];
  if (old) { p.inventory[old] = (p.inventory[old] || 0) + 1; const oq = p.equipped_q?.[slot]; if (oq) addQuality(p, old, oq); }
  // Yenisini en iyi kademeden kuşan.
  const tier = QUALITY_GOODS.has(id) ? takeQualityUnit(p, id) : "siradan";
  p.inventory[id] -= 1; if (p.inventory[id] <= 0) delete p.inventory[id];
  p.equipped[slot] = id;
  if (!p.equipped_q) p.equipped_q = {};
  p.equipped_q[slot] = tier;
  const qNote = tier !== "siradan" ? ` (${QUALITY_LABEL[tier]})` : "";
  const bumpNote = bumped ? ` ${ITEMS[bumped]?.name || ""} elden bırakıldı.` : "";
  push(s, "kusanma", `${it.name}${qNote} kuşandın.${bumpNote}`, "kişisel", false, bumped ? { k: "evj.equipBump", p: [{ i: id }, { i: bumped }] } : (tier !== "siradan" ? { k: "evj.equipQ", p: [{ i: id }, { q: tier }] } : { k: "evj.equip", p: [{ i: id }] }));
  return s;
}
export function unequipItem(prev: GameState, slot: EquipSlot): GameState {
  const s = clone(prev); const p = s.player; const old = p.equipped[slot];
  if (!old) return s;
  p.inventory[old] = (p.inventory[old] || 0) + 1;
  const oq = p.equipped_q?.[slot]; if (oq) addQuality(p, old, oq); // kaliteyi envantere geri ver
  p.equipped[slot] = null;
  if (p.equipped_q) delete p.equipped_q[slot];
  push(s, "kusanma", `${ITEMS[old]?.name || "Teçhizat"} çıkardın.`, "kişisel", false, { k: "evj.unequip", p: [{ i: old }] });
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
  const wIdx = Math.floor(Math.random() * INJURY_POOL.length);
  const t = INJURY_POOL[wIdx];
  const permanent = Math.random() < t.perm;
  p.injuries.push({ label: t.label, stat: t.stat, delta: t.delta, weeks_left: t.weeks, permanent });
  push(s, "yaralanma", `${t.label} aldın${permanent ? " — kalıcı iz bıraktı" : ""}.`, "kişisel", false, permanent ? { k: "evj.injurePerm", p: [{ wd: wIdx }] } : { k: "evj.injure", p: [{ wd: wIdx }] });
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
    push(s, "savaş_zafer", `${e.title}: Zafer senin! (+${reward} akçe, şöhretin arttı.)`, "kişisel", true, { k: "evj.battleWin", p: [{ enc: e.id }, reward] });
  } else {
    p.health = Math.max(0, Math.round(finalHp));
    if (p.health <= 0) { die(s, `${p.name}, ${e.title.toLowerCase()} sırasında can verdi.`, { k: "evj.dieEnc", p: [p.name, { enc: e.id }] }); return s; }
    maybeInjure(s, true);
    push(s, "savaş_yenilgi", `${e.title}: Yenildin, yaralarını sardın.`, "kişisel", false, { k: "evj.battleLose", p: [{ enc: e.id }] });
    // Yenilgi bir düşmanlık doğurabilir (nemesis)
    if (s.story && !s.story.nemesis && Math.random() < 0.4) {
      const name = `${NEMESIS_NAMES[Math.floor(Math.random() * NEMESIS_NAMES.length)]}`;
      s.story.nemesis = { name, power: e.power + 4 };
      push(s, "nemesis", `${name} seni yendiğiyle övünüyor; bir gün hesaplaşacaksınız.`, "kişisel", true, { k: "evj.nemTaunt", p: [name] });
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
    push(s, "nemesis", `${n.name}'ı alt ettin! Hesap kapandı, adın korkusuz diye anıldı.`, "kişisel", true, { k: "evj.nemWin", p: [n.name] });
  } else {
    p.health = Math.max(0, Math.round(finalHp));
    if (p.health <= 0) { die(s, `${p.name}, ${n.name} ile hesaplaşmada can verdi.`, { k: "evj.dieNemesis", p: [p.name, n.name] }); return s; }
    maybeInjure(s, true);
    push(s, "nemesis", `${n.name} yine üstün geldi; intikam bir başka bahara kaldı.`, "kişisel", false, { k: "evj.nemLose", p: [n.name] });
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
  // Yeni sistemlere bağlı başarımlar (kervan / işçi / sancak / valilik / aile / soy)
  { id: "kervan_s", name: "Kervan Sahibi",   desc: "Bir ticaret kervanı yola çıkar.",   icon: "scales",       done: (s) => s.caravan != null },
  { id: "isveren",  name: "İşveren",         desc: "Bir mülküne işçi al.",              icon: "house",        done: (s) => s.player.properties.some((pr) => (pr.workers || []).length > 0) },
  { id: "sancakbey",name: "Sancak Beyi",     desc: "Loncan bir sancağa hâkim olsun.",   icon: "banner",       done: (s) => !!s.player.faction && (s.realm || []).some((r) => r.holder === s.player.faction) },
  { id: "vali_a",   name: "Vali",            desc: "Bir şehre vali ol.",                icon: "crown",        done: (s) => (s.player.governorships?.length || 0) >= 1 },
  { id: "mezraci",  name: "Mezra Kurucusu",  desc: "Yeni bir yerleşim kur.",            icon: "castle",       done: (s) => (s.settlements?.length || 0) >= 1 },
  { id: "tacli_a",  name: "Taç Giydin",      desc: "Taht iddiasını kazan.",             icon: "crown",        done: (s) => !!s.player.crowned },
  { id: "ailereis", name: "Aile Reisi",      desc: "5 aile görevi tamamla.",            icon: "family",       done: (s) => (s.player.fq_claimed?.length || 0) >= 5 },
  { id: "demiryum", name: "Demir Yumruk",    desc: "Gücünü 10'a çıkar.",                icon: "anvil",        done: (s) => s.player.stats.strength >= 10 },
  { id: "asilsoy",  name: "Asîl Soy",        desc: "Altıncı nesle ulaş.",               icon: "scroll-open",  done: (s) => s.player.generation >= 6 },
  { id: "sevgili_a",name: "Halkın Sevgilisi",desc: "İtibar ve şöhretin 70'i aşsın.",    icon: "prayer-beads", done: (s) => s.player.reputation >= 70 && s.player.fame >= 70 },
  { id: "cenkust",  name: "Cenk Üstadı",     desc: "Savaş becerini 10'a çıkar.",        icon: "crossed-swords", done: (s) => s.player.skills.combat >= 10 },
  { id: "define",   name: "Define Sahibi",   desc: "10.000 akçeye ulaş.",               icon: "gems",         done: (s) => s.player.money >= 10000 },
  // ── Yeni sistemlere bağlı başarımlar (yaşayan dünya / fraksiyon / valilik) ──
  { id: "soylukan", name: "Soylu Kan",       desc: "Hanedanını 3. nesle taşı.",         icon: "crown",        done: (s) => s.player.generation >= 3 },
  { id: "vali",     name: "Valilik Mührü",   desc: "Bir şehrin valisi ol.",             icon: "scroll",       done: (s) => (s.player.governorships || []).length >= 1 },
  { id: "loncabuyugu",name:"Lonca Büyüğü",   desc: "Bir loncada 120 itibara ulaş.",     icon: "crown",        done: (s) => Object.values(s.player.faction_standing || {}).some((v) => v >= 120) },
  { id: "sancakhakimi",name:"Sancak Hâkimi", desc: "Loncan bir sancağa hâkim olsun.",   icon: "castle",       done: (s) => !!s.player.faction && (s.realm || []).some((sn) => sn.holder === s.player.faction) },
  { id: "golgeeli", name: "Gölge Eli",       desc: "Gölge Kardeşliği'ne katıl.",        icon: "skull",        done: (s) => s.player.faction === "golge" },
  { id: "cokdost",  name: "Sevilen Yüz",     desc: "8 kişiyle yakın dost ol (ilişki ≥ 40).", icon: "family",   done: (s) => Object.values(s.relationships || {}).filter((v) => v >= 40).length >= 8 },
  { id: "hayirsever",name:"Hayırsever",      desc: "Cömert namın 60'ı aşsın.",          icon: "coins",        done: (s) => (s.player.nam?.comert || 0) >= 60 },
  { id: "korkulanad",name:"Korkulan Ad",     desc: "Zalim namın 60'ı aşsın.",           icon: "skull",        done: (s) => (s.player.nam?.zalim || 0) >= 60 },
  // ── Ekonomi / görkem başarımları (kademeli yerleşim + bağış muslukları) ──
  { id: "kasabali",  name: "Kasaba Beyi",     desc: "Bir yerleşimini kasabaya büyüt.",   icon: "castle",       done: (s) => (s.settlements || []).some((st) => st.tier === "kasaba" || st.tier === "şehir") },
  { id: "sehirkuran",name: "Şehir Kuran",     desc: "Bir yerleşimini şehre büyüt.",      icon: "castle",       done: (s) => (s.settlements || []).some((st) => st.tier === "şehir") },
  { id: "vakifsahibi",name:"Vakıf Sahibi",    desc: "Adına bir vakıf kur.",              icon: "scroll-open",  done: (s) => !!s.player.legacy?.vakif },
  { id: "anitkuran", name: "Anıt Diktiren",   desc: "Görkemli bir anıt diktir.",         icon: "banner",       done: (s) => !!s.player.legacy?.anit },
  { id: "hanedanservet",name:"Hazine Sahibi", desc: "Servetin 100.000 akçeyi aşsın.",    icon: "gems",         done: (s) => s.player.money >= 100000 },
];
export function achievementsOf(s: GameState): { a: Achievement; done: boolean }[] {
  return ACHIEVEMENTS.map((a) => ({ a, done: a.done(s) }));
}

// ── Aile/yaşam görevleri (Vercel family_quests.py portu) — yaş-kapılı kilometre taşları ──
// Çocukluktan yetişkinliğe ailenin beklentileri; oyuncu normal oynayarak tamamlar, ödül kazanır.
export interface FamilyQuest { id: string; icon: string; title: string; desc: string; minAge: number; reward: { money?: number; fame?: number; rep?: number; statPt?: number }; done: (s: GameState) => boolean; }
export const FAMILY_QUESTS: FamilyQuest[] = [
  { id: "ilkders",    icon: "book", title: "İlk Ders",      desc: "Mektepte ilk dersine otur.",            minAge: 7,  reward: { money: 5, fame: 1 },          done: (s) => (s.player.lesson_count || 0) >= 1 },
  { id: "ilkdost",    icon: "prayer-beads", title: "İlk Dost",      desc: "Biriyle dostluk kur (ilişki ≥ 30).",    minAge: 10, reward: { money: 8, rep: 2 },           done: (s) => Object.values(s.relationships || {}).some((v) => v >= 30) },
  { id: "okuryazar",  icon: "scroll", title: "Okuryazar",    desc: "Zekânı 3'e çıkar.",                     minAge: 12, reward: { money: 10, statPt: 1 },        done: (s) => s.player.stats.intelligence >= 3 },
  { id: "ilkkazanc",  icon: "coins", title: "İlk Kazanç",    desc: "Bir meslekte ilk işini yap.",           minAge: 13, reward: { money: 12, rep: 2 },           done: (s) => s.player.career_xp >= 1 },
  { id: "pehlivan",   icon: "fist", title: "Pehlivan",      desc: "Gücünü 4'e çıkar.",                     minAge: 15, reward: { money: 10, fame: 2 },          done: (s) => s.player.stats.strength >= 4 },
  { id: "elemegi",    icon: "anvil", title: "El Emeği",      desc: "Zanaat becerini 3'e çıkar.",            minAge: 16, reward: { money: 15, statPt: 1 },        done: (s) => s.player.skills.crafting >= 3 },
  { id: "sayginevlat",icon: "medal", title: "Saygın Evlat",  desc: "İtibarını 30'a çıkar.",                 minAge: 18, reward: { money: 15, rep: 4 },           done: (s) => s.player.reputation >= 30 },
  { id: "yuvakur",    icon: "ring", title: "Yuva Kur",      desc: "Evlen, bir ocak tüttür.",               minAge: 18, reward: { money: 20, fame: 3 },          done: (s) => s.player.married },
  { id: "ilktapu",    icon: "house", title: "İlk Tapu",      desc: "Adına bir mülk edin.",                  minAge: 18, reward: { money: 0, rep: 3, statPt: 1 },  done: (s) => s.player.properties.length >= 1 },
  { id: "ocagituttur",icon: "baby", title: "Ocağı Tüttür",  desc: "Soyunu sürdürecek bir evlat sahibi ol.",minAge: 20, reward: { money: 25, fame: 4 },          done: (s) => s.player.children.length >= 1 },
  { id: "silahsor",   icon: "crossed-swords", title: "Silahşör",      desc: "Savaş becerini 6'ya çıkar.",            minAge: 20, reward: { money: 20, fame: 3 },          done: (s) => s.player.skills.combat >= 6 },
  { id: "ustasinavi", icon: "anvil",  title: "Usta Sınavı",   desc: "Zanaat becerini 6'ya çıkar.",           minAge: 22, reward: { money: 25, fame: 3 },          done: (s) => s.player.skills.crafting >= 6 },
  { id: "bezirgan",   icon: "scales", title: "Bezirgân",      desc: "Ticaret becerini 6'ya çıkar.",          minAge: 22, reward: { money: 30, rep: 3 },           done: (s) => s.player.skills.trade >= 6 },
  { id: "konaksahibi",icon: "castle", title: "Konak Sahibi",  desc: "Üç mülk edin.",                         minAge: 25, reward: { money: 0, rep: 5, statPt: 1 },  done: (s) => s.player.properties.length >= 3 },
  { id: "itibarli",   icon: "medal", title: "İtibarlı",      desc: "İtibarını 60'a çıkar.",                 minAge: 30, reward: { money: 30, fame: 5 },          done: (s) => s.player.reputation >= 60 },
  { id: "soyagaci",   icon: "leaf", title: "Soyağacı",      desc: "Hanedanını sürdür (2. nesil ve ötesi).",minAge: 7,  reward: { money: 40, fame: 8 },          done: (s) => s.player.generation >= 2 },
];
export function familyQuestsOf(s: GameState): { q: FamilyQuest; done: boolean; claimed: boolean; locked: boolean }[] {
  const p = s.player; const cl = p.fq_claimed || [];
  return FAMILY_QUESTS.map((q) => ({ q, done: q.done(s), claimed: cl.includes(q.id), locked: p.age < q.minAge }));
}
// Tamamlanan aile görevlerini ödüllendir (advance içinde, ay sonunda çağrılır).
function claimFamilyQuests(s: GameState) {
  const p = s.player; if (!p.fq_claimed) p.fq_claimed = [];
  for (const q of FAMILY_QUESTS) {
    if (p.age < q.minAge || p.fq_claimed.includes(q.id) || !q.done(s)) continue;
    p.fq_claimed.push(q.id);
    if (q.reward.money) p.money += q.reward.money;
    if (q.reward.fame) p.fame = Math.min(100, p.fame + q.reward.fame);
    if (q.reward.rep) p.reputation = Math.min(100, p.reputation + q.reward.rep);
    if (q.reward.statPt) p.stat_points += q.reward.statPt;
    push(s, "aile_gorevi", `Aile görevi tamamlandı: ${q.title}.`, "kişisel", true, { k: "evj.familyQuest", p: [q.title] });
  }
}

// ── İkilem/olay sonucu uygula (tüm durum değişimi çekirdekte) ──
export interface Delta {
  money?: number; health?: number; hunger?: number;
  reputation?: number; honor?: number; fear?: number; fame?: number;
  stat_points?: number; addItem?: string; standing?: number;
  nam?: { [k in keyof Nam]?: number };
}
const clampStat = (x: number) => Math.max(0, Math.min(100, x));
// İkilem seçimi → sonuç tohumu (Vercel LIFE_EVENT_SEEDS): "<dilemmaId>:<seçimIdx>" → tohum tarifi.
// Çocukluk/gençlik seçimleri yıllar (hatta nesiller) sonra dramatik zirvede biçilir.
export const DILEMMA_SEEDS: Record<string, Omit<Seed, "id" | "ekim">> = {
  "cocuk_kese:0": { kaynak: "kese_goren", hmin: 24, hmax: 120, agirlik: "kucuk", nesil: false, etki: { money: -20, reputation: -4 } },
  "cocuk_kese:1": { kaynak: "durust_cocuk", hmin: 36, hmax: 120, agirlik: "kucuk", nesil: false, etki: { reputation: 6 } },
  "cocuk_kavga:0": { kaynak: "savundugun_cocuk", hmin: 120, hmax: 240, agirlik: "buyuk", nesil: true, etki: { money: 100, reputation: 8 } },
  "cocuk_kavga:1": { kaynak: "savunmadigin_cocuk", hmin: 120, hmax: 240, agirlik: "buyuk", nesil: true, etki: { reputation: -8 } },
  "yetiskin_yangin:1": { kaynak: "yangin_sustun", hmin: 60, hmax: 144, agirlik: "buyuk", nesil: true, etki: { reputation: -6 } },
  "yetiskin_yangin:0": { kaynak: "yangin_kahramani", hmin: 36, hmax: 120, agirlik: "orta", nesil: false, etki: { reputation: 6 } },
  "yetiskin_kumar:0": { kaynak: "kumar_borcu", hmin: 12, hmax: 60, agirlik: "kucuk", nesil: false, etki: { money: 15 } },
};

export function applyDilemma(prev: GameState, delta: Delta, resultText: string, seedKey?: string): GameState {
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
  if (delta.standing && p.faction) p.faction_standing[p.faction] = (p.faction_standing[p.faction] || 0) + delta.standing; // lonca itibarı (fraksiyon sahnesi)
  if (seedKey && DILEMMA_SEEDS[seedKey]) sowSeed(s, DILEMMA_SEEDS[seedKey]); // sessiz tohum: seçim yıllar sonra döner
  push(s, "olay", resultText, "kişisel");
  if (p.health <= 0) die(s, `${p.name} bu olaydan sağ çıkamadı.`, { k: "evj.dieEvent", p: [p.name] });
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
  if (p.childhood === "merakli") xp = Math.round(xp * 1.15); // meraklı çocukluk: ömür boyu daha hızlı öğrenir
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
  push(s, "hüner", `Yeni hüner: ${pk.name} — ${pk.desc}`, "kişisel", true, { k: "evj.perk", p: [pk.name, pk.desc] });
  return s;
}

// ── Hikâye yayları ──
export function beginArc(prev: GameState, id: string): GameState {
  const s = clone(prev); const a = arcById(id);
  if (!a || s.player.dead) return s;
  if (s.story.active || s.story.completed.includes(id)) return s;
  s.story.active = { id, stage: a.start };
  push(s, "hikaye_basladi", `Yeni bir hikâye başladı: ${a.title}.`, "kişisel", true, { k: "evj.arcStart", p: [a.title] });
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
    s.story.flags = { ...(s.story.flags || {}), [a.id]: true }; // hanedan hafızası (nesiller arası kalıcı)
    s.story.active = null;
    s.story.tension = Math.max(0, s.story.tension - 2);
  } else {
    s.story.active = { id: a.id, stage: c.next };
  }
  if (s.player.health <= 0) die(s, `${s.player.name} hikâyesinin ortasında can verdi.`, { k: "evj.dieArc", p: [s.player.name] });
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
  const usluBonus = p.childhood === "uslu" ? 4 : 0; // uslu çocukluk: ömür boyu süren iyi nam
  const elderBonus = p.age >= 55 ? Math.min(10, Math.round((p.age - 55) * 0.6)) : 0; // ihtiyara hürmet: yaş ilerledikçe saygınlık
  const ch = p.reputation + p.honor * 0.8 + (n.comert || 0) * 0.5 + (n.mert || 0) * 0.5 + (n.dindar || 0) * 0.3 - (n.zalim || 0) * 0.7 - p.fear * 0.4 + attireScore(p).prestige + usluBonus + elderBonus;
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
// Baskın nam: en yüksek eksen ≥40 ve ikinciden belirgin önde ise (Vercel dominant_nam, sayaç ölçeği).
export function playerDominantNam(p: Player): string | null {
  const n = p.nam || ({} as Nam);
  const sorted = (Object.entries(n) as [string, number][]).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const [top, second] = [sorted[0], sorted[1] || ["", 0]];
  return top[1] >= 40 && top[1] >= (second[1] as number) * 1.3 ? top[0] : null;
}
// Evlilik teklifi şansına ek: mert/şeref/dindar (tanınmışsa) güven verir; çapkın namı saygın aileyi ürkütür; korku düşürür.
export function courtBonus(s: GameState): number {
  const p = s.player; const n = p.nam || ({} as Nam);
  const trust = ((n.mert || 0) + p.honor * 0.6 + (n.dindar || 0) * 0.4) / 100;
  const scandal = (n.capkin || 0) / 100, menace = dread(s) / 100;
  const zalimRet = playerDominantNam(p) === "zalim" ? 0.18 : 0; // baskın zalim → iyi aileler teklifi reddeder
  return Math.max(-0.4, Math.min(0.25, recognition(s) * trust * 0.2 - scandal * 0.12 - menace * 0.15 - zalimRet));
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

// ── KADEMELİ YERLEŞİM (gerçek hayat filtresi): bir bölgede mülk topla → mezra kur (berat öde)
//    → mülk ekleyip akçe dökerek geliştir → köy → kasaba → şehir doğru kademe kademe büyüt. ──
export const SETTLE_TIERS = ["mezra", "köy", "kasaba", "şehir"];
// Her kademenin şartı: o bölgede sahip olunması gereken mülk + gerekli gelişmişlik + berat bedeli (nominal; enflasyonla çarpılır) + vergi katsayısı.
export const SETTLE_TIER: Record<string, { props: number; dev: number; fee: number; tax: number }> = {
  mezra:  { props: 3,  dev: 0,   fee: 2500,  tax: 0.25 },
  "köy":  { props: 5,  dev: 40,  fee: 6000,  tax: 0.55 },
  kasaba: { props: 8,  dev: 70,  fee: 16000, tax: 1.0 },
  "şehir":{ props: 12, dev: 100, fee: 40000, tax: 1.7 },
};
export const SETTLE_MAX = 3;
// Berat bedeli güncel (enflasyonlu).
export function settleFee(s: GameState, tier: string): number { return Math.round((SETTLE_TIER[tier]?.fee || 0) * inflationFactor(s)); }
// Mezra kurmak için: bu bölgede yeterli mülk + berat parası + henüz burada yerleşim yok.
export function canFoundSettlement(s: GameState): { ok: boolean; reason: string } {
  const p = s.player; const here = p.location_name;
  if (p.dead) return { ok: false, reason: "dead" };
  if ((s.settlements?.length || 0) >= SETTLE_MAX) return { ok: false, reason: "max" };
  if ((s.settlements || []).some((st) => st.loc === here)) return { ok: false, reason: "here" };
  if (propsInLoc(s, here) < SETTLE_TIER.mezra.props) return { ok: false, reason: "prop" };
  if (p.money < settleFee(s, "mezra")) return { ok: false, reason: "gold" };
  return { ok: true, reason: "" };
}
export function foundSettlement(prev: GameState, name: string): GameState {
  const s = clone(prev); const p = s.player; const here = p.location_name;
  if (!canFoundSettlement(s).ok || !name.trim()) return s;
  p.money -= settleFee(s, "mezra");
  if (!s.settlements) s.settlements = [];
  s.settlements.push({ name: name.trim().slice(0, 24), founded: s.turn, dev: 8, tier: "mezra", loc: here });
  p.fame = Math.min(100, p.fame + 4); p.reputation = Math.min(100, p.reputation + 3);
  push(s, "yerlesim", `${name.trim()} adıyla bir mezra kurdun (${here}). Mülk ekleyip geliştirdikçe köye, kasabaya doğru büyüyecek.`, "kişisel", true, { k: "ev.settle.found", p: [name.trim(), { pl: here }] });
  return s;
}
// Bir yerleşimin bir sonraki kademesi (yoksa null = en üst).
export function nextSettleTier(st: Settlement): string | null {
  const i = SETTLE_TIERS.indexOf(st.tier || "mezra");
  return i >= 0 && i < SETTLE_TIERS.length - 1 ? SETTLE_TIERS[i + 1] : null;
}
// Kademe yükseltme uygunluğu: bölgede yeterli mülk + gelişmişlik + berat parası.
export function canUpgradeSettleTier(s: GameState, index: number): { ok: boolean; reason: string; next: string | null } {
  const st = s.settlements?.[index]; if (!st) return { ok: false, reason: "none", next: null };
  const next = nextSettleTier(st); if (!next) return { ok: false, reason: "top", next: null };
  const req = SETTLE_TIER[next];
  if (st.dev < req.dev) return { ok: false, reason: "dev", next };
  if (propsInLoc(s, st.loc || "") < req.props) return { ok: false, reason: "prop", next };
  if (s.player.money < settleFee(s, next)) return { ok: false, reason: "gold", next };
  return { ok: true, reason: "", next };
}
export function upgradeSettleTier(prev: GameState, index: number): GameState {
  const s = clone(prev); const chk = canUpgradeSettleTier(s, index);
  if (!chk.ok || !chk.next) return s;
  const st = s.settlements![index]; const p = s.player;
  p.money -= settleFee(s, chk.next);
  st.tier = chk.next; st.dev = Math.max(8, st.dev - 30); // büyüyen yerleşim yeniden gelişmeye başlar
  p.fame = Math.min(100, p.fame + 6); p.reputation = Math.min(100, p.reputation + 4);
  push(s, "yerlesim", `${st.name} artık bir ${chk.next}! Hanedanının nüfuzu büyüyor.`, "kişisel", true, { k: "ev.settle.up", p: [st.name, { stt: chk.next }] });
  return s;
}
// Yerleşim geliştirme bedeli (kademe + gelişmişlik arttıkça pahalanır) — geç-oyun servetine üretken musluk.
export function developSettlementCost(st: Settlement): number { const tm = 1 + SETTLE_TIERS.indexOf(st.tier || "mezra") * 0.6; return Math.round((120 + st.dev * 12) * tm); }
// Akçe dökerek yerleşimini hızla geliştir (vergi gelirini artırır + kademe yükseltmenin önünü açar).
export function developSettlement(prev: GameState, index: number): GameState {
  const s = clone(prev); const p = s.player; const st = s.settlements?.[index];
  if (!st || st.dev >= 100) return s;
  const cost = developSettlementCost(st); if (p.money < cost) return s;
  p.money -= cost; st.dev = Math.min(100, st.dev + 8);
  if (st.dev >= 100) p.fame = Math.min(100, p.fame + 3);
  push(s, "yerlesim", `${st.name} için akçe döktün; ${st.tier || "mezra"} hızla gelişti (gelişmişlik %${st.dev}).`, "kişisel", false, { k: "evj.settleDev", p: [st.name, st.dev] });
  return s;
}
// Bir yerleşimin yıllık vergi geliri (kademe × gelişmişlik × halk desteği).
export function settlementIncome(s: GameState): number {
  if (!s.settlements?.length) return 0;
  const repMult = 1 + Math.max(0, s.player.reputation) / 300;
  return Math.round(s.settlements.reduce((a, st) => a + st.dev * (SETTLE_TIER[st.tier || "mezra"]?.tax || 0.25), 0) * repMult);
}

// ── GÖRKEM & BAĞIŞ (geç-oyun servetine anlamlı musluklar; gerçek hayat filtresi) ──
// Soylular vakıf kurar, imaret açar, anıt diktirir, hekim tutar. Para harcanacak yer bulur,
// servet itibara/şöhrete/sağlığa/mirasa dönüşür. Bedeller enflasyonla güncellenir.
export const PRESTIGE: Record<string, { cost: number; repeat?: boolean; once?: boolean }> = {
  hekim:  { cost: 2500,  repeat: true },   // özel hekim → sağlık (ömrü uzatır)
  imaret: { cost: 9000 },                   // imaret/aşevi → itibar + halk desteği
  vakif:  { cost: 28000, once: true },      // vakıf → büyük itibar/şöhret + miras
  anit:   { cost: 90000, once: true },      // anıt → kalıcı şöhret + başarım
};
export function prestigeCost(s: GameState, id: string): number { return Math.round((PRESTIGE[id]?.cost || 0) * inflationFactor(s)); }
export function fundPrestige(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const def = PRESTIGE[id]; if (!def || p.dead) return s;
  const cost = prestigeCost(s, id); if (p.money < cost) return s;
  if (def.once && p.legacy?.[id]) return s;
  p.money -= cost; p.legacy = p.legacy || {};
  if (id === "hekim") { p.health = Math.min(100, p.health + 16); push(s, "saglik", `Usta bir hekim tuttun; sağlığın tazelendi (+16 sağlık).`, "kişisel", false, { k: "ev.prestige.hekim" }); }
  else if (id === "imaret") { p.reputation = Math.min(100, p.reputation + 9); p.fame = Math.min(100, p.fame + 3); p.legacy.imaret = true; push(s, "bagis", `Bir imaret açtın; yoksullar adını hayırla anıyor (+itibar).`, "kişisel", true, { k: "ev.prestige.imaret" }); }
  else if (id === "vakif") { p.reputation = Math.min(100, p.reputation + 12); p.fame = Math.min(100, p.fame + 9); p.legacy.vakif = true; push(s, "bagis", `Adına bir vakıf kurdun; hayrın nesiller boyu sürecek (+itibar +şöhret).`, "kişisel", true, { k: "ev.prestige.vakif" }); }
  else if (id === "anit") { p.fame = Math.min(100, p.fame + 16); p.legacy.anit = true; push(s, "bagis", `Görkemli bir anıt diktirdin; diyar bu eseri asırlarca konuşacak (+şöhret).`, "kişisel", true, { k: "ev.prestige.anit" }); }
  return s;
}

// ── PİYASA OYNATMA ("Elon Musk" — haddinden fazla zengin oyuncu ekonominin dinamolarını oynatır) ──
// Yalnızca çok zengin oyuncu (≥50.000 akçe) büyük sermaye dökerek piyasayı kasıtlı oynatabilir;
// etki herkesi bağlar (dünya-bazlı sonuç) ve bir süre sürer. Soğuma: aktifken tekrar oynatılamaz.
export const MARKET_LEVER_MIN = 50000;
export function marketLeverCost(s: GameState): number { return Math.round(20000 * inflationFactor(s)); }
export function canManipulateMarket(s: GameState): { ok: boolean; reason: string } {
  const p = s.player;
  if (p.dead) return { ok: false, reason: "dead" };
  if (p.money < MARKET_LEVER_MIN) return { ok: false, reason: "poor" };
  if ((s.world?.marketLeverUntil || 0) > s.turn) return { ok: false, reason: "cool" };
  if (p.money < marketLeverCost(s)) return { ok: false, reason: "gold" };
  return { ok: true, reason: "" };
}
export function manipulateMarket(prev: GameState, dir: "pump" | "dump"): GameState {
  const s = clone(prev); const p = s.player;
  if (!canManipulateMarket(s).ok) return s;
  p.money -= marketLeverCost(s);
  if (dir === "pump") { s.econ = Math.min(2, (s.econ || 1) + 0.45); push(s, "piyasa", `Pazarı kasıp kavurdun — malları topladın, fiyatlar fırladı. Diyar seni konuşuyor.`, "makro", true, { k: "ev.lever.pump" }); }
  else { s.econ = Math.max(0.5, (s.econ || 1) - 0.45); push(s, "piyasa", `Ambarlarını açtın — piyasayı mala boğdun, fiyatlar düştü. Halk minnettar, tüccarlar küplere bindi.`, "makro", true, { k: "ev.lever.dump" }); }
  if (s.world) s.world.marketLeverUntil = s.turn + 6;
  p.fame = Math.min(100, p.fame + 3);
  return s;
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
  if (!p.govLeg) p.govLeg = {};
  p.govLeg[name] = 60; // başlangıç meşruiyeti
  p.reputation = Math.min(100, p.reputation + 5); p.fame = Math.min(100, p.fame + 6);
  push(s, "yonetim", `${name} valiliğine getirildin — artık ${GOV_TITLE[placeKind(name)] || "Vali"}sin.`, "kişisel", true, { k: "evj.govAppoint", p: [{ pl: name }] });
  return s;
}
// Valilik meşruiyetini para harcayarak tazele (halkı kazan, hizmet götür).
export const GOV_SHORE_COST = 30;
export function shoreUpLegitimacy(prev: GameState, name: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!p.governorships?.includes(name) || p.money < GOV_SHORE_COST) return s;
  p.money -= GOV_SHORE_COST;
  if (!p.govLeg) p.govLeg = {};
  p.govLeg[name] = Math.min(100, (p.govLeg[name] ?? 60) + 14);
  p.reputation = Math.min(100, p.reputation + 1);
  push(s, "yonetim", `${name}'de hayır işleri ve hizmet götürdün; halkın gözünde meşruiyetin arttı.`, "kişisel", false, { k: "gov.shoreDone", p: [{ pl: name }] });
  return s;
}
export function govLegOf(p: Player, name: string): number { return p.govLeg?.[name] ?? 60; }
// Şehir yönetim kolları (Vercel city_governance portu): vergi oranı, halk memnuniyeti, şehir hazinesi.
export function govTaxOf(p: Player, name: string): number { return p.govTax?.[name] ?? 15; }
export function govHappyOf(p: Player, name: string): number { return p.govHappy?.[name] ?? 60; }
export function govTreasuryOf(p: Player, name: string): number { return p.govTreasury?.[name] ?? 0; }
export const GOV_TAX_PRESETS: { id: string; rate: number }[] = [{ id: "dusuk", rate: 8 }, { id: "orta", rate: 15 }, { id: "yuksek", rate: 28 }];
// Vergi oranı belirle — yüksek vergi hazineyi/geliri büyütür ama halkı küstürür (memnuniyet → meşruiyet → azil riski).
export function setGovTax(prev: GameState, name: string, rate: number): GameState {
  const s = clone(prev); const p = s.player;
  if (!p.governorships?.includes(name)) return s;
  const r = Math.max(5, Math.min(40, Math.round(rate)));
  if (!p.govTax) p.govTax = {};
  p.govTax[name] = r;
  const lvl = r <= 10 ? "taxd" : r >= 22 ? "taxh" : "taxm";
  push(s, "yonetim", `${name}'de vergi siyasetini ayarladın (%${r}).`, "kişisel", false, { k: "gov." + lvl + "Set", p: [{ pl: name }] });
  return s;
}
// Şehir hazinesinden projeye harca: halka hizmet (+memnuniyet) veya asayiş (+meşruiyet).
export const GOV_INVEST_COST = 40;
export function investTreasury(prev: GameState, name: string, kind: "hizmet" | "asayis"): GameState {
  const s = clone(prev); const p = s.player;
  if (!p.governorships?.includes(name) || govTreasuryOf(p, name) < GOV_INVEST_COST) return s;
  if (!p.govTreasury) p.govTreasury = {}; if (!p.govHappy) p.govHappy = {}; if (!p.govLeg) p.govLeg = {};
  p.govTreasury[name] = govTreasuryOf(p, name) - GOV_INVEST_COST;
  if (kind === "hizmet") { p.govHappy[name] = Math.min(100, govHappyOf(p, name) + 10); p.govLeg[name] = Math.min(100, govLegOf(p, name) + 3); }
  else { p.govLeg[name] = Math.min(100, govLegOf(p, name) + 8); p.govHappy[name] = Math.min(100, govHappyOf(p, name) + 3); }
  push(s, "yonetim", `${name}'de şehir hazinesinden ${kind === "hizmet" ? "halka hizmet" : "asayiş"} için harcadın.`, "kişisel", false, { k: "gov.invDone." + kind, p: [{ pl: name }] });
  return s;
}
// Valilik döngüsü (her tur, yalnız vali ise): vergi → hazine, vergi → memnuniyet, memnuniyet+rep → meşruiyet; düşerse isyan/azil.
function governorTick(s: GameState) {
  const p = s.player; const list = p.governorships; if (!list?.length) return;
  if (!p.govLeg) p.govLeg = {}; if (!p.govHappy) p.govHappy = {}; if (!p.govTreasury) p.govTreasury = {};
  for (const loc of [...list]) {
    const tax = govTaxOf(p, loc);
    const prosperity = cityInfo(loc, placeKind(loc)).prosperity;
    p.govTreasury[loc] = Math.round((p.govTreasury[loc] ?? 0) + prosperity * tax / 100 * 0.4); // hazine vergiyle dolar
    let happy = p.govHappy[loc] ?? 60;
    const happyTarget = Math.max(35, Math.min(90, 72 - (tax - 15) * 1.4)); // yüksek vergi → homurtu
    happy = Math.max(0, Math.min(100, happy + (happyTarget - happy) * 0.1));
    p.govHappy[loc] = Math.round(happy);
    const target = 40 + (p.reputation - 50) * 0.4 + p.honor * 0.12 - p.fear * 0.05 + (happy - 60) * 0.25;
    let leg = p.govLeg[loc] ?? 60;
    leg = Math.max(0, Math.min(100, leg + (target - leg) * 0.12 - 1.2));
    p.govLeg[loc] = Math.round(leg);
    if (leg < 18 && Math.random() < 0.12 + (18 - leg) * 0.02) { // meşruiyet krizi → azil
      p.governorships = p.governorships!.filter((x) => x !== loc);
      delete p.govLeg[loc]; delete p.govHappy[loc]; delete p.govTreasury[loc];
      p.reputation = Math.max(-100, p.reputation - 8);
      push(s, "yonetim", `${loc}'de halk ayaklandı; valilikten azledildin.`, "kişisel", true, { k: "gov.deposed", p: [{ pl: loc }] });
    } else if (happy < 22 && Math.random() < 0.04 + (22 - happy) * 0.01) { // memnuniyet krizi → isyan (azil değil, zarar)
      p.govHappy[loc] = Math.min(100, happy + 18);
      p.govTreasury[loc] = Math.round((p.govTreasury[loc] ?? 0) * 0.5);
      p.reputation = Math.max(-100, p.reputation - 3);
      push(s, "yonetim", `${loc}'de halk homurdandı; şehir hazinesi zarar gördü.`, "kişisel", false, { k: "gov.unrest", p: [{ pl: loc }] });
    }
  }
}
// Valilik vergi payı (her tur): şehrin refahına × meşruiyet × vergi oranı (yüksek vergi çok toplar, düşük meşruiyet azaltır).
export function governorIncome(s: GameState): number {
  const list = s.player.governorships; if (!list?.length) return 0;
  return list.reduce((a, loc) => a + Math.max(1, Math.round(cityInfo(loc, placeKind(loc)).prosperity / 4 * (0.4 + govLegOf(s.player, loc) / 100 * 0.8) * (govTaxOf(s.player, loc) / 15))), 0);
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
// ── Eşya kalitesi (Vercel quality.py portu) — dayanıklı/zanaat malları için 4 kademe ──
export type QualityTier = "kusurlu" | "siradan" | "iyi" | "usta_isi";
export const QUALITY_MULT: Record<QualityTier, number> = { kusurlu: 0.6, siradan: 1.0, iyi: 1.5, usta_isi: 2.5 };
// Savaşta kalite etkisi (satıştan daha yumuşak): kuşanılı silah gücü / zırh savunması çarpanı.
export const QUALITY_COMBAT: Record<QualityTier, number> = { kusurlu: 0.75, siradan: 1.0, iyi: 1.2, usta_isi: 1.4 };
export function equippedQualityMult(p: Player, slot: EquipSlot): number { return QUALITY_COMBAT[p.equipped_q?.[slot] || "siradan"]; }
export const QUALITY_LABEL: Record<QualityTier, string> = { kusurlu: "kusurlu", siradan: "sıradan", iyi: "iyi", usta_isi: "usta işi" };

// Kuşanılabilir tüm slotlar. silah=el, kalkan=öbür el, zirh=gövde, baslik=baş, eldiven=el, ayakkabi=ayak, kiyafet=giysi (sosyal).
export type EquipSlot = "silah" | "kalkan" | "zirh" | "baslik" | "eldiven" | "ayakkabi" | "kiyafet";
export const EQUIP_SLOTS: EquipSlot[] = ["silah", "kalkan", "zirh", "baslik", "eldiven", "ayakkabi", "kiyafet"];
export const COMBAT_SLOTS: EquipSlot[] = ["silah", "kalkan", "zirh", "baslik", "eldiven", "ayakkabi"];
export const DEFENSE_SLOTS: EquipSlot[] = ["zirh", "kalkan", "baslik", "eldiven", "ayakkabi"];
const EQUIP_KINDS = new Set<string>(["silah", "kalkan", "zirh", "baslik", "eldiven", "ayakkabi", "kiyafet"]);
export function slotOfKind(kind: string): EquipSlot | null { return EQUIP_KINDS.has(kind) ? (kind as EquipSlot) : null; }

const QUALITY_GOODS = new Set(["bicak", "hancer", "kilic", "celik_kilic", "yatagan", "savas_balta", "gurz", "mizrak", "yay", "kalkan", "buyuk_kalkan", "deri_zirh", "pamuk_zirh", "zincir_zirh", "plaka_zirh", "demir_migfer", "tolga", "iksir"]);
const Q_ORDER: QualityTier[] = ["usta_isi", "iyi", "siradan", "kusurlu"];
// Zanaat becerisine göre üretilen kalite kademesini çek.
function rollCraftQuality(skill: number): QualityTier {
  const usta = Math.min(0.35, 0.02 + skill * 0.03);
  const iyi = Math.min(0.40, 0.10 + skill * 0.03);
  const kusurlu = Math.max(0.03, 0.20 - skill * 0.02);
  const r = Math.random();
  if (r < usta) return "usta_isi";
  if (r < usta + iyi) return "iyi";
  if (r > 1 - kusurlu) return "kusurlu";
  return "siradan";
}
function addQuality(p: Player, id: string, tier: QualityTier, n = 1) {
  if (tier === "siradan" || n <= 0) return; // sıradan izlenmez (varsayılan)
  if (!p.inv_q) p.inv_q = {};
  if (!p.inv_q[id]) p.inv_q[id] = {};
  p.inv_q[id]![tier] = (p.inv_q[id]![tier] || 0) + n;
}
// Bir maldan satılacak en iyi kademeyi belirle (izlenen kademe yoksa sıradan).
export function bestQualityTier(p: Player, id: string): QualityTier {
  const q = p.inv_q?.[id]; if (!q) return "siradan";
  for (const t of Q_ORDER) if (t !== "siradan" && (q[t] || 0) > 0) return t;
  return "siradan";
}
// Satışta bir birimi en iyi kademeden düş, kademesini döndür.
function takeQualityUnit(p: Player, id: string): QualityTier {
  const t = bestQualityTier(p, id);
  if (t !== "siradan" && p.inv_q?.[id]) {
    p.inv_q[id]![t] = (p.inv_q[id]![t] || 0) - 1;
    if ((p.inv_q[id]![t] || 0) <= 0) delete p.inv_q[id]![t];
    if (Object.keys(p.inv_q[id]!).length === 0) delete p.inv_q[id];
  }
  return t;
}

export function craft(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const r = RECIPES.find((x) => x.id === id);
  if (!r || p.dead || !canCraft(p, r)) return s;
  for (const [iid, q] of Object.entries(r.inputs)) { p.inventory[iid] -= q; if (p.inventory[iid] <= 0) delete p.inventory[iid]; }
  p.inventory[r.out] = (p.inventory[r.out] || 0) + r.outQty;
  gainSkill(s, "crafting", 6);
  // Kalite kademeli mallar için zanaat becerisine göre kalite üret.
  let qNote = "";
  let qTier: QualityTier | "" = "";
  if (QUALITY_GOODS.has(r.out)) {
    for (let k = 0; k < r.outQty; k++) {
      const tier = rollCraftQuality(p.skills.crafting);
      addQuality(p, r.out, tier);
      if (k === 0 && tier !== "siradan") { qNote = ` — ${QUALITY_LABEL[tier]} işçilik!`; qTier = tier; }
    }
  }
  const craftLoc = qTier
    ? (r.outQty > 1 ? { k: "evj.craftNQ", p: [{ i: r.out }, r.outQty, { q: qTier }] } : { k: "evj.craftQ", p: [{ i: r.out }, { q: qTier }] })
    : (r.outQty > 1 ? { k: "evj.craftN", p: [{ i: r.out }, r.outQty] } : { k: "evj.craft", p: [{ i: r.out }] });
  push(s, "zanaat", `${ITEMS[r.out]?.name || r.out} ürettin${r.outQty > 1 ? ` (×${r.outQty})` : ""}${qNote}.`, "kişisel", false, craftLoc as { k: string; p?: EvtParam[] });
  return s;
}
