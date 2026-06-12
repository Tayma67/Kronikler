import { useEffect, useState } from "react";
import { useGame } from "@/lib/GameContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Sinematik ilk-izlenim: sırtı dönük çocuk, küllerin diyarına bakıyor.
const BG_IMAGE = "/images/hero/cocuk_sonbahar.jpg";

export default function NewGame() {
  const { state, fetchState, newGame } = useGame();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [gender, setGender]     = useState("");   // "erkek" | "kadın"
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState("");
  // Backend uyanmıyorsa 12 sn sonra formu yine de göster
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [slowBackend, setSlowBackend]         = useState(false);

  useEffect(() => {
    fetchState();
    const warnTimer    = setTimeout(() => setSlowBackend(true), 5000);
    const timeoutTimer = setTimeout(() => setLoadingTimedOut(true), 12000);
    return () => { clearTimeout(warnTimer); clearTimeout(timeoutTimer); };
  }, [fetchState]);

  useEffect(() => {
    if (state && state.world) navigate("/oyun");
  }, [state, navigate]);

  const start = async (e) => {
    if (e) e.preventDefault();
    setError("");
    // Tek alan → ad + soyad (backend ikisini ayrı bekler)
    const parts   = fullName.trim().split(/\s+/).filter(Boolean);
    const first   = parts[0] || "";
    const surname = parts.slice(1).join(" ");
    if (!first)            { setError("Lütfen adını gir"); return; }
    if (first.length < 2)  { setError("Ad en az 2 karakter olmalı"); return; }
    if (first.length > 20) { setError("Ad en fazla 20 karakter olmalı"); return; }
    if (surname.length > 30) { setError("İsim çok uzun"); return; }
    if (!gender)           { setError("Lütfen cinsiyetini seç"); return; }

    setBusy(true);
    try {
      await newGame(first, surname, gender);
      navigate("/oyun");
    } catch (err) {
      setError(err?.response?.data?.detail || "Oyun başlatılamadı. Lütfen tekrar dene.");
    } finally {
      setBusy(false);
    }
  };

  // Atmosferik degrade örtüsü — her katmanda metin okunabilirliği
  const Overlays = () => (
    <>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${BG_IMAGE})`,
        backgroundSize: "cover", backgroundPosition: "center 40%" }} />
      <div style={{ position: "absolute", inset: 0, background:
        "linear-gradient(to bottom, rgba(8,5,2,0.88) 0%, rgba(8,5,2,0.42) 24%, rgba(8,5,2,0.12) 46%, rgba(8,5,2,0.50) 70%, rgba(8,5,2,0.95) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background:
        "linear-gradient(to right, rgba(8,5,2,0.55), transparent 16%, transparent 84%, rgba(8,5,2,0.55))" }} />
      <div className="grain-overlay" />
    </>
  );

  // ── Yükleme: backend uyanıyor ──────────────────────────────────────────────
  if (state === null && !loadingTimedOut) {
    return (
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "var(--color-bg)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
        <Overlays />
        <Loader2 size={30} color="var(--color-gold)" className="animate-spin"
          style={{ position: "relative", zIndex: 2, filter: "drop-shadow(0 0 8px rgba(201,168,76,0.5))" }} />
        {slowBackend && (
          <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: "16rem" }}>
            <p className="font-serif" style={{ fontStyle: "italic", color: "var(--color-parchment-dim)", fontSize: "0.85rem" }}>
              Diyar uyanıyor…
            </p>
            <p className="font-serif" style={{ fontStyle: "italic", color: "var(--color-parchment-muted)", fontSize: "0.75rem", marginTop: "0.2rem" }}>
              Küller yeniden tutuşuyor, biraz sabır.
            </p>
          </div>
        )}
      </div>
    );
  }

  const genderBtn = (val, sym, lbl) => {
    const active = gender === val;
    return (
      <button key={val} type="button" disabled={busy} onClick={() => setGender(val)}
        data-testid={`new-game-gender-${val}`}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          padding: "0.8rem", borderRadius: "8px", cursor: busy ? "default" : "pointer",
          fontFamily: "Cinzel, serif", fontSize: "0.78rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: active ? "var(--color-gold)" : "var(--color-parchment-muted)",
          background: active
            ? "linear-gradient(160deg, rgba(201,168,76,0.20) 0%, rgba(201,168,76,0.07) 100%)"
            : "rgba(8,5,2,0.55)",
          border: active ? "1px solid rgba(201,168,76,0.55)" : "1px solid var(--color-border-hi)",
          boxShadow: active ? "0 0 16px rgba(201,168,76,0.25), inset 0 1px 0 rgba(201,168,76,0.15)" : "none",
          backdropFilter: "blur(6px)", transition: "all 0.2s",
        }}>
        <span style={{ fontSize: "1.05rem", lineHeight: 1 }}>{sym}</span>
        {lbl}
      </button>
    );
  };

  // ── Sinematik yeni oyun ekranı ──────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "var(--color-bg)" }}>
      <Overlays />

      <div style={{
        position: "relative", zIndex: 2, height: "100%",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        maxWidth: "460px", margin: "0 auto",
        padding: "calc(env(safe-area-inset-top, 0px) + 2.4rem) 1.4rem calc(env(safe-area-inset-bottom, 0px) + 1.6rem)",
      }}>
        {/* ── Başlık + Form ── */}
        <div className="rise-in">
          <div style={{ textAlign: "center", marginBottom: "1.9rem" }}>
            <h1 className="font-display" style={{
              fontSize: "clamp(1.9rem, 9vw, 2.8rem)", fontWeight: 700,
              letterSpacing: "0.30em", color: "var(--color-gold)",
              textShadow: "0 2px 22px rgba(0,0,0,0.9), 0 0 34px rgba(201,168,76,0.32)",
            }}>
              YENİ OYUN
            </h1>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", marginTop: "0.55rem" }}>
              <span style={{ height: 1, width: 48, background: "linear-gradient(to left, rgba(201,168,76,0.6), transparent)" }} />
              <span style={{ color: "var(--color-gold)", fontSize: "0.72rem", filter: "drop-shadow(0 0 6px rgba(201,168,76,0.5))" }}>⚜</span>
              <span style={{ height: 1, width: 48, background: "linear-gradient(to right, rgba(201,168,76,0.6), transparent)" }} />
            </div>
            <p className="font-serif" style={{
              fontSize: "0.8rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
              marginTop: "0.7rem", textShadow: "0 1px 8px rgba(0,0,0,0.9)",
            }}>
              Yedi yaşındasın. Küllerin diyarında bir ömür seni bekliyor.
            </p>
          </div>

          <form onSubmit={start} style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
            <div>
              <label className="label-tiny" style={{ display: "block", marginBottom: "0.5rem", letterSpacing: "0.22em" }}>
                Ad Soyad
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Adını ve soyadını gir"
                maxLength={32}
                disabled={busy}
                data-testid="new-game-firstname"
                style={{ width: "100%", padding: "0.85rem 1rem", fontSize: "0.95rem" }}
              />
            </div>

            <div>
              <label className="label-tiny" style={{ display: "block", marginBottom: "0.5rem", letterSpacing: "0.22em" }}>
                Cinsiyet
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
                {genderBtn("erkek", "♂", "Erkek")}
                {genderBtn("kadın", "♀", "Kız")}
              </div>
            </div>

            {error && (
              <div data-testid="new-game-error" className="font-serif" style={{
                fontSize: "0.82rem", color: "var(--color-blood)",
                background: "rgba(200,64,64,0.12)", border: "1px solid rgba(200,64,64,0.4)",
                borderRadius: "6px", padding: "0.55rem 0.8rem",
              }}>
                {error}
              </div>
            )}
          </form>
        </div>

        {/* ── DÜNYAYI YARAT ── */}
        <div className="rise-in" style={{ marginTop: "1.4rem" }}>
          <button
            type="button"
            onClick={start}
            disabled={busy || !gender || !fullName.trim()}
            data-testid="new-game-start"
            className="btn-ember"
            style={{
              width: "100%", padding: "1rem", fontSize: "0.85rem", letterSpacing: "0.22em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
            }}
          >
            {busy
              ? <><Loader2 size={16} className="animate-spin" /> DÜNYA YARATILIYOR…</>
              : "DÜNYAYI YARAT"}
          </button>
        </div>
      </div>
    </div>
  );
}
