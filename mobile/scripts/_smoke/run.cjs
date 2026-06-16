// Çekirdek oyun döngüsünü + tüm oyuncu aksiyonlarını headless koşturur (runtime smoke testi).
const g = require("/tmp/kronikler-game-bundle.cjs");
const R = (a) => a[Math.floor(Math.random() * a.length)];
let errors = 0; const died = [];
for (let i = 0; i < 300; i++) {
  try {
    let s = g.newGame("Sim", "Test", Math.random() < 0.5 ? "erkek" : "kadın");
    let guard = 0;
    while (!s.player.dead && s.player.age < 85 && guard++ < 1100) {
      const p = s.player;
      if (p.hunger < 35) s = g.eat(s);
      if (p.age >= 13 && p.profession !== "işsiz" && p.hunger >= 30) s = g.work(s);
      if (p.age >= 13) {
        const act = Math.random(); const npcs = g.npcsOf(s);
        try {
          if (act < 0.10) s = g.buyItem(s, R(["demir","kereste","deri","sifa"]));
          else if (act < 0.18) s = g.craft(s, R(["bicak","kilic","yay","savas_balta","zincir_zirh"]));
          else if (act < 0.24) s = g.sellItem(s, R(Object.keys(p.inventory||{})) || "demir");
          else if (act < 0.30 && p.money > 60) s = g.launchCaravan(s, 50);
          else if (act < 0.36) { s = g.doCrime(s, R(["yankesicilik","dukkan_soyma","soygun","konak_soygunu"])); if ((s.player.hotGoods||0) > 0 && Math.random() < 0.5) s = g.fenceHotGoods(s); }
          else if (act < 0.42) s = g.doFactionTask(s, R(["tuccar","demirci","asker"]));
          else if (act < 0.48) s = g.equipItem(s, R(["kilic","bicak","kalkan","deri_zirh"]));
          else if (act < 0.54) s = g.travelBy(s, R(g.LOCATIONS.filter(l=>l!==p.location_name)), R(["anayol","patika","kervan"]));
          else if (act < 0.60 && npcs.length) s = g.helpNpcGoal(s, R(npcs));
          else if (act < 0.64 && npcs.length) s = g.exploitNpcGoal(s, R(npcs));
          else if (act < 0.67 && npcs.length) { const nn = R(npcs); s = g.giveMoneyTo(s, nn); s = g.gossipAbout(s, nn); s = g.insultNpc(s, nn); s = g.flirtWith(s, nn); }
          else if (act < 0.70 && p.money > 200) s = g.buyProperty(s, R(["tarla","ev","dukkan"]));
          else if (act < 0.76 && p.properties.length && npcs.length) s = g.hireWorker(s, 0, R(npcs).id);
          else if (act < 0.80 && p.children && p.children.length) s = g.setChildEducation(s, p.children[0], R(["ilim","savas","zanaat","ticaret"]));
          else if (act < 0.83 && g.canRunForGovernor(s, p.location_name)) s = g.runForGovernor(s, p.location_name);
          else if (act < 0.86 && p.governorships && p.governorships.length) { s = g.setGovTax(s, p.governorships[0], R([8,15,28])); s = g.investTreasury(s, p.governorships[0], R(["hizmet","asayis"])); }
          else if (act < 0.89 && !p.faction) s = g.joinFaction(s, R(["tuccar","demirci","asker"]));
          else if (act < 0.92 && g.canUseFactionPower(p)) s = g.useFactionPower(s, R(["himaye","kese"]));
        } catch (e) { errors++; if (errors <= 5) console.log("AKSİYON HATASI:", e.message); }
        try { if (s.pendingScene && s.pendingScene.kind === "crime") s = g.resolveCrimeScene(s, R(["saklan","rusvet","kac"])); } catch (e) { errors++; if (errors <= 5) console.log("SAHNE HATASI:", e.message); }
      }
      s = g.advance(s, 1);
    }
    died.push(s.player.age);
  } catch (e) { errors++; if (errors <= 5) console.log("DÖNGÜ HATASI:", e.message); }
}
died.sort((a,b)=>a-b);
console.log(`300 hayat × tüm aksiyonlar · HATA: ${errors} · ölüm yaşı medyan ${died[150]} (min ${died[0]} / max ${died[died.length-1]})`);
process.exit(errors > 0 ? 1 : 0);
