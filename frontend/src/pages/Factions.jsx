/**
 * Factions.jsx — Ocaklar & Güç Dengesi — KÜL & KÖZ.
 * Duygu görevi: "Bir ocağa aitim" — rütbe merdiveni, ocaktan haberler ferman gibi.
 *
 * Adım 6: Faction savaşı UI derinleştirme
 * - WarAlertBanner: Oyuncu factioni savaştaysa üst uyarı
 * - WarDecisionModal: Katıl/Kaçın karar ekranı (strateji seçimi)
 * - WarOutcomeModal: Savaş sonuç ekranı (log + stat değişimleri)
 * - BattleLogEntry: Geçmiş çatışma kayıtları
 * - Güç değişimi görsel göstergesi (ok + bar)
 *
 * İşlevsellik (API çağrıları, state akışı, handler'lar) birebir korunur.
 */

import { useEffect, useState, useCallback } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useActionRedirect } from "@/hooks/useActionRedirect";
import StoryEventFeed from "@/components/StoryEventFeed";
import { playSfx } from "@/lib/audio";
import { Loader2 } from "lucide-react";
import { PageHeader, Panel, Pill, GoldRule, EmptyState, Coin, ConfirmModal } from "@/components/ui/Kit";

// ─── Faction Tip Konfigürasyonu ───────────────────────────────────────────────
const FACTION_TYPES = {
  krallık_ordusu:    { label: "Sultanın Ordusu",      color: "#7FA7C9", icon: "🛡️" },
  tuccar_loncasi:    { label: "Tüccar Loncası",        color: "#C9A84C", icon: "⚖️" },
  zanaatkar_loncasi: { label: "Zanaatkar Loncası",     color: "#B08FD9", icon: "🔨" },
  paralı_asker:      { label: "Paralı Asker Loncası",  color: "#C84040", icon: "⚔️" },
  ilim_cemiyeti:     { label: "İlim Cemiyeti",         color: "#4A9A5A", icon: "📜" },
  sifaci_birligi:    { label: "Şifacı Birliği",        color: "#6FBF7F", icon: "🌿" },
  dini_tarikat:      { label: "Dini Tarikat",          color: "#7B4FAF", icon: "🕌" },
  oyuncu_kumpanya:   { label: "Seyyah Kumpanya",       color: "#D98FB0", icon: "🎶" },
  eskiya_cetesi:     { label: "Eşkıya Çetesi",         color: "#E05A30", icon: "🏴" },
  gizli_cemiyet:     { label: "Gizli Cemiyet",         color: "#4FA8A0", icon: "🗝️" },
};

// ─── R8: Fraksiyon Yüzeyi — aylık sahne + rütbe imtiyaz kartı + olay feed'i ──
function FactionFeedSection({ feed, onSceneChoice, busy }) {
  const [showPerks, setShowPerks] = useState(false);
  if (!feed) return null;
  const scene = feed.scene && !feed.scene.resolved ? feed.scene : null;
  const card = feed.perk_card;
  const events = (feed.events || []).slice(0, 5).map((e, i) => ({
    type: e.type,
    text: e.title || e.lines?.[0] || "",
    narrative: e.title ? (e.lines || []).join(" ") : null,
    _key: `${e.day}-${i}`,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* 8.1 Aylık sahne */}
      {scene && (
        <Panel title="Bu Ay Ocakta" icon="🔥" tone="ember">
          <p className="font-serif" style={{
            fontSize: "0.88rem", fontStyle: "italic", lineHeight: 1.6,
            color: "var(--color-parchment)", margin: "0 0 0.7rem",
          }}>
            {scene.text}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {scene.choices.map(c => (
              <button key={c.id} onClick={() => onSceneChoice(c.id)} disabled={busy}
                className="row-frame"
                style={{
                  width: "100%", textAlign: "left", cursor: "pointer",
                  opacity: busy ? 0.4 : 1,
                  border: "1px solid rgba(224,90,48,0.35)",
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="font-display" style={{
                    fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
                    color: "var(--color-parchment)",
                  }}>
                    {c.label}
                  </span>
                  <span className="font-serif" style={{
                    fontSize: "0.68rem", fontStyle: "italic",
                    color: "var(--color-parchment-muted)", marginLeft: "0.5rem",
                  }}>
                    {c.hint}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {/* 8.2 Rütbe imtiyaz kartı */}
      {card && (
        <div className="card-frame" style={{ padding: "0.75rem 0.85rem" }}>
          <button onClick={() => setShowPerks(s => !s)}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              justifyContent: "space-between", background: "none",
              border: "none", padding: 0, cursor: "pointer",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
              <span style={{ fontSize: "0.95rem", filter: "drop-shadow(0 0 8px rgba(201,168,76,0.35))" }}>👑</span>
              <span className="font-display" style={{
                fontSize: "0.8rem", fontWeight: 700, color: "var(--color-gold)",
                letterSpacing: "0.06em",
              }}>
                {card.title}
              </span>
              {card.next_title && (
                <span className="font-serif" style={{
                  fontSize: "0.68rem", fontStyle: "italic",
                  color: "var(--color-parchment-muted)",
                }}>
                  → {card.next_title}
                </span>
              )}
            </div>
            <span className="font-display" style={{ fontSize: "0.7rem", color: "var(--color-parchment-muted)" }}>
              {showPerks ? "▾" : "▸"}
            </span>
          </button>
          {showPerks && (
            <div style={{ marginTop: "0.65rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {card.perks.map((p, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: "0.45rem",
                  padding: "0.4rem 0.55rem", borderRadius: "5px",
                  border: p.unlocked ? "1px solid rgba(201,168,76,0.35)" : "1px dashed rgba(122,106,79,0.35)",
                  background: p.unlocked ? "rgba(201,168,76,0.06)" : "transparent",
                }}>
                  <span style={{ fontSize: "0.7rem", flexShrink: 0, opacity: p.unlocked ? 1 : 0.5 }}>
                    {p.unlocked ? "✦" : "🔒"}
                  </span>
                  <div className="font-serif" style={{
                    flex: 1, fontSize: "0.78rem",
                    color: p.unlocked ? "var(--color-parchment)" : "var(--color-parchment-muted)",
                  }}>
                    {p.perk}
                    {!p.unlocked && (
                      <span className="font-display" style={{
                        fontSize: "0.56rem", color: "var(--color-parchment-muted)",
                        marginLeft: "0.35rem", opacity: 0.8,
                      }}>
                        ({p.rank_title} rütbesinde)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8.3 Olaylar — mini sahneler, ferman gibi */}
      {events.length > 0 && (
        <div>
          <GoldRule label="Ocaktan Haberler" />
          <StoryEventFeed events={events} showTimeline={false} />
        </div>
      )}
    </div>
  );
}

function ftCfg(type) {
  return FACTION_TYPES[type] || FACTION_TYPES["tuccar_loncasi"];
}

// ─── Küçük yardımcılar ────────────────────────────────────────────────────────
function clamp(v, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }

const BAR_COLORS = {
  "bg-emerald-700": "#4A9A5A", "bg-emerald-600": "#4A9A5A",
  "bg-amber-700": "#C9A84C", "bg-amber-600": "#C9A84C", "bg-amber-400": "#F0C040",
  "bg-red-700": "#C84040", "bg-red-600": "#C84040",
  "bg-sky-700": "#7FA7C9", "bg-sky-600": "#7FA7C9",
  "bg-orange-700": "#E05A30", "bg-orange-800": "#B5512E",
  "bg-teal-700": "#4FA8A0",
  "bg-stone-600": "#7A6A4F",
};

function Bar({ value, max = 100, color = "bg-orange-700", label, labelRight }) {
  const pct = clamp((value / max) * 100);
  const hex = BAR_COLORS[color] || "#C9A84C";
  return (
    <div>
      {(label || labelRight) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
          {label && <span className="label-tiny" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>}
          {labelRight && (
            <span className="font-display" style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--color-parchment-dim)", flexShrink: 0 }}>
              {labelRight}
            </span>
          )}
        </div>
      )}
      <div style={{ height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: "2px",
          background: `linear-gradient(to right, ${hex}99, ${hex})`,
          boxShadow: `0 0 6px ${hex}55`, transition: "width 0.3s ease",
        }} />
      </div>
    </div>
  );
}

function InfluenceDot({ value }) {
  const col = value >= 75 ? "#F0C040" : value >= 50 ? "#7FA7C9" : value >= 25 ? "#4A9A5A" : "#7A6A4F";
  return <span style={{
    display: "inline-block", width: "8px", height: "8px", borderRadius: "50%",
    background: col, boxShadow: `0 0 6px ${col}66`, flexShrink: 0,
  }} />;
}

// ─── Savaş Momentum Rozeti ────────────────────────────────────────────────────
function MomentumBadge({ momentum }) {
  const cfg = {
    üstün:    { tone: "sage",  label: "▲ Üstün Geliyor" },
    geride:   { tone: "blood", label: "▼ Geride Kalıyor" },
    dengeli:  { tone: "ash",   label: "— Dengeli" },
  }[momentum] || { tone: "ash", label: "—" };
  return <Pill tone={cfg.tone}>{cfg.label}</Pill>;
}

// ─── Güç Karşılaştırma Barı ───────────────────────────────────────────────────
function StrengthComparison({ ourPower, enemyPower, ourName, enemyName }) {
  const total = Math.max(1, ourPower + enemyPower);
  const ourPct = Math.round((ourPower / total) * 100);
  const enemyPct = 100 - ourPct;
  const dominant = ourPct > 60 ? "biz" : ourPct < 40 ? "düşman" : "dengeli";
  return (
    <div>
      <div className="font-display" style={{
        display: "flex", justifyContent: "space-between", gap: "0.4rem",
        fontSize: "0.56rem", letterSpacing: "0.08em",
        color: "var(--color-parchment-muted)", marginBottom: "0.3rem",
      }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ourName}</span>
        <span style={{
          flexShrink: 0, fontWeight: 700,
          color: dominant === "biz" ? "#4A9A5A" : dominant === "düşman" ? "#C84040" : "var(--color-parchment-dim)",
        }}>
          {dominant === "biz" ? "Biz Önde" : dominant === "düşman" ? "Düşman Önde" : "Dengeli"}
        </span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{enemyName}</span>
      </div>
      <div style={{
        display: "flex", height: "10px", borderRadius: "5px", overflow: "hidden",
        gap: "2px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--color-border)",
      }}>
        <div style={{
          width: `${ourPct}%`, transition: "width 0.5s ease",
          background: "linear-gradient(to right, #8B6914, #C9A84C)",
          boxShadow: "0 0 8px rgba(201,168,76,0.4)",
        }} />
        <div style={{
          width: `${enemyPct}%`, transition: "width 0.5s ease",
          background: "linear-gradient(to right, #C84040, #7A2020)",
          boxShadow: "0 0 8px rgba(200,64,64,0.4)",
        }} />
      </div>
      <div className="font-display" style={{
        display: "flex", justifyContent: "space-between",
        fontSize: "0.6rem", fontWeight: 700, marginTop: "0.3rem",
      }}>
        <span style={{ color: "var(--color-gold)" }}>{ourPower} güç</span>
        <span style={{ color: "#C84040" }}>{enemyPower} güç</span>
      </div>
    </div>
  );
}

// ─── Savaş Bildirimi Üst Banner ───────────────────────────────────────────────
function WarAlertBanner({ warDetail, onOpenDecision, loading }) {
  if (!warDetail) return null;
  const { our_faction, enemy_faction, cause, duration_weeks, momentum } = warDetail;
  const causeLabel = {
    toprak_genişlemesi: "Toprak Genişlemesi",
    ihanet: "İhanet",
    ekonomik_baskı: "Ekonomik Baskı",
    iç_savaş: "İç Savaş",
    toprak_talebi: "Toprak Talebi",
  }[cause] || cause?.replace(/_/g, " ") || "Bilinmiyor";

  return (
    <div className="card-frame" style={{
      padding: "1rem",
      border: "1px solid rgba(200,64,64,0.55)",
      boxShadow: "0 0 22px rgba(200,64,64,0.12), 0 4px 16px rgba(0,0,0,0.5)",
    }}>
      {/* Başlık */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <span className="ember-flicker" style={{ fontSize: "1.2rem", flexShrink: 0 }}>⚔️</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="label-tiny" style={{ color: "#C84040" }}>Ocağın Savaşta!</div>
          <div className="font-display" style={{
            fontSize: "0.82rem", fontWeight: 700, color: "var(--color-parchment)",
          }}>
            {our_faction.name}
            <span style={{ color: "#C84040", margin: "0 0.45rem" }}>⚔</span>
            {enemy_faction.name}
          </div>
        </div>
        <MomentumBadge momentum={momentum} />
      </div>

      {/* Detaylar */}
      <div className="font-serif" style={{
        display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap",
        fontSize: "0.74rem", fontStyle: "italic",
        color: "var(--color-parchment-muted)", margin: "0.55rem 0",
      }}>
        <span>Sebep: <span style={{ color: "var(--color-parchment-dim)" }}>{causeLabel}</span></span>
        <span>·</span>
        <span>🕯 {duration_weeks} ay</span>
        <span>·</span>
        <span>{warDetail.battles_count} çatışma</span>
      </div>

      {/* Güç karşılaştırması */}
      <StrengthComparison
        ourPower={our_faction.military_power}
        enemyPower={enemy_faction.military_power}
        ourName={our_faction.name}
        enemyName={enemy_faction.name}
      />

      {/* Aksiyon butonu */}
      <button
        onClick={() => { playSfx("sword"); onOpenDecision(); }}
        disabled={loading}
        className="btn-ember"
        style={{
          width: "100%", padding: "0.65rem", fontSize: "0.7rem", marginTop: "0.75rem",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
        }}
      >
        {loading ? <Loader2 className="animate-spin" style={{ width: "0.9rem", height: "0.9rem" }} /> : "⚔️"}
        Savaş Kararını Ver
      </button>
    </div>
  );
}

// ─── Savaş Karar Modali ───────────────────────────────────────────────────────
function WarDecisionModal({ warDetail, onClose, onDecide, busy }) {
  const [strategy, setStrategy] = useState("saldır");
  const { our_faction, enemy_faction, cause } = warDetail;

  const STRATEGIES = [
    {
      key: "saldır",
      icon: "⚔️",
      label: "Saldır",
      color: "#C84040",
      desc: "Hasar +35% · Savunma -30%",
      detail: "Yüksek risk, yüksek ödül. Düşmanı çabuk bitirmek için.",
    },
    {
      key: "savun",
      icon: "🛡️",
      label: "Savun",
      color: "#7FA7C9",
      desc: "Savunma +45% · Hasar -30%",
      detail: "Düşmanı yıprat. Uzun vadede daha güvenli.",
    },
    {
      key: "kaç",
      icon: "🌬️",
      label: "Geri Çekil",
      color: "#7A6A4F",
      desc: "İtibar -5 · Onur -5",
      detail: "Ocağın çağrısını görmezden gelirsin. İtibar kaybedersin.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="card-frame" style={{ padding: "1.2rem", maxWidth: "24rem", width: "100%" }}>
        {/* Başlık */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
          <h2 className="font-display" style={{
            fontSize: "0.95rem", fontWeight: 700, letterSpacing: "0.1em",
            color: "#C84040", textShadow: "0 0 14px rgba(200,64,64,0.35)",
            display: "flex", alignItems: "center", gap: "0.45rem", margin: 0,
          }}>
            ⚔️ Savaş Kararı
          </h2>
          <button onClick={onClose} className="font-display"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-parchment-muted)", fontSize: "0.85rem" }}>
            ✕
          </button>
        </div>

        {/* Güç karşılaştırması */}
        <StrengthComparison
          ourPower={our_faction.military_power}
          enemyPower={enemy_faction.military_power}
          ourName={our_faction.name}
          enemyName={enemy_faction.name}
        />

        {/* Strateji seçimi */}
        <GoldRule label="Taktik Seç" />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {STRATEGIES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStrategy(s.key)}
              style={{
                width: "100%", padding: "0.6rem 0.7rem", borderRadius: "6px",
                textAlign: "left", cursor: "pointer", transition: "all 0.15s",
                border: strategy === s.key ? `1px solid ${s.color}AA` : "1px solid var(--color-border)",
                background: strategy === s.key ? `${s.color}14` : "transparent",
                boxShadow: strategy === s.key ? `0 0 12px ${s.color}22` : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", marginBottom: "0.15rem" }}>
                <span className="font-display" style={{
                  fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.06em",
                  color: strategy === s.key ? s.color : "var(--color-parchment-dim)",
                  display: "flex", alignItems: "center", gap: "0.4rem",
                }}>
                  {s.icon} {s.label}
                </span>
                <span className="font-display" style={{ fontSize: "0.56rem", color: "var(--color-parchment-muted)", flexShrink: 0 }}>
                  {s.desc}
                </span>
              </div>
              <div className="font-serif" style={{ fontSize: "0.7rem", fontStyle: "italic", color: "var(--color-parchment-muted)" }}>
                {s.detail}
              </div>
            </button>
          ))}
        </div>

        {/* Butonlar */}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.9rem" }}>
          <button onClick={onClose} className="btn-ghost-ash" style={{ flex: 1, padding: "0.55rem", fontSize: "0.62rem" }}>
            İptal
          </button>
          <button
            onClick={() => onDecide(strategy)}
            disabled={busy}
            className={strategy === "kaç" ? "btn-ghost-ash" : "btn-ember"}
            style={{
              flex: 1, padding: "0.55rem", fontSize: "0.62rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
            }}
          >
            {busy ? <Loader2 className="animate-spin" style={{ width: "0.85rem", height: "0.85rem" }} /> :
              strategy === "kaç" ? "🌬️" : "⚔️"}
            {strategy === "kaç" ? "Geri Çekil" : "Savaşa Katıl"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Savaş Sonuç Modali ───────────────────────────────────────────────────────
function WarOutcomeModal({ result, onClose }) {
  const { outcome, log, loot, reputation_change, honor_change,
          our_military_power, enemy_military_power, strategy } = result;

  const OUTCOME_CFG = {
    zafer:     { color: "#F0C040", icon: "🏆", label: "Zafer!" },
    kayıp:     { color: "#C84040", icon: "💀", label: "Yenildin" },
    beraberlik:{ color: "#B8A880", icon: "⚖️", label: "Beraberlik" },
    kaçış:     { color: "#7A6A4F", icon: "🌬️", label: "Geri Çekildin" },
  };
  const cfg = OUTCOME_CFG[outcome] || OUTCOME_CFG["beraberlik"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
      <div className="card-frame" style={{ padding: "1.2rem", maxWidth: "24rem", width: "100%" }}>
        {/* Sonuç Başlık */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.7rem 0.85rem", borderRadius: "6px",
          border: `1px solid ${cfg.color}66`, background: `${cfg.color}10`,
          boxShadow: `0 0 18px ${cfg.color}1A`,
        }}>
          <span style={{ fontSize: "1.6rem", flexShrink: 0, filter: `drop-shadow(0 0 12px ${cfg.color}66)` }}>
            {cfg.icon}
          </span>
          <div>
            <div className="font-display" style={{
              fontSize: "1.05rem", fontWeight: 700, letterSpacing: "0.1em",
              color: cfg.color, textShadow: `0 0 14px ${cfg.color}55`,
            }}>
              {cfg.label}
            </div>
            <div className="font-serif" style={{
              fontSize: "0.72rem", fontStyle: "italic",
              color: "var(--color-parchment-muted)", textTransform: "capitalize",
            }}>
              {strategy?.replace("kaç", "Geri Çekilme")}
            </div>
          </div>
        </div>

        {/* Stat değişimleri */}
        <div style={{
          display: "flex", justifyContent: "center", flexWrap: "wrap",
          gap: "0.5rem", marginTop: "0.75rem",
        }}>
          {loot > 0 && (
            <div className="card-frame" style={{ padding: "0.5rem 0.8rem", textAlign: "center" }}>
              <Coin value={`+${loot}`} />
              <div className="label-tiny" style={{ marginTop: "0.1rem" }}>ganimet</div>
            </div>
          )}
          {reputation_change !== 0 && (
            <div className="card-frame" style={{ padding: "0.5rem 0.8rem", textAlign: "center" }}>
              <div className="font-display" style={{
                fontSize: "0.85rem", fontWeight: 700,
                color: reputation_change > 0 ? "#4A9A5A" : "#C84040",
              }}>
                {reputation_change > 0 ? "+" : ""}{reputation_change}
              </div>
              <div className="label-tiny" style={{ marginTop: "0.1rem" }}>itibar</div>
            </div>
          )}
          {honor_change !== 0 && (
            <div className="card-frame" style={{ padding: "0.5rem 0.8rem", textAlign: "center" }}>
              <div className="font-display" style={{
                fontSize: "0.85rem", fontWeight: 700,
                color: honor_change > 0 ? "#4A9A5A" : "#C84040",
              }}>
                {honor_change > 0 ? "+" : ""}{honor_change}
              </div>
              <div className="label-tiny" style={{ marginTop: "0.1rem" }}>onur</div>
            </div>
          )}
        </div>

        {/* Güç durumu (varsa) */}
        {our_military_power != null && enemy_military_power != null && (
          <div style={{ marginTop: "0.8rem" }}>
            <div className="label-tiny" style={{ marginBottom: "0.35rem" }}>Savaş Durumu</div>
            <Bar label="Bizim güç" value={our_military_power} color="bg-sky-700" labelRight={`${our_military_power}`} />
            <div style={{ height: "0.35rem" }} />
            <Bar label="Düşman güç" value={enemy_military_power} color="bg-red-700" labelRight={`${enemy_military_power}`} />
          </div>
        )}

        {/* Savaş Logu */}
        <div style={{ marginTop: "0.8rem" }}>
          <GoldRule label="Savaş Günlüğü" />
          <div style={{
            border: "1px solid var(--color-border)", borderRadius: "6px",
            background: "rgba(10,7,4,0.5)", padding: "0.6rem 0.7rem",
            maxHeight: "9rem", overflowY: "auto",
          }}>
            {log?.map((line, i) => (
              <div key={i} className="font-serif" style={{
                fontSize: "0.74rem", fontStyle: "italic", lineHeight: 1.55,
                color:
                  line.includes("⚔️") || line.includes("🏆") ? "var(--color-gold)" :
                  line.includes("💀") || line.includes("hasar aldın") ? "#C84040" :
                  line.includes("💨") || line.includes("Geri çekildin") ? "var(--color-parchment-muted)" :
                  line.includes("hasar verdin") ? "#4A9A5A" : "var(--color-parchment-dim)",
              }}>{line}</div>
            ))}
          </div>
        </div>

        <button onClick={onClose} className="btn-ember"
          style={{ width: "100%", padding: "0.65rem", fontSize: "0.7rem", marginTop: "0.85rem" }}>
          Tamam
        </button>
      </div>
    </div>
  );
}

// ─── Geçmiş Çatışma Kaydı ─────────────────────────────────────────────────────
function BattleLogEntry({ battle, ourFactionId, turn }) {
  const weeksAgo = turn != null && battle.turn != null ? turn - battle.turn : null;
  const isWin = battle.winner_id === ourFactionId;
  const col = isWin ? "#4A9A5A" : "#C84040";
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "0.6rem",
      padding: "0.55rem 0.7rem", borderRadius: "6px",
      border: `1px solid ${col}55`, background: `${col}0D`,
    }}>
      <span style={{ fontSize: "0.8rem", flexShrink: 0, filter: `drop-shadow(0 0 6px ${col}55)` }}>
        {isWin ? "✦" : "✕"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", flexWrap: "wrap" }}>
          <span className="font-display" style={{ fontSize: "0.7rem", fontWeight: 700, color: col }}>
            {isWin ? "Zafer" : "Mağlubiyet"} — {battle.region_name}
          </span>
          {weeksAgo != null && (
            <span className="font-serif" style={{ fontSize: "0.62rem", fontStyle: "italic", color: "var(--color-parchment-muted)" }}>
              {weeksAgo} ay önce
            </span>
          )}
        </div>
        <div className="font-serif" style={{
          fontSize: "0.68rem", color: "var(--color-parchment-muted)",
          marginTop: "0.15rem", display: "flex", gap: "0.7rem", flexWrap: "wrap",
        }}>
          <span>Galibin kaybı: <span style={{ color: "var(--color-parchment-dim)" }}>{battle.winner_casualties}</span></span>
          <span>Kaybedenin kaybı: <span style={{ color: "var(--color-parchment-dim)" }}>{battle.loser_casualties}</span></span>
        </div>
        {battle.npc_events?.length > 0 && (
          <div className="font-serif" style={{
            fontSize: "0.64rem", fontStyle: "italic",
            color: "var(--color-gold-dim)", marginTop: "0.25rem",
          }}>
            {battle.npc_events.slice(0, 2).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Savaş Detay Kartı (Savaşlar tabı) ───────────────────────────────────────
function WarDetailCard({ war, playerFactionId, turn, onOpenDecision }) {
  const [expanded, setExpanded] = useState(false);
  const isOurWar = war.faction_a === playerFactionId || war.faction_b === playerFactionId;

  return (
    <div className="card-frame" style={{
      padding: "0.9rem",
      border: isOurWar ? "1px solid rgba(200,64,64,0.55)" : undefined,
      boxShadow: isOurWar ? "0 0 18px rgba(200,64,64,0.1), 0 4px 16px rgba(0,0,0,0.45)" : undefined,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
          <span className={isOurWar ? "ember-flicker" : ""} style={{
            fontSize: "1rem", flexShrink: 0,
            opacity: isOurWar ? 1 : 0.6,
          }}>
            ⚔️
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="font-display" style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-parchment)" }}>
              {war.attacker_name || war.faction_a}
              <span style={{ color: "#C84040", margin: "0 0.4rem" }}>⚔</span>
              {war.defender_name || war.faction_b}
            </div>
            <div className="font-serif" style={{
              fontSize: "0.7rem", fontStyle: "italic",
              color: "var(--color-parchment-muted)", textTransform: "capitalize",
            }}>
              {war.cause?.replace(/_/g, " ")} · {war.battles_fought ?? 0} çatışma
            </div>
          </div>
        </div>
        {isOurWar && <Pill tone="blood" pulse="danger">Senin Savaşın</Pill>}
      </div>

      {/* Genişlet butonu */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="font-display"
        style={{
          display: "flex", alignItems: "center", gap: "0.3rem",
          fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase",
          color: "var(--color-parchment-muted)", background: "none",
          border: "none", padding: 0, cursor: "pointer", marginTop: "0.6rem",
        }}
      >
        📜 Geçmiş Çatışmalar {expanded ? "▾" : "▸"}
      </button>

      {expanded && war._battles?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginTop: "0.5rem" }}>
          {war._battles.map((b, i) => (
            <BattleLogEntry key={i} battle={b} ourFactionId={playerFactionId} turn={turn} />
          ))}
        </div>
      )}
      {expanded && (!war._battles || war._battles.length === 0) && (
        <div className="font-serif" style={{
          fontSize: "0.7rem", fontStyle: "italic", textAlign: "center",
          color: "var(--color-parchment-muted)", padding: "0.5rem 0",
        }}>
          Henüz kayıtlı çatışma yok.
        </div>
      )}

      {isOurWar && (
        <button
          onClick={() => { playSfx("sword"); onOpenDecision(); }}
          className="btn-ember"
          style={{
            width: "100%", padding: "0.55rem", fontSize: "0.64rem", marginTop: "0.6rem",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          }}
        >
          ⚔️ Savaşa Katıl
        </button>
      )}
    </div>
  );
}

// ─── Rank İlerleme — rütbe merdiveni ─────────────────────────────────────────
function RankProgress({ faction, player }) {
  const rankTable = faction.rank_table || [];
  const playerRank = player?.faction_rank ?? 0;
  const contribution = player?.faction_contribution ?? 0;
  if (!rankTable.length) return null;
  const currentRankName = rankTable[playerRank] || rankTable[0];
  const nextRankName    = rankTable[playerRank + 1];
  const isMaxRank       = playerRank >= rankTable.length - 1;
  const goal = player?.faction_contribution_goal || 20;
  return (
    <div className="card-frame" style={{ padding: "0.85rem" }}>
      <div className="label-tiny" style={{ color: "#E05A30", marginBottom: "0.5rem" }}>Senin Durumun</div>

      {/* Rütbe merdiveni */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginBottom: "0.6rem" }}>
        {rankTable.map((rank, i) => {
          const climbed = i < playerRank;
          const current = i === playerRank;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.25rem 0.5rem", borderRadius: "4px",
              border: current ? "1px solid rgba(201,168,76,0.55)" : "1px solid transparent",
              background: current ? "rgba(201,168,76,0.08)" : "transparent",
              boxShadow: current ? "0 0 10px rgba(201,168,76,0.12)" : "none",
            }}>
              <span style={{ fontSize: "0.62rem", width: "1rem", textAlign: "center", flexShrink: 0, opacity: climbed || current ? 1 : 0.35 }}>
                {current ? "👑" : climbed ? "✦" : "·"}
              </span>
              <span className="font-display" style={{
                fontSize: current ? "0.74rem" : "0.64rem",
                fontWeight: current ? 700 : 600,
                letterSpacing: "0.08em",
                color: current ? "var(--color-gold)" : climbed ? "var(--color-parchment-dim)" : "var(--color-parchment-muted)",
                textShadow: current ? "0 0 10px rgba(201,168,76,0.3)" : "none",
                opacity: climbed || current ? 1 : 0.55,
              }}>
                {rank}
              </span>
              {current && isMaxRank && <Pill tone="gold">Zirve</Pill>}
            </div>
          );
        })}
      </div>

      {!isMaxRank && (
        <Bar value={contribution} max={goal} color="bg-amber-600" label="Katkı" labelRight={`${contribution} / ${goal}`} />
      )}
      {!isMaxRank && nextRankName && (
        <div className="font-serif" style={{
          fontSize: "0.7rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", marginTop: "0.35rem",
        }}>
          Sıradaki rütbe: <span style={{ color: "var(--color-gold)" }}>{nextRankName}</span>
        </div>
      )}
      {player?.faction_joined_turn != null && (
        <div className="font-serif" style={{
          fontSize: "0.7rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", marginTop: "0.35rem",
        }}>
          Üyelik süresi: <span style={{ color: "var(--color-parchment-dim)" }}>{Math.max(0, (player.turn || 0) - player.faction_joined_turn)} ay</span>
        </div>
      )}
    </div>
  );
}

// ─── Şehir Nüfuz Haritası ─────────────────────────────────────────────────────
function InfluenceMap({ cityInfluence, locations }) {
  const entries = Object.entries(cityInfluence || {}).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
  if (!entries.length) return (
    <div className="font-serif" style={{
      fontSize: "0.72rem", fontStyle: "italic", textAlign: "center",
      color: "var(--color-parchment-muted)", padding: "0.5rem 0",
    }}>
      Henüz hiçbir şehirde nüfuz yok.
    </div>
  );
  const locName = (id) => locations.find((l) => l.id === id)?.name || id.slice(0, 12);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {entries.map(([locId, val]) => (
        <div key={locId}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.2rem" }}>
            <span className="font-serif" style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              fontSize: "0.78rem", color: "var(--color-parchment-dim)",
            }}>
              <InfluenceDot value={val} />{locName(locId)}
            </span>
            <span className="font-display" style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--color-parchment-dim)" }}>
              {val}/100
            </span>
          </div>
          <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${val}%`, borderRadius: "2px", transition: "width 0.3s",
              background: val >= 100 ? "#F0C040" : val >= 75 ? "#C9A84C" : val >= 50 ? "#7FA7C9" : val >= 25 ? "#4A9A5A" : "#7A6A4F",
              boxShadow: val >= 75 ? "0 0 6px rgba(201,168,76,0.4)" : "none",
            }} />
          </div>
          {val >= 25 && (
            <div className="font-serif" style={{
              fontSize: "0.62rem", fontStyle: "italic",
              color: "var(--color-parchment-muted)", marginTop: "0.1rem",
            }}>
              {val >= 100 ? "Kontrol" : val >= 75 ? "Aday gösterebilir" : val >= 50 ? "Baskı yapabilir" : "Faaliyet gösterebilir"}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Darbe Planı Badge (GDD v4 Bölüm 5) ──────────────────────────────────────
const FAZ_LABELS = ["Propaganda", "Askeri", "Hazine", "Eylem"];

function DarbePlaniBadge({ darbePlani, factions }) {
  if (!darbePlani) return null;
  const faz = darbePlani.faz ?? 1;
  const hedef = factions?.find(f => f.id === darbePlani.hedef_id);
  return (
    <div style={{
      borderRadius: "6px", border: "1px solid rgba(200,64,64,0.5)",
      background: "rgba(200,64,64,0.07)", padding: "0.55rem 0.65rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span style={{ fontSize: "0.75rem" }}>🎯</span>
        <span className="label-tiny" style={{ color: "#C84040" }}>Darbe Planı Aktif</span>
      </div>
      <div className="font-serif" style={{ fontSize: "0.72rem", color: "var(--color-parchment-muted)", marginTop: "0.2rem" }}>
        Hedef: <span style={{ color: "var(--color-parchment)" }}>{hedef?.name ?? "?"}</span>
      </div>
      <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.35rem" }}>
        {FAZ_LABELS.map((label, i) => {
          const done = i + 1 < faz;
          const active = i + 1 === faz;
          return (
            <div
              key={i}
              className="font-display"
              style={{
                flex: 1, borderRadius: "3px", padding: "0.18rem 0",
                textAlign: "center", fontSize: "0.52rem", fontWeight: 700,
                letterSpacing: "0.04em",
                background: done ? "rgba(200,64,64,0.4)" : active ? "rgba(200,64,64,0.6)" : "rgba(255,255,255,0.04)",
                color: done ? "#E8A0A0" : active ? "#FFD9D9" : "var(--color-parchment-muted)",
                boxShadow: active ? "0 0 8px rgba(200,64,64,0.45)" : "none",
                border: active ? "1px solid rgba(200,64,64,0.7)" : "1px solid transparent",
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
      {darbePlani.ifsa_riski > 0 && (
        <div className="font-display" style={{
          display: "flex", alignItems: "center", gap: "0.3rem",
          fontSize: "0.6rem", fontWeight: 700, color: "#E05A30", marginTop: "0.35rem",
        }}>
          ⚠ İfşa riski: {Math.round(darbePlani.ifsa_riski * 100)}%
        </div>
      )}
    </div>
  );
}

// ─── Faction Kartı ────────────────────────────────────────────────────────────
function FactionCard({
  faction, playerFactionId, playerAge, canJoin, joinBlocked, joinWeeksLeft,
  onJoin, onLeave, onRebel, onInfluence, onDonate,
  onDarbaBaslat, onDarbaIptal, onMisyonerGonder,
  busy, locations, player,
  warDetail, onOpenDecision, allFactions,
}) {
  const cfg = ftCfg(faction.type);
  const isPlayerFaction = faction.id === playerFactionId;
  const isBusy = busy === faction.id;
  const [expanded, setExpanded] = useState(false);
  const [donateAmount, setDonateAmount] = useState(10);
  const [donateMsg, setDonateMsg] = useState(null);
  const [showDarbaPanel, setShowDarbaPanel] = useState(false);
  const [darbaHedefId, setDarbaHedefId] = useState("");
  const [showMisyonerPanel, setShowMisyonerPanel] = useState(false);
  const [misyonerLocId, setMisyonerLocId] = useState("");
  const atWar = faction.at_war_with?.length > 0;

  return (
    <div className="card-frame" style={{
      padding: "0.9rem", display: "flex", flexDirection: "column", gap: "0.7rem",
      border: `1px solid ${cfg.color}40`,
      boxShadow: isPlayerFaction
        ? "0 0 0 1px rgba(201,168,76,0.45), 0 0 18px rgba(201,168,76,0.12), 0 4px 16px rgba(0,0,0,0.45)"
        : undefined,
    }}>

      {/* Başlık */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
          <span style={{ fontSize: "1.15rem", flexShrink: 0, filter: `drop-shadow(0 0 8px ${cfg.color}55)` }}>
            {cfg.icon}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="label-tiny">{cfg.label}</div>
            <h3 className="font-display" style={{
              fontSize: "0.85rem", fontWeight: 700, lineHeight: 1.2,
              color: cfg.color, margin: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              textShadow: `0 0 12px ${cfg.color}33`,
            }}>
              {faction.name}
            </h3>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {isPlayerFaction && <Pill tone="gold">Ocağın</Pill>}
          {atWar && <Pill tone="blood" pulse="danger">Savaşta</Pill>}
        </div>
      </div>

      {/* Lider + Trend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <span className="font-serif" style={{ fontSize: "0.76rem", color: "var(--color-parchment-muted)" }}>
          Lider: <span style={{ color: "var(--color-parchment-dim)" }}>{faction.leader || "—"}</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          {faction.influence_trend === "yukari" && (
            <span className="font-display" style={{ fontSize: "0.62rem", fontWeight: 700, color: "#4A9A5A" }}>
              ▲{faction.influence_delta_4w > 0 ? ` +${faction.influence_delta_4w}` : ""}
            </span>
          )}
          {faction.influence_trend === "asagi" && (
            <span className="font-display" style={{ fontSize: "0.62rem", fontWeight: 700, color: "#C84040" }}>
              ▼ {faction.influence_delta_4w}
            </span>
          )}
          {faction.influence_trend === "sabit" && (
            <span className="font-display" style={{ fontSize: "0.62rem", color: "var(--color-parchment-muted)" }}>—</span>
          )}
          <span className="font-display" title="Üye sayısı" style={{
            fontSize: "0.62rem", fontWeight: 700, color: "var(--color-parchment-dim)",
          }}>
            👥 {faction.uye_sayisi ?? faction.member_count ?? faction.members?.length ?? 0}
          </span>
        </div>
      </div>

      {/* İstatistikler */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 0.9rem" }}>
        <Bar label="İstikrar"   value={faction.stability}     color={faction.stability >= 70 ? "bg-emerald-700" : faction.stability >= 40 ? "bg-amber-700" : "bg-red-700"} />
        <Bar label="Ekonomi"    value={faction.economy_level} color="bg-amber-700" />
        <Bar label="İtibar"     value={faction.reputation}    color="bg-sky-700" />
        <Bar label="Asker Güç" value={faction.military_power ?? 50} color={faction.military_power >= 70 ? "bg-red-600" : "bg-orange-800"} />
      </div>

      {/* Savaştaysa güç karşılaştırması */}
      {isPlayerFaction && atWar && warDetail && (
        <div style={{ paddingTop: "0.4rem", borderTop: "1px solid rgba(200,64,64,0.25)" }}>
          <div className="label-tiny" style={{ color: "#C84040", marginBottom: "0.35rem" }}>Savaş Gücü Karşılaştırması</div>
          <StrengthComparison
            ourPower={warDetail.our_faction.military_power}
            enemyPower={warDetail.enemy_faction.military_power}
            ourName={warDetail.our_faction.name}
            enemyName={warDetail.enemy_faction.name}
          />
        </div>
      )}

      {/* Hedef */}
      {faction.primary_goal && (
        <div className="font-serif" style={{
          fontSize: "0.72rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)",
          borderLeft: `2px solid ${cfg.color}55`, paddingLeft: "0.55rem",
        }}>
          {faction.primary_goal}
        </div>
      )}

      {/* Darbe Planı (GDD v4 Bölüm 5) */}
      {faction.darbe_plani && (
        <DarbePlaniBadge darbePlani={faction.darbe_plani} factions={allFactions} />
      )}

      {/* İnanç Etkisi (GDD v4 Bölüm 4 — sadece dini tarikat) */}
      {faction.type === "dini_tarikat" && faction.inanc_etkisi !== undefined && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.4rem 0.6rem", borderRadius: "5px",
          border: faction.inanc_etkisi >= 30
            ? "1px solid rgba(123,79,175,0.5)"
            : faction.inanc_etkisi >= 0
            ? "1px solid var(--color-border)"
            : "1px solid rgba(200,64,64,0.5)",
          background: faction.inanc_etkisi >= 30
            ? "rgba(123,79,175,0.08)"
            : faction.inanc_etkisi >= 0
            ? "rgba(255,255,255,0.02)"
            : "rgba(200,64,64,0.07)",
        }}>
          <span className="font-serif" style={{
            fontSize: "0.74rem", color: "var(--color-parchment-muted)",
            display: "flex", alignItems: "center", gap: "0.35rem",
          }}>
            🕌 İnanç Etkisi
          </span>
          <span className="font-display" style={{
            fontSize: "0.72rem", fontWeight: 700,
            color: faction.inanc_etkisi >= 30 ? "#B08FD9"
              : faction.inanc_etkisi >= 0 ? "var(--color-parchment-dim)"
              : "#C84040",
          }}>
            {faction.inanc_etkisi > 0 ? `+${faction.inanc_etkisi}` : faction.inanc_etkisi}
            {faction.inanc_etkisi >= 20 && (
              <span style={{ fontSize: "0.56rem", marginLeft: "0.3rem", color: "#7B4FAF" }}>→ gelir bonusu</span>
            )}
          </span>
        </div>
      )}

      {/* Nüfuz Haritası */}
      <button onClick={() => setExpanded(!expanded)} className="font-display"
        style={{
          display: "flex", alignItems: "center", gap: "0.3rem",
          fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase",
          color: "var(--color-parchment-muted)", background: "none",
          border: "none", padding: 0, cursor: "pointer",
        }}>
        🗺 Şehir Nüfuzları {expanded ? "▾" : "▸"}
      </button>
      {expanded && <InfluenceMap cityInfluence={faction.city_influence} locations={locations} />}

      {isPlayerFaction && <RankProgress faction={faction} player={player} />}

      {/* Bağış Paneli */}
      {isPlayerFaction && (
        <div className="card-frame" style={{ padding: "0.85rem" }}>
          <div className="label-tiny" style={{ color: "#E05A30", marginBottom: "0.25rem" }}>Hazineye Bağış</div>
          <div className="font-serif" style={{
            fontSize: "0.72rem", fontStyle: "italic",
            color: "var(--color-parchment-muted)", marginBottom: "0.5rem",
          }}>
            Her 10 akçe ⚜ = 1 katkı puanı
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="number" min={10} step={10} value={donateAmount}
              onChange={e => setDonateAmount(Math.max(10, parseInt(e.target.value) || 10))}
              style={{ width: "6rem", padding: "0.35rem 0.5rem", fontSize: "0.85rem" }}
            />
            <button
              onClick={async () => {
                playSfx("coin");
                setDonateMsg(null);
                const res = await onDonate(donateAmount);
                if (res?.success) setDonateMsg({ ok: true, text: `+${res.contribution_gained} katkı kazandın!` });
                else setDonateMsg({ ok: false, text: res?.reason || "Bağış başarısız." });
              }}
              disabled={isBusy}
              className="btn-ember"
              style={{
                padding: "0.4rem 1rem", fontSize: "0.6rem",
                display: "flex", alignItems: "center", gap: "0.35rem",
              }}
            >
              {isBusy ? <Loader2 className="animate-spin" style={{ width: "0.85rem", height: "0.85rem" }} /> : null}Bağış Yap
            </button>
          </div>
          {donateMsg && (
            <div className="font-serif" style={{
              fontSize: "0.74rem", fontStyle: "italic", marginTop: "0.4rem",
              color: donateMsg.ok ? "#4A9A5A" : "#C84040",
            }}>
              {donateMsg.text}
            </div>
          )}
        </div>
      )}

      {/* ── Darbe Başlatma Paneli (oyuncu factionı, darbe yoksa) ── */}
      {isPlayerFaction && !faction.darbe_plani && playerAge >= 18 && (
        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.65rem" }}>
          {!showDarbaPanel ? (
            <button
              onClick={() => setShowDarbaPanel(true)}
              className="font-display"
              style={{
                display: "flex", alignItems: "center", gap: "0.35rem",
                fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "var(--color-parchment-muted)",
                background: "none", border: "none", padding: 0, cursor: "pointer",
              }}
            >
              🎯 Darbe Planı Başlat
            </button>
          ) : (
            <div style={{
              borderRadius: "6px", border: "1px solid rgba(200,64,64,0.45)",
              background: "rgba(200,64,64,0.06)", padding: "0.65rem",
              display: "flex", flexDirection: "column", gap: "0.5rem",
            }}>
              <div className="label-tiny" style={{ color: "#C84040", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                🎯 Darbe Hedefi Seç
              </div>
              <select
                value={darbaHedefId}
                onChange={e => setDarbaHedefId(e.target.value)}
                style={{ width: "100%", padding: "0.4rem 0.5rem", fontSize: "0.78rem" }}
              >
                <option value="">— Hedef ocak seç —</option>
                {(allFactions || [])
                  .filter(f => f.id !== faction.id && f.active)
                  .map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
              </select>
              <p className="font-serif" style={{
                fontSize: "0.68rem", fontStyle: "italic",
                color: "var(--color-parchment-muted)", margin: 0,
              }}>
                Maliyet: 200 akçe ⚜ · 4 fazlı süreç · Her an ifşa riski var.
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={async () => {
                    if (!darbaHedefId) return;
                    await onDarbaBaslat(darbaHedefId);
                    setShowDarbaPanel(false);
                    setDarbaHedefId("");
                  }}
                  disabled={!darbaHedefId || isBusy}
                  className="btn-ember"
                  style={{ padding: "0.35rem 0.8rem", fontSize: "0.6rem" }}
                >
                  {isBusy ? <Loader2 className="animate-spin" style={{ width: "0.75rem", height: "0.75rem", display: "inline", marginRight: "0.25rem" }} /> : null}
                  Planı Başlat
                </button>
                <button
                  onClick={() => { setShowDarbaPanel(false); setDarbaHedefId(""); }}
                  className="btn-ghost-ash"
                  style={{ padding: "0.35rem 0.8rem", fontSize: "0.6rem" }}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Aktif Darbe — iptal butonu ── */}
      {isPlayerFaction && faction.darbe_plani?.oyuncu_baslatti && (
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "0.2rem" }}>
          <button
            onClick={onDarbaIptal}
            disabled={isBusy}
            className="font-display"
            style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#C84040",
              background: "none", border: "none", padding: 0,
              cursor: "pointer", opacity: isBusy ? 0.5 : 1,
            }}
          >
            ✕ Planı İptal Et
          </button>
        </div>
      )}

      {/* ── Misyoner Gönderme Paneli (Dini Tarikat üyesi) ── */}
      {isPlayerFaction && faction.type === "dini_tarikat" && (
        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.65rem" }}>
          {!showMisyonerPanel ? (
            <button
              onClick={() => setShowMisyonerPanel(true)}
              className="font-display"
              style={{
                display: "flex", alignItems: "center", gap: "0.35rem",
                fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "var(--color-parchment-muted)",
                background: "none", border: "none", padding: 0, cursor: "pointer",
              }}
            >
              🕌 Misyoner Gönder
            </button>
          ) : (
            <div style={{
              borderRadius: "6px", border: "1px solid rgba(123,79,175,0.45)",
              background: "rgba(123,79,175,0.06)", padding: "0.65rem",
              display: "flex", flexDirection: "column", gap: "0.5rem",
            }}>
              <div className="label-tiny" style={{ color: "#B08FD9", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                🕌 Misyoner Hedef Bölge
              </div>
              <select
                value={misyonerLocId}
                onChange={e => setMisyonerLocId(e.target.value)}
                style={{ width: "100%", padding: "0.4rem 0.5rem", fontSize: "0.78rem" }}
              >
                <option value="">— Bölge seç —</option>
                {(locations || []).map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <p className="font-serif" style={{
                fontSize: "0.68rem", fontStyle: "italic",
                color: "var(--color-parchment-muted)", margin: 0,
              }}>
                Maliyet: 40 akçe ⚜ · %70 başarı şansı · İnanç etkisi +8
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={async () => {
                    if (!misyonerLocId) return;
                    await onMisyonerGonder(misyonerLocId);
                    setShowMisyonerPanel(false);
                    setMisyonerLocId("");
                  }}
                  disabled={!misyonerLocId || isBusy}
                  className="font-display"
                  style={{
                    padding: "0.35rem 0.8rem", fontSize: "0.6rem", fontWeight: 700,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    borderRadius: "5px", cursor: "pointer",
                    border: "1px solid rgba(123,79,175,0.6)",
                    background: "rgba(123,79,175,0.1)", color: "#B08FD9",
                    opacity: (!misyonerLocId || isBusy) ? 0.5 : 1,
                  }}
                >
                  {isBusy ? <Loader2 className="animate-spin" style={{ width: "0.75rem", height: "0.75rem", display: "inline", marginRight: "0.25rem" }} /> : null}
                  Gönder
                </button>
                <button
                  onClick={() => { setShowMisyonerPanel(false); setMisyonerLocId(""); }}
                  className="btn-ghost-ash"
                  style={{ padding: "0.35rem 0.8rem", fontSize: "0.6rem" }}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aksiyon butonları */}
      <div style={{ display: "flex", gap: "0.5rem", paddingTop: "0.1rem" }}>
        {isPlayerFaction ? (
          <>
            {atWar && (
              <button
                onClick={() => { playSfx("sword"); onOpenDecision(); }}
                className="btn-ember"
                style={{
                  flex: 1, padding: "0.45rem", fontSize: "0.6rem",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
                }}
              >
                ⚔️ Savaşa Katıl
              </button>
            )}
            <button
              onClick={() => onInfluence(faction.id)}
              disabled={isBusy}
              className="btn-ghost-ash"
              style={{
                flex: 1, padding: "0.45rem", fontSize: "0.6rem",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
              }}
            >
              {isBusy ? <Loader2 className="animate-spin" style={{ width: "0.85rem", height: "0.85rem" }} /> : "👁"}
              Nüfuz
            </button>
            <button
              onClick={onLeave} disabled={isBusy}
              className="btn-ghost-ash"
              style={{
                flex: 1, padding: "0.45rem", fontSize: "0.6rem",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
              }}
            >
              🚪 Ayrıl
            </button>
            {playerAge >= 18 && (
              <button
                onClick={() => onRebel(faction.id)} disabled={isBusy}
                title="İsyan başlat"
                className="font-display"
                style={{
                  padding: "0.45rem 0.7rem", fontSize: "0.72rem", borderRadius: "5px",
                  border: "1px solid rgba(200,64,64,0.5)", background: "rgba(200,64,64,0.06)",
                  color: "#C84040", cursor: "pointer", opacity: isBusy ? 0.5 : 1,
                }}
              >
                ⚔
              </button>
            )}
          </>
        ) : !playerFactionId ? (
          canJoin ? (
            <button onClick={() => { playSfx("click"); onJoin(faction.id); }} disabled={isBusy}
              className="btn-ember"
              style={{
                flex: 1, padding: "0.45rem", fontSize: "0.6rem",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
              }}>
              {isBusy ? <Loader2 className="animate-spin" style={{ width: "0.85rem", height: "0.85rem" }} /> : "🤝"}Katıl
            </button>
          ) : joinBlocked ? (
            <div className="font-serif" style={{
              flex: 1, padding: "0.4rem 0", fontSize: "0.74rem", fontStyle: "italic",
              color: "#E05A30", textAlign: "center",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
            }}>
              ⚠ {joinWeeksLeft === -1 ? "Kalıcı yasak" : `${joinWeeksLeft} ay yasak`}
            </div>
          ) : (
            <div className="font-serif" style={{
              flex: 1, padding: "0.3rem 0", fontSize: "0.74rem", fontStyle: "italic",
              color: "var(--color-gold-dim)", textAlign: "center",
            }}>
              Katılmak için biraz daha büyümen gerekiyor
            </div>
          )
        ) : (
          <div className="font-serif" style={{
            flex: 1, padding: "0.3rem 0", fontSize: "0.74rem", fontStyle: "italic",
            color: "var(--color-parchment-muted)", textAlign: "center",
          }}>
            Başka ocağa bağlısın
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dormant Faction ──────────────────────────────────────────────────────────
function DormantFactionCard({ faction }) {
  const cfg = ftCfg(faction.type);
  return (
    <div style={{
      padding: "0.8rem 0.9rem", borderRadius: "8px",
      border: "1px dashed rgba(122,106,79,0.35)",
      background: "rgba(10,7,4,0.35)", opacity: 0.6,
      display: "flex", flexDirection: "column", gap: "0.4rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1rem", filter: "grayscale(0.8)", opacity: 0.6 }}>{cfg.icon}</span>
        <div>
          <div className="label-tiny">{cfg.label}</div>
          <h3 className="font-display" style={{
            fontSize: "0.78rem", fontWeight: 700,
            color: "var(--color-parchment-muted)", margin: 0,
          }}>
            Henüz bilinmiyor
          </h3>
        </div>
      </div>
      <p className="font-serif" style={{
        fontSize: "0.7rem", fontStyle: "italic",
        color: "var(--color-parchment-muted)", margin: 0,
      }}>
        Bu tür ocak henüz bölgede tütmüyor.
      </p>
    </div>
  );
}

// ─── Gizli Cemiyet Kartı ──────────────────────────────────────────────────────
function SecretSocietyCard({ faction, clueCount = 0, threshold = 5, onInvestigate, onReveal, busy }) {
  const pct = Math.min(100, (clueCount / threshold) * 100);
  const canReveal = clueCount >= threshold;
  const isBusy = busy === faction.id + "_inv";
  return (
    <div className="card-frame" style={{
      padding: "0.9rem", display: "flex", flexDirection: "column", gap: "0.65rem",
      border: "1px solid rgba(79,168,160,0.45)",
      boxShadow: "0 0 16px rgba(79,168,160,0.08), 0 4px 16px rgba(0,0,0,0.45)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.1rem", filter: "drop-shadow(0 0 8px rgba(79,168,160,0.45))" }}>🗝️</span>
          <div>
            <div className="label-tiny" style={{ color: "#4FA8A0" }}>Gizli Cemiyet</div>
            <h3 className="font-display" style={{
              fontSize: "0.82rem", fontWeight: 700, color: "#7FCFC7", margin: 0,
            }}>
              Kimliği Bilinmiyor
            </h3>
          </div>
        </div>
        <Pill tone="ink">Gizli</Pill>
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
          <span className="label-tiny">İpucu İlerlemesi</span>
          <span className="font-display" style={{ fontSize: "0.64rem", fontWeight: 700, color: "var(--color-parchment-dim)" }}>
            {clueCount} / {threshold}
          </span>
        </div>
        <div style={{ height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`, borderRadius: "3px",
            transition: "width 0.5s ease",
            background: canReveal
              ? "linear-gradient(to right, #C9A84C, #F0C040)"
              : "linear-gradient(to right, #2E6661, #4FA8A0)",
            boxShadow: canReveal ? "0 0 8px rgba(240,192,64,0.5)" : "0 0 6px rgba(79,168,160,0.4)",
          }} />
        </div>
        <p className="font-serif" style={{
          fontSize: "0.7rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", margin: "0.3rem 0 0",
        }}>
          {canReveal ? "Yeterli kanıt topladın. Artık bu cemiyeti ifşa edebilirsin." : "Gizli bu cemiyet hakkında daha fazla ipucu toplamalısın."}
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={() => onInvestigate(faction.id)} disabled={isBusy || busy === "reveal_" + faction.id}
          className="btn-ghost-ash"
          style={{
            flex: 1, padding: "0.45rem", fontSize: "0.6rem",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
          }}>
          {isBusy ? <Loader2 className="animate-spin" style={{ width: "0.85rem", height: "0.85rem" }} /> : "🔍"}Araştır
        </button>
        {canReveal && (
          <button onClick={() => onReveal(faction.id)} disabled={busy === "reveal_" + faction.id}
            className="btn-ember"
            style={{
              flex: 1, padding: "0.45rem", fontSize: "0.6rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
            }}>
            {busy === "reveal_" + faction.id ? <Loader2 className="animate-spin" style={{ width: "0.85rem", height: "0.85rem" }} /> : "🔓"}İfşa Et
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Nüfuz Operasyonu Modali ──────────────────────────────────────────────────
function InfluenceModal({ faction, locations, onClose, onConfirm, busy }) {
  const [locId, setLocId] = useState(locations[0]?.id || "");
  const influence = faction.city_influence || {};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="card-frame" style={{ padding: "1.3rem", maxWidth: "24rem", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.7rem" }}>
          <h2 className="font-display" style={{
            fontSize: "0.95rem", fontWeight: 700, letterSpacing: "0.08em",
            color: "#E05A30", textShadow: "0 0 12px rgba(224,90,48,0.3)", margin: 0,
          }}>
            👁 Nüfuz Operasyonu
          </h2>
          <button onClick={onClose} className="font-display"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-parchment-muted)", fontSize: "0.85rem" }}>
            ✕
          </button>
        </div>
        <p className="font-serif" style={{
          fontSize: "0.78rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", margin: "0 0 0.8rem",
        }}>
          Ocağın adına seçili şehirde gizli operasyon başlat. Başarı durumunda nüfuz artar.
        </p>
        <div>
          <div className="label-tiny" style={{ marginBottom: "0.3rem" }}>Hedef Şehir</div>
          <select value={locId} onChange={(e) => setLocId(e.target.value)}
            style={{ width: "100%", padding: "0.5rem 0.6rem", fontSize: "0.85rem" }}>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name} — Mevcut nüfuz: {influence[l.id] ?? 0}/100</option>
            ))}
          </select>
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem",
          margin: "0.7rem 0",
        }}>
          {[["25", "Faaliyet"], ["50", "Baskı"], ["75", "Aday"], ["100", "Kontrol"]].map(([t, label]) => (
            <div key={t} className="font-serif" style={{
              fontSize: "0.66rem", fontStyle: "italic",
              color: "var(--color-parchment-muted)",
              display: "flex", alignItems: "center", gap: "0.25rem",
            }}>
              <span className="font-display" style={{ color: "var(--color-parchment-dim)", fontWeight: 700, fontStyle: "normal" }}>{t}</span> → {label}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={onClose} className="btn-ghost-ash" style={{ flex: 1, padding: "0.55rem", fontSize: "0.62rem" }}>İptal</button>
          <button onClick={() => onConfirm(locId)} disabled={busy || !locId}
            className="btn-ember"
            style={{
              flex: 1, padding: "0.55rem", fontSize: "0.62rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
            }}>
            {busy ? <Loader2 className="animate-spin" style={{ width: "0.85rem", height: "0.85rem" }} /> : "👁"}Başlat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Faction Kurma Modali ─────────────────────────────────────────────────────
function CreateFactionModal({ locations, onClose, onCreate, busy }) {
  const [name, setName]   = useState("");
  const [type, setType]   = useState("tuccar_loncasi");
  const [locId, setLocId] = useState(locations[0]?.id || "");
  const AVAILABLE_TYPES = Object.entries(FACTION_TYPES).filter(([k]) => k !== "krallık_ordusu" && k !== "gizli_cemiyet");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="card-frame" style={{ padding: "1.3rem", maxWidth: "24rem", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.8rem" }}>
          <h2 className="font-display" style={{
            fontSize: "1.05rem", fontWeight: 700, letterSpacing: "0.08em",
            color: "var(--color-gold)", textShadow: "0 0 14px rgba(201,168,76,0.3)", margin: 0,
          }}>
            🏰 Ocak Kur
          </h2>
          <button onClick={onClose} className="font-display"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-parchment-muted)", fontSize: "0.85rem" }}>
            ✕
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <div className="label-tiny" style={{ marginBottom: "0.25rem" }}>Ocağın Adı</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ocağının adı..."
              style={{ width: "100%", padding: "0.5rem 0.6rem", fontSize: "0.85rem" }} />
          </div>
          <div>
            <div className="label-tiny" style={{ marginBottom: "0.35rem" }}>Tür</div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem",
              maxHeight: "12rem", overflowY: "auto", paddingRight: "0.25rem",
            }}>
              {AVAILABLE_TYPES.map(([k, cfg]) => (
                <button key={k} onClick={() => setType(k)}
                  className="font-display"
                  style={{
                    padding: "0.4rem 0.5rem", fontSize: "0.56rem", fontWeight: 700,
                    letterSpacing: "0.06em", borderRadius: "5px", textAlign: "left",
                    cursor: "pointer", transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: "0.35rem",
                    border: type === k ? `1px solid ${cfg.color}AA` : "1px solid var(--color-border-hi)",
                    background: type === k ? `${cfg.color}14` : "transparent",
                    color: type === k ? cfg.color : "var(--color-parchment-muted)",
                    boxShadow: type === k ? `0 0 10px ${cfg.color}22` : "none",
                  }}>
                  <span style={{ flexShrink: 0 }}>{cfg.icon}</span>{cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label-tiny" style={{ marginBottom: "0.25rem" }}>Merkez Konum</div>
            <select value={locId} onChange={(e) => setLocId(e.target.value)}
              style={{ width: "100%", padding: "0.5rem 0.6rem", fontSize: "0.85rem" }}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.kind})</option>)}
            </select>
          </div>
        </div>
        <GoldRule />
        <p className="font-serif" style={{
          fontSize: "0.76rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", margin: "0 0 0.7rem",
        }}>
          Ocak kurmak 200 akçe ⚜ gerektirir. Lider olarak başlarsın.
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={onClose} className="btn-ghost-ash" style={{ flex: 1, padding: "0.55rem", fontSize: "0.62rem" }}>İptal</button>
          <button onClick={() => { playSfx("success"); onCreate({ name, type, locId }); }} disabled={busy || !name.trim() || !locId}
            className="btn-ember"
            style={{
              flex: 1, padding: "0.55rem", fontSize: "0.62rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
            }}>
            {busy ? <Loader2 className="animate-spin" style={{ width: "0.85rem", height: "0.85rem" }} /> : "🏰"}Kur
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Üyelik Banner ────────────────────────────────────────────────────────────
const MS_CFG = {
  left:   { label: "Ayrıldı",  tone: "gold"  },
  kicked: { label: "Kovuldu",  tone: "ember" },
  rebel:  { label: "İsyancı",  tone: "blood" },
  banned: { label: "Yasaklı",  tone: "blood" },
};
function MembershipBanner({ status, weeksLeft, permanent }) {
  if (!status || status === "active") return null;
  const cfg = MS_CFG[status] || MS_CFG["left"];
  const msg = permanent ? "Kalıcı olarak yasaklandın." : weeksLeft > 0 ? `${weeksLeft} ay sonra yeniden katılabilirsin.` : "";
  return (
    <div className="card-frame" style={{
      padding: "0.75rem 0.85rem", display: "flex", alignItems: "flex-start", gap: "0.6rem",
    }}>
      <span style={{ fontSize: "0.95rem", flexShrink: 0 }}>⚠️</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: "0.25rem" }}>
          <Pill tone={cfg.tone}>{cfg.label}</Pill>
        </div>
        <p className="font-serif" style={{
          fontSize: "0.78rem", fontStyle: "italic",
          color: "var(--color-parchment-dim)", margin: 0,
        }}>
          {msg}
        </p>
      </div>
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: "factions", label: "Ocaklar" },
  { key: "wars",     label: "Savaşlar" },
];
function TabBar({ active, onChange, warCount }) {
  return (
    <div style={{ display: "flex", gap: "0.4rem" }}>
      {TABS.map((t) => (
        <button key={t.key} onClick={() => { playSfx("page"); onChange(t.key); }}
          className="font-display"
          style={{
            padding: "0.45rem 0.9rem", fontSize: "0.62rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            borderRadius: "5px", cursor: "pointer", transition: "all 0.15s",
            border: active === t.key ? "1px solid rgba(201,168,76,0.6)" : "1px solid var(--color-border)",
            background: active === t.key ? "rgba(201,168,76,0.1)" : "transparent",
            color: active === t.key ? "var(--color-gold)" : "var(--color-parchment-muted)",
            boxShadow: active === t.key ? "0 0 12px rgba(201,168,76,0.15)" : "none",
            display: "inline-flex", alignItems: "center", gap: "0.35rem",
          }}>
          {t.label}
          {t.key === "wars" && warCount > 0 && (
            <span className="font-display" style={{
              fontSize: "0.54rem", fontWeight: 700, padding: "0.05rem 0.3rem",
              borderRadius: "3px", background: "rgba(200,64,64,0.3)",
              border: "1px solid rgba(200,64,64,0.5)", color: "#E8A0A0",
            }}>
              {warCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}


// ─── Faction Tipi Grupları (kategori başlıkları) ──────────────────────────────
const FACTION_TYPE_GROUPS = [
  { key: "lonca",   label: "Esnaf Loncaları",    icon: "⚖️", types: ["tuccar_loncasi", "zanaatkar_loncasi", "sifaci_birligi"] },
  { key: "askeri",  label: "Silahlı Örgütler",   icon: "⚔️", types: ["krallık_ordusu", "paralı_asker"] },
  { key: "dini",    label: "Dini Tarikatlar",     icon: "🕌", types: ["dini_tarikat"] },
  { key: "yeralti", label: "Yeraltı Örgütleri",  icon: "🗝️", types: ["gizli_cemiyet", "eskiya_cetesi"] },
  { key: "ilim",    label: "İlim ve Kültür",      icon: "📜", types: ["ilim_cemiyeti", "oyuncu_kumpanya"] },
];

function FactionGroupSection({
  group, factions, clues, playerFactionId, playerAge,
  canJoin, joinBlocked, joinWeeksLeft,
  onJoin, onLeave, onRebel, onInfluence, onDonate,
  onDarbaBaslat, onDarbaIptal, onMisyonerGonder,
  busy, locations, player, warDetail, onOpenDecision, allFactions,
}) {
  const [open, setOpen] = useState(false);
  const groupFactions = factions.filter(f => group.types.includes(f.type));
  const activeCount = groupFactions.filter(f => f.active).length;
  const playerInGroup = groupFactions.some(f => f.id === playerFactionId);

  if (groupFactions.length === 0) return null;

  return (
    <div className="card-frame" style={{ overflow: "hidden" }}>
      {/* Grup başlığı — tıklanabilir */}
      <button
        onClick={() => { playSfx("click"); setOpen(o => !o); }}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "0.5rem",
          padding: "0.7rem 0.9rem", textAlign: "left", cursor: "pointer",
          background: open
            ? "linear-gradient(to right, rgba(201,168,76,0.08), transparent 70%)"
            : "transparent",
          border: "none",
          borderBottom: open ? "1px solid var(--color-border)" : "none",
          transition: "background 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
          <span style={{ fontSize: "0.9rem", filter: "drop-shadow(0 0 6px rgba(201,168,76,0.25))" }}>{group.icon}</span>
          <span className="font-display" style={{
            fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em",
            color: open ? "var(--color-gold)" : "var(--color-parchment)",
          }}>
            {group.label}
          </span>
          {playerInGroup && <Pill tone="gold">Ocağın</Pill>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <span className="font-display" style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--color-parchment-muted)" }}>
            {activeCount} / {groupFactions.length}
          </span>
          <span className="font-display" style={{ fontSize: "0.7rem", color: "var(--color-parchment-muted)" }}>
            {open ? "▾" : "▸"}
          </span>
        </div>
      </button>

      {/* Grup içeriği */}
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0.7rem" }}>
          {groupFactions.map(f => {
            if (!f.active) return (
              <div key={f.id}>
                <DormantFactionCard faction={f} />
              </div>
            );
            if (f.is_secret) {
              const clueEntry = clues.find(c => c.faction_id === f.id) || {};
              return (
                <div key={f.id}>
                  <SecretSocietyCard faction={f}
                    clueCount={clueEntry.clue_count || 0}
                    threshold={clueEntry.threshold || 5}
                    onInvestigate={() => {}} onReveal={() => {}} busy={busy} />
                </div>
              );
            }
            return (
              <div key={f.id}>
                <FactionCard faction={f}
                  playerFactionId={playerFactionId} playerAge={playerAge}
                  canJoin={canJoin} joinBlocked={joinBlocked} joinWeeksLeft={joinWeeksLeft}
                  onJoin={onJoin} onLeave={onLeave} onRebel={onRebel}
                  onInfluence={onInfluence} onDonate={onDonate}
                  onDarbaBaslat={onDarbaBaslat} onDarbaIptal={onDarbaIptal}
                  onMisyonerGonder={onMisyonerGonder}
                  busy={busy} locations={locations} player={player}
                  warDetail={f.id === playerFactionId ? warDetail : null}
                  onOpenDecision={onOpenDecision}
                  allFactions={allFactions}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
export default function Factions() {
  const { state, setState } = useGame();
  const withRedirect = useActionRedirect("Faction");
  const [factions, setFactions] = useState([]);
  const [wars,     setWars]     = useState([]);
  const [clues,    setClues]    = useState([]);
  const [warDetail, setWarDetail] = useState(null);   // Adım 6: Savaş detayları
  const [loading,  setLoading]  = useState(true);
  const [busy,     setBusy]     = useState(null);
  const [tab,      setTab]      = useState("factions");
  const [showCreate,    setShowCreate]    = useState(false);
  const [influenceFac,  setInfluenceFac]  = useState(null);
  const [showDecision,  setShowDecision]  = useState(false);  // Adım 6
  const [warOutcome,    setWarOutcome]    = useState(null);   // Adım 6
  const [feed,          setFeed]          = useState(null);   // R8
  const [confirm,       setConfirm]       = useState(null);

  const player          = state?.player || {};
  const playerFactionId = player.faction_id || null;
  const playerAge       = player.age || 0;
  const membershipStatus = player.faction_membership_status || null;
  const joinWeeksLeft   = player.faction_join_banned_until
    ? Math.max(0, player.faction_join_banned_until - (state?.turn || 0))
    : 0;
  const permanentBan    = joinWeeksLeft === -1;
  const canJoin         = playerAge >= 13 && !joinWeeksLeft && !permanentBan;
  const joinBlocked     = playerAge >= 13 && (joinWeeksLeft > 0 || permanentBan);
  const locations       = state?.world?.locations || [];
  const currentTurn     = state?.turn || 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, wRes, cRes, wdRes, feedRes] = await Promise.all([
        api.get("/game/factions"),
        api.get("/game/factions/wars"),
        api.get("/game/factions/gizli-cemiyet/clues").catch(() => ({ data: { clues: [] } })),
        api.get("/game/factions/wars/detail").catch(() => ({ data: { war: null } })),
        api.get("/game/factions/feed").catch(() => ({ data: null })),
      ]);
      setFactions(fRes.data.factions || []);
      setWars(wRes.data.wars || []);
      setClues(cRes.data.clues || []);
      setWarDetail(wdRes.data.war || null);
      setFeed(feedRes.data);
    } catch {
      toast.error("Örgüt bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // R8: aylık fraksiyon sahnesi seçimi
  const handleSceneChoice = async (choiceId) => {
    setBusy("scene");
    try {
      const { data } = await api.post("/game/factions/scene", { choice: choiceId });
      if (data.state) setState(data.state);
      if (data.result?.note) toast.success(data.result.note, { duration: 6000 });
      setFeed(f => (f ? { ...f, scene: { ...f.scene, resolved: true } } : f));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Seçim çözülemedi.");
    } finally {
      setBusy(null);
    }
  };

  const refreshState = async () => {
    try {
      const { data } = await api.get("/game/state");
      setState(data);
    } catch {}
  };

  // ─── Savaş Katılım / Kaçınma ─────────────────────────────────────────────
  const handleWarDecision = async (strategy) => {
    setBusy("war");
    try {
      if (strategy === "kaçın") {
        const { data } = await api.post("/game/factions/wars/avoid");
        if (data.success) {
          toast("Savaş çağrısından kaçındın. İtibar −5, Onur −3.");
          await refreshState();
          setState(data.state);
        }
        setShowDecision(false);
        return;
      }
      // Katıl
      const { data } = await api.post("/game/factions/wars/participate", { strategy });
      if (data.success) {
        setShowDecision(false);
        setWarOutcome(data);
        await load();
        if (data.state) setState(data.state);
      } else {
        toast.error(data.message || "Katılım başarısız.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata oluştu.");
    } finally {
      setBusy(null);
    }
  };

  // ─── Diğer handler'lar ────────────────────────────────────────────────────
  const handleJoin = async (factionId) => {
    setBusy(factionId);
    try {
      await withRedirect(async () => {
        const { data } = await api.post("/game/factions/join", { faction_id: factionId });
        if (data.success) {
          toast.success(`${data.faction?.name || "Örgüt"}'e katıldın.`);
          await load(); await refreshState();
          return data;
        } else {
          toast.error(data.reason || data.message || "Katılamadın.");
          return null; // hata durumunda yönlendirme yapma
        }
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally { setBusy(null); }
  };

  const handleLeave = async () => {
    setBusy("leave");
    try {
      const { data } = await api.post("/game/factions/leave");
      if (data.success) {
        const weeks = data.cooldown_weeks;
        toast(data.permanent ? "Ayrıldın — kalıcı yasak." : `Ayrıldın. ${weeks} ay yasak.`);
        await load(); await refreshState();
      } else {
        toast.error(data.reason || data.message || "Ayrılamadın.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally { setBusy(null); }
  };

  const handleRebel = (factionId) => setConfirm({
    title: "İsyan Başlat",
    message: "İsyan başlatmak seni herkesin gözünde İsyancı damgalar — geri dönüşü zordur. Emin misin?",
    confirmLabel: "İsyan Et",
    onConfirm: () => doRebel(factionId),
  });
  const doRebel = async (factionId) => {
    setBusy(factionId);
    try {
      const { data } = await api.post("/game/factions/rebel");
      if (data.success) {
        toast.success("İsyan başladı.");
        await load(); await refreshState();
      } else {
        toast.error(data.reason || data.message || "İsyan başlatılamadı.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally { setBusy(null); }
  };

  const handleInfluenceOpen  = (factionId) => { const fac = factions.find((f) => f.id === factionId); if (fac) setInfluenceFac(fac); };
  const handleInfluenceConfirm = async (locationId) => {
    if (!influenceFac) return;
    setBusy("influence");
    try {
      const { data } = await api.post("/game/factions/influence", { faction_id: influenceFac.id, location_id: locationId });
      if (data.success) {
        const locName = locations.find((l) => l.id === locationId)?.name || locationId;
        toast.success(`${locName}'de nüfuz kazanıldı! (+${data.gain ?? "?"}, toplam: ${data.new_influence ?? "?"})`);
        await load();
      } else {
        toast("Operasyon başarısız oldu.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally { setBusy(null); setInfluenceFac(null); }
  };

  const handleCreate = async ({ name, type, locId }) => {
    setBusy("create");
    try {
      const { data } = await api.post("/game/factions/create", { name, faction_type: type, home_location_id: locId });
      if (data.success) {
        toast.success(`${name} kuruldu!`);
        setShowCreate(false);
        await load(); await refreshState();
      } else {
        toast.error(data.message || "Kurulamadı.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally { setBusy(null); }
  };

  const handleInvestigate = async (factionId) => {
    setBusy(factionId + "_inv");
    try {
      const { data } = await api.post("/game/factions/gizli-cemiyet/investigate", {});
      if (data.success) {
        toast.success(`İpucu bulundu: "${data.clue_text}"`);
        await load();
      } else {
        toast.error(data.reason || "İpucu bulunamadı.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally { setBusy(null); }
  };

  const handleReveal = async (factionId) => {
    setBusy("reveal_" + factionId);
    try {
      const { data } = await api.post(`/game/factions/gizli-cemiyet/reveal/${factionId}`);
      if (data.success) {
        toast.success(data.message || "Gizli cemiyet ifşa edildi!");
        await load(); await refreshState();
      } else {
        toast.error(data.reason || "İfşa başarısız.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally { setBusy(null); }
  };

  const handleDonate = async (amount) => {
    setBusy(playerFactionId);
    try {
      const { data } = await api.post("/game/factions/donate", { amount });
      if (data.success) { await load(); await refreshState(); }
      return data;
    } catch (e) {
      return { success: false, reason: e.response?.data?.detail || "Hata" };
    } finally { setBusy(null); }
  };

  const handleDarbaBaslat = async (hedefFactionId) => {
    setBusy(playerFactionId);
    try {
      const { data } = await api.post("/game/factions/darbe/baslat", { hedef_faction_id: hedefFactionId });
      if (data.success) { await load(); toast.success(data.message); }
      else toast.error(data.message || "Darbe planı başlatılamadı.");
      return data;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Darbe başlatma hatası.");
      return { success: false };
    } finally { setBusy(null); }
  };

  const handleDarbaIptal = async () => {
    setBusy(playerFactionId);
    try {
      const { data } = await api.post("/game/factions/darbe/iptal");
      if (data.success) { await load(); toast.success("Darbe planı iptal edildi."); }
    } catch (e) {
      toast.error(e.response?.data?.detail || "İptal hatası.");
    } finally { setBusy(null); }
  };

  const handleMisyonerGonder = async (locationId) => {
    setBusy(playerFactionId);
    try {
      const { data } = await api.post("/game/factions/misyoner-gonder", { location_id: locationId });
      if (data.success) { await load(); toast.success(data.message); }
      else toast.error(data.message || "Misyoner gönderilemedi.");
      return data;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Misyoner hatası.");
      return { success: false };
    } finally { setBusy(null); }
  };

  // Savaşlar tabı için savaş kartına geçmiş çatışmaları ekle
  const warsWithLog = wars.map(w => ({
    ...w,
    _battles: warDetail?.id === w.id ? warDetail.battles : [],
  }));

  if (loading) {
    return (
      <div className="font-serif" style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "5rem 0", fontStyle: "italic", color: "var(--color-parchment-muted)",
      }}>
        <Loader2 className="animate-spin" style={{ width: "1.25rem", height: "1.25rem", marginRight: "0.5rem", color: "var(--color-gold-dim)" }} />
        Ocaklar yoklanıyor…
      </div>
    );
  }

  return (
    <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }}>
      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
      {/* Başlık */}
      <PageHeader
        kicker="Örgütler & Güç Dengesi"
        icon="🏰"
        title="Ocaklar"
        sub="Bir ocağa bağlıysan, bu diyarda yalnız değilsin."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Savaş Uyarı Bannerı (Adım 6) */}
        {playerFactionId && warDetail && (
          <WarAlertBanner
            warDetail={warDetail}
            onOpenDecision={() => setShowDecision(true)}
            loading={busy === "war"}
          />
        )}

        {/* Yaş uyarısı */}
        {playerAge < 13 && (
          <div className="card-frame" style={{
            padding: "0.85rem", border: "1px solid rgba(224,90,48,0.4)",
          }}>
            <p className="font-serif" style={{
              fontSize: "0.82rem", fontStyle: "italic", color: "#E0A080", margin: 0,
            }}>
              Bir ocağa katılmak için biraz daha büyümen gerekiyor. (Gerekli yaş: 13)
            </p>
          </div>
        )}

        {/* Üyelik yasak banner */}
        {!playerFactionId && membershipStatus && membershipStatus !== "active" && (
          <MembershipBanner status={membershipStatus} weeksLeft={joinWeeksLeft} permanent={permanentBan} />
        )}

        {/* Mevcut üyelik özeti */}
        {playerFactionId && (() => {
          const myFac = factions.find((f) => f.id === playerFactionId);
          if (!myFac) return null;
          const cfg = ftCfg(myFac.type);
          return (
            <div className="card-frame" style={{
              padding: "0.75rem 0.85rem", display: "flex", alignItems: "center", gap: "0.65rem",
              border: `1px solid ${cfg.color}55`,
              boxShadow: `0 0 16px ${cfg.color}14, 0 4px 16px rgba(0,0,0,0.45)`,
            }}>
              <span style={{ fontSize: "1.2rem", flexShrink: 0, filter: `drop-shadow(0 0 8px ${cfg.color}55)` }}>{cfg.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="label-tiny" style={{ marginBottom: "0.1rem" }}>Bağlı Olduğun Ocak</div>
                <div className="font-display" style={{
                  fontSize: "0.82rem", fontWeight: 700, color: "var(--color-parchment)",
                }}>
                  {myFac.name}
                </div>
                <div className="font-serif" style={{
                  fontSize: "0.7rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
                }}>
                  {cfg.label}
                </div>
              </div>
              {warDetail && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <Pill tone="blood" pulse="danger">Savaşta</Pill>
                  <div className="font-display" style={{
                    fontSize: "0.62rem", fontWeight: 700,
                    color: "var(--color-parchment-dim)", marginTop: "0.25rem",
                  }}>
                    {warDetail.duration_weeks} ay
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* R8: Fraksiyon yüzeyi — sahne + imtiyazlar + ocaktan haberler */}
        {playerFactionId && (
          <FactionFeedSection
            feed={feed}
            onSceneChoice={handleSceneChoice}
            busy={busy === "scene"}
          />
        )}

        {/* İstatistik özet — tek şerit */}
        <div className="card-frame" style={{
          padding: "0.6rem 0.85rem", display: "flex",
          alignItems: "center", justifyContent: "space-around", gap: "0.5rem",
        }}>
          <div style={{ textAlign: "center" }}>
            <div className="label-tiny" style={{ marginBottom: "0.1rem" }}>Aktif Ocak</div>
            <div className="font-display" style={{
              fontSize: "1.15rem", fontWeight: 700, color: "var(--color-gold)",
              textShadow: "0 0 10px rgba(201,168,76,0.3)",
            }}>
              {factions.filter(f => f.active).length}
            </div>
          </div>
          <div style={{ width: "1px", height: "2rem", background: "linear-gradient(to bottom, transparent, rgba(201,168,76,0.3), transparent)" }} />
          <div style={{ textAlign: "center" }}>
            <div className="label-tiny" style={{ marginBottom: "0.1rem" }}>Savaşta</div>
            <div className="font-display" style={{
              fontSize: "1.15rem", fontWeight: 700, color: "#C84040",
              textShadow: "0 0 10px rgba(200,64,64,0.3)",
            }}>
              {wars.length}
            </div>
          </div>
          <div style={{ width: "1px", height: "2rem", background: "linear-gradient(to bottom, transparent, rgba(201,168,76,0.3), transparent)" }} />
          <div style={{ textAlign: "center" }}>
            <div className="label-tiny" style={{ marginBottom: "0.1rem" }}>Uyuyan</div>
            <div className="font-display" style={{
              fontSize: "1.15rem", fontWeight: 700, color: "var(--color-parchment-muted)",
            }}>
              {factions.filter(f => !f.active).length}
            </div>
          </div>
        </div>

        {/* Tab */}
        <TabBar active={tab} onChange={setTab} warCount={wars.length} />

        {/* ── ÖRGÜTLER TAB ── */}
        {tab === "factions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {factions.length === 0 ? (
              <div className="card-frame">
                <EmptyState icon="🏰"
                  title="Henüz hiçbir ocak tütmüyor."
                  sub="Diyar büyüdükçe örgütler kurulacak — bekle ve gör." />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {FACTION_TYPE_GROUPS.map(group => (
                  <FactionGroupSection
                    key={group.key}
                    group={group}
                    factions={factions}
                    clues={clues}
                    playerFactionId={playerFactionId}
                    playerAge={playerAge}
                    canJoin={canJoin}
                    joinBlocked={joinBlocked}
                    joinWeeksLeft={joinWeeksLeft}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                    onRebel={handleRebel}
                    onInfluence={handleInfluenceOpen}
                    onDonate={handleDonate}
                    onDarbaBaslat={handleDarbaBaslat}
                    onDarbaIptal={handleDarbaIptal}
                    onMisyonerGonder={handleMisyonerGonder}
                    busy={busy}
                    locations={locations}
                    player={player}
                    warDetail={warDetail}
                    onOpenDecision={() => setShowDecision(true)}
                    allFactions={factions}
                  />
                ))}
              </div>
            )}

            {!playerFactionId && playerAge >= 16 ? (
              <button onClick={() => { playSfx("click"); setShowCreate(true); }}
                className="btn-ghost-ash"
                style={{
                  width: "100%", padding: "0.65rem", fontSize: "0.66rem",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
                }}>
                🏰 Kendi Ocağını Kur
              </button>
            ) : !playerFactionId && playerAge < 16 ? (
              <p className="font-serif" style={{
                textAlign: "center", fontSize: "0.74rem", fontStyle: "italic",
                color: "var(--color-parchment-muted)", margin: 0,
              }}>
                Ocak kurmak için 16 yaşında olmalısın.
              </p>
            ) : null}
          </div>
        )}

        {/* ── SAVAŞLAR TAB ── */}
        {tab === "wars" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            {wars.length === 0 ? (
              <div className="card-frame">
                <EmptyState icon="🕊"
                  title="Şu an diyarda savaş yok."
                  sub="Kılıçlar kınında — ama barış hep böyle sürmez." />
              </div>
            ) : (
              <>
                {/* Adım 6: Zenginleştirilmiş savaş kartları */}
                {warsWithLog.map((w, i) => (
                  <WarDetailCard
                    key={w.id || i}
                    war={w}
                    playerFactionId={playerFactionId}
                    turn={currentTurn}
                    onOpenDecision={() => setShowDecision(true)}
                  />
                ))}
                {/* Toplam güç tablosu */}
                <Panel title="Güç Dengesi — Tüm Savaşlar" icon="⚖️" tone="ash">
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {wars.map((w, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
                        <Bar label={w.attacker_name || w.faction_a} value={w.attacker_strength || 50} color="bg-orange-700" />
                        <Bar label={w.defender_name || w.faction_b} value={w.defender_strength || 50} color="bg-red-700" />
                      </div>
                    ))}
                  </div>
                </Panel>
              </>
            )}
          </div>
        )}

      </div>

      {/* ── MODALLAR ── */}
      {showCreate && (
        <CreateFactionModal locations={locations} onClose={() => setShowCreate(false)}
          onCreate={handleCreate} busy={busy === "create"} />
      )}
      {influenceFac && (
        <InfluenceModal faction={influenceFac} locations={locations}
          onClose={() => setInfluenceFac(null)} onConfirm={handleInfluenceConfirm}
          busy={busy === "influence"} />
      )}

      {/* Adım 6: Savaş Karar Modali */}
      {showDecision && warDetail && (
        <WarDecisionModal
          warDetail={warDetail}
          onClose={() => setShowDecision(false)}
          onDecide={handleWarDecision}
          busy={busy === "war"}
        />
      )}

      {/* Adım 6: Savaş Sonuç Modali */}
      {warOutcome && (
        <WarOutcomeModal
          result={warOutcome}
          onClose={() => setWarOutcome(null)}
        />
      )}
    </div>
  );
}
