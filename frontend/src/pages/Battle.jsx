import { useEffect, useState, useCallback } from "react";
import { useGame } from "@/lib/GameContext";
import { playSfx } from "@/lib/audio";
import { useNavigate } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import {
  Sword, Shield, Loader2, Heart, Zap, Lock, Flag,
  Swords, Crown, Trophy, Castle, Skull, Bandage, Crosshair,
} from "lucide-react";

/* ── Sabitler ──────────────────────────────────────────────────────── */
const TYPE_ICONS = {
  duello: Swords, soygun: Crosshair, turnuva: Trophy, kusatma: Castle,
};
const STANCE_DESC = {
  "saldırgan": "Saldırı +%35 · Savunma -%30",
  "dengeli": "Dengeli saldırı ve savunma",
  "savunmacı": "Savunma +%40 · Saldırı -%30",
};
const CARD_ICONS = { hamle: Sword, savustur: Shield, ozel: Zap };
const CARD_HINTS = {
  hamle: "Özel Yeteneği bozar",
  savustur: "Hamleyi savuşturur",
  ozel: "Savuşturanı delip geçer",
};

function HpBar({ label, hp, maxHp, color }) {
  const pct = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-stone-400">{label}</span>
        <span className="text-stone-500">{hp}/{maxHp}</span>
      </div>
      <div className="h-2 bg-stone-900 rounded-sm overflow-hidden border border-stone-800">
        <div className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── Yara listesi ──────────────────────────────────────────────────── */
function InjuryList({ injuries }) {
  if (!injuries?.length) return null;
  return (
    <div className="border border-red-900/30 bg-red-950/10 rounded-sm p-3 space-y-1.5">
      <h3 className="text-[10px] font-heading tracking-widest text-red-400/80 uppercase flex items-center gap-1.5">
        <Bandage className="w-3 h-3" /> Yaraların
      </h3>
      {injuries.map((inj, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <span className="text-stone-300">{inj.label}
            <span className="text-stone-600 ml-1">({inj.stat} {inj.delta})</span></span>
          <span className="text-[10px] text-stone-500">
            {inj.permanent ? "Kalıcı" : `${inj.weeks_left} ay`}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Sonuç ekranı ──────────────────────────────────────────────────── */
function ResultScreen({ result, onClose }) {
  const won = result.outcome === "zafer";
  const dead = result.outcome === "ölüm";
  return (
    <div className="border rounded-sm p-4 space-y-3 text-center"
      style={{ borderColor: won ? "#065f46" : "#7f1d1d",
               background: won ? "rgba(6,95,70,0.08)" : "rgba(127,29,29,0.08)" }}>
      {dead ? <Skull className="w-8 h-8 mx-auto text-red-500" />
        : won ? <Trophy className="w-8 h-8 mx-auto text-amber-400" />
        : <Flag className="w-8 h-8 mx-auto text-stone-500" />}
      <h2 className={`font-heading text-lg ${won ? "text-emerald-300" : "text-red-300"}`}>
        {dead ? "ÖLÜM" : won ? "ZAFER!" : result.outcome === "kaçış" ? "Geri Çekildin" : "Yenilgi"}
      </h2>
      <div className="text-left space-y-1 max-h-44 overflow-y-auto border border-stone-800/50 rounded-sm p-2">
        {result.log.map((l, i) => (
          <p key={i} className="text-[11px] text-stone-400 leading-relaxed">{l}</p>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 text-xs">
        {result.loot != null && result.loot !== 0 && (
          <span className={result.loot > 0 ? "text-amber-400" : "text-red-400"}>
            {result.loot > 0 ? "+" : ""}{result.loot} altın
          </span>
        )}
        {result.injury && (
          <span className="text-red-300 flex items-center gap-1">
            <Bandage className="w-3 h-3" /> {result.injury.label}
          </span>
        )}
        {result.rep_change ? (
          <span className={result.rep_change > 0 ? "text-emerald-400" : "text-red-400"}>
            İtibar {result.rep_change > 0 ? "+" : ""}{result.rep_change}
          </span>
        ) : null}
      </div>
      <button onClick={onClose}
        className="w-full py-2 rounded-sm text-xs font-heading border border-stone-700 text-stone-300 hover:bg-stone-900">
        Devam Et
      </button>
    </div>
  );
}

/* ── Aktif çatışma ─────────────────────────────────────────────────── */
function ActiveCombat({ combat, busy, onStance, onCard, onFlee, playerMaxHp }) {
  return (
    <div className="border border-orange-900/40 bg-stone-950/40 rounded-sm p-4 space-y-4"
      data-testid="active-combat">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm text-orange-300">{combat.type_label}</h2>
        <div className="flex items-center gap-2 text-[10px] text-stone-500">
          {combat.stages > 1 && <span>Aşama {combat.stage}/{combat.stages}</span>}
          {combat.phase === "catisma" && <span>Tur {combat.round}/{combat.max_rounds}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <HpBar label="Sen" hp={combat.player_hp} maxHp={playerMaxHp || 100} color="bg-emerald-600" />
        <HpBar label={combat.enemy.name} hp={combat.enemy.hp} maxHp={combat.enemy.max_hp} color="bg-red-600" />
      </div>

      {combat.phase === "hazirlik" ? (
        <div className="space-y-2">
          <p className="text-xs text-stone-400">Duruşunu seç:</p>
          {Object.entries(combat.stances).map(([key, s]) => (
            <button key={key} disabled={busy} onClick={() => onStance(key)}
              className="w-full text-left px-3 py-2 rounded-sm border border-stone-700 hover:border-orange-800 hover:bg-stone-900 transition-colors">
              <div className="text-xs text-stone-200 font-heading">{s.label}</div>
              <div className="text-[10px] text-stone-500">{STANCE_DESC[key]}</div>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="border border-purple-900/40 bg-purple-950/10 rounded-sm px-3 py-2">
            <p className="text-[11px] text-purple-200 italic">👁 {combat.intent}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {combat.cards.map((c) => {
              const Icon = CARD_ICONS[c.id];
              return (
                <button key={c.id} disabled={busy || c.locked}
                  onClick={() => onCard(c.id)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-sm border transition-colors ${
                    c.locked
                      ? "border-stone-800 text-stone-600 cursor-not-allowed"
                      : "border-stone-700 text-stone-200 hover:border-orange-800 hover:bg-stone-900"}`}>
                  {c.locked ? <Lock className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  <span className="text-[11px] font-heading">{c.label}</span>
                  <span className="text-[8px] text-stone-500 px-1 text-center">
                    {c.locked ? "Savaş bec. 3+" : CARD_HINTS[c.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="space-y-1 max-h-28 overflow-y-auto border-t border-stone-800/50 pt-2">
        {combat.log.slice(-5).map((l, i) => (
          <p key={i} className="text-[10px] text-stone-500 leading-relaxed">{l}</p>
        ))}
      </div>

      <button disabled={busy} onClick={onFlee}
        className="w-full py-1.5 rounded-sm text-[11px] border border-stone-800 text-stone-500 hover:text-red-400 hover:border-red-900 flex items-center justify-center gap-1.5">
        <Flag className="w-3 h-3" /> Kaç (itibar bedeli)
      </button>
    </div>
  );
}

/* ── Komutan modu ──────────────────────────────────────────────────── */
function CommanderPanel({ decisions, busy, onCommand }) {
  const [picks, setPicks] = useState({});
  const ready = decisions && Object.keys(decisions).every((k) => picks[k]);
  return (
    <div className="border border-amber-900/40 bg-amber-950/10 rounded-sm p-3.5 space-y-3">
      <h2 className="text-xs font-heading tracking-widest text-amber-400 uppercase flex items-center gap-1.5">
        <Crown className="w-3.5 h-3.5" /> Komutan Modu — Örgüt Savaşı
      </h2>
      <p className="text-[10px] text-stone-500">
        3 stratejik karar ver; savaşın sonucunu ±%30 etkiler. Zekan riskleri azaltır.
      </p>
      {Object.entries(decisions).map(([key, d]) => (
        <div key={key} className="space-y-1">
          <p className="text-[10px] text-stone-400 font-heading uppercase">{d.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {d.options.map((o) => (
              <button key={o.id} disabled={busy}
                onClick={() => setPicks((p) => ({ ...p, [key]: o.id }))}
                className={`text-[10px] px-2 py-1 rounded-sm border ${
                  picks[key] === o.id
                    ? "border-amber-700 text-amber-300 bg-stone-900"
                    : "border-stone-800 text-stone-400"}`}>
                {o.label} <span className="text-emerald-500">{o.bonus}</span>
                {o.risk && <span className="text-red-500/80 ml-1">risk {o.risk}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button disabled={busy || !ready} onClick={() => onCommand(picks)}
        className={`w-full py-2 rounded-sm text-xs font-heading border ${
          ready ? "border-amber-700 text-amber-300 hover:bg-stone-900"
                : "border-stone-800 text-stone-600 cursor-not-allowed"}`}>
        Orduyu Savaşa Sür
      </button>
    </div>
  );
}

/* ── Ana sayfa ─────────────────────────────────────────────────────── */
export default function Battle() {
  const { setState, setLastActionPage } = useGame();
  const navigate = useNavigate();
  const [options, setOptions] = useState(null);
  const [combat, setCombat] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [bet, setBet] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/combat/options");
      setOptions(data);
      setCombat(data.active);
    } catch (e) {
      toast.error(extractErrorMessage(e));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const act = async (fn) => {
    setBusy(true);
    try {
      const data = await fn();
      if (data?.combat) { setCombat(data.combat); setResult(null); }
      if (data?.result) {
        setResult(data.result);
        setCombat(null);
        if (data.state) setState(data.state);
      }
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onStart = (type) =>
    act(async () => (await api.post("/combat/start", { type, bet: type === "turnuva" ? bet : 0 })).data);
  const onStance = (stance) =>
    act(async () => (await api.post("/combat/stance", { stance })).data);
  const onCard = (card) => {
    playSfx("sword");
    return act(async () => (await api.post("/combat/card", { card })).data);
  };
  const onFlee = () =>
    act(async () => (await api.post("/combat/flee")).data);
  const onCommand = (picks) =>
    act(async () => (await api.post("/combat/commander", picks)).data);

  if (!options) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-stone-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-5" data-testid="battle-page">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-heading text-stone-200 flex items-center gap-2">
          <Sword className="w-4 h-4 text-orange-500" /> Savaş Meydanı
        </h1>
        <span className="flex items-center gap-1 text-xs text-emerald-400">
          <Heart className="w-3 h-3" /> {options.health}
        </span>
      </div>

      {result && <ResultScreen result={result} onClose={() => {
        setResult(null);
        setLastActionPage({ path: "/oyun/savas", label: "Savaş" });
        navigate("/oyun");
      }} />}

      {combat && !result && (
        <ActiveCombat combat={combat} busy={busy} playerMaxHp={100}
          onStance={onStance} onCard={onCard} onFlee={onFlee} />
      )}

      {!combat && !result && (
        <>
          <InjuryList injuries={options.injuries} />
          <div className="space-y-2">
            <h2 className="text-xs font-heading tracking-widest text-stone-500 uppercase">
              Çatışma Türleri
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {options.types.map((bt) => {
                const Icon = TYPE_ICONS[bt.id] || Sword;
                return (
                  <div key={bt.id}
                    className={`border rounded-sm p-3 space-y-2 ${
                      bt.locked ? "border-stone-800/50 opacity-60" : "border-stone-800"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-200 flex items-center gap-2">
                        <Icon className="w-4 h-4 text-orange-500/80" /> {bt.label}
                      </span>
                      {bt.critical && (
                        <span className="text-[8px] text-red-400 border border-red-900 rounded-sm px-1 py-0.5">
                          ÖLÜM RİSKİ
                        </span>
                      )}
                    </div>
                    {bt.stages > 1 && (
                      <p className="text-[10px] text-stone-500">{bt.stages} aşamalı</p>
                    )}
                    {bt.has_bet && (
                      <div className="flex items-center gap-2 text-[10px] text-stone-400">
                        Bahis:
                        {[0, 20, 50, 100].map((b) => (
                          <button key={b} onClick={() => setBet(b)}
                            className={`px-1.5 py-0.5 rounded-sm border ${
                              bet === b ? "border-amber-700 text-amber-300" : "border-stone-800 text-stone-500"}`}>
                            {b}a
                          </button>
                        ))}
                      </div>
                    )}
                    {bt.locked ? (
                      <p className="text-[10px] text-stone-600 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> {bt.lock_reason}
                      </p>
                    ) : (
                      <button disabled={busy} onClick={() => onStart(bt.id)}
                        className="w-full py-1.5 rounded-sm text-xs font-heading border border-orange-800 text-orange-400 hover:bg-stone-900">
                        Meydana Çık
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {options.commander_available && (
            <CommanderPanel decisions={options.commander_decisions}
              busy={busy} onCommand={onCommand} />
          )}
        </>
      )}
    </div>
  );
}
