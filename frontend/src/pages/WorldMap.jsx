import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useGame } from "@/lib/GameContext";
import {
  Crown, MapPin, ShieldCheck, Coins, Castle, Tent,
  Building2, Swords, User, ChevronRight, AlertTriangle, Layers,
} from "lucide-react";

// ─── Faction nüfuz renkleri ───────────────────────────────────────────────────
const FACTION_COLORS = [
  "#f97316", "#3b82f6", "#22c55e", "#a855f7",
  "#ec4899", "#eab308", "#06b6d4", "#ef4444",
];

// ─── Sabit renkler (krallık başına) ──────────────────────────────────────────
const KINGDOM_PALETTES = [
  {
    zone: "rgba(194,65,12,0.07)",
    border: "stroke-orange-900",
    text: "text-orange-400",
    node: "#c2410c",
    badge: "border-orange-800/60 text-orange-400",
    dim: "rgba(194,65,12,0.25)",
  },
  {
    zone: "rgba(59,130,246,0.07)",
    border: "stroke-blue-900",
    text: "text-sky-400",
    node: "#2563eb",
    badge: "border-sky-800/60 text-sky-400",
    dim: "rgba(37,99,235,0.25)",
  },
  {
    zone: "rgba(22,163,74,0.07)",
    border: "stroke-green-900",
    text: "text-emerald-400",
    node: "#16a34a",
    badge: "border-emerald-800/60 text-emerald-400",
    dim: "rgba(22,163,74,0.25)",
  },
];

// Tekrarlanabilir sahte rastgele konumlar (ID hash)
function hashCode(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return Math.abs(h);
}

function getLocPos(loc, kingdoms, mapW, mapH, idx, totalInKingdom) {
  const kIdx = kingdoms.findIndex((k) => k.id === loc.kingdom_id);
  const cols = kingdoms.length;
  const zoneW = mapW / cols;
  const baseX = kIdx * zoneW;

  const pad = { x: 30, y: 50 };
  const innerW = zoneW - pad.x * 2;
  const innerH = mapH - pad.y * 2;

  // Use hash to place within zone
  const h = hashCode(loc.id);
  const tx = (h % 1000) / 1000;
  const ty = ((h >> 10) % 1000) / 1000;

  // City is center-top, castles mid, villages scattered
  let x, y;
  if (loc.kind === "şehir") {
    x = baseX + zoneW * 0.5;
    y = pad.y + innerH * 0.2;
  } else if (loc.kind === "kale") {
    x = baseX + pad.x + innerW * (0.2 + tx * 0.6);
    y = pad.y + innerH * (0.35 + ty * 0.25);
  } else {
    x = baseX + pad.x + innerW * (0.05 + tx * 0.9);
    y = pad.y + innerH * (0.55 + ty * 0.38);
  }

  return { x: Math.round(x), y: Math.round(y) };
}

const NODE_SIZE = { şehir: 10, kale: 7, köy: 5 };
const LOC_ICONS = { şehir: Building2, kale: Castle, köy: Tent };

// ─── SVG Harita ───────────────────────────────────────────────────────────────
function WorldSvgMap({ kingdoms, locations, playerLocId, onLocClick, factions = [], showInfluence = false }) {
  const [hovered, setHovered] = useState(null);
  const MAP_W = 660;
  const MAP_H = 340;

  const posMap = useMemo(() => {
    const m = {};
    const countByKingdom = {};
    for (const loc of locations) {
      countByKingdom[loc.kingdom_id] = (countByKingdom[loc.kingdom_id] || 0) + 1;
    }
    const idxByKingdom = {};
    for (const loc of locations) {
      idxByKingdom[loc.kingdom_id] = (idxByKingdom[loc.kingdom_id] || 0);
      m[loc.id] = getLocPos(
        loc, kingdoms, MAP_W, MAP_H,
        idxByKingdom[loc.kingdom_id]++,
        countByKingdom[loc.kingdom_id]
      );
    }
    return m;
  }, [locations, kingdoms]);

  // Faction nüfuz haritası: loc_id → {color, pct, name}
  const influenceMap = useMemo(() => {
    if (!showInfluence || !factions.length) return {};
    const m = {};
    for (const loc of locations) {
      let best = null, bestVal = 0;
      factions.forEach((f, idx) => {
        const val = f.city_influence?.[loc.id] || 0;
        if (val > bestVal) { bestVal = val; best = { f, idx }; }
      });
      if (best && bestVal > 10) {
        m[loc.id] = {
          color: FACTION_COLORS[best.idx % FACTION_COLORS.length],
          pct: Math.min(100, bestVal),
          name: best.f.name,
        };
      }
    }
    return m;
  }, [showInfluence, factions, locations]);

  const warPairs = useMemo(() => {
    const pairs = [];
    const seen = new Set();
    for (const k of kingdoms) {
      for (const wid of (k.at_war_with || [])) {
        const key = [k.id, wid].sort().join("-");
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push([k.id, wid]);
        }
      }
    }
    return pairs;
  }, [kingdoms]);

  // Her krallık için capital bul
  const capitalPos = useMemo(() => {
    const m = {};
    for (const k of kingdoms) {
      const cap = locations.find((l) => l.kingdom_id === k.id && l.kind === "şehir");
      if (cap && posMap[cap.id]) m[k.id] = posMap[cap.id];
    }
    return m;
  }, [kingdoms, locations, posMap]);

  const hoveredLoc = hovered ? locations.find((l) => l.id === hovered) : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        className="w-full rounded-sm border border-stone-800/60"
        style={{ background: "linear-gradient(180deg, #0f0e0d 0%, #141210 100%)" }}
      >
        {/* Grain doku */}
        <defs>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 0.08 0 0 0 0 0.06 0 0 0 0 0.04 0 0 0 0.12 0" />
          </filter>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="pulse-glow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width={MAP_W} height={MAP_H} filter="url(#grain)" opacity="0.6" />

        {/* Krallık bölge arka planları */}
        {kingdoms.map((k, idx) => {
          const palette = KINGDOM_PALETTES[idx % KINGDOM_PALETTES.length];
          const zoneW = MAP_W / kingdoms.length;
          const x = idx * zoneW;
          return (
            <g key={k.id}>
              <rect
                x={x + 2}
                y={2}
                width={zoneW - 4}
                height={MAP_H - 4}
                fill={palette.zone}
                rx="2"
              />
              {/* Dikey sınır çizgisi */}
              {idx > 0 && (
                <line
                  x1={x}
                  y1={20}
                  x2={x}
                  y2={MAP_H - 20}
                  stroke="#292524"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
              )}
              {/* Krallık adı */}
              <text
                x={x + zoneW / 2}
                y={22}
                textAnchor="middle"
                fontSize="9"
                fontFamily="Cinzel, serif"
                letterSpacing="2"
                fill={palette.dim}
                style={{ textTransform: "uppercase" }}
              >
                {k.name}
              </text>
            </g>
          );
        })}

        {/* Savaş çizgileri */}
        {warPairs.map(([k1id, k2id]) => {
          const p1 = capitalPos[k1id];
          const p2 = capitalPos[k2id];
          if (!p1 || !p2) return null;
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2;
          return (
            <g key={`war-${k1id}-${k2id}`}>
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#7f1d1d"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                opacity="0.6"
              />
              <text x={mx} y={my - 4} textAnchor="middle" fontSize="11" fill="#ef4444" opacity="0.8">⚔</text>
            </g>
          );
        })}

        {/* Konum bağlantı çizgileri (aynı krallık, city→castle) */}
        {locations.filter((l) => l.kind === "kale").map((loc) => {
          const city = locations.find((l2) => l2.kind === "şehir" && l2.kingdom_id === loc.kingdom_id);
          if (!city || !posMap[loc.id] || !posMap[city.id]) return null;
          const p1 = posMap[city.id];
          const p2 = posMap[loc.id];
          return (
            <line
              key={`conn-${loc.id}`}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="#292524"
              strokeWidth="1"
              opacity="0.5"
            />
          );
        })}

        {/* Lokasyon düğümleri */}
        {locations.map((loc) => {
          const pos = posMap[loc.id];
          if (!pos) return null;
          const kIdx = kingdoms.findIndex((k) => k.id === loc.kingdom_id);
          const palette = KINGDOM_PALETTES[kIdx % KINGDOM_PALETTES.length];
          const r = NODE_SIZE[loc.kind] || 5;
          const isPlayer = loc.id === playerLocId;
          const isHovered = hovered === loc.id;

          return (
            <g
              key={loc.id}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(loc.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onLocClick(loc.id)}
            >
              {/* Faction nüfuz halkası */}
              {showInfluence && influenceMap[loc.id] && (() => {
                const inf = influenceMap[loc.id];
                const alpha = Math.max(0.15, inf.pct / 100 * 0.55);
                return (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r + 8 + (inf.pct / 100) * 6}
                    fill={inf.color}
                    opacity={alpha}
                  />
                );
              })()}

              {/* Glow halkası player için */}
              {isPlayer && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 7}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="1.5"
                  opacity="0.5"
                  filter="url(#pulse-glow)"
                >
                  <animate
                    attributeName="r"
                    values={`${r + 4};${r + 10};${r + 4}`}
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.6;0.15;0.6"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Hover halkası */}
              {isHovered && !isPlayer && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 5}
                  fill="none"
                  stroke={palette.node}
                  strokeWidth="1"
                  opacity="0.4"
                />
              )}

              {/* Ana düğüm */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isHovered ? r + 2 : r}
                fill={isPlayer ? "#f97316" : palette.node}
                opacity={isHovered ? 1 : 0.85}
                style={{ transition: "r 0.2s ease" }}
              />

              {/* İç nokta (şehirler için) */}
              {loc.kind === "şehir" && (
                <circle cx={pos.x} cy={pos.y} r={3} fill="#fef3c7" opacity="0.6" />
              )}

              {/* Player ikonı */}
              {isPlayer && (
                <text
                  x={pos.x}
                  y={pos.y - r - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#f97316"
                >
                  ●
                </text>
              )}

              {/* İsim etiketi */}
              <text
                x={pos.x}
                y={pos.y + r + 10}
                textAnchor="middle"
                fontSize={loc.kind === "şehir" ? "8" : "7"}
                fontFamily="Cinzel, serif"
                fill={isPlayer ? "#f97316" : "#a8a29e"}
                opacity={isHovered ? 1 : 0.75}
                letterSpacing="0.5"
              >
                {loc.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredLoc && (() => {
        const kIdx = kingdoms.findIndex((k) => k.id === hoveredLoc.kingdom_id);
        const palette = KINGDOM_PALETTES[kIdx % KINGDOM_PALETTES.length];
        return (
          <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
            <div className="card-frame p-2 text-xs flex items-center gap-3">
              <span className={`font-heading ${palette.text}`}>{hoveredLoc.name}</span>
              <span className="text-stone-500 capitalize">{hoveredLoc.kind}</span>
              <span className="flex items-center gap-1 text-stone-400">
                <Coins className="w-3 h-3" /> {hoveredLoc.wealth}
              </span>
              <span className="flex items-center gap-1 text-stone-400">
                <ShieldCheck className="w-3 h-3" /> {hoveredLoc.security}
              </span>
              <span className="ml-auto text-orange-500 font-heading text-[10px] tracking-wider">
                → gitmek için tıkla
              </span>
            </div>
          </div>
        );
      })()}

      {/* Lejand */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 pointer-events-none">
        {[
          { kind: "şehir", label: "Şehir", r: 5 },
          { kind: "kale", label: "Kale", r: 3.5 },
          { kind: "köy", label: "Köy", r: 2.5 },
        ].map(({ kind, label, r }) => (
          <div key={kind} className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <circle cx="6" cy="6" r={r} fill="#57534e" />
              {kind === "şehir" && <circle cx="6" cy="6" r="1.5" fill="#a8a29e" />}
            </svg>
            <span className="text-[9px] text-stone-600 font-heading tracking-wider">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 mt-0.5">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="5" fill="#f97316" opacity="0.8" />
          </svg>
          <span className="text-[9px] text-orange-500 font-heading tracking-wider">Sen</span>
        </div>
      </div>
    </div>
  );
}

// ─── Kingdom Kartı (liste görünümü) ──────────────────────────────────────────
function KingdomCard({ kingdom, locs, king, kIdx }) {
  const palette = KINGDOM_PALETTES[kIdx % KINGDOM_PALETTES.length];
  const wars = kingdom.at_war_with?.length ?? 0;

  return (
    <div className="card-frame p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="label-tiny">{kingdom.culture} · {kingdom.religion}</div>
          <h2 className={`font-heading text-lg ${palette.text}`}>{kingdom.name}</h2>
        </div>
        <Crown className={`w-4 h-4 ${palette.text}`} />
      </div>

      {king ? (
        <div className="text-xs text-stone-400 mb-3 flex items-center gap-1.5">
          <User className="w-3 h-3" />
          <span>Hükümdar: <span className="text-stone-200">{king.name}</span> ({king.age})</span>
        </div>
      ) : (
        <div className="text-xs text-red-400/70 mb-3 italic flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" /> Taht boş
        </div>
      )}

      {wars > 0 && (
        <div className="text-xs text-red-400 border border-red-900/40 bg-red-950/20 px-2 py-1 rounded-sm mb-3 flex items-center gap-1.5">
          <Swords className="w-3 h-3" /> {wars} krallıkla savaş halinde
        </div>
      )}

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-stone-500">İstikrar</span>
          <span className={`font-heading ${kingdom.stability > 60 ? "text-emerald-400" : kingdom.stability > 35 ? "text-amber-400" : "text-red-400"}`}>
            {kingdom.stability}
          </span>
        </div>
        <div className="stat-bar">
          <div
            className={`h-full ${kingdom.stability > 60 ? "stat-bar-fill-good" : kingdom.stability > 35 ? "stat-bar-fill" : "stat-bar-fill-bad"}`}
            style={{ width: `${kingdom.stability}%` }}
          />
        </div>
      </div>

      <div className="space-y-0.5">
        {locs.map((loc) => {
          const Icon = LOC_ICONS[loc.kind] || MapPin;
          return (
            <Link
              key={loc.id}
              to={`/oyun/sehir/${loc.id}`}
              className="flex items-center justify-between text-sm py-1.5 px-2 rounded-sm hover:bg-stone-900/80 group"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-stone-500 group-hover:text-orange-500" />
                <span className="text-stone-200 capitalize text-xs">{loc.name}</span>
                <span className="text-stone-600 text-[10px]">({loc.kind})</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-stone-500">
                <span className="flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" />{loc.security}</span>
                <span className="flex items-center gap-1"><Coins className="w-2.5 h-2.5" />{loc.wealth}</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-orange-500" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function WorldMap() {
  const { state } = useGame();
  const navigate = useNavigate();
  const [showInfluence, setShowInfluence] = useState(false);

  const locationsByKingdom = useMemo(() => {
    const m = {};
    for (const loc of state.world.locations) {
      m[loc.kingdom_id] = m[loc.kingdom_id] || [];
      m[loc.kingdom_id].push(loc);
    }
    return m;
  }, [state]);

  const kingFor = (kid) => {
    const kingdom = state.world.kingdoms.find((k) => k.id === kid);
    if (!kingdom?.king_id) return null;
    return state.world.npcs.find((n) => n.id === kingdom.king_id && n.alive !== false);
  };

  const playerLocId = state?.player?.location_id;
  const playerLoc = state.world.locations.find((l) => l.id === playerLocId);

  return (
    <div className="space-y-5 rise-in">
      <div>
        <div className="label-tiny">Dünya</div>
        <h1 className="font-heading text-3xl text-stone-100">Yedi Tepe Diyarı</h1>
        <p className="text-stone-400 text-sm mt-1">
          Krallıklar yaşıyor, halklar çekişiyor — sen olsan da olmasan da.
        </p>
      </div>

      {/* Konum durumu */}
      {playerLoc && (
        <div className="flex items-center gap-2 text-xs text-stone-400 border border-stone-800/50 rounded-sm px-3 py-2">
          <MapPin className="w-3.5 h-3.5 text-orange-500" />
          <span>Şu an:</span>
          <Link
            to={`/oyun/sehir/${playerLoc.id}`}
            className="text-orange-400 font-heading hover:text-orange-300"
          >
            {playerLoc.name}
          </Link>
          <span className="text-stone-600">({playerLoc.kind})</span>
        </div>
      )}

      {/* SVG Harita */}
      <div className="relative">
        {/* Nüfuz katmanı toggle */}
        <div className="flex items-center justify-end mb-2">
          <button
            onClick={() => setShowInfluence(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm border font-heading tracking-wider transition-all ${
              showInfluence
                ? "border-violet-800 bg-stone-900 text-violet-400"
                : "border-stone-800 text-stone-500 hover:text-stone-300"
            }`}
          >
            <Layers className="w-3 h-3" />
            Faction Nüfuz Katmanı
          </button>
        </div>
        <WorldSvgMap
          kingdoms={state.world.kingdoms}
          locations={state.world.locations}
          playerLocId={playerLocId}
          onLocClick={(locId) => navigate(`/oyun/sehir/${locId}`)}
          factions={state.world.factions || []}
          showInfluence={showInfluence}
        />
      </div>

        {showInfluence && (state.world.factions || []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {(state.world.factions || []).slice(0, 8).map((f, idx) => (
              <div key={f.id} className="flex items-center gap-1.5 text-[10px] text-stone-400">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ backgroundColor: FACTION_COLORS[idx % FACTION_COLORS.length], opacity: 0.7 }}
                />
                {f.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Krallık kartları */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.world.kingdoms.map((k, kIdx) => (
          <KingdomCard
            key={k.id}
            kingdom={k}
            locs={locationsByKingdom[k.id] || []}
            king={kingFor(k.id)}
            kIdx={kIdx}
          />
        ))}
      </div>
    </div>
  );
}
