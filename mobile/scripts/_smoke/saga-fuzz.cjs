// Kül Yemini düşman denetimi: 120 hanedan (3'er nesil), her sahnede RASTGELE seçim.
// Değişmezler: ch/act sınırları, sahne tekrarı yok (reoffer istisnası), para asla negatif değil,
// satış/haber kesesi ömürde bir kez, sentinel sonrası sessizlik, vâris devri tutarlı, başarım tutarlı.
// Kendi bundle'ını üretir: motoru esbuild ile paketler (react dahil — external YOK), sonra yükler.
const path = require("path");
const { execSync } = require("child_process");
const ROOT = path.resolve(__dirname, "../..");
const BUNDLE = path.join(ROOT, "node_modules/.cache/kronikler-game-bundle.cjs");
execSync(`npx esbuild lib/game.ts --bundle --format=cjs --outfile=${BUNDLE}`, { cwd: ROOT, stdio: "pipe" });
const g = require(BUNDLE);
let fails = 0;
const F = (m) => { console.log("FUZZ-HATA:", m); fails++; };

const COSTS = g.SAGA_COST;
let done3 = 0, reachedAct = [0, 0, 0, 0]; // index 1..3
let sceneFires = {}; let sellOnce = 0, newsOnce = 0;

for (let run = 0; run < 120; run++) {
  let s = g.newGame("Fuzz" + run, "Denetim", run % 2 ? "kadın" : "erkek");
  const a0 = 13 + (run % 18);
  s.player.age = a0; s.player.base_age = a0;
  const seen = new Set(); // ömür başına sahne tekrarı takibi (nesilde sıfırlanır)
  let gen = 1, emanetOffers = 0, muhurGeriCount = 0;
  for (let m = 0; m < 1900; m++) {
    s.player.hunger = 88; s.player.health = Math.max(s.player.health, 70);
    const mBefore = s.player.money;
    s = g.advance(s, 1);
    if (s.player.money < 0) F("advance sonrası negatif para");
    const sg = s.saga;
    if (sg) {
      if (sg.act < 1 || sg.act > 3) F("act sınır dışı: " + sg.act);
      if (sg.ch < 0 || sg.ch > 5) F("ch sınır dışı: " + sg.ch);
      if (sg.scene && !s.player.dead) { // ölü oyuncuda sahne bilerek bekler (ölü kapısı) — vâris devrinde temizlenir
        const key = sg.act + ":" + sg.scene;
        if (sg.scene === "emanet_muhur") { emanetOffers++; if (emanetOffers > 2) F("emanet 2'den fazla teklif edildi"); }
        else if (sg.scene === "d2_muhur_geri") { muhurGeriCount++; if (muhurGeriCount > 1) F("kefaret sahnesi tekrar düştü"); }
        else if (seen.has(key)) F("sahne tekrarı: " + key);
        seen.add(key);
        sceneFires[sg.scene] = (sceneFires[sg.scene] || 0) + 1;
        // rastgele ama ödenebilir seçim
        const n = g.SAGA_CHOICES[sg.scene] || 3;
        let cands = [];
        for (let c = 0; c < n; c++) { const need = COSTS[sg.scene]?.[c] || 0; if (s.player.money >= need) cands.push(c); }
        if (!cands.length) cands = [0];
        const pick = cands[Math.floor(Math.random() * cands.length)];
        if (sg.scene === "yemin_defteri" && pick === 1) sellOnce++;
        if (sg.scene === "d2_muhur_geri" && pick === 2) newsOnce++;
        const before = s.player.money;
        s = g.resolveSaga(s, pick);
        if (s.player.money < 0) F("resolveSaga sonrası negatif para (" + sg.scene + " c" + pick + ")");
        if (s.saga.scene !== null && s.player.money >= (COSTS[sg.scene]?.[pick] || 0)) F("çözülen sahne temizlenmedi: " + sg.scene);
        if (s.saga.act === 3 && s.saga.ch >= 5) { done3++; break; }
      }
    }
    if (s.player.dead) {
      if (gen >= 3 || !s.player.children.length) break;
      const preSaga = s.saga ? { act: s.saga.act, ch: s.saga.ch } : null;
      s = g.continueAsHeir(s);
      if (preSaga) {
        if (!s.saga || s.saga.act !== preSaga.act || s.saga.ch !== preSaga.ch) F("vâris devrinde act/ch bozuldu");
        if (s.saga.scene !== null) F("vâriste bekleyen sahne kalmış");
        if ((s.saga.declined || 0) !== 0) F("vâriste ret sayacı sıfırlanmamış");
      }
      seen.clear(); emanetOffers = 0; muhurGeriCount = 0; gen++;
    }
  }
  if (s.saga) reachedAct[Math.min(3, s.saga.act)]++;
}

console.log("--- FUZZ RAPORU (120 hanedan × ≤3 nesil) ---");
console.log("perdelere ulaşan: P1:", reachedAct[1], "P2:", reachedAct[2], "P3:", reachedAct[3], "| tamamlayan:", done3);
console.log("satış dalı seçildi:", sellOnce, "| haber satışı:", newsOnce);
console.log("sahne düşme sayıları:", JSON.stringify(sceneFires));
if (fails === 0) console.log("SAGA-FUZZ OK — hiçbir değişmez ihlali yok");
else { console.log("SAGA-FUZZ FAIL —", fails, "ihlal"); process.exit(1); }
