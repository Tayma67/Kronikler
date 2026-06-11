import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

/**
 * StoryModal — Hikâye yayları popup'ı.
 * Hafta ilerleyince Dashboard'da açılır: yeni hikâye teklifi varsa kancasıyla,
 * aktif hikâyenin bekleyen adımı varsa seçenekleriyle gelir.
 * Seçim yapılınca sonuç metni gösterilir; zincir devam ediyorsa
 * bir sonraki adım aynı popup içinde akar — oyuncu sayfa gezmek zorunda kalmaz.
 */

const TEST_LABELS = {
  strength: "Güç", intelligence: "Zeka", charisma: "Karizma", stamina: "Dayanıklılık",
  combat: "Savaş", trade: "Ticaret", crafting: "Zanaat", social: "Sosyal",
};

function testText(test) {
  if (!test) return null;
  const parts = [];
  for (const [k, v] of Object.entries(test.stat || {})) parts.push(`${TEST_LABELS[k] || k} ${v}`);
  for (const [k, v] of Object.entries(test.skill || {})) parts.push(`${TEST_LABELS[k] || k} ${v}`);
  return parts.join(" + ");
}

export default function StoryModal({ open, onClose, onComplete }) {
  const [offer, setOffer] = useState(null);     // {arc_id, title, hook}
  const [active, setActive] = useState(null);   // aktif yay adımı
  const [result, setResult] = useState(null);   // {ok, result, finished, ending}
  const [loading, setLoading] = useState(false);

  const fetchStory = useCallback(async () => {
    try {
      const { data } = await api.get("/story/journal");
      // Önce bekleyen aktif adım (oyuncu zaten kabul etmiş hikâye)
      const actionable = (data.active || []).find((a) => !a.waiting && a.choices?.length);
      if (actionable) {
        setActive(actionable);
        setOffer(null);
        return;
      }
      // Sonra yeni teklif
      if (data.offers?.length) {
        setOffer(data.offers[0]);
        setActive(null);
        return;
      }
      setOffer(null);
      setActive(null);
    } catch {
      setOffer(null);
      setActive(null);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setResult(null);
      fetchStory();
    }
  }, [open, fetchStory]);

  if (!open || (!offer && !active && !result)) return null;

  const handleClose = () => {
    setOffer(null); setActive(null); setResult(null);
    if (onComplete) onComplete();
    if (onClose) onClose();
  };

  const startArc = async (arcId) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.post("/story/start", { arc_id: arcId });
      const started = (data.journal?.active || []).find((a) => a.arc_id === arcId);
      setOffer(null);
      if (started && !started.waiting && started.choices?.length) {
        setActive(started);           // ilk adım hemen popup'ta akar
      } else {
        handleClose();
      }
    } catch {
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const declineArc = async (arcId) => {
    if (loading) return;
    setLoading(true);
    try { await api.post("/story/decline", { arc_id: arcId }); } catch {}
    setLoading(false);
    handleClose();
  };

  const choose = async (index) => {
    if (loading || !active) return;
    setLoading(true);
    try {
      const { data } = await api.post("/story/choose",
        { arc_id: active.arc_id, choice_index: index });
      setResult({ ...data.outcome, title: active.title });
      setActive(null);
      // Zincir devam ediyorsa sıradaki adımı hazırla (sonuç ekranından geçilir)
      if (!data.outcome?.finished && !data.outcome?.wait_weeks) {
        const next = (data.journal?.active || []).find((a) => a.arc_id !== null &&
          !a.waiting && a.choices?.length);
        if (next) setResult((r) => ({ ...r, _next: next }));
      }
    } catch {
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const continueChain = () => {
    if (result?._next) {
      setActive(result._next);
      setResult(null);
    } else {
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)" }}>
      <div className="relative w-full max-w-sm rounded-2xl border border-amber-600/40 shadow-2xl overflow-hidden"
        style={{ background: "linear-gradient(160deg, #1c1814 0%, #111 100%)" }}>
        <div className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #92400e, #d97706, #92400e)" }} />

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* ── TEKLİF: kapını çalan hikâye ── */}
          {offer && !result && (
            <>
              <div className="text-center text-5xl leading-tight">📜</div>
              <div className="text-center text-[10px] tracking-[0.25em] text-amber-600/80 uppercase">
                Yeni Bir Hikâye Kapını Çalıyor
              </div>
              <h2 className="text-amber-400 text-lg font-bold text-center leading-snug">
                {offer.title}
              </h2>
              <p className="text-zinc-300 text-sm text-center leading-relaxed italic">
                {offer.hook}
              </p>
              <div className="space-y-2 pt-1">
                <button disabled={loading} onClick={() => startArc(offer.arc_id)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-amber-200 border border-amber-600/50 hover:bg-amber-900/30 transition-colors"
                  style={{ background: "linear-gradient(180deg, rgba(146,64,14,0.25), rgba(146,64,14,0.1))" }}>
                  Hikâyeye Gir
                </button>
                <button disabled={loading} onClick={() => declineArc(offer.arc_id)}
                  className="w-full py-2 rounded-xl text-xs text-zinc-500 border border-zinc-800 hover:text-zinc-300 transition-colors">
                  Şimdi Değil
                </button>
              </div>
            </>
          )}

          {/* ── AKTİF ADIM: seçim ekranı ── */}
          {active && !result && (
            <>
              <div className="text-center text-[10px] tracking-[0.25em] text-amber-600/80 uppercase">
                {active.title}
                {active.deadline_weeks != null && (
                  <span className="ml-2 text-red-400/90">⏳ {active.deadline_weeks}h</span>
                )}
              </div>
              <p className="text-zinc-200 text-sm leading-relaxed italic text-center">
                {active.step_text}
              </p>
              <div className="space-y-2 pt-1">
                {active.choices.map((c) => {
                  const tt = testText(c.test);
                  return (
                    <button key={c.index} disabled={loading}
                      onClick={() => choose(c.index)}
                      className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-zinc-200 border border-zinc-700 hover:border-amber-600/60 hover:bg-amber-900/15 transition-colors">
                      <span>{c.text}</span>
                      {tt && (
                        <span className="block text-[10px] text-purple-300/90 mt-0.5">
                          🎲 Sınav: {tt}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── SONUÇ EKRANI ── */}
          {result && (
            <>
              <div className="text-center text-4xl leading-tight">
                {result.finished
                  ? (result.ending === "tamamlandı" ? "🏆" : "💔")
                  : (result.ok ? "✨" : "⚡")}
              </div>
              <div className="text-center text-[10px] tracking-[0.25em] text-amber-600/80 uppercase">
                {result.title}
              </div>
              <p className={`text-sm text-center leading-relaxed italic ${
                result.ok ? "text-emerald-200" : "text-red-200"}`}>
                {result.result}
              </p>
              {result.finished && (
                <p className="text-center text-xs text-zinc-400">
                  {result.ending === "tamamlandı"
                    ? "Hikâye tamamlandı — sonuçları günlüğüne yazıldı."
                    : "Hikâye kötü bitti. İzleri seninle kalacak."}
                </p>
              )}
              {result.wait_weeks ? (
                <p className="text-center text-xs text-zinc-500">
                  ⏳ Devamı {result.wait_weeks} hafta sonra — haftaları ilerlet.
                </p>
              ) : null}
              <button onClick={continueChain}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-amber-200 border border-amber-600/50 hover:bg-amber-900/30 transition-colors"
                style={{ background: "linear-gradient(180deg, rgba(146,64,14,0.25), rgba(146,64,14,0.1))" }}>
                {result._next ? "Devam Et →" : "Günlüğe Dön"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
