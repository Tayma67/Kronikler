import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

/**
 * LifeEventModal
 * Advance_time sonrasında tetiklenen life event popup'ı.
 * Dashboard'dan kontrol edilir: <LifeEventModal open={show} onClose={...} onComplete={...} />
 */
export default function LifeEventModal({ open, onClose, onComplete }) {
  const [event, setEvent] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chosenIndex, setChosenIndex] = useState(null);

  const fetchPending = useCallback(async () => {
    try {
      const res = await api.get("/life-event/pending");
      const ev = res.data.event || null;
      setEvent(ev);
      if (!ev && onClose) onClose();   // event yoksa zinciri devret (→ hikâye popup'ı)
    } catch {
      setEvent(null);
      if (onClose) onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setResult(null);
      setChosenIndex(null);
      fetchPending();
    }
  }, [open, fetchPending]);

  if (!open || !event) return null;

  const choose = async (index) => {
    if (loading) return;
    setLoading(true);
    setChosenIndex(index);
    try {
      const res = await api.post("/life-event/choose", {
        event_id: event.id,
        choice_index: index,
      });
      setResult(res.data);
    } catch (err) {
      setResult({
        result_text: "Bir hata oluştu. Lütfen tekrar dene.",
        event_title: event.title,
        effects_applied: {},
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEvent(null);
    setResult(null);
    setChosenIndex(null);
    if (onComplete) onComplete();
    if (onClose) onClose();
  };

  /* ─── Efekt özeti ─── */
  const EffectBadge = ({ label, value }) => {
    const positive = value > 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
          positive
            ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50"
            : "bg-red-900/60 text-red-300 border border-red-700/50"
        }`}
      >
        {positive ? "+" : ""}
        {value} {label}
      </span>
    );
  };

  const statLabels = {
    money: "altın", health: "sağlık", hunger: "açlık", crime: "suç",
    reputation: "itibar", honor: "şeref", fear: "korku", fame: "ün",
    strength: "güç", intelligence: "zeka", charisma: "karizama", stamina: "dayanıklılık",
    combat: "savaş", trade: "ticaret", crafting: "zanaat", social: "sosyal",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-amber-600/40 shadow-2xl overflow-hidden"
        style={{ background: "linear-gradient(160deg, #1c1814 0%, #111 100%)" }}
      >
        {/* Üst şerit */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #92400e, #d97706, #92400e)" }} />

        <div className="p-6 space-y-4">
          {/* ── SEÇİM EKRANI ── */}
          {!result && (
            <>
              {/* İkon */}
              <div className="text-center text-5xl leading-tight">{event.icon}</div>

              {/* Başlık */}
              <h2 className="text-amber-400 text-lg font-bold text-center leading-snug">
                {event.title}
              </h2>

              {/* Açıklama */}
              <p className="text-zinc-300 text-sm text-center leading-relaxed">
                {event.description}
              </p>

              {/* Seçenekler */}
              <div className="space-y-2 pt-1">
                {event.choices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={loading}
                    className={`w-full text-left rounded-xl px-4 py-3 text-sm transition-all
                      border border-zinc-600/60
                      ${loading && chosenIndex === i
                        ? "bg-amber-900/40 border-amber-600/60 text-amber-200"
                        : "bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 hover:border-zinc-500"
                      }
                      ${loading && chosenIndex !== i ? "opacity-40 cursor-not-allowed" : ""}
                    `}
                  >
                    <span className="mr-2 text-amber-500 font-bold">{i + 1}.</span>
                    {choice.text}
                    {loading && chosenIndex === i && (
                      <span className="ml-2 text-amber-400 animate-pulse">...</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── SONUÇ EKRANI ── */}
          {result && (
            <>
              <div className="text-center text-5xl leading-tight">✅</div>
              <h2 className="text-amber-400 text-lg font-bold text-center">
                {result.event_title}
              </h2>
              <p className="text-zinc-200 text-sm text-center leading-relaxed bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/40">
                {result.result_text}
              </p>

              {/* Efektler */}
              {result.effects_applied &&
                Object.keys(result.effects_applied).filter(k =>
                  typeof result.effects_applied[k] === "number"
                ).length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {Object.entries(result.effects_applied)
                    .filter(([k, v]) => typeof v === "number")
                    .map(([k, v]) => (
                      <EffectBadge
                        key={k}
                        label={statLabels[k] || k}
                        value={v}
                      />
                    ))}
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full rounded-xl py-3 font-semibold text-white transition-colors"
                style={{ background: "linear-gradient(135deg, #92400e, #b45309)" }}
              >
                Devam Et
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
