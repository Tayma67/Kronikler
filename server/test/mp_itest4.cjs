// Paylaşımlı NPC dünyası canlı testi: aynı kütük + court/turn ilişki.
const BASE = process.env.MP_URL || "wss://kronikler-mp.tayma.workers.dev";
const REALM="QN"+Math.floor(Math.random()*1e6).toString(36).toUpperCase().slice(0,4);
let PASS=0,FAIL=0; const ok=(c,m)=>{c?(PASS++,console.log("  ✓ "+m)):(FAIL++,console.log("  ✗ HATA: "+m));};
function mk(){const ws=new WebSocket(BASE+"/realm/"+REALM);const msgs=[];const st={ws,msgs};
  ws.onmessage=e=>{const m=JSON.parse(String(e.data));msgs.push(m);if(m.t==="welcome")st.w=m;if(m.t==="tick")st.tick=m;};
  st.send=o=>ws.send(JSON.stringify(o));st.open=()=>new Promise(r=>{if(ws.readyState===1)return r();ws.onopen=()=>r();});return st;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(st,pred,ms=9000){const t0=Date.now();while(Date.now()-t0<ms){const h=st.msgs.filter(pred);if(h.length)return h[h.length-1];await sleep(120);}return null;}
function pub(id,o){o=o||{};return{id,name:o.name||id,surname:"T",gender:"erkek",age:40,generation:1,profession:"asker",fame:50,power:120,crowned:false,guildId:null,provinceName:null,beylikId:null,honor:0,traveling:false,online:true,ready:false,dead:false};}
(async()=>{
  console.log("Diyar:",REALM);
  const A=mk();await A.open();A.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pA",{name:"Alp"})});
  const wA=await waitFor(A,m=>m.t==="welcome");
  const B=mk();await B.open();B.send({t:"join",realmId:REALM,realmName:REALM,player:pub("pB",{name:"Bora"})});
  const wB=await waitFor(B,m=>m.t==="welcome");
  const na=wA.snapshot.npcs, nb=wB.snapshot.npcs;
  ok(na&&na.length>=10,"NPC kütüğü üretildi ("+(na?na.length:0)+" ileri gelen)");
  ok(na&&nb&&JSON.stringify(na)===JSON.stringify(nb),"A ve B AYNI NPC kütüğünü görüyor (paylaşımlı dünya)");
  A.send({t:"sync",player:pub("pA",{name:"Alp"})});B.send({t:"sync",player:pub("pB",{name:"Bora"})});await sleep(300);
  const npc0=na[0].id;
  // A, npc0'ı yanına çeker
  A.send({t:"intent",intent:{k:"courtNpc",npcId:npc0}});
  A.send({t:"ready",ready:true});B.send({t:"ready",ready:true});
  let tk=await waitFor(A,m=>m.t==="tick"&&m.turn===1,9000);
  let bond=tk&&(tk.snapshot.npcBonds||[]).find(b=>b.npc===npc0&&b.player==="pA");
  ok(bond&&bond.standing>0,"court: A↔npc0 yakınlığı arttı (standing="+(bond&&bond.standing)+")");
  // A, npc0'ı B'ye karşı kışkırtır
  A.send({t:"intent",intent:{k:"turnNpc",npcId:npc0,against:"pB"}});
  A.send({t:"ready",ready:true});B.send({t:"ready",ready:true});
  tk=await waitFor(A,m=>m.t==="tick"&&m.turn===2,9000);
  const bondB=tk&&(tk.snapshot.npcBonds||[]).find(b=>b.npc===npc0&&b.player==="pB");
  ok(bondB&&bondB.standing<0,"turn: npc0, B'ye karşı kışkırtıldı (B standing="+(bondB&&bondB.standing)+")");
  const aRes=tk&&tk.results.find(r=>r.playerId==="pA");
  ok(aRes&&aRes.events.some(e=>e.k==="mp.npc.turned"),"A 'npc.turned' olayı aldı");
  console.log(`\nSONUÇ: ${PASS} geçti, ${FAIL} başarısız`);
  A.send({t:"leave"});B.send({t:"leave"});A.ws.close();B.ws.close();process.exit(FAIL?1:0);
})().catch(e=>{console.log("İSTİSNA:",e.message);process.exit(2);});
setTimeout(()=>{console.log("ZAMANAŞIMI");process.exit(3);},45000);
