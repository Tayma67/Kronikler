/**
 * Yakınındakiler — KÜL & KÖZ.
 * Duygu görevi: "Tanıdığım yüzler" — kişi satırları canlı, ilişki bandı görünür.
 * İşlevsellik (filtre/sıralama/arama mantığı, data-testid'ler) birebir korunur.
 */
import { useMemo, useState } from "react";
import { profLabel } from "@/lib/labels";
import { Link } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { PageHeader, Panel, Pill, EmptyState } from "@/components/ui/Kit";
import { Portre } from "@/components/ui/Gorsel";

// İlişki skoru → bant, renk
function bandFromScore(score = 0) {
  if (score >=  50) return { label: "Dost",    color: "#4A9A5A", icon: "💚" };
  if (score >=  20) return { label: "Arkadaş", color: "#6FBF7F", icon: "🍵" };
  if (score >  -20) return { label: "Tanış",   color: "#B8A880", icon: "🕯" };
  if (score >  -50) return { label: "Rakip",   color: "#E05A30", icon: "🗡" };
  return              { label: "Düşman",  color: "#C84040", icon: "⚔" };
}

// Skor → bar genişliği: -100…+100 → 0…100%
function scoreToWidth(score) {
  return Math.max(0, Math.min(100, ((score + 100) / 200) * 100));
}

// Yaş/cinsiyete göre avatar
function npcAvatar(npc) {
  const age = npc.age || 30;
  if (npc.gender === "kadın") return age >= 55 ? "👵" : age < 13 ? "👧" : "👩";
  return age >= 55 ? "🧓" : age < 13 ? "👦" : "🧔";
}

export default function NPCList() {
  const { state } = useGame();
  const [q, setQ]           = useState("");
  const [filter, setFilter] = useState("hepsi");
  const [sort, setSort]     = useState("isim"); // "isim" | "iliski_iyi" | "iliski_kotu"

  // Oyuncunun bulunduğu konum
  const playerLocationId   = state?.player?.location_id;
  const playerLocationName = state?.player?.location_name || "Bilinmiyor";

  // Önce konuma göre filtrele — sadece aynı location_id'ye sahip canlı NPC'ler
  const localNpcs = useMemo(() => {
    if (!state?.world?.npcs) return [];
    return state.world.npcs.filter(
      (n) => n.alive && n.location_id === playerLocationId
    );
  }, [state, playerLocationId]);

  // Sonra ikincil filtreleri ve aramayı uygula
  const npcs = useMemo(() => {
    let arr = [...localNpcs];

    if (filter === "krali")   arr = arr.filter((n) => ["kral", "veliaht", "lord", "general"].includes(n.profession));
    if (filter === "dostlar") arr = arr.filter((n) => (state.relationships?.[n.id] ?? 0) >= 20);
    if (filter === "dusman")  arr = arr.filter((n) => (state.relationships?.[n.id] ?? 0) <= -20);
    if (q)                    arr = arr.filter((n) => n.name.toLowerCase().includes(q.toLowerCase()));

    if (sort === "iliski_iyi")  arr = [...arr].sort((a, b) => (state.relationships?.[b.id] ?? 0) - (state.relationships?.[a.id] ?? 0));
    if (sort === "iliski_kotu") arr = [...arr].sort((a, b) => (state.relationships?.[a.id] ?? 0) - (state.relationships?.[b.id] ?? 0));
    if (sort === "isim")        arr = [...arr].sort((a, b) => a.name.localeCompare(b.name, "tr"));

    return arr;
  }, [localNpcs, state, q, filter, sort]);

  // Özet sayılar — sadece yerel NPC'ler üzerinden
  const relMap      = state.relationships || {};
  const dostCount   = localNpcs.filter(n => (relMap[n.id] ?? 0) >= 20).length;
  const dusmanCount = localNpcs.filter(n => (relMap[n.id] ?? 0) <= -20).length;

  return (
    <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }}>
      <PageHeader
        kicker="Tanıdığım Yüzler"
        icon="🏘"
        title="Yakınındakiler"
        sub={`${playerLocationName} sokaklarında ${localNpcs.length} can dolaşıyor — kimi dost, kimi diken.`}
        right={
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", alignItems: "flex-end" }}>
            <Pill tone="sage">💚 {dostCount} dost</Pill>
            <Pill tone="blood">⚔ {dusmanCount} hasım</Pill>
          </div>
        }
      />

      {/* Filtre + sıralama + arama */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
        <div style={{ position: "relative", flex: "1 1 10rem", minWidth: 0 }}>
          <span style={{
            position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)",
            fontSize: "0.75rem", opacity: 0.6, pointerEvents: "none",
          }}>🔍</span>
          <input
            data-testid="npc-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="İsim ara…"
            style={{
              width: "100%", padding: "0.5rem 0.7rem 0.5rem 1.9rem",
              fontSize: "0.84rem",
            }}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          data-testid="npc-filter"
          style={{ padding: "0.5rem 0.6rem", fontSize: "0.8rem" }}
        >
          <option value="hepsi">Hepsi ({localNpcs.length})</option>
          <option value="krali">Soylular</option>
          <option value="dostlar">Dostlar & Arkadaşlar</option>
          <option value="dusman">Rakipler & Düşmanlar</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ padding: "0.5rem 0.6rem", fontSize: "0.8rem" }}
        >
          <option value="isim">İsme Göre</option>
          <option value="iliski_iyi">En Yakın Önce</option>
          <option value="iliski_kotu">En Düşman Önce</option>
        </select>
      </div>

      {/* Liste */}
      <Panel title={`${playerLocationName} Ahalisi`} icon="🏘" tone="gold"
        right={<Pill tone="ash">{npcs.length} kişi</Pill>}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {npcs.slice(0, 200).map((n) => {
            const rel   = state.relationships?.[n.id] ?? 0;
            const band  = bandFromScore(rel);
            const width = scoreToWidth(rel);
            const isRoyal   = ["kral", "veliaht"].includes(n.profession);
            const isInvader = n.is_invader === true;

            return (
              <Link
                key={n.id}
                to={`/oyun/npc/${n.id}`}
                data-testid={`npc-row-${n.id}`}
                className="row-frame"
                style={{ textDecoration: "none" }}
              >
                {/* Avatar — gerçek portre (yoksa emoji), royal'a altın halka + taç */}
                <span style={{ position: "relative", flexShrink: 0, display: "inline-flex" }}>
                  <Portre age={n.age} gender={n.gender} id={n.id}
                          emoji={npcAvatar(n)} size="2.4rem" ring={isRoyal} />
                  {isRoyal && (
                    <span style={{
                      position: "absolute", top: "-0.45rem", left: "50%",
                      transform: "translateX(-50%)", fontSize: "0.6rem", zIndex: 2,
                      filter: "drop-shadow(0 0 4px rgba(240,192,64,0.7))",
                    }}>👑</span>
                  )}
                </span>

                {/* NPC bilgileri */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span className="font-serif" style={{
                      fontSize: "0.88rem", fontWeight: 600, color: "var(--color-parchment)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{n.name}</span>
                    {state.player?.relationship_status?.[n.id] === "married" && (
                      <Pill tone="gold">💍 Eşin</Pill>
                    )}
                    {state.player?.relationship_status?.[n.id] === "dating" && (
                      <Pill tone="ember">💞 Gönül Yoldaşın</Pill>
                    )}
                    {/* BUG-5 FIX: İşgalci etiketi */}
                    {isInvader && (
                      <Pill tone="blood" pulse="danger">⚔ İşgalci</Pill>
                    )}
                  </div>
                  <div className="font-serif" style={{
                    fontSize: "0.7rem", fontStyle: "italic",
                    color: "var(--color-parchment-muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {profLabel(n.profession)} · {n.age} yaşında
                  </div>

                  {/* İlişki bandı: kırmızı→taş→yeşil */}
                  <div style={{
                    marginTop: "0.35rem", height: "4px", width: "8.5rem", maxWidth: "100%",
                    borderRadius: "2px", overflow: "hidden",
                    background: "rgba(255,255,255,0.06)",
                  }}>
                    <div style={{
                      height: "100%", width: `${width}%`, borderRadius: "2px",
                      background: "linear-gradient(to right, #C84040, #7A6A4F 50%, #4A9A5A)",
                      backgroundSize: `${width > 0 ? 10000 / width : 100}% 100%`,
                      boxShadow: `0 0 5px ${band.color}55`,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>

                {/* Skor + bant etiketi */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div className="font-display" style={{
                    fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: band.color,
                  }}>{band.icon} {band.label}</div>
                  <div className="font-display" style={{
                    fontSize: "0.62rem", color: "var(--color-parchment-muted)",
                  }}>{rel > 0 ? `+${rel}` : rel}</div>
                </div>
              </Link>
            );
          })}
          {npcs.length === 0 && localNpcs.length > 0 && (
            <EmptyState icon="🔍"
              title="Bu süzgeçten kimse geçemedi."
              sub="Aramayı genişlet ya da süzgeci değiştir." />
          )}
          {localNpcs.length === 0 && (
            <EmptyState icon="🏚"
              title="Bu diyarda in cin top oynuyor."
              sub="Yola düş; kalabalık bir kasaba bul." />
          )}
        </div>
      </Panel>

      {npcs.length > 200 && (
        <p className="font-serif" style={{
          fontSize: "0.72rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", marginTop: "0.6rem",
        }}>
          İlk 200 yüz gösteriliyor — gerisi kalabalıkta kayboldu.
        </p>
      )}
    </div>
  );
}
