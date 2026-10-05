// Çekirdek oyun döngüsünü + tüm oyuncu aksiyonlarını headless koşturur (runtime smoke testi).
const g = require(process.env.SMOKE_BUNDLE || "/tmp/kronikler-game-bundle.cjs"); // SMOKE_BUNDLE: anlık-görüntü paketi (paralel koşucu)
const LIVES = parseInt(process.env.SMOKE_LIVES || "300", 10);
const R = (a) => a[Math.floor(Math.random() * a.length)];
let errors = 0; const died = [];
for (let i = 0; i < LIVES; i++) {
  try {
    let s = g.newGame("Sim", "Test", Math.random() < 0.5 ? "erkek" : "kadın");
    let guard = 0;
    while (!s.player.dead && s.player.age < 85 && guard++ < 1100) {
      const p = s.player;
      if (p.hunger < 35) s = g.eat(s);
      if (p.age >= 13 && p.profession !== "işsiz" && p.hunger >= 30) s = g.work(s);
      // Mektep çağı: ders + kulüp (okul olayları/hoca bağı/kulüp kapsamı)
      if (p.age < 18) { try { if (Math.random() < 0.4) s = g.studySubject(s, R(["din","matematik","edebiyat","beden"])).state; if (Math.random() < 0.1) s = g.joinClub(s, R(["koro","gures","cirak"])); } catch (e) { errors++; if (errors <= 5) console.log("MEKTEP HATASI:", e.message); } }
      // Diyalog (yeni konular dahil)
      if (p.age >= 13) { const ns = g.npcsOf(s); if (ns.length && Math.random() < 0.2) { try { s = g.talkWith(s, R(ns), R(["hosbes","iltifat","dert","saka","is","aile","dunya","hedef"])).state; } catch (e) { errors++; if (errors <= 5) console.log("DİYALOG HATASI:", e.message); } } }
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
        try { if (s.player.tezgah) s = g.resolveTezgah(s, R([0, 1, 2])); } catch (e) { errors++; if (errors <= 5) console.log("TEZGÂH HATASI:", e.message); } // mesleğin kendi kararı (kilitli hüner yolu no-op kalır)
        try { // çarşıdaki rakip: bekleyen yarış (bazen çekilir), ara sıra meydan okuma ve ortaklık
          const rk = s.player.rakip;
          if (rk && rk.yaris != null && Math.random() < 0.7) s = g.rakipYarisi(s, R([0, 1, 2])).state;
          else if (Math.random() < 0.05 && g.rakipMeydanHazir(s)) s = g.rakipMeydan(s);
          if (g.rakipOrtaklikHazir(s.player) && Math.random() < 0.3) s = g.rakipOrtaklik(s);
        } catch (e) { errors++; if (errors <= 5) console.log("RAKİP HATASI:", e.message); }
        try { if (Math.random() < 0.15) s = g.mekanaGit(s, R(g.MEKANLAR)); if (Math.random() < 0.15) s = g.aksamSofrasi(s); } catch (e) { errors++; if (errors <= 5) console.log("MAHALLE HATASI:", e.message); } // mahalle mekânı + akşam sofrası
        try { if (s.player.age >= 13 && s.player.age < 18 && Math.random() < 0.5) { const r = g.youthAction(s, R(["usta", "akran", "gonul", "huner"])); if (!r.blocked) s = r.state; } } catch (e) { errors++; if (errors <= 5) console.log("GENÇLİK HATASI:", e.message); } // gençlik uğraşları (13-17)
        try { // hasımla hesaplaşma: yenersen bağışla/canını al, kanlı hasma diyet, kişisiz hasma barış; kırgın birinden helallik
          const nm = s.story && s.story.nemesis;
          if (nm && s.player.age >= 16 && Math.random() < 0.06) { s = g.applyNemesisOutcome(s, Math.random() < 0.5, 10 + Math.floor(Math.random() * 60)); if (s.hesap) s = g.hesapKarari(s, Math.random() < 0.5); }
          else if (nm && nm.olen && Math.random() < 0.08) s = g.diyetOde(s);
          else if (nm && Math.random() < 0.04) s = g.reconcileNemesis(s);
          const npcs2 = g.npcsOf(s); if (npcs2.length && Math.random() < 0.05) { const nn = R(npcs2); if (g.helalUygun(s, nn.id)) s = g.helallikIste(s, nn, Math.random() < 0.5); }
        } catch (e) { errors++; if (errors <= 5) console.log("HESAP HATASI:", e.message); }
        try { // ekranların okuma işlevleri: dört sermaye 0–100, yakın çember ≤15 yaşayan kişi
          if (Math.random() < 0.05) { for (const x of g.sermayeler(s)) if (!(x.deger >= 0 && x.deger <= 100)) throw new Error("sermaye aralık dışı " + x.id + " " + x.deger);
            const c = g.yakinCember(s, R(["tr", "ar"])); if (c.length > g.CEMBER_MAX || new Set(c.map((x) => x.npc.id)).size !== c.length) throw new Error("yakın çember bozuk"); }
        } catch (e) { errors++; if (errors <= 5) console.log("OKUMA HATASI:", e.message); }
        try { if (!s.npcTeklif && Math.random() < 0.15) s = g.kapiyaGelen(s); if (s.npcTeklif && Math.random() < 0.6) s = g.npcTeklifYanit(s, Math.random() < 0.5, Math.random() < 0.5 ? 0 : 1); } catch (e) { errors++; if (errors <= 5) console.log("TEKLİF HATASI:", e.message); } // NPC'nin kendi teklifi (dünürcü/borç)
        try { // çırak: usta olunca al, çoğu zaman ders ver (bazen ihmal et → kaçış yolu da koşar)
          if (g.cirakAlabilir(s.player, s.turn) && Math.random() < 0.15) s = g.cirakAl(s, R([0, 1, 2]));
          if (g.cirakDersHazir(s) && Math.random() < 0.6) s = g.cirakDers(s);
        } catch (e) { errors++; if (errors <= 5) console.log("ÇIRAK HATASI:", e.message); }
      }
      s = g.advance(s, 1);
    }
    died.push(s.player.age);
  } catch (e) { errors++; if (errors <= 5) console.log("DÖNGÜ HATASI:", e.message); }
}
died.sort((a,b)=>a-b);
if (process.env.SMOKE_JSON) console.log("SMOKE_JSON:" + JSON.stringify({ errors, died }));
else console.log(`${LIVES} hayat × tüm aksiyonlar · HATA: ${errors} · ölüm yaşı medyan ${died[Math.floor(died.length / 2)]} (min ${died[0]} / max ${died[died.length - 1]})`);
process.exit(errors > 0 ? 1 : 0);
