// ──────────────────────────────────────────────────────────────────────────
// RealmDO — bir diyarın OTORİTELİ durumunu tutan Durable Object.
//
// Sorumluluk: paylaşımlı kurumlar (saat, taht, loncalar, sancaklar, ekonomi) +
// oyuncuların kamu haneleri + tur-senkron tick (çoğunluk-hazır VEYA 5dk alarm) +
// çapraz-oyuncu etkilerinin çözümü. Kişisel hayat simülasyonu (game.ts) istemcide
// koşar; sunucu yalnız paylaşımlı katmanı yönetir ve sonucu yayınlar.
//
// Hibernatable WebSocket API kullanır (boştayken ücretsiz — Cloudflare free tier).
// ──────────────────────────────────────────────────────────────────────────
import {
  RealmSnapshot, PlayerPublic, ClientMsg, ServerMsg, SharedIntent, TickResult, TickEvent,
  GuildState, ProvinceState, BeylikState, ChatScope, BEYLIK_DEFS, BEY_MIN_POWER, BEY_MIN_AGE,
  THRONE_MIN_AGE, THRONE_MIN_POWER, THRONE_MIN_FAME,
  Bond, Offer, PactType, GIFT_MAX, ASSASSINATE_MIN_AGE,
  NpcPublic, NpcBond, RealmNews,
  PROTOCOL_VERSION, MAX_PLAYERS, TICK_TIMEOUT_MS, TICK_SOFT_MS, readyToTick,
  VENTURE_MIN_STAKE, VENTURE_MAX_STAKE, VENTURE_TICKS,
} from "./protocol";

interface Env { REALM: DurableObjectNamespace; DIRECTORY: DurableObjectNamespace }

const GUILD_IDS = ["tuccar", "demirci", "asker", "sifaci", "golge", "ulema", "esnaf"];
// Boş (NPC) beyliklerin taban gücü ve bunları tutan ocaklar (deterministik dağıtım).
const NPC_BEYLIK_POWER = 60;
const NPC_OCAK_BY_BEYLIK: Record<string, string> = {
  demirhan: "demirci", yenisehir: "tuccar", gumushisar: "ulema", aksehir: "esnaf", karahisar: "asker",
};
// Diyar haberi şablonları (kozmetik — oyuna etkisi yok). İstemci i18n ile metne çevirir.
const NEWS_KEYS = ["influence", "feud", "decree", "caravan", "feast", "pilgrim", "rumor", "harvest"];

// ── Paylaşımlı NPC kütüğü: seed'den DETERMİNİSTİK üretim (tüm istemciler aynısını alır) ──
// game.ts'e bağımlı değil; küçük seeded PRNG + ad/rol havuzları. Cloudflare Worker'da çalışır.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const NPC_NAMES = ["Yusuf", "Davud", "Ömer", "Bayram", "Kâzım", "Turgut", "Nedim", "Sinan", "Kerem", "Tahir", "Bedir", "Vefa", "Lütfi", "Sadık", "Cüneyd", "Hızır", "Doğan", "Ünal", "Server", "Necip", "Ayperi", "Gülbahar", "Nurbanu", "Hafsa", "Mihrimah", "Dilşad", "Servinaz", "Ferahnaz"];
const NPC_ROLES = ["vezir", "lonca", "rakip", "tuccar", "alim", "komutan", "kadi"];
// Diyarın ileri gelenleri: her beyliğe ~3 notable (toplam ~15) — etkileşime değer kişiler.
function generateNpcs(seed: number): NpcPublic[] {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const out: NpcPublic[] = []; const used = new Set<number>(); let nid = 0;
  const pickName = () => { let i = Math.floor(rnd() * NPC_NAMES.length); let g = 0; while (used.has(i) && g++ < NPC_NAMES.length) i = (i + 1) % NPC_NAMES.length; used.add(i); return NPC_NAMES[i]; };
  for (const b of BEYLIK_DEFS) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const role = NPC_ROLES[Math.floor(rnd() * NPC_ROLES.length)];
      out.push({ id: "npc_" + (nid++), name: pickName(), role, beylikId: b.id, influence: 20 + Math.floor(rnd() * 41) });
    }
  }
  return out;
}

// 5 beyliği başlangıçta NPC ocakların elinde kur (oyuncu bey olunca devralır).
function defaultBeyliks(): BeylikState[] {
  return BEYLIK_DEFS.map((b) => ({
    id: b.id, name: b.name, beyId: null, beyName: null,
    ocak: NPC_OCAK_BY_BEYLIK[b.id] || null, tax: 10, power: NPC_BEYLIK_POWER, claimedTurn: 0,
  }));
}

export class RealmDO {
  state: DurableObjectState;
  env: Env;
  snap!: RealmSnapshot;
  intents: Record<string, SharedIntent[]> = {}; // playerId → bu ay kuyruğa giren paylaşımlı eylemler
  offerSeq = 0; // teklif kimliği üreteci
  chatTimes: Record<string, number[]> = {}; // sohbet flood koruması (oyuncu → son gönderim zamanları)
  loaded = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state; this.env = env;
  }

  async load(realmId: string, realmName?: string) {
    if (this.loaded) return;
    const stored = await this.state.storage.get<RealmSnapshot>("snap");
    if (stored) {
      this.snap = stored;
      // Eski (v1) diyar göçü: beylik katmanı yoksa kur, oyunculara beylikId ekle.
      if (!this.snap.beyliks) this.snap.beyliks = defaultBeyliks();
      if (!this.snap.bonds) this.snap.bonds = [];
      if (!this.snap.npcs) this.snap.npcs = generateNpcs(this.snap.seed);
      if (!this.snap.npcBonds) this.snap.npcBonds = [];
      this.snap.guilds.forEach((g) => { if (g.leaderName === undefined) g.leaderName = null; if (g.backing === undefined) g.backing = null; });
      if (!this.snap.news) this.snap.news = [];
      if (!this.snap.offers) this.snap.offers = [];
      if (this.snap.venture === undefined) this.snap.venture = null;
      this.snap.players.forEach((p) => { if (p.beylikId === undefined) p.beylikId = null; if (p.honor === undefined) p.honor = 0; if (p.traveling === undefined) p.traveling = false; if (p.married === undefined) p.married = false; });
      this.snap.v = PROTOCOL_VERSION;
    } else {
      const now = Date.now();
      const seedVal = Math.floor(Math.random() * 1e9);
      this.snap = {
        v: PROTOCOL_VERSION, realmId, name: realmName || realmId,
        seed: seedVal, turn: 0, phase: "open",
        tickDeadline: now + TICK_TIMEOUT_MS, players: [],
        throne: { holderId: null, holderName: null, claimedTurn: 0 },
        guilds: GUILD_IDS.map((id) => ({ id, leaderId: null, leaderName: null, tax: 10, closed: false, backing: null } as GuildState)),
        provinces: [], beyliks: defaultBeyliks(), bonds: [],
        npcs: generateNpcs(seedVal), npcBonds: [], news: [], offers: [], venture: null, econ: 1, createdAt: now,
      };
      await this.persist();
    }
    this.loaded = true;
  }

  async persist() { await this.state.storage.put("snap", this.snap); }

  // Açık diyar dizinine rapor ver (kod paylaşmadan tıkla-katıl). Hata yutulur (kritik değil).
  async reportDirectory() {
    try {
      const count = this.snap.players.filter((p) => p.online && !p.dead).length;
      const dir = this.env.DIRECTORY.get(this.env.DIRECTORY.idFromName("global"));
      await dir.fetch("https://d/report", { method: "POST", body: JSON.stringify({ realmId: this.snap.realmId, name: this.snap.name, count }) });
    } catch {}
  }

  // ── WebSocket yükseltme ──
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const realmId = decodeURIComponent(url.pathname.split("/realm/")[1] || "default").slice(0, 16) || "default";
    await this.load(realmId);
    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response(JSON.stringify({ realmId: this.snap.realmId, players: this.snap.players.length, turn: this.snap.turn }), { headers: { "content-type": "application/json" } });
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  // ── Mesaj alımı ──
  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    let m: ClientMsg;
    try { m = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)); } catch { return; }
    const att = (ws.deserializeAttachment() || {}) as { playerId?: string };

    switch (m.t) {
      case "join": {
        const p = m.player; if (!p?.id) return;
        ws.serializeAttachment({ playerId: p.id });
        const existing = this.snap.players.find((x) => x.id === p.id);
        // Yeniden katılımda beylikId + honor + traveling SUNUCU otoritesinde kalmalı (istemci sıfır gönderir) → koru.
        // dead de korunur: yoklukta NPC-vekil öldüyse istemcinin dead:false'ı bunu EZMEMELİ → oyuncu dönünce
        // ölü bulur (welcome snapshot dead:true → istemci vâris akışını tetikler, sonra heir alive olarak sync'ler).
        // Dönüşte: tekrar çevrimiçi, seyahat biter (oyuncu geri döndü).
        // married: sunucuda evlilik paktı varsa (oyuncu-oyuncu düğün) istemcinin bayat married:false'ı ezemez —
        // düğün olayını kaçıran taraf "bekar" dönüp ikinci kez evlenemesin (tek taraflı evlilik desync'i).
        const weddedJ = this.snap.bonds.some((b) => b.pact === "marriage" && (b.a === p.id || b.b === p.id));
        if (existing) { Object.assign(existing, p, { online: true, beylikId: existing.beylikId, honor: existing.honor ?? 0, traveling: false, dead: !!existing.dead || !!p.dead, married: !!p.married || weddedJ }); }
        else {
          if (this.snap.players.filter((x) => x.online).length >= MAX_PLAYERS) { this.sendTo(ws, { t: "error", code: "FULL", msg: "Diyar dolu" }); return; }
          this.snap.players.push({ ...p, online: true, ready: false, beylikId: null, honor: typeof p.honor === "number" ? p.honor : 0, traveling: false, married: !!p.married });
          this.broadcastChatSys(`mp.joined`, p.name);
        }
        // Aynı karaktere devam: bu oyuncunun yedeklenmiş kişisel durumunu geri ver.
        const saved = (await this.state.storage.get<string>("save:" + p.id)) || null;
        await this.persist();
        this.sendTo(ws, { t: "welcome", you: p.id, snapshot: this.snap, saved });
        // Yokluğunda biriken kişisel olayları teslim et (hediye altını, borç düşümü, düğün...).
        {
          const pend = (await this.state.storage.get<Record<string, TickEvent[]>>("pendingEv")) || {};
          if (pend[p.id]?.length) { this.sendTo(ws, { t: "missed", events: pend[p.id] }); delete pend[p.id]; await this.state.storage.put("pendingEv", pend); }
        }
        this.broadcastPresence();
        await this.ensureAlarm();
        await this.reportDirectory();
        break;
      }
      case "sync": {
        const p = this.snap.players.find((x) => x.id === att.playerId);
        // beylikId + honor SUNUCU otoritesindedir (istemcinin game.ts'inde karşılığı yok) → sync ezmez.
        if (p && m.player) {
          const weddedS = this.snap.bonds.some((b) => b.pact === "marriage" && (b.a === p.id || b.b === p.id));
          Object.assign(p, m.player, { id: p.id, online: true, beylikId: p.beylikId, honor: p.honor ?? 0, traveling: p.traveling ?? false, married: !!m.player.married || weddedS });
          // Yerel NPC ile evlendiyse (married→true), bekleyen evlilik tekliflerini düşür:
          // bayat bir teklif kabul edilip çifte evlilik (NPC + oyuncu) doğmasın.
          if (p.married) this.snap.offers = this.snap.offers.filter((o) => o.kind !== "marriage" || (o.from !== p.id && o.to !== p.id));
          await this.persist(); this.broadcastPresence();
        }
        break;
      }
      case "saveState": {
        // Kişisel karakteri sunucuya yedekle (boyut sınırlı). Tekrar girişte welcome ile geri verilir.
        if (att.playerId && typeof m.blob === "string" && m.blob.length < 300000) { await this.state.storage.put("save:" + att.playerId, m.blob); }
        break;
      }
      case "setTravel": {
        const p = this.snap.players.find((x) => x.id === att.playerId);
        if (p) { p.traveling = !!m.traveling; await this.persist(); this.broadcastPresence(); }
        break;
      }
      case "ready": {
        const p = this.snap.players.find((x) => x.id === att.playerId);
        if (p) {
          p.ready = m.ready;
          if (readyToTick(this.snap.players)) { this.broadcastPresence(); await this.tick(); break; }
          // Uyarlanır bekleme: en az bir canlı oyuncu hazırsa 5 dk tavanını 90 sn'ye çek —
          // karşı taraf yine o ay eylem yapabilir ama hazır oyuncu çile çekmez.
          const anyReady = this.snap.players.some((x) => x.online && !x.dead && x.ready);
          if (anyReady && this.snap.phase === "open") {
            const soft = Date.now() + TICK_SOFT_MS;
            if (!this.snap.tickDeadline || this.snap.tickDeadline > soft) { this.snap.tickDeadline = soft; await this.state.storage.setAlarm(soft); }
          }
          this.broadcastPresence();
        }
        break;
      }
      case "intent": {
        if (att.playerId && m.intent) { (this.intents[att.playerId] ||= []).push(m.intent); }
        break;
      }
      case "chat": {
        const p = this.snap.players.find((x) => x.id === att.playerId);
        if (!p || !m.text?.trim()) break;
        // Flood koruması: 8 sn'de en çok 6 mesaj (insan için bol; sel/spam'i keser, herkese yayını korur).
        const nowC = Date.now();
        const recent = (this.chatTimes[p.id] || []).filter((ts) => nowC - ts < 8000);
        if (recent.length >= 6) { this.chatTimes[p.id] = recent; break; }
        recent.push(nowC); this.chatTimes[p.id] = recent;
        const text = m.text.slice(0, 240);
        const scope: ChatScope = m.scope === "whisper" || m.scope === "beylik" ? m.scope : "all";
        const out: ServerMsg = { t: "chat", from: p.id, fromName: p.name, text, at: Date.now(), scope, to: m.to };
        if (scope === "all") {
          // Meclis hafızası: sonradan gelen, son sözleri görür (fısıltı/beylik sızmaz — yalnız genel).
          this.snap.chatLog = [...(this.snap.chatLog || []), { from: p.id, fromName: p.name, text, at: Date.now() }].slice(-12);
          this.broadcast(out);
        } else if (scope === "whisper" && m.to) {
          // yalnız gönderen + hedef görür
          for (const ws2 of this.socketsOf([p.id, m.to])) this.sendTo(ws2, out);
        } else if (scope === "beylik" && p.beylikId) {
          // yalnız aynı beyliktekiler görür (düşmana sızmaz)
          const ids = this.snap.players.filter((x) => x.beylikId === p.beylikId).map((x) => x.id);
          for (const ws2 of this.socketsOf(ids)) this.sendTo(ws2, out);
        }
        break;
      }
      case "leave": { this.markOffline(att.playerId); await this.persist(); this.broadcastPresence(); await this.reportDirectory(); break; }
      case "ping": { this.sendTo(ws, { t: "pong" }); break; }
    }
  }

  async webSocketClose(ws: WebSocket) {
    const att = (ws.deserializeAttachment() || {}) as { playerId?: string };
    this.markOffline(att.playerId);
    await this.persist();
    this.broadcastPresence();
    await this.reportDirectory();
  }
  async webSocketError(ws: WebSocket) { await this.webSocketClose(ws); }

  markOffline(playerId?: string) {
    if (!playerId) return;
    const p = this.snap.players.find((x) => x.id === playerId);
    if (p) { p.online = false; p.ready = false; }
  }

  // ── Alarm: 5 dk dolunca otomatik tick ──
  async ensureAlarm() {
    const cur = await this.state.storage.getAlarm();
    if (cur == null) await this.state.storage.setAlarm(this.snap.tickDeadline);
  }
  async alarm() {
    await this.load(this.snap?.realmId || "default");
    // canlı oyuncu varsa tick; yoksa pencereyi tazele (boş diyar bekler)
    if (this.snap.players.some((p) => p.online && !p.dead)) await this.tick();
    else { this.snap.tickDeadline = Date.now() + TICK_TIMEOUT_MS; await this.persist(); await this.state.storage.setAlarm(this.snap.tickDeadline); }
  }

  // ── TICK: ayı ilerlet, paylaşımlı eylemleri + çapraz etkileri çöz ──
  async tick() {
    this.snap.phase = "ticking";
    const results: Record<string, TickResult> = {};
    const ev = (pid: string, k: string, p?: (string | number)[]) => {
      (results[pid] ||= { playerId: pid, ok: true, events: [] }).events.push({ k, p } as TickEvent);
    };

    // Eylemleri deterministik sırada işle (playerId'ye göre) — çakışmada güç belirleyici.
    // Yalnız YAŞAYAN oyuncuların eylemleri geçerli (ölü taht iddia edemez/lonca yönetemez).
    const isAlive = (pid: string) => { const p = this.snap.players.find((x) => x.id === pid); return !!p && !p.dead; };
    const order = Object.keys(this.intents).filter(isAlive).sort();

    // Boşalan makamlar: ölen hükümdar/lonca başı/vali koltuğu serbest kalır (yeni iddiaya açılır).
    if (this.snap.throne.holderId && !isAlive(this.snap.throne.holderId)) {
      this.snap.throne = { holderId: null, holderName: null, claimedTurn: this.snap.turn };
      this.snap.players.forEach((p) => { p.crowned = false; });
    }
    for (const g of this.snap.guilds) if (g.leaderId && !isAlive(g.leaderId)) g.leaderId = null;
    for (const pr of this.snap.provinces) if (pr.governorId && !isAlive(pr.governorId)) pr.governorId = null;
    // Ölen bey: beylik boşalır (NPC ocağa döner), iddiaya yeniden açılır.
    for (const b of this.snap.beyliks) if (b.beyId && !isAlive(b.beyId)) {
      const heirless = this.snap.players.filter((p) => p.beylikId === b.id && !p.dead);
      b.beyId = null; b.beyName = null; b.power = NPC_BEYLIK_POWER; b.ocak = NPC_OCAK_BY_BEYLIK[b.id] || null;
      heirless.forEach((p) => ev(p.id, "mp.beylik.beyDied", [b.name]));
    }

    // 1) TAHT: boş ya da çekişmeli ise en yüksek güçlü iddiacı kazanır.
    // Meşruiyet şartı (SP throneRequirements ile aynı): yaş + güç + şöhret. Altın istemcide kesilir.
    const throneEligible = (p: PlayerPublic) => !p.dead && p.age >= THRONE_MIN_AGE && p.power >= THRONE_MIN_POWER && p.fame >= THRONE_MIN_FAME;
    const throneClaimers = order.filter((pid) => this.intents[pid].some((i) => i.k === "claimThrone"))
      .filter((pid) => { if ((this.snap.hostages || []).some((h) => h.captive === pid)) { ev(pid, "mp.hostage.chained", []); return false; } return true; }) // zincirde taht istenmez
      .map((pid) => this.snap.players.find((p) => p.id === pid)).filter((p): p is PlayerPublic => !!p && !p.dead);
    throneClaimers.filter((p) => !throneEligible(p)).forEach((p) => ev(p.id, "mp.throne.notEligible"));
    const claimants = throneClaimers.filter(throneEligible);
    if (claimants.length) {
      claimants.sort((a, b) => b.power - a.power);
      const winner = claimants[0];
      const prevHolder = this.snap.throne.holderId;
      if (!this.snap.throne.holderId || this.snap.throne.holderId !== winner.id) {
        // mevcut kral varsa ve iddiacıdan güçlüyse korur
        const holder = this.snap.players.find((p) => p.id === this.snap.throne.holderId);
        if (!holder || winner.power > holder.power) {
          this.snap.players.forEach((p) => { p.crowned = p.id === winner.id; });
          this.snap.throne = { holderId: winner.id, holderName: winner.name, claimedTurn: this.snap.turn };
          ev(winner.id, "mp.throne.won");
          if (prevHolder && prevHolder !== winner.id) ev(prevHolder, "mp.throne.taken", [winner.name]);
          claimants.slice(1).forEach((c) => ev(c.id, "mp.throne.lost"));
        } else { claimants.forEach((c) => ev(c.id, "mp.throne.lost")); }
      }
    }

    // Ölen lonca başkanı boşalır (yeni iddiaya açık).
    for (const g of this.snap.guilds) if (g.leaderId && !isAlive(g.leaderId)) { g.leaderId = null; g.leaderName = null; }

    // 2a) LONCA LİDERLİĞİ — çekişmeli: en GÜÇLÜ üye kazanır (mevcut başkan da yarışır).
    // Bey olmayan güç yolu: mesleğinde yükselen oyuncu loncasının başına geçer.
    const guildClaims: Record<string, string[]> = {};
    for (const pid of order) for (const it of this.intents[pid]) if (it.k === "claimGuildLead") (guildClaims[it.guildId] ||= []).push(pid);
    for (const gid of Object.keys(guildClaims)) {
      const g = this.snap.guilds.find((x) => x.id === gid); if (!g) continue;
      const challengers = guildClaims[gid].map((pid) => this.snap.players.find((p) => p.id === pid)).filter((p): p is PlayerPublic => !!p && !p.dead && (p.guildId === gid));
      if (!challengers.length) { guildClaims[gid].forEach((pid) => ev(pid, "mp.guild.mustJoin", [gid])); continue; }
      const cur = g.leaderId ? this.snap.players.find((p) => p.id === g.leaderId) : null;
      const pool = [...challengers]; if (cur && !pool.some((p) => p.id === cur.id)) pool.push(cur);
      pool.sort((a, b) => b.power - a.power);
      const winner = pool[0];
      if (g.leaderId === winner.id) { ev(winner.id, "mp.guild.held", [gid]); continue; }
      const prev = g.leaderId;
      g.leaderId = winner.id; g.leaderName = winner.name;
      ev(winner.id, prev ? "mp.guild.unseated" : "mp.guild.youLead", [gid]);
      if (prev) ev(prev, "mp.guild.lostLead", [gid, winner.name]);
      challengers.filter((c) => c.id !== winner.id).forEach((c) => ev(c.id, "mp.guild.claimFailed", [gid]));
    }

    // 2b) Vergi / kapatma / katıl-ayrıl / destekçilik
    for (const pid of order) {
      for (const it of this.intents[pid]) {
        if (it.k === "setGuildBacking") {
          const g = this.snap.guilds.find((x) => x.id === it.guildId);
          if (g && g.leaderId === pid) { g.backing = it.beylikId && this.snap.beyliks.some((b) => b.id === it.beylikId) ? it.beylikId : null;
            ev(pid, "mp.guild.backed", [g.backing ? (this.snap.beyliks.find((b) => b.id === g.backing)?.name || g.backing) : "—"]); }
        } else if (it.k === "setGuildTax") {
          const g = this.snap.guilds.find((x) => x.id === it.guildId);
          if (g && g.leaderId === pid) { g.tax = Math.max(0, Math.min(80, it.tax)); ev(pid, "mp.guild.taxSet", [g.tax]);
            this.snap.players.filter((p) => p.guildId === g.id && p.id !== pid).forEach((p) => ev(p.id, "mp.guild.memberFelt", [g.tax])); }
        } else if (it.k === "closeGuild") {
          const g = this.snap.guilds.find((x) => x.id === it.guildId);
          if (g && g.leaderId === pid) g.closed = it.closed;
        } else if (it.k === "joinGuild") {
          const g = this.snap.guilds.find((x) => x.id === it.guildId);
          const p = this.snap.players.find((x) => x.id === pid);
          if (g && p && !g.closed) p.guildId = g.id;
        } else if (it.k === "leaveGuild") {
          const p = this.snap.players.find((x) => x.id === pid); if (p) p.guildId = null;
        }
      }
    }
    // Kral lonca vergisi/kapatma çapraz-etkisi: kral bir loncaya yük getirirse üyeler hisseder
    const king = this.snap.players.find((p) => p.crowned);
    if (king) {
      for (const pid of order) for (const it of this.intents[pid]) {
        if (it.k === "setGuildTax" && pid === king.id) {
          const g = this.snap.guilds.find((x) => x.id === it.guildId);
          if (g) this.snap.players.filter((p) => p.guildId === g.id && p.id !== king.id).forEach((p) => ev(p.id, "mp.guild.taxedByKing"));
        }
        if (it.k === "closeGuild" && pid === king.id && it.closed) {
          const g = this.snap.guilds.find((x) => x.id === it.guildId);
          if (g) this.snap.players.filter((p) => p.guildId === g.id).forEach((p) => ev(p.id, "mp.guild.closedByKing"));
        }
      }
    }

    // 3) SANCAK valiliği
    for (const pid of order) for (const it of this.intents[pid]) {
      if (it.k === "appointGovernor") {
        let prov = this.snap.provinces.find((x) => x.name === it.province);
        if (!prov) { prov = { name: it.province, governorId: null, tax: 10 }; this.snap.provinces.push(prov); }
        const prev = prov.governorId;
        if (prev !== pid) {
          prov.governorId = pid; ev(pid, "mp.gov.appointed", [it.province]);
          const p = this.snap.players.find((x) => x.id === pid); if (p) p.provinceName = it.province;
          if (prev) { ev(prev, "mp.gov.replaced", [it.province, this.snap.players.find((x) => x.id === pid)?.name || "?"]);
            const pp = this.snap.players.find((x) => x.id === prev); if (pp && pp.provinceName === it.province) pp.provinceName = null; }
        }
      } else if (it.k === "setProvinceTax") {
        const prov = this.snap.provinces.find((x) => x.name === it.province);
        if (prov && prov.governorId === pid) prov.tax = Math.max(0, Math.min(60, it.tax));
      }
    }

    // 4) BEYLİK (Mount & Blade): bağlan / beye oyna-devir / vergi / sefer
    const playerById = (id: string) => this.snap.players.find((p) => p.id === id) || null;
    const beyById = (id: string | null) => (id ? playerById(id) : null);
    // Beyliğin canlı muster gücü: taban + beyin yarı gücü + üyelerin çeyrek gücü + ocak desteği.
    const liveBeylikMuster = (b: BeylikState): number => {
      const bey = beyById(b.beyId);
      const memberPow = this.snap.players
        .filter((p) => p.beylikId === b.id && !p.dead && p.id !== b.beyId)
        .reduce((a, p) => a + p.power * 0.25, 0);
      return b.power + (bey ? bey.power * 0.5 : 0) + memberPow + (b.ocak ? 15 : 0);
    };

    // 4a) Bağlan / ayrıl (önce: bey iddiaları doğru üyelikle tartılsın)
    for (const pid of order) for (const it of this.intents[pid]) {
      if (it.k === "joinBeylik") {
        const b = this.snap.beyliks.find((x) => x.id === it.beylikId); const p = playerById(pid);
        if (b && p) { p.beylikId = b.id; ev(pid, "mp.beylik.joined", [b.name]); }
      } else if (it.k === "leaveBeylik") {
        const p = playerById(pid);
        if (p && p.beylikId) {
          const b = this.snap.beyliks.find((x) => x.id === p.beylikId);
          if (b && b.beyId === pid) { b.beyId = null; b.beyName = null; b.power = NPC_BEYLIK_POWER; b.ocak = NPC_OCAK_BY_BEYLIK[b.id] || null; }
          ev(pid, "mp.beylik.left", [b?.name || ""]); p.beylikId = null;
        }
      }
    }

    // 4b) Beye oyna — beylik başına EN YÜKSEK GÜÇLÜ kazanır (mevcut bey de yarışır).
    const beyClaims: Record<string, string[]> = {};
    for (const pid of order) for (const it of this.intents[pid]) if (it.k === "claimBey") (beyClaims[it.beylikId] ||= []).push(pid);
    for (const bid of Object.keys(beyClaims)) {
      const b = this.snap.beyliks.find((x) => x.id === bid); if (!b) continue;
      // Meşruiyet: reşit (yaş≥18) + güç eşiği. Altın istemcide kesilir.
      const challengers = beyClaims[bid].map(playerById).filter((p) => p && !p.dead && p.age >= BEY_MIN_AGE && p.power >= BEY_MIN_POWER) as PlayerPublic[];
      if (!challengers.length) { beyClaims[bid].forEach((pid) => ev(pid, "mp.beylik.tooWeak", [b.name])); continue; }
      const curBey = beyById(b.beyId);
      const pool = [...challengers]; if (curBey && !pool.some((p) => p.id === curBey.id)) pool.push(curBey);
      pool.sort((a, c) => c.power - a.power);
      const winner = pool[0];
      if (b.beyId === winner.id) { ev(winner.id, "mp.beylik.held", [b.name]); continue; }
      const prev = b.beyId;
      b.beyId = winner.id; b.beyName = winner.name; b.claimedTurn = this.snap.turn;
      b.ocak = winner.guildId || b.ocak; b.power = Math.max(b.power, Math.round(winner.power));
      winner.beylikId = b.id;
      if (prev) { ev(prev, "mp.beylik.deposed", [b.name, winner.name]); ev(winner.id, "mp.beylik.seized", [b.name]); }
      else ev(winner.id, "mp.beylik.founded", [b.name]);
      challengers.filter((c) => c.id !== winner.id).forEach((c) => ev(c.id, "mp.beylik.claimFailed", [b.name]));
    }

    // 4c) Beylik vergisi — bey bağlı oyuncuları sıkar (onlar hisseder)
    for (const pid of order) for (const it of this.intents[pid]) {
      if (it.k === "setBeylikTax") {
        const b = this.snap.beyliks.find((x) => x.id === it.beylikId);
        if (b && b.beyId === pid) { b.tax = Math.max(0, Math.min(70, it.tax)); ev(pid, "mp.beylik.taxSet", [b.tax]); }
        // Para akışı her ay aşağıdaki "aylık vergi" adımında çözülür (bey toplar, üye öder).
      }
    }

    // 4d) Beylikler arası sefer/savaş — bey hedef beyliğe yürür; muster (bey+üye+ocak) tartılır.
    for (const pid of order) for (const it of this.intents[pid]) {
      if (it.k !== "beylikCampaign") continue;
      if ((this.snap.hostages || []).some((h) => h.captive === pid)) { ev(pid, "mp.hostage.chained", []); continue; } // zincirde sefer yok
      const attackerB = this.snap.beyliks.find((x) => x.beyId === pid);
      const target = this.snap.beyliks.find((x) => x.id === it.target);
      if (!attackerB || !target || target.id === attackerB.id) continue;
      // Pakt koruması: müttefik/eş olduğun beyin beyliğine sefer açamazsın (önce paktı boz).
      if (target.beyId) { const pc = this.pactOf(pid, target.beyId); if (pc === "alliance" || pc === "marriage") { ev(pid, "mp.soc.pactProtected", [target.beyName || target.name]); continue; } }
      // NPC desteği + LONCA destekçiliği seferi etkiler (loncalar kingmaker olur).
      const guildAtk = this.snap.guilds.filter((g) => g.backing === attackerB.id).reduce((s, g) => s + this.guildInfluence(g.id), 0);
      const guildDef = this.snap.guilds.filter((g) => g.backing === target.id).reduce((s, g) => s + this.guildInfluence(g.id), 0);
      // Ortak sefer: bu ay bu beye omuz verenlerin kişisel gücünün yarısı orduya katılır.
      const pledges = order.filter((q) => q !== pid && (this.intents[q] || []).some((x) => x.k === "joinCampaign" && x.bey === pid));
      const pledgePow = pledges.reduce((s2, q) => s2 + Math.round((playerById(q)?.power || 0) * 0.5), 0);
      const atk = liveBeylikMuster(attackerB) + this.npcSupport(pid, target.beyId) + guildAtk + pledgePow, def = liveBeylikMuster(target) + guildDef;
      // Gerçekçi: kesin sonuç değil, güç oranıyla OLASILIK. Maliyet (altın) istemcide kesildi.
      const win = (Math.random() * (atk + def)) < atk;
      if (win) {
        const prevBey = target.beyId;
        target.beyId = pid; target.beyName = playerById(pid)?.name || target.beyName; target.claimedTurn = this.snap.turn;
        target.power = Math.max(NPC_BEYLIK_POWER, Math.round(def * 0.6)); // ilhak sonrası sarsılmış
        ev(pid, "mp.beylik.campaignWon", [target.name]);
        if (prevBey && prevBey !== pid) ev(prevBey, "mp.beylik.lostToCampaign", [target.name, playerById(pid)?.name || ""]);
        this.snap.players.filter((p) => p.beylikId === target.id && p.id !== pid && !p.dead).forEach((p) => ev(p.id, "mp.beylik.conquered", [target.name]));
        // ÜYE TEMETTÜSÜ: sefer ganimeti yalnız beye değil, sancağı taşıyan üyelere de akar —
        // beylik üyeliği artık vergi ödenen bir yük değil, pay alınan bir ortaklık.
        this.snap.players.filter((pl) => pl.beylikId === attackerB.id && pl.id !== pid && !pl.dead).forEach((pl) => { ev(pl.id, "mp.beylik.spoils", [target.name, 150]); });
        attackerB.power += 8;
      } else {
        target.power = Math.round(target.power + 6); // savunma güçlendi
        ev(pid, "mp.beylik.campaignLost", [target.name]);
      }
      // Omuz verenler: sonuç ne olursa olsun şeref kazanır (erdem), zaferde ganimet haberi düşer.
      pledges.forEach((q) => {
        const qp = playerById(q); if (!qp || qp.dead) return;
        qp.honor = Math.min(100, qp.honor + 2);
        ev(q, win ? "mp.sefer.joinedWin" : "mp.sefer.joinedLost", [target.name, playerById(pid)?.name || ""]);
      });
    }

    // 4e) AYLIK BEYLİK VERGİSİ — bey bağlı üyelerden alır (gelir), üyeler öder (gider).
    // Düz kelle vergisi (vergi×2/üye) → toplam birebir beye akar, para buharlaşmaz.
    for (const b of this.snap.beyliks) {
      if (!b.beyId || !isAlive(b.beyId) || b.tax <= 0) continue;
      // YALNIZ çevrimiçi üyeler öder → bey tam ödeneni toplar (çevrimdışıdan hayalî gelir olmaz).
      const members = this.snap.players.filter((p) => p.beylikId === b.id && !p.dead && p.online && p.id !== b.beyId);
      if (!members.length) continue;
      const due = b.tax * 2;
      members.forEach((m) => ev(m.id, "mp.beylik.taxDue", [b.name, due]));
      ev(b.beyId, "mp.beylik.taxIncome", [members.length * due, b.name]);
    }
    // Aylık LONCA aidatı — başkan çevrimiçi üyelerden toplar (bey olmadan ekonomik güç).
    for (const g of this.snap.guilds) {
      if (!g.leaderId || !isAlive(g.leaderId) || g.tax <= 0) continue;
      const members = this.snap.players.filter((p) => p.guildId === g.id && !p.dead && p.online && p.id !== g.leaderId);
      if (!members.length) continue;
      members.forEach((m) => ev(m.id, "mp.guild.duesPaid", [g.id, g.tax]));
      ev(g.leaderId, "mp.guild.duesIncome", [members.length * g.tax, g.id]);
    }

    // 4f) ORTAK GİRİŞİM (kervan ortaklığı): hisseler birleşir, kervan 3 ayda döner.
    // Tek ortak zarar eder (EV<1), ortak sayısı arttıkça kâr artar — "birlikte kazan" ekonomisi.
    // Önce vadesi dolan girişim çözülür (geç kalan hisse bir SONRAKİ kervana yazılır), sonra yeni hisseler işlenir.
    if (this.snap.venture && this.snap.turn >= this.snap.venture.resolveTurn) {
      const v = this.snap.venture; this.snap.venture = null;
      const n = v.backers.length;
      if (n) {
        const win = Math.random() < 0.8;
        const coop = 1.05 + 0.10 * Math.min(4, n - 1); // 1 ortak ×1.05 … 5+ ortak ×1.45
        for (const b of v.backers) {
          if (win) ev(b.id, "mp.venture.win", [Math.round(b.amount * coop), n]);
          else ev(b.id, "mp.venture.fail", [Math.round(b.amount * 0.5)]); // soyulan kervandan yarı iade
        }
      }
    }
    for (const pid of order) for (const it of this.intents[pid]) {
      if (it.k !== "ventureBack") continue;
      const want = Math.max(VENTURE_MIN_STAKE, Math.min(VENTURE_MAX_STAKE, Math.floor(it.amount || 0)));
      if (!(want > 0)) continue;
      if (!this.snap.venture) this.snap.venture = { backers: [], startedTurn: this.snap.turn, resolveTurn: this.snap.turn + VENTURE_TICKS };
      const v = this.snap.venture;
      const mine = v.backers.find((b) => b.id === pid);
      const room = VENTURE_MAX_STAKE - (mine?.amount || 0);
      const add = Math.min(want, room);
      if (add < want) ev(pid, "mp.venture.refund", [want - add]); // tavanı aşan kısım iade (istemcide kesilen altın yanmaz)
      if (add <= 0) continue;
      if (mine) mine.amount += add;
      else v.backers.push({ id: pid, name: playerById(pid)?.name || "?", amount: add });
      ev(pid, "mp.venture.backed", [add, v.resolveTurn - this.snap.turn]);
    }

    // ── 5) SOSYAL DOKU: destek / rekabet / entrika / yardım (oyuncular arası) ──
    const pname = (id: string) => playerById(id)?.name || "?";
    const aliveOther = (pid: string, other: string) => pid !== other && isAlive(pid) && isAlive(other);
    const isCaptive = (q: string) => (this.snap.hostages || []).some((h) => h.captive === q);
    const chance = (p: number) => Math.random() < p;
    // ÜCRETSİZ aksiyonlar (vouch/duel) ayda bir kez/hedef ile sınırlı — buton spam'i ile
    // şöhret/şeref farmlanmasını önler. Bedelli aksiyonlarda altın istemcide zaten kesildiği
    // için onlar dedupe edilmez (kesilen altın boşa gitmesin).
    const socOnce = new Set<string>();
    const once = (key: string) => { if (socOnce.has(key)) return false; socOnce.add(key); return true; };
    // "Seyahate Çık": seyahatteki kişiye DÜŞMANCA eylem (düello/casus/sabotaj/iftira/ayartma/suikast)
    // engellenir — kişi dokunulmaz. Beyliğine sefer (holdings) bundan etkilenmez.
    const HOSTILE = new Set(["duel", "spy", "sabotage", "slander", "bribe", "assassinate", "captureDuel"]);

    for (const pid of order) for (const it of this.intents[pid]) {
      const tgtId = (it as { to?: string; on?: string }).to || (it as { to?: string; on?: string }).on;
      if (HOSTILE.has(it.k) && tgtId) {
        if (playerById(tgtId)?.traveling) { ev(pid, "mp.soc.targetTraveling", [pname(tgtId)]); continue; }
        // Pakt koruması: müttefik/eşine saldıramazsın — önce paktı bozmalısın (bilinçli ihanet).
        const pc = this.pactOf(pid, tgtId);
        if (pc === "alliance" || pc === "marriage") { ev(pid, "mp.soc.pactProtected", [pname(tgtId)]); continue; }
      }
      switch (it.k) {
        // — Destek & dostluk —
        case "joinCampaign": { // omuz sözü verildi — çözüm sefer bloğunda
          if (it.bey && it.bey !== pid && isAlive(it.bey)) ev(pid, "mp.sefer.pledged", [pname(it.bey)]);
          break;
        }
        case "voteReis": { // oy defteri: son oy geçerli; kendine oy yazılmaz
          if (it.target && it.target !== pid && isAlive(it.target)) {
            this.snap.reisVotes = { ...(this.snap.reisVotes || {}), [pid]: it.target };
            ev(pid, "mp.reis.voted", [playerById(it.target)?.name || ""]);
          }
          break;
        }
        case "gift": { // altın gönderen istemcide kesildi; alıcıya kredi olayı
          if (!aliveOther(pid, it.to) || !(it.amount > 0)) break;
          const amt = Math.min(GIFT_MAX, Math.floor(it.amount));
          ev(it.to, "mp.soc.giftGot", [pname(pid), amt]); ev(pid, "mp.soc.giftSent", [pname(it.to), amt]);
          this.adjustBond(pid, it.to, 8); this.adjustHonor(pid, 2);
          break;
        }
        case "vouch": {
          if (!aliveOther(pid, it.to) || !once(pid + "|vouch|" + it.to)) break;
          // Şöhret kazancı: kefilin kendi şöhretiyle ÖLÇEKLİ + hedefin tavana yakınlığıyla azalır.
          // Böylece iki "kimsesiz" oyuncu birbirini överek şöhret farmlayamaz (taht şartı korunur).
          const voucher = playerById(pid)!, tgt = playerById(it.to)!;
          const gain = Math.max(0, Math.round(6 * (voucher.fame / 100) * (1 - tgt.fame / 100)));
          ev(it.to, "mp.soc.vouched", [pname(pid), gain]); ev(pid, "mp.soc.vouchDone", [pname(it.to)]);
          this.adjustBond(pid, it.to, 5); this.adjustHonor(pid, 1);
          break;
        }
        case "proposeAlliance": case "proposeMarriage": case "proposeLoan": case "offerAsylum": {
          if (!aliveOther(pid, it.to)) break;
          const kind = it.k === "proposeAlliance" ? "alliance" : it.k === "proposeMarriage" ? "marriage" : it.k === "proposeLoan" ? "loan" : "asylum";
          this.snap.offers = this.snap.offers.filter((o) => !(o.from === pid && o.to === it.to && o.kind === kind)); // aynı teklifi tazele
          const amount = it.k === "proposeLoan" ? Math.max(1, Math.floor((it as { amount: number }).amount)) : undefined;
          this.snap.offers.push({ id: `o${this.snap.turn}_${this.offerSeq++}`, from: pid, fromName: pname(pid), to: it.to, kind: kind as Offer["kind"], amount, turn: this.snap.turn });
          ev(pid, "mp.soc.offerSent", [pname(it.to)]);
          break;
        }
        case "respondOffer": {
          const o = this.snap.offers.find((x) => x.id === it.offerId && x.to === pid);
          if (!o) break;
          this.snap.offers = this.snap.offers.filter((x) => x.id !== o.id);
          if (!it.accept) { ev(o.from, "mp.soc.offerDeclined", [pname(pid)]); break; }
          if (o.kind === "alliance") { this.setPact(o.from, pid, "alliance"); this.adjustBond(o.from, pid, 20); ev(o.from, "mp.soc.allied", [pname(pid)]); ev(pid, "mp.soc.allied", [pname(o.from)]); }
          else if (o.kind === "marriage") {
            // GERÇEK EVLİLİK: karşı cinsiyet + ikisi de bekâr şartı (SP kuralıyla uyumlu).
            const a = playerById(o.from), b = playerById(pid);
            if (!a || !b) break;
            if (a.gender === b.gender) { ev(o.from, "mp.soc.wedSameGender", [pname(pid)]); break; }
            if (a.married || b.married) { ev(o.from, "mp.soc.wedAlready", [pname(pid)]); break; }
            a.married = true; b.married = true;
            this.setPact(o.from, pid, "marriage"); this.adjustBond(o.from, pid, 45); this.adjustHonor(o.from, 4); this.adjustHonor(pid, 4);
            // Her iki karaktere gerçek eşi kur (isim + cinsiyet → game.ts evlilik sistemine bağlanır).
            ev(o.from, "mp.soc.wed", [b.name, b.gender]); ev(pid, "mp.soc.wed", [a.name, a.gender]);
          }
          else if (o.kind === "loan") { const amt = o.amount || 0; ev(pid, "mp.soc.loanGot", [pname(o.from), amt]); ev(o.from, "mp.soc.loanGave", [pname(pid), amt]); this.adjustBond(o.from, pid, 10); this.adjustHonor(o.from, 2); }
          else if (o.kind === "asylum") { const host = this.snap.beyliks.find((b) => b.beyId === o.from); const bid = host ? host.id : this.snap.players.find((x) => x.id === o.from)?.beylikId || null; const t = playerById(pid); if (t) t.beylikId = bid; this.adjustBond(o.from, pid, 15); this.adjustHonor(o.from, 4); ev(o.from, "mp.soc.asylumGave", [pname(pid)]); ev(pid, "mp.soc.asylumGot", [pname(o.from)]); }
          break;
        }
        case "breakPact": { // İHANET — paktı boz: ağır şeref bedeli + açık düşmanlık
          if (!aliveOther(pid, it.with)) break;
          const bd = this.bondOf(pid, it.with);
          if (!bd.pact) break;
          const wasMarriage = bd.pact === "marriage";
          this.setPact(pid, it.with, "war"); this.adjustBond(pid, it.with, -50); this.adjustHonor(pid, -25);
          if (wasMarriage) { // boşanma: iki taraf da bekâr olur, daha ağır rezalet
            const a = playerById(pid), b = playerById(it.with);
            if (a) a.married = false; if (b) b.married = false;
            this.adjustHonor(pid, -15);
            ev(it.with, "mp.soc.divorced", [pname(pid)]); ev(pid, "mp.soc.divorcedYou", [pname(it.with)]);
          } else { ev(it.with, "mp.soc.betrayed", [pname(pid)]); ev(pid, "mp.soc.youBetrayed", [pname(it.with)]); }
          break;
        }
        // — Rekabet —
        case "duel": {
          if (isCaptive(pid)) { ev(pid, "mp.hostage.chained", []); break; } // zincirde kılıç çekilmez
          if (!aliveOther(pid, it.to) || !once(pid + "|duel|" + it.to)) break;
          const me = playerById(pid)!, foe = playerById(it.to)!;
          const iWin = Math.random() * (me.power + foe.power + 1) < me.power + 1;
          const w = iWin ? pid : it.to, l = iWin ? it.to : pid;
          ev(w, "mp.soc.duelWon", [pname(l)]); ev(l, "mp.soc.duelLost", [pname(w)]);
          this.adjustHonor(w, 4); this.adjustBond(pid, it.to, -6);
          break;
        }
        case "captureDuel": { // rehin düellosu: kaybeden zincire vurulur — fidye pazarlığı başlar
          if (isCaptive(pid)) { ev(pid, "mp.hostage.chained", []); break; }
          if (!aliveOther(pid, it.to) || !once(pid + "|capture|" + it.to)) break;
          const hsAll = this.snap.hostages || (this.snap.hostages = []);
          if (hsAll.some((h) => h.captive === it.to || h.captor === pid)) break; // tek rehine; zaten zincirli vurulamaz
          const meC = playerById(pid)!, foeC = playerById(it.to)!;
          const iWin = Math.random() * (meC.power + foeC.power * 1.25 + 1) < meC.power; // savunan avantajlı
          if (iWin) {
            const ask = Math.max(150, Math.round(200 + foeC.power * 4));
            hsAll.push({ captor: pid, captive: it.to, ask, since: this.snap.turn });
            ev(pid, "mp.hostage.youTook", [pname(it.to), ask]); ev(it.to, "mp.hostage.youTaken", [pname(pid), ask]);
            this.snap.news = [...this.snap.news.slice(-9), { k: "mp.hostage.newsTaken", p: [meC.name, foeC.name], turn: this.snap.turn }];
            this.adjustBond(pid, it.to, -20);
          } else {
            ev(pid, "mp.hostage.failed", [pname(it.to)]); ev(it.to, "mp.hostage.escapedTry", [pname(pid)]);
            this.adjustHonor(pid, -4); this.adjustBond(pid, it.to, -10);
          }
          break;
        }
        case "payRansom": { // fidye: bedel istemcide kesildi; altın rehinciye olayla kredi edilir
          const hsP = this.snap.hostages || [];
          const hp = hsP.find((x) => x.captive === pid);
          if (!hp) break;
          this.snap.hostages = hsP.filter((x) => x !== hp);
          ev(hp.captor, "mp.hostage.ransomPaid", [pname(pid), hp.ask]);
          ev(pid, "mp.hostage.freedPaid", [pname(hp.captor), hp.ask]);
          break;
        }
        case "releaseHostage": { // merhamet: fidyesiz salıver — alicenaplık meclise yayılır
          const hsR = this.snap.hostages || [];
          const hr = hsR.find((x) => x.captor === pid);
          if (!hr) break;
          this.snap.hostages = hsR.filter((x) => x !== hr);
          this.adjustHonor(pid, 6);
          ev(pid, "mp.hostage.releasedMercy", [pname(hr.captive)]);
          ev(hr.captive, "mp.hostage.freedMercy", [pname(pid)]);
          break;
        }
        // — Entrika & ihanet (gizli, riskli; altın istemcide kesildi) —
        case "spy": {
          if (!aliveOther(pid, it.on)) break;
          if (chance(0.7)) { const acts = (this.intents[it.on] || []).map((x) => x.k).slice(0, 4); ev(pid, "mp.soc.spyResult", [pname(it.on), acts.length ? acts.join(", ") : "—"]); }
          else { ev(it.on, "mp.soc.spyCaught", [pname(pid)]); this.adjustBond(pid, it.on, -10); this.adjustHonor(pid, -3); }
          break;
        }
        case "sabotage": {
          if (!aliveOther(pid, it.on)) break;
          if (chance(0.6)) { ev(it.on, "mp.soc.sabotaged", [pname(pid)]); this.adjustBond(pid, it.on, -15); }
          else { ev(it.on, "mp.soc.sabotageCaught", [pname(pid)]); ev(pid, "mp.soc.plotFoiled", []); this.adjustBond(pid, it.on, -20); this.adjustHonor(pid, -8); }
          break;
        }
        case "assassinate": {
          const foe = playerById(it.on);
          if (!aliveOther(pid, it.on) || !foe || foe.age < ASSASSINATE_MIN_AGE) break;
          // Bizi tutan + hedefi sevmeyen NPC'ler suikast şansını az da olsa artırır.
          const odds = Math.max(0.1, Math.min(0.7, 0.35 - foe.power / 600 - Math.max(0, foe.honor) / 400 + this.npcSupport(pid, it.on) / 600));
          if (chance(odds)) {
            // Çevrimdışı vekili sunucu doğrudan öldürür (istemcisi yok); çevrimiçide olay istemcide işler.
            if (foe && !foe.online) foe.dead = true;
            ev(it.on, "mp.soc.assassinated", [pname(pid)]); this.adjustBond(pid, it.on, -40); this.adjustHonor(pid, -15);
          }
          else { ev(it.on, "mp.soc.assassinFoiled", [pname(pid)]); ev(pid, "mp.soc.plotFoiled", []); this.setPact(pid, it.on, "war"); this.adjustBond(pid, it.on, -50); this.adjustHonor(pid, -20); }
          break;
        }
        case "bribe": { // ayartma: rakip beyin bağlı üyesini kendi beyliğine çek
          const myBeylik = this.snap.beyliks.find((b) => b.beyId === pid);
          const tgt = playerById(it.on);
          if (!myBeylik || !tgt || !aliveOther(pid, it.on) || tgt.beylikId === myBeylik.id || this.snap.beyliks.some((b) => b.beyId === it.on)) break;
          if (chance(0.5)) { const old = tgt.beylikId; tgt.beylikId = myBeylik.id; ev(pid, "mp.soc.bribeWon", [pname(it.on)]); ev(it.on, "mp.soc.bribed", [pname(pid)]); const oldBey = old ? this.snap.beyliks.find((b) => b.id === old)?.beyId : null; if (oldBey) ev(oldBey, "mp.soc.poached", [pname(it.on), pname(pid)]); }
          else { ev(it.on, "mp.soc.bribeRefused", [pname(pid)]); this.adjustHonor(pid, -4); }
          break;
        }
        case "slander": {
          if (!aliveOther(pid, it.on)) break;
          if (chance(0.7)) { ev(it.on, "mp.soc.slandered", [pname(pid)]); this.adjustBond(pid, it.on, -12); }
          else { ev(it.on, "mp.soc.slanderCaught", [pname(pid)]); this.adjustHonor(pid, -6); }
          break;
        }
        // ── Paylaşımlı NPC ilişkileri (Faz B) — maliyet istemcide kesildi ──
        case "courtNpc": { // NPC'yi yanına çek (ziyafet/hediye) → standing↑ (azalan getiri)
          const npc = this.snap.npcs.find((n) => n.id === it.npcId); if (!npc) break;
          const cur = this.npcBondOf(it.npcId, pid).standing;
          this.adjustNpcBond(it.npcId, pid, Math.max(2, Math.round(10 * (1 - Math.max(0, cur) / 100))));
          ev(pid, "mp.npc.courted", [npc.name]);
          break;
        }
        case "turnNpc": { // NPC'yi bir oyuncuya karşı kışkırt — etki SENİN NPC ile yakınlığına bağlı
          const npc = this.snap.npcs.find((n) => n.id === it.npcId);
          if (!npc || !it.against || it.against === pid || !playerById(it.against)) break; // hedef GERÇEK oyuncu olmalı
          const myStand = this.npcBondOf(it.npcId, pid).standing;
          if (myStand < 10) { ev(pid, "mp.npc.tooDistant", [npc.name]); break; } // NPC seni yeterince sevmiyor
          this.adjustNpcBond(it.npcId, it.against, -Math.round(12 * (myStand / 100)));
          ev(pid, "mp.npc.turned", [npc.name, pname(it.against)]);
          if (isAlive(it.against)) ev(it.against, "mp.npc.turnedYou", [npc.name, pname(pid)]);
          break;
        }
        case "mediateNpc": { // NPC ile bir oyuncunun arasını düzelt
          const npc = this.snap.npcs.find((n) => n.id === it.npcId);
          if (!npc || !it.player || !playerById(it.player)) break; // hedef GERÇEK oyuncu olmalı
          const myStand = this.npcBondOf(it.npcId, pid).standing;
          if (myStand < 10) { ev(pid, "mp.npc.tooDistant", [npc.name]); break; }
          this.adjustNpcBond(it.npcId, it.player, Math.round(10 * (myStand / 100)));
          ev(pid, "mp.npc.mediated", [npc.name, pname(it.player)]);
          if (isAlive(it.player)) ev(it.player, "mp.npc.mediatedYou", [npc.name, pname(pid)]);
          break;
        }
      }
    }
    // ── 6) ÇEVRİMDIŞI NPC-VEKİL: seyahatte DEĞİL kopan oyuncu vekile düşer → yaşlanır + ölüm riski.
    // (Holdings'i zaten etkileşime açık; suikast de işler.) Vekil ölürse oyuncu dönüşte ölü bulur.
    for (const p of this.snap.players) {
      if (p.online || p.traveling || p.dead) continue;
      p.npcMonths = (p.npcMonths || 0) + 1;
      if (p.npcMonths >= 12) { p.npcMonths = 0; p.age += 1; }
      const risk = 0.004 + Math.max(0, p.age - 50) * 0.004; // yaşlı vekil daha kırılgan
      if (Math.random() < risk) p.dead = true;
    }

    // Ölen oyuncunun bağ/teklifleri temizlenir (sonraki tur makam boşaltmayı zaten yapıyor).
    this.snap.offers = this.snap.offers.filter((o) => isAlive(o.from) && isAlive(o.to));

    // 7) DİYAR HABERLERİ (kozmetik): NPC'lerden akış — dünya canlı görünür, OYUNA/DENGEYE ETKİSİ YOK.
    if (this.snap.npcs.length) {
      const picks = 1 + (this.snap.turn % 2);
      const fresh: RealmNews[] = [];
      for (let i = 0; i < picks; i++) {
        const n = this.snap.npcs[(this.snap.turn * 7 + i * 13) % this.snap.npcs.length];
        const k = NEWS_KEYS[(this.snap.turn + i * 3) % NEWS_KEYS.length];
        fresh.push({ k: "mp.news." + k, p: [n.name, n.beylikId], turn: this.snap.turn });
      }
      this.snap.news = [...this.snap.news.slice(-8), ...fresh];
    }

    // ── Yıllık Diyar Ödülleri: yıl kapanışında en çok yükselenler ilan edilir — rekabetin nabzı. ──
    if ((this.snap.turn + 1) % 12 === 0) {
      const base = this.snap.yearBase || {};
      const alive = this.snap.players.filter((x) => !x.dead);
      const delta = (x: PlayerPublic, k: "power" | "fame" | "honor") => x[k] - (base[x.id] ? base[x.id][k] : x[k]);
      const pick = (k: "power" | "fame" | "honor") => alive.filter((x) => delta(x, k) > 0).sort((a, b) => delta(b, k) - delta(a, k))[0] || null;
      this.snap.players.forEach((x) => { x.laurel = null; }); // eski defneler solar — her yıl yeniden kazanılır
      const crown = (w: PlayerPublic | null, kind: string) => {
        if (!w) return;
        w.laurel = kind;
        this.snap.news = [...this.snap.news.slice(-9), { k: "mp.award." + kind, p: [w.name], turn: this.snap.turn }];
      };
      crown(pick("power"), "bey");
      crown(pick("fame"), "yildiz");
      crown(pick("honor"), "alicenap");
      const nb: Record<string, { power: number; fame: number, honor: number }> = {};
      this.snap.players.forEach((x) => { nb[x.id] = { power: x.power, fame: x.fame, honor: x.honor }; });
      this.snap.yearBase = nb;
      // ── Meclis Reisi sayımı: en çok oy (eşitlikte şerefi yüksek olan); oy defteri yeni yıl için temizlenir ──
      const votes = this.snap.reisVotes || {};
      const tally: Record<string, number> = {};
      for (const voter of Object.keys(votes)) {
        const tgt = votes[voter];
        if (isAlive(voter) && isAlive(tgt)) tally[tgt] = (tally[tgt] || 0) + 1;
      }
      const cand = Object.keys(tally).sort((a, b) => (tally[b] - tally[a]) || ((playerById(b)?.honor || 0) - (playerById(a)?.honor || 0)));
      if (cand.length) {
        const w = playerById(cand[0])!;
        this.snap.reis = { id: w.id, name: w.name };
        this.snap.news = [...this.snap.news.slice(-9), { k: "mp.reis.elected", p: [w.name, tally[cand[0]]], turn: this.snap.turn }];
      }
      this.snap.reisVotes = {};
    }

    // ── Rehine defteri bakımı: ölüm her zinciri çözer; 12 ay ödenmeyen fidyenin rehinesi kaçar. ──
    if (this.snap.hostages && this.snap.hostages.length) {
      const keepH: { captor: string; captive: string; ask: number; since: number }[] = [];
      for (const h of this.snap.hostages) {
        if (!isAlive(h.captor) || !isAlive(h.captive)) continue;
        if (this.snap.turn - h.since >= 12) {
          this.adjustHonor(h.captor, -3);
          ev(h.captor, "mp.hostage.escapedAway", [pname(h.captive)]);
          ev(h.captive, "mp.hostage.youEscaped", [pname(h.captor)]);
          continue;
        }
        keepH.push(h);
      }
      this.snap.hostages = keepH;
    }

    // saat ilerle + pencere/alarm sıfırla
    this.snap.turn += 1;
    this.snap.players.forEach((p) => { p.ready = false; });
    this.intents = {};
    this.snap.econ = Math.round((this.snap.econ * 1.004) * 1000) / 1000; // hafif paylaşımlı enflasyon
    this.snap.phase = "open";
    this.snap.tickDeadline = Date.now() + TICK_TIMEOUT_MS;
    await this.persist();
    await this.state.storage.setAlarm(this.snap.tickDeadline);

    // Çevrimdışı oyuncuya düşen kişisel olaylar yayında kaybolmasın: kalıcı kuyruğa yaz, dönüşünde teslim et.
    // (Aksi hâlde borç kabulünde veren tarafın borcu hiç düşmüyordu → altın çoğalması; hediye yok oluyordu; evlilik tek taraflı kalıyordu.)
    {
      const pend = (await this.state.storage.get<Record<string, TickEvent[]>>("pendingEv")) || {};
      let dirty = false;
      for (const r of Object.values(results)) {
        if (!r.events.length) continue;
        if (this.socketsOf([r.playerId]).length) continue; // bağlıysa yayınla zaten alacak
        pend[r.playerId] = [...(pend[r.playerId] || []), ...r.events].slice(-40); // oyuncu başına sınırlı kuyruk
        dirty = true;
      }
      if (dirty) await this.state.storage.put("pendingEv", pend);
    }
    this.broadcast({ t: "tick", turn: this.snap.turn, results: Object.values(results), snapshot: this.snap });
    await this.reportDirectory();
  }

  // ── Yayın yardımcıları ──
  sockets(): WebSocket[] { return this.state.getWebSockets(); }
  // Verilen oyuncu kimliklerine ait açık soketler (fısıltı/beylik kanalı yönlendirmesi).
  socketsOf(ids: string[]): WebSocket[] {
    const set = new Set(ids.filter(Boolean));
    return this.sockets().filter((ws) => { const a = (ws.deserializeAttachment() || {}) as { playerId?: string }; return !!a.playerId && set.has(a.playerId); });
  }
  // ── Sosyal doku yardımcıları ──
  // Bağ kanonik (a<b) saklanır; yoksa oluşturulur.
  bondOf(x: string, y: string): Bond {
    const [a, b] = x < y ? [x, y] : [y, x];
    let bd = this.snap.bonds.find((d) => d.a === a && d.b === b);
    if (!bd) { bd = { a, b, standing: 0, pact: null, since: this.snap.turn }; this.snap.bonds.push(bd); }
    return bd;
  }
  adjustBond(x: string, y: string, delta: number) { const bd = this.bondOf(x, y); bd.standing = Math.max(-100, Math.min(100, bd.standing + delta)); }
  // Salt-okur pakt (bağ oluşturmaz): iki oyuncu arası ittifak/evlilik/savaş.
  pactOf(x: string, y: string): PactType | null { const [a, b] = x < y ? [x, y] : [y, x]; return this.snap.bonds.find((d) => d.a === a && d.b === b)?.pact || null; }
  setPact(x: string, y: string, pact: PactType | null) { const bd = this.bondOf(x, y); bd.pact = pact; bd.since = this.snap.turn; }
  // Şeref: ARTIŞ azalan getirili (yükseldikçe zorlaşır) → farmlanamaz; CEZA tam uygulanır (ihanet hep yaralar).
  // NPC↔oyuncu ilişkisi (kişiye özel) — yoksa oluştur.
  npcBondOf(npc: string, player: string): NpcBond {
    let b = this.snap.npcBonds.find((x) => x.npc === npc && x.player === player);
    if (!b) { b = { npc, player, standing: 0 }; this.snap.npcBonds.push(b); }
    return b;
  }
  adjustNpcBond(npc: string, player: string, delta: number) { const b = this.npcBondOf(npc, player); b.standing = Math.max(-100, Math.min(100, b.standing + delta)); }
  // Salt-okur NPC↔oyuncu standing (bağ oluşturmaz).
  npcStanding(npc: string, player: string): number { return this.snap.npcBonds.find((b) => b.npc === npc && b.player === player)?.standing || 0; }
  // Lonca nüfuzu: çevrimiçi üyelerin kolektif ağırlığı (şöhret+güç). Bey-olmayan güç bloku.
  guildInfluence(gid: string): number {
    return this.snap.players.filter((p) => p.guildId === gid && !p.dead && p.online).reduce((s, p) => s + (p.fame + p.power) * 0.15, 0);
  }
  // NPC desteği: bir oyuncunun (me) bir hedefe (against) karşı topladığı NPC nüfuzu.
  // Seni seven + hedefi sevmeyen NPC'ler, nüfuzları oranında sana ağırlık katar.
  npcSupport(me: string, against: string | null): number {
    let s = 0;
    for (const n of this.snap.npcs) {
      const mine = this.npcStanding(n.id, me); if (mine <= 20) continue;
      const tgt = against ? this.npcStanding(n.id, against) : 0;
      if (mine > tgt) s += (n.influence * (mine - tgt)) / 200;
    }
    return s;
  }
  adjustHonor(pid: string, delta: number) {
    const p = this.snap.players.find((x) => x.id === pid); if (!p) return;
    const cur = p.honor || 0;
    const eff = delta > 0 ? delta * (1 - Math.max(0, cur) / 100) : delta;
    p.honor = Math.max(-100, Math.min(100, Math.round(cur + eff)));
  }
  sendTo(ws: WebSocket, m: ServerMsg) { try { ws.send(JSON.stringify(m)); } catch {} }
  broadcast(m: ServerMsg) { const s = JSON.stringify(m); for (const ws of this.sockets()) { try { ws.send(s); } catch {} } }
  broadcastPresence() {
    this.broadcast({ t: "presence", players: this.snap.players, phase: this.snap.phase, tickDeadline: this.snap.tickDeadline });
  }
  broadcastChatSys(k: string, name: string) {
    this.broadcast({ t: "chat", from: "sys", fromName: "·", text: `${name}`, at: Date.now() });
  }
}
