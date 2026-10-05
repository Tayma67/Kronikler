// Olay metni bekçisi: gerçek hayatlar oynatılır, kroniğe düşen HER olay 6 dilde ekranda göründüğü gibi yazdırılır.
// Artakalan yer tutucu (%1, %b, %n…), "undefined", "NaN", "[object" ya da boş metin → hata. (Geçmişte dünya haberlerinde
// "%b kadısı…" oyuncuya sızmıştı.) Kullanım: node scripts/_smoke/olay-metin.cjs [hayat sayısı, varsayılan 40]
const path = require("path"); const fs = require("fs"); const os = require("os"); const { execSync } = require("child_process");
const kok = path.join(__dirname, "..", ".."); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "olay-"));
const giris = path.join(kok, "_olay_giris.ts");
fs.writeFileSync(giris, 'export * as g from "./lib/game";\nexport { renderEvt, tFor } from "./lib/i18n";\n');
try { execSync(`npx esbuild "${giris}" --bundle --format=cjs --platform=node --outfile="${tmp}/o.cjs" --log-level=error`, { cwd: kok, stdio: "inherit" }); }
finally { fs.unlinkSync(giris); }
const { g, renderEvt, tFor } = require(`${tmp}/o.cjs`);
// Çevrilmemiş ham anahtar (ör. "wev.balıkçı.5.lose") metne sızmasın
const HAM_ANAHTAR = /\b(wev|evj|ev|npct|npca|npci|npclife|flav|kan|mem|seed|prof|chip|rumor|sans|sk|cember|ah|kd|hesap|saga|bl|epoch|crown|horse|fsig|cb|mev|pp|soc)\.[A-Za-zçğıöşüÇĞİÖŞÜ0-9_]+(\.[A-Za-zçğıöşü0-9_]+)*/;
const LANGS = ["tr", "en", "es", "pt", "ar", "ru"]; const R = (a) => a[Math.floor(Math.random() * a.length)];
const HAYAT = +(process.argv[2] || 40); let sorun = 0, toplam = 0; const ornek = []; const goruldu = new Set();
for (let h = 0; h < HAYAT; h++) {
  let s = g.newGame("Deneme", "Kişi", h % 2 ? "erkek" : "kadın"); let i = 0;
  while (!s.player.dead && i++ < 12 * 70) {
    const p = s.player; p.health = Math.max(p.health, 40);
    if (p.hunger < 35) s = g.eat(s);
    if (p.age >= 13 && p.profession !== "işsiz") s = g.work(s);
    const ns = g.npcsOf(s);
    if (p.age >= 13 && ns.length && Math.random() < 0.3) { try { s = g.talkWith(s, R(ns), R(["hosbes", "iltifat", "dert", "saka", "is", "aile", "dunya", "hedef"])).state; } catch (e) {} }
    if (Math.random() < 0.1) { try { s = g.mekanaGit(s, R(g.MEKANLAR)); s = g.aksamSofrasi(s); } catch (e) {} }
    if (s.npcTeklif && Math.random() < 0.5) s = g.npcTeklifYanit(s, Math.random() < 0.5);
    const n0 = s.history.length; s = g.advance(s, 1);
    for (const e of s.history.slice(Math.max(0, n0 - 1))) {
      if (goruldu.has(e)) continue; goruldu.add(e);
      for (const L of LANGS) {
        toplam++;
        const female = s.player.gender === "kadın";
        const x = renderEvt(e.k, e.text, e.p, L, (k) => tFor(L, k), female);
        if (!x || /%[0-9a-z]|undefined|NaN|\[object/.test(x) || HAM_ANAHTAR.test(x) || /^\s|\s\s|\(\s*\)/.test(x)) { sorun++; if (ornek.length < 12) ornek.push(`${L} ${e.k}: ${String(x).slice(0, 90)}`); }
      }
    }
  }
}
ornek.forEach((o) => console.log("  " + o));
console.log(sorun ? `OLAY METNİ: ${sorun} sorun / ${toplam} yazım` : `OLAY METNİ: TEMİZ (${toplam} yazım, 0 sorun)`);
process.exit(sorun ? 1 : 0);
