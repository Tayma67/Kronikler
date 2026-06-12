import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { playSfx } from "@/lib/audio";
import { PageHeader, Panel, Pill, GoldRule } from "@/components/ui/Kit";

/* ─────────────────────────────────────────────────────────────────
   WorldMap.jsx — "Küllerin Diyarı": Dünya Genel Bakışı
   KÜL & KÖZ tasarım dili. Duygu görevi: "Diyar büyük" — her yerleşim
   kartı bir yol işareti, her beylik bir mühürlü ferman gibi.
   İşlevsellik (state akışı, navigasyon) birebir korunur.
   ───────────────────────────────────────────────────────────────── */

const GOLD = "#C9A84C";
const GOLD_BRIGHT = "#F0C040";
const BLOOD = "#C84040";
const GOLD_BORDER = "rgba(201,168,76,0.22)";

/* Mühür ikonlar: lokasyon tipine göre */
const KIND_ICON = { "şehir": "🏰", "köy": "⛰️", "kale": "🏯" };
const KIND_LABEL = { "şehir": "ŞEHİR", "köy": "KÖY", "kale": "KALE" };

/* Krallık pinleri: el yerleşimi slotlar — kenarlardan ve sol-alttaki
   "Bulunduğun Yer" kartından uzak dururlar */
const PIN_SLOTS = [
  { left: "50%", top: "18%" },
  { left: "22%", top: "34%" },
  { left: "76%", top: "30%" },
  { left: "64%", top: "58%" },
  { left: "38%", top: "52%" },
  { left: "84%", top: "64%" },
  { left: "16%", top: "60%" },
  { left: "50%", top: "42%" },
];
function pinPosition(index) {
  return PIN_SLOTS[index % PIN_SLOTS.length];
}

function StatChip({ icon, value }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: "0.6rem", color: "var(--color-parchment-muted)",
    }}>
      <span style={{ fontSize: "0.62rem" }}>{icon}</span>
      <span className="font-display" style={{ fontWeight: 700, color: "var(--color-parchment-dim)" }}>{value}</span>
    </span>
  );
}

/* ── Yerleşim mini kartı: yol işareti hissi ─────────────────────── */
function SettlementCard({ loc, isHere, onGo }) {
  return (
    <button onClick={onGo} style={{
      display: "flex", flexDirection: "column", gap: 3,
      background: isHere
        ? "linear-gradient(160deg, rgba(201,168,76,0.16) 0%, rgba(20,14,7,0.7) 70%)"
        : "linear-gradient(180deg, rgba(255,255,255,0.015), transparent)",
      border: `1px solid ${isHere ? GOLD : "var(--color-border)"}`,
      borderLeft: isHere ? `3px solid ${GOLD_BRIGHT}` : `3px solid rgba(201,168,76,0.3)`,
      borderRadius: 6, padding: "8px 9px", minWidth: 0,
      cursor: "pointer", textAlign: "left",
      boxShadow: isHere ? "0 0 12px rgba(201,168,76,0.22)" : "none",
      transition: "border-color 0.15s, background 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 13, filter: "drop-shadow(0 0 5px rgba(201,168,76,0.3))" }}>
          {KIND_ICON[loc.kind] || "📍"}
        </span>
        <span className="font-display" style={{
          fontSize: "0.66rem", fontWeight: 700,
          color: isHere ? GOLD_BRIGHT : "var(--color-parchment)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{loc.name}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <StatChip icon="👥" value={loc.population ?? "?"} />
        <StatChip icon="💰" value={loc.wealth ?? "?"} />
        <StatChip icon="🛡" value={loc.security ?? "?"} />
      </div>
      {isHere ? (
        <span className="font-display" style={{
          fontSize: "0.5rem", color: GOLD_BRIGHT, letterSpacing: "0.14em",
          textShadow: "0 0 6px rgba(240,192,64,0.4)",
        }}>
          ◆ BURADASIN
        </span>
      ) : (
        <span className="font-display" style={{
          fontSize: "0.48rem", color: "var(--color-parchment-muted)",
          letterSpacing: "0.14em", opacity: 0.75,
        }}>
          🐎 YOLA KOYUL ›
        </span>
      )}
    </button>
  );
}

/* ── Krallık akordeon satırı: mühürlü ferman ────────────────────── */
function KingdomRow({ kingdom, locations, leaderName, playerLocId, atWar, onGoLoc }) {
  const [open, setOpen] = useState(
    locations.some((l) => l.id === playerLocId) // kendi beyliğin açık başlar
  );
  const [showAllVillages, setShowAllVillages] = useState(false);

  const cities   = locations.filter((l) => l.kind === "şehir");
  const castles  = locations.filter((l) => l.kind === "kale");
  const villages = locations.filter((l) => l.kind === "köy");
  const totalPop = locations.reduce((a, l) => a + (l.population || 0), 0);
  const avgWealth = locations.length
    ? Math.round(locations.reduce((a, l) => a + (l.wealth || 0), 0) / locations.length) : 0;

  const visibleVillages = showAllVillages ? villages : villages.slice(0, 4);

  return (
    <div className="card-frame" style={{ overflow: "hidden" }}>
      {/* Başlık satırı */}
      <button onClick={() => { playSfx("click"); setOpen(!open); }} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "11px 12px",
        background: open ? "linear-gradient(to right, rgba(201,168,76,0.08), transparent 70%)" : "transparent",
        border: "none", cursor: "pointer", textAlign: "left",
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 7, flexShrink: 0,
          background: "linear-gradient(135deg, #2A1A08, #1A1008)",
          border: `1.5px solid ${GOLD}`,
          boxShadow: "0 0 10px rgba(201,168,76,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>👑</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="font-display" style={{
              fontSize: "0.72rem", fontWeight: 700,
              color: GOLD, letterSpacing: "0.06em",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{kingdom.name?.toUpperCase()}</span>
            {atWar && <Pill tone="blood" pulse="danger">⚔ Savaşta</Pill>}
          </div>
          <div className="font-serif" style={{
            fontSize: "0.6rem", fontStyle: "italic",
            color: "var(--color-parchment-muted)", marginTop: 1,
          }}>
            Hüküm süren: <span style={{ color: "var(--color-parchment-dim)" }}>{leaderName}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 9, flexShrink: 0, alignItems: "center" }}>
          <StatChip icon="👥" value={totalPop.toLocaleString("tr-TR")} />
          <StatChip icon="💰" value={avgWealth} />
          <StatChip icon="🏰" value={locations.length} />
          <span style={{
            color: "var(--color-parchment-muted)", fontSize: 11,
            transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s",
          }}>›</span>
        </div>
      </button>

      {/* Genişleyen içerik */}
      {open && (
        <div style={{ padding: "4px 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          {cities.length > 0 && (
            <div>
              <GoldRule label={`🏰 Şehirler · ${cities.length}`} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {cities.map((l) => (
                  <SettlementCard key={l.id} loc={l} isHere={l.id === playerLocId}
                    onGo={() => onGoLoc(l.id)} />
                ))}
              </div>
            </div>
          )}
          {castles.length > 0 && (
            <div>
              <GoldRule label={`🏯 Kaleler · ${castles.length}`} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {castles.map((l) => (
                  <SettlementCard key={l.id} loc={l} isHere={l.id === playerLocId}
                    onGo={() => onGoLoc(l.id)} />
                ))}
              </div>
            </div>
          )}
          {villages.length > 0 && (
            <div>
              <GoldRule label={`⛰️ Köyler · ${villages.length}`} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {visibleVillages.map((l) => (
                  <SettlementCard key={l.id} loc={l} isHere={l.id === playerLocId}
                    onGo={() => onGoLoc(l.id)} />
                ))}
              </div>
              {villages.length > 4 && (
                <button onClick={() => setShowAllVillages(!showAllVillages)}
                  className="btn-ghost-ash font-display"
                  style={{
                    width: "100%", marginTop: 7, padding: "6px 0",
                    fontSize: "0.53rem", letterSpacing: "0.16em", cursor: "pointer",
                  }}>
                  {showAllVillages ? "▲ DAHA AZ GÖSTER" : `▼ TÜM KÖYLERİ GÖR (${villages.length})`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ ANA SAYFA ═══════════════════ */
export default function WorldMap() {
  const { state } = useGame() || {};
  const navigate = useNavigate();

  const world     = state?.world;
  const kingdoms  = useMemo(() => world?.kingdoms || [], [world]);
  const locations = useMemo(() => world?.locations || [], [world]);
  const npcs      = world?.npcs || [];
  const player    = state?.player || {};

  const currentLoc = locations.find((l) => l.id === player.location_id);

  const leaderOf = (k) => {
    if (k.king_id === "PLAYER") return player.name || "Sen";
    const king = npcs.find((n) => n.id === k.king_id);
    return king ? king.name : "Taht boş";
  };

  /* Krallıklar: oyuncununki en üstte */
  const sortedKingdoms = useMemo(() => {
    const arr = [...kingdoms];
    arr.sort((a, b) =>
      (b.id === currentLoc?.kingdom_id ? 1 : 0) - (a.id === currentLoc?.kingdom_id ? 1 : 0));
    return arr;
  }, [kingdoms, currentLoc]);

  const goLoc = (id) => navigate(`/oyun/sehir/${id}`);

  if (!state) return null;

  const year = 1247 + Math.floor((state.turn || 0) / 12);

  return (
    <div className="page-shell rise-in" style={{ paddingBottom: "6.5rem" }}>
      {/* ── BAŞLIK ── */}
      <PageHeader
        kicker={`Diyarın Ahvali · Yıl ${year}`}
        icon="🗺️"
        title="Küllerin Diyarı"
        sub="Krallıklar yaşıyor, beylikler çekişiyor — yollar uzun, ama harita seni bekliyor."
        right={currentLoc && (
          <button onClick={() => goLoc(currentLoc.id)}
            className="btn-ember font-display"
            style={{
              flexShrink: 0, padding: "7px 12px", cursor: "pointer",
              fontSize: "0.6rem", letterSpacing: "0.12em",
            }}>🐎 ŞEHRE GİT</button>
        )}
      />

      {/* ── HARİTA PANELİ ── */}
      <div className="card-frame" style={{
        position: "relative", height: 248, borderRadius: 12, overflow: "hidden",
        background: `
          url(/images/map/world.jpg) center / cover no-repeat,
          radial-gradient(ellipse 90% 70% at 30% 30%, rgba(122,86,28,0.45) 0%, transparent 62%),
          radial-gradient(ellipse 70% 60% at 75% 65%, rgba(96,70,30,0.5) 0%, transparent 66%),
          linear-gradient(160deg, #1A140C 0%, #110D08 55%, #0C0906 100%)
        `,
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.7), inset 0 0 24px rgba(201,168,76,0.05)",
      }}>
        {/* Doku: ince ızgara */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.05,
          backgroundImage: `linear-gradient(${GOLD} 0.5px, transparent 0.5px), linear-gradient(90deg, ${GOLD} 0.5px, transparent 0.5px)`,
          backgroundSize: "26px 26px",
        }} />

        {/* Kara parçaları: harita görseli yoksa diyar hissi veren organik şekiller */}
        <svg viewBox="0 0 100 60" preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.6 }}>
          <path d="M8,14 Q18,4 34,8 Q50,3 58,12 Q66,8 72,16 Q64,24 52,22 Q40,28 28,24 Q14,26 8,14 Z"
            fill="rgba(122,90,36,0.22)" stroke="rgba(201,168,76,0.28)" strokeWidth="0.4" />
          <path d="M62,24 Q78,18 90,26 Q96,36 88,46 Q76,52 66,46 Q58,38 62,24 Z"
            fill="rgba(110,82,34,0.2)" stroke="rgba(201,168,76,0.25)" strokeWidth="0.4" />
          <path d="M12,36 Q24,30 36,38 Q46,34 52,44 Q44,54 30,52 Q16,52 12,36 Z"
            fill="rgba(100,76,32,0.18)" stroke="rgba(201,168,76,0.22)" strokeWidth="0.4" />
          {/* Nehir */}
          <path d="M36,6 Q40,20 34,32 Q30,44 38,58"
            fill="none" stroke="rgba(90,120,140,0.3)" strokeWidth="0.9" strokeLinecap="round" />
          {/* Kervan yolu: noktalı patika */}
          <path d="M16,52 Q34,44 50,40 Q68,36 84,28"
            fill="none" stroke="rgba(201,168,76,0.35)" strokeWidth="0.5"
            strokeDasharray="1.6 2.2" strokeLinecap="round" />
          {/* Dağ işaretleri */}
          <g stroke="rgba(201,168,76,0.4)" strokeWidth="0.5" fill="none">
            <path d="M22,12 l2,-3 l2,3 M26,13 l1.6,-2.4 l1.6,2.4" />
            <path d="M74,30 l2,-3 l2,3 M78,31 l1.6,-2.4 l1.6,2.4" />
          </g>
        </svg>

        {/* Krallık pinleri */}
        {kingdoms.map((k, i) => {
          const pos = pinPosition(i);
          const isHome = k.id === currentLoc?.kingdom_id;
          const atWar = (k.at_war_with || []).length > 0;
          return (
            <div key={k.id} style={{
              position: "absolute", ...pos, transform: "translate(-50%, -50%)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              zIndex: isHome ? 3 : 2,
            }}>
              <div style={{
                width: isHome ? 14 : 10, height: isHome ? 14 : 10,
                background: isHome ? GOLD_BRIGHT : (atWar ? BLOOD : GOLD),
                transform: "rotate(45deg)",
                border: `1.5px solid rgba(0,0,0,0.6)`,
                boxShadow: `0 0 ${isHome ? 14 : 8}px ${isHome ? GOLD_BRIGHT : GOLD}99`,
              }} />
              <span className="font-display" style={{
                fontSize: "0.47rem", fontWeight: 700,
                letterSpacing: "0.08em", color: isHome ? GOLD_BRIGHT : "var(--color-parchment)",
                whiteSpace: "nowrap", maxWidth: 86,
                overflow: "hidden", textOverflow: "ellipsis",
                background: "rgba(8,6,3,0.78)", border: `1px solid ${GOLD_BORDER}`,
                borderRadius: 4, padding: "1.5px 5px",
              }}>{k.name?.toUpperCase()}</span>
            </div>
          );
        })}

        {/* Sol-alt: bulunduğun yer kartı */}
        {currentLoc && (
          <div style={{
            position: "absolute", left: 10, bottom: 10, width: 158,
            background: "rgba(10,8,4,0.88)", backdropFilter: "blur(6px)",
            border: `1px solid ${GOLD}66`, borderRadius: 9, padding: "9px 10px",
            boxShadow: "0 0 14px rgba(201,168,76,0.12)",
          }}>
            <div className="label-tiny" style={{ letterSpacing: "0.22em", marginBottom: 4 }}>
              ◆ BULUNDUĞUN YER
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                background: "linear-gradient(135deg, #2A1A08, #1A1008)",
                border: `1.5px solid ${GOLD}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              }}>{KIND_ICON[currentLoc.kind] || "📍"}</div>
              <div style={{ minWidth: 0 }}>
                <div className="font-display" style={{ fontSize: "0.68rem", fontWeight: 700, color: GOLD_BRIGHT }}>
                  {currentLoc.name}
                </div>
                <div className="font-serif" style={{ fontSize: "0.55rem", fontStyle: "italic", color: "var(--color-parchment-muted)" }}>
                  {KIND_LABEL[currentLoc.kind] || ""} · {currentLoc.kingdom_name || kingdoms.find(k => k.id === currentLoc.kingdom_id)?.name || ""}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 7 }}>
              <StatChip icon="👥" value={currentLoc.population ?? "?"} />
              <StatChip icon="💰" value={currentLoc.wealth ?? "?"} />
              <StatChip icon="🛡" value={currentLoc.security ?? "?"} />
            </div>
          </div>
        )}

        {/* Sağ kenar: lejant */}
        <div style={{
          position: "absolute", right: 8, top: 10,
          background: "rgba(10,8,4,0.8)", border: `1px solid ${GOLD_BORDER}`,
          borderRadius: 7, padding: "6px 7px",
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          {[
            { icon: "◆", color: GOLD_BRIGHT, label: "Yurdun" },
            { icon: "◆", color: GOLD, label: "Beylik" },
            { icon: "◆", color: BLOOD, label: "Savaşta" },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: l.color, fontSize: 8 }}>{l.icon}</span>
              <span className="font-serif" style={{ fontSize: "0.47rem", fontStyle: "italic", color: "var(--color-parchment-muted)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BEYLİKLER VE YERLEŞİMLER ── */}
      <div style={{ marginTop: "0.9rem" }}>
        <GoldRule label="👑 Beylikler ve Yerleşimler" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sortedKingdoms.map((k) => (
            <KingdomRow
              key={k.id}
              kingdom={k}
              locations={locations.filter((l) => l.kingdom_id === k.id)}
              leaderName={leaderOf(k)}
              playerLocId={player.location_id}
              atWar={(k.at_war_with || []).length > 0}
              onGoLoc={goLoc}
            />
          ))}
        </div>
        <p className="font-serif" style={{
          marginTop: "0.8rem", fontSize: "0.7rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", textAlign: "center",
        }}>
          Her yol bir aydır yolcunun hanesinde — heybeni doldur, atını sula.
        </p>
      </div>
    </div>
  );
}
