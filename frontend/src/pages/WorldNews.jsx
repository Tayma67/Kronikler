/**
 * Diyardan Haberler — KÜL & KÖZ görsel katman.
 * Duygu görevi: tellal/divan duyurusu estetiği — önemli haberler ferman gibi,
 * tarih damgaları Cinzel. İşlevsellik (API/filtre akışı) birebir korunur.
 */
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useGame } from "@/lib/GameContext";
import { playSfx } from "@/lib/audio";
import { PageHeader, Panel, Pill, EmptyState, TONES } from "@/components/ui/Kit";

// ─── Tarih damgası: 1 tur = 1 ay; yıl 1247'den yürür ─────────────────────────
const tarihDamga = (t) => {
  const n = Number(t) || 0;
  return `${(n % 12) + 1}. Ay ${1247 + Math.floor(n / 12)}`;
};

// ─── Olay Kategorisi Ayarları ────────────────────────────────────────────────

const CAT_CONFIG = {
  doğa:    { label: "Doğa",    tone: "sage",  icon: "🌿" },
  sosyal:  { label: "Sosyal",  tone: "ember", icon: "🪕" },
  ekonomi: { label: "Ekonomi", tone: "gold",  icon: "⚖" },
  tehlike: { label: "Tehlike", tone: "blood", icon: "⚠" },
  haber:   { label: "Haber",   tone: "ink",   icon: "📯" },
  kriz:    { label: "Kriz",    tone: "blood", icon: "🔥" },
};

const TYPE_ICON = {
  kuraklık:           "☀",
  bereketli_hasat:    "🌾",
  büyük_yangın:       "🔥",
  salgın_hastalık:    "💀",
  haydut_saldırıları: "⚔",
  asker_toplama:      "🛡",
  ticaret_patlaması:  "⚖",
  yeni_maden:         "💎",
  festival:           "🍗",
  dini_kutlama:       "⭐",
  soylu_düğünü:       "💍",
  göç_dalgası:        "👣",
  ünlü_ölümü:         "🕯",
  tahta_çıkış:        "👑",
  savaş_ilanı:        "⚔",
  savaş_hareketi:     "🐎",
  barış:              "🕊",
  göç:                "👣",
  meslek_edinme:      "⭐",
  // GDD v4 Kriz Olayları
  kriz_kuraklik:      "☀",
  kriz_veba:          "💀",
  kriz_yangin:        "🔥",
  uye_kazanildi:      "👥",
  darbe_hazırlık:     "🗡",
  faction_aktif:      "⭐",
};

// ─── Bileşenler ──────────────────────────────────────────────────────────────

function EventBadge({ category, active }) {
  const cfg = CAT_CONFIG[category] || CAT_CONFIG.haber;
  return (
    <Pill tone={cfg.tone} pulse={active && cfg.tone === "blood" ? "danger" : undefined}>
      {active ? "● Aktif" : cfg.label}
    </Pill>
  );
}

function EventCard({ event, compact = false }) {
  const cfg = CAT_CONFIG[event.category] || CAT_CONFIG.haber;
  const t = TONES[cfg.tone] || TONES.gold;
  const icon = TYPE_ICON[event.type] || "📜";
  const isActive = event.active;

  return (
    <div className="card-frame" style={{
      padding: "0.85rem",
      borderLeft: isActive ? `3px solid ${t.border}` : "3px solid var(--color-border)",
      background: isActive
        ? `linear-gradient(to right, ${t.bg}, transparent 55%)`
        : undefined,
      opacity: isActive ? 1 : 0.82,
    }}>
      {/* Başlık satırı */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
        <div style={{
          flexShrink: 0, width: "2.2rem", height: "2.2rem", borderRadius: "6px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1rem",
          border: isActive ? `1px solid ${t.border}` : "1px solid var(--color-border)",
          background: isActive ? t.bg : "rgba(10,7,4,0.5)",
          filter: isActive ? "drop-shadow(0 0 6px rgba(201,168,76,0.2))" : "grayscale(0.4)",
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <EventBadge category={event.category} active={isActive} />
            <span className="label-tiny">{event.location_name}</span>
          </div>
          <div className="font-display" style={{
            fontSize: "0.82rem", fontWeight: 700, lineHeight: 1.3,
            color: isActive ? "var(--color-parchment)" : "var(--color-parchment-dim)",
            textShadow: isActive ? "0 0 10px rgba(201,168,76,0.12)" : "none",
          }}>
            {event.headline}
          </div>
        </div>
        <div className="font-display" style={{
          flexShrink: 0, fontSize: "0.52rem", letterSpacing: "0.1em",
          textTransform: "uppercase", color: "var(--color-gold-dim)",
        }}>
          ⌛ {tarihDamga(event.started_day)}
        </div>
      </div>

      {/* Detay (compact değilse) */}
      {!compact && (
        <>
          <p className="font-serif" style={{
            fontSize: "0.84rem", fontStyle: "italic", lineHeight: 1.55,
            color: "var(--color-parchment-dim)", marginTop: "0.6rem",
          }}>
            {event.detail}
          </p>

          {/* Etkiler listesi */}
          {event.effects && event.effects.length > 0 && (
            <div style={{ marginTop: "0.55rem", display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {event.effects.map((eff, i) => (
                <Pill key={i} tone={cfg.tone}>{eff}</Pill>
              ))}
            </div>
          )}

          {/* Bitiş bilgisi */}
          {isActive && (
            <div className="font-display" style={{
              marginTop: "0.55rem", fontSize: "0.52rem", letterSpacing: "0.12em",
              textTransform: "uppercase", color: "var(--color-parchment-muted)",
            }}>
              ⌛ Sona erer: {tarihDamga(event.ends_day)}
            </div>
          )}
          {!isActive && (
            <div className="font-display" style={{
              marginTop: "0.55rem", fontSize: "0.52rem", letterSpacing: "0.12em",
              textTransform: "uppercase", color: "var(--color-parchment-muted)", opacity: 0.7,
            }}>
              🔏 Hükmü sona erdi
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ActiveEventsBanner({ events }) {
  if (!events || events.length === 0) return null;
  return (
    <Panel title="Tellal Bağırıyor" icon="📯" tone="ember"
      right={<Pill tone="ember">{events.length} olay</Pill>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {events.map((ev) => {
          const cfg = CAT_CONFIG[ev.category] || CAT_CONFIG.haber;
          const icon = TYPE_ICON[ev.type] || "📜";
          const t = TONES[cfg.tone] || TONES.gold;
          return (
            <div key={ev.id} className="row-frame" style={{
              borderLeft: `2px solid ${t.border}`,
              background: `linear-gradient(to right, ${t.bg}, transparent 70%)`,
            }}>
              <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>{icon}</span>
              <span className="font-serif" style={{
                flex: 1, fontSize: "0.84rem", fontStyle: "italic",
                color: "var(--color-parchment)", lineHeight: 1.4,
              }}>
                {ev.headline}
              </span>
              <span className="label-tiny" style={{ flexShrink: 0 }}>{ev.location_name}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ─── Ana Sayfa ───────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { key: "all",     label: "Tümü" },
  { key: "active",  label: "Aktif" },
  { key: "kriz",    label: "🔥 Kriz" },
  { key: "doğa",    label: "Doğa" },
  { key: "sosyal",  label: "Sosyal" },
  { key: "ekonomi", label: "Ekonomi" },
  { key: "tehlike", label: "Tehlike" },
  { key: "haber",   label: "Haber" },
];

// Kriz event tipini category'ye map et
function resolveCategory(event) {
  const KRIZ_TYPES = new Set(["kriz_kuraklik", "kriz_veba", "kriz_yangin"]);
  if (KRIZ_TYPES.has(event.type)) return "kriz";
  return event.category || "haber";
}

// Kriz için okunabilir başlık
const KRIZ_BASLIK = {
  kriz_kuraklik: "☀️ Kuraklık Felaketi",
  kriz_veba:     "💀 Veba Salgını",
  kriz_yangin:   "🔥 Büyük Yangın",
};

// ─── Kriz Banner (GDD v4 Bölüm 5.4) ─────────────────────────────────────────
function CrisisBanner({ crisisEvents }) {
  if (!crisisEvents || crisisEvents.length === 0) return null;
  const KRIZ_STYLE = {
    kriz_kuraklik: { tone: "ember", icon: "☀" },
    kriz_veba:     { tone: "ink",   icon: "💀" },
    kriz_yangin:   { tone: "blood", icon: "🔥" },
  };
  return (
    <Panel title="Aktif Kriz Olayları" icon="⚠" tone="blood"
      right={<Pill tone="blood" pulse="danger">{crisisEvents.length}</Pill>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {crisisEvents.map((ev) => {
          const style = KRIZ_STYLE[ev.type] || KRIZ_STYLE.kriz_yangin;
          const t = TONES[style.tone] || TONES.blood;
          const baslik = KRIZ_BASLIK[ev.type] || "Kriz";
          return (
            <div key={ev.id} className="row-frame" style={{
              alignItems: "flex-start",
              borderLeft: `2px solid ${t.border}`,
              background: `linear-gradient(to right, ${t.bg}, transparent 65%)`,
            }}>
              <span style={{ fontSize: "0.95rem", flexShrink: 0, marginTop: "0.05rem" }}>{style.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-display" style={{
                  fontSize: "0.74rem", fontWeight: 700, color: t.text,
                  letterSpacing: "0.05em",
                }}>
                  {baslik}
                </div>
                <div className="font-serif" style={{
                  fontSize: "0.8rem", fontStyle: "italic", lineHeight: 1.45,
                  color: "var(--color-parchment-dim)", marginTop: "0.15rem",
                }}>
                  {ev.text}
                </div>
              </div>
              <span className="font-display" style={{
                flexShrink: 0, fontSize: "0.52rem", letterSpacing: "0.1em",
                textTransform: "uppercase", color: "var(--color-gold-dim)",
              }}>
                ⌛ {tarihDamga(ev.day)}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export default function WorldNews() {
  const { state } = useGame() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    api.get("/game/world-news")
      .then(({ data }) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Haberler yüklenemedi.");
        setLoading(false);
      });
  }, [state?.turn]);

  if (loading) {
    return (
      <div className="page-shell rise-in" style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "200px", gap: "0.6rem",
      }}>
        <span style={{ fontSize: "1.5rem", opacity: 0.5,
                       filter: "drop-shadow(0 0 10px rgba(201,168,76,0.3))" }}>📯</span>
        <span className="font-serif" style={{
          fontSize: "0.85rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
        }}>
          Tellal soluklanıyor, haberler yolda…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell rise-in" style={{ padding: "1rem" }}>
        <div className="row-frame" style={{
          borderLeft: `2px solid ${TONES.blood.border}`,
          background: `linear-gradient(to right, ${TONES.blood.bg}, transparent 70%)`,
        }}>
          <span style={{ fontSize: "0.9rem" }}>⚠</span>
          <span className="font-serif" style={{
            fontSize: "0.85rem", fontStyle: "italic", color: TONES.blood.text,
          }}>
            {error}
          </span>
        </div>
      </div>
    );
  }

  const { active_events = [], all_events = [], pinned_events = [], calendar } = data || {};

  // Filtrele
  const filtered = filter === "all"
    ? all_events
    : filter === "active"
    ? all_events.filter(ev => ev.active)
    : all_events.filter(ev => ev.category === filter);

  return (
    <div className="page-shell rise-in" style={{ display: "flex", flexDirection: "column", gap: "0.9rem", paddingBottom: "1.5rem" }}>
      {/* Başlık */}
      <PageHeader
        kicker="Tellal Nidası"
        icon="📯"
        title="Diyardan Haberler"
        sub="Meydanda bağırılır, divandan mühürle çıkar — diyarın ahvali."
        right={calendar && (
          <div style={{ textAlign: "right" }}>
            <div className="label-tiny" style={{ marginBottom: "0.1rem" }}>{calendar.season}</div>
            <div className="font-display" style={{
              fontSize: "0.78rem", fontWeight: 700, color: "var(--color-gold)",
              letterSpacing: "0.06em", textShadow: "0 0 8px rgba(201,168,76,0.3)",
            }}>
              {calendar.month_name} {calendar.year}
            </div>
          </div>
        )}
      />

      {/* Aktif olaylar banner */}
      <ActiveEventsBanner events={active_events} />

      {/* Kriz Olayları Banner (GDD v4 Bölüm 5.4) */}
      {(() => {
        const KRIZ_TYPES = new Set(["kriz_kuraklik", "kriz_veba", "kriz_yangin"]);
        const crisisEvs = pinned_events.filter(e => KRIZ_TYPES.has(e.type));
        return crisisEvs.length > 0 ? <CrisisBanner crisisEvents={crisisEvs} /> : null;
      })()}

      {/* Kritik olaylar — tahta çıkış, savaş, barış, göç (kriz hariç, ayrı gösterildi) */}
      {(() => {
        const KRIZ_TYPES = new Set(["kriz_kuraklik", "kriz_veba", "kriz_yangin"]);
        const nonCrisisPinned = pinned_events.filter(e => !KRIZ_TYPES.has(e.type));
        if (nonCrisisPinned.length === 0) return null;
        return (
          <Panel title="Kritik Haberler" icon="👑" tone="blood">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {nonCrisisPinned.map((ev) => {
                const icon = TYPE_ICON[ev.type] || "📜";
                const isWar   = ev.type === "savaş_ilanı" || ev.type === "savaş_hareketi";
                const isPeace = ev.type === "barış";
                const isThrone = ev.type === "tahta_çıkış";
                const tone  = isWar ? "blood" : isPeace ? "sage" : isThrone ? "gold" : "ink";
                const t = TONES[tone];
                return (
                  <div key={ev.id} className="row-frame" style={{
                    alignItems: "flex-start",
                    borderLeft: `2px solid ${t.border}`,
                    background: `linear-gradient(to right, ${t.bg}, transparent 65%)`,
                  }}>
                    <span style={{ fontSize: "0.9rem", flexShrink: 0, marginTop: "0.05rem" }}>{icon}</span>
                    <span className="font-serif" style={{
                      flex: 1, fontSize: "0.84rem", fontStyle: "italic",
                      color: "var(--color-parchment)", lineHeight: 1.45,
                    }}>
                      {ev.text}
                    </span>
                    <span className="font-display" style={{
                      flexShrink: 0, fontSize: "0.52rem", letterSpacing: "0.1em",
                      textTransform: "uppercase", color: "var(--color-gold-dim)",
                    }}>
                      ⌛ {tarihDamga(ev.day)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
        );
      })()}

      {/* Boş durum */}
      {active_events.length === 0 && (
        <div className="card-frame">
          <EmptyState icon="🌍"
            title="Şu an diyarda aktif olay yok."
            sub="Her ay yeni olaylar doğar — zamanı ilerlet, tellal yine bağıracak." />
        </div>
      )}

      {/* Filtre butonları */}
      {all_events.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
          {FILTER_OPTIONS.map(opt => {
            const cfg = CAT_CONFIG[opt.key];
            const isActive = filter === opt.key;
            const t = cfg ? TONES[cfg.tone] : TONES.gold;
            return (
              <button
                key={opt.key}
                onClick={() => { playSfx("click"); setFilter(opt.key); }}
                className="font-display"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.3rem",
                  padding: "0.28rem 0.6rem", borderRadius: "4px", cursor: "pointer",
                  fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase", transition: "all 0.15s",
                  border: isActive ? `1px solid ${t.border}` : "1px solid var(--color-border)",
                  background: isActive ? t.bg : "transparent",
                  color: isActive ? t.text : "var(--color-parchment-muted)",
                }}
              >
                {opt.label}
                {opt.key === "active" && active_events.length > 0 && (
                  <span className="font-display" style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    minWidth: "1rem", height: "1rem", borderRadius: "50%",
                    fontSize: "0.55rem", fontWeight: 700,
                    background: "rgba(224,90,48,0.85)", color: "#FFF1DE",
                    boxShadow: "0 0 8px rgba(224,90,48,0.4)",
                  }}>
                    {active_events.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Olay listesi */}
      {all_events.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {filtered.length === 0 && (
            <EmptyState icon="📜"
              title="Bu kategoride olay bulunamadı."
              sub="Tellal başka bahisten söz ediyor — filtreyi değiştir." />
          )}
          {filtered.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}

      {all_events.length === 0 && active_events.length === 0 && (
        <div className="card-frame">
          <EmptyState icon="🌍"
            title="Diyar sessiz — henüz kayıtlı olay yok."
            sub="Zamanı ilerlet; her ay kuraklıklar, festivaller, salgınlar, ticaret patlamaları doğar. Oyuncudan bağımsız, dünya kendi hikâyesini yaşar." />
        </div>
      )}
    </div>
  );
}
