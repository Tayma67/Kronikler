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

export interface BattleState {
  enemyName: string; enemyPower: number;
  playerHp: number; playerMax: number; enemyHp: number; enemyMax: number;
  round: number; log: string[]; over: boolean; won: boolean;
  enemyIntent: Move; // telegraf: düşmanın bir sonraki tahmini hamlesi (oyuncu sezer ve karşılar)
  arch: EArch; // düşman arketipi (hamle eğilimi + okunabilirlik)
}

// Düşmanın hamle eğilimi: arketip ağırlıkları + güçlü düşman biraz daha 'özel'e kayar.
function pickEnemyMove(arch: EArch, power: number): Move {
  let [wh, ws, wo] = ARCH[arch].w;
  if (power >= 13) { const shift = Math.min(ws, 0.1); ws -= shift; wo += shift; } // güçlü düşman savunmayı bırakır
  const r = Math.random() * (wh + ws + wo);
  if (r < wh) return "hamle";
  if (r < wh + ws) return "savustur";
  return "ozel";
}
// Niyet okuma isabeti: dövüş becerisi + zekâ artırır, düşman gücü + arketip kurnazlığı azaltır.
// Telegraf bu ihtimalle doğru çıkar; aksi halde düşman fent atıp niyetini gizler.
export function readAccuracy(p: Player, enemyPower: number, arch: EArch = "asker"): number {
  const skill = p.skills?.combat || 0;
  const intel = p.stats?.intelligence || 0;
  let a = 0.70 + skill * 0.018 + intel * 0.004 - Math.max(0, enemyPower - 6) * 0.012 + ARCH[arch].feint;
  if (weaponClass(p) === "hizli") a += 0.05; // çevik refleks düşmanı daha iyi okur
  return Math.max(0.40, Math.min(0.93, a));
}

export function startBattle(p: Player, e: Encounter): BattleState {
  const pw = combatPower(p);
  const enemyMax = 30 + e.power * 4;
  let enemyHp = enemyMax;
  const log = [`${e.title} başladı. Gücün ${pw}, düşman gücü ${e.power}.`];
  // Menzilli silah (yay): melee öncesi açılış oku.
  if (weaponClass(p) === "menzilli") {
    const volley = 6 + (p.skills?.combat || 0) + Math.round(pw * 0.18);
    enemyHp = Math.max(1, enemyHp - volley);
    log.push(`Açılış oku düşmanı buldu — düşmana ${volley} hasar!`);
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
  // Telegraf: sezdiğin niyet (bs.enemyIntent) okuma isabetiyle doğru çıkar; aksi halde düşman fent atar.
  let em: Move; let feint = false;
  if (Math.random() < readAccuracy(p, bs.enemyPower, bs.arch)) { em = bs.enemyIntent; }
  else { const others = (["hamle", "savustur", "ozel"] as Move[]).filter((m) => m !== bs.enemyIntent); em = others[Math.floor(Math.random() * others.length)]; feint = true; }
  const pw = combatPower(p);
  const wc = weaponClass(p);
  const st = stanceOf(stance);                              // duruş: atk/def çarpanı
  const baseP = 6 + Math.round(pw * 0.6);
  const baseE = 6 + Math.round(bs.enemyPower * 0.9);
  const mvName: Record<Move, string> = { hamle: "Hamle", savustur: "Savuştur", ozel: "Özel" };
  const dealt = (d: number, outcome: "tie" | "win") => Math.round(d * st.atk * classAtkMult(wc, bs.round, outcome, mv));
  // Hızlı silah: hafif kaçış (alınan hasarı biraz azaltır).
  const evade = wc === "hizli" ? 0.85 : 1.0;
  const taken = (d: number) => Math.round((d / st.def) * evade);

  let txt = `Tur ${bs.round}: Sen ${mvName[mv]}, düşman ${mvName[em]}${feint ? " (niyetini gizledi!)" : ""}. `;
  if (mv === em) {
    const pd = dealt(Math.round(baseP * 0.4), "tie"), edRaw = taken(Math.round(baseE * 0.4));
    let ed = edRaw;
    // Kalkan bloğu (denk anında da geçerli)
    let blocked = false;
    if (shieldBlockChance(p, stance === "savunmaci") > 0 && Math.random() < shieldBlockChance(p, stance === "savunmaci")) { ed = Math.round(ed * 0.4); blocked = true; }
    bs.enemyHp -= pd; bs.playerHp -= ed; txt += `Denk geçti (−${pd}/−${ed})${blocked ? " — kalkanınla savdın!" : ""}.`;
  } else if (beats(mv, em)) {
    const dmg = dealt(mv === "ozel" ? Math.round(baseP * 1.4) : baseP, "win");
    bs.enemyHp -= dmg; txt += `Üstün geldin, düşmana ${dmg} hasar!`;
  } else {
    let dmg = em === "ozel" ? Math.round(baseE * 1.4) : baseE;
    if (mv === "savustur") dmg = Math.round(dmg * 0.5); // savuşturma kısmi korur
    dmg = Math.max(1, taken(dmg) - armorDefense(p)); // duruş + kaçış + zırh hasarı azaltır
    // Kalkan bloğu: belli ihtimalle darbeyi yarıdan fazla emer.
    let blocked = false;
    const bc = shieldBlockChance(p, stance === "savunmaci");
    if (bc > 0 && Math.random() < bc) { dmg = Math.max(1, Math.round(dmg * 0.4)); blocked = true; }
    bs.playerHp -= dmg; txt += blocked ? `Kalkanınla savuştun, yalnız ${dmg} hasar aldın.` : `Açık verdin, ${dmg} hasar aldın.`;
  }
  bs.log.push(txt);
  bs.round += 1;
  bs.enemyIntent = pickEnemyMove(bs.arch, bs.enemyPower); // bir sonraki turun telegraf'ı

  if (bs.enemyHp <= 0) { bs.enemyHp = 0; bs.over = true; bs.won = true; bs.log.push("Düşman yere serildi — zafer senin!"); }
  else if (bs.playerHp <= 0) { bs.playerHp = 0; bs.over = true; bs.won = false; bs.log.push("Dize geldin; çatışmayı kaybettin."); }
  return bs;
}
