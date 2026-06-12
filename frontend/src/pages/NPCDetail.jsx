import { useParams, Link, useNavigate } from "react-router-dom";
import { playSfx } from "@/lib/audio";
import { profLabel } from "@/lib/labels";
import { useEffect, useState, useRef } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useActionRedirect } from "@/hooks/useActionRedirect";
import {
  ArrowLeft, Crown, Skull, Heart, MessageCircle,
  ChevronRight, X, Swords, Brain, Gift, Coins,
  HeartHandshake, Flame, Megaphone, AlertTriangle, LogOut,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────
function bandFromScore(score = 0) {
  if (score < -50) return { name: "düşman",   cls: "text-red-400 border-red-900",       dot: "bg-red-500" };
  if (score < -20) return { name: "rakip",    cls: "text-red-300 border-red-900/60",    dot: "bg-red-400" };
  if (score <  20) return { name: "nötr",     cls: "text-stone-400 border-stone-700",   dot: "bg-stone-500" };
  if (score <  50) return { name: "arkadaş",  cls: "text-emerald-300 border-emerald-900", dot: "bg-emerald-500" };
  return               { name: "dost",     cls: "text-emerald-400 border-emerald-800", dot: "bg-emerald-400" };
}

// ─── sub-components ───────────────────────────────────────────────────────

function RelBar({ value }) {
  const pct = Math.max(0, Math.min(100, (value + 100) / 2));
  const color = value >= 20 ? "bg-emerald-600" : value >= -20 ? "bg-stone-500" : "bg-red-700";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-stone-900 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-heading text-stone-300 w-10 text-right">
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}

function ResultBubble({ text, gain, consequences, cascade, npcMood, onClose }) {
  const allLines = [
    ...(consequences || []),
    ...(cascade || []).map(c => `⚡ ${c}`),
  ];
  return (
    <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 pointer-events-none">
      <div className="bg-stone-950 border border-stone-700 rounded-sm px-5 py-4 max-w-sm w-full shadow-2xl pointer-events-auto">
        <div className="flex justify-between items-start gap-3 mb-3">
          <p className="text-sm text-stone-200 leading-relaxed">{text}</p>
          <button onClick={onClose} className="text-stone-600 hover:text-stone-300 shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        {allLines.length > 0 && (
          <div className="border-t border-stone-800 pt-2 space-y-1">
            {allLines.map((line, i) => {
              const isNeg = line.includes("-") || line.includes("⚠") || line.includes("☠");
              const isPos = line.includes("+") || line.includes("💑") || line.includes("💍") || line.includes("💬");
              return (
                <div key={i} className={`text-xs font-heading ${
                  isNeg ? "text-red-400" : isPos ? "text-emerald-400" : "text-stone-400"
                }`}>
                  {line}
                </div>
              );
            })}
          </div>
        )}
        {npcMood && (
          <div className="mt-2 text-[10px] text-stone-600">
            Ruh hali: <span className="text-stone-400">{npcMood}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Gift picker modal
function GiftModal({ inventory, onPick, onClose }) {
  const items = Object.entries(inventory || {}).filter(([, q]) => q > 0);
  if (!items.length) return (
    <ModalShell onClose={onClose} title="Hediye Ver">
      <p className="text-stone-400 text-sm text-center py-6">Envanterinde verecek bir şey yok.</p>
    </ModalShell>
  );
  return (
    <ModalShell onClose={onClose} title="Hediye Ver">
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {items.map(([key, qty]) => (
          <button
            key={key}
            onClick={() => onPick(key, 1)}
            className="w-full flex items-center justify-between px-4 py-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-stone-600 transition-colors text-left"
          >
            <span className="text-sm text-stone-200 capitalize">{key.replace(/_/g, " ")}</span>
            <span className="text-xs text-stone-500">x{qty}</span>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

// Money input modal
function MoneyModal({ playerMoney, onGive, onClose }) {
  const [amount, setAmount] = useState("");
  return (
    <ModalShell onClose={onClose} title="Para Ver">
      <p className="text-stone-500 text-xs mb-4">Elinde {playerMoney} altın var.</p>
      <input
        type="number"
        min="1"
        max={playerMoney}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Miktar gir..."
        className="w-full bg-stone-900 border border-stone-700 px-3 py-2 text-stone-100 text-sm mb-4 outline-none focus:border-amber-700"
      />
      <button
        disabled={!amount || Number(amount) < 1 || Number(amount) > playerMoney}
        onClick={() => onGive(Number(amount))}
        className="w-full py-2.5 font-heading text-xs tracking-widest btn-ember disabled:opacity-40"
      >
        Ver
      </button>
    </ModalShell>
  );
}

// Chat modal (mevcut dialog sistemi)
function ChatModal({ npc, state, onClose }) {
  const [topics, setTopics] = useState([]);
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [gameState, setGameState] = useState(state);
  const [lastTopic, setLastTopic] = useState(null);
  const logRef = useRef(null);

  // R4 Sohbet Eli: haftalık 3 konu kartı
  const [hand, setHand] = useState(null);
  const [playedCards, setPlayedCards] = useState([]);

  useEffect(() => {
    api.get("/game/dialog-topics").then((r) => setTopics(r.data));
    api.get(`/game/npc/${npc.id}/cards`).then((r) => setHand(r.data)).catch(() => {});
    // Mevcut NPC hafızasından son topic'i çek
    const mem = npc?.memory;
    if (mem && mem.length > 0) {
      setLastTopic(mem[mem.length - 1].topic);
    }
  }, [npc]);

  const playCard = async (card) => {
    setBusy(true);
    playSfx("page");
    setLog((c) => [...c, { from: "p", text: card.label }]);
    try {
      const { data } = await api.post(`/game/npc/${npc.id}/card`, { card_id: card.id });
      if (data.proactive) {
        setLog((c) => [...c, { from: "n", text: data.proactive, isProactive: true }]);
      }
      setLog((c) => [...c, { from: "n", text: data.text, delta: data.delta }]);
      if (data.closing) {
        setLog((c) => [...c, { from: "n", text: data.closing, isProactive: true }]);
      }
      if (data.intel) {
        setLog((c) => [...c, { from: "i", text: `📖 ${data.intel.text}` }]);
        toast.success(data.intel.text, { duration: 4000 });
        // Amaç öğrenildiyse eli tazele — Yardım Et / Sömür açılır
        if (data.intel.type === "amac") {
          api.get(`/game/npc/${npc.id}/cards`).then((r) => setHand(r.data)).catch(() => {});
        }
      }
      setPlayedCards((p) => [...p, card.id]);
      if (data.state) setGameState(data.state);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Sohbet ters gitti.");
    } finally {
      setBusy(false);
    }
  };

  // S2: amaç eylemi — Yardım Et / Sömür
  const goalAction = async (eylem) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/game/npc/${npc.id}/amac`, { eylem });
      setLog((c) => [...c, { from: "n", text: data.response }]);
      (data.consequences || []).forEach((line) =>
        setLog((c) => [...c, { from: "i", text: line }]));
      if (data.state) setGameState(data.state);
      api.get(`/game/npc/${npc.id}/cards`).then((r) => setHand(r.data)).catch(() => {});
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Olmadı.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const speak = async (topic, label) => {
    setBusy(true);
    setLog((c) => [...c, { from: "p", text: label }]);
    try {
      const { data } = await api.post("/game/chat", { npc_id: npc.id, topic });
      // Proactive satır varsa ayrı baloncuk olarak ekle
      if (data.proactive) {
        setLog((c) => [...c, { from: "n", text: data.proactive, isProactive: true }]);
      }
      setLog((c) => [...c, { from: "n", text: data.response, delta: data.delta }]);
      // Bir sonraki konuşma için last_topic güncelle
      if (data.last_topic) setLastTopic(data.last_topic);
      const r = await api.get("/game/state");
      setGameState(r.data);
      if (data.hostile) toast.error(`${npc.name} sana saldırıyor!`);
    } catch (e) {
      toast.error("Konuşma başarısız.");
    } finally {
      setBusy(false);
    }
  };

  const rel = gameState?.relationships?.[npc.id] ?? 0;
  const tierCls = {
    aktif_dusman: "border-red-800 text-red-400",
    soguk: "border-orange-900 text-orange-400",
    notr: "border-stone-700 text-stone-400",
    dost: "border-emerald-900 text-emerald-400",
    sadik: "border-amber-700 text-amber-300",
  }[hand?.tier?.key] || "border-stone-700 text-stone-400";

  return (
    <ModalShell onClose={onClose} title={`${npc.name} ile Sohbet`} tall>
      {/* rel mini bar + S2 davranış kademesi */}
      <div className="mb-1 flex items-center gap-2">
        <div className="flex-1"><RelBar value={hand?.effective_rel ?? rel} /></div>
        {hand?.tier && (
          <span className={`shrink-0 text-[9px] px-1.5 py-0.5 border rounded-sm font-heading tracking-wider ${tierCls}`}
                title={hand.tier.desc}>
            {hand.tier.label}
          </span>
        )}
      </div>
      {/* S2: seni hatırlıyor */}
      {(hand?.remembers || []).length > 0 && (
        <div className="mb-2 space-y-0.5">
          {hand.remembers.map((m, i) => (
            <div key={i} className={`text-[10px] italic ${
              m.travma ? "text-red-300" : m.yon > 0 ? "text-emerald-400/80" : "text-orange-400/80"
            }`}>
              {m.travma ? "⚡" : "🧠"} Hatırlıyor: "...{m.text}."
            </div>
          ))}
        </div>
      )}
      {/* chat log */}
      <div ref={logRef} className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0" style={{ maxHeight: 280 }}>
        {log.length === 0 && (
          <p className="text-stone-600 text-xs italic">Bir konu seçerek konuşmaya başla…</p>
        )}
        {log.map((m, i) => m.from === "i" ? (
          <div key={i} className="text-[11px] text-amber-300 bg-amber-950/20 border border-amber-900/40 rounded-sm px-3 py-2 italic">
            {m.text}
          </div>
        ) : (
          <div key={i} className={`max-w-[88%] ${m.from === "p" ? "ml-auto" : ""}`}>
            {m.isProactive && (
              <div className="text-amber-400/60 text-[10px] italic mb-0.5 pl-1">
                ✦ {npc.name} bir şey söylemek istiyor
              </div>
            )}
            <div className={`px-3 py-2 text-sm rounded-sm ${
              m.from === "p"
                ? "bg-amber-900/40 border border-amber-900 text-stone-100"
                : m.isProactive
                  ? "bg-stone-900 border border-amber-900/30 text-amber-200/80 italic"
                  : "bg-stone-900 border border-stone-800 text-stone-200"
            }`}>
              {m.text}
            </div>
            {m.delta != null && (
              <div className={`text-[10px] mt-0.5 ${m.delta > 0 ? "text-emerald-500" : m.delta < 0 ? "text-red-400" : "text-stone-600"}`}>
                {m.delta > 0 ? `+${m.delta}` : m.delta} ilişki
              </div>
            )}
          </div>
        ))}
      </div>
      {/* R4: Konu Kartları — bu haftanın eli */}
      {hand?.cards && (
        <div className="border-t border-stone-800 pt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-heading tracking-[0.2em] text-amber-600/80 uppercase">
              🃏 Konu Kartların
            </span>
            {hand.warning && playedCards.length === 0 && (
              <span className="text-[9px] text-red-400/70 italic">{hand.warning}</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {hand.cards.map((c) => {
              const used = playedCards.includes(c.id);
              const tone = c.id.startsWith("g") ? "emerald" : c.id.startsWith("r") ? "amber" : "purple";
              return (
                <button key={c.id} disabled={busy || used || !npc.alive}
                  onClick={() => playCard(c)}
                  className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-sm border text-center transition-colors ${
                    used ? "border-stone-800 text-stone-700 opacity-40"
                    : tone === "emerald" ? "border-emerald-900/60 text-emerald-200 hover:bg-emerald-950/20"
                    : tone === "amber" ? "border-amber-900/60 text-amber-200 hover:bg-amber-950/20"
                    : "border-purple-900/60 text-purple-200 hover:bg-purple-950/20"}`}>
                  <span className="text-[10px] leading-tight">{c.label}</span>
                  <span className="text-[8px] opacity-60">{used ? "konuşuldu" : c.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* S2: bilinen amaç — Yardım Et / Sömür / Görmezden gel */}
      {hand?.amac_eylem && (
        <div className="border-t border-stone-800 pt-2 mt-2 space-y-1.5">
          <div className="text-[9px] font-heading tracking-[0.2em] text-purple-400/80 uppercase">
            🎯 Amacını biliyorsun: <span className="text-purple-300">{hand.amac_eylem.amac_label}</span>
          </div>
          <div className="flex gap-1.5">
            <button
              disabled={busy || hand.amac_eylem.yardim_edildi}
              onClick={() => goalAction("yardim")}
              className={`flex-1 px-2 py-1.5 text-[10px] border rounded-sm transition-colors ${
                hand.amac_eylem.yardim_edildi
                  ? "border-stone-800 text-stone-600 opacity-50"
                  : "border-emerald-900/60 text-emerald-300 hover:bg-emerald-950/20"
              }`}>
              {hand.amac_eylem.yardim_edildi
                ? "✓ Yardım ettin"
                : `💛 Yardım Et (${hand.amac_eylem.yardim_cost} altın)`}
            </button>
            <button
              disabled={busy || hand.amac_eylem.koz}
              onClick={() => goalAction("somur")}
              className={`flex-1 px-2 py-1.5 text-[10px] border rounded-sm transition-colors ${
                hand.amac_eylem.koz
                  ? "border-stone-800 text-stone-600 opacity-50"
                  : "border-red-900/60 text-red-300 hover:bg-red-950/20"
              }`}>
              {hand.amac_eylem.koz ? "✓ Koz yaptın" : "🗡 Sömür (pazarlık kozu)"}
            </button>
          </div>
        </div>
      )}

      {/* Hızlı konular (basit selamlaşma) */}
      <div className="flex flex-wrap gap-1.5 pt-2">
        {topics.slice(0, 4).map((t) => (
          <button
            key={t.id}
            onClick={() => speak(t.id, t.label)}
            disabled={busy || !npc.alive}
            className={`btn-ghost-ash px-2.5 py-1 text-[10px] disabled:opacity-40 ${
              t.id === lastTopic ? "border-amber-900/50 text-amber-500/80" : ""
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

function ModalShell({ children, onClose, title, tall = false }) {
  return (
    <div className="fixed inset-0 z-50 bg-stone-950/90 flex items-center justify-center p-4">
      <div className={`bg-stone-950 border border-stone-800 w-full max-w-md ${tall ? "max-h-[80vh] flex flex-col" : ""}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
          <span className="font-heading text-sm text-stone-200 tracking-wider">{title}</span>
          <button onClick={onClose} className="text-stone-600 hover:text-stone-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className={`p-4 ${tall ? "flex-1 overflow-y-auto flex flex-col" : ""}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────
export default function NPCDetail() {
  const { id } = useParams();
  const { state, setState } = useGame();
  const withRedirect = useActionRedirect("NPC");
  const navigate = useNavigate();

  const [modal, setModal] = useState(null); // null | "chat" | "gift" | "money"
  const [result, setResult] = useState(null); // { text, gain }
  const [busy, setBusy] = useState(false);

  const npc = state?.world.npcs.find((n) => n.id === id);

  if (!npc) return (
    <div className="text-stone-400 p-4">
      NPC bulunamadı. <Link to="/oyun/npcler" className="text-amber-500">Geri</Link>
    </div>
  );

  const rel = state.relationships?.[npc.id] ?? 0;
  const band = bandFromScore(rel);
  const player = state.player;
  const isAdult = !player.is_child;
  const sameLocation = npc.location_id === player.location_id;
  const isDating = player.relationship_status?.[npc.id] === "dating";
  const isMarried = player.relationship_status?.[npc.id] === "married" || npc.spouse_id === "PLAYER";
  const parents = (npc.parent_ids || []).map(pid => state.world.npcs.find(n => n.id === pid)).filter(Boolean);
  const spouse = npc.spouse_id && npc.spouse_id !== "PLAYER"
    ? state.world.npcs.find(n => n.id === npc.spouse_id)
    : null;
  const children = (npc.children_ids || []).filter(c => c !== "PLAYER")
    .map(cid => state.world.npcs.find(n => n.id === cid)).filter(Boolean);

  // GDD §20.2: Bu NPC oyuncunun ebeveyni mi?
  const isPlayerParent = (player.parent_ids || []).includes(npc.id);
  const currentTurn = state.turn || 0;
  const alreadyHelpedThisWeek = player.parent_help_done?.[npc.id] === currentTurn;

  const handleHelpParent = async () => {
    setBusy(true);
    try {
      await withRedirect(async () => {
        const { data } = await api.post("/game/help-parent", { parent_id: npc.id });
        setState(data.state);
        setResult({
          text: data.event?.summary || "Ebeveynine yardım ettin.",
          gain: null, consequences: [], cascade: [], npcMood: null,
        });
        return data;
      });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Bir hata oluştu.");
    } finally { setBusy(false); }
  };

  const handleAction = async (type, payload = {}) => {
    setBusy(true);
    try {
      let res;
      const base = `/game/npc/${npc.id}`;

      if (type === "compliment") res = await api.post(`${base}/compliment`);
      else if (type === "insult")    res = await api.post(`${base}/insult`);
      else if (type === "gossip")    res = await api.post(`${base}/gossip`);
      else if (type === "flirt")     res = await api.post(`${base}/flirt`);
      else if (type === "propose")   res = await api.post(`${base}/propose`);
      else if (type === "kidnap")    res = await api.post(`${base}/kidnap`);
      else if (type === "gift")      res = await api.post(`${base}/gift`, payload);
      else if (type === "money")     res = await api.post(`${base}/givemoney`, payload);
      else if (type === "attack") {
        res = await api.post(`/game/attack_npc`, { npc_id: npc.id });
        if (res.data?.enforcement) toast.error(`Yakalandın! ${res.data.enforcement.fine} altın ceza.`);
      }

      if (res?.data?.state) setState(res.data.state);
      else { const r = await api.get("/game/state"); setState(r.data); }

      // Sonuç metnini tip bazlı oluştur
      let text = "İşlem tamamlandı.";
      let gain = null;
      if (type === "attack") {
        const log = res?.data?.log || [];
        const outcome = res?.data?.outcome;
        const summary = log[log.length - 1] || "Saldırı gerçekleşti.";
        const icon = outcome === "zafer" ? "⚔️" : "🩸";
        text = `${icon} ${summary}`;
      } else {
        text = res?.data?.response || "İşlem tamamlandı.";
        gain = res?.data?.gain != null
          ? res.data.gain
          : res?.data?.loss != null
          ? -res.data.loss
          : null;
      }
      setResult({
        text,
        gain,
        consequences: res?.data?.consequences || [],
        cascade: res?.data?.cascade || [],
        npcMood: res?.data?.npc_mood || null,
      });
      setModal(null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  };

  // ── Menü tanımı ────────────────────────────────────────────
  const MENU = [
    {
      id: "chat",
      label: "Sohbet Et",
      icon: MessageCircle,
      color: "text-amber-400",
      available: npc.alive,
      onClick: () => setModal("chat"),
    },
    {
      id: "compliment",
      label: "İltifat Et",
      icon: Heart,
      color: "text-pink-400",
      available: npc.alive,
      onClick: () => handleAction("compliment"),
    },
    {
      id: "gift",
      label: "Hediye Ver",
      icon: Gift,
      color: "text-emerald-400",
      available: npc.alive && Object.keys(player.inventory || {}).length > 0,
      unavailableReason: "Envanterin boş.",
      onClick: () => setModal("gift"),
    },
    {
      id: "money",
      label: "Para Ver",
      icon: Coins,
      color: "text-amber-300",
      available: npc.alive && (player.money || 0) > 0,
      unavailableReason: "Paran yok.",
      onClick: () => setModal("money"),
    },
    {
      id: "flirt",
      label: isDating ? "Çıkıyorsunuz ✓" : "Çıkma Teklifi Et",
      icon: Flame,
      color: "text-orange-400",
      available: isAdult && npc.alive && !isDating && !isMarried && !npc.spouse_id && npc.age >= 18 && rel >= 20,
      unavailableReason: isMarried ? "Zaten evlisiniz." : isDating ? "Zaten çıkıyorsunuz." : !isAdult ? "13+ gerekli." : rel < 20 ? "İlişki 20+ gerekli." : npc.spouse_id ? "Bu kişi evli." : "",
      disabled: isDating || isMarried,
      onClick: () => handleAction("flirt"),
    },
    {
      id: "propose",
      label: isMarried ? "Evlisiniz ✓" : "Evlilik Teklifi Et",
      icon: HeartHandshake,
      color: "text-rose-400",
      available: isAdult && npc.alive && isDating && !isMarried && rel >= 50,
      unavailableReason: isMarried ? "Zaten evlisiniz." : !isAdult ? "13+ gerekli." : !isDating ? "Önce çıkıyorsunuz olmalı." : rel < 50 ? "İlişki 50+ gerekli." : "",
      disabled: isMarried,
      onClick: () => handleAction("propose"),
    },
    null, // separator
    {
      id: "insult",
      label: "Hakaret Et",
      icon: Megaphone,
      color: "text-yellow-500",
      available: npc.alive,
      danger: true,
      onClick: () => handleAction("insult"),
    },
    {
      id: "attack",
      label: "Saldır",
      icon: Swords,
      color: "text-red-400",
      available: isAdult && npc.alive && sameLocation,
      unavailableReason: !isAdult ? "13+ gerekli." : !sameLocation ? "Hedef burada değil." : "",
      danger: true,
      onClick: () => {
        if (!window.confirm(`${npc.name}'a saldırmak istediğinden emin misin?`)) return;
        handleAction("attack");
      },
    },
    {
      id: "gossip",
      label: "Hakkında Dedikodu Yay",
      icon: AlertTriangle,
      color: "text-orange-500",
      available: npc.alive,
      danger: true,
      onClick: () => handleAction("gossip"),
    },
    {
      id: "kidnap",
      label: "Kaçır",
      icon: AlertTriangle,
      color: "text-red-600",
      available: isAdult && npc.alive && sameLocation,
      unavailableReason: !isAdult ? "13+ gerekli." : !sameLocation ? "Hedef burada değil." : "",
      danger: true,
      onClick: () => {
        if (!window.confirm(`${npc.name}'ı kaçırmak istediğinden emin misin? Bu ciddi bir suçtur.`)) return;
        handleAction("kidnap");
      },
    },
    null, // separator
    {
      id: "leave",
      label: "Hoşça Kal",
      icon: LogOut,
      color: "text-stone-400",
      available: true,
      onClick: () => navigate(-1),
    },
  ];

  return (
    <div className="rise-in max-w-lg mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-stone-500 hover:text-stone-300 text-sm mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Geri
      </button>

      {/* NPC profile card */}
      <div className="card-frame p-4 mb-3">
        <div className="flex items-start gap-3">
          {/* Avatar circle */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${band.cls} bg-stone-900`}>
            <span className="text-xl">
              {npc.profession === "kral" || npc.profession === "veliaht" ? "👑"
               : npc.gender === "kadın" ? "👩"
               : "👤"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-lg text-stone-100 truncate">{npc.name}</h1>
              {!npc.alive && <Skull className="w-4 h-4 text-stone-600 shrink-0" />}
              {isMarried && <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
              {/* BUG-5 FIX: İşgalci etiketi */}
              {npc.is_invader && (
                <span className="text-[9px] font-heading text-red-400 border border-red-700 bg-red-950/50 px-1.5 py-0.5 rounded-sm shrink-0">⚔ İŞGALCİ</span>
              )}
            </div>
            <div className="text-xs text-stone-500">{profLabel(npc.profession)} · {npc.age} yaş · {npc.location_name}</div>
            <div className="mt-1.5">
              <RelBar value={rel} />
            </div>
          </div>
          <div className={`shrink-0 flex items-center gap-1 px-2 py-0.5 border rounded-sm text-[10px] font-heading ${band.cls}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${band.dot}`} />
            {band.name}
          </div>
        </div>

        {/* Quick info */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500">
          <span>💰 {npc.wealth} altın</span>
          <span>❤️ {npc.health}/100</span>
          {npc.mood && <span>😶 {npc.mood}</span>}
          {(npc.personality || []).map(p => (
            <span key={p} className="text-stone-400">{p}</span>
          ))}
          {isDating && <span className="text-orange-400 font-heading">Çıkıyorsunuz</span>}
        </div>

        {/* Toplumsal itibar etkisi — oyuncunun bu NPC üzerindeki algısı */}
        {player.social && (() => {
          const rep   = player.social.reputation;
          const fear  = player.social.fear;
          const fame  = player.social.fame;
          let hint = null;
          if (fear >= 40)       hint = { text: "Sorun çıkarmak istemem…", color: "text-red-400" };
          else if (fame >= 30)  hint = { text: "Seni tanımıyor muyum?", color: "text-purple-400" };
          else if (rep >= 30)   hint = { text: "Senin hakkında iyi şeyler duydum.", color: "text-emerald-400" };
          else if (rep <= -20)  hint = { text: "Sana güvenmiyorum.", color: "text-orange-400" };
          if (!hint) return null;
          return (
            <div className={`mt-2 text-[11px] italic border-l-2 pl-2 border-stone-600 ${hint.color}`}>
              "{hint.text}"
            </div>
          );
        })()}

        {/* Family */}
        {(parents.length + children.length + (spouse ? 1 : 0)) > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-800 text-xs text-stone-500 space-y-0.5">
            {parents.length > 0 && <div>Anne/Baba: {parents.map(p => p.name).join(", ")}</div>}
            {spouse && <div>Eşi: <Link to={`/oyun/npc/${spouse.id}`} className="text-amber-400">{spouse.name}</Link></div>}
            {npc.spouse_id === "PLAYER" && <div className="text-rose-400">Senin eşin.</div>}
            {children.length > 0 && (
              <div>Çocukları: {children.map((c, i) => (
                <span key={c.id}>{i > 0 && ", "}<Link to={`/oyun/npc/${c.id}`} className="text-amber-400">{c.name}</Link></span>
              ))}</div>
            )}
          </div>
        )}
      </div>

      {/* ── GDD §20.2: Aile Yardımı (13 yaş altı + ebeveyn NPC) ── */}
      {isPlayerParent && (player.age || 0) < 13 && (
        <div className="card-frame p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-base">👨‍👩‍👦</span>
            <span className="label-tiny">Aile</span>
          </div>
          <button
            onClick={handleHelpParent}
            disabled={busy || alreadyHelpedThisWeek}
            className={`w-full py-2.5 text-sm font-heading tracking-wider rounded-sm border flex items-center justify-center gap-2 transition-all ${
              alreadyHelpedThisWeek
                ? "border-stone-800 text-stone-600 bg-stone-950/30 cursor-not-allowed"
                : "btn-ember"
            }`}
          >
            {alreadyHelpedThisWeek
              ? "✓ Bu ay yardım ettin"
              : busy
              ? <span className="text-xs">...</span>
              : "Yardım Et"}
          </button>
          {alreadyHelpedThisWeek && (
            <p className="text-[10px] text-stone-600 italic text-center">
              Gelecek ay tekrar yardım edebilirsin.
            </p>
          )}
        </div>
      )}

      {/* ── Etkileşim Menüsü ── */}
      <div className="card-frame overflow-hidden">
        <div className="px-4 py-2.5 border-b border-stone-800">
          <span className="font-heading text-[10px] text-stone-600 tracking-widest">ETKİLEŞİM</span>
        </div>
        <div className="divide-y divide-stone-900">
          {MENU.map((item, i) => {
            if (item === null) return <div key={i} className="h-px bg-stone-800 my-0" />;
            const Icon = item.icon;
            const isDisabled = !item.available || item.disabled || busy;
            return (
              <button
                key={item.id}
                onClick={!isDisabled ? item.onClick : undefined}
                disabled={isDisabled}
                title={isDisabled && item.unavailableReason ? item.unavailableReason : ""}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors
                  ${isDisabled
                    ? "opacity-35 cursor-not-allowed"
                    : item.danger
                    ? "hover:bg-red-950/30 active:bg-red-950/50"
                    : "hover:bg-stone-900/60 active:bg-stone-900"
                  }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                <span className={`text-sm flex-1 ${item.danger ? "text-red-300" : "text-stone-200"}`}>
                  {item.label}
                </span>
                {!isDisabled && !item.disabled && <ChevronRight className="w-3.5 h-3.5 text-stone-700 shrink-0" />}
                {isDisabled && item.unavailableReason && (
                  <span className="text-[10px] text-stone-700 shrink-0 max-w-[120px] text-right">
                    {item.unavailableReason}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* S2: Onun Zihninde — yapısal anılar (duygu yüklü, travmalar kalıcı) */}
      {(npc.anilar || []).filter(m => m.hedef === "player").length > 0 ? (
        <div className="card-frame p-4 mt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Brain className="w-3.5 h-3.5 text-amber-600" />
            <span className="label-tiny">Onun Zihninde</span>
          </div>
          <ul className="space-y-1.5">
            {(npc.anilar || []).filter(m => m.hedef === "player")
              .sort((a, b) => Math.abs(b.duygu_yuku) - Math.abs(a.duygu_yuku))
              .slice(0, 5)
              .map((m, i) => {
                const ay = (state.turn || 0) - (m.hafta || 0);
                const zaman = ay < 2 ? "geçenlerde" : ay < 12 ? `${ay} ay önce` : `${Math.round(ay / 12)} yıl önce`;
                return (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 mt-0.5">
                      {m.travma ? "⚡" : m.duygu_yuku > 0 ? "🤍" : "🩸"}
                    </span>
                    <span className={`flex-1 italic leading-snug ${
                      m.travma ? "text-red-300"
                      : m.duygu_yuku > 0 ? "text-emerald-300/90" : "text-orange-300/90"
                    }`}>
                      {m.detay || m.tur.replace(/_/g, " ")}
                      <span className="text-stone-600 not-italic"> — {zaman}</span>
                      {m.travma && <span className="text-red-400 not-italic font-heading text-[9px] tracking-wider"> · ASLA UNUTMAZ</span>}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      ) : (npc.memory || []).length > 0 && (
        <div className="card-frame p-4 mt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Brain className="w-3.5 h-3.5 text-stone-600" />
            <span className="label-tiny">Hafıza</span>
          </div>
          <ul className="space-y-1">
            {(npc.memory || []).slice(-5).reverse().map((m, i) => (
              <li key={i} className="flex justify-between gap-2 text-xs text-stone-500">
                <span>Gün {m.day}: <span className="text-stone-400">{m.topic}</span></span>
                <span className={m.delta > 0 ? "text-emerald-500" : m.delta < 0 ? "text-red-400" : "text-stone-600"}>
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Modals ── */}
      {modal === "chat" && (
        <ChatModal npc={npc} state={state} onClose={() => setModal(null)} />
      )}
      {modal === "gift" && (
        <GiftModal
          inventory={player.inventory}
          onPick={(item, qty) => handleAction("gift", { item, qty })}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "money" && (
        <MoneyModal
          playerMoney={player.money}
          onGive={(amount) => handleAction("money", { amount })}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── Result bubble ── */}
      {result && (
        <ResultBubble
          text={result.text}
          gain={result.gain}
          consequences={result.consequences}
          cascade={result.cascade}
          npcMood={result.npcMood}
          onClose={() => setResult(null)}
        />
      )}
    </div>
  );
}
