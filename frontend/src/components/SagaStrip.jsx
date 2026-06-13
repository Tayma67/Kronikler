import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import LifeNovel from "@/components/LifeNovel";
import HayatKarti from "@/components/HayatKarti";

/**
 * S3 Makyaj — Hayat Romanı şeridi.
 * Yönetmenin perdesini, gerilim közünü ve oyuncuyu bekleyen acil şeyleri
 * (kapıdaki elçi, nemesis gölgesi, hakkındaki söylentiler) dashboard'un
 * en görünür yerine taşır. Arka plandaki derinlik artık yüzeyde.
 */

const YAY_CFG = {
  kurulus: { label: "KURULUŞ",   color: "#C9A84C" },
  yukselis:{ label: "YÜKSELİŞ",  color: "#4A9A5A" },
  kriz:    { label: "KRİZ",      color: "#E05A30" },
  doruk:   { label: "DORUK",     color: "#C84040" },
  cozulme: { label: "ÇÖZÜLME",   color: "#2A6FA8" },
  durgun:  { label: "DURGUN",    color: "#7A6A4F" },
};

export function useSaga(state) {
  const [saga, setSaga] = useState(null);
  const turn = state?.turn;
  useEffect(() => {
    if (turn == null) return;
    let live = true;
    Promise.all([
      api.get("/game/yonetmen").catch(() => null),
      api.get("/game/hanedanlar").catch(() => null),
      api.get("/game/nam").catch(() => null),
    ]).then(([y, h, n]) => {
      if (!live) return;
      setSaga({
        yonetmen: y?.data || null,
        teklifler: h?.data?.teklifler || [],
        soylentiler: (n?.data?.soylentiler || []).filter((r) => r.yon < 0),
        dominantNam: n?.data?.dominant || null,
      });
    });
    return () => { live = false; };
  }, [turn]);
  return saga;
}

function Chip({ icon, text, color, className, onClick }) {
  return (
    <button onClick={onClick} className={className}
      style={{
        display: "flex", alignItems: "center", gap: "0.3rem",
        background: "rgba(8,5,2,0.6)",
        border: `1px solid ${color}55`,
        borderRadius: "20px",
        padding: "0.22rem 0.6rem",
        cursor: "pointer", flexShrink: 0,
        fontFamily: "Cinzel, serif", fontSize: "0.55rem",
        fontWeight: 700, letterSpacing: "0.08em",
        color, whiteSpace: "nowrap",
      }}>
      <span style={{ fontSize: "0.7rem", lineHeight: 1 }}>{icon}</span>
      {text}
    </button>
  );
}

export default function SagaStrip({ saga }) {
  const navigate = useNavigate();
  const y = saga?.yonetmen;
  if (!y) return null;

  const perde = (y.perdeler || [])[y.perdeler.length - 1];
  const yay = YAY_CFG[y.aktif_yay] || YAY_CFG.kurulus;
  const gerilim = Math.max(0, Math.min(100, y.gerilim || 0));
  const nemesis = (y.nemesisler || []).filter((n) => n.alive);
  const teklifler = saga.teklifler || [];
  const soylentiler = saga.soylentiler || [];

  const chips = [];
  if (teklifler.length > 0) {
    chips.push(
      <Chip key="elci" icon="📜" color="#A78BDA" className="chip-envoy"
        text={teklifler.length === 1 ? "KAPINDA ELÇİ VAR" : `${teklifler.length} ELÇİ BEKLİYOR`}
        onClick={() => navigate("/oyun/hanedanlar")} />
    );
  }
  for (const n of nemesis.slice(0, 1)) {
    chips.push(
      <Chip key="nemesis" icon="🗡" color="#E07070" className="chip-urgent"
        text={`${n.name.split(" ")[0].toUpperCase()} SENİ UNUTMADI`}
        onClick={() => navigate(`/oyun/npc/${n.id}`)} />
    );
  }
  if (soylentiler.length > 0) {
    chips.push(
      <Chip key="dedikodu" icon="👁" color="#D4820A" className="chip-urgent"
        text={`HAKKINDA ${soylentiler.length} SÖYLENTİ`}
        onClick={() => navigate("/oyun/dedikodular")} />
    );
  }
  if (saga.dominantNam) {
    chips.push(
      <Chip key="nam" icon="⚜" color="#C9A84C"
        text={`NAMIN: ${saga.dominantNam.toUpperCase()}`}
        onClick={() => navigate("/oyun/dedikodular")} />
    );
  }

  return (
    <div className={gerilim >= 60 ? "tension-hot" : ""} style={{
      margin: "0.55rem 0.75rem 0",
      background: "linear-gradient(160deg, rgba(201,168,76,0.06) 0%, var(--color-card) 45%)",
      border: "1px solid var(--color-border-hi)",
      borderRadius: "10px",
      padding: "0.6rem 0.8rem 0.65rem",
      position: "relative", overflow: "hidden",
      boxShadow: "0 4px 18px rgba(0,0,0,0.45)",
    }}>
      {/* Üst ışık çizgisi */}
      <div style={{
        position: "absolute", top: 0, left: "4%", right: "30%", height: "1px",
        background: `linear-gradient(to right, transparent, ${yay.color}66, transparent)`,
      }} />

      {/* Perde başlığı + yay rozeti */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <button onClick={() => navigate("/oyun/tarih")}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", minWidth: 0 }}>
          <div className="font-display" style={{
            fontSize: "0.5rem", color: "var(--color-gold-dim)",
            letterSpacing: "0.22em", marginBottom: "0.12rem",
          }}>
            HAYAT ROMANIN
          </div>
          <div className="font-serif" style={{
            fontSize: "0.82rem", color: "var(--color-parchment)",
            fontStyle: "italic", lineHeight: 1.2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textShadow: "0 1px 6px rgba(0,0,0,0.6)",
          }}>
            {perde ? perde.baslik : "Küller Arasında"}
          </div>
        </button>
        <div style={{
          flexShrink: 0,
          border: `1px solid ${yay.color}70`,
          borderRadius: "4px",
          padding: "0.18rem 0.45rem",
          fontFamily: "Cinzel, serif", fontSize: "0.5rem",
          fontWeight: 700, letterSpacing: "0.14em",
          color: yay.color,
          background: `${yay.color}12`,
          textShadow: `0 0 8px ${yay.color}50`,
        }}>
          {yay.label}
        </div>
      </div>

      {/* Gerilim közü */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginTop: "0.45rem" }}>
        <span style={{ fontSize: "0.6rem", lineHeight: 1 }} title="Dramatik gerilim">🔥</span>
        <div className="tension-track" style={{ flex: 1 }}>
          <div className="tension-fill" style={{ width: `${gerilim}%` }} />
        </div>
        <span className="font-display" style={{
          fontSize: "0.52rem", color: gerilim >= 60 ? "#E07070" : "var(--color-parchment-muted)",
          fontWeight: 700, minWidth: "1.4rem", textAlign: "right",
        }}>
          {gerilim}
        </span>
      </div>

      {/* Acil rozetler — oyuncuyu bekleyen şeyler */}
      {chips.length > 0 && (
        <div style={{
          display: "flex", gap: "0.35rem", marginTop: "0.5rem",
          overflowX: "auto", scrollbarWidth: "none", paddingBottom: "0.1rem",
        }}>
          {chips}
        </div>
      )}
    </div>
  );
}

/** Romanı/kartı açan iki büyük giriş — sekmenin başında. */
function RomanActions({ onNovel, onCard, loading }) {
  const Btn = ({ icon, title, sub, onClick, accent }) => (
    <button onClick={onClick} disabled={loading}
      style={{
        flex: 1, display: "flex", alignItems: "center", gap: "0.55rem",
        padding: "0.6rem 0.7rem", textAlign: "left", minWidth: 0,
        background: `linear-gradient(160deg, ${accent}1c 0%, rgba(8,5,2,0.5) 70%)`,
        border: `1px solid ${accent}55`, borderRadius: "10px",
        cursor: loading ? "default" : "pointer",
        boxShadow: `0 2px 14px rgba(0,0,0,0.4), inset 0 1px 0 ${accent}1a`,
      }}>
      <span style={{ fontSize: "1.25rem", lineHeight: 1, filter: `drop-shadow(0 0 8px ${accent}55)` }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <span className="font-display" style={{
          display: "block", fontSize: "0.62rem", fontWeight: 700,
          letterSpacing: "0.12em", color: accent,
        }}>{title}</span>
        <span className="font-serif" style={{
          display: "block", fontSize: "0.58rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis",
        }}>{sub}</span>
      </span>
    </button>
  );
  return (
    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.7rem" }}>
      <Btn icon="📖" title="ROMANI OKU" sub="hayatını sayfa sayfa"
        accent="#C9A84C" onClick={onNovel} />
      <Btn icon="🪪" title="HAYAT KARTI" sub="özetini paylaş"
        accent="#A78BDA" onClick={onCard} />
    </div>
  );
}

/** Günlük panelindeki ROMAN sekmesi — perdeler, nemesis, tohum fısıltısı. */
export function SagaTab({ saga, state }) {
  const navigate = useNavigate();
  const [showNovel, setShowNovel] = useState(false);
  const [showCard, setShowCard]   = useState(false);
  const [novelFull, setNovelFull] = useState(null);
  const [loading, setLoading]     = useState(false);

  const openNovel = async () => {
    if (!novelFull) {
      setLoading(true);
      try {
        const r = await api.get("/game/chronicle/full");
        setNovelFull(r?.data || {});
      } catch { setNovelFull({}); }
      finally { setLoading(false); }
    }
    setShowNovel(true);
  };

  const y = saga?.yonetmen;
  if (!y) {
    return (
      <div style={{ textAlign: "center", padding: "1.8rem 0.5rem", color: "var(--color-parchment-muted)" }}>
        <div style={{ fontSize: "1.4rem", marginBottom: "0.5rem", opacity: 0.4 }}>📖</div>
        <p className="font-serif" style={{ fontSize: "0.85rem", fontStyle: "italic" }}>
          Romanın ilk sayfası yazılıyor…
        </p>
      </div>
    );
  }
  const nemesis = (y.nemesisler || []).filter((n) => n.alive);
  const player = state?.player || {};
  return (
    <div style={{ padding: "0.2rem 0.1rem" }}>
      <RomanActions onNovel={openNovel} onCard={() => setShowCard(true)} loading={loading} />

      {/* Perdeler — romanın içindekiler sayfası */}
      {[...(y.perdeler || [])].reverse().map((p, i) => (
        <div key={p.no} style={{
          display: "flex", alignItems: "baseline", gap: "0.5rem",
          padding: "0.45rem 0.3rem",
          borderBottom: "1px solid rgba(201,168,76,0.08)",
          opacity: p.bitis == null ? 1 : 0.55,
        }}>
          <span className="font-serif" style={{
            flex: 1, fontSize: "0.85rem", fontStyle: "italic",
            color: p.bitis == null ? "var(--color-gold)" : "var(--color-parchment-dim)",
            textShadow: p.bitis == null ? "0 0 10px rgba(201,168,76,0.3)" : "none",
          }}>
            {p.baslik}
          </span>
          <span style={{
            fontSize: "0.58rem", color: "var(--color-parchment-muted)",
            fontFamily: "Crimson Text, serif", fontStyle: "italic", flexShrink: 0,
          }}>
            {p.bitis == null ? "yazılıyor…" : `${1247 + Math.floor(p.baslangic / 12)}–${1247 + Math.floor(p.bitis / 12)}`}
          </span>
        </div>
      ))}

      {/* Nemesis satırı */}
      {nemesis.map((n) => (
        <button key={n.id} onClick={() => navigate(`/oyun/npc/${n.id}`)}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem", width: "100%",
            marginTop: "0.6rem", padding: "0.55rem 0.6rem",
            background: "linear-gradient(160deg, rgba(200,64,64,0.08) 0%, transparent 60%)",
            border: "1px solid rgba(200,64,64,0.3)", borderRadius: "8px",
            cursor: "pointer", textAlign: "left",
          }}>
          <span style={{ fontSize: "0.9rem" }}>🗡</span>
          <span className="font-serif" style={{ fontSize: "0.78rem", color: "#E0A0A0", fontStyle: "italic" }}>
            {n.name} seni unutmadı — gölgesi hâlâ üzerinde.
          </span>
        </button>
      ))}

      {/* Tohum fısıltısı — merak kancası */}
      {y.bekleyen_tohum > 0 && (
        <div className="font-serif" style={{
          marginTop: "0.7rem", textAlign: "center",
          fontSize: "0.72rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)",
        }}>
          🌰 Geçmişte ektiklerinden {y.bekleyen_tohum} tohum toprağın altında bekliyor…
        </div>
      )}

      {showNovel && (
        <LifeNovel
          name={player.name}
          baseAge={player.base_age ?? 7}
          chapters={y.perdeler || []}
          yearStories={novelFull?.year_stories || []}
          history={state?.history || []}
          alive={!player.dead}
          onClose={() => setShowNovel(false)}
        />
      )}
      {showCard && (
        <HayatKarti
          player={player}
          calendar={state?.calendar || {}}
          onClose={() => setShowCard(false)}
        />
      )}
    </div>
  );
}
