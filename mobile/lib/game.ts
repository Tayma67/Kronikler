// Offline oyun çekirdeği — backend mantığının oynanabilir TS portu (sürüm 2).
// Tam hayat döngüsü: çocukluk → reşit olma + meslek → çalışma/evlilik/çocuk → yaşlılık → ölüm.
// Tamamı cihazda; sunucu/internet yok. Kalan derin sistemler parça parça eklenecek.
import { currentCalendar, playerAge, CalendarInfo } from "./calendar";

export interface Stats { strength: number; intelligence: number; charisma: number; stamina: number; }
export interface Player {
  name: string; surname: string; gender: "erkek" | "kadın"; base_age: number; age: number;
  money: number; profession: string; health: number; hunger: number;
  reputation: number; honor: number; fear: number; fame: number;
  stats: Stats; stat_points: number; dead: boolean; location_name: string;
  married: boolean; spouse_name: string | null; children: string[];
}
export interface GameEvent { day: number; type: string; text: string; scope: "kişisel" | "makro"; landmark?: boolean; }
export interface GameState { turn: number; player: Player; history: GameEvent[]; world: { ready: boolean }; }

const LOCATIONS = ["Üzümlü", "Akpınar", "Demirhan", "Yenişehir", "Karaağaç"];
const PROFS = ["çiftçi", "demirci", "tüccar", "balıkçı", "avcı", "marangoz", "çoban", "fırıncı", "asker", "müzisyen"];
const PROF_STAT: Record<string, keyof Stats> = {
  çiftçi: "stamina", demirci: "strength", tüccar: "charisma", balıkçı: "stamina",
  avcı: "strength", marangoz: "intelligence", çoban: "stamina", fırıncı: "intelligence",
  asker: "strength", müzisyen: "charisma",
};
const SPOUSE_NAMES_K = ["Ayşe", "Fatma", "Zeynep", "Emine", "Hatice", "Elif", "Nur", "Reyhan"];
const SPOUSE_NAMES_E = ["Mehmet", "Ahmet", "Mustafa", "Hasan", "Hüseyin", "İbrahim", "Osman", "Yusuf"];
const CHILD_NAMES = ["Ali", "Veli", "Can", "Ece", "Mert", "Naz", "Kerem", "Defne", "Arda", "Mira"];

function rnd<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function chance(p: number): boolean { return Math.random() < p; }

export function newGame(first: string, surname: string, gender: "erkek" | "kadın"): GameState {
  return {
    turn: 0, world: { ready: true },
    player: {
      name: surname ? `${first} ${surname}` : first, surname, gender, base_age: 7, age: 7,
      money: 12, profession: "işsiz", health: 100, hunger: 100,
      reputation: 0, honor: 0, fear: 0, fame: 0,
      stats: { strength: 1, intelligence: 1, charisma: 1, stamina: 2 },
      stat_points: 0, dead: false, location_name: rnd(LOCATIONS),
      married: false, spouse_name: null, children: [],
    },
    history: [],
  };
}

function push(s: GameState, type: string, text: string, scope: "kişisel" | "makro" = "kişisel", landmark = false) {
  s.history.push({ day: s.turn, type, text, scope, landmark });
}

function monthlyFlavor(s: GameState, cal: CalendarInfo): string {
  const child = s.player.age < 13;
  const pool: string[] = [];
  if (cal.season === "Kış") pool.push("Soğuk sert geçti; ocağın başında ısındın.", "Kar yolları kapadı, evde kaldın.");
  if (cal.season === "İlkbahar") pool.push("Tarlalar yeşerdi, içine umut düştü.", "Kuşlar döndü; köy canlandı.");
  if (cal.season === "Yaz") pool.push("Sıcak günlerde gölgede dinlendin.", "Hasada yardım ettin, sırtın ağrıdı.");
  if (cal.season === "Sonbahar") pool.push("Yapraklar döküldü; kışa hazırlık başladı.", "Pazarda son ürünler satıldı.");
  if (child) pool.push("Sokakta arkadaşlarınla oyun oynadın.", "Annen sana bir masal anlattı.", "Derede taş kaydırdın.");
  else pool.push("Gününü işinle geçirdin.", "Handa bir yabancıyla sohbet ettin.", "Çarşıda dolaştın.");
  return rnd(pool);
}

// Aylık yaşam olayları (küçük olasılıklar). Reşit olma, evlilik, çocuk, hastalık, talih.
function rollLifeEvents(s: GameState, cal: CalendarInfo) {
  const p = s.player;
  // Reşit olma: 13'e basınca meslek + dünya açılır
  if (p.age === 13 && p.profession === "işsiz") {
    p.profession = rnd(PROFS);
    push(s, "meslek_edinme", `Reşit oldun. ${cap(p.profession)} olarak hayata atıldın — dünya sana açıldı.`, "kişisel", true);
  }
  // Çocuklukta hafif stat gelişimi
  if (p.age < 13 && chance(0.2)) {
    const k = rnd(["strength", "intelligence", "charisma", "stamina"] as (keyof Stats)[]);
    p.stats[k] += 1;
  }
  if (p.dead) return;
  // Evlilik fırsatı (bekar yetişkin)
  if (!p.married && p.age >= 18 && p.age < 55 && chance(0.06 + p.fame / 1000)) {
    const name = p.gender === "erkek" ? rnd(SPOUSE_NAMES_K) : rnd(SPOUSE_NAMES_E);
    p.married = true; p.spouse_name = name; p.reputation += 5;
    push(s, "evlilik", `${name} ile evlendin — yeni bir ocak kuruldu.`, "kişisel", true);
  }
  // Çocuk (evli, uygun yaş)
  if (p.married && p.age >= 18 && p.age < 50 && p.children.length < 5 && chance(0.07)) {
    const c = rnd(CHILD_NAMES); p.children.push(c);
    push(s, "doğum", `Bir evladın dünyaya geldi: ${c}. Kucağın doldu.`, "kişisel", true);
  }
  // Talih / kaza
  if (chance(0.05)) { const g = 5 + Math.floor(Math.random() * 20); p.money += g; push(s, "gunluk", `Yolda ${g} akçe buldun.`); }
  if (chance(0.04)) { p.health = Math.max(0, p.health - 12); push(s, "hastalik", "Hastalandın, birkaç gün yatakta kaldın."); }
  // Yaşlılık: 55+ sağlık aşınır, ölüm riski yükselir
  if (p.age >= 55) {
    p.health = Math.max(0, p.health - Math.floor((p.age - 50) / 4));
    const deathRisk = (p.age - 55) * 0.012 + (p.health < 30 ? 0.05 : 0);
    if (chance(deathRisk)) { die(s, `${p.name}, ${p.age} yaşında huzur içinde göçtü.`); }
  }
}

function die(s: GameState, text: string) {
  s.player.dead = true;
  push(s, "ölüm", text, "kişisel", true);
}
function cap(x: string) { return x.charAt(0).toUpperCase() + x.slice(1); }

// Bir ay ilerlet.
export function advance(prev: GameState, n = 1): GameState {
  let s: GameState = JSON.parse(JSON.stringify(prev));
  for (let i = 0; i < n; i++) {
    if (s.player.dead) break;
    s.turn += 1;
    const cal = currentCalendar(s.turn);
    s.player.age = playerAge(s.player.base_age, s.turn);
    const hungerDrop = Math.round(8 * (cal.season === "Kış" ? 1.3 : 1.0));
    s.player.hunger = Math.max(0, s.player.hunger - hungerDrop);
    if (s.player.hunger < 20) s.player.health = Math.max(0, s.player.health - 6);
    else if (s.player.health < 100) s.player.health = Math.min(100, s.player.health + 2);
    if (s.player.health <= 0) { die(s, `${s.player.name} açlık ve hastalığa yenik düştü.`); break; }
    push(s, s.player.age < 13 ? "cocukluk" : "gunluk", monthlyFlavor(s, cal));
    rollLifeEvents(s, cal);
  }
  if (s.history.length > 250) s.history = s.history.slice(-250);
  return s;
}

// Çalış: meslek + ilgili stat'a göre akçe kazan (tokluk harcar). 13+.
export function work(prev: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(prev));
  const p = s.player;
  if (p.dead || p.age < 13 || p.profession === "işsiz") return s;
  const stat = p.stats[PROF_STAT[p.profession] || "stamina"];
  const earn = 4 + stat * 2 + Math.floor(Math.random() * 6);
  p.money += earn; p.hunger = Math.max(0, p.hunger - 6);
  if (chance(0.25)) p.stat_points = (p.stat_points || 0);
  push(s, "çalışma", `${cap(p.profession)} olarak çalıştın, ${earn} akçe kazandın.`);
  return s;
}

export function eat(prev: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(prev));
  if (s.player.money < 2) { push(s, "gunluk", "Yemek alacak akçen yok."); return s; }
  s.player.money -= 2;
  s.player.hunger = Math.min(100, s.player.hunger + 30);
  push(s, "gunluk", "Karnını doyurdun (2 akçe).");
  return s;
}
