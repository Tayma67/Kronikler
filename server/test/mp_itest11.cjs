// Üye temettüsü + uyarlanır çoğunluk testi: sefer ganimeti üyeye pay düşürür;
// 2 kişilik diyarda tek hazır oyuncu turu başlatabilir (>= çoğunluk).
// Yerel: MP_URL=ws://127.0.0.1:8787 node mp_itest11.cjs
const BASE = process.env.MP_URL || "wss://kronikler-mp.tayma.workers.dev";
const REALM = "QS" + Math.floor(Math.random() * 1e6).toString(36).toUpperCase().slice(0, 4);
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
  await A.open(); A.send({ t: "join", realmId: REALM, realmName: REALM, player: pub("pA") }); await wf(A, (m) => m.t === "welcome");
  await B.open(); B.send({ t: "join", realmId: REALM, realmName: REALM, player: pub("pB") }); await wf(B, (m) => m.t === "welcome");
  A.send({ t: "sync", player: pub("pA") }); B.send({ t: "sync", player: pub("pB") }); await sleep(300);
  let turn = 0;

  // 1) Uyarlanır bekleme: yalnız A hazırken deadline 90 sn'ye inmeli (presence'ta görünür), tur hemen BAŞLAMAMALI
  A.send({ t: "ready", ready: true });
  await sleep(600);
  const pres = [...A.msgs].reverse().find((m) => m.t === "presence");
  const dl = pres && pres.tickDeadline ? pres.tickDeadline - Date.now() : Infinity;
  ok(dl < 120000, `tek hazır oyuncuda bekleme 90 sn bandına indi (kalan ~${Math.round(dl / 1000)}s)`);
  const early = A.msgs.some((m) => m.t === "tick");
  ok(!early, "tur tek hazırla ANINDA başlamadı (karşı taraf ay hakkını koruyor)");
  turn++; B.send({ t: "ready", ready: true });
  let tk = await wf(A, (m) => m.t === "tick" && m.turn === turn, 8000);
  ok(!!tk, "çoğunluk tamamlanınca tur başladı");

  // 2) A beylik kurar, B üye olur
  const snap = tk ? tk.snapshot : null;
  const freeB = snap.beyliks.find((b) => !b.beyId) || snap.beyliks[0];
  const targetB = snap.beyliks.find((b) => b.id !== freeB.id && !b.beyId) || snap.beyliks.find((b) => b.id !== freeB.id);
  A.send({ t: "intent", intent: { k: "claimBey", beylikId: freeB.id } });
  B.send({ t: "intent", intent: { k: "joinBeylik", beylikId: freeB.id } });
  turn++; A.send({ t: "ready", ready: true }); B.send({ t: "ready", ready: true });
  tk = await wf(A, (m) => m.t === "tick" && m.turn === turn, 9000);
  const myB = tk && tk.snapshot.beyliks.find((b) => b.id === freeB.id);
  ok(myB && myB.beyId === "pA", "A bey oldu");
  ok(tk && tk.snapshot.players.find((p) => p.id === "pB")?.beylikId === freeB.id, "B beyliğe üye oldu");

  // 3) Sefer: zafere kadar dene (olasılıklı) — zaferde B'ye spoils düşmeli
  let spoils = null, won = false;
  for (let i = 0; i < 8 && !won; i++) {
    A.send({ t: "intent", intent: { k: "beylikCampaign", target: targetB.id } });
    turn++; A.send({ t: "ready", ready: true }); B.send({ t: "ready", ready: true });
    tk = await wf(A, (m) => m.t === "tick" && m.turn === turn, 9000);
    if (!tk) break;
    const aEv = tk.results.find((r) => r.playerId === "pA");
    if (aEv && aEv.events.some((e) => e.k === "mp.beylik.campaignWon")) {
      won = true;
      const bEv = tk.results.find((r) => r.playerId === "pB");
      spoils = bEv && bEv.events.find((e) => e.k === "mp.beylik.spoils");
    }
  }
  ok(won, "sefer kazanıldı (8 denemede)");
  ok(!!spoils, "üye B ganimetten pay aldı (mp.beylik.spoils)");
  ok(spoils && Number(spoils.p?.[1]) === 150, "pay tutarı doğru (150)");

  console.log("\nSONUÇ: " + PASS + " geçti, " + FAIL + " başarısız");
  A.send({ t: "leave" }); B.send({ t: "leave" }); try { A.ws.close(); B.ws.close(); } catch {}
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.log("İSTİSNA:", e.message); process.exit(2); });
setTimeout(() => { console.log("ZAMANAŞIMI"); process.exit(3); }, 90000);
