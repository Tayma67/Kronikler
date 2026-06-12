/**
 * Nesil & Aile — KÜL & KÖZ görsel yeniden tasarım.
 * Duygu görevi: "Çocuklarım, geleceğim." — çocuk kartları sevgiyle
 * çerçevelenmiş, vâris seçimi törensel.
 * İşlevsellik (API çağrıları, hook akışı, koşullar) birebir korunur.
 */
import { useState, useMemo } from "react";
import { profLabel } from "@/lib/labels";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { playSfx } from "@/lib/audio";
import { toast } from "sonner";
import { PageHeader, Panel, Pill, GoldRule, Coin, EmptyState, TONES } from "@/components/ui/Kit";

/* ─────────────────── Sabitler ─────────────────── */
const STAT_ICONS  = { strength: "⚔", intelligence: "📖", charisma: "💬", stamina: "🛡", str: "⚔", agi: "🏃", int: "📖", cha: "💬", end: "🛡" };
const STAT_LABELS = { strength: "Güç", intelligence: "Zeka", charisma: "Karizma", stamina: "Dayanıklılık", str: "Güç", agi: "Çeviklik", int: "Zeka", cha: "Karizma", end: "Dayanıklılık" };
const SKILL_LABELS= { combat: "Dövüş", trade: "Ticaret", crafting: "Zanaat", social: "Sosyal" };

const INVEST_OPTIONS = [
  { type: "egitim",         label: "Eğitim",         desc: "Zekasını artır",       cost: 50, icon: "📖", tone: "ink",   gainLabel: "+5 Zeka" },
  { type: "savas_egitimi",  label: "Savaş Eğitimi",  desc: "Gücünü ve dövüşünü artır", cost: 50, icon: "⚔", tone: "blood", gainLabel: "+5 Güç, +5 Dövüş" },
  { type: "zanaat_egitimi", label: "Zanaat Eğitimi", desc: "Zanaat becerisini artır",   cost: 40, icon: "🔨", tone: "ember", gainLabel: "+5 Zanaat" },
  { type: "sosyal_egitim",  label: "Sosyal Eğitim",  desc: "Karizmasını ve sosyal becerisini artır", cost: 40, icon: "💬", tone: "sage", gainLabel: "+5 Karizma, +5 Sosyal" },
  { type: "saglik_bakimi",  label: "Sağlık Bakımı",  desc: "Sağlığını yenile",      cost: 30, icon: "🌿", tone: "sage",  gainLabel: "+15 Sağlık" },
];

const PROFESSION_OPTIONS = [
  "çiftçi", "tüccar", "asker", "zanaatkar", "din adamı",
  "seyyar satıcı", "şifacı", "muhafız", "mülteci", "çoban",
  "kasap", "demirci", "aşçı", "öğretmen", "kâtip",
];

/* ─────────────────── Yardımcı Bileşenler ─────────────────── */
function StatBar({ val, max = 100 }) {
  const pct = Math.min(100, Math.round(((val || 0) / max) * 100));
  const color = val >= 70 ? "#4A9A5A" : val >= 40 ? "#C9A84C" : "#C84040";
  return (
    <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${pct}%`, borderRadius: "2px",
        background: `linear-gradient(to right, ${color}99, ${color})`,
        boxShadow: `0 0 6px ${color}55`, transition: "width 0.5s ease",
      }} />
    </div>
  );
}

const modalOverlay = {
  position: "fixed", inset: 0, display: "flex", alignItems: "center",
  justifyContent: "center", padding: "1rem",
  background: "radial-gradient(ellipse at 50% 30%, rgba(30,20,8,0.88) 0%, rgba(6,4,2,0.94) 70%)",
  backdropFilter: "blur(3px)",
};

function CloseX({ onClick }) {
  return (
    <button onClick={onClick} className="font-display" style={{
      background: "none", border: "none", cursor: "pointer",
      fontSize: "0.9rem", color: "var(--color-parchment-muted)", padding: "0.2rem",
    }}>
      ✕
    </button>
  );
}

/* ─────────────────── InvestModal ─────────────────── */
function InvestModal({ child, playerMoney, onClose, onConfirm, busy }) {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ ...modalOverlay, zIndex: 50 }}>
      <div className="card-frame rise-in" style={{
        width: "100%", maxWidth: "24rem", padding: "1.25rem",
        display: "flex", flexDirection: "column", gap: "0.85rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="label-tiny">Yatırım Yap</div>
            <div className="font-display" style={{
              fontSize: "1.1rem", fontWeight: 700, color: "var(--color-parchment)",
              textShadow: "0 0 12px rgba(201,168,76,0.15)",
            }}>
              {child.name}
            </div>
          </div>
          <CloseX onClick={onClose} />
        </div>

        <div className="row-frame">
          <span style={{ fontSize: "0.9rem" }}>💰</span>
          <span className="label-tiny" style={{ flex: 1 }}>Mevcut altın</span>
          <Coin value={playerMoney} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {INVEST_OPTIONS.map((opt) => {
            const canAfford = playerMoney >= opt.cost;
            const isSelected = selected?.type === opt.type;
            const t = TONES[opt.tone] || TONES.gold;
            return (
              <button
                key={opt.type}
                disabled={!canAfford}
                onClick={() => { playSfx("click"); setSelected(opt); }}
                style={{
                  width: "100%", textAlign: "left", padding: "0.6rem 0.75rem",
                  borderRadius: "6px",
                  border: isSelected ? "1px solid rgba(201,168,76,0.6)" : `1px solid ${t.border}`,
                  background: isSelected
                    ? "linear-gradient(160deg, rgba(201,168,76,0.12) 0%, rgba(20,14,7,0.6) 60%)"
                    : "rgba(10,7,4,0.4)",
                  boxShadow: isSelected ? "0 0 14px rgba(201,168,76,0.15)" : "none",
                  opacity: canAfford ? 1 : 0.4,
                  cursor: canAfford ? "pointer" : "not-allowed",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="font-display" style={{
                    fontSize: "0.78rem", fontWeight: 700, color: "var(--color-parchment)",
                    display: "flex", alignItems: "center", gap: "0.4rem",
                  }}>
                    <span style={{ fontSize: "0.85rem" }}>{opt.icon}</span> {opt.label}
                  </span>
                  <Coin value={opt.cost} size="0.72rem" />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.15rem" }}>
                  <span className="font-serif" style={{
                    fontSize: "0.7rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
                  }}>
                    {opt.desc}
                  </span>
                  <span className="font-display" style={{ fontSize: "0.6rem", fontWeight: 700, color: t.text }}>
                    {opt.gainLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          disabled={!selected || busy}
          onClick={() => { if (selected) { playSfx("coin"); onConfirm(child.id, selected.type); } }}
          className="btn-ember"
          style={{
            width: "100%", padding: "0.65rem", fontSize: "0.68rem",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          }}
        >
          {busy ? <span className="ember-flicker">⏳</span> : null}
          {selected ? `${selected.label} — ${selected.cost}⚜ Harca` : "Yatırım Seç"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── SetProfessionModal ─────────────────── */
function SetProfessionModal({ child, onClose, onConfirm, busy }) {
  const [profession, setProfession] = useState(child.profession || "");
  const [custom, setCustom] = useState("");

  const finalProfession = custom.trim() || profession;

  return (
    <div style={{ ...modalOverlay, zIndex: 50 }}>
      <div className="card-frame rise-in" style={{
        width: "100%", maxWidth: "24rem", padding: "1.25rem",
        display: "flex", flexDirection: "column", gap: "0.85rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="label-tiny">Meslek Ata</div>
            <div className="font-display" style={{
              fontSize: "1.1rem", fontWeight: 700, color: "var(--color-parchment)",
              textShadow: "0 0 12px rgba(201,168,76,0.15)",
            }}>
              {child.name}
            </div>
          </div>
          <CloseX onClick={onClose} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
          {PROFESSION_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => { playSfx("click"); setProfession(p); setCustom(""); }}
              className="font-display"
              style={{
                padding: "0.3rem 0.6rem", borderRadius: "4px", cursor: "pointer",
                fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.08em",
                border: profession === p && !custom
                  ? "1px solid rgba(201,168,76,0.6)"
                  : "1px solid var(--color-border)",
                background: profession === p && !custom ? "rgba(201,168,76,0.10)" : "transparent",
                color: profession === p && !custom ? "var(--color-gold)" : "var(--color-parchment-muted)",
                boxShadow: profession === p && !custom ? "0 0 10px rgba(201,168,76,0.15)" : "none",
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <div>
          <div className="label-tiny" style={{ marginBottom: "0.3rem" }}>Veya Özel Meslek Gir</div>
          <input
            value={custom}
            onChange={(e) => { setCustom(e.target.value); setProfession(""); }}
            placeholder="ör. kâhin, casus, gezgin..."
            style={{ width: "100%", padding: "0.5rem 0.7rem", fontSize: "0.85rem" }}
          />
        </div>

        <button
          disabled={!finalProfession || busy}
          onClick={() => { if (finalProfession) { playSfx("page"); onConfirm(child.id, finalProfession); } }}
          className="btn-ember"
          style={{
            width: "100%", padding: "0.65rem", fontSize: "0.68rem",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          }}
        >
          {busy ? <span className="ember-flicker">⏳</span> : null}
          {finalProfession ? `"${finalProfession}" Olarak Ata` : "Meslek Seç"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── ChildDetailModal ─────────────────── */
function ChildDetailModal({ child, isHeir, playerMoney, factions, onClose, onSetHeir, onInvest, onSetProfession }) {
  const stats  = child.stats  || {};
  const skills = child.skills || {};
  const age    = child.age || 0;
  const isAdult = age >= 18;
  const isTeen  = age >= 13 && age < 18;

  // Faction üyeliği
  const childFaction = useMemo(() => {
    if (!factions?.length) return null;
    return factions.find(f =>
      (f.member_ids || []).includes(child.id) ||
      (f.members || []).some(m => m.id === child.id || m === child.id)
    );
  }, [factions, child.id]);

  const [showInvest, setShowInvest]         = useState(false);
  const [showProfession, setShowProfession] = useState(false);

  return (
    <div style={{ ...modalOverlay, zIndex: 40 }}>
      {/* Invest modal üstte */}
      {showInvest && (
        <InvestModal
          child={child}
          playerMoney={playerMoney}
          onClose={() => setShowInvest(false)}
          onConfirm={(cid, type) => { setShowInvest(false); onInvest(cid, type); }}
          busy={false}
        />
      )}
      {showProfession && (
        <SetProfessionModal
          child={child}
          onClose={() => setShowProfession(false)}
          onConfirm={(cid, prof) => { setShowProfession(false); onSetProfession(cid, prof); }}
          busy={false}
        />
      )}

      {!showInvest && !showProfession && (
        <div className="card-frame rise-in" style={{
          width: "100%", maxWidth: "24rem", padding: "1.25rem",
          maxHeight: "90vh", overflowY: "auto",
          display: "flex", flexDirection: "column", gap: "0.85rem",
          border: isHeir ? "1px solid rgba(201,168,76,0.5)" : undefined,
          boxShadow: isHeir ? "0 0 24px rgba(201,168,76,0.12)" : undefined,
        }}>
          {/* Başlık */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div className="label-tiny">{isAdult ? "Yetişkin Çocuk" : isTeen ? "Genç" : "Çocuk"}</div>
              <div className="font-display" style={{
                fontSize: "1.4rem", fontWeight: 700, color: "var(--color-parchment)",
                textShadow: "0 2px 10px rgba(0,0,0,0.5), 0 0 16px rgba(201,168,76,0.12)",
              }}>
                {child.name}
              </div>
              <div className="font-serif" style={{
                fontSize: "0.76rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
                display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.4rem", marginTop: "0.2rem",
              }}>
                <span>{age} yaş</span>
                <span>·</span>
                <span>{child.gender === "erkek" ? "Erkek" : "Kız"}</span>
                {child.profession && <><span>·</span><span style={{ textTransform: "capitalize" }}>{profLabel(child.profession)}</span></>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.35rem" }}>
              {isHeir && <Pill tone="gold">👑 Vâris</Pill>}
              <CloseX onClick={onClose} />
            </div>
          </div>

          {/* Faction rozeti */}
          {childFaction && (
            <div className="row-frame">
              <span style={{ fontSize: "0.85rem" }}>🛡</span>
              <span className="label-tiny">Hizip</span>
              <span className="font-display" style={{
                fontSize: "0.74rem", fontWeight: 700, color: "#9D78CC", flex: 1,
              }}>
                {childFaction.name}
              </span>
              <Pill tone="ink">{childFaction.type || "grup"}</Pill>
            </div>
          )}

          {/* Sağlık */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", flexShrink: 0 }}>❤</span>
            <span className="label-tiny" style={{ width: "4rem", flexShrink: 0 }}>Sağlık</span>
            <StatBar val={child.health || 0} />
            <span className="font-display" style={{
              fontSize: "0.74rem", fontWeight: 700, color: "var(--color-parchment)",
              width: "2rem", textAlign: "right", flexShrink: 0,
            }}>
              {child.health || 0}
            </span>
          </div>

          {/* Stats */}
          <div>
            <GoldRule label="Özellikler" />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {Object.entries(stats).length > 0
                ? Object.entries(stats).map(([key, val]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="label-tiny" style={{
                        width: "6rem", flexShrink: 0, display: "flex", alignItems: "center", gap: "0.3rem",
                      }}>
                        <span>{STAT_ICONS[key] || "•"}</span>
                        <span>{STAT_LABELS[key] || key}</span>
                      </span>
                      <StatBar val={val} max={100} />
                      <span className="font-display" style={{
                        fontSize: "0.72rem", fontWeight: 700, color: "var(--color-parchment)",
                        width: "1.6rem", textAlign: "right", flexShrink: 0,
                      }}>
                        {val}
                      </span>
                    </div>
                  ))
                : <p className="font-serif" style={{
                    fontSize: "0.76rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
                  }}>
                    Henüz stat verisi yok.
                  </p>
              }
            </div>
          </div>

          {/* Skills */}
          {Object.keys(skills).length > 0 && (
            <div>
              <GoldRule label="Beceriler" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {Object.entries(skills)
                  .filter(([, v]) => v > 0)
                  .map(([key, val]) => (
                    <Pill key={key} tone="ash">
                      {SKILL_LABELS[key] || key}
                      <span style={{ color: "var(--color-gold)" }}>{val}</span>
                    </Pill>
                  ))}
              </div>
            </div>
          )}

          {/* Büyüme ilerlemesi (reşit değilse) */}
          {!isAdult && (
            <div className="row-frame" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.35rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="label-tiny">⏳ Büyüme</span>
                <span className="font-serif" style={{
                  fontSize: "0.72rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
                }}>
                  {18 - age} yıl kaldı
                </span>
              </div>
              <StatBar val={Math.round((age / 18) * 100)} />
            </div>
          )}

          {/* Aksiyon butonları */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", paddingTop: "0.2rem" }}>
            {!isHeir && (
              <button
                onClick={() => { playSfx("success"); onSetHeir(child.id); onClose(); }}
                className="btn-ember"
                style={{ padding: "0.55rem", fontSize: "0.6rem" }}
              >
                👑 Vâris Yap
              </button>
            )}
            <button
              onClick={() => { playSfx("click"); setShowInvest(true); }}
              className="btn-ghost-ash"
              style={{
                padding: "0.55rem", fontSize: "0.6rem",
                gridColumn: isHeir ? "span 2" : undefined,
              }}
            >
              📈 Yatırım Yap
            </button>
            {(isTeen || isAdult) && (
              <button
                onClick={() => { playSfx("click"); setShowProfession(true); }}
                className="btn-ghost-ash"
                style={{ padding: "0.55rem", fontSize: "0.6rem", gridColumn: "span 2" }}
              >
                🛠 Meslek Ata
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── ChildCard ─────────────────── */
function ChildCard({ child, isHeir, factions, onSetHeir, onOpenDetail }) {
  const age       = child.age || 0;
  const isAdult   = age >= 18;
  const isTeen    = age >= 13 && age < 18;
  const ageLabel  = isAdult ? "Yetişkin" : isTeen ? "Genç" : "Çocuk";
  const pct       = Math.min(100, Math.round((age / 18) * 100));

  const childFaction = useMemo(() => {
    if (!factions?.length) return null;
    return factions.find(f =>
      (f.member_ids || []).includes(child.id) ||
      (f.members || []).some(m => m.id === child.id || m === child.id)
    );
  }, [factions, child.id]);

  return (
    <div
      className="card-frame"
      onClick={onOpenDetail}
      style={{
        padding: "0.85rem", cursor: "pointer",
        display: "flex", flexDirection: "column", gap: "0.6rem",
        border: isHeir ? "1px solid rgba(201,168,76,0.55)" : undefined,
        boxShadow: isHeir
          ? "0 0 18px rgba(201,168,76,0.14), inset 0 1px 0 rgba(201,168,76,0.18)"
          : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ minWidth: 0 }}>
          <div className="label-tiny">{isHeir ? `${ageLabel} · Ocağın Umudu` : ageLabel}</div>
          <div className="font-display" style={{
            fontSize: "1.05rem", fontWeight: 700,
            color: isHeir ? "var(--color-gold)" : "var(--color-parchment)",
            textShadow: isHeir ? "0 0 12px rgba(201,168,76,0.35)" : "0 1px 6px rgba(0,0,0,0.5)",
          }}>
            {child.name}
          </div>
          <div className="font-serif" style={{
            fontSize: "0.74rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.35rem", marginTop: "0.1rem",
          }}>
            <span>{age} yaş</span>
            <span>·</span>
            <span>{child.gender === "erkek" ? "Erkek" : "Kız"}</span>
            {child.profession && <><span>·</span><span style={{ textTransform: "capitalize" }}>{profLabel(child.profession)}</span></>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem", flexShrink: 0 }}>
          {isHeir && <Pill tone="gold">👑 Vâris</Pill>}
          {childFaction && <Pill tone="ink">🛡 {childFaction.name}</Pill>}
        </div>
      </div>

      {/* Sağlık + Büyüme çubuğu */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
        <div>
          <div className="label-tiny" style={{ marginBottom: "0.25rem" }}>Sağlık</div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <StatBar val={child.health || 0} />
            <span className="font-display" style={{
              fontSize: "0.66rem", fontWeight: 700, color: "var(--color-parchment-dim)",
              width: "1.6rem", textAlign: "right",
            }}>
              {child.health || 0}
            </span>
          </div>
        </div>
        {!isAdult && (
          <div>
            <div className="label-tiny" style={{ marginBottom: "0.25rem" }}>Büyüme</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <StatBar val={pct} />
              <span className="font-display" style={{
                fontSize: "0.66rem", fontWeight: 700, color: "var(--color-parchment-dim)",
                width: "2rem", textAlign: "right",
              }}>
                {18 - age}y
              </span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="font-serif" style={{
          fontSize: "0.68rem", fontStyle: "italic", color: "var(--color-parchment-muted)", opacity: 0.7,
        }}>
          Detay için dokun
        </span>
        <span style={{ fontSize: "0.6rem", color: "var(--color-gold-dim)" }}>▾</span>
      </div>
    </div>
  );
}

/* ─────────────────── LegacyPanel ─────────────────── */
function LegacyPanel({ legacyHistory, generation }) {
  const [expanded, setExpanded] = useState(false);

  if (!legacyHistory?.length && generation <= 1) return null;

  return (
    <div className="card-frame" style={{ padding: "0.85rem" }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem" }}>📜</span>
          <span className="font-display" style={{
            fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "var(--color-parchment-dim)",
          }}>
            Nesil Geçmişi
          </span>
          <Pill tone="ash">{generation}. Kuşak</Pill>
        </span>
        <span style={{ fontSize: "0.65rem", color: "var(--color-parchment-muted)" }}>
          {expanded ? "▴" : "▾"}
        </span>
      </button>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.7rem" }}>
          {(!legacyHistory || legacyHistory.length === 0) ? (
            <p className="font-serif" style={{
              fontSize: "0.76rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
            }}>
              Bu ilk nesil — geçmiş yok.
            </p>
          ) : (
            legacyHistory.slice().reverse().map((entry, idx) => (
              <div key={idx} style={{
                borderLeft: "2px solid rgba(201,168,76,0.3)",
                paddingLeft: "0.75rem", paddingTop: "0.2rem", paddingBottom: "0.2rem",
              }}>
                {entry.previous_name && (
                  <div className="font-display" style={{
                    fontSize: "0.82rem", fontWeight: 700, color: "var(--color-parchment)",
                  }}>
                    {entry.previous_name}
                  </div>
                )}
                <div className="font-serif" style={{
                  fontSize: "0.7rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
                }}>
                  {entry.generation && <span>{entry.generation}. Nesil</span>}
                  {entry.generation_turn != null && <span> · {1247 + Math.floor(entry.generation_turn / 12)} yılı</span>}
                  {entry.origin && (
                    <span style={{ marginLeft: "0.25rem" }}>
                      · {entry.origin === "çocuk" ? "çocukla devam" : "sürgün olarak başladı"}
                    </span>
                  )}
                </div>
                {entry.inherited_money > 0 && (
                  <div style={{ marginTop: "0.1rem" }}>
                    <Coin value={entry.inherited_money} size="0.62rem" />
                    <span className="label-tiny" style={{ marginLeft: "0.3rem" }}>miras</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── InheritanceSummary ─────────────────── */
function InheritanceSummary({ player, children }) {
  if (!children.length) return null;
  const inherited_money = Math.round((player.money || 0) * 0.60);
  const inherited_rep   = Math.round((player.reputation || 0) * 0.20);

  return (
    <Panel title="Miras Önizlemesi" icon="🪶" tone="ash">
      <p className="font-serif" style={{
        fontSize: "0.78rem", fontStyle: "italic",
        color: "var(--color-parchment-dim)", marginBottom: "0.6rem",
      }}>
        {player.name} ölürse, seçili vâris şunları devralır:
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <div className="row-frame" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.15rem" }}>
          <div className="label-tiny">Altın Mirası</div>
          <Coin value={inherited_money} size="1rem" />
          <div className="font-serif" style={{
            fontSize: "0.64rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
          }}>
            toplam paranın %60'ı
          </div>
        </div>
        <div className="row-frame" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.15rem" }}>
          <div className="label-tiny">İtibar Mirası</div>
          <div className="font-display" style={{
            fontSize: "1rem", fontWeight: 700, color: "#9D78CC",
            textShadow: "0 0 8px rgba(123,79,175,0.35)",
          }}>
            {inherited_rep}
          </div>
          <div className="font-serif" style={{
            fontSize: "0.64rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
          }}>
            toplam itibarın %20'si
          </div>
        </div>
      </div>
      <p className="font-serif" style={{
        fontSize: "0.72rem", fontStyle: "italic",
        color: "var(--color-parchment-muted)", marginTop: "0.6rem",
      }}>
        Stat mirası: Ebeveyn statlarının{" "}
        <span style={{ color: "var(--color-parchment-dim)" }}>%30'u</span> alınır.
      </p>
    </Panel>
  );
}

/* ─────────────────── SpouseCard ─────────────────── */
function SpouseCard({ spouse }) {
  if (!spouse) return null;
  return (
    <div className="card-frame" style={{
      padding: "0.75rem 0.85rem", display: "flex", alignItems: "center", gap: "0.75rem",
    }}>
      <span style={{ fontSize: "1.4rem", filter: "drop-shadow(0 0 8px rgba(200,64,64,0.3))" }}>💍</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="label-tiny">Eş</div>
        <div className="font-display" style={{
          fontSize: "0.92rem", fontWeight: 700, color: "var(--color-parchment)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {spouse.name}
        </div>
        <div className="font-serif" style={{
          fontSize: "0.72rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
        }}>
          {spouse.age} yaş · {profLabel(spouse.profession)}
        </div>
      </div>
      <Pill tone="blood">❤ {spouse.health}</Pill>
    </div>
  );
}

/* ─────────────────── EmptyFamily ─────────────────── */
function EmptyFamily() {
  return (
    <div className="card-frame">
      <EmptyState
        icon="🪺"
        title="Ocağında henüz çocuk sesi yok."
        sub="Evlen ve aile kur. Çocukların büyür, onlarla devam edebilirsin."
      />
    </div>
  );
}

/* ─────────────────── Ana Sayfa ─────────────────── */
export default function Generation() {
  const { state, fetchState } = useGame();
  const [busy, setBusy]             = useState(false);
  const [activeChildId, setActiveChildId] = useState(null);
  const [selectedHeirId, setSelectedHeirId] = useState(null);

  const player     = state?.player || {};
  const npcs       = useMemo(() => state?.world?.npcs || [], [state?.world?.npcs]);
  const factions   = state?.world?.factions || [];
  const generation = state?.generation || 1;
  const legacyHistory = state?.legacy_history || [];

  const spouse = useMemo(() => {
    if (!player.spouse_id) return null;
    return npcs.find(n => n.id === player.spouse_id && n.alive !== false);
  }, [npcs, player.spouse_id]);

  const children = useMemo(() => {
    const ids = player.children_ids || [];
    return ids.map(id => npcs.find(n => n.id === id)).filter(Boolean).filter(n => n.alive !== false);
  }, [npcs, player.children_ids]);

  // Otomatik varis seçimi
  const autoHeirId = useMemo(() => {
    const adults = children.filter(c => c.age >= 18);
    if (adults.length) return adults.sort((a, b) => a.age - b.age)[0]?.id;
    return children.sort((a, b) => (b.age || 0) - (a.age || 0))[0]?.id;
  }, [children]);

  const effectiveHeirId = selectedHeirId || autoHeirId;
  const activeChild     = activeChildId ? children.find(c => c.id === activeChildId) : null;

  /* Yatırım yap */
  const handleInvest = async (childId, investmentType) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/children/invest", {
        child_id: childId,
        investment_type: investmentType,
      });
      const opt = INVEST_OPTIONS.find(o => o.type === investmentType);
      toast.success(`${data.child_name} için ${opt?.label || investmentType} tamamlandı! (${data.cost}A)`);
      if (fetchState) await fetchState();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Yatırım başarısız.");
    } finally {
      setBusy(false);
      setActiveChildId(null);
    }
  };

  /* Meslek ata */
  const handleSetProfession = async (childId, profession) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/children/set_profession", {
        child_id: childId,
        profession,
      });
      toast.success(`${data.child_name} artık ${profession}!`);
      if (fetchState) await fetchState();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Meslek atanamadı.");
    } finally {
      setBusy(false);
      setActiveChildId(null);
    }
  };

  const inheritSummary = state?.inheritance_summary;

  return (
    <div className="page-shell rise-in" style={{
      padding: "0 0 1.5rem", display: "flex", flexDirection: "column", gap: "0.85rem",
    }}>
      {/* Detay modalı */}
      {activeChild && (
        <ChildDetailModal
          child={activeChild}
          isHeir={activeChild.id === effectiveHeirId}
          playerMoney={player.money || 0}
          factions={factions}
          onClose={() => setActiveChildId(null)}
          onSetHeir={(id) => setSelectedHeirId(id)}
          onInvest={handleInvest}
          onSetProfession={handleSetProfession}
        />
      )}

      {/* Başlık */}
      <PageHeader
        kicker="Soyun Devamı"
        icon="👶"
        title="Nesil & Aile"
        sub="Çocuklarım, geleceğim — adım onların nefesinde yaşayacak."
        right={
          <div style={{ textAlign: "right" }}>
            <div className="label-tiny" style={{ marginBottom: "0.1rem" }}>Aktif Nesil</div>
            <div className="font-display" style={{
              fontSize: "1.3rem", fontWeight: 900, color: "#E05A30",
              textShadow: "0 0 12px rgba(224,90,48,0.4)",
            }}>
              {generation}<span style={{ fontSize: "0.6rem", color: "var(--color-parchment-muted)" }}>. Kuşak</span>
            </div>
          </div>
        }
      />

      {/* Miras özeti (önceki oyuncudan) */}
      {inheritSummary && (
        <Panel title="Miras Alındı" icon="🌟" tone="gold"
          right={<span className="font-serif" style={{
            fontSize: "0.7rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
          }}>— {inheritSummary.previous_name}</span>}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            {inheritSummary.inherited_money > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <span className="label-tiny">Altın</span>
                <Coin value={inheritSummary.inherited_money} />
              </span>
            )}
            {inheritSummary.inherited_reputation !== 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <span className="label-tiny">İtibar</span>
                <span className="font-display" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#9D78CC" }}>
                  +{inheritSummary.inherited_reputation}
                </span>
              </span>
            )}
          </div>
          {inheritSummary.inherited_stats && (
            <p className="font-serif" style={{
              fontSize: "0.74rem", fontStyle: "italic",
              color: "var(--color-parchment-dim)", marginTop: "0.45rem",
            }}>
              Stat bonusu: {Object.entries(inheritSummary.inherited_stats)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => `+${v} ${STAT_LABELS[k] || k}`)
                .join(", ")}
            </p>
          )}

          {/* S3 Chronicle 2.0: romanın son sayfası */}
          {inheritSummary.hayat_romani && (
            <div>
              <GoldRule label="Romanın Son Sayfası" />
              <div className="font-display" style={{
                fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "#9D78CC",
              }}>
                📖 {inheritSummary.hayat_romani.baslik}
              </div>
              {(inheritSummary.hayat_romani.satirlar || []).map((s, i) => (
                <p key={i} className="font-serif" style={{
                  fontSize: "0.78rem", fontStyle: "italic", lineHeight: 1.6,
                  color: "var(--color-parchment-dim)", marginTop: "0.35rem",
                }}>
                  {s}
                </p>
              ))}
              {inheritSummary.hayat_romani.epitaf && (
                <p className="font-display" style={{
                  fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em",
                  textAlign: "center", color: "var(--color-gold)",
                  textShadow: "0 0 10px rgba(201,168,76,0.3)", marginTop: "0.5rem",
                }}>
                  "{inheritSummary.hayat_romani.epitaf}"
                </p>
              )}
              {(inheritSummary.hayat_romani.perdeler || []).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", marginTop: "0.45rem" }}>
                  {inheritSummary.hayat_romani.perdeler.slice(-5).map((p) => (
                    <div key={p.no} className="font-serif" style={{
                      fontSize: "0.68rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
                    }}>
                      {p.baslik}{" "}
                      <span style={{ color: "var(--color-gold-dim)" }}>
                        {1247 + Math.floor(p.baslangic / 12)}–{p.bitis != null ? 1247 + Math.floor(p.bitis / 12) : "…"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Panel>
      )}

      {/* Eş */}
      {spouse && <SpouseCard spouse={spouse} />}
      {!spouse && player.age >= 18 && (
        <div className="card-frame" style={{ padding: "0.75rem", textAlign: "center" }}>
          <span className="font-serif" style={{
            fontSize: "0.78rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
          }}>
            Bekârsın · Evlilik için{" "}
            <a href="/oyun/evlilik" style={{ color: "#E05A30", textDecoration: "underline" }}>
              Evlilik ekranına
            </a>{" "}
            git
          </span>
        </div>
      )}

      {/* Çocuklar */}
      <div>
        <GoldRule label={`Çocuklar (${children.length})`} />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {children.length === 0
            ? <EmptyFamily />
            : children.map(child => (
                <ChildCard
                  key={child.id}
                  child={child}
                  isHeir={child.id === effectiveHeirId}
                  factions={factions}
                  onSetHeir={setSelectedHeirId}
                  onOpenDetail={() => setActiveChildId(child.id)}
                />
              ))
          }
        </div>
      </div>

      {/* Miras önizlemesi */}
      {children.length > 0 && (
        <InheritanceSummary player={player} children={children} />
      )}

      {/* Nesil geçmişi */}
      <LegacyPanel legacyHistory={legacyHistory} generation={generation} />
    </div>
  );
}
