// Oynanış denetimi (TASARIM_PUSULASI.md Bölüm 9.10): yüzlerce hayatı "makul bir oyuncu" gibi oynatır — ana ekranın
// açtığı kartlar (şenlik, ikilem, fırsat) dahil — ve oyunun oyuncuya AYDA NE SUNDUĞUNU ölçer: boş ay, bunalma,
// açık gerilim, pencere sıklığı, günlük gürültüsü, tempo, çöküş sarmalı ve hayatlar arası çeşitlilik.
// Kullanım: node scripts/_smoke/oynanis.cjs  [OYN_LIVES=80] [OYN_JSON=1]
// Ana ekranın kart zarı (index.tsx) burada birebir taklit edilir: değiştirilirse burası da güncellenir.
const { execSync } = require("child_process");
const os = require("os"); const fs = require("fs"); const path = require("path");
const mobile = path.join(__dirname, "..", "..");
const giris = path.join(os.tmpdir(), `kronikler-oyn-giris-${process.pid}.ts`);
const paket = path.join(os.tmpdir(), `kronikler-oyn-${process.pid}.cjs`);
fs.writeFileSync(giris, `export * from ${JSON.stringify(path.join(mobile, "lib/game"))};\nexport { pickDilemma, pickFestival } from ${JSON.stringify(path.join(mobile, "lib/events"))};\n`);
execSync(`npx esbuild ${giris} --bundle --platform=node --format=cjs --outfile=${paket} --log-level=error`, { cwd: mobile, stdio: "inherit" });
const g = require(paket); fs.unlinkSync(giris);

const LIVES = parseInt(process.env.OYN_LIVES || "80", 10);
const R = (a) => a[Math.floor(Math.random() * a.length)];
const KART_IKILEM = 0.28, KART_FIRSAT = 0.22, KART_KAPI = 0.25; // index.tsx ile aynı (aylık zar; kapı kartı boş kalan ayın yarısında denenir)

// Açık gerilimler: oyuncunun "aklında tutması gereken" süren hesaplar.
function acikGerilim(s) {
  const p = s.player; let n = 0;
  if (s.story && s.story.nemesis) n++;
  if (s.feud) n++;
  if (s.bloodline && s.bloodline.scene) n++;
  if (s.saga && s.saga.scene) n++;
  n += (s.kanDefteri || []).filter((x) => x.tur !== "canborcu").length;
  if (s.npcTeklif) n++;
  if (s.hesap) n++;
  if (p.rakip && !p.rakip.bitti && p.rakip.yaris != null) n++;
  if (p.jail && p.jail.left > 0) n++;
  if (p.debt > 0) n++;
  if (p.affair) n++;
  if (p.betrothed) n++;
  return n;
}

// Gecikmeli sonuç olayları (sonucun orta/uzun vadesi): kişiyi adıyla anıyor mu? (TASARIM_PUSULASI 9.3, geri çağırma)
const GECIKMELI = ["seed.", "kan.canBorcu", "kan.donus", "kan.davaci", "kan.buyudu", "kan.miras", "kan.babaKatili", "npct.kefilOd", "npct.kefilBatti", "npct.borcOdendi", "npct.borcGecikti", "npct.borcBatti", "npci.savundu"]; // (nesil hafızası olayları kasabanın toplu anısıdır; anılan kişi atanın kendisi — ölçüm dışı)
// İkilemden doğan tohumların metni eylemin kendisini geri çağırır ("o yangın gecesi…"): adsız da olsa sebebini söyler.
const IKILEM_TOHUM = new Set(Object.values(g.DILEMMA_SEEDS || {}).map((x) => "seed." + x.kaynak));
const T = { kisisiz: {}, gecikmeli: 0, geriCagiran: 0, kapi: {}, dunyaHaberi: 0, ay: 0, bos: 0, bunalma: 0, pencere: 0, karar: 0, buyukKarar: 0, olay: 0, landmark: 0, gerilimTop: 0, gerilim5ustu: 0, gerilimMax: 0, cocukAy: 0, cocukBos: 0 };
const hayatAy = [], hayatKarar = [], olumYasi = [], meslekler = {}, enBuyuk = {}; let sarmal = 0, ilkKararAy = [];
for (let h = 0; h < LIVES; h++) {
  let s = g.newGame("Sim", "Oyuncu", Math.random() < 0.5 ? "erkek" : "kadın");
  let ay = 0, kararSay = 0, dip = 0, sarmalda = false, ilkKarar = null, seen = s.hseq || 0, guard = 0;
  const hedef = R(g.ALL_PROFS.filter((x) => x !== "işsiz")); const hedefSart = g.meslekSarti(hedef);
  while (!s.player.dead && s.player.age < 85 && guard++ < 1100) {
    const p = s.player;
    // Makul oyuncu: karnını doyurur, çalışır, çocukken oynar, gençken uğraşır, ara sıra insanlarla konuşur.
    if (p.hunger < 35) s = g.eat(s);
    if (p.age >= 13 && p.profession !== "işsiz" && s.player.hunger >= 30) s = g.work(s);
    let secim = 0; // oyuncunun kendi seçtiği aylık uğraş (çocukluk/gençlik): küçük karar sayılır
    try { if (p.age < 13 && Math.random() < 0.6) { const r = g.childAction(s, R(["oyun", "yardim", "yaramazlik", "kesif"])); if (r && r.state && r.state !== s) { s = r.state; secim = 1; } } } catch (e) {}
    try { if (p.age >= 13 && p.age < 18 && Math.random() < 0.5) { const r = g.youthAction(s, R(["usta", "akran", "gonul", "huner"])); if (r && !r.blocked) { s = r.state; secim = 1; } } } catch (e) {}
    // Hedefini seçen oyuncu: özellik puanlarını hedef mesleğin özelliğine basar ve uygun olunca o mesleğe geçer (ölçüm: hedefli oyuncu 13–18 yaşında ulaşıyor)
    while (s.player.stat_points > 0 && s.player.stats[hedefSart.stat] < g.statCapOf(s.player)) s = g.allocateStat(s, hedefSart.stat);
    try { if (p.age >= 13 && s.player.profession !== hedef && Math.random() < 0.2) s = g.changeProfession(s, hedef); } catch (e) {}
    try { if (p.age >= 13 && Math.random() < 0.25) { const ns = g.npcsOf(s); if (ns.length) { const r = g.talkWith(s, R(ns), R(["hosbes", "iltifat", "dert", "is", "aile"])); if (r && r.state) s = r.state; } } } catch (e) {}
    // Ay ilerler; ardından ana ekranın göstereceği her şey sayılır.
    s = g.advance(s, 1); ay++; T.ay++;
    const yeni = s.history.filter((e) => (e.q || 0) > seen); seen = s.hseq || seen;
    let pencere = 0, karar = secim, buyuk = 0;
    const land = yeni.filter(g.donumAni); // pencere açan büyük an (index.tsx ile aynı kural)
    T.dunyaHaberi += yeni.filter((e) => e.landmark && e.scope === "makro" && !g.donumAni(e)).length;
    if (land.length) pencere++; // dönüm noktası penceresi (ayın en yenisi)
    if (yeni.some((e) => e.type === "yıl_dönümü")) pencere++; // yıl karnesi
    T.olay += yeni.length; T.landmark += land.length;
    for (const e of yeni) if (GECIKMELI.some((x) => (e.k || "").startsWith(x))) { T.gecikmeli++; if ((e.p || []).some((v) => v && typeof v === "object" && ("kn" in v || "kf" in v || "fn" in v)) || IKILEM_TOHUM.has(e.k)) T.geriCagiran++; else T.kisisiz[e.k] = (T.kisisiz[e.k] || 0) + 1; }
    for (const e of land) enBuyuk[e.type] = (enBuyuk[e.type] || 0) + 1;
    const ger = acikGerilim(s); T.gerilimTop += ger; if (ger > 5) T.gerilim5ustu++; T.gerilimMax = Math.max(T.gerilimMax, ger); // kararlar verilmeden önce
    // Ana ekranın kart zarı (index.tsx ile aynı): teklif/hesap ayında kart yok; büyük an ayında yalnız şenlik
    const kararVar = !!s.hesap || (s.npcTeklif && s.npcTeklif.turn === s.turn);
    if (!kararVar && !s.player.dead && !(s.player.jail && s.player.jail.left > 0)) {
      const fest = g.pickFestival(s);
      if (fest) { pencere++; karar++; buyuk++; const i = Math.floor(Math.random() * fest.choices.length); s = g.applyDilemma(s, fest.choices[i].delta, fest.choices[i].result, fest.id + ":" + i, true); }
      else if (!land.length) { const r = Math.random();
        if (r < KART_IKILEM) { const d = g.pickDilemma(s); if (d) { pencere++; karar++; buyuk++; const i = Math.floor(Math.random() * d.choices.length); s = g.applyDilemma(s, d.choices[i].delta, d.choices[i].result, d.id + ":" + i); } }
        else if (r < KART_IKILEM + KART_FIRSAT) { const l = g.opportunitiesFor(s); if (l.length) { pencere++; karar++; s = g.resolveOpportunity(s, R(l), Math.random() < 0.5); } }
        else if (r < KART_IKILEM + KART_FIRSAT + KART_KAPI) { s = g.kapiyaGelen(s); if (s.npcTeklif && s.npcTeklif.turn === s.turn) T.kapi[s.npcTeklif.tur] = (T.kapi[s.npcTeklif.tur] || 0) + 1; } }
    }
    if (s.npcTeklif && s.npcTeklif.turn === s.turn) { pencere++; karar++; buyuk++; s = g.npcTeklifYanit(s, Math.random() < 0.75, Math.random() < 0.5 ? 0 : 1); }
    if (s.hesap) { pencere++; karar++; buyuk++; s = g.hesapKarari(s, Math.random() < 0.3); }
    if (s.micro) { karar++; s = g.resolveMicro(s, Math.random() < 0.5 ? 0 : 1); }
    if (s.saga && s.saga.scene) { karar++; buyuk++; try { s = g.resolveSaga(s, Math.floor(Math.random() * (g.SAGA_CHOICES[s.saga.scene] || 2))); } catch (e) {} }
    if (s.bloodline && s.bloodline.scene) { karar++; buyuk++; try { s = g.resolveBloodline(s, Math.floor(Math.random() * (g.BL_CHOICES[s.bloodline.scene] || 2))); } catch (e) {} }
    if (s.player.crowned && s.divan) { karar++; buyuk++; s = g.resolveDivan(s, Math.random() < 0.5 ? 0 : 1); }
    seen = s.hseq || seen; // kararların kendi olayları bu ayın sayımına girdi
    const bos = karar === 0 && land.length === 0;
    if (bos) T.bos++; if (pencere >= 3) T.bunalma++;
    if (s.player.age < 13) { T.cocukAy++; if (bos) T.cocukBos++; }
    T.pencere += pencere; T.karar += karar; T.buyukKarar += buyuk; kararSay += karar;
    if (karar && ilkKarar == null) ilkKarar = ay;
    // Çöküş sarmalı: parasız ve (hasta ya da itibarsız) 60 ay üst üste
    const dipte = s.player.money < 5 && (s.player.health < 30 || s.player.reputation < -40);
    dip = dipte ? dip + 1 : 0; if (dip >= 60) sarmalda = true;
  }
  hayatAy.push(ay); hayatKarar.push(kararSay); olumYasi.push(s.player.age); if (sarmalda) sarmal++;
  if (ilkKarar != null) ilkKararAy.push(ilkKarar);
  meslekler[s.player.profession] = (meslekler[s.player.profession] || 0) + 1;
}
fs.unlinkSync(paket);
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
const yuzde = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const entropi = (o) => { const n = Object.values(o).reduce((a, b) => a + b, 0); return Math.round(-Object.values(o).reduce((a, c) => a + (c / n) * Math.log2(c / n), 0) * 100) / 100; };
const sonuc = {
  hayat: LIVES, ay: T.ay,
  bosAyYuzde: yuzde(T.bos, T.ay), cocuklukBosAyYuzde: yuzde(T.cocukBos, T.cocukAy),
  bunalmaAyYuzde: yuzde(T.bunalma, T.ay),
  aylikPencere: Math.round((T.pencere / T.ay) * 100) / 100, aylikKarar: Math.round((T.karar / T.ay) * 100) / 100, aylikBuyukKarar: Math.round((T.buyukKarar / T.ay) * 100) / 100,
  aylikOlay: Math.round((T.olay / T.ay) * 10) / 10, aylikDonumNoktasi: Math.round((T.landmark / T.ay) * 100) / 100, aylikDunyaHaberi: Math.round((T.dunyaHaberi / T.ay) * 100) / 100,
  geriCagirmaYuzde: yuzde(T.geriCagiran, T.gecikmeli), gecikmeliSonuc: T.gecikmeli,
  ortGerilim: Math.round((T.gerilimTop / T.ay) * 100) / 100, gerilim5UstuAyYuzde: yuzde(T.gerilim5ustu, T.ay), gerilimMax: T.gerilimMax,
  hayatAyMedyan: med(hayatAy), hayatKararMedyan: med(hayatKarar), ilkKararAyMedyan: med(ilkKararAy),
  olumYasiMedyan: med(olumYasi), sarmalYuzde: yuzde(sarmal, LIVES),
  meslekCesitliligi: entropi(meslekler), meslekSayisi: Object.keys(meslekler).length,
  enSikDonum: Object.entries(enBuyuk).sort((a, b) => b[1] - a[1]).slice(0, 6),
};
if (process.env.OYN_JSON) { console.log(JSON.stringify(sonuc)); process.exit(0); }
console.log(`OYNANIŞ DENETİMİ · ${LIVES} hayat · ${T.ay} ay`);
console.log(`  Boş ay (karar da dönüm noktası da yok): %${sonuc.bosAyYuzde}  · çocuklukta %${sonuc.cocuklukBosAyYuzde}`);
console.log(`  Bunalma ayı (3+ pencere): %${sonuc.bunalmaAyYuzde}`);
console.log(`  Ayda pencere ${sonuc.aylikPencere} · karar ${sonuc.aylikKarar} (büyük ${sonuc.aylikBuyukKarar}) · olay ${sonuc.aylikOlay} · dönüm noktası ${sonuc.aylikDonumNoktasi} (pencere açmayan dünya haberi ${sonuc.aylikDunyaHaberi})`);
console.log(`  Gecikmeli sonuç ${sonuc.gecikmeliSonuc} · sebebini söyleyen (geri çağırma: kişi adı ya da eylemin kendisi) %${sonuc.geriCagirmaYuzde}`);
if (Object.keys(T.kisisiz).length) console.log(`    kişiyi anmayanlar: ${Object.entries(T.kisisiz).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => k + " " + v).join(", ")}`);
console.log(`  Açık gerilim ort. ${sonuc.ortGerilim} · 5'i aşan ay %${sonuc.gerilim5UstuAyYuzde} · en çok ${sonuc.gerilimMax}`);
console.log(`  Tempo: hayat medyan ${sonuc.hayatAyMedyan} ay, ${sonuc.hayatKararMedyan} karar · ilk karar ${sonuc.ilkKararAyMedyan}. ayda`);
console.log(`  Ölüm yaşı medyan ${sonuc.olumYasiMedyan} · çöküş sarmalı %${sonuc.sarmalYuzde}`);
console.log(`  Çeşitlilik: ${sonuc.meslekSayisi} meslek, entropi ${sonuc.meslekCesitliligi} bit (${Object.entries(meslekler).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(", ")})`);
console.log(`  Kapıya gelen kartlar: ${Object.entries(T.kapi).map(([k, v]) => k + " " + v).join(", ") || "yok"}`);
console.log(`  En sık dönüm noktası türleri: ${sonuc.enSikDonum.map(([k, v]) => k + " " + v).join(", ")}`);
