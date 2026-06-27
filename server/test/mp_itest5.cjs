// Kapsam genişletme: ittifak el-sıkışma + ihanet (pakt-bozma) + beylik seferi-ilhak.
const BASE = process.env.MP_URL || "wss://kronikler-mp.tayma.workers.dev";
const REALM="QX"+Math.floor(Math.random()*1e6).toString(36).toUpperCase().slice(0,4);
let PASS=0,FAIL=0; const ok=(c,m)=>{c?(PASS++,console.log("  ✓ "+m)):(FAIL++,console.log("  ✗ HATA: "+m));};
function mk(){const ws=new WebSocket(BASE+"/realm/"+REALM);const msgs=[];const st={ws,msgs};
  ws.onmessage=e=>{const m=JSON.parse(String(e.data));msgs.push(m);if(m.t==="tick")st.tick=m;if(m.t==="welcome")st.w=m;};
  st.send=o=>ws.send(JSON.stringify(o));st.open=()=>new Promise(r=>{if(ws.readyState===1)return r();ws.onopen=()=>r();});return st;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(st,pred,ms=9000){const t0=Date.now();while(Date.now()-t0<ms){const h=st.msgs.filter(pred);if(h.length)return h[h.length-1];await sleep(120);}return null;}
function pub(id,o){o=o||{};return{id,name:o.name||id,surname:"T",gender:"erkek",age:40,generation:1,profession:"asker",fame:70,power:o.power||150,crowned:false,guildId:null,provinceName:null,beylikId:null,honor:0,traveling:false,online:true,ready:false,dead:false};}
const bondOf=(snap,a,b)=>{const[x,y]=a<b?[a,b]:[b,a];return (snap.bonds||[]).find(d=>d.a===x&&d.b===y);};
async function tickBoth(A,B,n){A.send({t:"ready",ready:true});B.send({t:"ready",ready:true});return waitFor(A,m=>m.t==="tick"&&m.turn===n,10000);}
(async()=>{
  console.log("Diyar:",REALM);
  const A=mk();await A.open();A.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pA",{name:"Alp",power:200})});await waitFor(A,m=>m.t==="welcome");
  const B=mk();await B.open();B.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pB",{name:"Bora",power:90})});await waitFor(B,m=>m.t==="welcome");
  A.send({t:"sync",player:pub("pA",{name:"Alp",power:200})});B.send({t:"sync",player:pub("pB",{name:"Bora",power:90})});await sleep(300);

  // 1) İTTİFAK el-sıkışma
  A.send({t:"intent",intent:{k:"proposeAlliance",to:"pB"}});
  let tk=await tickBoth(A,B,1);
  const offer=tk&&(tk.snapshot.offers||[]).find(o=>o.from==="pA"&&o.to==="pB"&&o.kind==="alliance");
  ok(offer,"ittifak teklifi B'ye düştü (offer)");
  B.send({t:"intent",intent:{k:"respondOffer",offerId:offer.id,accept:true}});
  tk=await tickBoth(A,B,2);
  let bond=tk&&bondOf(tk.snapshot,"pA","pB");
  ok(bond&&bond.pact==="alliance","ittifak kuruldu (pact=alliance, standing="+(bond&&bond.standing)+")");

  // 2) İHANET — pakt boz
  const honBefore=tk.snapshot.players.find(p=>p.id==="pA").honor;
  A.send({t:"intent",intent:{k:"breakPact",with:"pB"}});
  tk=await tickBoth(A,B,3);
  bond=tk&&bondOf(tk.snapshot,"pA","pB");
  const honAfter=tk.snapshot.players.find(p=>p.id==="pA").honor;
  ok(bond&&bond.pact==="war","ihanet: pakt savaşa döndü (pact=war)");
  ok(honAfter<honBefore,"ihanet şerefi düşürdü ("+honBefore+"→"+honAfter+")");
  const bRes=tk.results.find(r=>r.playerId==="pB");
  ok(bRes&&bRes.events.some(e=>e.k==="mp.soc.betrayed"),"B 'betrayed' olayı aldı");

  // 3) BEYLİK seferi-ilhak: A güçlü bey, B zayıf bey → A, B'nin beyliğine sefer
  A.send({t:"intent",intent:{k:"claimBey",beylikId:"demirhan"}});
  B.send({t:"intent",intent:{k:"claimBey",beylikId:"karahisar"}});
  tk=await tickBoth(A,B,4);
  const dem=tk.snapshot.beyliks.find(b=>b.id==="demirhan"), kar=tk.snapshot.beyliks.find(b=>b.id==="karahisar");
  ok(dem.beyId==="pA"&&kar.beyId==="pB","iki oyuncu bey oldu (A:demirhan, B:karahisar)");
  // birkaç sefer dene (olasılık); ilhak olursa karahisar.beyId=pA olur
  let annexed=false;
  for(let i=5;i<=9 && !annexed;i++){
    A.send({t:"intent",intent:{k:"beylikCampaign",target:"karahisar"}});
    tk=await tickBoth(A,B,i);
    const k=tk.snapshot.beyliks.find(b=>b.id==="karahisar");
    const aRes=tk.results.find(r=>r.playerId==="pA");
    if(aRes&&aRes.events.some(e=>e.k==="mp.beylik.campaignWon")){annexed=true;}
    if(k.beyId==="pA")annexed=true;
  }
  ok(annexed,"beylik seferi çözüldü ve ilhak gerçekleşti (A karahisar'ı aldı)");

  console.log(`\nSONUÇ: ${PASS} geçti, ${FAIL} başarısız`);
  A.send({t:"leave"});B.send({t:"leave"});A.ws.close();B.ws.close();process.exit(FAIL?1:0);
})().catch(e=>{console.log("İSTİSNA:",e.message);process.exit(2);});
setTimeout(()=>{console.log("ZAMANAŞIMI");process.exit(3);},60000);
