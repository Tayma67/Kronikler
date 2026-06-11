import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

/**
 * WeekPlanCard — R1 Hafta Planı (GDD v7).
 * Kompakt satır: "PLAN: Çalış + Pazar + Dua ✏️" — dokununca 3 slotlu
 * seçici açılır. Varsayılan plan hatırlanır; istemeyen oyuncu tek
 * dokunuşla ilerlemeye devam eder (mobil akıcılık korunur).
 */
export default function WeekPlanCard() {
  const [data, setData] = useState(null);   // {mevcut_plan, beklenti, secenekler}
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get("/game/hafta-plani");
      setData(res.data);
    } catch { /* plan yoksa kart gizli kalır */ }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  if (!data) return null;

  const { mevcut_plan: plan, secenekler } = data;

  const labelOf = (slot, id) =>
    (secenekler[slot] || []).find((o) => o.id === id) || { label: id, icon: "•" };

  const pick = async (slot, id) => {
    if (busy) return;
    setBusy(true);
    try {
      const newPlan = { ...plan, [slot]: id };
      const res = await api.post("/game/hafta-plani", newPlan);
      setData((d) => ({ ...d, mevcut_plan: res.data.mevcut_plan, beklenti: res.data.beklenti }));
    } catch { /* sessiz */ } finally {
      setBusy(false);
    }
  };

  const SLOT_TITLES = { is: "İŞ", sosyal: "SOSYAL", kisisel: "KİŞİSEL" };

  return (
    <div style={{
      margin: "0.55rem 0.75rem 0",
      background: "var(--color-card, #111)",
      border: "1px solid rgba(201,168,76,0.28)",
      borderRadius: 10, overflow: "hidden",
      boxShadow: "0 4px 18px rgba(0,0,0,0.45)",
    }}>
      {/* Kompakt satır */}
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 8,
        padding: "0.55rem 0.8rem", background: "transparent",
        border: "none", cursor: "pointer", textAlign: "left",
      }}>
        <span style={{ fontSize: "0.8rem" }}>🗓️</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Cinzel', serif", fontSize: "0.55rem", fontWeight: 700,
            letterSpacing: "0.22em", color: "#7A7060",
          }}>HAFTA PLANIN</div>
          <div style={{
            fontFamily: "'Lora', serif", fontSize: "0.72rem", color: "#D8C8A0",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {["is", "sosyal", "kisisel"].map((s, i) => {
              const o = labelOf(s, plan[s]);
              return (i ? " + " : "") + o.icon + " " + o.label;
            }).join("")}
          </div>
        </div>
        <span style={{
          color: "#C9A84C", fontSize: "0.75rem",
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s",
        }}>▾</span>
      </button>

      {/* Genişleyen seçici */}
      {open && (
        <div style={{ padding: "0 0.7rem 0.7rem", display: "flex", flexDirection: "column", gap: 7 }}>
          {["is", "sosyal", "kisisel"].map((slot) => (
            <div key={slot}>
              <div style={{
                fontFamily: "'Cinzel', serif", fontSize: "0.5rem", fontWeight: 700,
                letterSpacing: "0.2em", color: "#C9A84C", marginBottom: 4,
              }}>{SLOT_TITLES[slot]}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                {(secenekler[slot] || []).map((o) => {
                  const sel = plan[slot] === o.id;
                  return (
                    <button key={o.id} disabled={busy} onClick={() => pick(slot, o.id)}
                      title={o.etki}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                        padding: "0.45rem 0.2rem", borderRadius: 8, cursor: "pointer",
                        background: sel ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${sel ? "#C9A84C" : "rgba(201,168,76,0.18)"}`,
                        boxShadow: sel ? "0 0 8px rgba(201,168,76,0.25)" : "none",
                      }}>
                      <span style={{ fontSize: "0.85rem" }}>{o.icon}</span>
                      <span style={{
                        fontFamily: "'Cinzel', serif", fontSize: "0.48rem", fontWeight: 700,
                        letterSpacing: "0.06em", textAlign: "center", lineHeight: 1.25,
                        color: sel ? "#F0C040" : "#A09070", textTransform: "uppercase",
                      }}>{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {data.beklenti && (
            <p style={{
              margin: 0, fontFamily: "'Lora', serif", fontSize: "0.62rem",
              fontStyle: "italic", color: "#7A7060", textAlign: "center",
            }}>{data.beklenti}</p>
          )}
        </div>
      )}
    </div>
  );
}
