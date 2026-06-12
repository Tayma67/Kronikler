// Oynanış ekranlarını backend'siz render eder: /game/state mock'lanır, diğer
// tüm API çağrıları abort edilir (uygulamanın .catch/try savunması devreye girer).
//   node screenshot.js <route> <out.png> [port] [stateJson]
// Örnek: node screenshot.js /oyun /tmp/dash.png 8079 ./state.json
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const route = process.argv[2] || "/";
const out   = process.argv[3] || "/tmp/shot.png";
const port  = process.argv[4] || 8079;
const stateFile = process.argv[5] || path.resolve(__dirname, "state.json");
const base = `http://localhost:${port}`;
const state = fs.readFileSync(stateFile, "utf8");

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true,
  });
  await ctx.route("**/*", (r) => {
    const u = r.request().url();
    if (u.startsWith(base)) return r.continue();           // statik dosyalar
    if (u.includes("/game/state"))
      return r.fulfill({ status: 200, contentType: "application/json", body: state });
    return r.abort();                                       // diğer API → app fallback'ler
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(base + route, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: out, fullPage: true });
  console.log(`${route} → ${out}`, errs.length ? "PAGEERR: " + errs[0] : "ok");
  await b.close();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
