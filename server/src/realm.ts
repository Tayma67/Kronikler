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
  GuildState, ProvinceState, PROTOCOL_VERSION, MAX_PLAYERS, TICK_TIMEOUT_MS, readyToTick,
} from "./protocol";

interface Env { REALM: DurableObjectNamespace }

const GUILD_IDS = ["tuccar", "demirci", "asker", "sifaci", "golge", "ulema", "esnaf"];

export class RealmDO {
  state: DurableObjectState;
  env: Env;
  snap!: RealmSnapshot;
  intents: Record<string, SharedIntent[]> = {}; // playerId → bu ay kuyruğa giren paylaşımlı eylemler
  loaded = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state; this.env = env;
  }

  async load(realmId: string, realmName?: string) {
    if (this.loaded) return;
    const stored = await this.state.storage.get<RealmSnapshot>("snap");
    if (stored) this.snap = stored;
    else {
      const now = Date.now();
      this.snap = {
        v: PROTOCOL_VERSION, realmId, name: realmName || realmId,
        seed: Math.floor(Math.random() * 1e9), turn: 0, phase: "open",
        tickDeadline: now + TICK_TIMEOUT_MS, players: [],
        throne: { holderId: null, holderName: null, claimedTurn: 0 },
        guilds: GUILD_IDS.map((id) => ({ id, leaderId: null, tax: 10, closed: false } as GuildState)),
        provinces: [], econ: 1, createdAt: now,
      };
      await this.persist();
    }
    this.loaded = true;
  }

  async persist() { await this.state.storage.put("snap", this.snap); }

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
        if (existing) { Object.assign(existing, p, { online: true }); }
        else {
          if (this.snap.players.filter((x) => x.online).length >= MAX_PLAYERS) { this.sendTo(ws, { t: "error", code: "FULL", msg: "Diyar dolu" }); return; }
          this.snap.players.push({ ...p, online: true, ready: false });
          this.broadcastChatSys(`mp.joined`, p.name);
        }
        await this.persist();
        this.sendTo(ws, { t: "welcome", you: p.id, snapshot: this.snap });
        this.broadcastPresence();
        await this.ensureAlarm();
        break;
      }
      case "sync": {
        const p = this.snap.players.find((x) => x.id === att.playerId);
        if (p && m.player) { Object.assign(p, m.player, { id: p.id, online: true }); await this.persist(); this.broadcastPresence(); }
        break;
      }
      case "ready": {
        const p = this.snap.players.find((x) => x.id === att.playerId);
        if (p) { p.ready = m.ready; this.broadcastPresence(); if (readyToTick(this.snap.players)) await this.tick(); }
        break;
      }
      case "intent": {
        if (att.playerId && m.intent) { (this.intents[att.playerId] ||= []).push(m.intent); }
        break;
      }
      case "chat": {
        const p = this.snap.players.find((x) => x.id === att.playerId);
        if (p && m.text?.trim()) this.broadcast({ t: "chat", from: p.id, fromName: p.name, text: m.text.slice(0, 240), at: Date.now() });
        break;
      }
      case "leave": { this.markOffline(att.playerId); await this.persist(); this.broadcastPresence(); break; }
      case "ping": { this.sendTo(ws, { t: "pong" }); break; }
    }
  }

  async webSocketClose(ws: WebSocket) {
    const att = (ws.deserializeAttachment() || {}) as { playerId?: string };
    this.markOffline(att.playerId);
    await this.persist();
    this.broadcastPresence();
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

    // 1) TAHT: boş ya da çekişmeli ise en yüksek güçlü iddiacı kazanır.
    const claimants = order.filter((pid) => this.intents[pid].some((i) => i.k === "claimThrone"))
      .map((pid) => this.snap.players.find((p) => p.id === pid)).filter((p) => p && !p.dead) as PlayerPublic[];
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

    // 2) LONCA: liderlik talebi, vergi, kapatma
    for (const pid of order) {
      for (const it of this.intents[pid]) {
        if (it.k === "claimGuildLead") {
          const g = this.snap.guilds.find((x) => x.id === it.guildId);
          if (g && !g.leaderId) { g.leaderId = pid; ev(pid, "mp.guild.youLead", [it.guildId]); }
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
      } else if (it.k === "campaign") {
        ev(pid, "mp.campaign.won", [it.target]);
        const p = this.snap.players.find((x) => x.id === pid); if (p) p.power += 10;
      }
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

    this.broadcast({ t: "tick", turn: this.snap.turn, results: Object.values(results), snapshot: this.snap });
  }

  // ── Yayın yardımcıları ──
  sockets(): WebSocket[] { return this.state.getWebSockets(); }
  sendTo(ws: WebSocket, m: ServerMsg) { try { ws.send(JSON.stringify(m)); } catch {} }
  broadcast(m: ServerMsg) { const s = JSON.stringify(m); for (const ws of this.sockets()) { try { ws.send(s); } catch {} } }
  broadcastPresence() {
    this.broadcast({ t: "presence", players: this.snap.players, phase: this.snap.phase, tickDeadline: this.snap.tickDeadline });
  }
  broadcastChatSys(k: string, name: string) {
    this.broadcast({ t: "chat", from: "sys", fromName: "·", text: `${name}`, at: Date.now() });
  }
}
