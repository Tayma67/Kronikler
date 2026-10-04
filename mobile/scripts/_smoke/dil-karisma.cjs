// Dil karışması bekçisi: her dilin son sözlüğünde (tüm ek sözlükler birleşmiş hâlde) başka dilin metni var mı?
// Yazı sistemi kesin ayırt eder: Arapça sözlükte Arap harfi, Rusçada Kiril şart; diğerlerinde bu ikisi olmamalı;
// Latin dillerde Türkçe metin TR ile birebir aynıysa çevrilmemiş sayılır. (Geçmişte 7 yayın metni bir dil kaymıştı.)
const path = require("path"); const fs = require("fs"); const os = require("os");
const kok = path.join(__dirname, "..", "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dil-"));
const kopya = path.join(kok, "lib", "_dil_kopya.tsx");
fs.writeFileSync(kopya, fs.readFileSync(path.join(kok, "lib", "i18n.tsx"), "utf8").replace("function dictFor(lang: Lang): Dict {", "export function dictFor(lang: Lang): Dict {"));
const giris = path.join(kok, "_dil_giris.ts"); fs.writeFileSync(giris, 'export { dictFor } from "./lib/_dil_kopya";\n');
const cikti = path.join(tmp, "dil.cjs");
try { require("child_process").execSync(`npx esbuild "${giris}" --bundle --format=cjs --platform=node --outfile="${cikti}" --log-level=error`, { cwd: kok, stdio: "inherit" }); }
finally { fs.unlinkSync(kopya); fs.unlinkSync(giris); }
const { dictFor } = require(cikti);
const LS = ["tr", "en", "es", "pt", "ar", "ru"]; const D = {}; for (const L of LS) D[L] = dictFor(L);
const AR = /[؀-ۿ]/, CY = /[Ѐ-ӿ]/; let sorun = 0; const ornek = [];
for (const L of LS) for (const [k, v] of Object.entries(D[L])) {
  if (typeof v !== "string" || v.replace(/%\d|[^\p{L}]/gu, "").length < 10) continue;
  let n = null;
  if (L === "ar" && !AR.test(v)) n = "Arapça değil"; else if (L === "ru" && !CY.test(v)) n = "Kiril değil";
  else if (L !== "ar" && AR.test(v)) n = "Arapça sızıntı"; else if (L !== "ru" && CY.test(v)) n = "Kiril sızıntı";
  else if (["en", "es", "pt"].includes(L) && /[ğışİĞŞ]/.test(v) && v === D.tr[k] && !/^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+$/.test(v)) n = "Türkçe kalmış";
  if (n) { sorun++; if (ornek.length < 12) ornek.push(`${L} ${k}: ${n} — ${v.slice(0, 50)}`); }
}
ornek.forEach((o) => console.log("  " + o));
console.log(sorun ? `DİL KARIŞMASI: ${sorun} sorun` : "DİL KARIŞMASI: TEMİZ (0 sorun)");
process.exit(sorun ? 1 : 0);
