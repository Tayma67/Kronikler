import { useEffect, useState } from "react";
import { useGame } from "@/lib/GameContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import OriginCinematic from "@/components/OriginCinematic";

// Sinematik yeni oyun ekranı — temiz arka plan görseli + gerçek responsive form.
const BG_IMAGE = "/images/yeni_oyun_bg.png";

export default function NewGame() {
  const { state, fetchState, newGame } = useGame();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [gender, setGender]     = useState("");   // "erkek" | "kadın"
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState("");
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [slowBackend, setSlowBackend]         = useState(false);
  const [origin, setOrigin]                   = useState(null);

  useEffect(() => {
    fetchState();
    const warnTimer    = setTimeout(() => setSlowBackend(true), 5000);
    const timeoutTimer = setTimeout(() => setLoadingTimedOut(true), 12000);
    return () => { clearTimeout(warnTimer); clearTimeout(timeoutTimer); };
  }, [fetchState]);

  useEffect(() => {
    if (state && state.world && !origin && !busy) navigate("/oyun");
  }, [state, navigate, origin, busy]);

  const start = async (e) => {
    if (e) e.preventDefault();
    setError("");
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
      setOrigin({ name: first, gender });
    } catch (err) {
      setError(err?.response?.data?.detail || "Oyun başlatılamadı. Lütfen tekrar dene.");
    } finally {
      setBusy(false);
    }
  };

  // Atmosferik degrade örtüsü — metin okunabilirliği için
  const Overlays = () => (
    <>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${BG_IMAGE})`,
        backgroundSize: "cover", backgroundPosition: "center" }} />
      <div style={{ position: "absolute", inset: 0, background:
        "linear-gradient(to bottom, rgba(8,5,2,0.82) 0%, rgba(8,5,2,0.40) 22%, rgba(8,5,2,0.10) 44%, rgba(8,5,2,0.45) 72%, rgba(8,5,2,0.92) 100%)" }} />
      <div className="grain-overlay" />
    </>
  );

  // ── Yükleme ──
  if (state === null && !loadingTimedOut) {
    return (
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0a0703",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
        <Overlays />
        <Loader2 size={30} color="var(--color-gold)" className="animate-spin"
          style={{ position: "relative", zIndex: 2, filter: "drop-shadow(0 0 8px rgba(201,168,76,0.5))" }} />
        {slowBackend && (
          <p className="font-serif" style={{ position: "relative", zIndex: 2, fontStyle: "italic",
            color: "var(--color-parchment-dim)", fontSize: "0.85rem" }}>
            Diyar uyanıyor…
          </p>
        )}
      </div>
    );
  }

  const label = (txt) => (
    <div className="font-display" style={{
      fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase",
      color: "var(--color-gold-dim)", textShadow: "0 1px 6px rgba(0,0,0,0.9)", marginBottom: "0.5rem",
    }}>{txt}</div>
  );

  const genderBtn = (val, sym, lbl) => {
    const active = gender === val;
    return (
      <button type="button" disabled={busy} onClick={() => setGender(val)}
        data-testid={`new-game-gender-${val}`}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          padding: "0.85rem", borderRadius: "9px", cursor: busy ? "default" : "pointer",
          fontFamily: "Cinzel, serif", fontSize: "0.8rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: active ? "var(--color-gold)" : "var(--color-parchment-muted)",
          background: active
            ? "linear-gradient(160deg, rgba(201,168,76,0.22) 0%, rgba(201,168,76,0.08) 100%)"
            : "rgba(8,5,2,0.62)",
          border: active ? "1px solid rgba(201,168,76,0.7)" : "1px solid rgba(160,130,70,0.28)",
          boxShadow: active ? "0 0 16px rgba(201,168,76,0.3), inset 0 1px 0 rgba(201,168,76,0.15)" : "none",
          backdropFilter: "blur(6px)", transition: "all 0.2s",
        }}>
        <span style={{ fontSize: "1.05rem", lineHeight: 1 }}>{sym}</span>
        {lbl}
      </button>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0a0703" }}>
      <Overlays />

      {origin && (
        <OriginCinematic
          name={origin.name}
          gender={origin.gender}
          onClose={() => { setOrigin(null); navigate("/oyun"); }}
        />
      )}

      <div style={{
        position: "relative", zIndex: 2, height: "100%",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        maxWidth: "460px", margin: "0 auto",
        padding: "calc(env(safe-area-inset-top, 0px) + 2.4rem) 1.5rem calc(env(safe-area-inset-bottom, 0px) + 1.6rem)",
      }}>
        {/* ── Başlık + Form ── */}
        <div className="rise-in">
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h1 className="font-display" style={{
              fontSize: "clamp(2rem, 9vw, 2.9rem)", fontWeight: 700,
              letterSpacing: "0.30em", color: "var(--color-parchment)",
              textShadow: "0 2px 22px rgba(0,0,0,0.9), 0 0 34px rgba(201,168,76,0.28)",
            }}>
              YENİ OYUN
            </h1>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", marginTop: "0.55rem" }}>
              <span style={{ height: 1, width: 44, background: "linear-gradient(to left, rgba(201,168,76,0.6), transparent)" }} />
              <span style={{ color: "var(--color-gold)", fontSize: "0.7rem", filter: "drop-shadow(0 0 6px rgba(201,168,76,0.5))" }}>⚜</span>
              <span style={{ height: 1, width: 44, background: "linear-gradient(to right, rgba(201,168,76,0.6), transparent)" }} />
            </div>
          </div>

          <form onSubmit={start} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div>
              {label("Ad Soyad")}
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Adını ve soyadını gir"
                maxLength={32}
                disabled={busy}
                data-testid="new-game-firstname"
                style={{
                  width: "100%", padding: "0.9rem 1rem", fontSize: "0.95rem",
                  background: "rgba(8,5,2,0.7)", border: "1px solid rgba(160,130,70,0.3)",
                  borderRadius: "8px", color: "var(--color-parchment)",
                  fontFamily: "'Crimson Text', serif", outline: "none",
                  backdropFilter: "blur(6px)", boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              {label("Cinsiyet")}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
                {genderBtn("erkek", "♂", "Erkek")}
                {genderBtn("kadın", "♀", "Kız")}
              </div>
            </div>

            {error && (
              <div data-testid="new-game-error" className="font-serif" style={{
                fontSize: "0.82rem", color: "#ff9b8a", textAlign: "center",
                background: "rgba(200,64,64,0.14)", border: "1px solid rgba(200,64,64,0.4)",
                borderRadius: "6px", padding: "0.55rem 0.8rem",
              }}>
                {error}
              </div>
            )}
          </form>
        </div>

        {/* ── DÜNYAYI YARAT ── */}
        <div className="rise-in">
          <button
            type="button"
            onClick={start}
            disabled={busy}
            data-testid="new-game-start"
            style={{
              width: "100%", padding: "1rem", fontSize: "0.85rem", letterSpacing: "0.22em",
              fontFamily: "Cinzel, serif", fontWeight: 700, textTransform: "uppercase",
              color: "#2a1d08", borderRadius: "9px", border: "1px solid rgba(201,168,76,0.6)",
              cursor: busy ? "wait" : "pointer",
              background: "linear-gradient(180deg, #e8d8b0 0%, #d3bd86 55%, #c0a86a 100%)",
              boxShadow: "0 0 26px rgba(201,168,76,0.3), 0 8px 22px rgba(0,0,0,0.6)",
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
