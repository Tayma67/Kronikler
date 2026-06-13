// Offline oyun çekirdeği (sürüm 3) — hayat döngüsü + NPC/ilişki/envanter/pazar.
import { currentCalendar, playerAge, CalendarInfo } from "./calendar";
import { ITEMS, marketGoods, locSeed, generateNPCs, NPC } from "./world";

export interface Stats { strength: number; intelligence: number; charisma: number; stamina: number; }
export interface Player {
  name: string; surname: string; gender: "erkek" | "kadın"; base_age: number; age: number;
  money: number; profession: string; health: number; hunger: number;
  reputation: number; honor: number; fear: number; fame: number;
  stats: Stats; stat_points: number; dead: boolean; location_name: string;
  married: boolean; spouse_name: string | null; children: string[];
  inventory: Record<string, number>;
}
export interface GameEvent { day: number; type: string; text: string; scope: "kişisel" | "makro"; landmark?: boolean; }
export interface GameState {
  turn: number; seed: number; player: Player; history: GameEvent[];
  relationships: Record<string, number>; world: { ready: boolean };
}

export const LOCATIONS = ["Üzümlü", "Akpınar", "Demirhan", "Yenişehir", "Karaağaç"];
const PROFS = ["çiftçi","demirci","tüccar","balıkçı","avcı","marangoz","çoban","fırıncı","asker","müzisyen"];
const PROF_STAT: Record<string, keyof Stats> = { çiftçi:"stamina", demirci:"strength", tüccar:"charisma", balıkçı:"stamina", avcı:"strength", marangoz:"intelligence", çoban:"stamina", fırıncı:"intelligence", asker:"strength", müzisyen:"charisma" };
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
    relationships: {},
    player: {
      name: surname ? `${first} ${surname}` : first, surname, gender, base_age: 7, age: 7,
      money: 12, profession: "işsiz", health: 100, hunger: 100,
      reputation: 0, honor: 0, fear: 0, fame: 0,
      stats: { strength: 1, intelligence: 1, charisma: 1, stamina: 2 },
      stat_points: 0, dead: false, location_name: rnd(LOCATIONS),
      married: false, spouse_name: null, children: [], inventory: { ekmek: 2 },
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
  if (p.age === 13 && p.profession === "işsiz") { p.profession = rnd(PROFS); push(s, "meslek_edinme", `Reşit oldun. ${cap(p.profession)} olarak hayata atıldın — dünya sana açıldı.`, "kişisel", true); }
  if (p.age < 13 && chance(0.2)) { const k = rnd(["strength","intelligence","charisma","stamina"] as (keyof Stats)[]); p.stats[k] += 1; }
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
    const drop = Math.round(8 * (cal.season === "Kış" ? 1.3 : 1.0));
    s.player.hunger = Math.max(0, s.player.hunger - drop);
    if (s.player.hunger < 20) s.player.health = Math.max(0, s.player.health - 6);
    else if (s.player.health < 100) s.player.health = Math.min(100, s.player.health + 2);
    if (s.player.health <= 0) { die(s, `${s.player.name} açlık ve hastalığa yenik düştü.`); break; }
    push(s, s.player.age < 13 ? "cocukluk" : "gunluk", monthlyFlavor(s, cal));
    rollLifeEvents(s, cal);
  }
  if (s.history.length > 250) s.history = s.history.slice(-250);
  return s;
}

export function work(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || p.profession === "işsiz") return s;
  const stat = p.stats[PROF_STAT[p.profession] || "stamina"];
  const earn = 4 + stat * 2 + Math.floor(Math.random() * 6);
  p.money += earn; p.hunger = Math.max(0, p.hunger - 6);
  push(s, "çalışma", `${cap(p.profession)} olarak çalıştın, ${earn} akçe kazandın.`);
  return s;
}

export function eat(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  // önce envanterdeki yiyecek, yoksa 2 akçeye sokak yemeği
  const foodId = Object.keys(p.inventory).find((id) => p.inventory[id] > 0 && ITEMS[id]?.feed);
  if (foodId) { const it = ITEMS[foodId]; p.inventory[foodId] -= 1; if (p.inventory[foodId] <= 0) delete p.inventory[foodId]; p.hunger = Math.min(100, p.hunger + (it.feed || 20)); push(s, "gunluk", `${it.name} yedin.`); return s; }
  if (p.money < 2) { push(s, "gunluk", "Yemek alacak akçen yok."); return s; }
  p.money -= 2; p.hunger = Math.min(100, p.hunger + 25); push(s, "gunluk", "Sokaktan karnını doyurdun (2 akçe).");
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
  if (p.money < g.buy) return s;
  p.money -= g.buy; p.inventory[id] = (p.inventory[id] || 0) + 1;
  push(s, "ticaret", `${g.name} aldın (${g.buy} akçe).`);
  return s;
}
export function sellItem(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!(p.inventory[id] > 0)) return s;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return s;
  p.inventory[id] -= 1; if (p.inventory[id] <= 0) delete p.inventory[id];
  p.money += g.sell; push(s, "ticaret", `${g.name} sattın (+${g.sell} akçe).`);
  return s;
}

// İlişki: sohbet et / hediye ver.
export function talkTo(prev: GameState, npc: NPC): GameState {
  const s = clone(prev);
  const gain = 3 + Math.floor(s.player.stats.charisma);
  s.relationships[npc.id] = Math.min(100, (s.relationships[npc.id] || 0) + gain);
  push(s, "sohbet", `${npc.name} ile sohbet ettin. Aranız ısındı.`);
  return s;
}
export function giftTo(prev: GameState, npc: NPC, itemId: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!(p.inventory[itemId] > 0)) return s;
  p.inventory[itemId] -= 1; if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
  s.relationships[npc.id] = Math.min(100, (s.relationships[npc.id] || 0) + 12);
  push(s, "sohbet", `${npc.name}'a ${ITEMS[itemId]?.name || "bir hediye"} verdin. Çok sevindi.`);
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
  p.profession = prof;
  push(s, "meslek_değişimi", `${cap(prof)} mesleğine geçtin.`, "kişisel", true);
  return s;
}
