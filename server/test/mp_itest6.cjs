// Açık Diyar Dizini canlı testi: katıl → /realms'de görün → ayrıl → listeden düş.
const BASE = process.env.MP_URL || "wss://kronikler-mp.tayma.workers.dev";
const HTTP = BASE.replace(/^wss:/i,"https:").replace(/^ws:/i,"http:").replace(/\/$/,"");
const REALM="QD"+Math.floor(Math.random()*1e6).toString(36).toUpperCase().slice(0,4);
let PASS=0,FAIL=0; const ok=(c,m)=>{c?(PASS++,console.log("  ✓ "+m)):(FAIL++,console.log("  ✗ HATA: "+m));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function pub(id){return{id,name:id,surname:"T",gender:"erkek",age:40,generation:1,profession:"asker",fame:50,power:100,crowned:false,guildId:null,provinceName:null,beylikId:null,honor:0,traveling:false,online:true,ready:false,dead:false};}
async function realms(){ const r=await fetch(HTTP+"/realms"); return (await r.json()).realms||[]; }
(async()=>{
  console.log("Diyar:",REALM,"HTTP:",HTTP);
  // /realms erişilebilir mi
  let list; try{ list=await realms(); ok(Array.isArray(list),"/realms JSON döndü (dizin canlı)"); }catch(e){ ok(false,"/realms erişilemedi: "+e.message); console.log("SONUÇ: "+PASS+" geçti, "+FAIL+" başarısız"); process.exit(1); }
  // katıl
  const ws=new WebSocket(BASE+"/realm/"+REALM); await new Promise(r=>{ws.onopen=()=>r();});
  let welcomed=false; ws.onmessage=e=>{const m=JSON.parse(String(e.data)); if(m.t==="welcome")welcomed=true;};
  ws.send(JSON.stringify({t:"join",realmId:REALM,realmName:"Test-"+REALM,player:pub("pA")}));
  for(let i=0;i<40&&!welcomed;i++)await sleep(120);
  await sleep(800); // rapor işlensin
  list=await realms();
  ok(list.some(r=>r.realmId===REALM&&r.count>=1),"katılınca diyar /realms'de göründü (count≥1)");
  // ayrıl
  ws.send(JSON.stringify({t:"leave"})); await sleep(300); ws.close();
  await sleep(1200);
  list=await realms();
  ok(!list.some(r=>r.realmId===REALM), "ayrılınca diyar listeden düştü");
  console.log("SONUÇ: "+PASS+" geçti, "+FAIL+" başarısız");
  process.exit(FAIL?1:0);
})().catch(e=>{console.log("İSTİSNA:",e.message);process.exit(2);});
setTimeout(()=>{console.log("ZAMANAŞIMI");process.exit(3);},40000);
