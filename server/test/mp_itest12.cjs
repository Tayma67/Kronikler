// Ortak girişim (kervan ortaklığı) testi: hisse koyma, kasa görünürlüğü, 3 tikte çözüm,
// çift ortak kâr çarpanı (×1.15) ya da yarı iade, hisse tavanı iadesi.
// Yerel: MP_URL=ws://127.0.0.1:8787 node mp_itest12.cjs
const BASE = process.env.MP_URL || "wss://kronikler-mp.tayma.workers.dev";
const REALM = "QV" + Math.floor(Math.random() * 1e6).toString(36).toUpperCase().slice(0, 4);
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
function pub(id) { return { id, name: id, surname: "T", gender: "erkek", age: 40, generation: 2, profession: "asker", fame: 60, power: 150, crowned: false, guildId: null, provinceName: null, beylikId: null, honor: 0, traveling: false, married: false, online: true, ready: false, dead: false }; }
(async () => {
  console.log("Diyar:", REALM, "·", BASE);
  const A = mk(), B = mk();
  await A.open(); A.send({ t: "join", realmId: REALM, realmName: REALM, player: pub("pA") }); const wel = await wf(A, (m) => m.t === "welcome");
  await B.open(); B.send({ t: "join", realmId: REALM, realmName: REALM, player: pub("pB") }); await wf(B, (m) => m.t === "welcome");
  A.send({ t: "sync", player: pub("pA") }); B.send({ t: "sync", player: pub("pB") }); await sleep(300);
  ok(wel && wel.snapshot.v >= 3, "protokol v3+ (snapshot.v=" + (wel && wel.snapshot.v) + ")");
  let turn = 0;
  const tickBoth = async () => {
    turn++; A.send({ t: "ready", ready: true }); B.send({ t: "ready", ready: true });
    return wf(A, (m) => m.t === "tick" && m.turn === turn, 9000);
  };

  // 1) A 200 + B 300 hisse koyar → tikte kasa 500, 2 ortak, çözüme 3 ay
  A.send({ t: "intent", intent: { k: "ventureBack", amount: 200 } });
  B.send({ t: "intent", intent: { k: "ventureBack", amount: 300 } });
  let tk = await tickBoth();
  ok(!!tk, "1. tik geldi");
  const v = tk && tk.snapshot.venture;
  ok(v && v.backers.length === 2, "girişimde 2 ortak var");
  const pool = v ? v.backers.reduce((s, b) => s + b.amount, 0) : 0;
  ok(pool === 500, "kasa 500 akçe (" + pool + ")");
  const aEv = tk.results.find((r) => r.playerId === "pA");
  ok(aEv && aEv.events.some((e) => e.k === "mp.venture.backed" && Number(e.p?.[0]) === 200), "A'ya 200'lük hisse olayı düştü");

  // 2) İki ara tik: girişim henüz çözülmemeli
  tk = await tickBoth(); ok(tk && !!tk.snapshot.venture, "2. tikte girişim sürüyor");
  tk = await tickBoth(); ok(tk && !!tk.snapshot.venture, "3. tikte girişim sürüyor");

  // 3) Vade tiki: çözüm — iki ortak da AYNI kaderi paylaşır (×1.15 kâr ya da yarı iade)
  tk = await tickBoth();
  ok(tk && !tk.snapshot.venture, "vade tikinde girişim kapandı");
  const aRes = tk.results.find((r) => r.playerId === "pA");
  const bRes = tk.results.find((r) => r.playerId === "pB");
  const aWin = aRes && aRes.events.find((e) => e.k === "mp.venture.win");
  const aFail = aRes && aRes.events.find((e) => e.k === "mp.venture.fail");
  const bWin = bRes && bRes.events.find((e) => e.k === "mp.venture.win");
  const bFail = bRes && bRes.events.find((e) => e.k === "mp.venture.fail");
  ok(!!(aWin || aFail) && !!(bWin || bFail), "iki ortağa da sonuç olayı düştü");
  ok(!!aWin === !!bWin, "ortaklar aynı kaderi paylaştı (birlikte kazan/birlikte kaybet)");
  if (aWin) {
    ok(Number(aWin.p?.[0]) === 230 && Number(bWin.p?.[0]) === 345, "kâr çarpanı doğru (200→230, 300→345, ×1.15)");
    ok(Number(aWin.p?.[1]) === 2, "ortak sayısı olayda doğru (2)");
  } else {
    ok(Number(aFail.p?.[0]) === 100 && Number(bFail.p?.[0]) === 150, "yarı iade doğru (200→100, 300→150)");
  }

  // 4) Hisse tavanı: A aynı tikte 500 + 100 koyar → 100 iade olayı
  A.send({ t: "intent", intent: { k: "ventureBack", amount: 500 } });
  A.send({ t: "intent", intent: { k: "ventureBack", amount: 100 } });
  tk = await tickBoth();
  const aEv2 = tk && tk.results.find((r) => r.playerId === "pA");
  const refund = aEv2 && aEv2.events.find((e) => e.k === "mp.venture.refund");
  ok(refund && Number(refund.p?.[0]) === 100, "tavanı aşan 100 akçe iade edildi");
  const v2 = tk && tk.snapshot.venture;
  ok(v2 && v2.backers.length === 1 && v2.backers[0].amount === 500, "yeni girişimde A'nın hissesi tavanda (500)");

  console.log("\nSONUÇ: " + PASS + " geçti, " + FAIL + " başarısız");
  A.send({ t: "leave" }); B.send({ t: "leave" }); try { A.ws.close(); B.ws.close(); } catch {}
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.log("İSTİSNA:", e.message); process.exit(2); });
setTimeout(() => { console.log("ZAMANAŞIMI"); process.exit(3); }, 90000);
