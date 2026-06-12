// src/Kit.jsx
import React from "react";
import { jsx, jsxs } from "react/jsx-runtime";
var TONES = {
  gold: { text: "#C9A84C", border: "rgba(201,168,76,0.45)", bg: "rgba(201,168,76,0.08)" },
  ember: { text: "#E05A30", border: "rgba(224,90,48,0.45)", bg: "rgba(224,90,48,0.08)" },
  blood: { text: "#C84040", border: "rgba(200,64,64,0.45)", bg: "rgba(200,64,64,0.08)" },
  sage: { text: "#4A9A5A", border: "rgba(74,154,90,0.45)", bg: "rgba(74,154,90,0.08)" },
  ink: { text: "#7B4FAF", border: "rgba(123,79,175,0.45)", bg: "rgba(123,79,175,0.08)" },
  ash: { text: "#7A6A4F", border: "rgba(122,106,79,0.45)", bg: "rgba(122,106,79,0.08)" }
};
function PageHeader({ kicker, title, sub, icon, right }) {
  return /* @__PURE__ */ jsxs("div", { className: "rise-in", style: { marginBottom: "1rem" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "0.75rem" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { minWidth: 0 }, children: [
        kicker && /* @__PURE__ */ jsx("div", { className: "font-display", style: {
          fontSize: "0.55rem",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "var(--color-gold-dim)",
          marginBottom: "0.2rem"
        }, children: kicker }),
        /* @__PURE__ */ jsxs("h1", { className: "font-display", style: {
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--color-parchment)",
          letterSpacing: "0.06em",
          lineHeight: 1.15,
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          textShadow: "0 2px 12px rgba(0,0,0,0.6), 0 0 24px rgba(201,168,76,0.12)"
        }, children: [
          icon && /* @__PURE__ */ jsx("span", { style: { fontSize: "1.25rem", filter: "drop-shadow(0 0 8px rgba(201,168,76,0.4))" }, children: icon }),
          /* @__PURE__ */ jsx("span", { style: { overflow: "hidden", textOverflow: "ellipsis" }, children: title })
        ] }),
        sub && /* @__PURE__ */ jsx("p", { className: "font-serif", style: {
          fontSize: "0.8rem",
          fontStyle: "italic",
          color: "var(--color-parchment-muted)",
          marginTop: "0.25rem"
        }, children: sub })
      ] }),
      right && /* @__PURE__ */ jsx("div", { style: { flexShrink: 0 }, children: right })
    ] }),
    /* @__PURE__ */ jsx("div", { style: {
      marginTop: "0.65rem",
      height: "2px",
      borderRadius: "1px",
      background: "linear-gradient(to right, rgba(201,168,76,0.65), rgba(201,168,76,0.18) 45%, transparent 80%)",
      boxShadow: "0 0 8px rgba(201,168,76,0.25)"
    } })
  ] });
}
function Panel({ title, icon, tone = "gold", right, children, className = "", style }) {
  const t = TONES[tone] || TONES.gold;
  return /* @__PURE__ */ jsxs("div", { className: `card-frame ${className}`, style: { overflow: "hidden", ...style }, children: [
    title && /* @__PURE__ */ jsxs("div", { style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.5rem",
      padding: "0.55rem 0.85rem",
      borderBottom: "1px solid var(--color-border)",
      background: `linear-gradient(to right, ${t.bg}, transparent 70%)`
    }, children: [
      /* @__PURE__ */ jsxs("span", { className: "font-display", style: {
        fontSize: "0.62rem",
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: t.text,
        display: "flex",
        alignItems: "center",
        gap: "0.4rem"
      }, children: [
        icon && /* @__PURE__ */ jsx("span", { style: { fontSize: "0.8rem" }, children: icon }),
        title
      ] }),
      right
    ] }),
    /* @__PURE__ */ jsx("div", { style: { padding: "0.85rem" }, children })
  ] });
}
function Stat({ icon, label, value, max, tone = "gold", suffix = "" }) {
  const t = TONES[tone] || TONES.gold;
  const pct = max ? Math.max(0, Math.min(100, value / max * 100)) : null;
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.3rem 0" }, children: [
    icon && /* @__PURE__ */ jsx("span", { style: { fontSize: "0.85rem", width: "1.2rem", textAlign: "center", flexShrink: 0 }, children: icon }),
    /* @__PURE__ */ jsx("span", { className: "font-display", style: {
      fontSize: "0.58rem",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--color-parchment-muted)",
      width: "5.5rem",
      flexShrink: 0
    }, children: label }),
    pct != null && /* @__PURE__ */ jsx("div", { style: { flex: 1, height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }, children: /* @__PURE__ */ jsx("div", { style: {
      height: "100%",
      width: `${pct}%`,
      borderRadius: "2px",
      background: `linear-gradient(to right, ${t.text}99, ${t.text})`,
      boxShadow: `0 0 6px ${t.text}55`,
      transition: "width 0.5s ease"
    } }) }),
    /* @__PURE__ */ jsxs("span", { className: "font-display", style: {
      fontSize: "0.78rem",
      fontWeight: 700,
      color: "var(--color-parchment)",
      minWidth: "2.6rem",
      textAlign: "right",
      flexShrink: 0
    }, children: [
      value,
      suffix
    ] })
  ] });
}
function Pill({ children, tone = "ash", pulse, onClick, title }) {
  const t = TONES[tone] || TONES.ash;
  const Comp = onClick ? "button" : "span";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      onClick,
      title,
      className: pulse === "danger" ? "chip-urgent" : pulse === "envoy" ? "chip-envoy" : "",
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.18rem 0.55rem",
        borderRadius: "4px",
        border: `1px solid ${t.border}`,
        background: t.bg,
        color: t.text,
        fontFamily: "Cinzel, serif",
        fontSize: "0.56rem",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: onClick ? "pointer" : "default",
        whiteSpace: "nowrap"
      },
      children
    }
  );
}
function GoldRule({ label }) {
  if (!label) {
    return /* @__PURE__ */ jsx("div", { style: {
      height: "1px",
      margin: "0.85rem 0",
      background: "linear-gradient(to right, transparent, rgba(201,168,76,0.3), transparent)"
    } });
  }
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.6rem", margin: "0.85rem 0" }, children: [
    /* @__PURE__ */ jsx("div", { style: { flex: 1, height: "1px", background: "linear-gradient(to left, rgba(201,168,76,0.3), transparent)" } }),
    /* @__PURE__ */ jsx("span", { className: "font-display", style: {
      fontSize: "0.52rem",
      letterSpacing: "0.25em",
      textTransform: "uppercase",
      color: "var(--color-gold-dim)",
      flexShrink: 0
    }, children: label }),
    /* @__PURE__ */ jsx("div", { style: { flex: 1, height: "1px", background: "linear-gradient(to right, rgba(201,168,76,0.3), transparent)" } })
  ] });
}
function EmptyState({ icon = "\u{1F56F}", title, sub }) {
  return /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "2.2rem 1rem" }, children: [
    /* @__PURE__ */ jsx("div", { style: {
      fontSize: "1.8rem",
      marginBottom: "0.6rem",
      opacity: 0.45,
      filter: "drop-shadow(0 0 12px rgba(201,168,76,0.3))"
    }, children: icon }),
    /* @__PURE__ */ jsx("p", { className: "font-serif", style: {
      fontSize: "0.9rem",
      fontStyle: "italic",
      color: "var(--color-parchment-dim)",
      lineHeight: 1.6
    }, children: title }),
    sub && /* @__PURE__ */ jsx("p", { className: "font-serif", style: {
      fontSize: "0.75rem",
      fontStyle: "italic",
      color: "var(--color-parchment-muted)",
      marginTop: "0.3rem"
    }, children: sub })
  ] });
}
function Coin({ value, size = "0.8rem" }) {
  return /* @__PURE__ */ jsxs("span", { className: "font-display", style: {
    fontSize: size,
    fontWeight: 700,
    color: "var(--color-gold)",
    textShadow: "0 0 8px rgba(201,168,76,0.35)",
    whiteSpace: "nowrap"
  }, children: [
    typeof value === "number" ? Math.round(value).toLocaleString("tr-TR") : value,
    /* @__PURE__ */ jsx("span", { style: { fontSize: "0.85em", opacity: 0.8 }, children: " \u269C" })
  ] });
}

// src/Gorsel.jsx
import { useEffect, useState } from "react";
import { jsx as jsx2 } from "react/jsx-runtime";
var _durum = {};
function useGorselVar(src) {
  const [var_, setVar] = useState(_durum[src] === true);
  useEffect(() => {
    if (!src) return;
    if (src in _durum) {
      setVar(_durum[src]);
      return;
    }
    const im = new Image();
    im.onload = () => {
      _durum[src] = true;
      setVar(true);
    };
    im.onerror = () => {
      _durum[src] = false;
      setVar(false);
    };
    im.src = src;
  }, [src]);
  return var_;
}
function portreYolu(age, gender, id = "") {
  const kusak = age < 30 ? "genc" : age < 55 ? "orta" : "yasli";
  const cins = gender === "kad\u0131n" ? "k" : "e";
  let h = 0;
  for (const ch of String(id)) h = h * 31 + ch.charCodeAt(0) >>> 0;
  return `/images/portre/${cins}_${kusak}_${h % 3 + 1}.jpg`;
}
function Portre({ age = 30, gender, id, emoji = "\u{1F464}", size = "3rem", ring = true }) {
  const yol = portreYolu(age, gender, id);
  const hazir = useGorselVar(yol);
  return /* @__PURE__ */ jsx2("div", { style: {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    overflow: "hidden",
    border: ring ? "2px solid var(--color-gold)" : "1px solid var(--color-border-hi)",
    boxShadow: ring ? "0 0 0 3px rgba(201,168,76,0.15), 0 0 16px rgba(201,168,76,0.35)" : "none",
    background: "linear-gradient(135deg, #3A2010 0%, #1A0E06 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }, children: hazir ? /* @__PURE__ */ jsx2("img", { src: yol, alt: "", style: { width: "100%", height: "100%", objectFit: "cover" } }) : /* @__PURE__ */ jsx2("span", { style: { fontSize: `calc(${size} * 0.45)` }, children: emoji }) });
}
function Arma({ dynastyId, emoji, size = "1.6rem" }) {
  const yol = `/images/arma/${dynastyId}.jpg`;
  const hazir = useGorselVar(yol);
  if (!hazir) return /* @__PURE__ */ jsx2("span", { style: { fontSize: size }, children: emoji });
  return /* @__PURE__ */ jsx2("img", { src: yol, alt: "", style: {
    width: size,
    height: size,
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid rgba(201,168,76,0.4)",
    boxShadow: "0 0 8px rgba(201,168,76,0.25)"
  } });
}
function heroYolu(age, season) {
  const donem = age < 30 ? "genc" : age < 55 ? "orta" : "yasli";
  const mevsim = season === "K\u0131\u015F" ? "kis" : season === "Sonbahar" ? "sonbahar" : season === "\u0130lkbahar" ? "ilkbahar" : "yaz";
  return `/images/hero/${donem}_${mevsim}.jpg`;
}
export {
  Arma,
  Coin,
  EmptyState,
  GoldRule,
  PageHeader,
  Panel,
  Pill,
  Portre,
  Stat,
  TONES,
  heroYolu,
  portreYolu,
  useGorselVar
};
