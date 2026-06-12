import { useMemo, useState } from "react";
import { profLabel } from "@/lib/labels";
import { useGame } from "@/lib/GameContext";
import { Link } from "react-router-dom";
import {
  Users, Heart, Sword, MessageSquare, Skull, Star,
  Baby, MapPin, Clock, Filter, AlertCircle, Flame,
} from "lucide-react";
import NPCList from "@/components/NPCList";

const EVENT_TYPE_ICONS = {
  "savaş": { icon: Sword, color: "text-red-400", bg: "bg-red-950/20", border: "border-red-900/30" },
  "ticaret": { icon: Star, color: "text-amber-400", bg: "bg-amber-950/15", border: "border-amber-900/30" },
  "evlilik": { icon: Heart, color: "text-rose-400", bg: "bg-rose-950/15", border: "border-rose-900/30" },
  "ölüm": { icon: Skull, color: "text-stone-400", bg: "bg-stone-900/40", border: "border-stone-700/40" },
  "doğum": { icon: Baby, color: "text-sky-400", bg: "bg-sky-950/15", border: "border-sky-900/30" },
  "quest": { icon: Star, color: "text-orange-400", bg: "bg-orange-950/15", border: "border-orange-900/30" },
  "faction": { icon: Flame, color: "text-violet-400", bg: "bg-violet-950/15", border: "border-violet-900/30" },
  "dedikodu": { icon: MessageSquare, color: "text-emerald-400", bg: "bg-emerald-950/15", border: "border-emerald-900/30" },
  "default": { icon: AlertCircle, color: "text-stone-500", bg: "bg-stone-900/20", border: "border-stone-800/30" },
};

function getEventMeta(type) {
  const key = Object.keys(EVENT_TYPE_ICONS).find(k => type?.includes(k));
  return EVENT_TYPE_ICONS[key] || EVENT_TYPE_ICONS.default;
}

function FeedEvent({ event, turn }) {
  const meta = getEventMeta(event.type);
  const Icon = meta.icon;
  const ago = Math.max(0, (turn || 0) - (event.turn || 0));
  return (
    <div className={`border rounded-sm p-3 flex gap-3 ${meta.bg} ${meta.border}`}>
      <div className={`shrink-0 mt-0.5 ${meta.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200">{event.text || event.summary || "Bilinmeyen olay"}</p>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-600">
          <Clock className="w-2.5 h-2.5" />
          {ago === 0 ? "Bu hafta" : `${ago} ay önce`}
          {event.location && (
            <><span>·</span><span className="capitalize">{event.location}</span></>
          )}
        </div>
      </div>
    </div>
  );
}

function NPCCard({ npc }) {
  const mood = npc.happiness > 70 ? "mutlu" : npc.happiness > 40 ? "nötr" : "mutsuz";
  const moodColor = mood === "mutlu" ? "text-emerald-400" : mood === "nötr" ? "text-stone-400" : "text-red-400";

  return (
    <Link
      to={`/oyun/npc/${npc.id}`}
      className="card-frame p-3 flex items-center gap-3 hover:bg-stone-900/60 transition-colors"
    >
      <div className="shrink-0">
        <div className="w-9 h-9 rounded-sm border border-stone-700 bg-stone-900 flex items-center justify-center">
          <Users className="w-4 h-4 text-stone-500" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-stone-200 font-heading">{npc.name}</div>
        <div className="text-[10px] text-stone-500 flex items-center gap-2">
          <span>{npc.age} yaş</span>
          <span>·</span>
          <span className="capitalize">{profLabel(npc.profession)}</span>
          {npc.spouse_id && <><span>·</span><span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 text-rose-500" /> Evli</span></>}
        </div>
      </div>
      <div className="text-right">
        <div className={`text-xs font-heading ${moodColor}`}>{mood}</div>
        {(npc.children_ids?.length ?? 0) > 0 && (
          <div className="text-[10px] text-stone-500 flex items-center justify-end gap-1">
            <Baby className="w-2.5 h-2.5" /> {npc.children_ids.length}
          </div>
        )}
      </div>
    </Link>
  );
}

function RelationshipCard({ npc, relType }) {
  const colors = {
    dost: "text-emerald-400 border-emerald-900/40",
    düşman: "text-red-400 border-red-900/40",
    aşk: "text-rose-400 border-rose-900/40",
    nötr: "text-stone-400 border-stone-700/40",
  };
  const c = colors[relType] || colors.nötr;
  return (
    <div className={`border rounded-sm px-3 py-2 flex items-center justify-between text-xs ${c}`}>
      <span className="text-stone-300">{npc.name}</span>
      <span className={`font-heading ${c.split(" ")[0]}`}>{relType}</span>
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
    <div className="space-y-5 rise-in">
      <div>
        <div className="label-tiny">Kasaba</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <Users className="w-6 h-6 text-sky-400/80" /> Kasaba Hayatı
        </h1>
        <p className="text-stone-400 text-sm mt-1">
          İnsanlar ne yapıyor, kim kimle, neler oluyor?
        </p>
      </div>

      {/* Konum */}
      {playerLoc && (
        <div className="flex items-center gap-2 text-xs text-stone-400 border border-stone-800/50 rounded-sm px-3 py-2">
          <MapPin className="w-3.5 h-3.5 text-orange-500" />
          <span>Şu an: <span className="text-orange-400 font-heading">{playerLoc.name}</span></span>
          <span className="text-stone-600">·</span>
          <span>{localNPCs.length} kişi burada</span>
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
        <div className="space-y-2">
          <div className="label-tiny">Sana Bağlı Olanlar</div>
          <div className="space-y-1.5">
            {relationships.map(({ npc, relType }) => (
              <RelationshipCard key={npc.id} npc={npc} relType={relType} />
            ))}
          </div>
        </div>
      )}

      {/* Kasaba Dedikodları */}
      {drama.length > 0 && (
        <div className="space-y-2">
          <div className="label-tiny flex items-center gap-2">
            <MessageSquare className="w-3 h-3" /> Fısıltılar
          </div>
          <div className="space-y-1.5">
            {drama.map((d, i) => (
              <div key={i} className="text-xs text-stone-400 border border-stone-800/40 rounded-sm px-3 py-2 italic">
                "{d.text}"
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Olaylar akışı */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="label-tiny flex items-center gap-2">
            <Clock className="w-3 h-3" /> Olay Akışı
          </div>
          {/* Filter */}
          <div className="flex gap-1">
            {["hepsi", "lokasyon", "önemli"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] px-2 py-0.5 rounded-sm font-heading tracking-wider border transition-all capitalize ${
                  filter === f
                    ? "border-orange-800 bg-stone-900 text-orange-400"
                    : "border-stone-800 text-stone-500 hover:text-stone-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="card-frame p-6 text-center text-stone-500 text-sm">
            Henüz kayıtlı olay yok
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredEvents.map((event, i) => (
              <FeedEvent key={i} event={event} turn={turn} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
