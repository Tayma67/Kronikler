// Offline oyun çekirdeği (sürüm 3) — hayat döngüsü + NPC/ilişki/envanter/pazar.
import { currentCalendar, playerAge, CalendarInfo } from "./calendar";
import { ITEMS, marketGoods, locSeed, generateNPCs, NPC } from "./world";
import { converse, ConvResult } from "./dialogue";
import { arcById, ArcChoice } from "./arcs";

export interface Stats { strength: number; intelligence: number; charisma: number; stamina: number; }
export interface Skills { combat: number; trade: number; crafting: number; social: number; }
export interface Injury { label: string; stat: keyof Stats; delta: number; weeks_left: number; permanent: boolean; }
export interface Player {
  name: string; surname: string; gender: "erkek" | "kadın"; base_age: number; age: number;
  money: number; profession: string; health: number; hunger: number;
  reputation: number; honor: number; fear: number; fame: number;
  stats: Stats; stat_points: number; dead: boolean; location_name: string;
  married: boolean; spouse_name: string | null; children: string[];
  inventory: Record<string, number>; properties: string[]; generation: number;
  faction: string | null; faction_standing: Record<string, number>;
  skills: Skills; skill_xp: Skills; perks: string[];
  injuries: Injury[]; career_xp: number;
  nam: Nam; child_invests: Record<string, string[]>;
  equipped: { silah: string | null; zirh: string | null };
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
export const PROPERTY_TYPES: Record<string, { name: string; icon: string; cost: number; income: number }> = {
  tarla:    { name: "Tarla",    icon: "🌾", cost: 80,  income: 6 },
  ev:       { name: "Ev",       icon: "🏠", cost: 150, income: 10 },
  dukkan:   { name: "Dükkân",   icon: "🏪", cost: 300, income: 22 },
  degirmen: { name: "Değirmen", icon: "🏭", cost: 600, income: 48 },
};
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

export interface GameEvent { day: number; type: string; text: string; scope: "kişisel" | "makro"; landmark?: boolean; }
export interface DynastyRecord { generation: number; name: string; profession: string; diedAge: number; fame: number; reputation: number; faction: string | null; note: string; }
export interface NpcState { mood: number; memories: string[]; }
export interface StoryProgress { active: { id: string; stage: string } | null; completed: string[]; tension: number; }
export interface GameState {
  turn: number; seed: number; player: Player; history: GameEvent[];
  relationships: Record<string, number>; world: { ready: boolean };
  dynasty: DynastyRecord[];
  npc_state: Record<string, NpcState>;
  story: StoryProgress;
}
// NPC ruh hali/hafıza kaydını getir veya başlat (saf değil — clone'lanmış state'te çağrılır).
export function npcStateOf(s: GameState, id: string): NpcState {
  if (!s.npc_state) s.npc_state = {};
  if (!s.npc_state[id]) s.npc_state[id] = { mood: 0, memories: [] };
  return s.npc_state[id];
}

// Yerleşimler — şehir/köy/kale. Seyahat ve atmosfer.
export interface Place { name: string; kind: "şehir" | "köy" | "kale"; }
export const PLACES: Place[] = [
  { name: "Üzümlü", kind: "köy" }, { name: "Akpınar", kind: "köy" }, { name: "Demirhan", kind: "kale" },
  { name: "Yenişehir", kind: "şehir" }, { name: "Karaağaç", kind: "köy" }, { name: "Söğütlü", kind: "köy" },
  { name: "Bozkır", kind: "kale" }, { name: "Gümüşhisar", kind: "şehir" }, { name: "Çakıllı", kind: "köy" },
  { name: "Kavaklı", kind: "köy" }, { name: "Sarıkaya", kind: "kale" }, { name: "Akşehir", kind: "şehir" },
];
export const LOCATIONS = PLACES.map((p) => p.name);
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
const SPOUSE_K = ["Ayşe","Fatma","Zeynep","Emine","Hatice","Elif","Nur","Reyhan"];
const SPOUSE_E = ["Mehmet","Ahmet","Mustafa","Hasan","Hüseyin","İbrahim","Osman","Yusuf"];
const CHILD = ["Ali","Veli","Can","Ece","Mert","Naz","Kerem","Defne","Arda","Mira"];

const rnd = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

export function npcsOf(s: GameState): NPC[] { return generateNPCs(s.seed); }

export function newGame(first: string, surname: string, gender: "erkek" | "kadın"): GameState {
  return {
    turn: 0, seed: Math.floor(Math.random() * 1e9), world: { ready: true },
    relationships: {}, dynasty: [], npc_state: {}, story: { active: null, completed: [], tension: 0 },
    player: {
      name: surname ? `${first} ${surname}` : first, surname, gender, base_age: 7, age: 7,
      money: 12, profession: "işsiz", health: 100, hunger: 100,
      reputation: 0, honor: 0, fear: 0, fame: 0,
      stats: { strength: 1, intelligence: 1, charisma: 1, stamina: 2 },
      stat_points: 0, dead: false, location_name: rnd(LOCATIONS),
      married: false, spouse_name: null, children: [], inventory: { ekmek: 2 },
      properties: [], generation: 1,
      faction: null, faction_standing: {},
      skills: { combat: 0, trade: 0, crafting: 0, social: 0 },
      skill_xp: { combat: 0, trade: 0, crafting: 0, social: 0 }, perks: [], injuries: [], career_xp: 0,
      nam: { comert: 0, zalim: 0, capkin: 0, dindar: 0, mert: 0 }, child_invests: {}, equipped: { silah: null, zirh: null },
    },
    history: [],
  };
}

function push(s: GameState, type: string, text: string, scope: "kişisel" | "makro" = "kişisel", landmark = false) {
  s.history.push({ day: s.turn, type, text, scope, landmark });
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
  if (p.age < 13 && chance(0.25)) { p.stat_points += 1; push(s, "cocukluk", "Yeni bir şeyler öğrendin (özellik puanı kazandın)."); }
  if (p.dead) return;
  if (!p.married && p.age >= 18 && p.age < 55 && chance(0.06 + p.fame / 1000)) { const name = p.gender === "erkek" ? rnd(SPOUSE_K) : rnd(SPOUSE_E); p.married = true; p.spouse_name = name; p.reputation += 5; push(s, "evlilik", `${name} ile evlendin — yeni bir ocak kuruldu.`, "kişisel", true); }
  if (p.married && p.age >= 18 && p.age < 50 && p.children.length < 5 && chance(0.07)) { const c = rnd(CHILD); p.children.push(c); push(s, "doğum", `Bir evladın dünyaya geldi: ${c}.`, "kişisel", true); }
  if (chance(0.05)) { const g = 5 + Math.floor(Math.random() * 20); p.money += g; push(s, "gunluk", `Yolda ${g} akçe buldun.`); }
  if (chance(0.04)) { p.health = Math.max(0, p.health - 12); push(s, "hastalik", "Hastalandın, birkaç gün yatakta kaldın."); }
  if (p.age >= 55) { p.health = Math.max(0, p.health - Math.floor((p.age - 50) / 4)); const risk = (p.age - 55) * 0.012 + (p.health < 30 ? 0.05 : 0); if (chance(risk)) die(s, `${p.name}, ${p.age} yaşında huzur içinde göçtü.`); }
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
    // Mülk pasif geliri (zanaat/ticaret hünerleriyle artar)
    let inc = s.player.properties.reduce((a, t) => a + (PROPERTY_TYPES[t]?.income || 0), 0);
    let pmult = 1;
    if (hasPerk(s.player, "tuccar_prensi")) pmult += 0.3;
    if (hasPerk(s.player, "tamirci")) pmult += 0.15;
    inc = Math.round(inc * pmult);
    if (inc > 0) { s.player.money += inc; if (i === n - 1) push(s, "mülk_hasat", `Mülklerinden ${inc} akçe gelir geldi.`); }
    push(s, s.player.age < 13 ? "cocukluk" : "gunluk", monthlyFlavor(s, cal));
    rollLifeEvents(s, cal);
  }
  if (s.history.length > 250) s.history = s.history.slice(-250);
  return s;
}

const TITLE_MULT = [1, 1.6, 2.4, 3.2];
export function work(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || p.profession === "işsiz") return s;
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
  const earn = Math.round((base + stat * 2 + Math.floor(Math.random() * 6)) * mult * titleMult);
  p.money += earn; p.hunger = Math.max(0, p.hunger - 6);
  p.career_xp += 1;
  gainSkill(s, "crafting", 8);
  push(s, "çalışma", `${careerTitle(p.profession, p.career_xp - 1)} olarak çalıştın, ${earn} akçe kazandın.`);
  // Terfi?
  if (pr) { const after = careerTier(pr, p.career_xp); if (after > tierBefore) push(s, "terfi", `Yükseldin: artık ${pr.tiers[after]}!`, "kişisel", true); }
  return s;
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
  const price = Math.max(1, Math.round(g.buy * disc));
  if (p.money < price) return s;
  p.money -= price; p.inventory[id] = (p.inventory[id] || 0) + 1;
  gainSkill(s, "trade", 5);
  push(s, "ticaret", `${g.name} aldın (${price} akçe).`);
  return s;
}
export function sellItem(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!(p.inventory[id] > 0)) return s;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return s;
  p.inventory[id] -= 1; if (p.inventory[id] <= 0) delete p.inventory[id];
  let sell = g.sell;
  if (hasPerk(p, "dilbaz")) sell = Math.round(sell * 1.25);
  p.money += sell; gainSkill(s, "trade", 5); push(s, "ticaret", `${g.name} sattın (+${sell} akçe).`);
  return s;
}

// İlişki: niyetli sohbet (bağlamlı), hediye ver.
export function talkWith(prev: GameState, npc: NPC, intent: string): { state: GameState; line: string } {
  const s = clone(prev); const p = s.player;
  const ns = npcStateOf(s, npc.id);
  const rel = s.relationships[npc.id] || 0;
  const r: ConvResult = converse(npc, ns.mood, rel, p.stats.charisma, intent);
  let relDelta = r.relDelta;
  if (relDelta > 0 && hasPerk(p, "dil_dokme")) relDelta = Math.round(relDelta * 1.5);
  s.relationships[npc.id] = Math.max(-100, Math.min(100, rel + relDelta));
  ns.mood = Math.max(-100, Math.min(100, ns.mood + r.moodDelta));
  ns.memories.push(r.memory);
  if (ns.memories.length > 8) ns.memories = ns.memories.slice(-8);
  gainSkill(s, "social", 5);
  push(s, "sohbet", `${npc.name}: ${r.line}`);
  return { state: s, line: r.line };
}
// Eski API ile uyumluluk (basit sohbet = hoşbeş).
export function talkTo(prev: GameState, npc: NPC): GameState {
  return talkWith(prev, npc, "hosbes").state;
}
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
  const ok = Math.random() < Math.min(0.97, 0.25 + (rel - 50) * 0.012 + p.stats.charisma * 0.03 + karizmaBonus);
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

// ── Mektep: çocuk/genç ders çalışır, zekâ/puan kazanır ──
export function study(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead) return s;
  p.hunger = Math.max(0, p.hunger - 5);
  gainSkill(s, "social", 3);
  if (hasPerk(p, "mucit") || chance(0.5)) { p.stat_points += 1; push(s, "cocukluk", "Mektepte çalıştın, bir özellik puanı kazandın."); }
  else push(s, "cocukluk", "Mektepte vakit geçirdin.");
  return s;
}

// ── Suç/Gölge: risk/ödül ──
export function doCrime(prev: GameState, kind: "yankesicilik" | "soygun"): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13) return s;
  const base = kind === "soygun" ? 0.45 : 0.7;            // başarı şansı
  const golgeBonus = p.faction === "golge" ? 0.12 : 0;     // Gölge Kardeşliği avantajı
  const success = Math.random() < base + p.stats.charisma * 0.01 + golgeBonus;
  gainSkill(s, "social", 4);
  if (success) {
    const loot = kind === "soygun" ? 25 + Math.floor(Math.random() * 40) : 6 + Math.floor(Math.random() * 16);
    p.money += loot; p.fear = Math.min(100, p.fear + (kind === "soygun" ? 5 : 2));
    bumpNam(p, "zalim", kind === "soygun" ? 5 : 2);
    push(s, "suç", `${kind === "soygun" ? "Bir soygun" : "Bir yankesicilik"} işini başardın (+${loot} akçe).`);
  } else {
    const fine = Math.min(p.money, kind === "soygun" ? 30 : 10);
    const hurt = (kind === "soygun" ? 10 : 3) * (p.faction === "asker" ? 0.5 : 1);
    p.money -= fine; p.reputation = Math.max(-100, p.reputation - 8); p.health = Math.max(0, p.health - hurt);
    push(s, "suç_yakalandı", `Yakalandın! ${fine} akçe ceza, itibarın sarsıldı.`, "kişisel");
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
  ];
  const seed = (s.turn * 2654435761) >>> 0;
  return pool.filter((_, i) => ((seed >> i) & 1) === 1 || i === seed % pool.length)
    .map((o, i) => ({ ...o, id: `opp_${s.turn}_${i}` }));
}

// Mülk satın al
export function buyProperty(prev: GameState, type: string): GameState {
  const s = clone(prev); const p = s.player; const t = PROPERTY_TYPES[type];
  if (!t || p.dead || p.money < t.cost) return s;
  p.money -= t.cost; p.properties.push(type);
  push(s, "mülk_alım", `${t.name} satın aldın. Adına bir tapu daha.`, "kişisel", true);
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
    turn: 0, seed: Math.floor(Math.random() * 1e9), world: { ready: true }, relationships: {}, dynasty, npc_state: {}, story: { active: null, completed: [], tension: 0 },
    player: {
      name: surname ? `${heir} ${surname}` : heir, surname, gender: Math.random() < 0.5 ? "erkek" : "kadın",
      base_age: 7, age: 7, money: startMoney, profession: "işsiz", health: startHealth, hunger: 100,
      reputation: Math.max(-100, Math.min(100, startRep)), honor: 0, fear: 0, fame: Math.floor(p.fame / 3),
      stats, stat_points: startPoints,
      dead: false, location_name: p.location_name, married: false, spouse_name: null, children: [],
      inventory: { ekmek: 2 }, properties: props, generation: gen,
      faction: null, faction_standing: {},
      skills, skill_xp: { combat: skills.combat * 100, trade: 0, crafting: skills.crafting * 100, social: skills.social * 100 },
      perks: [], injuries: [], career_xp: 0, nam: { comert: 0, zalim: 0, capkin: 0, dindar: 0, mert: 0 }, child_invests: {}, equipped: { silah: null, zirh: null },
    },
    history: [{ day: 0, type: "nesil_devri", text: `${gen}. nesil: ${heir}, ${will.label.toLowerCase()} vasiyetiyle mirası devraldı (${inheritMoney} akçe, ${props.length} mülk).${noteStr}`, scope: "kişisel", landmark: true }],
  };
  return ns;
}

// ── Örgüt eylemleri ──
// Örgüt için bir görev üstlen: akçe + örgüt itibarı kazandırır, biraz tokluk götürür.
export function doFactionTask(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const f = factionById(id);
  if (!f || p.dead || p.age < 13) return s;
  const statBonus = p.stats[f.stat] * 2;
  let reward = f.task.reward + statBonus + Math.floor(Math.random() * 8);
  if (id === "tuccar" && hasPerk(p, "guvenli_kervan")) reward = Math.round(reward * 1.5);
  p.money += reward; p.hunger = Math.max(0, p.hunger - 6);
  let standing = f.task.standing;
  if (hasPerk(p, "lider")) standing = Math.round(standing * 1.5);
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
export function socialTier(axis: SocialAxis, value: number): string {
  const v = Math.max(0, value);
  if (v >= 80) return axis.tiers[4];
  if (v >= 55) return axis.tiers[3];
  if (v >= 30) return axis.tiers[2];
  if (v >= 10) return axis.tiers[1];
  return axis.tiers[0];
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
  push(s, "sosyal", "Köye bir ziyafet verdin; adın dilden dile dolaştı.", "kişisel", true);
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
  const ok = hasPerk(p, "kan_donduran") || Math.random() < 0.5 + p.stats.strength * 0.04;
  if (ok) { let fear = hasPerk(p, "kan_donduran") ? 12 : 8; if (hasPerk(p, "diplomat")) fear = Math.round(fear * 1.5); p.fear = Math.min(100, p.fear + fear); p.reputation = Math.max(-100, p.reputation - 3); bumpNam(p, "zalim", 7); push(s, "sosyal", "Birine gözdağı verdin; adın çekinilen biri oldu."); }
  else { p.reputation = Math.max(-100, p.reputation - 5); p.honor = Math.max(0, p.honor - 3); push(s, "sosyal", "Gözdağın ters tepti; itibarın zarar gördü."); }
  return s;
}

// ── Savaş / Çatışma ──
export interface Encounter { id: string; title: string; desc: string; power: number; reward: number; fame: number; honor: number; danger: number; }
export const ENCOUNTERS: Encounter[] = [
  { id: "haydut",  title: "Yol Haydutları",   desc: "Pusudaki haydutlar kervanına göz dikti.", power: 6,  reward: 35,  fame: 4,  honor: 3,  danger: 14 },
  { id: "duello",  title: "Meydan Okuma",     desc: "Bir yiğit seni teke tek dövüşe çağırdı.", power: 9,  reward: 25,  fame: 7,  honor: 6,  danger: 18 },
  { id: "sinir",   title: "Sınır Çatışması",  desc: "Sancak beyinin emrinde sınırı koru.",      power: 13, reward: 70,  fame: 12, honor: 10, danger: 26 },
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
export function fightEncounter(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const e = ENCOUNTERS.find((x) => x.id === id);
  if (!e || p.dead || p.age < 13) return s;
  const pw = combatPower(p);
  const win = Math.random() < Math.max(0.1, Math.min(0.9, 0.5 + (pw - e.power) * 0.05));
  gainSkill(s, "combat", win ? 12 : 6);
  if (win) {
    let reward = e.reward;
    if (hasPerk(p, "savas_ustasi")) reward = Math.round(reward * 1.5);
    p.money += reward; p.fame = Math.min(100, p.fame + e.fame); p.honor = Math.min(100, p.honor + e.honor);
    p.fear = Math.min(100, p.fear + Math.round(e.fame / 2));
    let dmg = Math.round(e.danger * 0.3);
    if (hasPerk(p, "kalkanli")) dmg = Math.round(dmg * 0.75);
    const floor = hasPerk(p, "yilmaz") ? 5 : 1;
    p.health = Math.max(floor, p.health - dmg);
    push(s, "savaş_zafer", `${e.title}: Zafer senin! (+${reward} akçe, şöhretin arttı.)`, "kişisel", true);
  } else {
    let hurt = e.danger + Math.floor(Math.random() * 10);
    if (hasPerk(p, "kalkanli")) hurt = Math.round(hurt * 0.75);
    p.health = Math.max(0, p.health - hurt);
    push(s, "savaş_yenilgi", `${e.title}: Yara aldın, geri çekildin (−${hurt} sağlık).`, "kişisel");
    if (p.health <= 0) die(s, `${p.name}, ${e.title.toLowerCase()} sırasında can verdi.`);
  }
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
];
export function achievementsOf(s: GameState): { a: Achievement; done: boolean }[] {
  return ACHIEVEMENTS.map((a) => ({ a, done: a.done(s) }));
}

// ── İkilem/olay sonucu uygula (tüm durum değişimi çekirdekte) ──
export interface Delta {
  money?: number; health?: number; hunger?: number;
  reputation?: number; honor?: number; fear?: number; fame?: number;
  stat_points?: number; addItem?: string;
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
    push(s, "beceri", `${m.name} becerin ${after}. seviyeye yükseldi.${SKILL_TIERS.includes(after) ? " Yeni bir hüner seçebilirsin!" : ""}`);
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
export function advanceArc(prev: GameState, choiceIdx: number): GameState {
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
  }
  push(s, "hikaye", c.result, "kişisel");
  if (c.next === "end") {
    push(s, "hikaye_bitti", `"${a.title}" sona erdi.`, "kişisel", true);
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
  return Math.max(-100, Math.min(100, Math.round(a)));
}
export function attitudeLabel(a: number): string {
  if (a >= 40) return "Dost"; if (a >= 10) return "Dostane"; if (a > -10) return "Tarafsız"; if (a > -40) return "Soğuk"; return "Hasım";
}
