// Gerçek evlilik testi (kararlı 2-oyunculu desen): karşı cinsiyet evlenir; aynı cinsiyet reddedilir.
const BASE="wss://kronikler-mp.tayma.workers.dev";
let PASS=0,FAIL=0; const ok=(c,m)=>{c?(PASS++,console.log("  ✓ "+m)):(FAIL++,console.log("  ✗ HATA: "+m));};
function mk(realm){const ws=new WebSocket(BASE+"/realm/"+realm);const msgs=[];const st={ws,msgs};
  ws.onmessage=e=>{const m=JSON.parse(String(e.data));msgs.push(m);};
  st.send=o=>ws.send(JSON.stringify(o));st.open=()=>new Promise(r=>{if(ws.readyState===1)return r();ws.onopen=()=>r();});return st;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wf(st,pred,ms=9000){const t0=Date.now();while(Date.now()-t0<ms){const h=st.msgs.filter(pred);if(h.length)return h[h.length-1];await sleep(120);}return null;}
function pub(id,g){return{id,name:id,surname:"T",gender:g,age:30,generation:1,profession:"asker",fame:40,power:60,crowned:false,guildId:null,provinceName:null,beylikId:null,honor:0,traveling:false,married:false,online:true,ready:false,dead:false};}
async function wedTrial(realm,gA,gB){
  const A=mk(realm),B=mk(realm); await A.open();
  A.send({t:"join",realmId:realm,realmName:realm,player:pub("pA",gA)});await wf(A,m=>m.t==="welcome");
  await B.open(); B.send({t:"join",realmId:realm,realmName:realm,player:pub("pB",gB)});await wf(B,m=>m.t==="welcome");
  A.send({t:"sync",player:pub("pA",gA)});B.send({t:"sync",player:pub("pB",gB)});await sleep(300);
  A.send({t:"intent",intent:{k:"proposeMarriage",to:"pB"}});A.send({t:"ready",ready:true});B.send({t:"ready",ready:true});
  let tk=await wf(A,m=>m.t==="tick"&&m.turn===1); const off=tk&&tk.snapshot.offers.find(o=>o.kind==="marriage");
  if(off){ B.send({t:"intent",intent:{k:"respondOffer",offerId:off.id,accept:true}});A.send({t:"ready",ready:true});B.send({t:"ready",ready:true}); tk=await wf(B,m=>m.t==="tick"&&m.turn===2); }
  const res={off,tk}; A.send({t:"leave"});B.send({t:"leave"});A.ws.close();B.ws.close(); return res;
}
const R=()=>Math.floor(Math.random()*1e6).toString(36).toUpperCase().slice(0,5);
(async()=>{
  const r1=await wedTrial("QW"+R(),"erkek","kadın");
  ok(r1.off,"evlilik teklifi oluştu");
  const a=r1.tk&&r1.tk.snapshot.players.find(p=>p.id==="pA"), b=r1.tk&&r1.tk.snapshot.players.find(p=>p.id==="pB");
  ok(a&&a.married&&b&&b.married,"karşı cinsiyet çift EVLENDİ (ikisi de married)");
  ok(r1.tk&&r1.tk.results.some(x=>x.events.some(e=>e.k==="mp.soc.wed")),"'wed' olayı geldi (gerçek eş kuruldu)");
  ok(r1.tk&&r1.tk.snapshot.bonds.some(x=>x.pact==="marriage"),"evlilik paktı kuruldu");
  const r2=await wedTrial("QW"+R(),"erkek","erkek");
  const a2=r2.tk&&r2.tk.snapshot.players.find(p=>p.id==="pA"), b2=r2.tk&&r2.tk.snapshot.players.find(p=>p.id==="pB");
  ok(a2&&!a2.married&&b2&&!b2.married,"aynı cinsiyet evlilik REDDEDİLDİ (ikisi de bekâr)");
  ok(r2.tk&&r2.tk.results.some(x=>x.events.some(e=>e.k==="mp.soc.wedSameGender")),"'wedSameGender' bildirimi geldi");
  console.log("\nSONUÇ: "+PASS+" geçti, "+FAIL+" başarısız");
  process.exit(FAIL?1:0);
})().catch(e=>{console.log("İSTİSNA:",e.message);process.exit(2);});
setTimeout(()=>{console.log("ZAMANAŞIMI");process.exit(3);},50000);
