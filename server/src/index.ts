// Cloudflare Worker girişi — /realm/:id isteğini ilgili Durable Object'e yönlendirir.
// Her diyar (oda) = idFromName(realmId) ile tek bir RealmDO örneği (otoriteli durum).
import { RealmDO } from "./realm";

export { RealmDO };

interface Env { REALM: DurableObjectNamespace }

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    // sağlık kontrolü
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("Kronikler MP sunucusu çalışıyor.", { headers: { "content-type": "text/plain; charset=utf-8" } });
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
