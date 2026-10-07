// Ölü karar denetimi (TASARIM_PUSULASI.md 9.1 ve 9.10): ikilem ve şenlik kartlarında, öbür seçeneği her değerde
// yenen (hiçbir yerde geride kalmayan, en az bir yerde öne geçen) seçenek var mı? Hedef: 0.
// Karşılaştırılamaz sayılanlar: gizli tohumlu seçim (sonucu yıllar sonra döner), yönü bağlama göre değişen değerler
// (korku, zalim/çapkın nâmı, eşya). Riskli seçenekte (risk) iki sonucun ikisi de öbürünü yenmeli ya da ikisi de yenilmeli.
// Kullanım: node scripts/_smoke/olu-karar.cjs   → "ÖLÜ KARAR: TEMİZ" ya da liste (exit 1)
const { execSync } = require("child_process");
const os = require("os"); const fs = require("fs"); const path = require("path");
const mobile = path.join(__dirname, "..", "..");
const giris = path.join(os.tmpdir(), `kronikler-olu-giris-${process.pid}.ts`);
const paket = path.join(os.tmpdir(), `kronikler-olu-${process.pid}.cjs`);
fs.writeFileSync(giris, `export { DILEMMAS, FESTIVALS } from ${JSON.stringify(path.join(mobile, "lib/events"))};\nexport { DILEMMA_SEEDS } from ${JSON.stringify(path.join(mobile, "lib/game"))};\n`);
execSync(`npx esbuild ${giris} --bundle --platform=node --format=cjs --outfile=${paket} --log-level=error`, { cwd: mobile, stdio: "inherit" });
const B = require(paket); fs.unlinkSync(giris); fs.unlinkSync(paket);

const SIRALI = ["money", "health", "hunger", "reputation", "honor", "fame", "stat_points", "standing", "nam.comert", "nam.dindar", "nam.mert"]; // çok = iyi
const BELIRSIZ = ["fear", "nam.zalim", "nam.capkin", "addItem"]; // iyi ya da kötü olduğu bağlama bağlı
const vec = (d) => { const o = {}; for (const [k, v] of Object.entries(d || {})) { if (k === "nam") for (const [n, x] of Object.entries(v)) o["nam." + n] = x; else o[k] = v; } return o; };
const yener = (a, b) => { // a, b'yi her sıralı değerde tutuyor ve bir yerde geçiyor mu
  for (const k of BELIRSIZ) if ((a[k] || 0) !== (b[k] || 0)) return false;
  for (const k of Object.keys({ ...a, ...b })) if (!SIRALI.includes(k) && !BELIRSIZ.includes(k)) return false;
  let strict = false;
  for (const k of SIRALI) { const x = a[k] || 0, y = b[k] || 0; if (x < y) return false; if (x > y) strict = true; }
  return strict;
};
const kartlar = [...B.DILEMMAS, ...B.FESTIVALS.flatMap((f) => f.variants)];
const out = [];
for (const dl of kartlar) {
  const ch = dl.choices.map((c, i) => ({ i, label: c.label, seed: B.DILEMMA_SEEDS[dl.id + ":" + i], sonuc: c.risk ? [vec(c.delta), vec(c.risk.kayip)] : [vec(c.delta)] }));
  for (const a of ch) for (const b of ch) {
    if (a === b || a.seed || b.seed) continue;
    if (a.sonuc.every((x) => b.sonuc.every((y) => yener(x, y)))) out.push(`${dl.id}: [${a.i}] "${a.label}" ${JSON.stringify(a.sonuc)}  ≻  [${b.i}] "${b.label}" ${JSON.stringify(b.sonuc)}`);
  }
}
console.log(`${kartlar.length} kart tarandı (ikilem ${B.DILEMMAS.length}, şenlik ${kartlar.length - B.DILEMMAS.length})`);
if (out.length) { console.log(out.join("\n")); console.log(`ÖLÜ KARAR: ${out.length} kart`); process.exit(1); }
console.log("ÖLÜ KARAR: TEMİZ (0 kart)");
