// Çevrimdışı olay teslimi testi: oyuncu yokken biriken kişisel olaylar (hediye altını,
// borç düşümü) kaybolmaz — dönüşünde "missed" mesajıyla teslim edilir.
// Yerel: MP_URL=ws://127.0.0.1:8787 node mp_itest10.cjs  (wrangler dev açıkken)
const BASE = process.env.MP_URL || "wss://kronikler-mp.tayma.workers.dev";
const REALM = "QM" + Math.floor(Math.random() * 1e6).toString(36).toUpperCase().slice(0, 4);
let PASS = 0, FAIL = 0; const ok = (c, m) => { c ? (PASS++, console.log("  ✓ " + m)) : (FAIL++, console.log("  ✗ HATA: " + m)); };
function mk() {
  const ws = new WebSocket(BASE + "/realm/" + REALM); const msgs = []; const st = { ws, msgs };
  ws.onmessage = (e) => { const m = JSON.parse(String(e.data)); msgs.push(m); };
  st.send = (o) => ws.send(JSON.stringify(o));
  st.open = () => new Promise((r) => { if (ws.readyState === 1) return r(); ws.onopen = () => r(); });
  return st;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function wf(st, pred, ms = 9000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const h = st.msgs.filter(pred); if (h.length) return h[h.length - 1]; await sleep(120); } return null; }
function pub(id) { return { id, name: id, surname: "T", gender: "erkek", age: 30, generation: 1, profession: "asker", fame: 20, power: 30, crowned: false, guildId: null, provinceName: null, beylikId: null, honor: 0, traveling: false, married: false, online: true, ready: false, dead: false }; }
(async () => {
  console.log("Diyar:", REALM, "·", BASE);
  const A = mk(); let B = mk();
  await A.open(); A.send({ t: "join", realmId: REALM, realmName: REALM, player: pub("pA") }); await wf(A, (m) => m.t === "welcome");
  await B.open(); B.send({ t: "join", realmId: REALM, realmName: REALM, player: pub("pB") }); await wf(B, (m) => m.t === "welcome");
  A.send({ t: "sync", player: pub("pA") }); B.send({ t: "sync", player: pub("pB") }); await sleep(300);
  let turn = 0;
  const tickBoth = async () => { turn++; A.send({ t: "ready", ready: true }); B.send({ t: "ready", ready: true }); return await wf(A, (m) => m.t === "tick" && m.turn === turn, 9000); };
  const tickA = async () => { turn++; A.send({ t: "ready", ready: true }); return await wf(A, (m) => m.t === "tick" && m.turn === turn, 9000); };

  // 1) B (borç veren) A'ya borç teklif eder → tick → teklif kütüğe düşer
  B.send({ t: "intent", intent: { k: "proposeLoan", to: "pA", amount: 1000 } });
  let tk = await tickBoth();
  const offer = tk && tk.snapshot.offers.find((o) => o.kind === "loan" && o.to === "pA");
  ok(!!offer, "borç teklifi kütüğe düştü");

  // 2) B çevrimdışı olur
  B.ws.close(); await sleep(500);

  // 3) A teklifi kabul eder + B'ye 500 hediye yollar → tick (yalnız A hazır)
  if (offer) A.send({ t: "intent", intent: { k: "respondOffer", offerId: offer.id, accept: true } });
  A.send({ t: "intent", intent: { k: "gift", to: "pB", amount: 500 } });
  tk = await tickA();
  ok(!!tk, "B çevrimdışıyken tick işledi");
  const aEv = tk && tk.results.find((r) => r.playerId === "pA");
  ok(aEv && aEv.events.some((e) => e.k === "mp.soc.loanGot"), "A borcu aldı (loanGot)");

  // 4) B geri döner → welcome'dan sonra missed teslim edilmeli
  B = mk(); await B.open();
  B.send({ t: "join", realmId: REALM, realmName: REALM, player: pub("pB") });
  await wf(B, (m) => m.t === "welcome");
  const missed = await wf(B, (m) => m.t === "missed", 6000);
  ok(!!missed, "dönüşte missed mesajı geldi");
  ok(missed && missed.events.some((e) => e.k === "mp.soc.loanGave"), "borç düşümü (loanGave) teslim edildi — altın çoğalması kapandı");
  ok(missed && missed.events.some((e) => e.k === "mp.soc.giftGot"), "hediye altını (giftGot) teslim edildi — hediye yok olmuyor");

  // 5) İkinci katılımda kuyruk boş olmalı (bir kez teslim)
  const B2 = mk(); await B2.open();
  B2.send({ t: "join", realmId: REALM, realmName: REALM, player: pub("pB") });
  await wf(B2, (m) => m.t === "welcome");
  const missed2 = await wf(B2, (m) => m.t === "missed", 2500);
  ok(!missed2, "kuyruk teslim sonrası temizlendi (ikinci girişte missed yok)");

  console.log("\nSONUÇ: " + PASS + " geçti, " + FAIL + " başarısız");
  A.send({ t: "leave" }); B2.send({ t: "leave" }); try { A.ws.close(); B.ws.close(); B2.ws.close(); } catch {}
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.log("İSTİSNA:", e.message); process.exit(2); });
setTimeout(() => { console.log("ZAMANAŞIMI"); process.exit(3); }, 55000);
