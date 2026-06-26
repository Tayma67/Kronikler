// ──────────────────────────────────────────────────────────────────────────
// Kronikler Çok Oyuncu — PROTOKOL (istemci ↔ sunucu ortak sözleşmesi)
//
// Bu dosya hem mobil istemcide hem Cloudflare Durable Object sunucusunda
// kullanılır (sunucu tarafına aynen kopyalanır). Saf TypeScript; React/RN yok.
//
// Mimari: OTORİTELİ SUNUCU + İNCE İSTEMCİ.
//   • Paylaşımlı dünya durumu (saat, taht, loncalar, sancaklar, ekonomi,
//     oyuncuların kamuya açık "hane"si) sunucuda tutulur (tek doğru kaynak).
//   • Ay (turn) yalnız sunucu tick'inde ilerler: oyuncuların ÇOĞUNLUĞU "hazır"
//     derse VEYA tickDeadline (5 dk) dolarsa.
//   • İstemci kişisel durumunu (game.ts) yerelde yaşar; paylaşımlı durumu
//     anlık görüntüden (snapshot) okur, paylaşımlı eylemleri "intent" olarak
//     sunucuya gönderir.
// ──────────────────────────────────────────────────────────────────────────

export const PROTOCOL_VERSION = 1;
export const MAX_PLAYERS = 10;           // bir diyardaki insan slotu (kalanı NPC doldurur)
export const TICK_TIMEOUT_MS = 5 * 60 * 1000; // çoğunluk olmazsa otomatik ay atlama tavanı
export const READY_MAJORITY = 0.5;       // > yarısı hazır → tick

// ── Oyuncunun kamuya açık "hane"si (diğer oyunculara görünen) ──
export interface PlayerPublic {
  id: string;            // misafir cihaz kimliği (kalıcı)
  name: string;          // karakter adı
  surname: string;       // hanedan adı
  gender: "erkek" | "kadın";
  age: number;
  generation: number;
  profession: string;
  fame: number;
  power: number;         // dynastyPower — taht/lonca çekişmelerinde tartı
  crowned: boolean;
  guildId: string | null;     // üye olduğu lonca
  provinceName: string | null;// vali olduğu sancak
  online: boolean;
  ready: boolean;        // bu ay için "ay atla" oyu
  dead: boolean;
}

// ── Paylaşımlı kurumlar ──
export interface GuildState {
  id: string;            // "tuccar" | "asker" | ... (faction id)
  leaderId: string | null;   // lonca başkanı olan oyuncu (yoksa NPC/boş)
  tax: number;           // başkanın koyduğu vergi/aidat (gelir paylaşımını etkiler)
  closed: boolean;       // başkan loncayı kapattıysa yeni katılım durur
}
export interface ProvinceState {
  name: string;          // sancak/şehir adı (LOCATIONS'tan)
  governorId: string | null; // vali olan oyuncu
  tax: number;
}
export interface ThroneState {
  holderId: string | null;
  holderName: string | null;
  claimedTurn: number;
}

// ── Diyarın tam anlık görüntüsü (sunucu → istemci) ──
export interface RealmSnapshot {
  v: number;             // PROTOCOL_VERSION
  realmId: string;
  name: string;          // diyar adı (oda)
  seed: number;          // deterministik NPC/dünya dolgusu için
  turn: number;          // paylaşımlı ay sayacı (diyar başlangıcından beri)
  phase: "open" | "ticking";
  tickDeadline: number;  // epoch ms — otomatik tick anı
  players: PlayerPublic[];
  throne: ThroneState;
  guilds: GuildState[];
  provinces: ProvinceState[];
  econ: number;          // paylaşımlı ekonomi/enflasyon indeksi
  createdAt: number;
}

// ── Paylaşımlı-durum eylemleri (yalnız tick'te otoriteli çözülür) ──
export type SharedIntent =
  | { k: "claimThrone" }
  | { k: "abdicate" }
  | { k: "setGuildTax"; guildId: string; tax: number }
  | { k: "closeGuild"; guildId: string; closed: boolean }
  | { k: "joinGuild"; guildId: string }
  | { k: "leaveGuild" }
  | { k: "claimGuildLead"; guildId: string }
  | { k: "appointGovernor"; province: string }
  | { k: "setProvinceTax"; province: string; tax: number }
  | { k: "campaign"; target: string }
  | { k: "decree"; id: string };

// ── İstemci → Sunucu mesajları ──
export type ClientMsg =
  | { t: "join"; realmId: string; realmName?: string; player: PlayerPublic }
  | { t: "sync"; player: PlayerPublic }   // her ay kişisel kamu durumunu güncelle
  | { t: "ready"; ready: boolean }         // ay-atla oyu
  | { t: "intent"; intent: SharedIntent }  // paylaşımlı eylem
  | { t: "chat"; text: string }
  | { t: "leave" }
  | { t: "ping" };

// ── Tick sonucu: bir oyuncuya paylaşımlı-eylemlerinin/çapraz-etkilerin sonucu ──
export interface TickResult {
  playerId: string;
  ok: boolean;
  events: TickEvent[];     // o oyuncuya düşen paylaşımlı-dünya olayları
}
export interface TickEvent {
  k: string;               // i18n anahtarı (örn "mp.throne.won", "mp.guild.taxedByKing")
  p?: (string | number)[]; // parametreler
}

// ── Sunucu → İstemci mesajları ──
export type ServerMsg =
  | { t: "welcome"; you: string; snapshot: RealmSnapshot }
  | { t: "snapshot"; snapshot: RealmSnapshot }       // tam durum (katılış + tick sonrası)
  | { t: "presence"; players: PlayerPublic[]; phase: RealmSnapshot["phase"]; tickDeadline: number }
  | { t: "tick"; turn: number; results: TickResult[]; snapshot: RealmSnapshot }
  | { t: "chat"; from: string; fromName: string; text: string; at: number }
  | { t: "error"; code: string; msg: string }
  | { t: "pong" };

// ── Yardımcılar ──
export function readyToTick(players: PlayerPublic[]): boolean {
  const live = players.filter((p) => p.online && !p.dead);
  if (live.length === 0) return false;
  const ready = live.filter((p) => p.ready).length;
  return ready / live.length > READY_MAJORITY;
}

// Bir oyuncunun game.ts player'ından kamu hanesini türet (istemcide kullanılır).
export function toPublic(
  id: string,
  p: { name: string; surname?: string; gender: "erkek" | "kadın"; age: number; generation: number; profession: string; fame: number; crowned?: boolean; faction?: string | null; governorships?: string[]; dead?: boolean },
  power: number,
  online = true,
  ready = false,
): PlayerPublic {
  return {
    id, name: p.name, surname: p.surname || "", gender: p.gender, age: p.age,
    generation: p.generation, profession: p.profession, fame: Math.round(p.fame), power: Math.round(power),
    crowned: !!p.crowned, guildId: p.faction || null,
    provinceName: (p.governorships && p.governorships[0]) || null,
    online, ready, dead: !!p.dead,
  };
}
