// Canlı sunucuya karşı çok-oyunculu entegrasyon testi (2 oyuncu).
const BASE = "wss://kronikler-mp.tayma.workers.dev";
const REALM = "QA" + Math.floor(Math.random()*1e6).toString(36).toUpperCase().slice(0,4);
let PASS=0, FAIL=0; const ok=(c,m)=>{ if(c){PASS++;console.log("  ✓ "+m);} else {FAIL++;console.log("  ✗ HATA: "+m);} };

function mk(name){
  const ws = new WebSocket(BASE+"/realm/"+REALM);
  const msgs=[]; const st={ws,name,msgs,you:null,snap:null};
  ws.onmessage=(e)=>{ const m=JSON.parse(String(e.data)); msgs.push(m);
    if(m.t==="welcome"){st.you=m.you; st.snap=m.snapshot;}
    if(m.t==="snapshot"||m.t==="tick") st.snap=m.snapshot;
    if(m.t==="presence"&&st.snap){st.snap={...st.snap,players:m.players,tickDeadline:m.tickDeadline};}
  };
  st.send=(o)=>ws.send(JSON.stringify(o));
  st.ready=()=> new Promise(r=>{ if(ws.readyState===1)return r(); ws.onopen=()=>r(); });
  return st;
}
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function waitFor(st,pred,ms=8000){ const t0=Date.now(); while(Date.now()-t0<ms){ const hit=st.msgs.filter(pred); if(hit.length)return hit[hit.length-1]; await sleep(120);} return null; }
function pub(id,over){ return {id,name:over.name||id,surname:"Test",gender:"erkek",age:over.age||40,generation:1,profession:"asker",fame:over.fame||70,power:over.power||150,crowned:false,guildId:null,provinceName:null,beylikId:null,honor:0,online:true,ready:false,dead:false}; }

(async()=>{
  console.log("Diyar:", REALM);
  const A=mk("A"), B=mk("B");
  await A.ready(); A.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pA",{name:"Alp"})});
  const wa=await waitFor(A,m=>m.t==="welcome"); ok(wa,"A welcome aldı");
  ok(wa&&wa.snapshot.beyliks&&wa.snapshot.beyliks.length===5,"snapshot 5 beylik içeriyor");
  ok(wa&&Array.isArray(wa.snapshot.bonds)&&Array.isArray(wa.snapshot.offers),"snapshot bonds+offers içeriyor");

  await B.ready(); B.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pB",{name:"Bora"})});
  await waitFor(B,m=>m.t==="welcome");
  const presA=await waitFor(A,m=>m.t==="presence"&&m.players.length===2); ok(presA,"A, 2 oyuncu presence gördü");

  // Senkron (güç/yaş ver — bey/taht uygun olsun)
  A.send({t:"sync",player:pub("pA",{name:"Alp"})}); B.send({t:"sync",player:pub("pB",{name:"Bora"})});
  await sleep(400);

  // SOHBET: genel
  A.send({t:"chat",text:"GENEL-MSJ",scope:"all"});
  ok(await waitFor(B,m=>m.t==="chat"&&m.text==="GENEL-MSJ"),"genel sohbet B'ye ulaştı");
  // SOHBET: fısıltı (yalnız A+B)
  A.send({t:"chat",text:"FISILTI-MSJ",scope:"whisper",to:"pB"});
  ok(await waitFor(B,m=>m.t==="chat"&&m.text==="FISILTI-MSJ"&&m.scope==="whisper"),"fısıltı B'ye ulaştı");

  // BEYLİK: A demirhan'a bey olur
  A.send({t:"intent",intent:{k:"claimBey",beylikId:"demirhan"}});
  // SOSYAL: B, A'ya bağış + düello
  B.send({t:"intent",intent:{k:"gift",to:"pA",amount:500}});
  B.send({t:"intent",intent:{k:"duel",to:"pA"}});
  // Tick: ikisi de hazır → çoğunluk → ay atlar
  A.send({t:"ready",ready:true}); B.send({t:"ready",ready:true});
  const tick=await waitFor(A,m=>m.t==="tick",10000);
  ok(tick,"tick gerçekleşti (çoğunluk-hazır)");
  ok(tick&&tick.turn===1,"ay 0→1 ilerledi");
  const bey=tick&&tick.snapshot.beyliks.find(b=>b.id==="demirhan");
  ok(bey&&bey.beyId==="pA","A demirhan beyi oldu (claimBey çözüldü)");
  const aRes=tick&&tick.results.find(r=>r.playerId==="pA");
  ok(aRes&&aRes.events.some(e=>e.k==="mp.beylik.founded"),"A 'beylik.founded' olayı aldı");
  ok(aRes&&aRes.events.some(e=>e.k==="mp.soc.giftGot"),"A 'giftGot' olayı aldı (bağış işledi)");
  ok(tick&&tick.results.some(r=>r.events.some(e=>e.k==="mp.soc.duelWon"||e.k==="mp.soc.duelLost")),"düello çözüldü");
  const bSnap=tick&&tick.snapshot.players.find(p=>p.id==="pB");
  ok(bSnap&&typeof bSnap.honor==="number"&&bSnap.honor>0,"B'nin honor'u arttı (bağış cömertliği) honor="+(bSnap&&bSnap.honor));

  // SOHBET: beylik kanalı — A artık demirhan'da; B değil → B almamalı
  A.msgs.length=0; B.msgs.length=0;
  A.send({t:"chat",text:"BEYLIK-MSJ",scope:"beylik"});
  await sleep(1500);
  ok(B.msgs.every(m=>!(m.t==="chat"&&m.text==="BEYLIK-MSJ")),"beylik sohbeti B'ye SIZMADI (A demirhan, B değil)");

  console.log(`\nSONUÇ: ${PASS} geçti, ${FAIL} başarısız`);
  A.send({t:"leave"}); B.send({t:"leave"}); A.ws.close(); B.ws.close();
  process.exit(FAIL?1:0);
})().catch(e=>{console.log("İSTİSNA:",e.message);process.exit(2);});
setTimeout(()=>{console.log("GENEL ZAMANAŞIMI");process.exit(3);},40000);
