import { useEffect, useRef } from "react";

/* ─── ANIMATION CSS ─────────────────────────────────────────── */
export const STORY_FEED_CSS = `
  @keyframes storyFadeInUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes storyNewCardIn {
    from { opacity: 0; transform: translateY(-14px) scale(.975); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes storySealPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(200,146,58,.0), 0 0 6px rgba(200,146,58,.28); }
    50%       { box-shadow: 0 0 0 3px rgba(200,146,58,.07), 0 0 18px rgba(200,146,58,.48); }
  }
  @keyframes storyLineGrow {
    from { transform: scaleY(0); transform-origin: top center; }
    to   { transform: scaleY(1); transform-origin: top center; }
  }
`;

/* ─── CATEGORY REGISTRY ─────────────────────────────────────── */
const CAT = {
  // Günlük hayat
  ticaret:            { label: "TİCARET",    color: "#C8923A" },
  çalışma:            { label: "ZANAAT",     color: "#B87D30" },
  yolculuk:           { label: "YOLCULUK",   color: "#A0B07A" },
  kervan:             { label: "KERVAN",     color: "#C8923A" },
  kervan_varış:       { label: "KERVAN",     color: "#5BB07A" },
  kervan_saldırı:     { label: "KERVAN",     color: "#D94F4F" },
  meslek_edinme:      { label: "MESLEK",     color: "#7BAFD4" },
  meslek_değişimi:    { label: "MESLEK",     color: "#7BAFD4" },
  kariyer_terfi:      { label: "TERFİ",      color: "#C8923A" },
  rank_bonusu:        { label: "ÖDÜL",       color: "#C8923A" },
  ödül:               { label: "ÖDÜL",       color: "#C8923A" },
  başlangıç:          { label: "BAŞLANGIÇ",  color: "#D4A050" },
  // Eğitim / mektep
  okul:               { label: "EĞİTİM",     color: "#7B9FE0" },
  ders:               { label: "EĞİTİM",     color: "#7B9FE0" },
  sinav:              { label: "SINAV",       color: "#9B9FE0" },
  kulup:              { label: "KULÜP",       color: "#9B7FD4" },
  aktivite:           { label: "AKTİVİTE",   color: "#5BB07A" },
  cocuk_yatirim:      { label: "YATIRIM",    color: "#5BB07A" },
  cocuk_meslek:       { label: "MESLEK",     color: "#7BAFD4" },
  // Sosyal
  ilişki:             { label: "SOSYAL",     color: "#89C4E1" },
  iltifat:            { label: "SOSYAL",     color: "#89C4E1" },
  hediye:             { label: "SOSYAL",     color: "#D47A9E" },
  para_verme:         { label: "SOSYAL",     color: "#89C4E1" },
  hakaret:            { label: "SOSYAL",     color: "#D94F4F" },
  dedikodu:           { label: "SOSYAL",     color: "#A08060" },
  beceri:             { label: "BECERİ",     color: "#C8923A" },
  // Aile / hayat
  doğum:              { label: "DOĞUM",      color: "#5BB07A" },
  ölüm:               { label: "ÖLÜM",       color: "#905050" },
  evlilik:            { label: "EVLİLİK",    color: "#D47A9E" },
  evlilik_teklifi:    { label: "TEKLİF",     color: "#D47A9E" },
  çıkma_teklifi:      { label: "TEKLİF",     color: "#D47A9E" },
  nesil_devri:        { label: "MİRAS",      color: "#7BA07A" },
  miras:              { label: "MİRAS",      color: "#7BA07A" },
  aile_görevi:        { label: "AİLE",       color: "#C8923A" },
  aile_görevi_açıldı: { label: "AİLE",       color: "#C8923A" },
  aile_destek:        { label: "AİLE",       color: "#C8923A" },
  // Savaş
  savaş_zaferi:       { label: "ZAFER",      color: "#E0A040" },
  savaş_kaybı:        { label: "MAĞLUBIYET", color: "#D94F4F" },
  savaş_kaçış:        { label: "GERİ ÇEKİL", color: "#D97030" },
  // Suç
  suç:                { label: "SUÇ",        color: "#C44040" },
  suç_yakalandı:      { label: "YAKALANDI",  color: "#D94F4F" },
  hırsızlık:          { label: "HIRSIZLIK",  color: "#C44040" },
  cinayet:            { label: "CİNAYET",    color: "#901818" },
  hapis:              { label: "HAPİS",      color: "#A03030" },
  yakalandı:          { label: "YAKALANDI",  color: "#D94F4F" },
  kaçırma:            { label: "KAÇIRMA",    color: "#9B3FD4" },
  misilleme:          { label: "MİSİLLEME",  color: "#D97030" },
  // Görevler
  görev_tamamlandı:   { label: "GÖREV",      color: "#C8923A" },
  görev_başarısız:    { label: "GÖREV",      color: "#D94F4F" },
  // Sağlık
  hastalık:           { label: "SAĞLIK",     color: "#D94F4F" },
  iyileşme:           { label: "SAĞLIK",     color: "#5BB07A" },
  // Faction / yönetim
  faction_kontrol:    { label: "FRAKSİYON",  color: "#D4A050" },
  adaylık:            { label: "ADAY",       color: "#C8923A" },
  darbe_yaklasıyor:   { label: "DARBE",      color: "#D94F4F" },
  darbe_basarili:     { label: "DARBE",      color: "#C8923A" },
  darbe_basarisiz:    { label: "DARBE",      color: "#D94F4F" },
  // Vergi & asayiş
  vergi_ödeme:        { label: "VERGİ",      color: "#A08060" },
  vergi_ödendi:       { label: "VERGİ",      color: "#A08060" },
  vergi_gecikme:      { label: "VERGİ",      color: "#D97030" },
  isyan_riski:        { label: "RİSK",       color: "#D94F4F" },
  asayis_baskisi:     { label: "ASAYİŞ",     color: "#D97030" },
  asayis_gozaltisi:   { label: "GÖZALTI",    color: "#D94F4F" },
  // Ekipman
  kuşanma:            { label: "EKIPMAN",    color: "#A0A0A0" },
  kullanım:           { label: "KULLANIM",   color: "#A0A0A0" },
  haydut_baskını:     { label: "BASKIN",     color: "#D97030" },
  // Özel & uyarılar
  ozel_olay:          { label: "ÖZEL",       color: "#C8923A" },
  enforcement:        { label: "UYARI",      color: "#D4A050" },
  starvation_warning: { label: "ACİL",       color: "#D94F4F" },
  _alert_urgent:      { label: "ACİL",       color: "#D94F4F" },
  _alert_high:        { label: "UYARI",      color: "#D4A050" },
  _alert_normal:      { label: "BİLGİ",      color: "#7BAFD4" },
  // Dünya
  _world_alert:       { label: "DÜNYA",      color: "#9B7FD4" },
  _kriz_alert:        { label: "KRİZ",       color: "#D94F4F" },
  savaş_ilanı:        { label: "SAVAŞ",      color: "#D94F4F" },
  faction_savaş:      { label: "SAVAŞ",      color: "#D94F4F" },
  barış:              { label: "BARIŞ",      color: "#89C4E1" },
  kıtlık:             { label: "KITLIK",     color: "#D97030" },
  kıtlık_etkisi:      { label: "KITLIK",     color: "#D97030" },
  şenlik:             { label: "ŞENLIK",     color: "#D4C050" },
  kral_değişimi:      { label: "DÜNYA",      color: "#9B7FD4" },
  tahta_çıkış:        { label: "DÜNYA",      color: "#9B7FD4" },
  isyan:              { label: "İSYAN",      color: "#D94F4F" },
  halk_isyanı:        { label: "İSYAN",      color: "#D94F4F" },
  istikrar_artışı:    { label: "DÜNYA",      color: "#5BB07A" },
  lord_düşüşü:        { label: "DÜNYA",      color: "#D4A050" },
  yeni_lord:          { label: "DÜNYA",      color: "#9B7FD4" },
  göç:                { label: "GÖÇ",        color: "#A0B07A" },
  savaş_hareketi:     { label: "SAVAŞ",      color: "#D94F4F" },
};

/* ─── SVG ICONS ─────────────────────────────────────────────── */
function EventIcon({ type = "", color = "#C8923A", size = 14 }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: color, strokeWidth: 1.7,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  const t = type;
  if (["ticaret", "rank_bonusu", "ödül"].includes(t))
    return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v2m0 6v2"/><path d="M9.5 10.5a2.5 2.5 0 1 1 5 0c0 1.5-2.5 2.5-2.5 3.5"/></svg>;
  if (["çalışma", "meslek_edinme", "meslek_değişimi", "cocuk_meslek"].includes(t))
    return <svg {...p}><path d="M15.7 6.3a1 1 0 0 0 0 1.4l.6.6a1 1 0 0 0 1.4 0l3-3a1 1 0 0 0 0-1.4l-.6-.6a1 1 0 0 0-1.4 0z"/><path d="M6 20L3.3 17.3a1 1 0 0 1 0-1.4L12 7.2l2.8 2.8-8.7 8.7a1 1 0 0 1-1.4 0z"/></svg>;
  if (["savaş_ilanı", "faction_savaş", "savaş_hareketi", "suç", "cinayet"].includes(t))
    return <svg {...p}><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>;
  if (["savaş_zaferi", "kariyer_terfi", "başlangıç", "darbe_basarili"].includes(t))
    return <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
  if (["savaş_kaybı", "darbe_basarisiz", "görev_başarısız"].includes(t))
    return <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
  if (["savaş_kaçış", "göç"].includes(t))
    return <svg {...p}><polyline points="15 18 21 12 15 6"/><path d="M3 12h18"/></svg>;
  if (t === "ölüm" || t === "cinayet")
    return <svg {...p}><path d="M9 12h.01M15 12h.01"/><path d="M10 16s.8 1 2 1 2-1 2-1"/><path d="M12 2C6.5 2 2 6.5 2 12c0 3.7 2 6.9 5 8.7V22h10v-1.3c3-1.8 5-5 5-8.7 0-5.5-4.5-10-10-10z"/></svg>;
  if (["doğum", "nesil_devri"].includes(t))
    return <svg {...p}><path d="M9 12h6M12 9v6"/><circle cx="12" cy="12" r="9"/></svg>;
  if (["evlilik", "evlilik_teklifi", "çıkma_teklifi", "hediye"].includes(t))
    return <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
  if (["okul", "ders", "sinav", "aile_görevi", "aile_görevi_açıldı", "cocuk_yatirim"].includes(t))
    return <svg {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
  if (["ilişki", "iltifat", "aile_destek", "para_verme"].includes(t))
    return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (["yolculuk", "kervan", "kervan_varış"].includes(t))
    return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
  if (["görev_tamamlandı", "miras", "ozel_olay"].includes(t))
    return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
  if (["hastalık", "iyileşme", "starvation_warning"].includes(t))
    return <svg {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
  if (["_world_alert", "_kriz_alert", "kral_değişimi", "tahta_çıkış", "isyan", "halk_isyanı", "darbe_yaklasıyor", "darbe_icra"].includes(t))
    return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
  if (["_alert_urgent", "_alert_high", "isyan_riski"].includes(t))
    return <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
  if (["barış", "şenlik", "istikrar_artışı"].includes(t))
    return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
  if (["kulup", "aktivite"].includes(t))
    return <svg {...p}><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>;
  if (["suç_yakalandı", "yakalandı", "hapis", "asayis_gozaltisi"].includes(t))
    return <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
  if (["hırsızlık"].includes(t))
    return <svg {...p}><path d="M1 3h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
  if (["kervan_saldırı", "haydut_baskını", "misilleme"].includes(t))
    return <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
  if (["kuşanma"].includes(t))
    return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
  if (["vergi_ödeme", "vergi_ödendi", "vergi_gecikme"].includes(t))
    return <svg {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
  if (["faction_kontrol", "adaylık", "beceri"].includes(t))
    return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
  if (["_alert_normal", "enforcement", "dedikodu"].includes(t))
    return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
  // fallback
  return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}

/* ─── REWARD CHIP ────────────────────────────────────────────── */
function RewardChip({ text }) {
  const pos = text.startsWith("+");
  const neg = text.startsWith("-");
  const s = pos
    ? { bg: "rgba(60,140,80,.12)",  color: "#5EBF82", border: "rgba(60,140,80,.22)" }
    : neg
    ? { bg: "rgba(210,60,60,.12)",  color: "#E05A5A", border: "rgba(210,60,60,.22)" }
    : { bg: "rgba(200,146,58,.12)", color: "#C8923A", border: "rgba(200,146,58,.22)" };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 9px", borderRadius: "99px",
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em",
      fontFamily: "'Cinzel', Georgia, serif",
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {text}
    </span>
  );
}

/* ─── TIMELINE SEAL ──────────────────────────────────────────── */
function TimelineSeal({ type, isNew }) {
  const cat = CAT[type] || { color: "#7A6845" };
  const c = cat.color;
  return (
    <div style={{
      width: 38, height: 38,
      borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", flexShrink: 0,
      background: "radial-gradient(circle at 35% 30%, #1A1510, #0C0906)",
      border: isNew ? `1.5px solid ${c}` : `1px solid ${c}30`,
      boxShadow: isNew
        ? `0 0 0 3px ${c}12, 0 0 14px ${c}40`
        : `0 0 0 1px rgba(0,0,0,.5)`,
      animation: isNew ? "storySealPulse 2.4s ease-in-out infinite" : "none",
      zIndex: 2,
    }}>
      <div style={{
        position: "absolute", inset: 5, borderRadius: "50%",
        border: `1px solid ${c}20`, background: `${c}08`,
      }}/>
      <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
        <EventIcon type={type} color={isNew ? c : `${c}80`} size={14}/>
      </div>
    </div>
  );
}

/* ─── JOURNAL CARD ───────────────────────────────────────────── */
function JournalCard({ event, isNew = false, isPinned = false, stagger = 0 }) {
  const cat = CAT[event.type] || { label: "OLAY", color: "#7A6845" };
  const c = cat.color;
  const rewards = event.rewards || [];

  // Build time label from calendar data if available
  const timeLabel = event.timeLabel || null;

  // Narrative: prefer event.narrative, then event.flavor (dashboard sets getFlavorText result)
  const bodyText = event.narrative || event.flavor || null;

  return (
    <div style={{
      position: "relative",
      background: "#13100D",
      border: isNew
        ? `1px solid ${c}90`
        : isPinned
        ? `1px solid ${c}50`
        : "1px solid rgba(200,146,58,.1)",
      borderRadius: "16px",
      padding: "13px 15px",
      minHeight: "80px",
      overflow: "hidden",
      boxShadow: isNew
        ? `0 0 24px ${c}1A, 0 0 0 1px ${c}14, 0 4px 24px rgba(0,0,0,.55)`
        : "0 2px 16px rgba(0,0,0,.38)",
      animation: isNew
        ? "storyNewCardIn .3s cubic-bezier(.22,.8,.4,1) forwards"
        : `storyFadeInUp .32s ease ${stagger}ms both`,
    }}>
      {/* Left edge glow bar */}
      <div style={{
        position: "absolute", left: 0, top: "22%", bottom: "22%", width: "2px",
        background: `linear-gradient(180deg, transparent, ${c}${isNew ? "90" : isPinned ? "60" : "38"}, transparent)`,
        borderRadius: "0 1px 1px 0",
      }}/>

      {/* NEW / AKTİF badge */}
      {isNew && (
        <div style={{
          position: "absolute", top: -1, right: 13,
          background: c, color: "#0A0806",
          fontSize: "7.5px", fontWeight: 800, letterSpacing: "0.22em",
          fontFamily: "'Cinzel', Georgia, serif",
          padding: "2px 9px", borderRadius: "0 0 8px 8px",
        }}>YENİ</div>
      )}
      {isPinned && !isNew && (
        <div style={{
          position: "absolute", top: -1, right: 13,
          background: `${c}22`, color: c,
          border: `1px solid ${c}44`,
          fontSize: "7.5px", fontWeight: 800, letterSpacing: "0.22em",
          fontFamily: "'Cinzel', Georgia, serif",
          padding: "2px 9px", borderRadius: "0 0 8px 8px",
        }}>AKTİF</div>
      )}

      {/* Row 1: Category + Time */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{
          fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.28em",
          color: c, textTransform: "uppercase", opacity: isNew ? 1 : 0.82,
          fontFamily: "'Cinzel', Georgia, serif",
        }}>
          {cat.label}
        </span>
        {timeLabel && (
          <span style={{
            fontSize: "9px", letterSpacing: "0.06em",
            color: "rgba(180,155,110,.3)",
            fontFamily: "'Cinzel', Georgia, serif",
          }}>
            {timeLabel}
          </span>
        )}
      </div>

      {/* Row 2: Title */}
      <p style={{
        fontSize: "14px", fontWeight: 600,
        color: isNew ? "#F0E0A0" : "#DBC877",
        lineHeight: 1.38, letterSpacing: "-0.01em",
        fontFamily: "'Lora', Georgia, serif",
        marginBottom: bodyText ? "5px" : rewards.length ? "9px" : 0,
      }}>
        {event.text || "Bilinmeyen olay"}
      </p>

      {/* Row 3: Narrative / Flavor */}
      {bodyText && (
        <p style={{
          fontSize: "12px", fontStyle: "italic",
          color: "rgba(190,163,108,.44)",
          lineHeight: 1.58,
          fontFamily: "'Lora', Georgia, serif",
          marginBottom: rewards.length ? "9px" : 0,
        }}>
          {bodyText}
        </p>
      )}

      {/* Row 4: Rewards */}
      {rewards.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {rewards.map((r, i) => <RewardChip key={i} text={r}/>)}
        </div>
      )}
    </div>
  );
}

/* ─── STORY EVENT FEED ───────────────────────────────────────── */
/**
 * Props:
 *   events: array of event objects — same shape as game history events, optionally enriched:
 *     { type, text, narrative?, flavor?, rewards?, timeLabel?, isNew?, isPinned? }
 *   showTimeline: bool (default true) — show vertical line + seals
 *   emptyMessage: string — shown when events array is empty
 */
export default function StoryEventFeed({
  events = [],
  showTimeline = true,
  emptyMessage = "Bu dönemde kaydedilecek bir olay yok.",
}) {
  const injectedRef = useRef(false);

  // Inject font + keyframes once
  useEffect(() => {
    if (injectedRef.current) return;
    injectedRef.current = true;
    const styleId = "story-feed-styles";
    if (!document.getElementById(styleId)) {
      const el = document.createElement("style");
      el.id = styleId;
      el.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
        ${STORY_FEED_CSS}
      `;
      document.head.appendChild(el);
    }
  }, []);

  if (!events.length) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "48px 20px", gap: "10px",
        color: "rgba(180,155,110,.22)",
      }}>
        <div style={{ fontSize: "26px", opacity: .3 }}>📜</div>
        <p style={{
          fontSize: "10px", letterSpacing: "0.16em",
          fontFamily: "'Cinzel', Georgia, serif",
          textAlign: "center", textTransform: "uppercase",
        }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  if (!showTimeline) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {events.map((ev, i) => (
          <JournalCard
            key={ev._key || i}
            event={ev}
            isNew={ev.isNew || false}
            isPinned={ev.isPinned || ev._pinned || false}
            stagger={i * 55}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Vertical timeline line */}
      <div style={{
        position: "absolute",
        left: 18,
        top: 38,
        bottom: 38,
        width: "1px",
        background: "linear-gradient(180deg, rgba(200,146,58,.36) 0%, rgba(200,146,58,.05) 80%, transparent 100%)",
        animation: "storyLineGrow .5s ease both",
        pointerEvents: "none",
      }}/>

      {events.map((ev, i) => (
        <div
          key={ev._key || i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "13px",
            marginBottom: i < events.length - 1 ? "11px" : 0,
            position: "relative",
          }}
        >
          {/* Seal */}
          <div style={{ flexShrink: 0, paddingTop: "9px", zIndex: 2 }}>
            <TimelineSeal
              type={ev.type}
              isNew={ev.isNew || false}
            />
          </div>

          {/* Card */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <JournalCard
              event={ev}
              isNew={ev.isNew || false}
              isPinned={ev.isPinned || ev._pinned || false}
              stagger={i * 55}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
