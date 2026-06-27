// Faz 2 canlı test: çevrimdışı NPC-vekil → yaşlanır + suikastla ölebilir; dönüşte ölü/yaşlı bulunur.
const BASE = process.env.MP_URL || "wss://kronikler-mp.tayma.workers.dev";
const REALM="QV"+Math.floor(Math.random()*1e6).toString(36).toUpperCase().slice(0,4);
let PASS=0,FAIL=0; const ok=(c,m)=>{c?(PASS++,console.log("  ✓ "+m)):(FAIL++,console.log("  ✗ HATA: "+m));};
function mk(){const ws=new WebSocket(BASE+"/realm/"+REALM);const msgs=[];const st={ws,msgs};
  ws.onmessage=e=>{const m=JSON.parse(String(e.data));msgs.push(m);if(m.t==="welcome")st.lastWelcome=m;if(m.t==="tick")st.lastTick=m;};
  st.send=o=>ws.send(JSON.stringify(o));st.open=()=>new Promise(r=>{if(ws.readyState===1)return r();ws.onopen=()=>r();});return st;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(st,pred,ms=9000){const t0=Date.now();while(Date.now()-t0<ms){const h=st.msgs.filter(pred);if(h.length)return h[h.length-1];await sleep(120);}return null;}
function pub(id,o){o=o||{};return{id,name:o.name||id,surname:"T",gender:"erkek",age:o.age||45,generation:1,profession:"asker",fame:o.fame||30,power:o.power||10,crowned:false,guildId:null,provinceName:null,beylikId:null,honor:0,traveling:false,online:true,ready:false,dead:false};}
(async()=>{
  console.log("Diyar:",REALM);
  const A=mk();await A.open();A.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pA",{name:"Alp",power:10,age:60})});
  await waitFor(A,m=>m.t==="welcome");
  A.send({t:"sync",player:pub("pA",{name:"Alp",power:10,age:60})});
  const BLOB=JSON.stringify({player:{name:"Alp",age:60,dead:false,marker:"VEKIL"},turn:3});
  A.send({t:"saveState",blob:BLOB}); await sleep(500);
  A.send({t:"leave"}); A.ws.close(); // SEYAHATSİZ kopma → NPC-vekil
  await sleep(700);
  const B=mk();await B.open();B.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pB",{name:"Bora",power:150})});
  await waitFor(B,m=>m.t==="welcome");
  B.send({t:"sync",player:pub("pB",{name:"Bora",power:150})}); await sleep(300);

  let aDead=false, driftSeen=false, turn=0;
  // Önce SUİKASTSIZ 2 tur: vekil yaşlanma sayacı gözlemlensin. (Ölü vekil yaşlanmaz —
  // bu yüzden drift'i ölümden ÖNCE ölçeriz; ilk-tur ölümünde drift atlanması beklenen davranış.)
  // NOT: beklenen tur waitFor'dan ÖNCE artırılır (predicate'te mutasyon yok — predicate defalarca çağrılır).
  for(let i=0;i<2;i++){ turn++; B.send({t:"ready",ready:true}); const tk=await waitFor(B,m=>m.t==="tick"&&m.turn===turn,8000); if(tk){const a=tk.snapshot.players.find(p=>p.id==="pA"); if(a&&(a.npcMonths||0)>0)driftSeen=true;} }
  ok(driftSeen,"çevrimdışı vekil yaşlanma sayacı işledi (drift)");
  for(let i=0;i<18 && !aDead;i++){
    turn++;
    B.send({t:"intent",intent:{k:"assassinate",on:"pA"}});
    B.send({t:"ready",ready:true});
    const tk=await waitFor(B,m=>m.t==="tick"&&m.turn===turn,8000);
    if(!tk) break;
    const a=tk.snapshot.players.find(p=>p.id==="pA");
    if(a&&a.dead) aDead=true;
  }
  ok(aDead,"çevrimdışı vekil suikastla öldürülebildi (sunucu dead set etti)");

  // Dönüş: A tekrar girer → saved geri gelir + sunucu hanesi ölü
  const A2=mk();await A2.open();A2.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pA",{name:"Alp"})});
  const w=await waitFor(A2,m=>m.t==="welcome");
  ok(w&&w.saved===BLOB,"dönüşte yedek karakter geri geldi");
  const meP=w&&w.snapshot.players.find(p=>p.id==="pA");
  ok(meP&&meP.dead===true,"sunucu A'yı ÖLÜ hatırlıyor → dönüşte vâris akışı tetiklenir");

  console.log(`\nSONUÇ: ${PASS} geçti, ${FAIL} başarısız`);
  B.send({t:"leave"});A2.send({t:"leave"});B.ws.close();A2.ws.close();process.exit(FAIL?1:0);
})().catch(e=>{console.log("İSTİSNA:",e.message);process.exit(2);});
setTimeout(()=>{console.log("ZAMANAŞIMI");process.exit(3);},60000);
