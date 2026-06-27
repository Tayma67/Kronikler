// Pakt koruması testi: müttefike saldırı engellenir; paktı bozunca saldırı açılır.
const BASE="wss://kronikler-mp.tayma.workers.dev";
const REALM="QP"+Math.floor(Math.random()*1e6).toString(36).toUpperCase().slice(0,4);
let PASS=0,FAIL=0; const ok=(c,m)=>{c?(PASS++,console.log("  ✓ "+m)):(FAIL++,console.log("  ✗ HATA: "+m));};
function mk(){const ws=new WebSocket(BASE+"/realm/"+REALM);const msgs=[];const st={ws,msgs};
  ws.onmessage=e=>{const m=JSON.parse(String(e.data));msgs.push(m);};
  st.send=o=>ws.send(JSON.stringify(o));st.open=()=>new Promise(r=>{if(ws.readyState===1)return r();ws.onopen=()=>r();});return st;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wf(st,pred,ms=9000){const t0=Date.now();while(Date.now()-t0<ms){const h=st.msgs.filter(pred);if(h.length)return h[h.length-1];await sleep(120);}return null;}
function pub(id,pow){return{id,name:id,surname:"T",gender:"erkek",age:35,generation:1,profession:"asker",fame:40,power:pow,crowned:false,guildId:null,provinceName:null,beylikId:null,honor:0,traveling:false,married:false,online:true,ready:false,dead:false};}
(async()=>{
  console.log("Diyar:",REALM);
  const A=mk(),B=mk(); await A.open(); A.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pA",120)});await wf(A,m=>m.t==="welcome");
  await B.open(); B.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pB",10)});await wf(B,m=>m.t==="welcome");
  A.send({t:"sync",player:pub("pA",120)});B.send({t:"sync",player:pub("pB",10)});await sleep(300);
  let turn=0; const tick=async()=>{turn++;A.send({t:"ready",ready:true});B.send({t:"ready",ready:true});return await wf(A,m=>m.t==="tick"&&m.turn===turn,9000);};
  // ittifak kur
  A.send({t:"intent",intent:{k:"proposeAlliance",to:"pB"}}); let tk=await tick();
  const off=tk&&tk.snapshot.offers.find(o=>o.kind==="alliance");
  if(off) B.send({t:"intent",intent:{k:"respondOffer",offerId:off.id,accept:true}}); tk=await tick();
  let bond=tk&&tk.snapshot.bonds.find(x=>x.pact==="alliance");
  ok(bond,"ittifak paktı kuruldu");
  // müttefike suikast + düello → engellenmeli
  A.send({t:"intent",intent:{k:"assassinate",on:"pB"}});A.send({t:"intent",intent:{k:"duel",to:"pB"}}); tk=await tick();
  let aRes=tk&&tk.results.find(r=>r.playerId==="pA");
  ok(aRes&&aRes.events.some(e=>e.k==="mp.soc.pactProtected"),"müttefike saldırı ENGELLENDİ (pactProtected)");
  let b=tk&&tk.snapshot.players.find(p=>p.id==="pB"); ok(b&&!b.dead,"müttefik B zarar görmedi (hayatta)");
  // paktı boz → savaş
  A.send({t:"intent",intent:{k:"breakPact",with:"pB"}}); tk=await tick();
  bond=tk&&tk.snapshot.bonds.find(x=>(x.a==="pA"||x.b==="pA")&&(x.a==="pB"||x.b==="pB"));
  ok(bond&&bond.pact==="war","paktı bozunca savaş (war) ilan edildi");
  // artık düello açılır
  A.send({t:"intent",intent:{k:"duel",to:"pB"}}); tk=await tick();
  aRes=tk&&tk.results.find(r=>r.playerId==="pA");
  ok(aRes&&aRes.events.some(e=>e.k==="mp.soc.duelWon"||e.k==="mp.soc.duelLost"),"pakt bozulunca saldırı AÇILDI (düello çözüldü)");
  console.log("\nSONUÇ: "+PASS+" geçti, "+FAIL+" başarısız");
  A.send({t:"leave"});B.send({t:"leave"});A.ws.close();B.ws.close();process.exit(FAIL?1:0);
})().catch(e=>{console.log("İSTİSNA:",e.message);process.exit(2);});
setTimeout(()=>{console.log("ZAMANAŞIMI");process.exit(3);},55000);
