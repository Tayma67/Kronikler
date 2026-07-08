// Paralel smoke: motoru ANLIK GÖRÜNTÜ olarak paketler, hayatları çekirdeklere böler.
// Anlık görüntü sayesinde smoke koşarken çalışma kopyasında geliştirme sürebilir —
// sonuç, paketin kurulduğu andaki koda (çıktıdaki commit damgasına) aittir.
// Kullanım: node scripts/_smoke/run-parallel.cjs  [SMOKE_LIVES=300] [SMOKE_SHARDS=çekirdek]
const { execSync, spawn } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");

const mobile = path.join(__dirname, "..", "..");
const sha = execSync("git rev-parse --short HEAD", { cwd: mobile }).toString().trim();
const kirli = execSync("git status --porcelain -- lib/", { cwd: path.join(mobile, "..") }).toString().trim() ? "+kirli" : "";
const bundle = path.join(os.tmpdir(), `kronikler-smoke-${sha}-${process.pid}.cjs`);

console.log(`[paralel-smoke] paket kuruluyor · commit ${sha}${kirli}`);
execSync(`npx esbuild lib/game.ts --bundle --platform=node --format=cjs --outfile=${bundle} --log-level=error`, { cwd: mobile, stdio: "inherit" });

const TOTAL = parseInt(process.env.SMOKE_LIVES || "300", 10);
const SHARDS = Math.max(1, Math.min(parseInt(process.env.SMOKE_SHARDS || "", 10) || os.cpus().length, 16));
const per = Math.ceil(TOTAL / SHARDS);
console.log(`[paralel-smoke] ${TOTAL} hayat · ${SHARDS} parça × ~${per}`);

const t0 = Date.now();
let bekleyen = SHARDS, toplamHata = 0, tumOlumler = [], kod = 0;
for (let i = 0; i < SHARDS; i++) {
  const c = spawn(process.execPath, [path.join(__dirname, "run.cjs")], {
    cwd: mobile,
    env: { ...process.env, SMOKE_BUNDLE: bundle, SMOKE_LIVES: String(Math.min(per, TOTAL - i * per)), SMOKE_JSON: "1" },
  });
  let out = "";
  c.stdout.on("data", (d) => { out += d; });
  c.stderr.on("data", (d) => process.stderr.write(d));
  c.on("close", (code) => {
    const m = out.match(/SMOKE_JSON:(\{.*\})/);
    if (m) {
      const r = JSON.parse(m[1]);
      toplamHata += r.errors; tumOlumler.push(...r.died);
      const satirlar = out.split("\n").filter((l) => l && !l.startsWith("SMOKE_JSON:"));
      for (const l of satirlar.slice(0, 5)) console.log(`[parça ${i + 1}] ${l}`);
    } else { toplamHata += 1; console.error(`[parça ${i + 1}] çıktı çözülemedi (kod ${code})`); }
    if (code !== 0) kod = 1;
    if (--bekleyen === 0) {
      tumOlumler.sort((a, b) => a - b);
      const dk = ((Date.now() - t0) / 60000).toFixed(1);
      const med = tumOlumler[Math.floor(tumOlumler.length / 2)];
      console.log(`${TOTAL} hayat × tüm aksiyonlar · commit ${sha}${kirli} · süre ${dk} dk · HATA: ${toplamHata} · ölüm yaşı medyan ${med} (min ${tumOlumler[0]} / max ${tumOlumler[tumOlumler.length - 1]})`);
      try { fs.unlinkSync(bundle); } catch {}
      process.exit(toplamHata > 0 ? 1 : kod);
    }
  });
}
