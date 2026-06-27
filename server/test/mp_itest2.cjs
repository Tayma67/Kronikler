// Faz 1 canlı test: kalıcılık (saveState→rejoin→saved) + seyahat guard.
const BASE = process.env.MP_URL || "wss://kronikler-mp.tayma.workers.dev";
const REALM="QP"+Math.floor(Math.random()*1e6).toString(36).toUpperCase().slice(0,4);
let PASS=0,FAIL=0; const ok=(c,m)=>{c?(PASS++,console.log("  ✓ "+m)):(FAIL++,console.log("  ✗ HATA: "+m));};
function mk(){const ws=new WebSocket(BASE+"/realm/"+REALM);const msgs=[];const st={ws,msgs,welcomes:[]};
  ws.onmessage=e=>{const m=JSON.parse(String(e.data));msgs.push(m);if(m.t==="welcome")st.welcomes.push(m);};
  st.send=o=>ws.send(JSON.stringify(o));st.open=()=>new Promise(r=>{if(ws.readyState===1)return r();ws.onopen=()=>r();});return st;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(st,pred,ms=9000){const t0=Date.now();while(Date.now()-t0<ms){const h=st.msgs.filter(pred);if(h.length)return h[h.length-1];await sleep(120);}return null;}
function pub(id,o){o=o||{};return{id,name:o.name||id,surname:"T",gender:"erkek",age:o.age||40,generation:1,profession:"asker",fame:o.fame||70,power:o.power||150,crowned:false,guildId:null,provinceName:null,beylikId:null,honor:0,traveling:false,online:true,ready:false,dead:false};}
(async()=>{
  console.log("Diyar:",REALM);
  // 1) KALICILIK
  const A=mk();await A.open();A.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pA",{name:"Alp"})});
  const w1=await waitFor(A,m=>m.t==="welcome");ok(w1,"A welcome aldı");
  ok(w1&&(w1.saved===null||w1.saved===undefined),"ilk girişte saved boş");
  const BLOB=JSON.stringify({player:{name:"Alp",age:41,money:9999,marker:"KALICI-TEST"},turn:7});
  A.send({t:"saveState",blob:BLOB});
  await sleep(600);
  A.send({t:"leave"});A.ws.close();
  await sleep(800);
  const A2=mk();await A2.open();A2.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pA",{name:"Alp"})});
  const w2=await waitFor(A2,m=>m.t==="welcome");
  ok(w2&&w2.saved===BLOB,"tekrar girişte AYNI karakter geri geldi (saved blob eşleşti)");

  // 2) SEYAHAT GUARD
  const B=mk();await B.open();B.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pB",{name:"Bora"})});
  await waitFor(B,m=>m.t==="welcome");
  A2.send({t:"sync",player:pub("pA",{name:"Alp"})});B.send({t:"sync",player:pub("pB",{name:"Bora"})});
  await sleep(300);
  // A seyahate çıkar
  A2.send({t:"setTravel",traveling:true});
  const pres=await waitFor(B,m=>m.t==="presence"&&m.players.find(p=>p.id==="pA"&&p.traveling));
  ok(pres,"A 'traveling' durumu B'ye yansıdı");
  // B, seyahatteki A'ya suikast + düello dener
  B.send({t:"intent",intent:{k:"assassinate",on:"pA"}});
  B.send({t:"intent",intent:{k:"duel",to:"pA"}});
  A2.send({t:"ready",ready:true});B.send({t:"ready",ready:true});
  const tick=await waitFor(B,m=>m.t==="tick",10000);
  ok(tick,"tick gerçekleşti");
  const bRes=tick&&tick.results.find(r=>r.playerId==="pB");
  ok(bRes&&bRes.events.some(e=>e.k==="mp.soc.targetTraveling"),"B 'targetTraveling' aldı (kişisel eylem engellendi)");
  const aAfter=tick&&tick.snapshot.players.find(p=>p.id==="pA");
  ok(aAfter&&!aAfter.dead,"seyahatteki A öldürülemedi (dead=false)");
  console.log(`\nSONUÇ: ${PASS} geçti, ${FAIL} başarısız`);
  A2.send({t:"leave"});B.send({t:"leave"});A2.ws.close();B.ws.close();process.exit(FAIL?1:0);
})().catch(e=>{console.log("İSTİSNA:",e.message);process.exit(2);});
setTimeout(()=>{console.log("ZAMANAŞIMI");process.exit(3);},45000);
