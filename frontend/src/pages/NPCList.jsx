import { useMemo, useState } from "react";
import { profLabel } from "@/lib/labels";
import { Link } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { Crown, Search, Heart, Sword, Minus, MapPin } from "lucide-react";

// İlişki skoru → bant, renk, ikon
function bandFromScore(score = 0) {
  if (score >=  50) return { label: "Dost",      cls: "text-emerald-400", bar: "bg-emerald-500",  icon: Heart,  iconCls: "text-emerald-400" };
  if (score >=  20) return { label: "Arkadaş",   cls: "text-emerald-300", bar: "bg-emerald-700",  icon: Heart,  iconCls: "text-emerald-300" };
  if (score >  -20) return { label: "Nötr",      cls: "text-stone-400",   bar: "bg-stone-600",    icon: Minus,  iconCls: "text-stone-500"   };
  if (score >  -50) return { label: "Rakip",     cls: "text-red-300",     bar: "bg-red-700",      icon: Sword,  iconCls: "text-red-300"     };
  return              { label: "Düşman",    cls: "text-red-400",     bar: "bg-red-500",      icon: Sword,  iconCls: "text-red-400"     };
}

// Skor → bar genişliği: -100…+100 → 0…100%
function scoreToWidth(score) {
  return Math.max(0, Math.min(100, ((score + 100) / 200) * 100));
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
    <div className="space-y-5 rise-in">
      {/* Başlık + konum bilgisi */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="label-tiny">Çevre Algısı</div>
          <h1 className="font-heading text-3xl text-stone-100">Yakınındakiler</h1>
          {/* Konum etiketi */}
          <div className="flex items-center gap-1.5 mt-1 text-xs text-stone-400">
            <MapPin className="w-3 h-3 text-amber-500" />
            <span className="text-amber-400 font-heading">{playerLocationName}</span>
            <span className="text-stone-600">·</span>
            <span>{localNpcs.length} kişi</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="text-emerald-400 flex items-center gap-1">
              <Heart className="w-3 h-3" /> {dostCount} dost / arkadaş
            </span>
            <span className="text-stone-600">·</span>
            <span className="text-red-400 flex items-center gap-1">
              <Sword className="w-3 h-3" /> {dusmanCount} rakip / düşman
            </span>
          </div>
        </div>

        {/* Filtre + sıralama + arama */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-stone-500" />
            <input
              data-testid="npc-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="İsim ara…"
              className="pl-8 pr-3 py-2 bg-stone-950 border border-stone-800 text-sm rounded-sm"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            data-testid="npc-filter"
            className="bg-stone-950 border border-stone-800 px-3 py-2 text-sm rounded-sm"
          >
            <option value="hepsi">Hepsi ({localNpcs.length})</option>
            <option value="krali">Soylular</option>
            <option value="dostlar">Dostlar & Arkadaşlar</option>
            <option value="dusman">Rakipler & Düşmanlar</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-stone-950 border border-stone-800 px-3 py-2 text-sm rounded-sm"
          >
            <option value="isim">İsme Göre</option>
            <option value="iliski_iyi">En Yakın Önce</option>
            <option value="iliski_kotu">En Düşman Önce</option>
          </select>
        </div>
      </div>

      {/* Liste */}
      <div className="card-frame divide-y divide-stone-900">
        {npcs.slice(0, 200).map((n) => {
          const rel   = state.relationships?.[n.id] ?? 0;
          const band  = bandFromScore(rel);
          const width = scoreToWidth(rel);
          const RelIcon = band.icon;
          const isRoyal   = ["kral", "veliaht"].includes(n.profession);
          const isInvader = n.is_invader === true;

          return (
            <Link
              key={n.id}
              to={`/oyun/npc/${n.id}`}
              data-testid={`npc-row-${n.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-stone-900/60 transition-colors"
            >
              {/* Soylu ikonu */}
              {isRoyal && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}

              {/* İlişki ikon göstergesi */}
              <RelIcon className={`w-3.5 h-3.5 shrink-0 ${band.iconCls}`} />

              {/* NPC bilgileri */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-stone-100 text-sm truncate">{n.name}</span>
                  {state.player?.relationship_status?.[n.id] === "married" && (
                    <span className="text-[9px] font-heading text-rose-400 border border-rose-900 px-1 py-0.5 rounded-sm shrink-0">EVLİ</span>
                  )}
                  {state.player?.relationship_status?.[n.id] === "dating" && (
                    <span className="text-[9px] font-heading text-orange-400 border border-orange-900 px-1 py-0.5 rounded-sm shrink-0">ÇIKIYOR</span>
                  )}
                  {/* BUG-5 FIX: İşgalci etiketi */}
                  {isInvader && (
                    <span className="text-[9px] font-heading text-red-400 border border-red-700 bg-red-950/40 px-1 py-0.5 rounded-sm shrink-0">⚔ İŞGALCİ</span>
                  )}
                </div>
                <div className="text-xs text-stone-500 truncate">{profLabel(n.profession)} · {n.age} yaş</div>

                {/* İlişki bar */}
                <div className="mt-1.5 h-1 bg-stone-900 rounded-full overflow-hidden w-32">
                  <div
                    className={`h-full ${band.bar} rounded-full transition-all`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>

              {/* Skor + bant etiketi */}
              <div className="text-right shrink-0">
                <div className={`text-xs font-heading ${band.cls}`}>{band.label}</div>
                <div className="text-[10px] text-stone-600 font-mono">{rel > 0 ? `+${rel}` : rel}</div>
              </div>
            </Link>
          );
        })}
        {npcs.length === 0 && localNpcs.length > 0 && (
          <div className="px-4 py-6 text-stone-500 text-sm">Bu filtreyle kimse bulunamadı.</div>
        )}
        {localNpcs.length === 0 && (
          <div className="px-4 py-6 text-stone-500 text-sm">Bu konumda kimse yok.</div>
        )}
      </div>

      {npcs.length > 200 && (
        <div className="text-xs text-stone-500">İlk 200 sonuç gösteriliyor.</div>
      )}
    </div>
  );
}
