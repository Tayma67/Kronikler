// Tur-tabanlı taktik savaş motoru (saf). Sonuç savas ekranında GameState'e uygulanır.
import { Player, Encounter, combatPower } from "./game";

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

export interface BattleState {
  enemyName: string; enemyPower: number;
  playerHp: number; playerMax: number; enemyHp: number; enemyMax: number;
  round: number; log: string[]; over: boolean; won: boolean;
}

export function startBattle(p: Player, e: Encounter): BattleState {
  const pw = combatPower(p);
  const enemyMax = 30 + e.power * 4;
  return {
    enemyName: e.title, enemyPower: e.power,
    playerHp: Math.max(20, Math.round(p.health)), playerMax: Math.max(20, Math.round(p.health)),
    enemyHp: enemyMax, enemyMax,
    round: 1, log: [`${e.title} başladı. Gücün ${pw}, düşman gücü ${e.power}.`], over: false, won: false,
  };
}

function enemyMove(bs: BattleState): Move {
  const r = Math.random();
  // Güçlü düşman daha agresif
  if (bs.enemyPower >= 13) return r < 0.45 ? "ozel" : r < 0.8 ? "hamle" : "savustur";
  return r < 0.4 ? "hamle" : r < 0.75 ? "savustur" : "ozel";
}

export function stepBattle(prev: BattleState, p: Player, mv: Move): BattleState {
  if (prev.over) return prev;
  const bs: BattleState = { ...prev, log: [...prev.log] };
  const em = enemyMove(bs);
  const pw = combatPower(p);
  const baseP = 6 + Math.round(pw * 0.6);
  const baseE = 6 + Math.round(bs.enemyPower * 0.9);
  const mvName: Record<Move, string> = { hamle: "Hamle", savustur: "Savuştur", ozel: "Özel" };

  let txt = `Tur ${bs.round}: Sen ${mvName[mv]}, düşman ${mvName[em]}. `;
  if (mv === em) {
    const pd = Math.round(baseP * 0.4), ed = Math.round(baseE * 0.4);
    bs.enemyHp -= pd; bs.playerHp -= ed; txt += `Denk geçti (−${pd}/−${ed}).`;
  } else if (beats(mv, em)) {
    const dmg = mv === "ozel" ? Math.round(baseP * 1.4) : baseP;
    bs.enemyHp -= dmg; txt += `Üstün geldin, düşmana ${dmg} hasar!`;
  } else {
    let dmg = em === "ozel" ? Math.round(baseE * 1.4) : baseE;
    if (mv === "savustur") dmg = Math.round(dmg * 0.5); // savuşturma kısmi korur
    bs.playerHp -= dmg; txt += `Açık verdin, ${dmg} hasar aldın.`;
  }
  bs.log.push(txt);
  bs.round += 1;

  if (bs.enemyHp <= 0) { bs.enemyHp = 0; bs.over = true; bs.won = true; bs.log.push("Düşman yere serildi — zafer senin!"); }
  else if (bs.playerHp <= 0) { bs.playerHp = 0; bs.over = true; bs.won = false; bs.log.push("Dize geldin; çatışmayı kaybettin."); }
  return bs;
}
