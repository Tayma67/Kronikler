import { useState, useEffect } from "react";

/* ─────────────────────────────────────────────────────────────────
   KarakterEkrani.jsx  –  Kronikler RPG
   Mockup tasarımının birebir uygulaması.
   
   KULLANIM:
     <KarakterEkrani
       character={characterData}   // API'den gelen karakter objesi
       onBack={() => navigate(-1)}
       onSettings={() => openSettings()}
       onNavigate={(tabId) => navigateTo(tabId)}
       onCareerClick={() => navigate("/kariyer")}
     />
   ───────────────────────────────────────────────────────────────── */

/* ═══════════════════ RENK PALETİ ════════════════════ */
const C = {
  bg:         "#0A0A0A",
  card:       "#111111",
  card2:      "#16120A",
  card3:      "#1A1500",
  gold:       "#C9A84C",
  goldBright: "#F0C040",
  goldDim:    "#5A4010",
  goldBorder: "rgba(201,168,76,0.22)",
  goldBg:     "rgba(201,168,76,0.07)",
  text:       "#D8C8A0",
  textDim:    "#7A7060",
  textMid:    "#A09070",
  red:        "#C0392B",
  redDim:     "#8B2020",
  amber:      "#E67E22",
  blue:       "#3498DB",
  green:      "#27AE60",
  purple:     "#9B59B6",
  greenDim:   "#1E4A2A",
};

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
`;

/* ═══════════════════ FONT INJECTION ════════════════════ */
function injectFonts() {
  const id = "kronikler-karakter-fonts";
  if (document.getElementById(id)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = FONTS;
  document.head.appendChild(el);
}

/* ═══════════════════ TEMEL BİLEŞENLER ════════════════════ */

/** Altın çizgi + elmas separator */
function GoldDivider({ style = {} }) {
  return (
    <div style={{ display: "flex", alignItems: "center", ...style }}>
      <div style={{
        flex: 1, height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${C.goldDim} 60%, transparent 100%)`,
      }}/>
      <div style={{
        width: 5, height: 5,
        background: C.gold, transform: "rotate(45deg)",
        margin: "0 8px", flexShrink: 0,
        boxShadow: `0 0 4px ${C.gold}`,
      }}/>
      <div style={{
        flex: 1, height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${C.goldDim} 60%, transparent 100%)`,
      }}/>
    </div>
  );
}

/** ◇ elmas rozet – stat seviyesi gösterimi */
function DiamondBadge({ value, size = 44 }) {
  const half = size / 2;
  const pad  = size * 0.09;
  const pad2 = size * 0.2;
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ position: "absolute" }}>
        {/* Dış elmas */}
        <polygon
          points={`${half},${pad} ${size-pad},${half} ${half},${size-pad} ${pad},${half}`}
          fill={C.card3} stroke={C.gold} strokeWidth={1.5}
        />
        {/* İç elmas (ince) */}
        <polygon
          points={`${half},${pad2} ${size-pad2},${half} ${half},${size-pad2} ${pad2},${half}`}
          fill="none" stroke={`rgba(201,168,76,0.28)`} strokeWidth={0.7}
        />
      </svg>
      <span style={{
        position: "relative", zIndex: 1,
        fontSize: size * 0.38, fontWeight: 700,
        color: C.goldBright,
        fontFamily: "'Cinzel', Georgia, serif",
        lineHeight: 1,
      }}>
        {value}
      </span>
    </div>
  );
}

/** İlerleme çubuğu */
function Bar({ current, max, color, h = 4 }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return (
    <div style={{
      width: "100%", height: h,
      background: "rgba(255,255,255,0.06)",
      borderRadius: h, overflow: "hidden",
    }}>
      <div style={{
        width: `${pct}%`, height: "100%",
        background: color, borderRadius: h,
        transition: "width 0.5s ease",
        boxShadow: `0 0 6px ${color}66`,
      }}/>
    </div>
  );
}

/** Stat kartı (Temel Özellikler grid'i) */
function StatCard({ name, emoji, level, xp, xpMax, barColor }) {
  return (
    <div style={{
      flex: 1,
      background: C.card2,
      border: `1px solid ${C.goldBorder}`,
      borderRadius: 8,
      padding: "11px 6px 10px",
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: 6,
      minWidth: 0,
    }}>
      <span style={{
        fontSize: 8.5, fontWeight: 700, letterSpacing: "0.17em",
        color: C.gold, fontFamily: "'Cinzel', serif",
        textTransform: "uppercase", textAlign: "center",
        lineHeight: 1.2,
      }}>{name}</span>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{emoji}</span>
      <DiamondBadge value={level} size={40}/>
      <span style={{ fontSize: 9, color: C.textDim, textAlign: "center" }}>
        {xp} / {xpMax} XP
      </span>
      <Bar current={xp} max={xpMax} color={barColor}/>
    </div>
  );
}

/** Toplumsal statü kartı */
function SocialCard({ name, icon, value, label, color }) {
  return (
    <div style={{
      flex: 1,
      background: C.card2,
      border: `1px solid ${C.goldBorder}`,
      borderRadius: 8,
      padding: "12px 6px",
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: 3,
      minWidth: 0,
    }}>
      <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontSize: 7.5, fontWeight: 700, letterSpacing: "0.14em",
        color: C.gold, fontFamily: "'Cinzel', serif",
        textTransform: "uppercase",
      }}>{name}</span>
      <span style={{
        fontSize: 24, fontWeight: 700, color,
        fontFamily: "'Cinzel', serif", lineHeight: 1,
        marginTop: 2,
      }}>{value}</span>
      <span style={{ fontSize: 8.5, color: C.textDim, textAlign: "center", lineHeight: 1.3 }}>
        {label}
      </span>
    </div>
  );
}

/** Bölüm başlığı */
function SectionHead({ title, right }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "space-between", marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.22em",
          color: C.gold, fontFamily: "'Cinzel', serif",
          textTransform: "uppercase",
        }}>{title}</span>
        <span style={{
          fontSize: 13, color: C.textDim, lineHeight: 1,
          cursor: "help", opacity: 0.6,
        }}>?</span>
      </div>
      {right}
    </div>
  );
}

/** Kart kabı */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.goldBorder}`,
      borderRadius: 10,
      padding: "14px 12px",
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ═══════════════════ VERİ ADAPTÖRÜ ════════════════════ */
/**
 * Backend'den gelen ham veriyi UI'ın beklediği formata çevirir.
 * Hem snake_case (Python) hem camelCase (JS) desteklenir.
 */
function adaptCharacter(ch = {}) {
  const get  = (...keys) => { for (const k of keys) if (ch[k] !== undefined) return ch[k]; return undefined; };
  const stat = (key) => {
    const s = ch[key];
    if (!s) return { level: 1, xp: 0, xpMax: 40, label: "Sefil" };
    return {
      level:  s.level  ?? 1,
      xp:     s.xp     ?? 0,
      xpMax:  s.xp_max ?? s.xpMax ?? 40,
      label:  s.label  ?? "",
    };
  };

  return {
    name:          get("name")                                 || "KARAKTER",
    portrait:      get("portrait", "portrait_url")             || null,
    clanCrest:     get("clan_crest", "clanCrest")              || null,
    age:           get("age")                                  ?? 0,
    gender:        get("gender")                               || "ERKEK",
    ethnicity:     get("ethnicity")                            || "",
    religion:      get("religion")                             || "",
    career:        get("career")                               || "İşsiz",
    careerTitle:   get("career_title", "careerTitle")          || "Çırak",
    careerLevel:   get("career_level", "careerLevel")          ?? 0,
    careerXP:      get("career_xp",    "careerXP")             ?? 0,
    careerXPMax:   get("career_xp_max","careerXPMax")          ?? 100,
    isChild:       get("is_child",     "isChild")              ?? false,
    freedomAge:    get("freedom_age",  "freedomAge")           ?? 13,
    health:        get("health")                               ?? 100,
    healthMax:     get("health_max",   "healthMax")            ?? 100,
    energy:        get("energy", "hunger")                     ?? 100,
    energyMax:     get("energy_max","energyMax","hunger_max")  ?? 100,
    gold:          get("money", "gold")                        ?? 0,
    crownLevel:    get("crown_level",  "crownLevel")           ?? 0,
    statPoints:    get("stat_points",  "statPoints")           ?? 0,
    strength:      stat("strength"),
    intelligence:  stat("intelligence"),
    charisma:      stat("charisma"),
    stamina:       stat("stamina"),
    reputation:    get("reputation")                           ?? 0,
    repLabel:      get("reputation_label","reputationLabel")   || "Yabancı",
    honor:         get("honor")                                ?? 0,
    honorLabel:    get("honor_label",  "honorLabel")           || "Tarafsız",
    fear:          get("fear")                                 ?? 0,
    fearLabel:     get("fear_label",   "fearLabel")            || "Önemsiz",
    fame:          get("fame")                                 ?? 0,
    fameLabel:     get("fame_label",   "fameLabel")            || "Bilinmeyen",
    buyMult:       get("buy_multiplier","buyMultiplier")        ?? 0,
    sellMult:      get("sell_multiplier","sellMultiplier")      ?? 0,
    skills:        get("special_skills","specialSkills")        || [],
    crime:         get("crime")                                 ?? 0,
    itibarLabel:   get("reputation_label","reputationLabel")   || "Yabancı",
  };
}

/* ═══════════════════ ANA BİLEŞEN ════════════════════ */
export default function KarakterEkrani({
  character,
  onBack        = () => {},
  onSettings    = () => {},
  onNavigate    = () => {},
  onCareerClick = () => {},
  dunyaContent  = null,
  seruvenContent= null,
}) {
  const [activeTab, setActiveTab] = useState("özellikler");
  const [activeNav, setActiveNav] = useState("karakter");

  useEffect(() => { injectFonts(); }, []);

  const d = adaptCharacter(character);
  const hasCareer = d.career !== "İşsiz" && d.career !== "";

  /* ── TAB & NAV STİLLERİ ── */
  const tabStyle = (id) => ({
    flex: 1, padding: "10px 4px",
    fontSize: 9.5, fontWeight: 700, letterSpacing: "0.15em",
    textAlign: "center", textTransform: "uppercase",
    cursor: "pointer",
    color:       activeTab === id ? C.gold : C.textDim,
    background:  activeTab === id ? C.goldBg : "transparent",
    borderBottom: activeTab === id ? `2px solid ${C.gold}` : "2px solid transparent",
    fontFamily:  "'Cinzel', Georgia, serif",
    transition:  "all 0.2s",
    display:     "flex", alignItems: "center",
    justifyContent: "center", gap: 4,
    userSelect:  "none",
  });

  const navStyle = (id) => ({
    flex: 1,
    display:        "flex", flexDirection: "column",
    alignItems:     "center", gap: 3,
    padding:        "5px 2px 0",
    cursor:         "pointer",
    color:          activeNav === id ? C.gold : "#505050",
    fontSize:       8, letterSpacing: "0.09em",
    fontFamily:     "'Cinzel', Georgia, serif",
    userSelect:     "none",
    transition:     "color 0.2s",
  });

  /* ── SVG İKONLAR ── */
  const ArrowLeft = () => (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  );
  const GearIcon = () => (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={12} cy={12} r={3}/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
  const ShieldFill = ({ size = 18, color = "#0A0A0A" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
  const ShieldOut = ({ size = 20, color = C.gold }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
  const HomeIcon   = ({ active }) => (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={active ? C.gold : "#505050"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
  const CastleIcon = ({ active }) => (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={active ? C.gold : "#505050"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V7l3-3 3 3 3-3 3 3 3-3v14"/><path d="M3 21h18"/><path d="M9 21V12h6v9"/>
    </svg>
  );
  const PeopleIcon = ({ active }) => (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={active ? C.gold : "#505050"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx={9} cy={7} r={4}/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
  const MenuIcon   = ({ active }) => (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={active ? C.gold : "#505050"} strokeWidth={1.8} strokeLinecap="round">
      <line x1={3} y1={6}  x2={21} y2={6}/><line x1={3} y1={12} x2={21} y2={12}/><line x1={3} y1={18} x2={21} y2={18}/>
    </svg>
  );

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div style={{
      width: "100%", minHeight: "100dvh",
      background: C.bg, color: C.text,
      display: "flex", flexDirection: "column",
      fontFamily: "'Lora', Georgia, serif",
      overflowX: "hidden",
    }}>

      {/* ═══════════════ HEADER ═══════════════ */}
      <div style={{
        padding: "16px 18px 0",
        background: C.bg,
        position: "sticky", top: 0, zIndex: 30,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <button
            onClick={onBack}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 6, lineHeight: 0 }}
          ><ArrowLeft/></button>

          <span style={{
            fontSize: 17, fontWeight: 700,
            letterSpacing: "0.32em", color: C.gold,
            fontFamily: "'Cinzel', Georgia, serif",
          }}>KARAKTER</span>

          <button
            onClick={onSettings}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 6, lineHeight: 0 }}
          ><GearIcon/></button>
        </div>
        <GoldDivider/>
      </div>

      {/* ═══════════════ KAYDIRILAN İÇERİK ═══════════════ */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "12px 14px 88px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>

        {/* ════════════ KARAKTER KARTI ════════════ */}
        <div style={{
          background: "linear-gradient(150deg, #17120A 0%, #0D0A06 100%)",
          border: `1px solid ${C.goldBorder}`,
          borderRadius: 12, padding: 14,
          boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}>

          {/* ── Üst satır: Portre + Bilgi ── */}
          <div style={{ display: "flex", gap: 12 }}>

            {/* Portre */}
            <div style={{ position: "relative", flexShrink: 0, width: 108, height: 136 }}>
              {/* Klan arması */}
              <div style={{
                position: "absolute", top: -3, left: -3, zIndex: 3,
                width: 32, height: 32,
                background: "linear-gradient(135deg, #6B0000 0%, #8B6914 100%)",
                border: `1.5px solid ${C.gold}`,
                borderRadius: 4,
                display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 16,
                boxShadow: `0 0 8px rgba(201,168,76,0.4)`,
              }}>
                {d.clanCrest || "🦁"}
              </div>

              {/* Portre görseli */}
              <div style={{
                width: "100%", height: "100%",
                border: `2px solid ${C.gold}`,
                borderRadius: 8, overflow: "hidden",
                background: "#1A1208",
                boxShadow: `0 0 20px rgba(201,168,76,0.2), inset 0 0 0 1px rgba(201,168,76,0.1)`,
              }}>
                {d.portrait ? (
                  <img src={d.portrait} alt={d.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center",
                    justifyContent: "center",
                    fontSize: 44, color: C.goldDim,
                  }}>👤</div>
                )}
              </div>

              {/* Düzenle butonu */}
              <div style={{
                position: "absolute", top: -3, right: -3, zIndex: 3,
                width: 24, height: 24,
                background: "rgba(10,8,4,0.88)",
                border: `1px solid ${C.goldBorder}`,
                borderRadius: "50%",
                display: "flex", alignItems: "center",
                justifyContent: "center",
                cursor: "pointer", fontSize: 10,
              }}>✏️</div>
            </div>

            {/* Bilgi paneli */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>

              {/* KARAKTER etiketi + İTİBAR */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{
                  fontSize: 7.5, letterSpacing: "0.22em",
                  color: C.textDim, fontFamily: "'Cinzel', serif",
                }}>KARAKTER</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 7, color: C.textDim, letterSpacing: "0.1em", fontFamily: "'Cinzel', serif" }}>İTİBAR</div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: C.textDim,
                    border: `1px solid ${C.goldBorder}`,
                    padding: "1px 6px", borderRadius: 4,
                    fontFamily: "'Cinzel', serif", letterSpacing: "0.1em",
                  }}>{d.repLabel.toUpperCase()}</div>
                </div>
              </div>

              {/* İsim */}
              <div style={{
                fontSize: 20, fontWeight: 700, lineHeight: 1.05,
                color: C.goldBright,
                fontFamily: "'Cinzel', Georgia, serif",
                letterSpacing: "0.03em", wordBreak: "break-word",
              }}>{d.name}</div>

              {/* Kariyer */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx={12} cy={12} r={9}/><path d="M12 8v4l3 3"/>
                </svg>
                <span style={{ fontSize: 12, color: C.textMid, fontStyle: "italic", fontFamily: "'Lora', Georgia, serif" }}>
                  {d.career}
                </span>
              </div>

              {/* Demografik rozetler */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 1 }}>
                {[
                  { icon: "🛡", val: `${d.age} YAŞ` },
                  { icon: d.gender === "KIZ" || d.gender === "Kadın" || d.gender === "female" ? "♀" : "♂", val: d.gender?.toUpperCase?.() || d.gender },
                  { icon: "❄️", val: d.ethnicity },
                  { icon: "⭐", val: d.religion },
                ].filter(b => b.val).map((b, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 2,
                    background: C.goldBg,
                    border: `1px solid ${C.goldBorder}`,
                    borderRadius: 4, padding: "2px 5px",
                  }}>
                    <span style={{ fontSize: 9 }}>{b.icon}</span>
                    <span style={{
                      fontSize: 8.5, fontWeight: 700, color: C.gold,
                      letterSpacing: "0.1em", fontFamily: "'Cinzel', serif",
                    }}>{b.val}</span>
                  </div>
                ))}
              </div>

              {/* Çocuk uyarısı */}
              {d.isChild && (
                <div style={{
                  background: C.goldBg,
                  border: `1px solid ${C.goldBorder}`,
                  borderRadius: 6, padding: "3px 7px",
                  fontSize: 8.5, color: C.gold,
                  letterSpacing: "0.05em", fontFamily: "'Cinzel', serif",
                  marginTop: 1,
                }}>
                  🔒 ÇOCUK · {d.freedomAge} YAŞINDA ÖZGÜRLEŞECEKSİN
                </div>
              )}
            </div>
          </div>

          {/* ── İstatistik çubuğu ── */}
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>

            {/* Sağlık */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 3 }}>
                <span style={{ fontSize: 12 }}>❤️</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#E05050", fontFamily: "'Cinzel', serif" }}>
                  {d.health}
                </span>
                <span style={{ fontSize: 9.5, color: C.textDim }}>/ {d.healthMax}</span>
              </div>
              <Bar current={d.health} max={d.healthMax} color={C.red}/>
            </div>

            {/* Enerji */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 3 }}>
                <span style={{ fontSize: 12 }}>☕</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.amber, fontFamily: "'Cinzel', serif" }}>
                  {d.energy}
                </span>
                <span style={{ fontSize: 9.5, color: C.textDim }}>/ {d.energyMax}</span>
              </div>
              <Bar current={d.energy} max={d.energyMax} color={C.amber}/>
            </div>

            {/* Altın */}
            <div style={{ flex: 0.9, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: C.gold }}>⚜</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.gold, fontFamily: "'Cinzel', serif" }}>
                  {d.gold}
                </span>
              </div>
              {/* Placeholder bar alanı */}
              <div style={{ height: 4 }}/>
            </div>

            {/* Taç seviyesi */}
            <div style={{ flex: 0.65, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 3 }}>
                <span style={{ fontSize: 12 }}>👑</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.purple, fontFamily: "'Cinzel', serif" }}>
                  {d.crownLevel}
                </span>
              </div>
              <div style={{ height: 4 }}/>
            </div>
          </div>

          {/* ── Kariyer XP çubuğu ── */}
          {hasCareer && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              {/* Level rozeti */}
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #3A2810, #201408)",
                border: `1.5px solid ${C.gold}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: C.gold,
                fontFamily: "'Cinzel', serif",
                boxShadow: `0 0 8px rgba(201,168,76,0.3)`,
              }}>{d.careerLevel}</div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 8, letterSpacing: "0.18em", color: C.textDim, fontFamily: "'Cinzel', serif" }}>
                    KARİYER XP
                  </span>
                  <span style={{ fontSize: 10, color: C.gold }}>
                    {d.careerXP.toLocaleString("tr-TR")} / {d.careerXPMax.toLocaleString("tr-TR")}
                  </span>
                </div>
                <Bar current={d.careerXP} max={d.careerXPMax} color={C.gold} h={5}/>
              </div>
            </div>
          )}
        </div>

        {/* ════════════ TAB NAVİGASYON ════════════ */}
        <div style={{
          display: "flex",
          background: C.card,
          border: `1px solid ${C.goldBorder}`,
          borderRadius: 10, overflow: "hidden",
        }}>
          {[
            { id: "özellikler", emoji: "👤", label: "ÖZELLİKLER" },
            { id: "dünya",      emoji: "👥", label: "DÜNYA" },
            { id: "serüven",    emoji: "🎒", label: "SERÜVEN" },
          ].map(t => (
            <div key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>
              <span style={{ fontSize: 11 }}>{t.emoji}</span>
              {t.label}
            </div>
          ))}
        </div>

        {/* ════════════ ÖZELLİKLER TAB ════════════ */}
        {activeTab === "özellikler" && <>

          {/* ── TEMEL ÖZELLİKLER ── */}
          <Card>
            <SectionHead
              title="TEMEL ÖZELLİKLER"
              right={
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: C.textDim }}>
                    {d.statPoints} PUAN KALDI
                  </span>
                  <div style={{
                    width: 22, height: 22,
                    border: `1px solid ${d.statPoints > 0 ? C.gold : "#2A2A2A"}`,
                    borderRadius: 5,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color:   d.statPoints > 0 ? C.gold : "#3A3A3A",
                    fontSize: 17, fontWeight: 700,
                    cursor:  d.statPoints > 0 ? "pointer" : "default",
                    opacity: d.statPoints > 0 ? 1 : 0.35,
                    transition: "all 0.2s",
                  }}>+</div>
                </div>
              }
            />
            <div style={{ display: "flex", gap: 7 }}>
              <StatCard
                name="GÜÇ"          emoji="💪"
                level={d.strength.level}     xp={d.strength.xp}     xpMax={d.strength.xpMax}
                barColor={C.amber}
              />
              <StatCard
                name="ZEKÂ"         emoji="📚"
                level={d.intelligence.level} xp={d.intelligence.xp} xpMax={d.intelligence.xpMax}
                barColor={C.blue}
              />
              <StatCard
                name="KARİZMA"      emoji="🎭"
                level={d.charisma.level}     xp={d.charisma.xp}     xpMax={d.charisma.xpMax}
                barColor={C.amber}
              />
              <StatCard
                name="DAYANIKLILIK" emoji="🛡️"
                level={d.stamina.level}      xp={d.stamina.xp}      xpMax={d.stamina.xpMax}
                barColor={C.green}
              />
            </div>
          </Card>

          {/* ── KARİYER KARTI ── */}
          {hasCareer && (
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Kariyer ikonu */}
                <div style={{
                  width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #1A1208 0%, #0D0A04 100%)",
                  border: `1.5px solid ${C.gold}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                  boxShadow: `0 0 12px rgba(201,168,76,0.2)`,
                }}>⚖️</div>

                {/* Bilgi */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 700, color: C.gold,
                    fontFamily: "'Cinzel', serif", letterSpacing: "0.06em",
                  }}>{d.career.toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>
                    Seviye {d.careerLevel} · {d.careerTitle}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0 3px" }}>
                    <span style={{ fontSize: 8, letterSpacing: "0.14em", color: C.textDim, fontFamily: "'Cinzel', serif" }}>
                      KARİYER XP
                    </span>
                    <span style={{ fontSize: 10, color: C.gold }}>
                      {d.careerXP.toLocaleString("tr-TR")} / {d.careerXPMax.toLocaleString("tr-TR")}
                    </span>
                  </div>
                  <Bar current={d.careerXP} max={d.careerXPMax} color={C.gold} h={4}/>
                </div>

                {/* CTA */}
                <button
                  onClick={onCareerClick}
                  style={{
                    padding: "8px 11px",
                    background: "transparent",
                    border: `1px solid ${C.gold}`,
                    borderRadius: 6, color: C.gold,
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.1em", cursor: "pointer",
                    fontFamily: "'Cinzel', serif", flexShrink: 0,
                    transition: "background 0.2s",
                  }}
                >KARİYER ›</button>
              </div>
            </Card>
          )}

          {/* ── TOPLUMSAL STATÜ ── */}
          <Card>
            <SectionHead title="TOPLUMSAL STATÜ"/>
            <div style={{ display: "flex", gap: 7 }}>
              <SocialCard name="İTİBAR" icon="🛡"  value={d.reputation} label={d.repLabel}   color={C.green}/>
              <SocialCard name="ŞEREF"  icon="⚜️"  value={d.honor}      label={d.honorLabel} color={C.blue}/>
              <SocialCard name="KORKU"  icon="⛑️"  value={d.fear}       label={d.fearLabel}  color={C.red}/>
              <SocialCard name="ÜN"     icon="👑"   value={d.fame}       label={d.fameLabel}  color={C.purple}/>
            </div>
          </Card>

          {/* ── TİCARET ÇARPANLARI ── */}
          {(d.buyMult !== 0 || d.sellMult !== 0) && (
            <Card style={{ display: "flex", gap: 0, padding: "14px 0" }}>
              {/* Alış */}
              <div style={{ flex: 1, textAlign: "center", padding: "0 12px" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>💰</div>
                <div style={{
                  fontSize: 8, letterSpacing: "0.14em",
                  color: C.textDim, fontFamily: "'Cinzel', serif", marginBottom: 5,
                }}>ALIŞ ÇARPANI</div>
                <div style={{
                  fontSize: 22, fontWeight: 700, color: C.red,
                  fontFamily: "'Cinzel', serif",
                }}>
                  {d.buyMult < 0 ? `-` : `+`}%{Math.abs(d.buyMult)}
                </div>
              </div>

              {/* Ayırıcı */}
              <div style={{ width: 1, background: C.goldBorder, margin: "4px 0" }}/>

              {/* Satış */}
              <div style={{ flex: 1, textAlign: "center", padding: "0 12px" }}>
                <div style={{ fontSize: 20, marginBottom: 4, color: C.gold }}>⚜</div>
                <div style={{
                  fontSize: 8, letterSpacing: "0.14em",
                  color: C.textDim, fontFamily: "'Cinzel', serif", marginBottom: 5,
                }}>SATIŞ ÇARPANI</div>
                <div style={{
                  fontSize: 22, fontWeight: 700, color: C.green,
                  fontFamily: "'Cinzel', serif",
                }}>
                  {d.sellMult > 0 ? `+` : ``}%{d.sellMult}
                </div>
              </div>
            </Card>
          )}

          {/* ── ÖZEL YETENEKLER ── */}
          {d.skills.length > 0 && (
            <Card>
              <SectionHead
                title="ÖZEL YETENEKLER"
                right={
                  <div style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                    <span style={{ fontSize: 9.5, color: C.gold, fontFamily: "'Cinzel', serif" }}>TÜMÜNÜ GÖR</span>
                    <span style={{ color: C.gold, fontSize: 15, lineHeight: 1 }}>›</span>
                  </div>
                }
              />
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {d.skills.map((skill, i) => (
                  <div key={i} style={{
                    minWidth: 100, maxWidth: 110, background: C.card2,
                    border: `1px solid ${C.goldBorder}`,
                    borderRadius: 8, padding: "10px 8px",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 5, flexShrink: 0,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "linear-gradient(135deg, #2A1A08, #1A1008)",
                      border: `1px solid ${C.goldBorder}`,
                      display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 18,
                    }}>{skill.icon || "⭐"}</div>
                    <span style={{
                      fontSize: 9.5, fontWeight: 600, color: C.gold,
                      textAlign: "center", fontFamily: "'Cinzel', serif",
                      letterSpacing: "0.04em", lineHeight: 1.3,
                    }}>{skill.name}</span>
                    <span style={{
                      fontSize: 9, color: C.textDim,
                      textAlign: "center", lineHeight: 1.35,
                      fontFamily: "'Lora', Georgia, serif",
                    }}>{skill.description}</span>
                    <span style={{
                      fontSize: 9, color: C.textDim,
                      fontFamily: "'Cinzel', serif",
                    }}>Seviye {skill.level}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── YETENEK AĞACI (çocuk/işsiz karakterler için) ── */}
          {(d.isChild || !hasCareer) && (
            <Card>
              <div style={{
                fontSize: 9, letterSpacing: "0.2em",
                color: C.textDim, fontFamily: "'Cinzel', serif", marginBottom: 12,
                textTransform: "uppercase",
              }}>YETENEK AĞACI</div>

              <div style={{
                background: C.card2, border: `1px solid ${C.goldBorder}`,
                borderRadius: 8, padding: "12px 14px",
                display: "flex", alignItems: "center",
                gap: 12, cursor: "pointer",
                transition: "border-color 0.2s",
              }}>
                <span style={{ fontSize: 20, color: C.redDim }}>🗡️</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: C.gold,
                    fontFamily: "'Cinzel', serif",
                  }}>SAVAŞ</div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>Seviye 0</div>
                </div>
                <span style={{ fontSize: 10, color: C.textDim }}>0/10 XP</span>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                  stroke={C.textDim} strokeWidth={2} strokeLinecap="round">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
              </div>
            </Card>
          )}

          {/* ── SUÇ UYARISI ── */}
          {d.crime > 0 && (
            <div style={{
              background: "rgba(192,57,43,0.1)",
              border: "1px solid rgba(192,57,43,0.35)",
              borderRadius: 10, padding: "12px 14px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: C.red,
                  fontFamily: "'Cinzel', serif", letterSpacing: "0.08em",
                }}>SUÇLU</div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>
                  Suç puanı: {d.crime}
                </div>
              </div>
            </div>
          )}
        </>}

        {/* ════════════ DÜNYA TAB ════════════ */}
        {activeTab === "dünya" && (
          dunyaContent ?? (
            <Card style={{ padding: "48px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 10, opacity: 0.3 }}>🌍</div>
              <div style={{ fontSize: 10, letterSpacing: "0.18em", color: C.textDim, fontFamily: "'Cinzel', serif" }}>DÜNYA BİLGİSİ YAKINDA</div>
            </Card>
          )
        )}

        {/* ════════════ SERÜVEN TAB ════════════ */}
        {activeTab === "serüven" && (
          seruvenContent ?? (
            <Card style={{ padding: "48px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 10, opacity: 0.3 }}>📜</div>
              <div style={{ fontSize: 10, letterSpacing: "0.18em", color: C.textDim, fontFamily: "'Cinzel', serif" }}>SERÜVEN KAYITLARI YAKINDA</div>
            </Card>
          )
        )}
      </div>

      {/* ═══════════════ ALT NAVİGASYON ═══════════════ */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(8,6,3,0.97)",
        borderTop: `1px solid ${C.goldBorder}`,
        backdropFilter:         "blur(12px)",
        WebkitBackdropFilter:   "blur(12px)",
        display: "flex", alignItems: "center",
        padding: "4px 0 10px", zIndex: 30,
      }}>
        {/* ANA SAYFA */}
        <div
          onClick={() => { setActiveNav("anasayfa"); onNavigate("anasayfa"); }}
          style={navStyle("anasayfa")}
        >
          <HomeIcon active={activeNav === "anasayfa"}/>
          <span>ANA SAYFA</span>
        </div>

        {/* KARAKTER – özel aktif stil */}
        <div
          onClick={() => { setActiveNav("karakter"); onNavigate("karakter"); }}
          style={navStyle("karakter")}
        >
          <div style={{
            width: 42, height: 42,
            borderRadius: 12,
            background: activeNav === "karakter"
              ? C.gold
              : "rgba(201,168,76,0.1)",
            border: `1.5px solid ${activeNav === "karakter" ? C.gold : C.goldBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: activeNav === "karakter" ? `0 0 12px ${C.gold}66` : "none",
            transition: "all 0.2s",
          }}>
            <ShieldFill color={activeNav === "karakter" ? "#0A0A0A" : C.gold}/>
          </div>
          <span>KARAKTER</span>
        </div>

        {/* ŞEHİR */}
        <div
          onClick={() => { setActiveNav("şehir"); onNavigate("şehir"); }}
          style={navStyle("şehir")}
        >
          <CastleIcon active={activeNav === "şehir"}/>
          <span>ŞEHİR</span>
        </div>

        {/* İLİŞKİLER */}
        <div
          onClick={() => { setActiveNav("ilişkiler"); onNavigate("ilişkiler"); }}
          style={navStyle("ilişkiler")}
        >
          <PeopleIcon active={activeNav === "ilişkiler"}/>
          <span>İLİŞKİLER</span>
        </div>

        {/* MENÜ */}
        <div
          onClick={() => { setActiveNav("menü"); onNavigate("menü"); }}
          style={navStyle("menü")}
        >
          <MenuIcon active={activeNav === "menü"}/>
          <span>MENÜ</span>
        </div>
      </div>
    </div>
  );
}
