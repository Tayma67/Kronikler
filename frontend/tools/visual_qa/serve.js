// SPA fallback'li basit statik sunucu — frontend/build'i servis eder.
// Tüm route'lar (ör. /oyun/ticaret) index.html'e düşer ki React Router çalışsın.
//   node frontend/tools/visual_qa/serve.js [port] [buildDir]
const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.argv[2] || 8079;
const root = process.argv[3] || path.resolve(__dirname, "../../build");
const types = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2",
};

http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  try {
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, "index.html");
  } catch (e) {
    f = path.join(root, "index.html");
  }
  res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log(`visual-qa SPA: http://localhost:${port}`));
