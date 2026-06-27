// Lonca (bey-olmayan güç) testi: liderlik çekişmesi + destekçilik + aidat geliri.
const BASE="wss://kronikler-mp.tayma.workers.dev";
const REALM="QG"+Math.floor(Math.random()*1e6).toString(36).toUpperCase().slice(0,4);
let PASS=0,FAIL=0; const ok=(c,m)=>{c?(PASS++,console.log("  ✓ "+m)):(FAIL++,console.log("  ✗ HATA: "+m));};
function mk(){const ws=new WebSocket(BASE+"/realm/"+REALM);const msgs=[];const st={ws,msgs};
  ws.onmessage=e=>{const m=JSON.parse(String(e.data));msgs.push(m);};
  st.send=o=>ws.send(JSON.stringify(o));st.open=()=>new Promise(r=>{if(ws.readyState===1)return r();ws.onopen=()=>r();});return st;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wf(st,pred,ms=9000){const t0=Date.now();while(Date.now()-t0<ms){const h=st.msgs.filter(pred);if(h.length)return h[h.length-1];await sleep(120);}return null;}
function pub(id,pow,guild){return{id,name:id,surname:"T",gender:"erkek",age:35,generation:1,profession:"tüccar",fame:50,power:pow,crowned:false,guildId:guild,provinceName:null,beylikId:null,honor:0,traveling:false,married:false,online:true,ready:false,dead:false};}
const G="tuccar";
(async()=>{
  console.log("Diyar:",REALM);
  const A=mk(),B=mk(); await A.open(); A.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pA",80,G)});await wf(A,m=>m.t==="welcome");
  await B.open(); B.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pB",150,G)});await wf(B,m=>m.t==="welcome");
  A.send({t:"sync",player:pub("pA",80,G)});B.send({t:"sync",player:pub("pB",150,G)});await sleep(300);
  let turn=0; const tickBoth=async()=>{turn++;A.send({t:"ready",ready:true});B.send({t:"ready",ready:true});return await wf(A,m=>m.t==="tick"&&m.turn===turn,9000);};

  // 1) A lider olur (tek iddiacı)
  A.send({t:"intent",intent:{k:"claimGuildLead",guildId:G}});
  let tk=await tickBoth();
  let g=tk&&tk.snapshot.guilds.find(x=>x.id===G);
  ok(g&&g.leaderId==="pA","A loncanın başına geçti (lider)");
  ok(g&&g.leaderName==="pA","lider adı kaydedildi");

  // 2) A aidat + destekçilik
  A.send({t:"intent",intent:{k:"setGuildTax",guildId:G,tax:20}});
  A.send({t:"intent",intent:{k:"setGuildBacking",guildId:G,beylikId:"demirhan"}});
  tk=await tickBoth();
  g=tk&&tk.snapshot.guilds.find(x=>x.id===G);
  ok(g&&g.tax===20,"başkan aidatı belirledi");
  ok(g&&g.backing==="demirhan","lonca bir beyliğe destekçi oldu (kingmaker)");

  // 3) aylık aidat: B öder, A toplar
  tk=await tickBoth();
  const aInc=tk&&tk.results.find(r=>r.playerId==="pA");
  const bPay=tk&&tk.results.find(r=>r.playerId==="pB");
  ok(aInc&&aInc.events.some(e=>e.k==="mp.guild.duesIncome"),"başkan A aidat geliri aldı");
  ok(bPay&&bPay.events.some(e=>e.k==="mp.guild.duesPaid"),"üye B aidat ödedi");

  // 4) B (daha güçlü) liderliği devirir
  B.send({t:"intent",intent:{k:"claimGuildLead",guildId:G}});
  tk=await tickBoth();
  g=tk&&tk.snapshot.guilds.find(x=>x.id===G);
  ok(g&&g.leaderId==="pB","daha güçlü üye B başkanlığı DEVİRDİ (çekişmeli liderlik)");

  console.log("\nSONUÇ: "+PASS+" geçti, "+FAIL+" başarısız");
  A.send({t:"leave"});B.send({t:"leave"});A.ws.close();B.ws.close();process.exit(FAIL?1:0);
})().catch(e=>{console.log("İSTİSNA:",e.message);process.exit(2);});
setTimeout(()=>{console.log("ZAMANAŞIMI");process.exit(3);},55000);
