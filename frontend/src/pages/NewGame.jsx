import { useEffect, useState } from "react";
import { useGame } from "@/lib/GameContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import OriginCinematic from "@/components/OriginCinematic";

// Yeni oyun ekranı: sağlanan tasarım görseli ekranın kendisidir.
// Üzerine yalnız işlevsel (tıklanabilir/yazılabilir) bölgeler bindirilir.
const BG_IMAGE = "/images/yeni_oyun.png";

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

  // Görseldeki bölgelerin yüzde konumları (kalibrasyon ızgarasıyla ölçüldü)
  const POS = {
    name:   { top: "22.9%", left: "7%",   width: "86%",   height: "4.4%" },
    erkek:  { top: "32.9%", left: "7%",   width: "42%",   height: "5.2%" },
    kiz:    { top: "32.9%", left: "51%",  width: "42%",   height: "5.2%" },
    create: { top: "92.4%", left: "6%",   width: "88%",   height: "4.8%" },
  };

  // ── Yükleme ──
  if (state === null && !loadingTimedOut) {
    return (
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0a0703",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${BG_IMAGE})`,
          backgroundSize: "cover", backgroundPosition: "center", opacity: 0.5 }} />
        <Loader2 size={30} color="var(--color-gold)" className="animate-spin"
          style={{ position: "relative", zIndex: 2, filter: "drop-shadow(0 0 8px rgba(201,168,76,0.5))" }} />
        {slowBackend && (
          <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: "16rem" }}>
            <p className="font-serif" style={{ fontStyle: "italic", color: "var(--color-parchment-dim)", fontSize: "0.85rem" }}>
              Diyar uyanıyor…
            </p>
          </div>
        )}
      </div>
    );
  }

  const genderHotspot = (val, pos) => {
    const active = gender === val;
    return (
      <button type="button" disabled={busy} onClick={() => setGender(val)}
        data-testid={`new-game-gender-${val}`}
        style={{
          position: "absolute", ...pos,
          cursor: busy ? "default" : "pointer",
          background: active ? "rgba(201,168,76,0.16)" : "transparent",
          border: active ? "1.5px solid rgba(201,168,76,0.85)" : "1.5px solid transparent",
          borderRadius: "9px",
          boxShadow: active ? "0 0 16px rgba(201,168,76,0.45), inset 0 0 12px rgba(201,168,76,0.12)" : "none",
          transition: "all 0.18s",
        }} />
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0a0703",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Görsel kendi en/boy oranına kilitli: her ekranda tam görünür,
          tıklanabilir bölgeler (yüzde) görselle birebir hizalı kalır. */}
      <div style={{
        position: "relative",
        width: "min(100vw, calc(100dvh * 853 / 1844))",
        aspectRatio: "853 / 1844",
        backgroundImage: `url(${BG_IMAGE})`,
        backgroundSize: "cover", backgroundPosition: "center",
      }}>
        {origin && (
          <OriginCinematic
            name={origin.name}
            gender={origin.gender}
            onClose={() => { setOrigin(null); navigate("/oyun"); }}
          />
        )}

        {/* Ad Soyad — yazılabilir alan (görseldeki kutuyu kaplar) */}
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Adını ve soyadını gir"
          maxLength={32}
          disabled={busy}
          data-testid="new-game-firstname"
          style={{
            position: "absolute", ...POS.name,
            background: "rgba(14,10,6,0.78)",
            border: "1px solid rgba(160,130,70,0.30)",
            borderRadius: "7px",
            color: "#ece0c4", fontSize: "0.92rem",
            fontFamily: "'Crimson Text', serif",
            padding: "0 0.95rem", outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* Cinsiyet — tıklanabilir bölgeler (görseldeki butonların üzerinde) */}
        {genderHotspot("erkek", POS.erkek)}
        {genderHotspot("kadın", POS.kiz)}

        {/* Dünyayı Yarat — tıklanabilir buton bölgesi */}
        <button
          type="button"
          onClick={start}
          disabled={busy}
          data-testid="new-game-start"
          style={{
            position: "absolute", ...POS.create,
            background: "transparent", border: "none", cursor: busy ? "wait" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            borderRadius: "8px",
          }}>
          {busy && <Loader2 size={16} className="animate-spin" color="#1a1206" />}
        </button>

        {/* Hata mesajı */}
        {error && (
          <div data-testid="new-game-error" className="font-serif" style={{
            position: "absolute", top: "40%", left: "7%", right: "7%",
            textAlign: "center", fontSize: "0.82rem", color: "#ff9b8a",
            textShadow: "0 1px 6px rgba(0,0,0,0.9)",
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
