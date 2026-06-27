// Çok oyuncu durum deposu — bağlantı yaşam döngüsü + diyar anlık görüntüsü + sohbet.
import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import { MpClient, NetStatus } from "./net";
import { getServerUrl, getGuestId } from "./config";
import { ClientMsg, ServerMsg, RealmSnapshot, PlayerPublic, SharedIntent, TickResult } from "./protocol";

export interface ChatLine { from: string; fromName: string; text: string; at: number }

interface MpCtx {
  status: NetStatus;
  guestId: string | null;
  snapshot: RealmSnapshot | null;
  chat: ChatLine[];
  lastTick: { turn: number; results: TickResult[] } | null;
  error: string | null;
  joinRealm: (realmId: string, realmName: string, player: PlayerPublic) => Promise<void>;
  syncPlayer: (player: PlayerPublic) => void;
  setReady: (ready: boolean) => void;
  sendIntent: (intent: SharedIntent) => void;
  sendChat: (text: string) => void;
  leave: () => void;
}

const Ctx = createContext<MpCtx | null>(null);

export function MpProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<MpClient | null>(null);
  const lastJoinRef = useRef<{ realmId: string; realmName: string; player: PlayerPublic } | null>(null); // reconnect'te tekrar katılım için
  const [status, setStatus] = useState<NetStatus>("idle");
  const [guestId, setGuestId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<RealmSnapshot | null>(null);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [lastTick, setLastTick] = useState<{ turn: number; results: TickResult[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getGuestId().then(setGuestId); }, []);
  useEffect(() => () => { clientRef.current?.close(); }, []);

  const onMessage = useCallback((m: ServerMsg) => {
    switch (m.t) {
      case "welcome": setSnapshot(m.snapshot); setError(null); break;
      case "snapshot": setSnapshot(m.snapshot); break;
      case "presence":
        setSnapshot((s) => s ? { ...s, players: m.players, phase: m.phase, tickDeadline: m.tickDeadline } : s);
        break;
      case "tick":
        setSnapshot(m.snapshot);
        setLastTick({ turn: m.turn, results: m.results });
        break;
      case "chat":
        setChat((c) => [...c.slice(-80), { from: m.from, fromName: m.fromName, text: m.text, at: m.at }]);
        break;
      case "error": setError(`${m.code}: ${m.msg}`); break;
    }
  }, []);

  const send = useCallback((msg: ClientMsg) => { clientRef.current?.send(msg); }, []);

  // Bağlantı açıldığında (ilk VEYA reconnect) son katılım bilgisini tekrar gönder → DO'da
  // yeniden kaydol (sunucu idempotent: var olan oyuncuyu online yapar).
  const onStatus = useCallback((st: NetStatus) => {
    setStatus(st);
    if (st === "open" && lastJoinRef.current) {
      const j = lastJoinRef.current;
      clientRef.current?.send({ t: "join", realmId: j.realmId, realmName: j.realmName, player: j.player });
    }
  }, []);

  const joinRealm = useCallback(async (realmId: string, realmName: string, player: PlayerPublic) => {
    setError(null);
    const url = await getServerUrl();
    if (!url) { setError("NO_SERVER: sunucu adresi ayarlanmadı"); setStatus("error"); return; }
    // diyar adresi: <wss base>/realm/<realmId>
    const full = url.replace(/\/$/, "") + "/realm/" + encodeURIComponent(realmId);
    lastJoinRef.current = { realmId, realmName, player };
    clientRef.current?.close();
    const c = new MpClient(full, { onStatus, onMessage });
    clientRef.current = c;
    c.connect(); // join, onStatus("open") içinde gönderilir (ilk bağlantı + her reconnect)
  }, [onMessage, onStatus]);

  // Kamu durumunu hem sunucuya gönder hem reconnect payload'ını güncel tut.
  const syncPlayer = useCallback((player: PlayerPublic) => { if (lastJoinRef.current) lastJoinRef.current.player = player; send({ t: "sync", player }); }, [send]);
  const setReady = useCallback((ready: boolean) => send({ t: "ready", ready }), [send]);
  const sendIntent = useCallback((intent: SharedIntent) => send({ t: "intent", intent }), [send]);
  const sendChat = useCallback((text: string) => { if (text.trim()) send({ t: "chat", text: text.slice(0, 240) }); }, [send]);
  const leave = useCallback(() => { lastJoinRef.current = null; send({ t: "leave" }); clientRef.current?.close(); setSnapshot(null); setChat([]); setLastTick(null); }, [send]);

  return (
    <Ctx.Provider value={{ status, guestId, snapshot, chat, lastTick, error, joinRealm, syncPlayer, setReady, sendIntent, sendChat, leave }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMp(): MpCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMp must be used within MpProvider");
  return c;
}
