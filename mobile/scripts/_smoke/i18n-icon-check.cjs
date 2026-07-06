// Tam tarama: (1) 6 dil anahtar tamlığı, (2) %N placeholder tutarlılığı, (3) kullanılan k/t anahtarlarının varlığı, (4) GameIcon ad geçerliliği.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = require("path").resolve(__dirname, "../..");
const BUNDLE = path.join(ROOT, "node_modules/.cache/kronikler-i18n-bundle.cjs");

// 1) i18n.tsx'i DICTS'i dışa açan footer ile paketle (react vb. external — bundle node_modules içinde olduğundan çözülür)
execSync(
  `npx esbuild lib/i18n.tsx --bundle --platform=node --format=cjs ` +
    `--external:react --external:react-native --external:@react-native-async-storage/async-storage ` +
    `--footer:js="module.exports.__DICTS = Object.fromEntries(Object.entries(DICT_BUILDERS).map(([k,f])=>[k,f()]));" --outfile=${BUNDLE}`,
  { cwd: ROOT, stdio: "pipe" }
);
const I = require(BUNDLE);
const DICTS = I.__DICTS;
if (!DICTS || !DICTS.tr) { console.error("DICTS alınamadı"); process.exit(1); }
const LANGS = ["tr", "en", "es", "pt", "ar", "ru"];

let problems = 0;
function report(cat, msg) { problems++; console.log(`[${cat}] ${msg}`); }

// ── A) Dil tamlığı: birleşik anahtar kümesi ↔ her dil ──
// Tasarım gereği hariç: ".f" dişil varyantları (renderEvt fallback'li — yalnız gramer gerektiren dillerde tanımlı),
// "dil.*" (Türkçe metin events.ts verisinde; sözlük yalnız çeviri taşır → tr'de olmaması normal).
const union = new Set();
for (const l of LANGS) for (const k of Object.keys(DICTS[l])) union.add(k);
for (const l of LANGS) {
  const missing = [...union].filter((k) => !(k in DICTS[l]) && !k.endsWith(".f") && !(l === "tr" && k.startsWith("dil.")));
  if (missing.length) report("DIL-EKSIK", `${l}: ${missing.length} anahtar eksik → ${missing.slice(0, 40).join(", ")}${missing.length > 40 ? " …" : ""}`);
}
// dil.* anahtarları tr dışındaki 5 dilde birbiriyle tam mı? (tr hariç kendi aralarında)
{
  const dilUnion = new Set();
  for (const l of LANGS.slice(1)) for (const k of Object.keys(DICTS[l])) if (k.startsWith("dil.") && !k.endsWith(".f")) dilUnion.add(k); // .f dişil varyantları dile özgüdür (cinsiyetsiz dillerde olmaması normal)
  for (const l of LANGS.slice(1)) {
    const m = [...dilUnion].filter((k) => !(k in DICTS[l]));
    if (m.length) report("DIL-EKSIK", `dil.* ${l}: ${m.length} eksik → ${m.slice(0, 20).join(", ")}`);
  }
}

// ── B) Placeholder tutarlılığı: her anahtarın %N kümesi dillerde aynı olmalı ──
function phSet(str) { const s = new Set(); for (const m of str.matchAll(/%(\d+)/g)) s.add(m[1]); return [...s].sort().join(","); }
for (const k of union) {
  const sets = new Map();
  for (const l of LANGS) { const v = DICTS[l][k]; if (v != null) sets.set(l, phSet(v)); }
  const uniq = new Set(sets.values());
  if (uniq.size > 1) {
    const detail = [...sets.entries()].map(([l, s]) => `${l}:[${s || "-"}]`).join(" ");
    report("PH-UYUMSUZ", `${k} → ${detail}`);
  }
}

// ── C) Kullanılan anahtarlar mevcut mu? ──
function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}
const srcFiles = [...walk(path.join(ROOT, "lib"), [".ts", ".tsx"]), ...walk(path.join(ROOT, "app"), [".ts", ".tsx"])];
const usedKeys = new Map(); // key -> ilk kullanım yeri
for (const f of srcFiles) {
  if (f.includes("mp/protocol.ts")) continue; // intent 'kind' literalleri i18n anahtarı değil
  const txt = fs.readFileSync(f, "utf8");
  const rel = path.relative(ROOT, f);
  // NOT: `"önek." + değişken` dinamik anahtarları elemek için kapanış tırnağından sonra + gelmemeli
  // k: "anahtar"  (push olayları / TickEvent)
  for (const m of txt.matchAll(/\bk:\s*"([a-zA-Z0-9_.]+)"(?!\s*\+)/g)) if (!usedKeys.has(m[1])) usedKeys.set(m[1], rel);
  // t("anahtar") / tFor(lang, "anahtar")
  for (const m of txt.matchAll(/\bt\(\s*"([a-zA-Z0-9_.]+)"(?!\s*\+)/g)) if (!usedKeys.has(m[1])) usedKeys.set(m[1], rel);
  for (const m of txt.matchAll(/\btFor\(\s*[a-zA-Z_.]+,\s*"([a-zA-Z0-9_.]+)"(?!\s*\+)/g)) if (!usedKeys.has(m[1])) usedKeys.set(m[1], rel);
}
const missingUsed = [];
for (const [k, where] of usedKeys) if (!(k in DICTS.tr) && !k.startsWith("dil.")) missingUsed.push(`${k} (${where})`);
if (missingUsed.length) report("KULLANILAN-YOK", `${missingUsed.length} anahtar sözlükte yok:\n  ${missingUsed.join("\n  ")}`);

// ── D) GameIcon adları çözülüyor mu? (GameIcon: ICON[name] || name → ICON_PATHS; bulunamazsa SESSİZCE null döner) ──
const iconSrc = fs.readFileSync(path.join(ROOT, "lib/icon-paths.ts"), "utf8");
const iconKeys = new Set();
for (const m of iconSrc.matchAll(/^\s{2}"([^"]+)":\s*\[/gm)) iconKeys.add(m[1]);
const iconsSrc = fs.readFileSync(path.join(ROOT, "lib/icons.tsx"), "utf8");
const alias = {};
for (const m of iconsSrc.matchAll(/(\w+):\s*"([^"]+)"/g)) alias[m[1]] = m[2];
const resolves = (n) => iconKeys.has(alias[n] || n);
console.log(`(bilgi) ICON_PATHS: ${iconKeys.size} ikon · alias: ${Object.keys(alias).length} · sözlük: ${union.size} anahtar · kullanılan: ${usedKeys.size}`);
// alias haritasının kendisi geçerli mi?
for (const [k, v] of Object.entries(alias)) if (!iconKeys.has(v)) report("ALIAS-KIRIK", `ICON.${k} → "${v}" ICON_PATHS'te yok`);
const badIcons = [];
for (const f of srcFiles) {
  const txt = fs.readFileSync(f, "utf8");
  const rel = path.relative(ROOT, f);
  for (const m of txt.matchAll(/<GameIcon[^>]*\bname="([^"]+)"/g)) if (!resolves(m[1])) badIcons.push(`${m[1]} (${rel})`);
  for (const m of txt.matchAll(/\bicon:\s*"([^"]+)"/g)) if (!resolves(m[1])) badIcons.push(`icon:${m[1]} (${rel})`);
}
if (badIcons.length) report("IKON-YOK", `${badIcons.length} geçersiz ikon adı:\n  ${[...new Set(badIcons)].join("\n  ")}`);

console.log(problems === 0 ? "\nSONUÇ: TEMİZ (0 sorun)" : `\nSONUÇ: ${problems} sorun kategorisi`);
