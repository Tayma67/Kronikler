// Eski kayıt göç bekçisi: donmuş v1 fikstürü her build'de migrate()'ten geçirip 50 tur koşar.
// Amaç: gelecekteki şema değişiklikleri eski kayıtları kırarsa smoke'tan ÖNCE burada yakalansın.
const g = require("/tmp/kronikler-game-bundle.cjs");
const fs = require("fs");
const path = require("path");
const raw = fs.readFileSync(path.join(__dirname, "eski-kayit-v1.json"), "utf8");
let s = g.migrate(JSON.parse(raw));
if (s.schema !== 1) { console.error("GÖÇ DAMGASI YOK"); process.exit(1); }
if (!Array.isArray(s.player.properties) || typeof s.player.properties[0] === "string") { console.error("PROPERTIES GÖÇMEDİ"); process.exit(1); }
let guard = 0;
try {
  while (!s.player.dead && guard++ < 50) {
    if (s.player.hunger < 35) s = g.eat(s);
    if (s.player.profession !== "işsiz" && s.player.hunger >= 30) s = g.work(s);
    s = g.advance(s);
  }
} catch (e) {
  console.error("ESKİ KAYIT ÇÖKTÜ (tur " + guard + "):", e.message);
  process.exit(1);
}
console.log("ESKİ KAYIT GÖÇÜ OK · " + guard + " tur, yaş " + s.player.age + (s.player.dead ? " (vefat — sorunsuz)" : ""));
