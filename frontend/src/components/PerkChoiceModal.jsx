import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

/**
 * PerkChoiceModal — Adım 16
 * Skill seviye atlayınca gösterilen dramatik perk seçim ekranı.
 * Dashboard'dan kontrol edilir: <PerkChoiceModal open={show} onClose={...} onComplete={...} />
 */

const SKILL_COLOR = {
  combat:   { border: "border-red-600/50",    glow: "#7f1d1d",  accent: "text-red-400",    bg: "from-red-950/40",    bar: "#dc2626" },
  trade:    { border: "border-amber-600/50",  glow: "#78350f",  accent: "text-amber-400",  bg: "from-amber-950/40",  bar: "#d97706" },
  crafting: { border: "border-blue-600/50",   glow: "#1e3a5f",  accent: "text-blue-400",   bg: "from-blue-950/40",   bar: "#2563eb" },
  social:   { border: "border-emerald-600/50",glow: "#14532d",  accent: "text-emerald-400",bg: "from-emerald-950/40",bar: "#16a34a" },
};

const SKILL_ICON = {
  combat: "⚔️",
  trade: "💰",
  crafting: "🔨",
  social: "🗣️",
};

export default function PerkChoiceModal({ open, onClose, onComplete }) {
  const [pending, setPending] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("reveal"); // "reveal" → "choose" → "result"

  const fetchPending = useCallback(async () => {
    try {
      const res = await api.get("/perk/pending");
      setPending(res.data.pending_perk || null);
      setPhase("reveal");
      setSelected(null);
      setConfirmed(false);
      setResult(null);
    } catch {
      setPending(null);
    }
  }, []);

  useEffect(() => {
    if (open) fetchPending();
  }, [open, fetchPending]);

  // Otomatik "reveal" → "choose" geçişi (1.5s animasyon)
  useEffect(() => {
    if (phase === "reveal" && pending) {
      const t = setTimeout(() => setPhase("choose"), 1500);
      return () => clearTimeout(t);
    }
  }, [phase, pending]);

  if (!open || !pending) return null;

  const skill = pending.skill;
  const colors = SKILL_COLOR[skill] || SKILL_COLOR.social;
  const skillIcon = SKILL_ICON[skill] || "⭐";

  const confirmChoice = async () => {
    if (!selected || loading) return;
    setLoading(true);
    try {
      const res = await api.post("/perk/choose", {
        skill: pending.skill,
        level: pending.level,
        perk_key: selected.key,
      });
      setResult(res.data);
      setPhase("result");
    } catch (err) {
      setResult({
        ok: false,
        perk_name: selected.name,
        perk_desc: "Bir hata oluştu. Perk kaydedilemedi.",
        perk_icon: "❌",
      });
      setPhase("result");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPending(null);
    setSelected(null);
    setConfirmed(false);
    setResult(null);
    setPhase("reveal");
    if (onComplete) onComplete();
    if (onClose) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)" }}
    >
      <div
        className={`relative w-full max-w-sm rounded-2xl border ${colors.border} shadow-2xl overflow-hidden`}
        style={{
          background: `linear-gradient(160deg, #0f0f0e 0%, #161210 100%)`,
          boxShadow: `0 0 60px ${colors.glow}88`,
        }}
      >
        {/* Üst şerit */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${colors.bar}, transparent)` }}
        />

        <div className="p-6 space-y-5">

          {/* ── REVEAL PHASE ── */}
          {phase === "reveal" && (
            <div className="text-center space-y-3 animate-pulse">
              <div className="text-6xl">{skillIcon}</div>
              <div className={`text-2xl font-bold ${colors.accent}`}>
                Seviye Atladın!
              </div>
              <div className="text-zinc-400 text-sm">
                {pending.skill_name_tr} · Seviye {pending.level}
              </div>
              <div className="text-zinc-500 text-xs">Yeni yetenek açılıyor...</div>
            </div>
          )}

          {/* ── CHOOSE PHASE ── */}
          {phase === "choose" && (
            <>
              {/* Başlık */}
              <div className="text-center space-y-1">
                <div className="text-4xl">{skillIcon}</div>
                <div className={`text-lg font-bold ${colors.accent}`}>
                  {pending.skill_name_tr} — Seviye {pending.level}
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Bir yetenek seç. Bu seçim <span className="text-zinc-200 font-semibold">geri alınamaz.</span>
                </p>
              </div>

              {/* Seçenekler */}
              <div className="space-y-2.5">
                {pending.options.map((opt) => {
                  const isSelected = selected?.key === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setSelected(opt)}
                      className={`w-full text-left rounded-xl px-4 py-3 transition-all duration-200
                        border ${isSelected
                          ? `${colors.border} bg-zinc-800/60`
                          : "border-zinc-700/40 bg-zinc-900/60 hover:bg-zinc-800/40 hover:border-zinc-600/60"
                        }`}
                      style={isSelected ? { boxShadow: `0 0 12px ${colors.glow}66` } : {}}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">{opt.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold text-sm mb-0.5 ${isSelected ? colors.accent : "text-zinc-200"}`}>
                            {opt.name}
                          </div>
                          <div className="text-zinc-400 text-xs leading-relaxed">
                            {opt.desc}
                          </div>
                          <div className={`text-xs mt-1.5 font-mono ${isSelected ? colors.accent : "text-zinc-500"}`}>
                            → {opt.effect_preview}
                          </div>
                        </div>
                        {isSelected && (
                          <span className={`text-lg flex-shrink-0 ${colors.accent}`}>✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Onayla butonu */}
              <button
                onClick={confirmChoice}
                disabled={!selected || loading}
                className={`w-full rounded-xl py-3 font-bold text-sm transition-all duration-200 ${
                  selected && !loading
                    ? "text-white opacity-100"
                    : "text-zinc-500 opacity-40 cursor-not-allowed"
                }`}
                style={
                  selected && !loading
                    ? { background: `linear-gradient(135deg, ${colors.glow}, ${colors.bar})` }
                    : { background: "#27272a" }
                }
              >
                {loading ? "Kaydediliyor..." : selected ? `"${selected.name}" seçimini onayla` : "Bir seçenek seç"}
              </button>

              <p className="text-center text-zinc-600 text-xs">
                ⚠ Seçim geri alınamaz
              </p>
            </>
          )}

          {/* ── RESULT PHASE ── */}
          {phase === "result" && result && (
            <div className="text-center space-y-4">
              {/* İkon */}
              <div className="text-6xl">{result.perk_icon || "⭐"}</div>

              {/* Başlık */}
              <div>
                <div className={`text-xl font-bold ${colors.accent}`}>
                  {result.perk_name}
                </div>
                <div className="text-zinc-500 text-xs mt-1">
                  {pending.skill_name_tr} Seviye {pending.level} Yeteneği
                </div>
              </div>

              {/* Açıklama */}
              <div className="bg-zinc-900/60 border border-zinc-700/40 rounded-xl p-4">
                <p className="text-zinc-200 text-sm leading-relaxed">
                  {result.perk_desc}
                </p>
              </div>

              {/* Kalıcılık notu */}
              <p className="text-zinc-500 text-xs italic">
                Bu yetenek artık karakterinin bir parçası.
              </p>

              <button
                onClick={handleClose}
                className="w-full rounded-xl py-3 font-bold text-white transition-colors"
                style={{ background: `linear-gradient(135deg, ${colors.glow}, ${colors.bar})` }}
              >
                Devam Et
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
