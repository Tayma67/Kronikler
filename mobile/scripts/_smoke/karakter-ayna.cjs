// Karakter aynası: aynı kurallarla "herkese yardım eden" ile "önüne gelene zulmeden" iki karakter 22 yıl oynatılır;
// kasabanın tepkisi kısa (1. yıl), orta (10. yıl) ve uzun vadede (22. yıl + vâris) ölçülür, huy gruplarına göre ayrılır.
// Amaç: yaptıkların boş kalmıyor mu, iyilik ve zulüm farklı karşılık buluyor mu? Kullanım:
//   node scripts/_smoke/karakter-ayna.cjs        (H=hayat sayısı, varsayılan 12 · SIK=kaç ayda bir dokunuş, varsayılan 1)
// Beklenen yön: yardımseverde dost/olumlu hamle/teklif, zalimde hasım/hamle/kaçan/yüzüne vuran; vârise bakış işaretiyle taşınır.
const path = require("path"); const fs = require("fs"); const os = require("os"); const { execSync } = require("child_process");
const kok = path.join(__dirname, "..", ".."); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ayna-"));
try { execSync(`npx esbuild "${path.join(kok, "lib/game.ts")}" --bundle --format=cjs --platform=node --outfile="${tmp}/g.cjs" --log-level=error`, { cwd: kok, stdio: "inherit" }); } catch (e) { process.exit(1); }
const g = require(`${tmp}/g.cjs`);
const HAYAT = +(process.env.H || 12);
const grup = (huy) => ["dindar", "mert", "ciddi"].includes(huy) ? "ilkeli" : ["kurnaz", "hırslı", "kibirli"].includes(huy) ? "çıkarcı" : ["utangaç", "dertli", "yalnız", "sabırlı", "unutkan"].includes(huy) ? "çekingen" : "sıcak";
function oyna(tip) {
  const top = { ilkYil: [], ortaYil: [], son: [], yabanci: [], grup: {}, dost: 0, hasim: 0, teklif: 0, borcIstegi: 0, soylenti: 0, olumlu: 0, olumsuz: 0, tohum: 0, varis: [], varisYabanci: [], kacan: 0, yuzevuran: 0 };
  for (let h = 0; h < HAYAT; h++) {
    let s = g.newGame("Ali", "Kaya", h % 2 ? "erkek" : "kadın");
    while (s.player.age < 18) { s.player.hunger = 90; s.player.health = 100; s.npcTeklif = undefined; s = g.advance(s, 1); }
    const dokunulan = new Set();
    for (let ay = 0; ay < 12 * 22 && !s.player.dead; ay++) {
      s.player.hunger = 90; s.player.health = 100; s.player.money = Math.max(s.player.money, 400);
      const npcs = g.npcsOf(s).filter((n) => n.age >= 16 && !g.oyuncuAkrabasi(s.player, n.id) && n.id !== s.player.spouse_id);
      if (npcs.length && ay % (+(process.env.SIK || 1)) === 0) {
        const n1 = npcs[Math.floor(Math.random() * npcs.length)], n2 = npcs[Math.floor(Math.random() * npcs.length)];
        if (tip === "iyi") { s = g.helpNpcGoal(s, n1); s = g.giveMoneyTo(s, n2); }
        else { s = g.insultNpc(s, n1); s = g.exploitNpcGoal(s, n2); s = g.intimidate(s); }
        dokunulan.add(n1.id); dokunulan.add(n2.id);
      }
      if (s.npcTeklif) { top.teklif++; if (s.npcTeklif.tur === "borc") top.borcIstegi++; s = g.npcTeklifYanit(s, tip === "iyi"); }
      const t0 = s.turn; s = g.advance(s, 1);
      for (const e of s.history.filter((x) => x.day > t0)) {
        if (/^npci\.(meal|soup)/.test(e.k || "")) top.olumlu++;
        if (/^npci\.(badmouth|taunt|sabotage)/.test(e.k || "")) top.olumsuz++;
        if (/^npci\.(kacti|avoid)/.test(e.k || "")) top.kacan++;
        if (/^npci\.(yuzunevur|confront)/.test(e.k || "")) top.yuzevuran++;
        if (/^seed\./.test(e.k || "")) { top.tohum++; (top.tohumTur = top.tohumTur || {})[e.k] = (top.tohumTur[e.k] || 0) + 1; }
      }
      const ort = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const hepsi = g.npcsOf(s).filter((n) => n.age >= 16 && !g.oyuncuAkrabasi(s.player, n.id));
      if (ay === 11) top.ilkYil.push(ort(hepsi.map((n) => g.relWith(s, n.id))));
      if (ay === 12 * 10) top.ortaYil.push(ort(hepsi.map((n) => g.relWith(s, n.id))));
    }
    const hepsi = g.npcsOf(s).filter((n) => n.age >= 16 && !g.oyuncuAkrabasi(s.player, n.id));
    const ort = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    top.son.push(ort(hepsi.map((n) => g.relWith(s, n.id))));
    top.yabanci.push(ort(hepsi.filter((n) => !dokunulan.has(n.id)).map((n) => g.relWith(s, n.id))));
    for (const n of hepsi.filter((x) => !dokunulan.has(x.id))) { const gr = grup(n.trait); (top.grup[gr] = top.grup[gr] || []).push(g.relWith(s, n.id)); } // huy farkı: yalnız hiç dokunmadıkları
    for (const n of hepsi) { const v = g.relWith(s, n.id); if (v >= 30) top.dost++; if (v <= -30) top.hasim++; }
    top.soylenti += (s.player_rumors || []).length;
    // Vâris: ata ölür, ilk evlat devralır — kasaba ona nasıl bakıyor?
    if (s.player.children.length) {
      s.player.dead = true; const kim = hepsi.map((n) => n.id);
      const v = g.continueAsHeir(s, "esit", s.player.children[0]);
      const hv = kim.filter((id) => v.pop.k[id] && v.pop.k[id].ol == null);
      top.varis.push(ort(hv.map((id) => g.relWith(v, id))));
      top.varisYabanci.push(ort(hv.filter((id) => !dokunulan.has(id)).map((id) => g.relWith(v, id))));
    }
  }
  const o = (a) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : null;
  return { "1.yıl ort": o(top.ilkYil), "10.yıl ort": o(top.ortaYil), "22.yıl ort": o(top.son), "hiç dokunmadıkları": o(top.yabanci),
    "huya göre (dokunulmamış)": Object.fromEntries(Object.entries(top.grup).map(([k, v]) => [k, o(v)])), "dost(≥30)": top.dost, "hasım(≤-30)": top.hasim,
    "dost hamlesi": top.olumlu, "hasım hamlesi": top.olumsuz, "kaçan": top.kacan, "yüzüne vuran": top.yuzevuran, teklif: top.teklif, "borç isteği": top.borcIstegi, "söylenti": top.soylenti, "tohum biçimi": top.tohum, "tohum türleri": top.tohumTur || {},
    "vâris: kasaba ort": o(top.varis), "vâris: atanın dokunmadıkları": o(top.varisYabanci), "vâris sayısı": top.varis.length };
}
const iyi = oyna("iyi"), zalim = oyna("zalim");
console.log("ÖLÇÜT".padEnd(30), "YARDIMSEVER".padEnd(28), "ZALİM");
for (const k of Object.keys(iyi)) console.log(k.padEnd(30), JSON.stringify(iyi[k]).padEnd(28), JSON.stringify(zalim[k]));
