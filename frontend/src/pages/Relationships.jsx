/**
 * Bağlar & Anlaşmazlıklar — KÜL & KÖZ.
 * Duygu görevi: "Hayatımdaki insanlar" — sıcak, onurlu kartlar.
 * İşlevsellik (gruplama mantığı, linkler, data-testid'ler) birebir korunur.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { PageHeader, Panel, Pill, EmptyState } from "@/components/ui/Kit";

const BANDS = [
  { id: "dost", label: "Dostlar", test: (s) => s >= 50, tone: "sage", icon: "🤝", motto: "Ekmeğini bölüştüklerin" },
  { id: "arkadaş", label: "Arkadaşlar", test: (s) => s >= 20 && s < 50, tone: "sage", icon: "🍵", motto: "Selâmı sohbeti olanlar" },
  { id: "nötr", label: "Tanışlar", test: (s) => s > -20 && s < 20, tone: "ash", icon: "🕯", motto: "Adını bildiklerin" },
  { id: "rakip", label: "Rakipler", test: (s) => s <= -20 && s > -50, tone: "ember", icon: "🗡", motto: "Yan gözle bakanlar" },
  { id: "düşman", label: "Düşmanlar", test: (s) => s <= -50, tone: "blood", icon: "⚔", motto: "Kanına susayanlar" },
];

/* Yaş/cinsiyete göre avatar */
function npcAvatar(npc) {
  const age = npc.age || 30;
  if (npc.gender === "kadın") return age >= 55 ? "👵" : age < 13 ? "👧" : "👩";
  return age >= 55 ? "🧓" : age < 13 ? "👦" : "🧔";
}

/* İlişki bandı: -100..+100 → kırmızı→taş→yeşil */
function RelBand({ score }) {
  const pct = Math.max(0, Math.min(100, ((score + 100) / 200) * 100));
  return (
    <div style={{
      position: "relative", height: "4px", borderRadius: "2px", marginTop: "0.3rem",
      background: "linear-gradient(to right, rgba(200,64,64,0.35), rgba(122,106,79,0.3) 50%, rgba(74,154,90,0.35))",
    }}>
      <div style={{
        position: "absolute", top: "-2px", left: `calc(${pct}% - 4px)`,
        width: "8px", height: "8px", borderRadius: "50%",
        background: score >= 20 ? "#4A9A5A" : score <= -20 ? "#C84040" : "#B8A880",
        boxShadow: `0 0 6px ${score >= 20 ? "rgba(74,154,90,0.7)" : score <= -20 ? "rgba(200,64,64,0.7)" : "rgba(184,168,128,0.5)"}`,
      }} />
    </div>
  );
}

export default function Relationships() {
  const { state } = useGame();
  const grouped = useMemo(() => {
    const out = {};
    for (const band of BANDS) out[band.id] = [];
    for (const [npcId, score] of Object.entries(state.relationships || {})) {
      const npc = state.world.npcs.find((n) => n.id === npcId);
      if (!npc) continue;
      const band = BANDS.find((b) => b.test(score));
      if (band) out[band.id].push({ npc, score });
    }
    for (const k of Object.keys(out)) {
      out[k].sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
    }
    return out;
  }, [state]);

  const total = Object.values(grouped).reduce((s, a) => s + a.length, 0);

  return (
    <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }}>
      <PageHeader
        kicker="Hayatımdaki İnsanlar"
        icon="🫂"
        title="Bağlar & Anlaşmazlıklar"
        sub={total === 0
          ? "Henüz kimseyle bağ kurmadın — ocağın başı boş."
          : `${total} kişiyle aranda bir hikâye var; kimi dost, kimi diken.`}
      />

      {total === 0 ? (
        <Panel title="Sessiz Ocak" icon="🕯" tone="ash">
          <EmptyState icon="🫂"
            title="Defterinde henüz tek isim yok."
            sub="Çarşıya çık, selâm ver, yardım et — bağlar selamla başlar." />
        </Panel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {BANDS.map((band) => (
            <Panel key={band.id} title={band.label} icon={band.icon} tone={band.tone}
              right={<Pill tone={band.tone}>{grouped[band.id].length} kişi</Pill>}>
              {grouped[band.id].length === 0 ? (
                <p className="font-serif" style={{
                  fontSize: "0.78rem", fontStyle: "italic",
                  color: "var(--color-parchment-muted)", textAlign: "center",
                  padding: "0.4rem 0", margin: 0, opacity: 0.7,
                }}>
                  {band.motto} yok — şimdilik.
                </p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0,
                             display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {grouped[band.id].map(({ npc, score }) => (
                    <li key={npc.id}>
                      <Link to={`/oyun/npc/${npc.id}`} data-testid={`rel-${npc.id}`}
                        className="row-frame" style={{ textDecoration: "none" }}>
                        <span style={{ fontSize: "1.1rem", flexShrink: 0,
                                       filter: "drop-shadow(0 0 6px rgba(201,168,76,0.2))" }}>
                          {npcAvatar(npc)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span className="font-serif" style={{
                            fontSize: "0.88rem", fontWeight: 600,
                            color: "var(--color-parchment)", display: "block",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {npc.name}
                          </span>
                          <RelBand score={score} />
                        </div>
                        <span className="font-display" style={{
                          fontSize: "0.74rem", fontWeight: 700, flexShrink: 0,
                          color: score >= 20 ? "#4A9A5A" : score <= -20 ? "#C84040" : "var(--color-parchment-muted)",
                        }}>
                          {score > 0 ? `+${score}` : score}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
