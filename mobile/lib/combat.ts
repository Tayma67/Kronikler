// Tur-tabanlı taktik savaş motoru (saf). Sonuç savas ekranında GameState'e uygulanır.
import { Player, Encounter, combatPower, armorDefense, weaponClass, shieldBlockChance } from "./game";
import { WClass } from "./world";

export type Move = "hamle" | "savustur" | "ozel";
export const MOVES: { id: Move; label: string; icon: string; hint: string }[] = [
  { id: "hamle",    label: "Hamle",    icon: "crossed-swords", hint: "Saldırır. Özel'i bozar, savuşturmaya yenilir." },
  { id: "savustur", label: "Savuştur", icon: "shield",         hint: "Savunur. Hamle'yi karşılar, özele yenilir." },
  { id: "ozel",     label: "Özel",     icon: "fist",           hint: "Güçlü vuruş. Savuşturmayı kırar, hamleye yenilir." },
];
// Taş-kağıt-makas: hamle>ozel, savustur>hamle, ozel>savustur
function beats(a: Move, b: Move): boolean {
  return (a === "hamle" && b === "ozel") || (a === "savustur" && b === "hamle") || (a === "ozel" && b === "savustur");
}

// Duruşlar (Vercel combat_engine.py portu): saldırı/savunma çarpanı.
export type Stance = "saldirgan" | "dengeli" | "savunmaci";
export const STANCES: { id: Stance; label: string; icon: string; atk: number; def: number }[] = [
  { id: "saldirgan", label: "Saldırgan", icon: "crossed-swords", atk: 1.35, def: 0.70 },
  { id: "dengeli",   label: "Dengeli",   icon: "fist",           atk: 1.00, def: 1.00 },
  { id: "savunmaci", label: "Savunmacı", icon: "shield",         atk: 0.70, def: 1.40 },
];
const stanceOf = (s: Stance) => STANCES.find((x) => x.id === s) || STANCES[1];

// Düşman arketipleri (her biri farklı hamle dağılımı + okunabilirlik): dövüşler birbirine benzemesin.
export type EArch = "kaba" | "vahsi" | "usta" | "asker";
// w = [hamle, savustur, ozel] olasılık ağırlıkları · feint = okuma isabetine eklenen (artı = dürüst/okunur, eksi = kurnaz/fent)
const ARCH: Record<EArch, { w: [number, number, number]; feint: number }> = {
  kaba:  { w: [0.30, 0.10, 0.60], feint: +0.08 }, // ağır 'özel', savunmasız, dürüst → okunur ama sert vurur
  vahsi: { w: [0.55, 0.05, 0.40], feint: +0.04 }, // amansız saldırı, neredeyse hiç savunmaz
  usta:  { w: [0.30, 0.45, 0.25], feint: -0.10 }, // savunmacı düellocu, çok fent → kurnaz, zor okunur
  asker: { w: [0.40, 0.35, 0.25], feint: -0.03 }, // disiplinli denge
};
// Karşılaşma → arketip eşlemesi (id'den; bilinmeyen 'asker').
const ENCOUNTER_ARCH: Record<string, EArch> = {
  haydut: "vahsi", ayi: "kaba", duello: "usta", turnuva: "usta", korsan: "vahsi",
  sinir: "asker", reis: "kaba", akin: "vahsi", kusatma: "kaba", nemesis: "usta",
};
export function encounterArch(id: string): EArch { return ENCOUNTER_ARCH[id] || "asker"; }

// Savaş log'u dile bağımsız tutulur: combat.ts saf kalır, savas.tsx render anında çevirir.
// Param: düz string/sayı, { mv } = hamle adı (cb.<id>), { lk } = çevrilecek alt-anahtar (fent/blok eki).
export type CbLogParam = string | number | { mv: Move } | { lk: string };
export interface CbLogEntry { k: string; p?: CbLogParam[]; }

export interface BattleState {
  enemyName: string; enemyPower: number;
  playerHp: number; playerMax: number; enemyHp: number; enemyMax: number;
  round: number; log: CbLogEntry[]; over: boolean; won: boolean;
  enemyIntent: Move; // telegraf: düşmanın bir sonraki tahmini hamlesi (oyuncu sezer ve karşılar)
  arch: EArch; // düşman arketipi (hamle eğilimi + okunabilirlik)
  desperate?: boolean; // düşman köşeye sıkıştı (HP < %30): çılgınca saldırır, okuması zorlaşır, sert vurur
}

// Düşmanın hamle eğilimi: arketip ağırlıkları + güçlü düşman 'özel'e kayar + çaresizse saldırganlaşır.
function pickEnemyMove(arch: EArch, power: number, desperate = false): Move {
  let [wh, ws, wo] = ARCH[arch].w;
  if (power >= 13) { const shift = Math.min(ws, 0.1); ws -= shift; wo += shift; } // güçlü düşman savunmayı bırakır
  if (desperate) { const d = ws * 0.7; ws -= d; wo += d * 0.6; wh += d * 0.4; } // köşeye sıkışınca savunmayı bırakıp saldırır
  const r = Math.random() * (wh + ws + wo);
  if (r < wh) return "hamle";
  if (r < wh + ws) return "savustur";
  return "ozel";
}
// Niyet okuma isabeti: dövüş becerisi + zekâ artırır, düşman gücü + arketip kurnazlığı azaltır.
// Telegraf bu ihtimalle doğru çıkar; aksi halde düşman fent atıp niyetini gizler.
export function readAccuracy(p: Player, enemyPower: number, arch: EArch = "asker", desperate = false): number {
  const skill = p.skills?.combat || 0;
  const intel = p.stats?.intelligence || 0;
  let a = 0.70 + skill * 0.018 + intel * 0.004 - Math.max(0, enemyPower - 6) * 0.012 + ARCH[arch].feint;
  if (weaponClass(p) === "hizli") a += 0.05; // çevik refleks düşmanı daha iyi okur
  if (desperate) a -= 0.12; // çaresiz düşman erratik → niyeti okuması zor
  // Elit düşman (güç 14+) asla tam kitap gibi okunmaz — geç oyunda dövüş otomatiğe bağlanmasın.
  return Math.max(0.38, Math.min(enemyPower >= 14 ? 0.85 : 0.93, a));
}

export function startBattle(p: Player, e: Encounter): BattleState {
  const pw = combatPower(p);
  const enemyMax = 30 + e.power * 4;
  let enemyHp = enemyMax;
  const log: CbLogEntry[] = [{ k: "cb.log.start", p: [e.title, pw, e.power] }];
  // Menzilli silah (yay): melee öncesi açılış oku.
  if (weaponClass(p) === "menzilli") {
    const volley = 6 + (p.skills?.combat || 0) + Math.round(pw * 0.18);
    enemyHp = Math.max(1, enemyHp - volley);
    log.push({ k: "cb.log.volley", p: [volley] });
  }
  return {
    enemyName: e.title, enemyPower: e.power,
    playerHp: Math.max(20, Math.round(p.health)), playerMax: Math.max(20, Math.round(p.health)),
    enemyHp, enemyMax,
    round: 1, log, over: enemyHp <= 0, won: enemyHp <= 0,
    arch: encounterArch(e.id), enemyIntent: pickEnemyMove(encounterArch(e.id), e.power),
  };
}

// Silah arketipinin saldırı çarpanı (tur ve sonuca göre).
function classAtkMult(wc: WClass | null, round: number, outcome: "tie" | "win", mv: Move): number {
  switch (wc) {
    case "ezici":    return 1.2;                                    // ezici: her vuruşta +%20 (zırh ezer)
    case "kesici":   return outcome === "win" ? 1.12 : 1.0;         // kesici: net üstünlükte güvenilir +%12
    case "delici":   return round <= 2 ? 1.25 : 1.0;                // delici: erişim — ilk turlarda +%25
    case "hizli":    return outcome === "tie" ? 1.5 : 1.05;         // hızlı: denk anında inisiyatif
    case "menzilli": return 0.9;                                    // menzilli: yakın dövüşte zayıf
    default:         return 1.0;
  }
}

export function stepBattle(prev: BattleState, p: Player, mv: Move, stance: Stance = "dengeli"): BattleState {
  if (prev.over) return prev;
  const bs: BattleState = { ...prev, log: [...prev.log] };
  // Çaresizlik (enrage): düşman HP'si %30 altındaysa köşeye sıkışmıştır.
  const desperate = bs.enemyHp > 0 && bs.enemyHp <= bs.enemyMax * 0.3;
  if (desperate && !bs.desperate) { bs.desperate = true; bs.log.push({ k: "cb.log.desperate" }); }
  // Telegraf: sezdiğin niyet (bs.enemyIntent) okuma isabetiyle doğru çıkar; aksi halde düşman fent atar.
  let em: Move; let feint = false;
  if (Math.random() < readAccuracy(p, bs.enemyPower, bs.arch, desperate)) { em = bs.enemyIntent; }
  else { const others = (["hamle", "savustur", "ozel"] as Move[]).filter((m) => m !== bs.enemyIntent); em = others[Math.floor(Math.random() * others.length)]; feint = true; }
  const pw = combatPower(p);
  const wc = weaponClass(p);
  const st = stanceOf(stance);                              // duruş: atk/def çarpanı
  const baseP = 6 + Math.round(pw * 0.6);
  const baseE = 6 + Math.round(bs.enemyPower * 0.9);
  const dealt = (d: number, outcome: "tie" | "win") => Math.round(d * st.atk * classAtkMult(wc, bs.round, outcome, mv));
  // Hızlı silah: hafif kaçış (alınan hasarı biraz azaltır).
  const evade = wc === "hizli" ? 0.85 : 1.0;
  const kalkanli = p.perks?.includes("kalkanli") ? 0.75 : 1.0; // kalkanlı hüneri: alınan hasar %25 azalır (vaat edilen etki artık gerçek)
  const taken = (d: number) => Math.round((d / st.def) * evade * kalkanli);

  // Tur log'unun ortak başlık parametreleri: tur no, oyuncu hamlesi, düşman hamlesi, fent eki.
  const fp: CbLogParam = feint ? { lk: "cb.log.feint" } : "";
  let entry: CbLogEntry;
  if (mv === em) {
    const pd = dealt(Math.round(baseP * 0.4), "tie"), edRaw = Math.max(1, taken(Math.round(baseE * 0.4)) - armorDefense(p)); // zırh denk anında da hasarı azaltır (kayıp dalıyla tutarlı)
    let ed = desperate ? Math.round(edRaw * 1.15) : edRaw; // enrage: çaresiz düşman daha sert vurur
    // Kalkan bloğu (denk anında da geçerli)
    let blocked = false;
    if (shieldBlockChance(p, stance === "savunmaci") > 0 && Math.random() < shieldBlockChance(p, stance === "savunmaci")) { ed = Math.round(ed * 0.4); blocked = true; }
    bs.enemyHp -= pd; bs.playerHp -= ed;
    entry = { k: "cb.log.tie", p: [bs.round, { mv }, { mv: em }, fp, pd, ed, blocked ? { lk: "cb.log.tieBlock" } : ""] };
  } else if (beats(mv, em)) {
    const dmg = dealt(mv === "ozel" ? Math.round(baseP * 1.4) : baseP, "win");
    bs.enemyHp -= dmg;
    entry = { k: "cb.log.win", p: [bs.round, { mv }, { mv: em }, fp, dmg] };
  } else {
    let dmg = em === "ozel" ? Math.round(baseE * 1.4) : baseE;
    if (mv === "savustur") dmg = Math.round(dmg * 0.5); // savuşturma kısmi korur
    dmg = Math.max(1, taken(dmg) - armorDefense(p)); // duruş + kaçış + zırh hasarı azaltır
    if (desperate) dmg = Math.max(1, Math.round(dmg * 1.15)); // enrage: çaresiz düşman daha sert vurur
    // Kalkan bloğu: belli ihtimalle darbeyi yarıdan fazla emer.
    let blocked = false;
    const bc = shieldBlockChance(p, stance === "savunmaci");
    if (bc > 0 && Math.random() < bc) { dmg = Math.max(1, Math.round(dmg * 0.4)); blocked = true; }
    bs.playerHp -= dmg;
    entry = { k: blocked ? "cb.log.loseBlock" : "cb.log.loseOpen", p: [bs.round, { mv }, { mv: em }, fp, dmg] };
  }
  bs.log.push(entry);
  bs.round += 1;
  bs.enemyIntent = pickEnemyMove(bs.arch, bs.enemyPower, bs.enemyHp > 0 && bs.enemyHp <= bs.enemyMax * 0.3); // bir sonraki turun telegraf'ı (kalan HP'ye göre çaresizlik)

  if (bs.enemyHp <= 0) { bs.enemyHp = 0; bs.over = true; bs.won = true; bs.log.push({ k: "cb.log.victory" }); }
  else if (bs.playerHp <= 0) { bs.playerHp = 0; bs.over = true; bs.won = false; bs.log.push({ k: "cb.log.defeat" }); }
  return bs;
}
