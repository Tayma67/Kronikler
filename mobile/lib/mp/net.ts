// WebSocket istemcisi — bağlan, otomatik yeniden bağlan, mesaj gönder/al.
// React'tan bağımsız; store.tsx bunu sarar. RN'in global WebSocket'ini kullanır.
import { ClientMsg, ServerMsg } from "./protocol";

export type NetStatus = "idle" | "connecting" | "open" | "closed" | "error";
export interface NetHandlers {
  onStatus?: (s: NetStatus) => void;
  onMessage?: (m: ServerMsg) => void;
}

export class MpClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: NetHandlers;
  private shouldRun = false;
  private retry = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private queue: ClientMsg[] = [];        // bağlantı açılana kadar bekleyen mesajlar
  status: NetStatus = "idle";

  constructor(url: string, handlers: NetHandlers) {
    this.url = url; this.handlers = handlers;
  }

  connect() {
    this.shouldRun = true;
    this.open();
  }

  private setStatus(s: NetStatus) { this.status = s; this.handlers.onStatus?.(s); }

  private open() {
    if (!this.url) { this.setStatus("error"); return; }
    this.setStatus(this.retry > 0 ? "connecting" : "connecting");
    try {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      ws.onopen = () => {
        this.retry = 0;
        this.setStatus("open");
        // bekleyen mesajları boşalt
        const q = this.queue; this.queue = [];
        for (const m of q) this.rawSend(m);
        // canlılık için periyodik ping
        if (this.pingTimer) clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => this.rawSend({ t: "ping" }), 25000);
      };
      ws.onmessage = (ev) => {
        try { const m = JSON.parse(typeof ev.data === "string" ? ev.data : "") as ServerMsg; this.handlers.onMessage?.(m); }
        catch {}
      };
      ws.onerror = () => { this.setStatus("error"); };
      ws.onclose = () => {
        this.setStatus("closed");
        if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
        if (this.shouldRun) this.scheduleReconnect();
      };
    } catch { this.setStatus("error"); if (this.shouldRun) this.scheduleReconnect(); }
  }

  private scheduleReconnect() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const delay = Math.min(16000, 1000 * Math.pow(2, this.retry)); // 1,2,4,8,16s
    this.retry++;
    this.retryTimer = setTimeout(() => { if (this.shouldRun) this.open(); }, delay);
  }

  private rawSend(m: ClientMsg) {
    try { this.ws?.send(JSON.stringify(m)); } catch {}
  }

  send(m: ClientMsg) {
    if (this.ws && this.status === "open") this.rawSend(m);
    else this.queue.push(m);  // açılınca gönderilir
  }

  close() {
    this.shouldRun = false;
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null; }
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    try { this.ws?.close(); } catch {}
    this.ws = null;
    this.setStatus("idle");
  }
}
