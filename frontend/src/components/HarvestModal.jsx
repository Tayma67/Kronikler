import { useEffect, useState } from "react";

/**
 * HarvestModal — R1/R9 Hafta Sonu Hasadı (GDD v7).
 * Üç bölüm: MANŞET (kademeli açılan büyük olay) · KAZANÇLAR (animasyonlu
 * delta satırları) · KULAK MİSAFİRİ (gelecek haftaya merak kancası).
 * advance yanıtındaki `hafta_hasadi` ile beslenir.
 */
export default function HarvestModal({ harvest, onClose }) {
  const [stage, setStage] = useState(0); // kademeli açılış: 0→manşet→1→kazanç→2→kulak

  useEffect(() => {
    if (!harvest) return;
    setStage(0);
    const t1 = setTimeout(() => setStage(1), 350);
    const t2 = setTimeout(() => setStage(2), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [harvest]);

  if (!harvest) return null;

  const { manset, kazanclar = [], kulak_misafiri } = harvest;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16,
      background: "rgba(0,0,0,0.82)",
    }}>
      <div style={{
        width: "100%", maxWidth: 380, borderRadius: 14, overflow: "hidden",
        background: "linear-gradient(160deg, #1c1814 0%, #100d09 100%)",
        border: "1px solid rgba(201,168,76,0.45)",
        boxShadow: "0 0 40px rgba(201,168,76,0.12), 0 18px 50px rgba(0,0,0,0.8)",
      }}>
        <div style={{ height: 4, background: "linear-gradient(90deg, #5A4010, #C9A84C, #5A4010)" }} />

        <div style={{ padding: "1.1rem 1.2rem", display: "flex", flexDirection: "column", gap: 14, maxHeight: "78vh", overflowY: "auto" }}>

          {/* ── MANŞET ── */}
          <div className={stage >= 0 ? "card-enter" : ""} style={{ opacity: stage >= 0 ? 1 : 0 }}>
            <div style={{
              fontFamily: "'Cinzel', serif", fontSize: "0.52rem", fontWeight: 700,
              letterSpacing: "0.28em", color: "#C9A84C", marginBottom: 6,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span>📜</span> BU HAFTANIN MANŞETİ
            </div>
            <p style={{
              margin: 0, fontFamily: "'Lora', serif",
              fontSize: manset?.weight >= 7 ? "0.95rem" : "0.84rem",
              fontWeight: manset?.weight >= 7 ? 600 : 400,
              fontStyle: "italic", lineHeight: 1.55,
              color: manset?.weight >= 7 ? "#F0C040" : "#D8C8A0",
            }}>
              {manset?.text || "Sakin bir hafta geçti."}
            </p>
          </div>

          {/* ── KAZANÇLAR ── */}
          {kazanclar.length > 0 && (
            <div className={stage >= 1 ? "card-enter" : ""} style={{ opacity: stage >= 1 ? 1 : 0 }}>
              <div style={{
                fontFamily: "'Cinzel', serif", fontSize: "0.52rem", fontWeight: 700,
                letterSpacing: "0.28em", color: "#C9A84C", marginBottom: 6,
              }}>⚖️ KAZANÇLAR & KAYIPLAR</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {kazanclar.slice(0, 7).map((k, i) => (
                  <div key={i} className="stat-pop"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.32rem 0.55rem", borderRadius: 7,
                      background: k.positive ? "rgba(39,174,96,0.08)" : "rgba(192,57,43,0.08)",
                      border: `1px solid ${k.positive ? "rgba(39,174,96,0.3)" : "rgba(192,57,43,0.3)"}`,
                      animationDelay: `${i * 90}ms`,
                    }}>
                    <span style={{ fontFamily: "'Lora', serif", fontSize: "0.72rem", color: "#D8C8A0" }}>
                      {k.label}
                    </span>
                    <span style={{
                      fontFamily: "'Cinzel', serif", fontSize: "0.72rem", fontWeight: 700,
                      color: k.positive ? "#4ADE80" : "#F87171",
                    }}>
                      {k.positive ? "▲" : "▼"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── KULAK MİSAFİRİ ── */}
          {kulak_misafiri?.text && (
            <div className={stage >= 2 ? "card-enter" : ""} style={{
              opacity: stage >= 2 ? 1 : 0,
              borderTop: "1px solid rgba(201,168,76,0.15)", paddingTop: 11,
            }}>
              <div style={{
                fontFamily: "'Cinzel', serif", fontSize: "0.52rem", fontWeight: 700,
                letterSpacing: "0.28em", color: "#9B59B6", marginBottom: 5,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span>👂</span> KULAK MİSAFİRİ
                {kulak_misafiri.actionable && (
                  <span style={{
                    fontSize: "0.42rem", color: "#F0C040",
                    border: "1px solid rgba(240,192,64,0.4)", borderRadius: 4,
                    padding: "1px 4px", letterSpacing: "0.12em",
                  }}>İPUCU</span>
                )}
              </div>
              <p style={{
                margin: 0, fontFamily: "'Lora', serif", fontSize: "0.74rem",
                fontStyle: "italic", lineHeight: 1.5, color: "#A09070",
              }}>
                "{kulak_misafiri.text}"
              </p>
            </div>
          )}

          <button onClick={onClose} style={{
            width: "100%", padding: "0.7rem", borderRadius: 10, cursor: "pointer",
            background: "linear-gradient(180deg, rgba(146,64,14,0.3), rgba(146,64,14,0.12))",
            border: "1px solid rgba(201,168,76,0.5)",
            fontFamily: "'Cinzel', serif", fontSize: "0.72rem", fontWeight: 700,
            letterSpacing: "0.15em", color: "#F0C040",
          }}>
            HAFTAYA DEVAM →
          </button>
        </div>
      </div>
    </div>
  );
}
