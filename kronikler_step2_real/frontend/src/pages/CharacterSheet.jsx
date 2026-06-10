import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Heart, Coins, ShieldAlert, Briefcase, Sword,
  Users, Sparkles, Baby, Apple,
  Star, Flame, Eye, Crown, ChevronRight, ChevronLeft,
  Package, Shirt, Hand, Footprints, ShieldHalf, FlaskRound,
  Award, Scroll, TrendingUp, GraduationCap, MapPin, Settings,
  HelpCircle,
} from "lucide-react";

// ── Sekme sabitleri ──────────────────────────────────────────────────────────
const TABS = [
  { id: "ozellikler", label: "Özellikler", icon: "👑" },
  { id: "dunya",      label: "Dünya",      icon: "👥" },
  { id: "seruven",    label: "Serüven",    icon: "🎒" },
];

// ── Stat meta ────────────────────────────────────────────────────────────────
const STAT_META = [
  { key: "strength",     label: "GÜÇ",          emoji: "💪", color: "#E8973A", fill: "bg-orange-700" },
  { key: "intelligence", label: "ZEKÂ",          emoji: "📖", color: "#4A8FC4", fill: "bg-sky-700" },
  { key: "charisma",     label: "KARİZMA",       emoji: "🎭", color: "#C9A84C", fill: "bg-amber-700" },
  { key: "stamina",      label: "DAYANIKLILIK",  emoji: "🛡", color: "#4A9A5A", fill: "bg-emerald-700" },
];

// ── Toplumsal statü meta ─────────────────────────────────────────────────────
const SOCIAL_META = [
  { key: "reputation", label: "İTİBAR",  icon: "🛡",  color: "#C9A84C" },
  { key: "honor",      label: "ŞEREF",   icon: "✦",   color: "#4A8FC4" },
  { key: "fear",       label: "KORKU",   icon: "⚔",   color: "#C84040" },
  { key: "fame",       label: "ÜN",      icon: "👑",   color: "#9B6FD0" },
];

const SOCIAL_LABELS = {
  reputation: [
    { min: 60, label: "Efsanevi" },  { min: 40, label: "Saygı Duyulan" },
    { min: 20, label: "Tanınan" },   { min: 0,  label: "Sıradan" },
    { min: -20, label: "Şüpheli" },  { min: -Infinity, label: "Rezil" },
  ],
  honor:  [{ min: 60, label: "Onurlu" }, { min: 30, label: "Güvenilir" }, { min: 0, label: "Tarafsız" }, { min: -Infinity, label: "Şerefsiz" }],
  fear:   [{ min: 60, label: "Dehşet" }, { min: 30, label: "Korkulan" },  { min: 10, label: "Saygılı" },  { min: 0, label: "Önemsiz" },      { min: -Infinity, label: "Güvensiz" }],
  fame:   [{ min: 60, label: "Ünlü" },   { min: 30, label: "Bilinen" },   { min: 10, label: "Tanınan" }, { min: 0, label: "Belirsiz" },       { min: -Infinity, label: "Bilinmez" }],
};

function getSocialLabel(key, value) {
  const levels = SOCIAL_LABELS[key] || [];
  return levels.find(l => value >= l.min)?.label ?? "—";
}

// ── İlişkiler bant sabitleri ─────────────────────────────────────────────────
const BANDS = [
  { id: "dost",    label: "Dostlar",    test: (s) => s >= 50,           cls: "border-emerald-800 text-emerald-300" },
  { id: "arkadaş", label: "Arkadaşlar", test: (s) => s >= 20 && s < 50, cls: "border-emerald-900/70 text-emerald-200" },
  { id: "nötr",    label: "Nötr",       test: (s) => s > -20 && s < 20, cls: "border-stone-700 text-stone-300" },
  { id: "rakip",   label: "Rakipler",   test: (s) => s <= -20 && s > -50, cls: "border-red-900/70 text-red-300" },
  { id: "düşman",  label: "Düşmanlar",  test: (s) => s <= -50,          cls: "border-red-800 text-red-400" },
];

const REL_FLAVOR = [
  { min: 80, label: "Sadık", color: "#4A9A5A" }, { min: 50, label: "Güvenilir", color: "#5A9A6A" },
  { min: 20, label: "Dost", color: "#6AAA7A" },  { min: 5, label: "Yakın", color: "#B8A880" },
  { min: -4, label: "Nötr", color: "#7A6A4F" },  { min: -19, label: "Soğuk", color: "#C88040" },
  { min: -49, label: "Düşman", color: "#C84040" },{ min: -Infinity, label: "Kan Davası", color: "#A82020" },
];
function getRelFlavor(score) {
  return REL_FLAVOR.find(r => score >= r.min) ?? REL_FLAVOR[REL_FLAVOR.length - 1];
}

const PORTRAIT_MAP = {
  "Yaz": "/images/hero/cocuk_yaz.jpg", "Sonbahar": "/images/hero/cocuk_sonbahar.jpg",
  "Kış": "/images/hero/cocuk_kis.jpg", "İlkbahar": "/images/hero/cocuk_ilkbahar.jpg",
};

const SLOT_META = [
  { key: "head", label: "Baş", icon: Crown }, { key: "body", label: "Vücut", icon: Shirt },
  { key: "weapon", label: "Silah", icon: Sword }, { key: "hands", label: "Eller", icon: Hand },
  { key: "legs", label: "Bacaklar", icon: ShieldHalf }, { key: "feet", label: "Ayaklar", icon: Footprints },
];
const TYPE_ICON = { food: Apple, drink: FlaskRound, consumable: FlaskRound, weapon: Sword, armor: Shirt };

const MILESTONE_TYPES = {
  savaş_zaferi: { icon: "🏆", label: "Savaş Zaferi" }, evlilik: { icon: "💍", label: "Evlendi" },
  doğum: { icon: "👶", label: "Çocuk Sahibi Oldu" }, meslek_değişimi: { icon: "🔄", label: "Meslek Değiştirdi" },
  kariyer_terfi: { icon: "⭐", label: "Kariyer Terfisi" }, nesil_devri: { icon: "🌿", label: "Nesil Devri" },
  miras: { icon: "📜", label: "Miras Aldı" }, okul: { icon: "📚", label: "Eğitim Tamamladı" },
};

// ── Karakter Portresi ────────────────────────────────────────────────────────
function CharacterPortrait({ p, season }) {
  // Show seasonal village image for all ages as atmospheric background
  const portraitSrc = PORTRAIT_MAP[season] || "/images/hero/cocuk_yaz.jpg";
  const initials = p.name
    ? p.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  return (
    <div style={{
      position: "relative", width: "130px", minHeight: "160px", flexShrink: 0,
      border: "1.5px solid var(--color-gold)",
      borderRadius: "8px", overflow: "hidden",
      boxShadow: "0 0 0 1px rgba(201,168,76,0.15), 0 0 24px rgba(201,168,76,0.35), 0 8px 32px rgba(0,0,0,0.7)",
    }}>
      {portraitSrc ? (
        <img src={portraitSrc} alt="Karakter"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block", minHeight: 160 }} />
      ) : (
        <div style={{
          width: "100%", height: "160px",
          background: "linear-gradient(160deg, #2A1C10 0%, #1A100A 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem",
        }}>
          <span style={{ fontFamily: "Cinzel, serif", fontSize: "2.2rem", color: "rgba(201,168,76,0.60)", fontWeight: 700 }}>
            {initials}
          </span>
          <div style={{ width: 36, height: 1, background: "linear-gradient(to right, transparent, rgba(201,168,76,0.4), transparent)" }} />
        </div>
      )}

      {/* Bottom fade */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "40px",
        background: "linear-gradient(to top, rgba(13,10,6,0.85), transparent)",
      }} />

      {/* Heraldry badge — top left */}
      <div style={{
        position: "absolute", top: 6, left: 6,
        width: "26px", height: "30px", borderRadius: "4px 4px 14px 14px",
        background: "rgba(120,20,20,0.85)", border: "1px solid rgba(201,168,76,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 6px rgba(0,0,0,0.6)",
      }}>
        <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>🦁</span>
      </div>

      {/* Edit button — top right */}
      <div style={{
        position: "absolute", top: 6, right: 6,
        width: "22px", height: "22px", borderRadius: "50%",
        background: "rgba(13,10,6,0.75)", border: "1px solid rgba(201,168,76,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }}>
        <span style={{ fontSize: "0.6rem" }}>✏</span>
      </div>
    </div>
  );
}

// ── Diamond stat card ─────────────────────────────────────────────────────────
function DiamondStatCard({ stat, value, xp, nextXp, color, emoji }) {
  const pct = nextXp > 0 ? Math.min(100, (xp / nextXp) * 100) : 0;
  return (
    <div style={{
      background: "var(--color-card)",
      border: "1px solid var(--color-border-hi)",
      borderRadius: "8px", padding: "0.9rem 0.5rem 0.75rem",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem",
      boxShadow: `0 0 0 1px transparent, 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 ${color}18`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Top color accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "2px",
        background: `linear-gradient(to right, transparent, ${color}aa, transparent)`,
      }} />

      {/* Label */}
      <span style={{
        fontFamily: "Cinzel, serif", fontSize: "0.6rem", fontWeight: 700,
        color: "var(--color-parchment-muted)", letterSpacing: "0.14em", textTransform: "uppercase",
      }}>
        {stat}
      </span>

      {/* Emoji icon */}
      <span style={{ fontSize: "1.65rem", lineHeight: 1, filter: `drop-shadow(0 0 5px ${color}77)` }}>
        {emoji}
      </span>

      {/* Diamond number */}
      <div style={{ position: "relative", width: "50px", height: "50px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0.15rem 0" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "var(--color-card-hi)", border: `1.5px solid ${color}bb`,
          transform: "rotate(45deg)", borderRadius: "5px",
          boxShadow: `0 0 12px ${color}44, inset 0 1px 0 ${color}22`,
        }} />
        <span style={{
          position: "relative", zIndex: 1,
          fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "1.35rem",
          color: "var(--color-parchment)",
          textShadow: `0 0 10px ${color}77`,
        }}>
          {value}
        </span>
      </div>

      {/* XP label */}
      <span style={{
        fontFamily: "Crimson Text, serif", fontSize: "0.72rem",
        color: "var(--color-parchment-muted)",
      }}>
        {xp} / {nextXp} XP
      </span>

      {/* XP bar */}
      <div style={{ width: "100%", height: "3px", background: "rgba(0,0,0,0.5)", borderRadius: "2px", marginTop: "0.1rem" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(to right, ${color}99, ${color})`,
          boxShadow: `0 0 6px ${color}99`, borderRadius: "2px",
        }} />
      </div>
    </div>
  );
}

// ── Social stat card ──────────────────────────────────────────────────────────
function SocialStatCard({ label, icon, value, color, sublabel }) {
  return (
    <div style={{
      flex: 1, background: "var(--color-card)",
      border: "1px solid var(--color-border-hi)", borderRadius: "8px",
      padding: "0.8rem 0.4rem",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem",
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "2px",
        background: `linear-gradient(to right, transparent, ${color}77, transparent)`,
      }} />
      <span style={{ fontSize: "1.25rem", lineHeight: 1, marginBottom: "0.05rem" }}>{icon}</span>
      <span style={{
        fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "1.6rem",
        color, lineHeight: 1,
        textShadow: `0 0 12px ${color}66`,
      }}>
        {value}
      </span>
      <span style={{
        fontFamily: "Cinzel, serif", fontSize: "0.5rem", fontWeight: 700,
        color: "var(--color-parchment-muted)", letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "Crimson Text, serif", fontSize: "0.72rem", fontStyle: "italic",
        color: "var(--color-parchment-muted)", textAlign: "center", lineHeight: 1.3,
      }}>
        {sublabel}
      </span>
    </div>
  );
}

// ── Perk card ──────────────────────────────────────────────────────────────────
function PerkCard({ icon, name, desc, level }) {
  return (
    <div style={{
      flex: 1, background: "var(--color-card)",
      border: "1px solid var(--color-border-hi)", borderRadius: "8px",
      padding: "0.85rem 0.55rem",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem",
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Subtle top accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "1.5px",
        background: "linear-gradient(to right, transparent, rgba(201,168,76,0.4), transparent)",
      }} />
      {/* Icon circle */}
      <div style={{
        width: "2.6rem", height: "2.6rem", borderRadius: "50%",
        background: "linear-gradient(135deg, rgba(201,168,76,0.20) 0%, rgba(201,168,76,0.06) 100%)",
        border: "1.5px solid rgba(201,168,76,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 12px rgba(201,168,76,0.25)",
      }}>
        <span style={{ fontSize: "1.2rem" }}>{icon}</span>
      </div>
      <span style={{
        fontFamily: "Cinzel, serif", fontSize: "0.62rem", fontWeight: 700,
        color: "var(--color-parchment)", letterSpacing: "0.04em",
        textAlign: "center", lineHeight: 1.3,
      }}>
        {name}
      </span>
      <span style={{
        fontFamily: "Crimson Text, serif", fontSize: "0.75rem", fontStyle: "italic",
        color: "var(--color-parchment-muted)", textAlign: "center", lineHeight: 1.4,
      }}>
        {desc}
      </span>
      <span style={{
        fontFamily: "Cinzel, serif", fontSize: "0.55rem", fontWeight: 600,
        color: "var(--color-gold-dim)", letterSpacing: "0.08em",
        textTransform: "uppercase", marginTop: "0.1rem",
        border: "1px solid rgba(201,168,76,0.2)",
        borderRadius: "4px", padding: "0.1rem 0.4rem",
      }}>
        Seviye {level}
      </span>
    </div>
  );
}

// ── Premium Hero Card ─────────────────────────────────────────────────────────
function PremiumHeroCard({ p, season }) {
  const careerPct = p.career?.next_stage
    ? Math.min(100, Math.round((p.career.job_xp || 0) / (p.career.next_stage.xp_required || 1) * 100))
    : 100;
  const careerXp  = p.career?.job_xp || 0;
  const careerMax = p.career?.next_stage?.xp_required || 3000;
  const careerLvl = p.career?.level || 1;

  const genderIcon = p.gender === "kız" || p.gender === "kadın" ? "♀" : "♂";

  return (
    <div style={{
      margin: "0 0 0.75rem",
      background: "var(--color-card)",
      border: "1px solid var(--color-border-hi)",
      borderRadius: "10px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.55), 0 1px 0 rgba(201,168,76,0.10)",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Corner accents */}
      {[{top:0,left:0},{top:0,right:0}].map((pos,i) => (
        <div key={i} style={{
          position:"absolute", ...pos, width:"40px", height:"40px",
          background: i === 0
            ? "linear-gradient(135deg, rgba(201,168,76,0.14) 0%, transparent 60%)"
            : "linear-gradient(225deg, rgba(201,168,76,0.10) 0%, transparent 60%)",
          borderRadius: i === 0 ? "10px 0 0 0" : "0 10px 0 0",
          pointerEvents:"none",
        }} />
      ))}

      <div style={{ padding: "1rem" }}>
        <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>

          {/* Portrait */}
          <CharacterPortrait p={p} season={season} />

          {/* Info block */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: "0.1rem" }}>

            {/* Name */}
            <h1 style={{
              fontFamily: "Cinzel, serif", fontWeight: 700,
              fontSize: "clamp(1.3rem, 5.5vw, 1.65rem)",
              color: "var(--color-parchment)", letterSpacing: "0.08em",
              lineHeight: 1.1, marginBottom: "0.3rem",
              textShadow: "0 1px 10px rgba(0,0,0,0.8), 0 0 20px rgba(201,168,76,0.15)",
            }}>
              {p.name || "Karakter"}
            </h1>

            {/* Profession */}
            <div style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              marginBottom: "0.5rem",
            }}>
              <span style={{ color: "var(--color-gold)", fontSize: "0.7rem" }}>♦</span>
              <span style={{
                fontFamily: "Crimson Text, serif", fontStyle: "italic",
                fontSize: "0.92rem", color: "var(--color-gold)",
              }}>
                {p.profession || "—"}
              </span>
            </div>

            {/* Thin divider */}
            <div style={{ height: "1px", marginBottom: "0.5rem", background: "linear-gradient(to right, rgba(201,168,76,0.30), transparent)" }} />

            {/* Meta pills: age · gender · culture · religion */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: "0.3rem",
              marginBottom: "0.6rem",
            }}>
              {[
                { icon: "🛡", text: `${p.age || "?"} YAŞ` },
                { icon: genderIcon, text: p.gender?.toUpperCase() || "—" },
                { icon: "⚡", text: p.culture?.toUpperCase() || "—" },
                { icon: "❄", text: p.religion?.toUpperCase() || "—" },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: "0.25rem",
                  background: "rgba(13,10,6,0.50)",
                  border: "1px solid rgba(201,168,76,0.15)",
                  borderRadius: "20px", padding: "0.18rem 0.5rem",
                }}>
                  <span style={{ fontSize: "0.65rem" }}>{item.icon}</span>
                  <span style={{
                    fontFamily: "Cinzel, serif", fontSize: "0.52rem", fontWeight: 600,
                    color: "var(--color-parchment-dim)", letterSpacing: "0.1em",
                  }}>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Vitals: health · energy · money · fame — with progress bars */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: "0.35rem",
              background: "rgba(13,10,6,0.40)", border: "1px solid var(--color-border)",
              borderRadius: "8px", padding: "0.5rem 0.45rem 0.45rem",
              marginBottom: "0.6rem",
            }}>
              {[
                { icon: "❤", value: p.health ?? 100, max: 100, color: "#C84040" },
                { icon: "☕", value: p.hunger ?? 100, max: 100, color: "#C9A84C" },
                { icon: "🪙", value: p.money  ?? 0,   max: null, color: "#C9A84C" },
                { icon: "👑", value: p.social?.fame ?? 0, max: null, color: "#9B6FD0" },
              ].map((v, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.18rem" }}>
                  {/* Icon + value */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem" }}>
                    <span style={{ fontSize: "0.72rem", filter: `drop-shadow(0 0 3px ${v.color}88)`, lineHeight: 1 }}>{v.icon}</span>
                    <span style={{
                      fontFamily: "Cinzel, serif", fontWeight: 700,
                      fontSize: "0.82rem", color: v.color,
                      textShadow: `0 0 8px ${v.color}55`,
                    }}>{v.value}</span>
                    {v.max && (
                      <span style={{ fontFamily: "Crimson Text, serif", fontSize: "0.6rem", color: "var(--color-parchment-muted)" }}>
                        /{v.max}
                      </span>
                    )}
                  </div>
                  {/* Bar */}
                  <div style={{ width: "100%", height: "2.5px", background: "rgba(0,0,0,0.55)", borderRadius: "2px" }}>
                    <div style={{
                      height: "100%",
                      width: v.max
                        ? `${Math.min(100, Math.round((v.value / v.max) * 100))}%`
                        : "60%",
                      background: `linear-gradient(to right, ${v.color}77, ${v.color})`,
                      boxShadow: `0 0 5px ${v.color}88`,
                      borderRadius: "2px",
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Career XP bar (full width) */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.6rem",
          background: "rgba(13,10,6,0.40)", border: "1px solid var(--color-border)",
          borderRadius: "8px", padding: "0.5rem 0.75rem",
          marginTop: "0.1rem",
        }}>
          {/* Level badge */}
          <div style={{
            width: "1.8rem", height: "1.8rem", borderRadius: "50%", flexShrink: 0,
            background: "var(--color-card-hi)", border: "1.5px solid var(--color-gold-dim)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 8px rgba(201,168,76,0.25)",
          }}>
            <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "0.72rem", color: "var(--color-gold)" }}>
              {careerLvl}
            </span>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <span style={{ fontFamily: "Cinzel, serif", fontSize: "0.6rem", fontWeight: 600, color: "var(--color-parchment-muted)", letterSpacing: "0.1em" }}>
                KARİYER XP
              </span>
              <span style={{ fontFamily: "Crimson Text, serif", fontSize: "0.72rem", color: "var(--color-parchment-muted)" }}>
                {careerXp.toLocaleString("tr")} / {careerMax.toLocaleString("tr")}
              </span>
            </div>
            <div style={{ height: "4px", background: "rgba(0,0,0,0.5)", borderRadius: "2px" }}>
              <div style={{
                height: "100%", width: `${careerPct}%`,
                background: "linear-gradient(to right, #C9A84C88, #C9A84C)",
                boxShadow: "0 0 8px rgba(201,168,76,0.6)", borderRadius: "2px",
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Özellikler sekmesi ────────────────────────────────────────────────────────
function TabOzellikler({ p, skillsData }) {
  const statPoints = p.stat_points ?? 0;

  // Perk listesi
  const perkList = [];
  if (skillsData?.perks) {
    for (const [skillKey, perkIds] of Object.entries(p.perks || {})) {
      if (!Array.isArray(perkIds)) continue;
      for (const pid of perkIds) {
        const meta = skillsData.perks?.[skillKey]?.find?.(pk => pk.id === pid);
        if (meta) perkList.push({ ...meta, skill: skillKey });
      }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

      {/* ── TEMEL ÖZELLİKLER ─────────────────────────────────────── */}
      <div style={{
        background: "var(--color-card)", border: "1px solid var(--color-border-hi)",
        borderRadius: "10px", overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
      }}>
        {/* Section header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.75rem 0.9rem 0.6rem",
          borderBottom: "1px solid var(--color-border)",
          background: "linear-gradient(180deg, rgba(201,168,76,0.05) 0%, transparent 100%)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{
              fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "0.88rem",
              color: "var(--color-parchment)", letterSpacing: "0.08em",
            }}>
              TEMEL ÖZELLİKLER
            </span>
            <HelpCircle size={13} color="var(--color-parchment-muted)" strokeWidth={1.5} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{
              fontFamily: "Cinzel, serif", fontSize: "0.6rem", color: "var(--color-parchment-muted)",
            }}>
              {statPoints} PUAN KALDI
            </span>
            <Link to="/oyun/statlar" style={{
              width: "22px", height: "22px", borderRadius: "5px",
              background: "rgba(201,168,76,0.15)", border: "1.5px solid rgba(201,168,76,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--color-gold)", fontFamily: "Cinzel, serif", fontSize: "0.9rem",
              textDecoration: "none",
            }}>+</Link>
          </div>
        </div>

        {/* 2×2 stat grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", padding: "0.75rem" }}>
          {STAT_META.map(s => {
            const v    = p.stats?.[s.key] ?? 0;
            const xp   = p.stat_xp?.[s.key] ?? 0;
            const next = 25 + v * 15;
            return (
              <DiamondStatCard
                key={s.key}
                stat={s.label}
                value={v}
                xp={xp}
                nextXp={next}
                color={s.color}
                emoji={s.emoji}
              />
            );
          })}
        </div>
      </div>

      {/* ── KARİYER KARTI ────────────────────────────────────────── */}
      {p.career && (
        <div style={{
          background: "var(--color-card)", border: "1px solid var(--color-border-hi)",
          borderRadius: "10px", padding: "0.85rem 1rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", gap: "0.85rem",
        }}>
          {/* Career icon */}
          <div style={{
            width: "3rem", height: "3rem", borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.05) 100%)",
            border: "1.5px solid rgba(201,168,76,0.40)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 12px rgba(201,168,76,0.20)",
          }}>
            <span style={{ fontSize: "1.3rem" }}>⚖</span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{
                  fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "0.95rem",
                  color: "var(--color-parchment)", letterSpacing: "0.06em",
                }}>
                  {p.profession?.toUpperCase() || "MESLEK"}
                </div>
                <div style={{ fontFamily: "Crimson Text, serif", fontSize: "0.8rem", color: "var(--color-parchment-muted)", marginTop: "0.1rem" }}>
                  Seviye {p.career.level || 1} · {p.career.title || "—"}
                </div>
              </div>
              <Link to="/oyun/meslek" style={{
                display: "flex", alignItems: "center", gap: "0.2rem",
                fontFamily: "Cinzel, serif", fontSize: "0.6rem", fontWeight: 700,
                color: "var(--color-gold)", letterSpacing: "0.1em",
                background: "rgba(201,168,76,0.10)", border: "1px solid rgba(201,168,76,0.35)",
                borderRadius: "6px", padding: "0.3rem 0.6rem",
                textDecoration: "none",
              }}>
                KARİYER <ChevronRight size={10} strokeWidth={2} />
              </Link>
            </div>
            <div style={{ marginTop: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ fontFamily: "Cinzel, serif", fontSize: "0.56rem", color: "var(--color-parchment-muted)", letterSpacing: "0.1em" }}>
                  KARİYER XP
                </span>
                <span style={{ fontFamily: "Crimson Text, serif", fontSize: "0.72rem", color: "var(--color-parchment-muted)" }}>
                  {(p.career.job_xp || 0).toLocaleString("tr")} / {(p.career.next_stage?.xp_required || 3000).toLocaleString("tr")}
                </span>
              </div>
              <div style={{ height: "3px", background: "rgba(0,0,0,0.5)", borderRadius: "2px" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, ((p.career.job_xp || 0) / (p.career.next_stage?.xp_required || 3000)) * 100)}%`,
                  background: "linear-gradient(to right, #C9A84C88, #C9A84C)",
                  boxShadow: "0 0 6px rgba(201,168,76,0.6)", borderRadius: "2px",
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOPLUMSAL STATÜ ──────────────────────────────────────── */}
      {p.social && (
        <div style={{
          background: "var(--color-card)", border: "1px solid var(--color-border-hi)",
          borderRadius: "10px", overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.75rem 0.9rem 0.6rem",
            borderBottom: "1px solid var(--color-border)",
            background: "linear-gradient(180deg, rgba(201,168,76,0.05) 0%, transparent 100%)",
          }}>
            <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "0.88rem", color: "var(--color-parchment)", letterSpacing: "0.08em" }}>
              TOPLUMSAL STATÜ
            </span>
            <HelpCircle size={13} color="var(--color-parchment-muted)" strokeWidth={1.5} />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", padding: "0.75rem" }}>
            {SOCIAL_META.map(sm => {
              const val = p.social?.[sm.key] ?? 0;
              const lbl = getSocialLabel(sm.key, val);
              return (
                <SocialStatCard
                  key={sm.key}
                  label={sm.label}
                  icon={sm.icon}
                  value={val}
                  color={sm.color}
                  sublabel={lbl}
                />
              );
            })}
          </div>

          {/* Trade multipliers */}
          <div style={{ display: "flex", gap: "0.5rem", padding: "0 0.75rem 0.75rem" }}>
            {[
              { icon: "💸", label: "ALIŞ ÇARPANI",  value: p.social.trade_buy_mult  != null ? `${((p.social.trade_buy_mult  - 1) * 100).toFixed(0)}%` : "—", positive: (p.social.trade_buy_mult ?? 1)  <= 1 },
              { icon: "💰", label: "SATIŞ ÇARPANI", value: p.social.trade_sell_mult != null ? `+${((p.social.trade_sell_mult - 1) * 100).toFixed(0)}%` : "—", positive: (p.social.trade_sell_mult ?? 1) >= 1 },
            ].map((t, i) => (
              <div key={i} style={{
                flex: 1, background: "var(--color-bg)",
                border: "1px solid var(--color-border)", borderRadius: "8px",
                padding: "0.6rem 0.75rem",
                display: "flex", alignItems: "center", gap: "0.6rem",
              }}>
                <span style={{ fontSize: "1rem" }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.55rem", color: "var(--color-parchment-muted)", letterSpacing: "0.1em" }}>
                    {t.label}
                  </div>
                </div>
                <span style={{
                  fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "0.9rem",
                  color: t.positive ? "#4A9A5A" : "#C84040",
                }}>
                  {t.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ÖZEL YETENEKLER ──────────────────────────────────────── */}
      <div style={{
        background: "var(--color-card)", border: "1px solid var(--color-border-hi)",
        borderRadius: "10px", overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.75rem 0.9rem 0.6rem",
          borderBottom: "1px solid var(--color-border)",
          background: "linear-gradient(180deg, rgba(201,168,76,0.05) 0%, transparent 100%)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "0.88rem", color: "var(--color-parchment)", letterSpacing: "0.08em" }}>
              ÖZEL YETENEKLER
            </span>
            <HelpCircle size={13} color="var(--color-parchment-muted)" strokeWidth={1.5} />
          </div>
          <button style={{
            display: "flex", alignItems: "center", gap: "0.2rem",
            fontFamily: "Cinzel, serif", fontSize: "0.58rem", fontWeight: 600,
            color: "var(--color-gold-dim)", background: "none", border: "none", cursor: "pointer",
            letterSpacing: "0.1em",
          }}>
            TÜMÜNÜ GÖR <ChevronRight size={11} strokeWidth={2} />
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", padding: "0.75rem" }}>
          {perkList.length > 0 ? (
            perkList.slice(0, 3).map((pk, i) => (
              <PerkCard key={i} icon={pk.icon || "✦"} name={pk.label} desc={pk.desc} level={pk.level} />
            ))
          ) : (
            // Placeholder perk cards when none exist
            [
              { icon: "🏆", name: "Doğuştan Lider", desc: "Liderlik yetenekleri +15%.", level: 3 },
              { icon: "👤", name: "Tüccar Sezgisi", desc: "Alış -%5, Satış +%10.", level: 3 },
              { icon: "📖", name: "Keskin Zihin", desc: "Zekâ gereksinimi -10%.", level: 2 },
            ].map((pk, i) => (
              <PerkCard key={i} icon={pk.icon} name={pk.name} desc={pk.desc} level={pk.level} />
            ))
          )}
        </div>
      </div>

    </div>
  );
}

// ── Dünya sekmesi ─────────────────────────────────────────────────────────────
function TabDunya() {
  const { state } = useGame();
  const navigate  = useNavigate();
  const p = state.player;
  const parents  = (p.parent_ids || []).map(id => (state.world?.npcs || []).find(n => n.id === id)).filter(Boolean);
  const spouse   = p.spouse_id ? (state.world?.npcs || []).find(n => n.id === p.spouse_id) : null;
  const children = (p.children_ids || []).filter(id => id !== "PLAYER")
    .map(cid => (state.world?.npcs || []).find(n => n.id === cid)).filter(Boolean);

  const grouped = useMemo(() => {
    const out = {};
    for (const band of BANDS) out[band.id] = [];
    for (const [npcId, score] of Object.entries(state.relationships || {})) {
      const npc  = (state.world?.npcs || []).find(n => n.id === npcId);
      if (!npc) continue;
      const band = BANDS.find(b => b.test(score));
      if (band) out[band.id].push({ npc, score });
    }
    for (const k of Object.keys(out)) out[k].sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
    return out;
  }, [state]);

  const SectionCard = ({ title, children: content }) => (
    <div style={{
      background: "var(--color-card)", border: "1px solid var(--color-border-hi)",
      borderRadius: "10px", overflow: "hidden",
      boxShadow: "0 4px 20px rgba(0,0,0,0.45)", marginBottom: "0.75rem",
    }}>
      <div style={{
        padding: "0.65rem 0.9rem", borderBottom: "1px solid var(--color-border)",
        background: "linear-gradient(180deg, rgba(201,168,76,0.05) 0%, transparent 100%)",
      }}>
        <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "0.85rem", color: "var(--color-parchment)", letterSpacing: "0.08em" }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "0.75rem 0.9rem" }}>{content}</div>
    </div>
  );

  return (
    <div>
      <SectionCard title="AİLE">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {parents.length > 0 && (
            <div>
              <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.6rem", color: "var(--color-parchment-muted)", letterSpacing: "0.12em", marginBottom: "0.3rem" }}>EBEVEYNLER</div>
              {parents.map(par => (
                <button key={par.id} onClick={() => navigate(`/oyun/npc/${par.id}`)}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "block", textAlign: "left", padding: "0.1rem 0" }}>
                  <span style={{ fontFamily: "Crimson Text, serif", fontSize: "0.9rem", color: "var(--color-gold)" }}>{par.name}</span>
                  <span style={{ fontFamily: "Crimson Text, serif", fontSize: "0.8rem", color: "var(--color-parchment-muted)" }}> · {par.profession} · {par.age}</span>
                </button>
              ))}
            </div>
          )}
          <div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.6rem", color: "var(--color-parchment-muted)", letterSpacing: "0.12em", marginBottom: "0.3rem" }}>EŞ</div>
            {spouse ? (
              <button onClick={() => navigate(`/oyun/npc/${spouse.id}`)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <span style={{ fontFamily: "Crimson Text, serif", fontSize: "0.9rem", color: "var(--color-gold)" }}>{spouse.name}</span>
              </button>
            ) : <span style={{ fontFamily: "Crimson Text, serif", fontSize: "0.85rem", color: "var(--color-parchment-muted)", fontStyle: "italic" }}>—</span>}
          </div>
          <div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.6rem", color: "var(--color-parchment-muted)", letterSpacing: "0.12em", marginBottom: "0.3rem" }}>ÇOCUKLAR ({children.length})</div>
            {children.length === 0
              ? <span style={{ fontFamily: "Crimson Text, serif", fontSize: "0.85rem", color: "var(--color-parchment-muted)", fontStyle: "italic" }}>Henüz yok</span>
              : children.map(c => (
                <button key={c.id} onClick={() => navigate(`/oyun/npc/${c.id}`)} style={{ background: "none", border: "none", cursor: "pointer", display: "block" }}>
                  <span style={{ fontFamily: "Crimson Text, serif", fontSize: "0.9rem", color: "var(--color-gold)" }}>{c.name}</span>
                  <span style={{ fontFamily: "Crimson Text, serif", fontSize: "0.8rem", color: "var(--color-parchment-muted)" }}> ({c.age})</span>
                </button>
              ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="İLİŞKİLER">
        {BANDS.map(band => (
          grouped[band.id].length > 0 && (
            <div key={band.id} style={{ marginBottom: "0.75rem" }}>
              <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.6rem", color: "var(--color-parchment-muted)", letterSpacing: "0.12em", marginBottom: "0.3rem" }}>
                {band.label.toUpperCase()} ({grouped[band.id].length})
              </div>
              {grouped[band.id].map(({ npc, score }) => {
                const flavor = getRelFlavor(score);
                return (
                  <div key={npc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3rem 0", borderBottom: "1px solid var(--color-border)" }}>
                    <Link to={`/oyun/npc/${npc.id}`} style={{ fontFamily: "Crimson Text, serif", fontSize: "0.9rem", color: "var(--color-parchment)", textDecoration: "none" }}>
                      {npc.name}
                    </Link>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontFamily: "Crimson Text, serif", fontStyle: "italic", fontSize: "0.78rem", color: flavor.color }}>{flavor.label}</span>
                      <span style={{ fontFamily: "Cinzel, serif", fontSize: "0.65rem", color: "var(--color-parchment-muted)" }}>{score > 0 ? `+${score}` : score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ))}
      </SectionCard>
    </div>
  );
}

// ── Serüven sekmesi ───────────────────────────────────────────────────────────
function TabSeruven({ p, skillsData }) {
  const { state, setState } = useGame();
  const [items, setItems] = useState({});
  const [busy, setBusy]   = useState(false);

  useEffect(() => {
    api.get("/game/items").then(({ data }) => setItems(data.items || {})).catch(() => {});
  }, []);

  const equipment = state.player.equipment || {};
  const invEntries = useMemo(() => Object.entries(state.player.inventory || {}).filter(([, q]) => q > 0), [state.player.inventory]);

  const milestones = useMemo(() => {
    const seen = new Set();
    return (state.events || []).filter(ev => MILESTONE_TYPES[ev.type] && !seen.has(ev.type) && seen.add(ev.type)).slice(0, 12);
  }, [state.events]);

  const consumeItem = async (key) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/use_item", { item: key, qty: 1 });
      setState(data.state);
      toast.success(`${data.item_name} kullanıldı`);
    } catch (e) { toast.error(e.response?.data?.detail || "Kullanılamadı"); }
    finally { setBusy(false); }
  };

  const SectionCard = ({ title, children: content }) => (
    <div style={{
      background: "var(--color-card)", border: "1px solid var(--color-border-hi)",
      borderRadius: "10px", overflow: "hidden",
      boxShadow: "0 4px 20px rgba(0,0,0,0.45)", marginBottom: "0.75rem",
    }}>
      <div style={{ padding: "0.65rem 0.9rem", borderBottom: "1px solid var(--color-border)", background: "linear-gradient(180deg, rgba(201,168,76,0.05) 0%, transparent 100%)" }}>
        <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "0.85rem", color: "var(--color-parchment)", letterSpacing: "0.08em" }}>{title}</span>
      </div>
      <div style={{ padding: "0.75rem 0.9rem" }}>{content}</div>
    </div>
  );

  return (
    <div>
      <SectionCard title="ENVANTER">
        {invEntries.length === 0
          ? <p style={{ fontFamily: "Crimson Text, serif", fontStyle: "italic", color: "var(--color-parchment-muted)", fontSize: "0.9rem" }}>Heybe bomboş.</p>
          : invEntries.map(([key, qty]) => {
            const item = items[key];
            const canUse = item && ["food", "drink", "consumable"].includes(item.type);
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.4rem 0", borderBottom: "1px solid var(--color-border)" }}>
                <span style={{ fontFamily: "Crimson Text, serif", fontSize: "0.9rem", color: "var(--color-parchment)", flex: 1 }}>
                  {item ? item.name : key} <span style={{ color: "var(--color-parchment-muted)" }}>×{qty}</span>
                </span>
                {canUse && (
                  <button onClick={() => consumeItem(key)} disabled={busy} style={{
                    fontFamily: "Cinzel, serif", fontSize: "0.58rem", fontWeight: 600,
                    color: "#4A9A5A", background: "rgba(74,154,90,0.10)", border: "1px solid rgba(74,154,90,0.35)",
                    borderRadius: "5px", padding: "0.25rem 0.55rem", cursor: "pointer", letterSpacing: "0.08em",
                  }}>KULLAN</button>
                )}
              </div>
            );
          })}
      </SectionCard>

      <SectionCard title="TARİHİ BAŞARILAR">
        {milestones.length === 0
          ? <p style={{ fontFamily: "Crimson Text, serif", fontStyle: "italic", color: "var(--color-parchment-muted)", fontSize: "0.9rem" }}>Henüz önemli bir olay yaşanmadı.</p>
          : milestones.map((ev, i) => {
            const m = MILESTONE_TYPES[ev.type];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.4rem 0", borderBottom: "1px solid var(--color-border)" }}>
                <span style={{ fontSize: "1.1rem" }}>{m.icon}</span>
                <div>
                  <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.7rem", color: "var(--color-parchment)", letterSpacing: "0.06em" }}>{m.label}</div>
                  <div style={{ fontFamily: "Crimson Text, serif", fontSize: "0.78rem", color: "var(--color-parchment-muted)" }}>{ev.text}</div>
                </div>
              </div>
            );
          })}
      </SectionCard>
    </div>
  );
}

// ── ANA COMPONENT ─────────────────────────────────────────────────────────────
export default function CharacterSheet() {
  const { state }   = useGame();
  const navigate    = useNavigate();
  const [tab, setTab] = useState("ozellikler");
  const [skillsData, setSkillsData] = useState(null);

  useEffect(() => {
    if (!state) return;
    api.get("/game/skills").then(({ data }) => setSkillsData(data)).catch(() => {});
  }, [state?.turn, state?.player?.age]);

  if (!state) return null;

  const p   = state.player;
  const cal = state.calendar || {};

  return (
    <div style={{
      minHeight: "100vh", background: "var(--color-bg)",
      display: "flex", flexDirection: "column",
      maxWidth: "480px", margin: "0 auto",
    }}>

      {/* ── PAGE HEADER ───────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "var(--color-surface)",
        borderBottom: "1px solid rgba(201,168,76,0.18)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        padding: "0.7rem 1rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "0.3rem",
          color: "var(--color-gold)", padding: "0.2rem",
        }}>
          <ChevronLeft size={20} strokeWidth={1.8} />
        </button>

        <div style={{ textAlign: "center" }}>
          <h1 style={{
            fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "1rem",
            color: "var(--color-parchment)", letterSpacing: "0.22em",
            textShadow: "0 0 16px rgba(201,168,76,0.25)",
          }}>
            KARAKTER
          </h1>
          {/* Gold diamond ornament */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", marginTop: "0.15rem" }}>
            <div style={{ height: "1px", width: "28px", background: "linear-gradient(to right, transparent, rgba(201,168,76,0.5))" }} />
            <span style={{ fontSize: "0.45rem", color: "var(--color-gold)", transform: "rotate(45deg)", display: "inline-block" }}>◆</span>
            <div style={{ height: "1px", width: "28px", background: "linear-gradient(to left, transparent, rgba(201,168,76,0.5))" }} />
          </div>
        </div>

        <button style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--color-parchment-muted)", padding: "0.2rem",
        }}>
          <Settings size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* ── SCROLLABLE BODY ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 0.75rem 7rem" }}>

        {/* Hero card */}
        <PremiumHeroCard p={p} season={cal.season} />

        {/* ── TAB BAR ─────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: "0.4rem", marginBottom: "0.85rem",
          background: "var(--color-card)", border: "1px solid var(--color-border-hi)",
          borderRadius: "10px", padding: "0.4rem",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}>
          {TABS.map(t => {
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                padding: "0.55rem 0.3rem", borderRadius: "7px", cursor: "pointer",
                fontFamily: "Cinzel, serif", fontSize: "0.58rem", fontWeight: 700,
                letterSpacing: "0.09em", textTransform: "uppercase",
                transition: "all 0.2s",
                border: isActive ? "1px solid rgba(201,168,76,0.45)" : "1px solid transparent",
                background: isActive
                  ? "linear-gradient(160deg, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.07) 100%)"
                  : "transparent",
                color: isActive ? "var(--color-gold)" : "var(--color-parchment-muted)",
                boxShadow: isActive ? "0 0 12px rgba(201,168,76,0.18), inset 0 1px 0 rgba(201,168,76,0.15)" : "none",
                position: "relative",
              }}>
                {isActive && (
                  <div style={{
                    position: "absolute", bottom: 0, left: "15%", right: "15%", height: "1.5px",
                    background: "linear-gradient(to right, transparent, var(--color-gold), transparent)",
                    boxShadow: "0 0 6px var(--color-gold)",
                  }} />
                )}
                <span style={{ fontSize: "0.75rem" }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {tab === "ozellikler" && <TabOzellikler p={p} skillsData={skillsData} />}
        {tab === "dunya"      && <TabDunya />}
        {tab === "seruven"    && <TabSeruven p={p} skillsData={skillsData} />}
      </div>
    </div>
  );
}
