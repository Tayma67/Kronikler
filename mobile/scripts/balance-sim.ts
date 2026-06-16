// Headless denge simülasyonu — çekirdeği (game.ts) binlerce hayat boyunca koşturur.
import { newGame, advance, work, eat, GameState } from "../lib/game";

function simLife(): { deathAge: number; reached13: boolean; starved: number; m20: number; m40: number; m60: number; maxMoney: number } {
  let s: GameState = newGame("Sim", "Test", Math.random() < 0.5 ? "erkek" : "kadın");
  let starved = 0, m20 = 0, m40 = 0, m60 = 0, maxMoney = 0;
  let guard = 0;
  while (!s.player.dead && s.player.age < 85 && guard++ < 2000) {
    const p = s.player;
    // "makul oyuncu" politikası
    if (p.hunger < 35) s = eat(s);
    if (p.age >= 13 && p.profession !== "işsiz" && p.hunger >= 30) s = work(s);
    // ara sıra yemek stoğu
    s = advance(s, 1);
    const np = s.player;
    if (np.hunger <= 0) starved++;
    if (np.money > maxMoney) maxMoney = np.money;
    if (np.age === 20 && !m20) m20 = np.money;
    if (np.age === 40 && !m40) m40 = np.money;
    if (np.age === 60 && !m60) m60 = np.money;
  }
  return { deathAge: s.player.age, reached13: s.player.age >= 13 || s.player.dead === false, starved, m20, m40, m60, maxMoney };
}

const N = 1500;
let reached13 = 0, sumDeath = 0, sumStarve = 0, sumM20 = 0, sumM40 = 0, sumM60 = 0, sumMax = 0;
const deaths: number[] = [];
let diedBefore13 = 0;
for (let i = 0; i < N; i++) {
  const r = simLife();
  if (r.deathAge >= 13) reached13++; else diedBefore13++;
  sumDeath += r.deathAge; deaths.push(r.deathAge);
  sumStarve += r.starved; sumM20 += r.m20; sumM40 += r.m40; sumM60 += r.m60; sumMax += r.maxMoney;
}
deaths.sort((a, b) => a - b);
const pct = (q: number) => deaths[Math.floor(N * q)];
console.log(`=== ${N} hayat ===`);
console.log(`13'e ulaşan: ${(reached13 / N * 100).toFixed(1)}%  (13'ten önce ölen: ${diedBefore13})`);
console.log(`Ölüm yaşı: ort ${(sumDeath / N).toFixed(1)} · medyan ${pct(0.5)} · p10 ${pct(0.1)} · p90 ${pct(0.9)} · min ${deaths[0]} · max ${deaths[N-1]}`);
console.log(`Açlık dibe vurma (ömür başına ort): ${(sumStarve / N).toFixed(2)}`);
console.log(`Akçe — 20 yaş ort ${(sumM20 / N).toFixed(0)} · 40 yaş ort ${(sumM40 / N).toFixed(0)} · 60 yaş ort ${(sumM60 / N).toFixed(0)} · tepe ort ${(sumMax / N).toFixed(0)}`);
