// DirectoryDO — TEK küresel örnek (idFromName("global")). Açık diyarların hafif
// dizinini tutar: realmId → {ad, oyuncu sayısı, son rapor zamanı}. Diyarlar (RealmDO)
// katılım/tick'te buraya rapor verir; lobi GET /list ile açık odaları çeker.
// Kod paylaşmadan "tıkla-katıl" deneyimi sağlar.
interface Room { name: string; count: number; ts: number }
const TTL = 10 * 60 * 1000; // 10 dk rapor vermeyen oda listeden düşer

export class DirectoryDO {
  state: DurableObjectState;
  constructor(state: DurableObjectState) { this.state = state; }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const rooms = (await this.state.storage.get<Record<string, Room>>("rooms")) || {};
    const now = Date.now();

    if (req.method === "POST" && url.pathname.endsWith("/report")) {
      try {
        const { realmId, name, count } = (await req.json()) as { realmId: string; name: string; count: number };
        if (realmId) {
          if (count > 0) rooms[realmId] = { name: name || realmId, count, ts: now };
          else delete rooms[realmId]; // boşalan oda hemen düşer
          // fırsatçı budama: bayat odaları temizle
          for (const k of Object.keys(rooms)) if (now - rooms[k].ts > TTL) delete rooms[k];
          await this.state.storage.put("rooms", rooms);
        }
      } catch {}
      return new Response("ok");
    }

    // GET /list → açık (taze + dolu) diyarlar, çoğa göre sıralı
    const list = Object.entries(rooms)
      .filter(([, r]) => now - r.ts < TTL && r.count > 0)
      .map(([id, r]) => ({ realmId: id, name: r.name, count: r.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
    return new Response(JSON.stringify({ realms: list }), { headers: { "content-type": "application/json" } });
  }
}
