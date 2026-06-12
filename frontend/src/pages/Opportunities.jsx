/**
 * Fırsatlar — KÜL & KÖZ.
 * Duygu görevi: "Kapıyı çalan fırsatlar" — son ay kapanacaklar köz rengi yanar.
 * İşlevsellik (kabul/ret/yürütme akışı, süre/urgency mantığı, modal) birebir korunur.
 */
import { useEffect, useState, useCallback } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { playSfx } from "@/lib/audio";
import { toast } from "sonner";
import { useActionRedirect } from "@/hooks/useActionRedirect";
import { PageHeader, Panel, Pill, EmptyState, GoldRule, TONES } from "@/components/ui/Kit";

// ── Urgency helpers ───────────────────────────────────────────────────────────

export function weeksRemaining(opp, currentTurn) {
  if (opp.expires_at == null) return null;
  return opp.expires_at - (currentTurn || 0);
}

export function urgencyTier(weeks) {
  if (weeks == null) return null;
  if (weeks <= 1)   return "critical";
  if (weeks === 2)  return "warning";
  return "info";
}

const URGENCY_STYLES = {
  critical: {
    tone: "blood",
    pulse: "danger",
    card: { borderColor: "rgba(224,90,48,0.6)", boxShadow: "0 0 18px rgba(224,90,48,0.18), 0 4px 16px rgba(0,0,0,0.5)" },
  },
  warning: {
    tone: "ember",
    pulse: null,
    card: { borderColor: "rgba(224,90,48,0.35)" },
  },
  info: {
    tone: "ash",
    pulse: null,
    card: {},
  },
};

function UrgencyBadge({ weeks }) {
  const tier = urgencyTier(weeks);
  if (!tier) return null;
  const s = URGENCY_STYLES[tier];
  const label = tier === "critical" ? "Son Ay!" : `${weeks} ay kaldı`;
  return (
    <Pill tone={s.tone} pulse={s.pulse}>⏳ {label}</Pill>
  );
}

// ── Skill map ─────────────────────────────────────────────────────────────────

const SKILL_MAP = {
  combat:  { label: "Dövüş",        icon: "⚔",  color: "#C84040" },
  social:  { label: "Sosyal",       icon: "🗣", color: "#4A9A5A" },
  trade:   { label: "Ticaret",      icon: "⚖",  color: "#C9A84C" },
  stamina: { label: "Dayanıklılık", icon: "🐂", color: "#7B4FAF" },
};

/** Mirrors backend formula: chance = min(0.92, risk_mult + skill * 0.07) */
function calcDifficulty(opp, playerSkills) {
  const skillVal = (playerSkills || {})[opp.skill_check] || 0;
  const riskMult = { düşük: 0.80, orta: 0.60, yüksek: 0.40 }[opp.risk_level] ?? 0.60;
  const chance   = Math.min(0.92, riskMult + skillVal * 0.07);
  const pct      = Math.round(chance * 100);
  if (chance >= 0.75) return { label: "Kolay", color: "#4A9A5A", pct };
  if (chance >= 0.55) return { label: "Orta",  color: "#C9A84C", pct };
  return                     { label: "Zor",   color: "#C84040", pct };
}

// ── Category & risk config ────────────────────────────────────────────────────

const CAT = {
  iş:      { label: "İş",      tone: "gold",  icon: "⚒" },
  suç:     { label: "Suç",     tone: "blood", icon: "🗡" },
  sosyal:  { label: "Sosyal",  tone: "sage",  icon: "🤝" },
  macera:  { label: "Macera",  tone: "ember", icon: "🐎" },
  kişisel: { label: "Kişisel", tone: "ink",   icon: "🕯" },
};

const RISK = {
  düşük:  { label: "Düşük Risk",  color: "#4A9A5A" },
  orta:   { label: "Orta Risk",   color: "#C9A84C" },
  yüksek: { label: "Yüksek Risk", color: "#C84040" },
};

const STATUS_LABELS = {
  açık:         "Açık",
  kabul_edildi: "Kabul Edildi",
  tamamlandı:   "Tamamlandı",
  reddedildi:   "Reddedildi",
  başarısız:    "Başarısız",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function TagChip({ tag }) {
  return <Pill tone="ash">{tag}</Pill>;
}

function RewardRow({ gold, rep, rel }) {
  const item = (color, icon, text) => (
    <span className="font-display" style={{
      display: "inline-flex", alignItems: "center", gap: "0.25rem",
      fontSize: "0.66rem", fontWeight: 700, color,
    }}>
      <span style={{ fontSize: "0.75rem" }}>{icon}</span> {text}
    </span>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
      {gold > 0 && item("#C9A84C", "⚜", `${gold} akçe`)}
      {rep > 0 && item("#7B4FAF", "🏅", `+${rep} itibar`)}
      {rep < 0 && item("#C84040", "📉", `${rep} itibar`)}
      {rel > 0 && item("#4A9A5A", "💞", `+${rel} bağ`)}
    </div>
  );
}

// ── Task Execution Modal ──────────────────────────────────────────────────────

function TaskExecutionModal({ opp, player, onConfirm, onClose, busy }) {
  const cat        = CAT[opp.category] || CAT["iş"];
  const catTone    = TONES[cat.tone] || TONES.gold;
  const risk       = RISK[opp.risk_level] || RISK["orta"];
  const skillCfg   = SKILL_MAP[opp.skill_check] || SKILL_MAP.social;
  const skillVal   = (player?.skills || {})[opp.skill_check] || 0;
  const difficulty = calcDifficulty(opp, player?.skills);

  return (
    <div className="bg-black/80" style={{
      position: "fixed", inset: 0, zIndex: 50, display: "flex",
      alignItems: "flex-end", justifyContent: "center", padding: 0,
    }}>
      <div className="card-frame" style={{
        width: "100%", maxWidth: "32rem",
        borderRadius: "14px 14px 0 0",
        borderColor: catTone.border,
        overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh",
      }}>
        {/* ── Başlık ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.85rem 1.1rem", borderBottom: "1px solid var(--color-border)",
          background: `linear-gradient(to right, ${catTone.bg}, transparent 70%)`, flexShrink: 0,
        }}>
          <span className="font-display" style={{
            display: "flex", alignItems: "center", gap: "0.45rem",
            fontSize: "0.82rem", fontWeight: 700, color: catTone.text,
            letterSpacing: "0.06em",
          }}>
            <span>{cat.icon}</span> {opp.title}
          </span>
          <button
            onClick={onClose}
            disabled={busy}
            className="font-display"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--color-parchment-muted)", fontSize: "0.85rem",
              padding: "0.2rem 0.4rem", opacity: busy ? 0.4 : 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Kaydırılabilir gövde ── */}
        <div style={{ overflowY: "auto", flex: 1, padding: "1rem 1.1rem",
                      display: "flex", flexDirection: "column", gap: "0.85rem" }}>

          {/* Anlatı */}
          <p className="font-serif" style={{
            fontSize: "0.88rem", fontStyle: "italic", lineHeight: 1.55,
            color: "var(--color-parchment-dim)", margin: 0,
          }}>{opp.description}</p>

          {/* Beceri sınavı paneli */}
          <div className="row-frame" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.45rem" }}>
            <div className="label-tiny">Gereken Hüner</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="font-display" style={{
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                fontSize: "0.78rem", fontWeight: 700, color: skillCfg.color,
              }}>
                <span>{skillCfg.icon}</span> {skillCfg.label}
              </span>
              <span className="font-serif" style={{ fontSize: "0.74rem", color: "var(--color-parchment-muted)" }}>
                Seviye <span className="font-display" style={{ color: "var(--color-parchment)", fontWeight: 700 }}>{skillVal}</span>
              </span>
            </div>
            <div style={{ height: "5px", borderRadius: "3px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "3px",
                width: `${Math.min(100, skillVal * 10)}%`,
                background: `linear-gradient(to right, ${skillCfg.color}88, ${skillCfg.color})`,
                boxShadow: `0 0 6px ${skillCfg.color}55`, transition: "width 0.4s",
              }} />
            </div>
          </div>

          {/* Başarı tahmini */}
          <div className="row-frame" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.45rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="label-tiny">Falcının Tahmini</div>
              <span className="font-display" style={{
                fontSize: "0.66rem", fontWeight: 700, color: difficulty.color,
                letterSpacing: "0.1em", textTransform: "uppercase",
              }}>{difficulty.label}</span>
            </div>
            <div style={{ height: "7px", borderRadius: "4px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "4px", width: `${difficulty.pct}%`,
                background: `linear-gradient(to right, ${difficulty.color}88, ${difficulty.color})`,
                boxShadow: `0 0 8px ${difficulty.color}55`, transition: "width 0.4s",
              }} />
            </div>
            <div className="font-serif" style={{
              fontSize: "0.68rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
            }}>
              Tahmini şans: ~%{difficulty.pct}
            </div>
          </div>

          {/* Risk notu */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.45rem" }}>
            <span style={{ fontSize: "0.85rem", flexShrink: 0 }}>⚠</span>
            <p className="font-serif" style={{ fontSize: "0.76rem", margin: 0, lineHeight: 1.5 }}>
              <span className="font-display" style={{
                fontWeight: 700, color: risk.color, fontSize: "0.66rem",
                letterSpacing: "0.08em", textTransform: "uppercase",
              }}>{risk.label} — </span>
              <span style={{ color: "var(--color-parchment-dim)", fontStyle: "italic" }}>{opp.risk}</span>
            </p>
          </div>

          {/* Kazanımlar */}
          <div className="row-frame" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.2rem" }}>
            <div className="label-tiny">Başarırsan Kazanırsın</div>
            <RewardRow gold={opp.reward_gold} rep={opp.reward_reputation} rel={opp.reward_relation} />
          </div>

          {/* Yüksek risk uyarısı */}
          {opp.risk_level === "yüksek" && (
            <div className="font-serif" style={{
              display: "flex", alignItems: "center", gap: "0.45rem",
              fontSize: "0.74rem", fontStyle: "italic", color: "#C84040",
              border: "1px solid rgba(200,64,64,0.35)", borderRadius: "6px",
              padding: "0.5rem 0.7rem", background: "rgba(200,64,64,0.06)",
            }}>
              <span>💀</span>
              Başarısız olursan itibarın lekelenir, canın yanabilir.
            </div>
          )}
        </div>

        {/* ── Alt eylem çubuğu ── */}
        <div style={{
          padding: "0.85rem 1.1rem", borderTop: "1px solid var(--color-border)",
          display: "flex", gap: "0.6rem", flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            disabled={busy}
            className="btn-ghost-ash"
            style={{ padding: "0.6rem 1rem", fontSize: "0.66rem", opacity: busy ? 0.4 : 1 }}
          >
            Geri Dön
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="btn-ember"
            style={{
              flex: 1, padding: "0.6rem", fontSize: "0.7rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}
          >
            {busy ? "⏳ Gerçekleştiriliyor…" : "⚜ Görevi Gerçekleştir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Opportunity Card ──────────────────────────────────────────────────────────

function OpportunityCard({ opp, playerSkills, onAccept, onDecline, onExecute, busy, currentTurn }) {
  const cat     = CAT[opp.category] || CAT["iş"];
  const catTone = TONES[cat.tone] || TONES.gold;
  const risk    = RISK[opp.risk_level] || RISK["orta"];
  const isBusy  = busy === opp.id;

  const isOpen     = opp.status === "açık";
  const isAccepted = opp.status === "kabul_edildi";
  const isDone     = ["tamamlandı", "reddedildi", "başarısız"].includes(opp.status);

  const weeks     = isOpen ? weeksRemaining(opp, currentTurn) : null;
  const tier      = urgencyTier(weeks);
  const urgentCard = tier ? URGENCY_STYLES[tier].card : {};

  // Skill & difficulty info for accepted card preview
  const skillCfg   = SKILL_MAP[opp.skill_check] || SKILL_MAP.social;
  const difficulty = calcDifficulty(opp, playerSkills);

  return (
    <div className="card-frame" style={{
      padding: "0.85rem", display: "flex", flexDirection: "column", gap: "0.6rem",
      opacity: isDone ? 0.55 : 1,
      borderColor: catTone.border,
      background: `linear-gradient(165deg, ${catTone.bg} 0%, transparent 35%), linear-gradient(180deg, var(--color-card-hi) 0%, var(--color-card) 55%, #18120A 100%)`,
      ...urgentCard,
    }}>
      {/* Başlık */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <h3 className="font-display" style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          fontSize: "0.86rem", fontWeight: 700, color: catTone.text,
          margin: 0, minWidth: 0,
        }}>
          <span style={{ flexShrink: 0 }}>{cat.icon}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{opp.title}</span>
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {isOpen && <UrgencyBadge weeks={weeks} />}
          <span className="font-display" style={{
            display: "inline-flex", alignItems: "center", gap: "0.25rem",
            fontSize: "0.54rem", fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: risk.color,
          }}>
            <span style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: risk.color, boxShadow: `0 0 5px ${risk.color}`,
            }} />
            {risk.label}
          </span>
        </div>
      </div>

      {/* Anlatı */}
      <p className="font-serif" style={{
        fontSize: "0.82rem", fontStyle: "italic", lineHeight: 1.5,
        color: "var(--color-parchment-dim)", margin: 0,
      }}>{opp.description}</p>

      {/* Risk uyarısı */}
      <div className="font-serif" style={{
        display: "flex", alignItems: "flex-start", gap: "0.35rem",
        fontSize: "0.7rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
      }}>
        <span style={{ flexShrink: 0 }}>⚠</span>
        <span>{opp.risk}</span>
      </div>

      {/* Kazanımlar */}
      <RewardRow gold={opp.reward_gold} rep={opp.reward_reputation} rel={opp.reward_relation} />

      {/* Etiketler */}
      {opp.tags && opp.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
          {opp.tags.map(t => <TagChip key={t} tag={t} />)}
        </div>
      )}

      {/* ── Durum / Eylemler ── */}
      {isDone ? (
        <div className="font-display" style={{
          textAlign: "center", padding: "0.3rem 0",
          fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: opp.status === "tamamlandı" ? "#4A9A5A"
               : opp.status === "başarısız"  ? "#C84040" : "var(--color-parchment-muted)",
        }}>
          {STATUS_LABELS[opp.status]}
        </div>

      ) : isAccepted ? (
        // ── Üstlenilmiş: hüner önizleme + yürüt düğmesi ──
        <div style={{
          display: "flex", flexDirection: "column", gap: "0.5rem",
          paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)",
        }}>
          {/* Hüner + zorluk satırı */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="font-serif" style={{
              display: "inline-flex", alignItems: "center", gap: "0.3rem",
              fontSize: "0.74rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
            }}>
              <span style={{ color: skillCfg.color }}>{skillCfg.icon}</span>
              {skillCfg.label} sınavı
            </span>
            <span className="font-display" style={{
              display: "inline-flex", alignItems: "center", gap: "0.3rem",
              fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase", color: difficulty.color,
            }}>
              <span style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: difficulty.color, boxShadow: `0 0 5px ${difficulty.color}`,
              }} />
              {difficulty.label}
            </span>
          </div>

          {/* İnce başarı çubuğu */}
          <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: "2px", width: `${difficulty.pct}%`,
              background: `linear-gradient(to right, ${difficulty.color}88, ${difficulty.color})`,
              boxShadow: `0 0 6px ${difficulty.color}55`,
            }} />
          </div>

          {/* Eylem satırı */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Pill tone="ember">✓ Üstlenildi</Pill>
            <button
              onClick={() => onExecute(opp)}
              disabled={isBusy}
              className="btn-ember"
              style={{ flex: 1, padding: "0.45rem", fontSize: "0.62rem" }}
            >
              {isBusy ? "⏳" : "🎯"} Görevi Yürüt
            </button>
          </div>
        </div>

      ) : (
        // ── Açık: kabul / ret ──
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => onDecline(opp.id)}
            disabled={isBusy}
            className="btn-ghost-ash"
            style={{ padding: "0.45rem 0.75rem", fontSize: "0.6rem", opacity: isBusy ? 0.5 : 1 }}
          >
            ✕ Reddet
          </button>
          <button
            onClick={() => onAccept(opp.id)}
            disabled={isBusy}
            className="btn-ember"
            style={{ flex: 1, padding: "0.45rem", fontSize: "0.62rem" }}
          >
            {isBusy ? "⏳" : "⚜"} Kabul Et
          </button>
        </div>
      )}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: "all",     label: "Tümü"    },
  { key: "iş",     label: "İş"       },
  { key: "suç",    label: "Suç"      },
  { key: "sosyal",  label: "Sosyal"  },
  { key: "macera",  label: "Macera"  },
  { key: "kişisel", label: "Kişisel" },
];

function FilterBar({ active, onChange }) {
  return (
    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
      {FILTERS.map(f => {
        const isActive = active === f.key;
        const cat = CAT[f.key];
        const t = cat ? TONES[cat.tone] : TONES.gold;
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className="font-display"
            style={{
              padding: "0.3rem 0.7rem", borderRadius: "4px", cursor: "pointer",
              fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase",
              border: `1px solid ${isActive ? t.border : "var(--color-border)"}`,
              background: isActive ? t.bg : "transparent",
              color: isActive ? t.text : "var(--color-parchment-muted)",
              boxShadow: isActive ? `0 0 10px ${t.text}22` : "none",
              transition: "all 0.15s",
            }}
          >
            {cat ? `${cat.icon} ` : ""}{f.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Result overlay ────────────────────────────────────────────────────────────

function ResultOverlay({ result, onClose }) {
  if (!result) return null;
  const ok = result.success;
  return (
    <div className="bg-black/80" style={{
      position: "fixed", inset: 0, zIndex: 50, display: "flex",
      alignItems: "center", justifyContent: "center", padding: "1rem",
    }}>
      <div className="card-frame" style={{
        padding: "1.5rem", maxWidth: "22rem", width: "100%", textAlign: "center",
        borderColor: ok ? "rgba(74,154,90,0.5)" : "rgba(200,64,64,0.5)",
        boxShadow: ok
          ? "0 0 24px rgba(74,154,90,0.15), 0 8px 24px rgba(0,0,0,0.6)"
          : "0 0 24px rgba(200,64,64,0.15), 0 8px 24px rgba(0,0,0,0.6)",
      }}>
        <div style={{
          fontSize: "2.2rem", marginBottom: "0.6rem",
          filter: `drop-shadow(0 0 14px ${ok ? "rgba(74,154,90,0.6)" : "rgba(200,64,64,0.6)"})`,
        }}>
          {ok ? "🏆" : "💔"}
        </div>
        <h2 className="font-display" style={{
          fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem",
          letterSpacing: "0.08em", color: ok ? "#4A9A5A" : "#C84040",
        }}>
          {ok ? "Muvaffak Oldun!" : "Muvaffak Olamadın"}
        </h2>
        <p className="font-serif" style={{
          fontSize: "0.86rem", fontStyle: "italic", lineHeight: 1.55,
          color: "var(--color-parchment-dim)", margin: "0 0 1rem",
        }}>{result.message}</p>

        {/* Stat değişimleri */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: "0.9rem", flexWrap: "wrap", marginBottom: "1rem",
        }}>
          {result.gold_gained > 0 && (
            <span className="font-display" style={{ fontSize: "0.78rem", fontWeight: 700, color: "#C9A84C" }}>
              ⚜ +{result.gold_gained} Akçe
            </span>
          )}
          {result.rep_gained > 0 && (
            <span className="font-display" style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7B4FAF" }}>
              🏅 +{result.rep_gained} İtibar
            </span>
          )}
          {result.rep_gained < 0 && (
            <span className="font-display" style={{ fontSize: "0.78rem", fontWeight: 700, color: "#C84040" }}>
              📉 {result.rep_gained} İtibar
            </span>
          )}
        </div>

        <button onClick={onClose} className="btn-ember"
          style={{ padding: "0.55rem 1.6rem", fontSize: "0.68rem" }}>
          Devam
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Opportunities() {
  const { state, setState }         = useGame();
  const withRedirect                = useActionRedirect("Fırsatlar");
  const [opps, setOpps]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [busy, setBusy]             = useState(null);
  const [filter, setFilter]         = useState("all");
  const [result, setResult]         = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [executingOpp, setExecutingOpp] = useState(null); // Task Execution Modal

  const playerAge   = state?.player?.age    ?? 0;
  const currentTurn = state?.turn           ?? 0;
  const player      = state?.player         ?? {};

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/game/opportunities");
      setOpps(data.opportunities || []);
    } catch {
      toast.error("Fırsatlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (id) => {
    const opp = opps.find(o => o.id === id);
    if (opp?.min_age && playerAge < opp.min_age) {
      toast.error("Bu görevi üstlenmek için çok küçüksün.");
      return;
    }
    setBusy(id);
    playSfx("click");
    try {
      await withRedirect(async () => {
        const { data } = await api.post("/game/opportunities/accept", { opportunity_id: id });
        setOpps(prev => prev.map(o => o.id === id ? data.opportunity : o));
        if (data.state) setState(data.state);
        playSfx("page");
        toast.success("Fırsat kabul edildi.");
        return data;
      });
    } catch (e) {
      playSfx("fail");
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(null);
    }
  };

  const handleDecline = async (id) => {
    setBusy(id);
    playSfx("click");
    try {
      const { data } = await api.post("/game/opportunities/decline", { opportunity_id: id });
      if (data.state) {
        setState(data.state);
        setOpps(data.state.opportunities || []);
      } else {
        setOpps(prev => prev.map(o => o.id === id ? data.opportunity : o));
      }
      toast("Fırsat reddedildi.");
    } catch (e) {
      playSfx("fail");
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(null);
    }
  };

  /**
   * Called from TaskExecutionModal's confirm button.
   * Uses executingOpp.id so we don't need to pass it explicitly.
   */
  const handleComplete = async () => {
    if (!executingOpp) return;
    const id = executingOpp.id;
    setBusy(id);
    playSfx("click");
    try {
      await withRedirect(async () => {
        const { data } = await api.post("/game/opportunities/complete", { opportunity_id: id });
        if (data.state) {
          setState(data.state);
          setOpps(data.state.opportunities || []);
        }
        setExecutingOpp(null);
        setResult(data);
        playSfx(data.success ? "success" : "fail");
        return data;
      });
    } catch (e) {
      playSfx("fail");
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    playSfx("page");
    try {
      const { data } = await api.post("/game/opportunities/refresh");
      setOpps(data.opportunities || []);
      toast.success("Fırsatlar yenilendi.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Şu an yenileyemezsin, biraz bekle.");
    } finally {
      setRefreshing(false);
    }
  };

  // Grouping
  const openOpps     = opps.filter(o => o.status === "açık");
  const acceptedOpps = opps.filter(o => o.status === "kabul_edildi");
  const historyOpps  = opps.filter(o => ["tamamlandı", "reddedildi", "başarısız"].includes(o.status));

  const sortByUrgency = (list) =>
    [...list].sort((a, b) => (a.expires_at ?? Infinity) - (b.expires_at ?? Infinity));

  const filteredOpen = sortByUrgency(
    filter === "all" ? openOpps : openOpps.filter(o => o.category === filter)
  );

  const criticalOpps = filteredOpen.filter(o => {
    const w = weeksRemaining(o, currentTurn);
    return w != null && w <= 1;
  });

  const cardProps = {
    playerSkills: player.skills,
    onAccept:     handleAccept,
    onDecline:    handleDecline,
    onExecute:    setExecutingOpp,
    busy,
    currentTurn,
  };

  return (
    <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }}>

      {/* Başlık */}
      <PageHeader
        kicker="Kapıyı Çalanlar"
        icon="🔥"
        title="Fırsatlar"
        sub={openOpps.length === 0
          ? "Bu ay kapını çalan olmadı — ama rüzgâr hep döner."
          : `${openOpps.length} fırsat kapında bekliyor; kimi nimet, kimi tuzak.`}
        right={openOpps.length > 0 ? (
          <Pill tone="ember" pulse="danger">{openOpps.length} açık</Pill>
        ) : null}
      />

      {/* Özet satırı */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
        <Pill tone="gold">{openOpps.length} açık</Pill>
        {acceptedOpps.length > 0 && <Pill tone="ember">{acceptedOpps.length} üstlenildi</Pill>}
        {historyOpps.length > 0 && <Pill tone="ash">{historyOpps.length} geçmiş</Pill>}
      </div>

      {/* Son Şans bölümü */}
      {criticalOpps.length > 0 && (
        <>
          <Panel title="Son Şans — Bu Ay Kapanıyor" icon="🔥" tone="blood"
            right={<Pill tone="blood" pulse="danger">{criticalOpps.length}</Pill>}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {criticalOpps.map(o => <OpportunityCard key={o.id} opp={o} {...cardProps} />)}
            </div>
          </Panel>
          <div style={{ height: "0.75rem" }} />
        </>
      )}

      {/* Üstlenilen */}
      {acceptedOpps.length > 0 && (
        <>
          <Panel title="Üstlenilen Fırsatlar" icon="🎯" tone="ember"
            right={<Pill tone="ember">{acceptedOpps.length}</Pill>}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {acceptedOpps.map(o => <OpportunityCard key={o.id} opp={o} {...cardProps} />)}
            </div>
          </Panel>
          <div style={{ height: "0.75rem" }} />
        </>
      )}

      {/* Açık fırsatlar */}
      <Panel title="Mevcut Fırsatlar" icon="🚪" tone="gold"
        right={
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-ghost-ash"
            style={{ padding: "0.25rem 0.6rem", fontSize: "0.56rem", opacity: refreshing ? 0.5 : 1 }}
          >
            {refreshing ? "⏳" : "↻"} Yenile
          </button>
        }>
        <FilterBar active={filter} onChange={setFilter} />
        <div style={{ height: "0.7rem" }} />

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 0" }}>
            <span className="font-display ember-flicker" style={{
              fontSize: "0.6rem", letterSpacing: "0.25em", textTransform: "uppercase",
            }}>
              Haberler toplanıyor…
            </span>
          </div>
        ) : filteredOpen.length === 0 ? (
          <EmptyState icon="🚪"
            title={filter === "all"
              ? "Şu an kapını çalan yok."
              : "Bu cinsten kapını çalan yok."}
            sub="Bir ay geçir; rüzgâr yeni haberler getirir." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {filteredOpen.map(o => <OpportunityCard key={o.id} opp={o} {...cardProps} />)}
          </div>
        )}
      </Panel>

      {/* Geçmiş */}
      {historyOpps.length > 0 && (
        <>
          <GoldRule label="Geçmişin Tozu" />
          <button
            onClick={() => setShowHistory(h => !h)}
            className="font-display"
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em",
              textTransform: "uppercase", color: "var(--color-parchment-muted)",
            }}
          >
            🕯 Geçmiş ({historyOpps.length})
            <span style={{
              display: "inline-block", transition: "transform 0.2s",
              transform: showHistory ? "rotate(90deg)" : "none",
            }}>❯</span>
          </button>
          {showHistory && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.6rem" }}>
              {historyOpps.map(o => <OpportunityCard key={o.id} opp={o} {...cardProps} />)}
            </div>
          )}
        </>
      )}

      {/* Task Execution Modal */}
      {executingOpp && (
        <TaskExecutionModal
          opp={executingOpp}
          player={player}
          onConfirm={handleComplete}
          onClose={() => !busy && setExecutingOpp(null)}
          busy={busy === executingOpp.id}
        />
      )}

      {/* Result overlay */}
      <ResultOverlay result={result} onClose={() => setResult(null)} />
    </div>
  );
}
