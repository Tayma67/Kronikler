/**
 * Stat Dağılımı — KÜL & KÖZ.
 * Duygu görevi: "Bedenim ve aklım şekilleniyor."
 * İşlevsellik (API çağrıları, state akışı) birebir korunur; yalnız görsel katman.
 */
import { useEffect, useState } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { playSfx } from "@/lib/audio";
import { toast } from "sonner";
import { PageHeader, Panel, Pill, GoldRule, TONES } from "@/components/ui/Kit";

// ─── Stat konfigürasyonu ──────────────────────────────────────────────────────
const STATS = [
  {
    key: "strength",
    label: "Güç",
    icon: "💪",
    tone: "ember",
    description: "Fiziksel güç. Savaşta saldırı, ağır işlerde kazanç.",
    perks: ["Savaş hasarı +", "Ağır yük taşıma", "Çiftçilik & demircilik geliri"],
    professions: ["asker", "şövalye", "demirci", "çiftçi", "haydut"],
  },
  {
    key: "intelligence",
    label: "Zeka",
    icon: "🧠",
    tone: "ink",
    description: "Düşünme kapasitesi. Ticaret, okul, gizli cemiyet araştırması.",
    perks: ["Ticaret kazancı +", "Gizli cemiyet ipucu şansı +", "Okul dersleri hızlanır"],
    professions: ["tüccar", "katip", "şifacı", "rahip", "zanaatkar"],
  },
  {
    key: "charisma",
    label: "Karizma",
    icon: "🗣",
    tone: "gold",
    description: "Sosyal etki. NPC ilişkileri, pazarlık, faction yükselişi.",
    perks: ["NPC ilişki gelişimi +", "Pazarlık avantajı", "Faction katkı bonusu"],
    professions: ["tüccar", "rahip", "lord", "şövalye", "katip"],
  },
  {
    key: "stamina",
    label: "Dayanıklılık",
    icon: "❤️",
    tone: "sage",
    description: "Sağlamlık ve enerji. Maksimum can, açlık direnci, iyileşme.",
    perks: ["Maksimum can +", "Açlık azalması yavaşlar", "Savaş savunması +"],
    professions: ["asker", "avcı", "şövalye", "çiftçi", "demirci çırağı"],
  },
];

// Meslekten hangi statlar önerilir
const PROF_PRIMARY = {
  "asker":          ["strength", "stamina"],
  "şövalye":        ["strength", "stamina", "charisma"],
  "haydut":         ["strength", "stamina"],
  "çiftçi":         ["strength", "stamina"],
  "demirci":        ["strength", "stamina"],
  "demirci çırağı": ["strength", "stamina"],
  "avcı":           ["stamina", "intelligence"],
  "tüccar":         ["intelligence", "charisma"],
  "katip":          ["intelligence", "charisma"],
  "şifacı":         ["intelligence", "charisma"],
  "rahip":          ["intelligence", "charisma"],
  "zanaatkar":      ["intelligence", "strength"],
  "lord":           ["charisma", "intelligence", "strength"],
  "köylü":          ["stamina", "strength"],
};

function xpForNext(level) {
  return 10 + level * 15;
}

// ─── Tek stat kartı — beden ve akıl, mühür gibi büyür ────────────────────────
function StatCard({ stat, value, xp = 0, onAllocate, busy, hasPoints, maxed, isRecommended }) {
  const t = TONES[stat.tone] || TONES.gold;
  const pct      = Math.max(0, Math.min(100, (value / 10) * 100));
  const xpNeeded = xpForNext(value);
  const xpPct    = Math.min(100, (xp / xpNeeded) * 100);

  return (
    <div className="card-frame" style={{
      position: "relative", padding: "1rem",
      border: `1px solid ${t.border}`,
      background: `linear-gradient(165deg, ${t.bg} 0%, rgba(20,14,7,0.4) 45%, transparent 100%)`,
    }}>
      {/* Önerilen rozeti */}
      {isRecommended && (
        <div style={{ position: "absolute", top: "0.7rem", right: "0.7rem" }}>
          <Pill tone="gold">★ Önerilen</Pill>
        </div>
      )}

      {/* Başlık + değer */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", paddingRight: isRecommended ? "5rem" : 0 }}>
        <span style={{ fontSize: "1.5rem", filter: `drop-shadow(0 0 8px ${t.text}55)` }}>{stat.icon}</span>
        <span className="font-display" style={{
          fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.16em",
          textTransform: "uppercase", color: t.text,
        }}>
          {stat.label}
        </span>
        <span className="font-display" style={{
          marginLeft: "auto", fontSize: "1.7rem", fontWeight: 700, color: t.text,
          textShadow: `0 0 14px ${t.text}55`, lineHeight: 1,
        }}>
          {value}
        </span>
        <span className="font-display" style={{ fontSize: "0.7rem", color: "var(--color-parchment-muted)" }}>
          / 10
        </span>
      </div>

      {/* Seviye barı */}
      <div style={{ marginTop: "0.65rem" }}>
        <div style={{ height: "6px", background: "rgba(255,255,255,0.07)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`, borderRadius: "3px",
            background: `linear-gradient(to right, ${t.text}88, ${t.text})`,
            boxShadow: `0 0 8px ${t.text}66`, transition: "width 0.5s ease",
          }} />
        </div>

        {/* XP barı */}
        {!maxed && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.3rem" }}>
            <div style={{ flex: 1, height: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "1px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${xpPct}%`, opacity: 0.6,
                background: t.text, transition: "width 0.7s ease",
              }} />
            </div>
            <span className="font-display" style={{ fontSize: "0.52rem", color: "var(--color-parchment-muted)", flexShrink: 0 }}>
              {xp}/{xpNeeded} XP
            </span>
          </div>
        )}
      </div>

      {/* Açıklama */}
      <p className="font-serif" style={{
        fontSize: "0.74rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
        marginTop: "0.6rem", lineHeight: 1.45,
      }}>
        {stat.description}
      </p>

      {/* Bonuslar */}
      <ul style={{ margin: "0.5rem 0 0", padding: 0, listStyle: "none" }}>
        {stat.perks.map((p) => (
          <li key={p} className="font-serif" style={{
            fontSize: "0.7rem", color: "var(--color-parchment-muted)",
            display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.08rem 0",
          }}>
            <span style={{
              width: "4px", height: "4px", borderRadius: "50%", flexShrink: 0,
              background: t.text, boxShadow: `0 0 4px ${t.text}88`,
            }} />
            {p}
          </li>
        ))}
      </ul>

      {/* Artır butonu */}
      <div style={{ marginTop: "0.7rem" }}>
        {maxed ? (
          <div className="font-display" style={{
            textAlign: "center", fontSize: "0.6rem", letterSpacing: "0.2em",
            color: "var(--color-gold-dim)", padding: "0.45rem 0",
            border: "1px solid rgba(201,168,76,0.25)", borderRadius: "5px",
          }}>
            ✦ ZİRVE ✦
          </div>
        ) : (
          <button
            onClick={() => onAllocate(stat.key)}
            disabled={busy || !hasPoints}
            className="font-display"
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: "0.35rem", padding: "0.55rem 0", borderRadius: "5px",
              fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
              border: `1px solid ${hasPoints && !busy ? t.border : "rgba(122,106,79,0.3)"}`,
              background: hasPoints && !busy ? t.bg : "transparent",
              color: hasPoints && !busy ? t.text : "var(--color-parchment-muted)",
              cursor: hasPoints && !busy ? "pointer" : "not-allowed",
              boxShadow: hasPoints && !busy ? `0 0 12px ${t.text}22` : "none",
              transition: "all 0.2s",
            }}
          >
            {busy === stat.key ? "⏳" : "＋"} 1 Puan Ekle
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Ana sayfa ────────────────────────────────────────────────────────────────
export default function StatAllocate() {
  const { state, setState } = useGame();
  const [busy,    setBusy]    = useState(null);
  const [statXp,  setStatXp]  = useState({});

  const player     = state?.player || {};
  const stats      = player.stats || { strength: 1, intelligence: 1, charisma: 1, stamina: 2 };
  const statPoints = player.stat_points || 0;
  const profession = player.profession || "işsiz";
  const recommended = PROF_PRIMARY[profession] || [];

  // XP bilgisini çek
  useEffect(() => {
    api.get("/game/skills").then(({ data }) => {
      setStatXp(data.stat_xp || {});
    }).catch(() => {});
  }, [state?.turn]);

  const allocate = async (statKey) => {
    if (!statPoints) { toast.error("Harcanacak stat puanın yok."); return; }
    setBusy(statKey);
    try {
      const { data } = await api.post("/game/stat/allocate", { stat: statKey });
      if (data.state) setState(data.state);
      playSfx("success");
      const label = STATS.find(s => s.key === statKey)?.label || statKey;
      toast.success(`${label} → ${data.new_value} (${data.stat_points_remaining} puan kaldı)`);
    } catch (e) {
      playSfx("fail");
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(null);
    }
  };

  const totalStats = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }}>
      <PageHeader
        kicker="Karakter Gelişimi"
        icon="⚖"
        title="Beden & Akıl"
        sub="Nereye emek verirsen, orası şekillenir — taş yontulur gibi."
        right={
          <div style={{ textAlign: "right" }}>
            <div className="label-tiny" style={{ marginBottom: "0.1rem" }}>Puan</div>
            <span className="font-display" style={{
              fontSize: "1.4rem", fontWeight: 700,
              color: statPoints > 0 ? "var(--color-gold)" : "var(--color-parchment-muted)",
              textShadow: statPoints > 0 ? "0 0 12px rgba(201,168,76,0.4)" : "none",
            }}>
              {statPoints}
            </span>
          </div>
        }
      />

      {/* Puan + meslek önerisi */}
      <Panel
        title="Harcanabilir Puan"
        icon="✨"
        tone={statPoints > 0 ? "gold" : "ash"}
        right={statPoints > 0 ? <Pill tone="gold" pulse="envoy">Seçim bekliyor</Pill> : null}
      >
        {statPoints > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <span className="font-display" style={{
              fontSize: "2.2rem", fontWeight: 700, color: "var(--color-gold)",
              textShadow: "0 0 16px rgba(201,168,76,0.45)", lineHeight: 1,
            }}>
              {statPoints}
            </span>
            <p className="font-serif" style={{
              fontSize: "0.82rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
            }}>
              Birikmiş emeğin puan oldu — aşağıdaki dört yönden birine akıt.
            </p>
          </div>
        ) : (
          <p className="font-serif" style={{
            fontSize: "0.82rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
          }}>
            Şimdilik puan yok. Çalış, öğren, büyü — emek puana döner.
          </p>
        )}

        {/* Meslek önerisi */}
        {recommended.length > 0 && (
          <>
            <GoldRule label="Zanaatın Fısıltısı" />
            <p className="font-serif" style={{
              fontSize: "0.78rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
            }}>
              <span className="font-display" style={{ color: "var(--color-gold)", fontStyle: "normal", textTransform: "capitalize" }}>
                {profession}
              </span>{" "}
              yolunda yürüyene{" "}
              <span style={{ color: "var(--color-parchment)" }}>
                {recommended.map(k => STATS.find(s => s.key === k)?.label).filter(Boolean).join(", ")}
              </span>{" "}
              en çok yâr olur.
            </p>
          </>
        )}
      </Panel>

      <div style={{ height: "0.75rem" }} />

      {/* Stat kartları — 4 büyük kart */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
        {STATS.map((s) => (
          <StatCard
            key={s.key}
            stat={s}
            value={stats[s.key] ?? 1}
            xp={statXp[s.key] ?? 0}
            onAllocate={allocate}
            busy={busy}
            hasPoints={statPoints > 0}
            maxed={(stats[s.key] ?? 1) >= 10}
            isRecommended={recommended.includes(s.key)}
          />
        ))}
      </div>

      <GoldRule label="Toplam" />

      {/* Toplam */}
      <div className="row-frame" style={{ justifyContent: "space-between" }}>
        <span className="font-serif" style={{ fontSize: "0.82rem", fontStyle: "italic", color: "var(--color-parchment-muted)" }}>
          Bugüne dek yontulan toplam stat
        </span>
        <span className="font-display" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-parchment)" }}>
          {totalStats}
        </span>
      </div>
    </div>
  );
}
