// Cloudflare Worker girişi — /realm/:id isteğini ilgili Durable Object'e yönlendirir.
// Her diyar (oda) = idFromName(realmId) ile tek bir RealmDO örneği (otoriteli durum).
// /realms → açık diyar dizini (DirectoryDO, tek küresel örnek).
import { RealmDO } from "./realm";
import { DirectoryDO } from "./directory";

export { RealmDO, DirectoryDO };

interface Env { REALM: DurableObjectNamespace; DIRECTORY: DurableObjectNamespace }

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    // sağlık kontrolü
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("Kronikler MP sunucusu çalışıyor.", { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    // /realms → açık diyar listesi (kod paylaşmadan tıkla-katıl)
    if (url.pathname === "/realms") {
      const dir = env.DIRECTORY.get(env.DIRECTORY.idFromName("global"));
      const res = await dir.fetch("https://d/list");
      return new Response(await res.text(), { headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
    }
    // /realm/:id → o diyarın Durable Object'i
    const m = url.pathname.match(/^\/realm\/([^/]+)/);
    if (m) {
      const realmId = decodeURIComponent(m[1]).toUpperCase().slice(0, 16);
      const id = env.REALM.idFromName(realmId);
      const stub = env.REALM.get(id);
      return stub.fetch(req);
    }
    return new Response("Bulunamadı", { status: 404 });
  },
};
