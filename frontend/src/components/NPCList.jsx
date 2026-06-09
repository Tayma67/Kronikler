/**
 * NPCList.jsx — Paginated + filtered NPC roster
 *
 * Props:
 *   npcs          — full NPC array (alive only, already pre-filtered for location if needed)
 *   title?        — section header text (default "İnsanlar")
 *   locationName? — shown in sub-header
 *   pageSize?     — NPCs per page (default 30)
 *
 * Usage in TownFeed:
 *   <NPCList npcs={localNPCs} title="Yakınındakiler" locationName={playerLoc?.name} />
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Heart, Baby, ChevronLeft, ChevronRight,
  Sword, Star, Skull, Briefcase, MapPin,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE_DEFAULT = 30;

const AGE_GROUPS = [
  { key: "hepsi",    label: "Hepsi" },
  { key: "genç",     label: "Genç",     min: 0,  max: 24  },
  { key: "yetişkin", label: "Yetişkin", min: 25, max: 49  },
  { key: "yaşlı",    label: "Yaşlı",   min: 50, max: 999 },
];

// Ordered profession groups for filter pills
const PROF_GROUPS = [
  { key: "hepsi",        label: "Hepsi" },
  { key: "asker",        label: "Asker",      match: ["asker", "şövalye", "general", "muhafız", "cellat"] },
  { key: "tüccar",       label: "Tüccar",     match: ["tüccar", "sarraf", "seyyar_satıcı", "kervancı"] },
  { key: "zanaatkâr",    label: "Zanaatkâr",  match: ["demirci", "marangoz", "kunduracı", "fırıncı", "değirmenci", "çömlekçi", "dokumacı", "boyacı", "sepici", "kasap", "kuyumcu", "silahçı", "zırh_ustası", "berber"] },
  { key: "köylü",        label: "Köylü",      match: ["çiftçi", "çoban", "bahçıvan", "balıkçı", "avcı", "arıcı"] },
  { key: "din/bilim",    label: "Din & Bilim", match: ["rahip", "öğretmen", "şifacı", "eczacı", "falcı", "katip", "tellal"] },
  { key: "yönetici",     label: "Yönetici",   match: ["lord", "general", "veliaht", "kral", "vezir", "emir", "köy_muhtarı"] },
  { key: "diğer",        label: "Diğer",      match: ["müzisyen", "cambaz", "hikâyeci", "haydut", "han_sahibi", "baharat"] },
];

// ─── Skill level display ────────────────────────────────────────────────────

const SKILL_LABEL = { 1: "Çırak", 2: "Acemi", 3: "Deneyimli", 4: "Usta", 5: "Üstat" };
const SKILL_COLOR = {
  1: "text-stone-500",
  2: "text-stone-400",
  3: "text-amber-500/80",
  4: "text-orange-400",
  5: "text-yellow-400",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function profGroupKey(profession) {
  if (!profession) return "diğer";
  for (const g of PROF_GROUPS) {
    if (g.key === "hepsi") continue;
    if (g.match?.some((m) => profession.toLowerCase().includes(m))) return g.key;
  }
  return "diğer";
}

function moodColor(mood) {
  const map = {
    mutlu:    "text-emerald-400",
    huzurlu:  "text-sky-400",
    umutlu:   "text-teal-400",
    heyecanlı:"text-amber-400",
    stresli:  "text-orange-400",
    öfkeli:   "text-red-400",
    üzgün:    "text-stone-400",
    korkmuş:  "text-violet-400",
  };
  // legacy mood strings from old game state
  const legacy = {
    neşeli: "text-emerald-400", kararlı: "text-teal-400",
    yorgun: "text-stone-400",  umutsuz: "text-stone-400",
  };
  return map[mood] || legacy[mood] || "text-stone-500";
}

function moodLabel(npc) {
  return npc.current_mood || npc.mood || "?";
}

// ─── NPC Row (compact) ───────────────────────────────────────────────────────

function NPCRow({ npc }) {
  const sl     = npc.skill_level || 1;
  const hasSecrets = npc.secrets?.length > 0;

  return (
    <Link
      to={`/oyun/npc/${npc.id}`}
      className="card-frame px-3 py-2.5 flex items-center gap-3 hover:bg-stone-900/70 transition-colors group"
    >
      {/* Avatar placeholder */}
      <div className="shrink-0 w-8 h-8 rounded-sm border border-stone-700/70 bg-stone-900
                      flex items-center justify-center group-hover:border-stone-600 transition-colors">
        <Users className="w-3.5 h-3.5 text-stone-600" />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-stone-200 font-heading truncate">
          {npc.name}
          {hasSecrets && (
            <span className="ml-1 text-[9px] text-violet-500/70 font-mono tracking-wider">●</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5 flex-wrap">
          <span>{npc.age} yaş</span>
          <span className="text-stone-700">·</span>
          <span className="capitalize truncate max-w-[90px]">{npc.profession || "?"}</span>
          {npc.spouse_id && (
            <>
              <span className="text-stone-700">·</span>
              <span className="flex items-center gap-0.5 text-rose-500/70">
                <Heart className="w-2.5 h-2.5" /> Evli
              </span>
            </>
          )}
          {(npc.children_ids?.length ?? 0) > 0 && (
            <>
              <span className="text-stone-700">·</span>
              <span className="flex items-center gap-0.5">
                <Baby className="w-2.5 h-2.5" /> {npc.children_ids.length}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right column: mood + skill level */}
      <div className="text-right shrink-0 space-y-0.5">
        <div className={`text-[10px] font-heading ${moodColor(moodLabel(npc))}`}>
          {moodLabel(npc)}
        </div>
        <div className={`text-[10px] ${SKILL_COLOR[sl]}`}>
          {SKILL_LABEL[sl] || "Çırak"}
        </div>
      </div>
    </Link>
  );
}

// ─── Filter pill ─────────────────────────────────────────────────────────────

function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] px-2 py-0.5 rounded-sm font-heading tracking-wider border
                  transition-all whitespace-nowrap ${
        active
          ? "border-orange-800 bg-stone-900 text-orange-400"
          : "border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-700"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function NPCList({
  npcs = [],
  title = "İnsanlar",
  locationName,
  pageSize = PAGE_SIZE_DEFAULT,
}) {
  const [profFilter, setProfFilter] = useState("hepsi");
  const [ageFilter,  setAgeFilter]  = useState("hepsi");
  const [page,       setPage]       = useState(0);

  // Derive unique profession groups present in this NPC set
  const availableProfGroups = useMemo(() => {
    const present = new Set(npcs.map((n) => profGroupKey(n.profession)));
    return PROF_GROUPS.filter((g) => g.key === "hepsi" || present.has(g.key));
  }, [npcs]);

  // Filtered list
  const filtered = useMemo(() => {
    return npcs.filter((n) => {
      // Profession filter
      if (profFilter !== "hepsi") {
        const group = PROF_GROUPS.find((g) => g.key === profFilter);
        if (group && !group.match?.some((m) => (n.profession || "").toLowerCase().includes(m))) {
          return false;
        }
      }
      // Age filter
      if (ageFilter !== "hepsi") {
        const ag = AGE_GROUPS.find((g) => g.key === ageFilter);
        if (ag && (n.age < ag.min || n.age > ag.max)) return false;
      }
      return true;
    });
  }, [npcs, profFilter, ageFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages - 1);
  const pageNPCs   = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  // Reset to page 0 when filters change
  const handleProfFilter = (key) => { setProfFilter(key); setPage(0); };
  const handleAgeFilter  = (key) => { setAgeFilter(key);  setPage(0); };

  if (npcs.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="label-tiny flex items-center gap-2">
          <Users className="w-3 h-3" />
          {title}
          {locationName && (
            <span className="text-stone-600 flex items-center gap-1 font-normal">
              <MapPin className="w-2.5 h-2.5" /> {locationName}
            </span>
          )}
        </div>
        <div className="text-[10px] text-stone-600">
          {filtered.length} / {npcs.length} kişi
        </div>
      </div>

      {/* Profession filter row */}
      {availableProfGroups.length > 2 && (
        <div className="flex gap-1 flex-wrap">
          {availableProfGroups.map((g) => (
            <Pill
              key={g.key}
              label={g.label}
              active={profFilter === g.key}
              onClick={() => handleProfFilter(g.key)}
            />
          ))}
        </div>
      )}

      {/* Age group filter row */}
      <div className="flex gap-1">
        {AGE_GROUPS.map((ag) => (
          <Pill
            key={ag.key}
            label={ag.label}
            active={ageFilter === ag.key}
            onClick={() => handleAgeFilter(ag.key)}
          />
        ))}
      </div>

      {/* NPC rows */}
      {pageNPCs.length === 0 ? (
        <div className="card-frame p-5 text-center text-stone-600 text-xs">
          Bu filtreyle kimse bulunamadı.
        </div>
      ) : (
        <div className="grid gap-1 sm:grid-cols-2">
          {pageNPCs.map((npc) => (
            <NPCRow key={npc.id} npc={npc} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-stone-300
                       disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Önceki
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              // Show pages around current: …[3][4][5]…
              const half = 3;
              let show = i;
              if (totalPages > 7) {
                const start = Math.max(0, Math.min(safePage - half, totalPages - 7));
                show = start + i;
              }
              return (
                <button
                  key={show}
                  onClick={() => setPage(show)}
                  className={`w-5 h-5 text-[10px] rounded-sm transition-colors ${
                    show === safePage
                      ? "bg-stone-800 text-orange-400 border border-orange-900"
                      : "text-stone-600 hover:text-stone-300"
                  }`}
                >
                  {show + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-stone-300
                       disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            Sonraki <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page info */}
      {totalPages > 1 && (
        <div className="text-center text-[10px] text-stone-700">
          Sayfa {safePage + 1} / {totalPages}
          {" · "}
          {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, filtered.length)}. kişi
        </div>
      )}
    </div>
  );
}
