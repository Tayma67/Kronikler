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

export const PROTOCOL_VERSION = 3;
export const MAX_PLAYERS = 10;           // bir diyardaki insan slotu (kalanı NPC doldurur)
export const TICK_TIMEOUT_MS = 5 * 60 * 1000; // çoğunluk olmazsa otomatik ay atlama tavanı
export const TICK_SOFT_MS = 90 * 1000;         // en az bir oyuncu hazırsa bekleme bu kadara iner (2 kişilik diyarda 5 dk çile bitti)
export const READY_MAJORITY = 0.5;       // > yarısı hazır → tick

// Mount & Blade muhabbeti: bir beyliğe bey olmak/kurmak için gereken asgari hane gücü
// (dynastyPower). Bunun altındaki "sıradan" oyuncu önce güç biriktirmeli.
export const BEY_MIN_POWER = 80;
// Gerçekçi meşruiyet eşikleri — tek oyuncudaki taht/sefer kurallarıyla uyumlu.
export const BEY_MIN_AGE = 18;        // beyliğe bey olmak için reşit (çocuk bey olamaz)
export const BEY_COST = 1500;         // sancak bayrağı kaldırmak/maiyet toplamak için hazine (altın)
export const MP_CAMPAIGN_COST = 800;  // beylikler arası sefer maliyeti (SP CAMPAIGN_COST ile aynı)
// Taht (hükümdarlık) — SP throneRequirements ile birebir eşik.
export const THRONE_MIN_AGE = 35;
export const THRONE_MIN_POWER = 140;
export const THRONE_MIN_FAME = 60;
export const THRONE_COST = 5000;

// ── Sosyal doku (oyuncular arası): destek / rekabet / entrika / yardım maliyetleri ──
export const GIFT_MAX = 100000;       // tek bağışta üst sınır (akılsız transfer engeli)
export const SPY_COST = 300;          // casusluk
export const SABOTAGE_COST = 500;     // sabotaj
export const ASSASSINATE_COST = 2500; // suikast tertibi (pahalı + riskli)
export const BRIBE_COST = 1200;       // ayartma/rüşvet (üye çalma)
export const SLANDER_COST = 400;      // iftira/dedikodu
export const LOAN_DEFAULT = 1000;     // varsayılan borç tutarı
export const ASSASSINATE_MIN_AGE = 18;
export const COURT_NPC_COST = 250;    // NPC'yi yanına çekme (ziyafet/hediye)
export const TURN_NPC_COST = 400;     // NPC'yi bir oyuncuya karşı kışkırtma
export const MEDIATE_NPC_COST = 300;  // NPC ile oyuncu arasını düzeltme
// ── Ortak girişim (kervan ortaklığı): oyuncular hisse koyar, kervan 3 ayda döner ──
// Tek ortak zarar eder, ortak sayısı arttıkça kâr artar → MP'nin "birlikte kazan" ekonomisi.
export const VENTURE_MIN_STAKE = 50;   // asgari hisse
export const VENTURE_MAX_STAKE = 500;  // oyuncu başına hisse tavanı (balina + ortak = sınırsız kâr kapısı olmasın)
export const VENTURE_TICKS = 3;        // kervanın dönüş süresi (ay/tick)
// Diyarın 5 beyliği — game.ts BEYLIKS ile BİREBİR aynı (id'ler eşleşmeli). Hem istemci
// hem sunucu buradan okur → kayma olmaz. NPC ocaklar boş beylikleri tutar.
export const BEYLIK_DEFS: { id: string; name: string }[] = [
  { id: "demirhan",   name: "Demirhan Beyliği" },
  { id: "yenisehir",  name: "Yenişehir Sancağı" },
  { id: "gumushisar", name: "Gümüşhisar Beyliği" },
  { id: "aksehir",    name: "Akşehir Sancağı" },
  { id: "karahisar",  name: "Karahisar Beyliği" },
];

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
  guildId: string | null;     // üye olduğu lonca/ocak
  provinceName: string | null;// vali olduğu sancak
  beylikId: string | null;    // bağlı olduğu beylik (grup/takım) — SUNUCU sahibi
  honor: number;              // şeref/sadakat ekseni (−100..100); ihanet düşürür, yardım yükseltir — SUNUCU sahibi
  married: boolean;           // evli mi (game.ts'ten senkron) — oyuncular arası evlilik kontrolü için
  traveling: boolean;         // "Seyahate Çık": kişi dokunulmaz (kişisel saldırı engellenir), diyarı etkileşime açık kalır — SUNUCU sahibi
  npcMonths?: number;         // çevrimdışı NPC-vekil: yaş ilerletme sayacı (sunucu içi)
  online: boolean;
  ready: boolean;        // bu ay için "ay atla" oyu
  dead: boolean;
  laurel?: string | null; // yıllık diyar ödülü nişanı: bey/yildiz/alicenap (v3+ opsiyonel; yıl kapanışında sunucu dağıtır)
}

// ── Paylaşımlı kurumlar ──
export interface GuildState {
  id: string;            // "tuccar" | "asker" | ... (faction id)
  leaderId: string | null;   // lonca başkanı olan oyuncu (yoksa NPC/boş)
  leaderName: string | null;
  tax: number;           // başkanın koyduğu aylık aidat (üyeler öder, başkan toplar)
  closed: boolean;       // başkan loncayı kapattıysa yeni katılım durur
  backing: string | null;// loncanın desteklediği beylik (kingmaker: nüfuzu o beyliğe katılır)
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
// ── Beylik (Mount & Blade toprağı): kendi beyi olan, içinde şehir/köy barındıran
//    yarı-bağımsız diyar. Bir oyuncu boş/zayıf beyliğe bey olur, güçlüyse mevcut beyi
//    devirir, başka beyliğe sefer açıp ilhak eder. Boş beylikleri NPC ocaklar tutar. ──
export interface BeylikState {
  id: string;                 // BEYLIK_DEFS id (demirhan, yenisehir, …)
  name: string;
  beyId: string | null;       // bey olan oyuncu (null → NPC/ocak elinde)
  beyName: string | null;
  ocak: string | null;        // beyliği destekleyen ocak (fraksiyon) — gücü etkiler
  tax: number;                // beyin bağlı oyunculara koyduğu vergi
  power: number;              // beyliğin askerî/savunma gücü (sefer dengesinde tartı)
  claimedTurn: number;
}

// ── Paylaşımlı NPC katmanı (diyar ileri gelenleri) ──
// Seed'den deterministik üretilir → tüm oyuncular AYNI NPC'leri görür. Sunucu otoritesi.
export interface NpcPublic {
  id: string;
  name: string;
  role: string;       // vezir | lonca | rakip | tuccar | alim | komutan | kadi
  beylikId: string;   // bulunduğu beylik
  influence: number;  // nüfuz — sosyal/siyasi ağırlık (NPC desteği bunu katar)
}

// ── Oyuncular arası sosyal doku ──
// Pakt: müttefiklik / dünürlük (kan bağı) / ilan edilmiş savaş.
export type PactType = "alliance" | "marriage" | "war";
// İki oyuncu arasındaki bağ — standing simetrik (a<b kanonik sıra), pakt karşılıklı.
export interface Bond { a: string; b: string; standing: number; pact: PactType | null; since: number; }
// NPC↔oyuncu ilişkisi (kişiye özel): aynı NPC bir oyuncuya dost, başkasına düşman olabilir.
export interface NpcBond { npc: string; player: string; standing: number; }
// Diyar haberi (kozmetik akış): i18n anahtarı + parametreler. Oyuna/dengeye etkisi yoktur.
export interface RealmNews { k: string; p: (string | number)[]; turn: number; }
// El sıkışma gerektiren teklif (ittifak/dünür/borç/sığınma) — hedef kabul/ret eder.
export interface Offer { id: string; from: string; fromName: string; to: string; kind: "alliance" | "marriage" | "loan" | "asylum"; amount?: number; turn: number; }
// Ortak girişim (kervan ortaklığı) — hisseler + vade. resolveTurn geldiğinde sunucu çözer.
export interface VentureState { backers: { id: string; name: string; amount: number }[]; startedTurn: number; resolveTurn: number; }

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
  beyliks: BeylikState[]; // 5 beylik — Mount & Blade toprak/grup katmanı
  bonds: Bond[];         // oyuncular arası bağlar (standing + pakt) — yarı-açık (ittifaklar bilinir)
  npcs: NpcPublic[];     // PAYLAŞIMLI NPC kütüğü (diyar ileri gelenleri) — herkes aynısını görür
  npcBonds: NpcBond[];   // NPC↔oyuncu ilişkileri (kişiye göre değişir)
  news: RealmNews[];     // diyar haberleri (NPC'lerden kozmetik akış — oyuna etkisi YOK)
  offers: Offer[];       // bekleyen el-sıkışma teklifleri (ittifak/dünür/borç/sığınma)
  venture?: VentureState | null; // aktif ortak girişim (v3+; eski sunucu göndermez → istemci UI'ı gizler)
  chatLog?: { from: string; fromName: string; text: string; at: number }[]; // meclis hafızası: genel sohbetin son 12 satırı (v3+ opsiyonel; eski sunucu göndermez → istemci boş kabul eder)
  yearBase?: Record<string, { power: number; fame: number; honor: number }>; // yıllık ödül taban ölçümü (sunucu içi; v3+ opsiyonel)
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
  | { k: "decree"; id: string }
  // ── Beylik (Mount & Blade) eylemleri ──
  | { k: "claimBey"; beylikId: string }       // beye oyna: boşsa kur, doluysa devir (en yüksek güç)
  | { k: "joinBeylik"; beylikId: string }      // beyliğe bağlan (gruba katıl, bey olmadan)
  | { k: "leaveBeylik" }
  | { k: "setBeylikTax"; beylikId: string; tax: number } // bey üyelere vergi koyar
  | { k: "beylikCampaign"; target: string }   // bey olarak başka beyliğe sefer/savaş
  | { k: "setGuildBacking"; guildId: string; beylikId: string | null } // lonca başkanı: loncayı bir beyliğe destekçi yap (kingmaker)
  // ── Sosyal doku ── (altın bedelleri istemcide kesilir; sunucu çekişme/riski çözer)
  // Destek & dostluk
  | { k: "gift"; to: string; amount: number }      // bağış (anlık altın) — düşene el uzat
  | { k: "vouch"; to: string }                      // kefillik/övgü: itibarından harcayıp onu yücelt
  | { k: "proposeAlliance"; to: string }            // ittifak teklifi
  | { k: "proposeMarriage"; to: string }            // EVLİLİK teklifi (iki oyuncu karakteri evlenir — karşı cinsiyet)
  | { k: "proposeLoan"; to: string; amount: number }// borç teklifi
  | { k: "offerAsylum"; to: string }                // sığınma davet (devrik bey/öksüz vâris)
  | { k: "respondOffer"; offerId: string; accept: boolean }
  | { k: "breakPact"; with: string }                // paktı boz — ihanet (ağır şeref bedeli)
  // Rekabet
  | { k: "duel"; to: string }                       // düello daveti
  // Entrika & ihanet (gizli, tick'te riskle çözülür)
  | { k: "spy"; on: string }                        // casusluk
  | { k: "sabotage"; on: string }                   // sabotaj
  | { k: "assassinate"; on: string }                // suikast tertibi
  | { k: "bribe"; on: string }                      // ayartma: rakip beyin üyesini kendi beyliğine çek
  | { k: "slander"; on: string }                    // iftira/dedikodu
  // ── Paylaşımlı NPC ilişkileri (Faz B) ──
  | { k: "courtNpc"; npcId: string }                // NPC'yi yanına çek (standing↑)
  | { k: "turnNpc"; npcId: string; against: string }// NPC'yi bir oyuncuya karşı kışkırt
  | { k: "mediateNpc"; npcId: string; player: string } // NPC ile bir oyuncunun arasını düzelt
  // ── Ortak girişim ──
  | { k: "ventureBack"; amount: number };           // kervan ortaklığına hisse koy (altın istemcide kesilir)

// ── İstemci → Sunucu mesajları ──
export type ClientMsg =
  | { t: "join"; realmId: string; realmName?: string; player: PlayerPublic }
  | { t: "sync"; player: PlayerPublic }   // her ay kişisel kamu durumunu güncelle
  | { t: "ready"; ready: boolean }         // ay-atla oyu
  | { t: "intent"; intent: SharedIntent }  // paylaşımlı eylem
  | { t: "chat"; text: string; scope?: ChatScope; to?: string } // scope: genel/beylik/fısıltı; to: fısıltı hedef oyuncu id
  | { t: "saveState"; blob: string }       // kişisel game.ts durumunu sunucuya yedekle (tekrar girişte aynı karakter)
  | { t: "setTravel"; traveling: boolean }  // "Seyahate Çık" / "Dön"
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
  | { t: "welcome"; you: string; snapshot: RealmSnapshot; saved?: string | null } // saved: bu oyuncunun yedeklenmiş karakteri (varsa) → aynı karaktere devam
  | { t: "snapshot"; snapshot: RealmSnapshot }       // tam durum (katılış + tick sonrası)
  | { t: "presence"; players: PlayerPublic[]; phase: RealmSnapshot["phase"]; tickDeadline: number }
  | { t: "tick"; turn: number; results: TickResult[]; snapshot: RealmSnapshot }
  | { t: "missed"; events: TickEvent[] } // çevrimdışıyken biriken kişisel olaylar (katılımda teslim edilir; hediye/borç/evlilik kaybolmaz)
  | { t: "chat"; from: string; fromName: string; text: string; at: number; scope?: ChatScope; to?: string }
  | { t: "error"; code: string; msg: string }
  | { t: "pong" };

// Sohbet kanalı: genel (diyar), beylik (yalnız aynı beyliktekiler), fısıltı (1↔1).
export type ChatScope = "all" | "beylik" | "whisper";

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
  p: { name: string; surname?: string; gender: "erkek" | "kadın"; age: number; generation: number; profession: string; fame: number; crowned?: boolean; faction?: string | null; governorships?: string[]; dead?: boolean; married?: boolean },
  power: number,
  online = true,
  ready = false,
): PlayerPublic {
  return {
    id, name: p.name, surname: p.surname || "", gender: p.gender, age: p.age,
    generation: p.generation, profession: p.profession, fame: Math.round(p.fame), power: Math.round(power),
    crowned: !!p.crowned, guildId: p.faction || null,
    provinceName: (p.governorships && p.governorships[0]) || null,
    beylikId: null, honor: 0, traveling: false, // sunucu sahibi; sync'te korunur, istemci ezmez
    married: !!p.married,
    online, ready, dead: !!p.dead,
  };
}
