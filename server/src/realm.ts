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
  PROTOCOL_VERSION, MAX_PLAYERS, TICK_TIMEOUT_MS, readyToTick,
} from "./protocol";

interface Env { REALM: DurableObjectNamespace }

const GUILD_IDS = ["tuccar", "demirci", "asker", "sifaci", "golge", "ulema", "esnaf"];
// Boş (NPC) beyliklerin taban gücü ve bunları tutan ocaklar (deterministik dağıtım).
const NPC_BEYLIK_POWER = 60;
const NPC_OCAK_BY_BEYLIK: Record<string, string> = {
  demirhan: "demirci", yenisehir: "tuccar", gumushisar: "ulema", aksehir: "esnaf", karahisar: "asker",
};

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
      if (!this.snap.offers) this.snap.offers = [];
      this.snap.players.forEach((p) => { if (p.beylikId === undefined) p.beylikId = null; if (p.honor === undefined) p.honor = 0; });
      this.snap.v = PROTOCOL_VERSION;
    } else {
      const now = Date.now();
      this.snap = {
        v: PROTOCOL_VERSION, realmId, name: realmName || realmId,
        seed: Math.floor(Math.random() * 1e9), turn: 0, phase: "open",
        tickDeadline: now + TICK_TIMEOUT_MS, players: [],
        throne: { holderId: null, holderName: null, claimedTurn: 0 },
        guilds: GUILD_IDS.map((id) => ({ id, leaderId: null, tax: 10, closed: false } as GuildState)),
        provinces: [], beyliks: defaultBeyliks(), bonds: [], offers: [], econ: 1, createdAt: now,
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
        // Yeniden katılımda beylikId + honor SUNUCU otoritesinde kalmalı (istemci sıfır gönderir) → koru.
        if (existing) { Object.assign(existing, p, { online: true, beylikId: existing.beylikId, honor: existing.honor ?? 0 }); }
        else {
          if (this.snap.players.filter((x) => x.online).length >= MAX_PLAYERS) { this.sendTo(ws, { t: "error", code: "FULL", msg: "Diyar dolu" }); return; }
          this.snap.players.push({ ...p, online: true, ready: false, beylikId: null, honor: typeof p.honor === "number" ? p.honor : 0 });
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
        // beylikId + honor SUNUCU otoritesindedir (istemcinin game.ts'inde karşılığı yok) → sync ezmez.
        if (p && m.player) { Object.assign(p, m.player, { id: p.id, online: true, beylikId: p.beylikId, honor: p.honor ?? 0 }); await this.persist(); this.broadcastPresence(); }
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
        if (!p || !m.text?.trim()) break;
        const text = m.text.slice(0, 240);
        const scope: ChatScope = m.scope === "whisper" || m.scope === "beylik" ? m.scope : "all";
        const out: ServerMsg = { t: "chat", from: p.id, fromName: p.name, text, at: Date.now(), scope, to: m.to };
        if (scope === "all") {
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
      const attackerB = this.snap.beyliks.find((x) => x.beyId === pid);
      const target = this.snap.beyliks.find((x) => x.id === it.target);
      if (!attackerB || !target || target.id === attackerB.id) continue;
      const atk = liveBeylikMuster(attackerB), def = liveBeylikMuster(target);
      // Gerçekçi: kesin sonuç değil, güç oranıyla OLASILIK. Maliyet (altın) istemcide kesildi.
      const win = (Math.random() * (atk + def)) < atk;
      if (win) {
        const prevBey = target.beyId;
        target.beyId = pid; target.beyName = playerById(pid)?.name || target.beyName; target.claimedTurn = this.snap.turn;
        target.power = Math.max(NPC_BEYLIK_POWER, Math.round(def * 0.6)); // ilhak sonrası sarsılmış
        ev(pid, "mp.beylik.campaignWon", [target.name]);
        if (prevBey && prevBey !== pid) ev(prevBey, "mp.beylik.lostToCampaign", [target.name, playerById(pid)?.name || ""]);
        this.snap.players.filter((p) => p.beylikId === target.id && p.id !== pid && !p.dead).forEach((p) => ev(p.id, "mp.beylik.conquered", [target.name]));
        attackerB.power += 8;
      } else {
        target.power = Math.round(target.power + 6); // savunma güçlendi
        ev(pid, "mp.beylik.campaignLost", [target.name]);
      }
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

    // ── 5) SOSYAL DOKU: destek / rekabet / entrika / yardım (oyuncular arası) ──
    const pname = (id: string) => playerById(id)?.name || "?";
    const aliveOther = (pid: string, other: string) => pid !== other && isAlive(pid) && isAlive(other);
    const chance = (p: number) => Math.random() < p;

    for (const pid of order) for (const it of this.intents[pid]) {
      switch (it.k) {
        // — Destek & dostluk —
        case "gift": { // altın gönderen istemcide kesildi; alıcıya kredi olayı
          if (!aliveOther(pid, it.to) || !(it.amount > 0)) break;
          const amt = Math.min(GIFT_MAX, Math.floor(it.amount));
          ev(it.to, "mp.soc.giftGot", [pname(pid), amt]); ev(pid, "mp.soc.giftSent", [pname(it.to), amt]);
          this.adjustBond(pid, it.to, 8); this.adjustHonor(pid, 2);
          break;
        }
        case "vouch": {
          if (!aliveOther(pid, it.to)) break;
          ev(it.to, "mp.soc.vouched", [pname(pid)]); ev(pid, "mp.soc.vouchDone", [pname(it.to)]);
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
          else if (o.kind === "marriage") { this.setPact(o.from, pid, "marriage"); this.adjustBond(o.from, pid, 30); this.adjustHonor(o.from, 3); this.adjustHonor(pid, 3); ev(o.from, "mp.soc.married", [pname(pid)]); ev(pid, "mp.soc.married", [pname(o.from)]); }
          else if (o.kind === "loan") { const amt = o.amount || 0; ev(pid, "mp.soc.loanGot", [pname(o.from), amt]); ev(o.from, "mp.soc.loanGave", [pname(pid), amt]); this.adjustBond(o.from, pid, 10); this.adjustHonor(o.from, 2); }
          else if (o.kind === "asylum") { const host = this.snap.beyliks.find((b) => b.beyId === o.from); const bid = host ? host.id : this.snap.players.find((x) => x.id === o.from)?.beylikId || null; const t = playerById(pid); if (t) t.beylikId = bid; this.adjustBond(o.from, pid, 15); this.adjustHonor(o.from, 4); ev(o.from, "mp.soc.asylumGave", [pname(pid)]); ev(pid, "mp.soc.asylumGot", [pname(o.from)]); }
          break;
        }
        case "breakPact": { // İHANET — paktı boz: ağır şeref bedeli + açık düşmanlık
          if (!aliveOther(pid, it.with)) break;
          const bd = this.bondOf(pid, it.with);
          if (!bd.pact) break;
          this.setPact(pid, it.with, "war"); this.adjustBond(pid, it.with, -50); this.adjustHonor(pid, -25);
          ev(it.with, "mp.soc.betrayed", [pname(pid)]); ev(pid, "mp.soc.youBetrayed", [pname(it.with)]);
          break;
        }
        // — Rekabet —
        case "duel": {
          if (!aliveOther(pid, it.to)) break;
          const me = playerById(pid)!, foe = playerById(it.to)!;
          const iWin = Math.random() * (me.power + foe.power + 1) < me.power + 1;
          const w = iWin ? pid : it.to, l = iWin ? it.to : pid;
          ev(w, "mp.soc.duelWon", [pname(l)]); ev(l, "mp.soc.duelLost", [pname(w)]);
          this.adjustHonor(w, 4); this.adjustBond(pid, it.to, -6);
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
          const odds = Math.max(0.1, Math.min(0.6, 0.35 - foe.power / 600 - Math.max(0, foe.honor) / 400));
          if (chance(odds)) { ev(it.on, "mp.soc.assassinated", [pname(pid)]); this.adjustBond(pid, it.on, -40); this.adjustHonor(pid, -15); }
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
      }
    }
    // Ölen oyuncunun bağ/teklifleri temizlenir (sonraki tur makam boşaltmayı zaten yapıyor).
    this.snap.offers = this.snap.offers.filter((o) => isAlive(o.from) && isAlive(o.to));

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
  setPact(x: string, y: string, pact: PactType | null) { const bd = this.bondOf(x, y); bd.pact = pact; bd.since = this.snap.turn; }
  adjustHonor(pid: string, delta: number) { const p = this.snap.players.find((x) => x.id === pid); if (p) p.honor = Math.max(-100, Math.min(100, (p.honor || 0) + delta)); }
  sendTo(ws: WebSocket, m: ServerMsg) { try { ws.send(JSON.stringify(m)); } catch {} }
  broadcast(m: ServerMsg) { const s = JSON.stringify(m); for (const ws of this.sockets()) { try { ws.send(s); } catch {} } }
  broadcastPresence() {
    this.broadcast({ t: "presence", players: this.snap.players, phase: this.snap.phase, tickDeadline: this.snap.tickDeadline });
  }
  broadcastChatSys(k: string, name: string) {
    this.broadcast({ t: "chat", from: "sys", fromName: "·", text: `${name}`, at: Date.now() });
  }
}
