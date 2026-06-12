/**
 * Kasaba Hayatı — KÜL & KÖZ görsel katman.
 * Duygu görevi: "Kasabanın dedikodusu" — ocak başı sohbeti sıcaklığı.
 * İşlevsellik (state/memo/filtre akışı) birebir korunur; sadece görsel katman değişti.
 */
import { useMemo, useState } from "react";
import { profLabel } from "@/lib/labels";
import { useGame } from "@/lib/GameContext";
import { Link } from "react-router-dom";
import { playSfx } from "@/lib/audio";
import NPCList from "@/components/NPCList";
import { PageHeader, Panel, Pill, EmptyState, TONES } from "@/components/ui/Kit";

const EVENT_TYPE_ICONS = {
  "savaş":    { icon: "⚔",  tone: "blood" },
  "ticaret":  { icon: "⚖",  tone: "gold" },
  "evlilik":  { icon: "💍", tone: "ember" },
  "ölüm":     { icon: "🕯", tone: "ash" },
  "doğum":    { icon: "👶", tone: "sage" },
  "quest":    { icon: "⭐", tone: "gold" },
  "faction":  { icon: "🔥", tone: "ink" },
  "dedikodu": { icon: "🗣", tone: "ash" },
  "default":  { icon: "📜", tone: "ash" },
};

function getEventMeta(type) {
  const key = Object.keys(EVENT_TYPE_ICONS).find(k => type?.includes(k));
  return EVENT_TYPE_ICONS[key] || EVENT_TYPE_ICONS.default;
}

function FeedEvent({ event, turn }) {
  const meta = getEventMeta(event.type);
  const t = TONES[meta.tone] || TONES.ash;
  const ago = Math.max(0, (turn || 0) - (event.turn || 0));
  return (
    <div className="row-frame" style={{
      alignItems: "flex-start",
      borderLeft: `2px solid ${t.border}`,
      background: `linear-gradient(to right, ${t.bg}, transparent 65%)`,
    }}>
      <span style={{ fontSize: "0.95rem", flexShrink: 0, marginTop: "0.1rem",
                     filter: "drop-shadow(0 0 6px rgba(201,168,76,0.2))" }}>
        {meta.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="font-serif" style={{
          fontSize: "0.86rem", fontStyle: "italic",
          color: "var(--color-parchment)", lineHeight: 1.5,
        }}>
          {event.text || event.summary || "Bilinmeyen olay"}
        </p>
        <div className="font-display" style={{
          display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.25rem",
          fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--color-parchment-muted)",
        }}>
          <span>🕯 {ago === 0 ? "Bu ay" : `${ago} ay önce`}</span>
          {event.location && (
            <><span>·</span><span style={{ textTransform: "capitalize" }}>{event.location}</span></>
          )}
        </div>
      </div>
    </div>
  );
}

function NPCCard({ npc }) {
  const mood = npc.happiness > 70 ? "mutlu" : npc.happiness > 40 ? "nötr" : "mutsuz";
  const moodTone = mood === "mutlu" ? "sage" : mood === "nötr" ? "ash" : "blood";

  return (
    <Link to={`/oyun/npc/${npc.id}`} className="row-frame" style={{ textDecoration: "none" }}>
      <span style={{
        width: "2.2rem", height: "2.2rem", flexShrink: 0, borderRadius: "6px",
        border: "1px solid var(--color-border-hi)", background: "rgba(10,7,4,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem",
      }}>
        🧑
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="font-display" style={{
          fontSize: "0.8rem", fontWeight: 700, color: "var(--color-parchment)",
        }}>
          {npc.name}
        </div>
        <div className="font-serif" style={{
          fontSize: "0.7rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
          display: "flex", alignItems: "center", gap: "0.35rem",
        }}>
          <span>{npc.age} yaş</span>
          <span>·</span>
          <span style={{ textTransform: "capitalize" }}>{profLabel(npc.profession)}</span>
          {npc.spouse_id && <><span>·</span><span>💍 Evli</span></>}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <Pill tone={moodTone}>{mood}</Pill>
        {(npc.children_ids?.length ?? 0) > 0 && (
          <div className="font-display" style={{
            fontSize: "0.55rem", color: "var(--color-parchment-muted)", marginTop: "0.2rem",
          }}>
            👶 {npc.children_ids.length}
          </div>
        )}
      </div>
    </Link>
  );
}

function RelationshipCard({ npc, relType }) {
  const toneMap = { dost: "sage", düşman: "blood", aşk: "ember", nötr: "ash" };
  const tone = toneMap[relType] || "ash";
  const t = TONES[tone] || TONES.ash;
  return (
    <div className="row-frame" style={{
      justifyContent: "space-between",
      borderLeft: `2px solid ${t.border}`,
      background: `linear-gradient(to right, ${t.bg}, transparent 70%)`,
    }}>
      <span className="font-serif" style={{
        fontSize: "0.85rem", color: "var(--color-parchment)", fontWeight: 600,
      }}>
        {npc.name}
      </span>
      <Pill tone={tone}>{relType}</Pill>
    </div>
  );
}

export default function TownFeed() {
  const { state } = useGame();
  const [filter, setFilter] = useState("hepsi"); // hepsi | lokasyon | önemli

  const player    = state?.player || {};
  const npcs      = useMemo(() => state?.world?.npcs || [], [state?.world?.npcs]);
  const locations = state?.world?.locations || [];
  const events    = useMemo(() => state?.events || [], [state?.events]);
  const turn      = state?.turn || 0;

  const playerLoc = locations.find(l => l.id === player.location_id);

  // NPCs in same location as player
  const localNPCs = useMemo(() => {
    return npcs.filter(n =>
      n.alive !== false &&
      n.location_id === player.location_id &&
      n.id !== "PLAYER"
    );
  }, [npcs, player.location_id]);

  // All NPCs with relationships to player
  const relationships = useMemo(() => {
    const rels = [];
    for (const npc of npcs) {
      if (npc.alive === false) continue;
      const bonds = npc.bonds || {};
      const bond = bonds["PLAYER"];
      if (bond !== undefined) {
        const relType = bond >= 60 ? "dost" : bond >= 30 ? "nötr" : bond >= 0 ? "nötr" : "düşman";
        const isCrush = npc.crush_on === "PLAYER";
        rels.push({ npc, relType: isCrush ? "aşk" : relType, bond });
      }
    }
    return rels.sort((a, b) => Math.abs(b.bond) - Math.abs(a.bond)).slice(0, 10);
  }, [npcs]);

  // Interesting events filtered
  const filteredEvents = useMemo(() => {
    let evs = [...events].reverse();
    if (filter === "lokasyon") {
      evs = evs.filter(e =>
        e.location_id === player.location_id ||
        e.text?.includes(playerLoc?.name || "")
      );
    } else if (filter === "önemli") {
      const importantTypes = ["savaş", "ölüm", "evlilik", "faction", "doğum"];
      evs = evs.filter(e => importantTypes.some(t => e.type?.includes(t)));
    }
    return evs.slice(0, 40);
  }, [events, filter, player.location_id, playerLoc]);

  // NPC drama (high-intensity events from NPC perspective)
  const drama = useMemo(() => {
    const items = [];
    for (const npc of npcs.filter(n => n.alive !== false)) {
      if (npc.bonds) {
        const enemies = Object.entries(npc.bonds)
          .filter(([, v]) => v < -20)
          .map(([id]) => npcs.find(n2 => n2.id === id)?.name)
          .filter(Boolean);
        if (enemies.length) {
          items.push({
            text: `${npc.name}, ${enemies.slice(0, 2).join(" ve ")} ile husumet içinde.`,
            type: "dedikodu",
            turn: turn,
          });
        }
      }
      if (npc.crush_on && npc.crush_on !== "PLAYER") {
        const target = npcs.find(n2 => n2.id === npc.crush_on);
        if (target) {
          items.push({
            text: `${npc.name}, ${target.name}'e gizlice ilgi duyuyor.`,
            type: "evlilik",
            turn: turn,
          });
        }
      }
    }
    return items.slice(0, 6);
  }, [npcs, turn]);

  return (
    <div className="page-shell rise-in" style={{ display: "flex", flexDirection: "column", gap: "0.9rem", paddingBottom: "1.5rem" }}>
      <PageHeader
        kicker="Ocak Başı"
        icon="🏘"
        title="Kasaba Hayatı"
        sub="Meydanda fısıldanır, ocak başında büyür — kasabanın dedikodusu."
        right={
          <div style={{ textAlign: "right" }}>
            <div className="label-tiny" style={{ marginBottom: "0.1rem" }}>Sene</div>
            <div className="font-display" style={{
              fontSize: "1rem", fontWeight: 700, color: "var(--color-gold)",
              textShadow: "0 0 8px rgba(201,168,76,0.3)",
            }}>
              {1247 + Math.floor(turn / 12)}
            </div>
          </div>
        }
      />

      {/* Konum */}
      {playerLoc && (
        <div className="row-frame">
          <span style={{ fontSize: "0.95rem", flexShrink: 0,
                         filter: "drop-shadow(0 0 6px rgba(224,90,48,0.35))" }}>📍</span>
          <span className="font-serif" style={{
            fontSize: "0.85rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
          }}>
            Şu an: <span className="font-display" style={{
              fontStyle: "normal", fontWeight: 700, color: "var(--color-gold)",
              fontSize: "0.78rem", letterSpacing: "0.05em",
            }}>{playerLoc.name}</span>
          </span>
          <span style={{ marginLeft: "auto", flexShrink: 0 }}>
            <Pill tone="ash">{localNPCs.length} kişi burada</Pill>
          </span>
        </div>
      )}

      {/* Yakınındakiler — paginated & filtered */}
      <NPCList
        npcs={localNPCs}
        title="Aynı Lokasyondaki İnsanlar"
        locationName={playerLoc?.name}
      />

      {/* İlişkiler */}
      {relationships.length > 0 && (
        <Panel title="Sana Bağlı Olanlar" icon="🤝" tone="gold"
          right={<Pill tone="ash">{relationships.length} kişi</Pill>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {relationships.map(({ npc, relType }) => (
              <RelationshipCard key={npc.id} npc={npc} relType={relType} />
            ))}
          </div>
        </Panel>
      )}

      {/* Kasaba Dedikodları */}
      {drama.length > 0 && (
        <Panel title="Fısıltılar" icon="🗣" tone="ash">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {drama.map((d, i) => (
              <div key={i} className="row-frame" style={{
                background: "linear-gradient(to right, rgba(122,106,79,0.08), transparent 70%)",
              }}>
                <span style={{ fontSize: "0.8rem", flexShrink: 0, opacity: 0.6 }}>🪶</span>
                <span className="font-serif" style={{
                  fontSize: "0.82rem", fontStyle: "italic",
                  color: "var(--color-parchment-dim)", lineHeight: 1.5,
                }}>
                  “{d.text}”
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Olaylar akışı */}
      <Panel title="Olay Akışı" icon="📜" tone="gold"
        right={
          <div style={{ display: "flex", gap: "0.3rem" }}>
            {["hepsi", "lokasyon", "önemli"].map(f => (
              <button
                key={f}
                onClick={() => { playSfx("click"); setFilter(f); }}
                className="font-display"
                style={{
                  padding: "0.2rem 0.5rem", borderRadius: "4px", cursor: "pointer",
                  fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase", transition: "all 0.15s",
                  border: filter === f
                    ? "1px solid rgba(201,168,76,0.55)"
                    : "1px solid var(--color-border)",
                  background: filter === f ? "rgba(201,168,76,0.1)" : "transparent",
                  color: filter === f ? "var(--color-gold)" : "var(--color-parchment-muted)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        }>
        {filteredEvents.length === 0 ? (
          <EmptyState icon="🕯"
            title="Henüz kayıtlı olay yok."
            sub="Aylar geçtikçe kasabanın dili çözülür; ocak başında anlatılacak çok şey olur." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {filteredEvents.map((event, i) => (
              <FeedEvent key={i} event={event} turn={turn} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
