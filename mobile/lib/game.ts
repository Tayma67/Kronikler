// Offline oyun çekirdeği — backend mantığının ilk (oynanabilir) TS portu.
// Tamamı cihazda çalışır; sunucu/internet gerekmez. Kalan mantık parça parça eklenecek.
import { currentCalendar, playerAge, WEEKS_PER_YEAR, CalendarInfo } from "./calendar";

export interface Stats { strength: number; intelligence: number; charisma: number; stamina: number; }
export interface Player {
  name: string; surname: string; gender: "erkek" | "kadın"; base_age: number; age: number;
  money: number; profession: string; health: number; hunger: number;
  reputation: number; honor: number; fear: number; fame: number;
  stats: Stats; stat_points: number; dead: boolean; location_name: string;
  children_ids: string[]; spouse_id: string | null;
}
export interface GameEvent { day: number; type: string; text: string; scope: "kişisel" | "makro"; }
export interface GameState {
  turn: number; player: Player; history: GameEvent[]; world: { ready: boolean };
}

const LOCATIONS = ["Üzümlü", "Akpınar", "Demirhan", "Yenişehir", "Karaağaç"];

export function newGame(first: string, surname: string, gender: "erkek" | "kadın"): GameState {
  const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  return {
    turn: 0,
    world: { ready: true },
    player: {
      name: surname ? `${first} ${surname}` : first,
      surname, gender, base_age: 7, age: 7,
      money: 12, profession: "işsiz", health: 100, hunger: 100,
      reputation: 0, honor: 0, fear: 0, fame: 0,
      stats: { strength: 1, intelligence: 1, charisma: 1, stamina: 2 },
      stat_points: 0, dead: false, location_name: loc,
      children_ids: [], spouse_id: null,
    },
    history: [],
  };
}

// Aylık sıradan-hayat olay havuzu (mevsim/yaş duyarlı). Backend zengin; bu çekirdek.
function monthlyEvent(s: GameState, cal: CalendarInfo): GameEvent {
  const p = s.player;
  const child = p.age < 13;
  const pool: string[] = [];
  if (cal.season === "Kış") pool.push("Soğuk sert geçti; ocağın başında ısındın.", "Kar yolları kapadı, evde kaldın.");
  if (cal.season === "İlkbahar") pool.push("Tarlalar yeşerdi, içine bir umut düştü.", "Kuşlar döndü; köy canlandı.");
  if (cal.season === "Yaz") pool.push("Sıcak günlerde gölgede dinlendin.", "Hasada yardım ettin, sırtın ağrıdı.");
  if (cal.season === "Sonbahar") pool.push("Yapraklar döküldü; kışa hazırlık başladı.", "Pazarda son ürünler satıldı.");
  if (child) pool.push("Sokakta arkadaşlarınla oyun oynadın.", "Annen sana bir masal anlattı.");
  else pool.push("Gününü işinle geçirdin, biraz akçe kazandın.", "Handa bir yabancıyla sohbet ettin.");
  const text = pool[Math.floor(Math.random() * pool.length)];
  return { day: s.turn, type: child ? "cocukluk" : "gunluk", text, scope: "kişisel" };
}

// Bir ay ilerlet. turn++, yaş, açlık/sağlık, aylık olay.
export function advance(prev: GameState, n = 1): GameState {
  let s: GameState = JSON.parse(JSON.stringify(prev));
  for (let i = 0; i < n; i++) {
    if (s.player.dead) break;
    s.turn += 1;
    const cal = currentCalendar(s.turn);
    s.player.age = playerAge(s.player.base_age, s.turn);
    // Açlık mevsime göre azalır; düşükse sağlık düşer; tokken hafif iyileşir.
    const hungerDrop = Math.round(8 * (cal.season === "Kış" ? 1.3 : 1.0));
    s.player.hunger = Math.max(0, s.player.hunger - hungerDrop);
    if (s.player.hunger < 20) s.player.health = Math.max(0, s.player.health - 6);
    else if (s.player.health < 100) s.player.health = Math.min(100, s.player.health + 2);
    if (s.player.health <= 0) { s.player.dead = true; s.history.push({ day: s.turn, type: "ölüm", text: `${s.player.name} bu kışı çıkaramadı.`, scope: "kişisel" }); break; }
    s.history.push(monthlyEvent(s, cal));
  }
  // geçmişi sınırla
  if (s.history.length > 200) s.history = s.history.slice(-200);
  return s;
}

// Yemek ye (açlık ↑). Basit etkileşim.
export function eat(prev: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(prev));
  s.player.hunger = Math.min(100, s.player.hunger + 30);
  s.history.push({ day: s.turn, type: "gunluk", text: "Karnını doyurdun.", scope: "kişisel" });
  return s;
}
