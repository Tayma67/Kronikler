/**
 * SkillTree.jsx — Yetenek Ağacı, KÜL & KÖZ.
 * Duygu görevi: "Ustalaşıyorum" — düğümler mühür gibi.
 * 3-seçenekli perk sistemi: her perk seviyesinde oyuncunun seçtiği perk gösterilir,
 * henüz seçilmemiş (ama seçilebilir) seviyeler köz gibi yanar.
 * İşlevsellik (props, koşullar, veri akışı) birebir korunur.
 */
import { useState } from "react";
import { playSfx } from "@/lib/audio";
import { PageHeader, Pill, EmptyState, TONES } from "@/components/ui/Kit";

const SKILL_META = {
  combat:   { label: "Savaş",   icon: "⚔",  tone: "blood" },
  trade:    { label: "Ticaret", icon: "⚖",  tone: "gold"  },
  crafting: { label: "Zanaat",  icon: "🔨", tone: "ember" },
  social:   { label: "Sosyal",  icon: "🗣", tone: "ink"   },
};

const PERK_LEVELS = [3, 6, 9];

/* Mühür rozeti — seviye damgası */
function SealBadge({ level, state, tone }) {
  const t = TONES[tone] || TONES.gold;
  const palette = {
    pending: { border: t.border, bg: t.bg, color: t.text, glow: `0 0 12px ${t.text}44` },
    chosen:  { border: "rgba(201,168,76,0.55)", bg: "rgba(201,168,76,0.1)", color: "var(--color-gold)", glow: "0 0 10px rgba(201,168,76,0.3)" },
    locked:  { border: "rgba(122,106,79,0.35)", bg: "rgba(10,7,4,0.4)", color: "var(--color-parchment-muted)", glow: "none" },
  }[state];
  return (
    <span className="font-display" style={{
      width: "2.2rem", height: "2.2rem", borderRadius: "50%", flexShrink: 0,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: "0.6rem", fontWeight: 700,
      border: state === "locked" ? `1px dashed ${palette.border}` : `1.5px solid ${palette.border}`,
      background: palette.bg, color: palette.color, boxShadow: palette.glow,
    }}>
      {level}
    </span>
  );
}

/**
 * Tek bir perk seviye düğümü.
 * Durumlar: locked | pending (skill ≥ level, henüz seçilmedi) | chosen | not_reached
 */
function PerkLevelNode({ level, skillLevel, chosenPerk, perkOptions, tone }) {
  const [expanded, setExpanded] = useState(false);
  const reached = skillLevel >= level;
  const chosen = chosenPerk !== null && chosenPerk !== undefined;
  const pending = reached && !chosen; // Skill yeterli ama seçim yapılmadı
  const t = TONES[tone] || TONES.gold;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
      {/* Bağlayıcı çizgi — ağacın gövdesi */}
      <div style={{
        margin: "0 auto", width: "1px", height: "1.1rem",
        background: reached
          ? `linear-gradient(to bottom, ${t.text}88, ${t.text}44)`
          : "rgba(122,106,79,0.3)",
      }} />

      {/* Düğüm başlığı — mühür */}
      <button
        onClick={() => reached && (playSfx("click"), setExpanded(e => !e))}
        className={pending ? "animate-pulse-gold" : ""}
        style={{
          textAlign: "left", borderRadius: "8px", padding: "0.6rem 0.7rem",
          transition: "all 0.2s", cursor: reached ? "pointer" : "default",
          border: pending
            ? `1px solid ${t.border}`
            : chosen
            ? "1px solid rgba(201,168,76,0.4)"
            : "1px dashed rgba(122,106,79,0.35)",
          background: pending
            ? `linear-gradient(160deg, ${t.bg}, rgba(15,11,6,0.6))`
            : chosen
            ? "linear-gradient(160deg, rgba(201,168,76,0.07), rgba(15,11,6,0.55))"
            : "rgba(10,7,4,0.35)",
          opacity: reached ? 1 : 0.55,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          {/* Seviye mührü */}
          <SealBadge
            level={level}
            tone={tone}
            state={pending ? "pending" : chosen ? "chosen" : "locked"}
          />

          {/* İçerik */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {pending && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem" }}>🔥</span>
                <span className="font-display" style={{
                  fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.1em", color: t.text,
                }}>
                  Mühür seçimi bekliyor
                </span>
              </div>
            )}
            {chosen && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <span style={{ fontSize: "1.1rem", filter: "drop-shadow(0 0 6px rgba(201,168,76,0.35))" }}>
                  {chosenPerk.perk_icon || "⭐"}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="font-display" style={{
                    fontSize: "0.7rem", fontWeight: 700, color: "var(--color-gold)",
                  }}>
                    {chosenPerk.perk_name}
                  </div>
                  <div className="font-serif" style={{
                    fontSize: "0.66rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {chosenPerk.perk_desc}
                  </div>
                </div>
              </div>
            )}
            {!reached && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>🔒</span>
                <span className="font-serif" style={{
                  fontSize: "0.72rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
                }}>
                  {level}. seviyede mühür açılır
                </span>
              </div>
            )}
          </div>

          {/* Durum işareti */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {chosen  && <span style={{ color: "#6FBF7F", fontSize: "0.8rem" }}>✓</span>}
            {pending && <span style={{ color: t.text, fontSize: "0.7rem" }}>●</span>}
            {reached && (
              <span style={{ color: "var(--color-parchment-muted)", fontSize: "0.6rem" }}>
                {expanded ? "▲" : "▼"}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Açılmış: seçenekleri göster */}
      {expanded && reached && perkOptions && (
        <div style={{ marginTop: "0.4rem", marginLeft: "0.5rem", paddingBottom: "0.25rem",
                      display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {perkOptions.map((opt) => {
            const isChosen = chosen && chosenPerk.perk_key === opt.key;
            const isOther = chosen && !isChosen; // Başkası seçildi
            return (
              <div
                key={opt.key}
                style={{
                  borderRadius: "7px", padding: "0.55rem 0.7rem", transition: "all 0.2s",
                  border: isChosen
                    ? "1px solid rgba(201,168,76,0.5)"
                    : `1px solid ${isOther ? "rgba(122,106,79,0.25)" : t.border}`,
                  background: isChosen
                    ? "rgba(201,168,76,0.08)"
                    : isOther ? "rgba(10,7,4,0.3)" : t.bg,
                  opacity: isOther ? 0.45 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.55rem" }}>
                  <span style={{ fontSize: "1.15rem", flexShrink: 0, filter: isOther ? "grayscale(1)" : "none" }}>
                    {opt.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="font-display" style={{
                      fontSize: "0.7rem", fontWeight: 700,
                      color: isChosen ? "var(--color-gold)" : isOther ? "var(--color-parchment-muted)" : "var(--color-parchment)",
                      display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap",
                    }}>
                      {opt.name}
                      {isChosen && <Pill tone="gold">Mühürlendi ✓</Pill>}
                    </div>
                    <div className="font-serif" style={{
                      fontSize: "0.68rem", fontStyle: "italic", marginTop: "0.15rem", lineHeight: 1.45,
                      color: isOther ? "rgba(122,106,79,0.7)" : "var(--color-parchment-dim)",
                    }}>
                      {opt.desc}
                    </div>
                    <div className="font-display" style={{
                      fontSize: "0.58rem", marginTop: "0.25rem", letterSpacing: "0.05em",
                      color: isChosen ? "#6FBF7F" : isOther ? "rgba(122,106,79,0.7)" : t.text,
                    }}>
                      → {opt.effect_preview}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {pending && (
            <p className="font-serif" style={{
              fontSize: "0.66rem", fontStyle: "italic", textAlign: "center",
              color: "var(--color-gold-dim)", paddingTop: "0.2rem",
            }}>
              ⚡ Ayı ilerlet — mühür seçim ekranı açılacak
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SkillBranch({ skillKey, skillData, expanded, onToggle }) {
  const meta = SKILL_META[skillKey];
  const t = TONES[meta.tone] || TONES.gold;

  const currentLevel = skillData?.level ?? 0;
  const currentXp = skillData?.xp ?? 0;
  const nextXp = skillData?.xp_next ?? 10;
  const chosenPerks = skillData?.chosen_perks || []; // [{skill, level, perk_key, perk_name, perk_desc, perk_icon}]
  const perkChoices = skillData?.perk_choices || {}; // {3: [...], 6: [...], 9: [...]}

  const xpPct = nextXp > 0 ? Math.min(100, (currentXp / nextXp) * 100) : 0;
  const chosenCount = PERK_LEVELS.filter(lv =>
    chosenPerks.some(p => p.level === lv)
  ).length;

  return (
    <div className="card-frame" style={{
      overflow: "hidden",
      border: `1px solid ${t.border}`,
      background: `linear-gradient(165deg, ${t.bg} 0%, rgba(20,14,7,0.5) 40%, transparent 100%)`,
    }}>
      {/* Dal başlığı */}
      <button
        onClick={() => { playSfx("click"); onToggle(); }}
        style={{
          width: "100%", padding: "0.8rem 0.85rem", display: "flex", alignItems: "center",
          gap: "0.7rem", background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: "1.3rem", flexShrink: 0, filter: `drop-shadow(0 0 8px ${t.text}55)` }}>
          {meta.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-display" style={{
            fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: t.text,
          }}>
            {meta.label}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.3rem" }}>
            <span className="font-display" style={{ fontSize: "0.6rem", color: "var(--color-parchment-dim)", flexShrink: 0 }}>
              Seviye {currentLevel}
            </span>
            <div style={{ flex: 1, maxWidth: "90px", height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${xpPct}%`, borderRadius: "2px",
                background: `linear-gradient(to right, ${t.text}99, ${t.text})`,
                boxShadow: `0 0 6px ${t.text}55`, transition: "width 0.5s ease",
              }} />
            </div>
            <span className="font-display" style={{ fontSize: "0.52rem", color: "var(--color-parchment-muted)", flexShrink: 0 }}>
              {currentXp}/{nextXp} XP
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          {chosenCount > 0 && (
            <Pill tone="sage">{chosenCount}/{PERK_LEVELS.length} mühür</Pill>
          )}
          <span style={{ color: "var(--color-parchment-muted)", fontSize: "0.65rem" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {/* Perk ağacı */}
      {expanded && (
        <div style={{ padding: "0 0.85rem 0.9rem" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
            {/* Kök */}
            <div style={{
              margin: "0 auto", width: "8px", height: "8px", borderRadius: "50%",
              background: currentLevel > 0 ? t.text : "rgba(122,106,79,0.4)",
              boxShadow: currentLevel > 0 ? `0 0 8px ${t.text}66` : "none",
            }} />

            {PERK_LEVELS.map((level) => {
              const chosenPerk = chosenPerks.find(p => p.level === level) || null;
              const options = perkChoices[level] || null;
              return (
                <PerkLevelNode
                  key={level}
                  level={level}
                  skillLevel={currentLevel}
                  chosenPerk={chosenPerk}
                  perkOptions={options}
                  tone={meta.tone}
                />
              );
            })}
          </div>

          {currentLevel >= 9 && chosenCount === PERK_LEVELS.length && (
            <div className="font-display ember-flicker" style={{
              marginTop: "0.9rem", textAlign: "center", fontSize: "0.6rem",
              letterSpacing: "0.25em", color: "var(--color-gold)",
            }}>
              ✦ TÜM MÜHÜRLER VURULDU ✦
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SkillTree({ skillsData }) {
  const [expanded, setExpanded] = useState({ combat: true, trade: false, crafting: false, social: false });
  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  if (!skillsData) {
    return (
      <EmptyState
        icon="📜"
        title="Ustalık defterin açılıyor…"
        sub="Yetenek kayıtları getiriliyor, bir nefes bekle."
      />
    );
  }

  const skillLevels = skillsData.skills || {};
  const skillXp    = skillsData.skill_xp || {};
  const chosenPerksAll = skillsData.chosen_perks || [];
  const perkChoicesAll = skillsData.perk_choices || {};

  // Her skill için veri paketle
  const buildSkillData = (skillKey) => {
    const level = skillLevels[skillKey] ?? 0;
    const xp = skillXp[skillKey] ?? 0;
    const xpNext = 10 + level * 5;
    return {
      level,
      xp,
      xp_next: xpNext,
      chosen_perks: chosenPerksAll.filter(p => p.skill === skillKey),
      perk_choices: perkChoicesAll[skillKey] || {},
    };
  };

  return (
    <div className="page-shell rise-in">
      <PageHeader
        kicker="Ustalık"
        icon="🜂"
        title="Yetenek Ağacı"
        sub="Her dal emekle uzar; her mühür bir ömrün damgasıdır."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        {["combat", "trade", "crafting", "social"].map(skillKey => (
          <SkillBranch
            key={skillKey}
            skillKey={skillKey}
            skillData={buildSkillData(skillKey)}
            expanded={expanded[skillKey]}
            onToggle={() => toggle(skillKey)}
          />
        ))}
      </div>
    </div>
  );
}
