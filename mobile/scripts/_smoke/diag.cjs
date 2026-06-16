// Ekonomi denge teşhisi: yeniden tasarlanmış ekonomiyi (enflasyon + kademeli upkeep + mülk
// fiyatları + görkem muslukları) gerçekçi "varlıklı oyuncu" davranışıyla ölçer.
// Bundle smoke.sh tarafından üretilir: /tmp/kronikler-game-bundle.cjs
const g = require("/tmp/kronikler-game-bundle.cjs");
const R = (a) => a[Math.floor(Math.random() * a.length)];
const N = +(process.argv[2] || 400);
const deaths = [], money = [], stats = [], infl = [];
let errors = 0, reach70 = 0, settled = 0, tiers = { mezra: 0, "köy": 0, kasaba: 0, "şehir": 0 }, prestiges = 0;
for (let life = 0; life < N; life++) {
  try {
    let s = g.newGame("Sim", "Test", Math.random() < 0.5 ? "erkek" : "kadın");
    let guard = 0;
    while (!s.player.dead && guard++ < 1200) {
      const p = s.player;
      try {
        if (p.hunger < 35) s = g.eat(s);
        if (p.age >= 13 && p.profession !== "işsiz" && p.hunger >= 30) s = g.work(s, "normal");
        // engaged earner: ticaret/kervan/lonca/suç (gerçek oyuncu yaklaşımı)
        if (p.age >= 13) { const a = Math.random();
          if (a < 0.15 && s.player.money > 60) s = g.launchCaravan(s, 50);
          else if (a < 0.25 && !s.player.faction) s = g.joinFaction(s, R(["tuccar","demirci","asker"]));
          else if (a < 0.40 && s.player.faction) s = g.doFactionTask(s, s.player.faction);
          else if (a < 0.50) { s = g.doCrime(s, R(["dukkan_soyma","soygun","konak_soygunu"])); if ((s.player.hotGoods||0) > 0) s = g.fenceHotGoods(s); }
          else if (a < 0.58 && g.canRunForGovernor && g.canRunForGovernor(s, p.location_name)) s = g.runForGovernor(s, p.location_name);
          if (s.pendingScene && s.pendingScene.kind === "crime") s = g.resolveCrimeScene(s, R(["saklan","rusvet","kac"]));
        }
        // varlıklı strateji: parası yettikçe mülk al (enflasyonlu bedel)
        if (p.age >= 16) {
          for (const ty of ["tarla", "ev", "dukkan", "han", "degirmen"]) {
            if (s.player.money >= g.propBuyCost(s, ty) * 1.2 && Math.random() < 0.5) { s = g.buyProperty(s, ty); break; }
          }
        }
        // kademeli yerleşim
        const fc = g.canFoundSettlement(s); if (fc.ok && Math.random() < 0.6) s = g.foundSettlement(s, "Mezra" + life);
        if (s.settlements) for (let i = 0; i < s.settlements.length; i++) {
          const dc = g.developSettlementCost(s.settlements[i]); if (s.player.money > dc * 1.5 && Math.random() < 0.5) s = g.developSettlement(s, i);
          const uc = g.canUpgradeSettleTier(s, i); if (uc.ok) s = g.upgradeSettleTier(s, i);
        }
        // görkem muslukları
        for (const pr of ["hekim", "imaret", "vakif", "anit"]) { if (s.player.money > g.prestigeCost(s, pr) * 1.4 && Math.random() < 0.4) { const before = s.player.money; s = g.fundPrestige(s, pr); if (s.player.money < before) prestiges++; } }
        // piyasa oynat
        const mc = g.canManipulateMarket(s); if (mc.ok && Math.random() < 0.2) s = g.manipulateMarket(s, R(["pump", "dump"]));
      } catch (e) { errors++; if (errors <= 5) console.log("AKSİYON HATASI:", e.message); }
      s = g.advance(s, 1);
    }
    const p = s.player;
    deaths.push(p.age); money.push(p.money);
    stats.push((p.stats.strength + p.stats.intelligence + p.stats.charisma + p.stats.stamina) / 4);
    infl.push(g.inflationFactor(s));
    if (p.age >= 70) reach70++;
    if ((s.settlements || []).length) { settled++; for (const st of s.settlements) tiers[st.tier || "mezra"]++; }
  } catch (e) { errors++; if (errors <= 5) console.log("DÖNGÜ HATASI:", e.message); }
}
const q = (a, f) => { const b = [...a].sort((x, y) => x - y); return Math.round(b[Math.floor(b.length * f)]); };
const avg = (a) => Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10;
console.log(`\n=== EKONOMİ DENGE (${N} hayat) ===`);
console.log(`ölüm yaşı: medyan ${q(deaths, .5)} (p10 ${q(deaths, .1)} / p90 ${q(deaths, .9)} / max ${Math.max(...deaths)})`);
console.log(`70+ yaşa ulaşan: ${reach70} (%${Math.round(reach70 / N * 100)})`);
console.log(`son para: medyan ${q(money, .5)} (p10 ${q(money, .1)} / p90 ${q(money, .9)} / max ${Math.max(...money)})`);
console.log(`özellik ort: ${avg(stats)} · enflasyon ort: ${avg(infl)}x (max ${Math.max(...infl).toFixed(2)}x)`);
console.log(`yerleşim kuran: ${settled} hayat · kademeler ${JSON.stringify(tiers)} · görkem eseri: ${prestiges}`);
console.log(`HATA: ${errors}`);
