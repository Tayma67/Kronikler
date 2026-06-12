/**
 * KÜL & KÖZ UI KİTİ — GDD v8 komple tasarım sistemi.
 *
 * Her sayfa bu parçalardan kurulur; serbest stil YASAK denecek kadar
 * kısıtlı. Amaç: 37 sayfanın tek elden çıkmış gibi görünmesi.
 *
 *   <PageHeader>  — sayfa kimliği: üst etiket + başlık + flama çizgisi
 *   <Panel>       — başlıklı içerik paneli (card-frame standardı)
 *   <Stat>        — ikon + etiket + değer satırı (çubuklu/çubuksuz)
 *   <Pill>        — durum rozeti (ton: gold/ember/blood/sage/ink)
 *   <GoldRule>    — bölüm ayracı
 *   <EmptyState>  — boş durum sahnesi (asla çıplak "veri yok")
 *   <Coin>        — para gösterimi (her yerde aynı)
 */
import React from "react";

export const TONES = {
  gold:  { text: "#C9A84C", border: "rgba(201,168,76,0.45)",  bg: "rgba(201,168,76,0.08)" },
  ember: { text: "#E05A30", border: "rgba(224,90,48,0.45)",   bg: "rgba(224,90,48,0.08)" },
  blood: { text: "#C84040", border: "rgba(200,64,64,0.45)",   bg: "rgba(200,64,64,0.08)" },
  sage:  { text: "#4A9A5A", border: "rgba(74,154,90,0.45)",   bg: "rgba(74,154,90,0.08)" },
  ink:   { text: "#7B4FAF", border: "rgba(123,79,175,0.45)",  bg: "rgba(123,79,175,0.08)" },
  ash:   { text: "#7A6A4F", border: "rgba(122,106,79,0.45)",  bg: "rgba(122,106,79,0.08)" },
};

/* ── Sayfa kimliği ───────────────────────────────────────────────────── */
export function PageHeader({ kicker, title, sub, icon, right }) {
  return (
    <div className="rise-in" style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{ minWidth: 0 }}>
          {kicker && (
            <div className="font-display" style={{
              fontSize: "0.55rem", letterSpacing: "0.3em", textTransform: "uppercase",
              color: "var(--color-gold-dim)", marginBottom: "0.2rem",
            }}>
              {kicker}
            </div>
          )}
          <h1 className="font-display" style={{
            fontSize: "1.5rem", fontWeight: 700, color: "var(--color-parchment)",
            letterSpacing: "0.06em", lineHeight: 1.15, display: "flex",
            alignItems: "center", gap: "0.6rem",
            textShadow: "0 2px 12px rgba(0,0,0,0.6), 0 0 24px rgba(201,168,76,0.12)",
          }}>
            {icon && <span style={{ fontSize: "1.25rem", filter: "drop-shadow(0 0 8px rgba(201,168,76,0.4))" }}>{icon}</span>}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
          </h1>
          {sub && (
            <p className="font-serif" style={{
              fontSize: "0.8rem", fontStyle: "italic",
              color: "var(--color-parchment-muted)", marginTop: "0.25rem",
            }}>
              {sub}
            </p>
          )}
        </div>
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
      {/* Flama çizgisi */}
      <div style={{
        marginTop: "0.65rem", height: "2px", borderRadius: "1px",
        background: "linear-gradient(to right, rgba(201,168,76,0.65), rgba(201,168,76,0.18) 45%, transparent 80%)",
        boxShadow: "0 0 8px rgba(201,168,76,0.25)",
      }} />
    </div>
  );
}

/* ── İçerik paneli ───────────────────────────────────────────────────── */
export function Panel({ title, icon, tone = "gold", right, children, className = "", style }) {
  const t = TONES[tone] || TONES.gold;
  return (
    <div className={`card-frame ${className}`} style={{ overflow: "hidden", ...style }}>
      {title && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "0.5rem", padding: "0.55rem 0.85rem",
          borderBottom: "1px solid var(--color-border)",
          background: `linear-gradient(to right, ${t.bg}, transparent 70%)`,
        }}>
          <span className="font-display" style={{
            fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase", color: t.text,
            display: "flex", alignItems: "center", gap: "0.4rem",
          }}>
            {icon && <span style={{ fontSize: "0.8rem" }}>{icon}</span>}
            {title}
          </span>
          {right}
        </div>
      )}
      <div style={{ padding: "0.85rem" }}>{children}</div>
    </div>
  );
}

/* ── Stat satırı ─────────────────────────────────────────────────────── */
export function Stat({ icon, label, value, max, tone = "gold", suffix = "" }) {
  const t = TONES[tone] || TONES.gold;
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.3rem 0" }}>
      {icon && <span style={{ fontSize: "0.85rem", width: "1.2rem", textAlign: "center", flexShrink: 0 }}>{icon}</span>}
      <span className="font-display" style={{
        fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase",
        color: "var(--color-parchment-muted)", width: "5.5rem", flexShrink: 0,
      }}>
        {label}
      </span>
      {pct != null && (
        <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`, borderRadius: "2px",
            background: `linear-gradient(to right, ${t.text}99, ${t.text})`,
            boxShadow: `0 0 6px ${t.text}55`, transition: "width 0.5s ease",
          }} />
        </div>
      )}
      <span className="font-display" style={{
        fontSize: "0.78rem", fontWeight: 700, color: "var(--color-parchment)",
        minWidth: "2.6rem", textAlign: "right", flexShrink: 0,
      }}>
        {value}{suffix}
      </span>
    </div>
  );
}

/* ── Rozet ───────────────────────────────────────────────────────────── */
export function Pill({ children, tone = "ash", pulse, onClick, title }) {
  const t = TONES[tone] || TONES.ash;
  const Comp = onClick ? "button" : "span";
  return (
    <Comp onClick={onClick} title={title}
      className={pulse === "danger" ? "chip-urgent" : pulse === "envoy" ? "chip-envoy" : ""}
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.3rem",
        padding: "0.18rem 0.55rem", borderRadius: "4px",
        border: `1px solid ${t.border}`, background: t.bg, color: t.text,
        fontFamily: "Cinzel, serif", fontSize: "0.56rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        cursor: onClick ? "pointer" : "default", whiteSpace: "nowrap",
      }}>
      {children}
    </Comp>
  );
}

/* ── Ayraç ───────────────────────────────────────────────────────────── */
export function GoldRule({ label }) {
  if (!label) {
    return <div style={{
      height: "1px", margin: "0.85rem 0",
      background: "linear-gradient(to right, transparent, rgba(201,168,76,0.3), transparent)",
    }} />;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", margin: "0.85rem 0" }}>
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, rgba(201,168,76,0.3), transparent)" }} />
      <span className="font-display" style={{
        fontSize: "0.52rem", letterSpacing: "0.25em", textTransform: "uppercase",
        color: "var(--color-gold-dim)", flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, rgba(201,168,76,0.3), transparent)" }} />
    </div>
  );
}

/* ── Boş durum ───────────────────────────────────────────────────────── */
export function EmptyState({ icon = "🕯", title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "2.2rem 1rem" }}>
      <div style={{ fontSize: "1.8rem", marginBottom: "0.6rem", opacity: 0.45,
                    filter: "drop-shadow(0 0 12px rgba(201,168,76,0.3))" }}>
        {icon}
      </div>
      <p className="font-serif" style={{
        fontSize: "0.9rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
        lineHeight: 1.6,
      }}>
        {title}
      </p>
      {sub && (
        <p className="font-serif" style={{
          fontSize: "0.75rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", marginTop: "0.3rem",
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ── Para ────────────────────────────────────────────────────────────── */
export function Coin({ value, size = "0.8rem" }) {
  return (
    <span className="font-display" style={{
      fontSize: size, fontWeight: 700, color: "var(--color-gold)",
      textShadow: "0 0 8px rgba(201,168,76,0.35)", whiteSpace: "nowrap",
    }}>
      {typeof value === "number" ? Math.round(value).toLocaleString("tr-TR") : value}
      <span style={{ fontSize: "0.85em", opacity: 0.8 }}> ⚜</span>
    </span>
  );
}
