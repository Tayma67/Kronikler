import { useState, useMemo } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Baby, Heart, Sword, BookOpen, Star, Crown,
  Loader2, UserCircle, GitBranch, Hourglass,
} from "lucide-react";

const STAT_ICONS = { str: "⚔", agi: "🏃", int: "📖", cha: "💬", end: "🛡" };
const STAT_LABELS = { str: "Güç", agi: "Çeviklik", int: "Zeka", cha: "Karizma", end: "Dayanıklılık" };
const SKILL_LABELS = { combat: "Dövüş", trade: "Ticaret", crafting: "Zanaat", social: "Sosyal" };

function StatBar({ val, max = 100 }) {
  const pct = Math.min(100, Math.round((val / max) * 100));
  const color = val >= 70 ? "stat-bar-fill-good" : val >= 40 ? "stat-bar-fill" : "stat-bar-fill-bad";
  return (
    <div className="stat-bar flex-1">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ChildCard({ child, isHeir, onSetHeir }) {
  const stats = child.stats || {};
  const skills = child.skills || {};
  const age = child.age || 0;
  const isAdult = age >= 18;

  return (
    <div className={`card-frame p-4 space-y-3 ${isHeir ? "border-amber-800/60 ring-1 ring-amber-900/40" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="label-tiny">{isAdult ? "Yetişkin Çocuk" : age >= 13 ? "Genç" : "Çocuk"}</div>
          <div className="font-heading text-stone-100 text-lg">{child.name}</div>
          <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
            <span>{age} yaş</span>
            <span>·</span>
            <span className="capitalize">{child.gender === "erkek" ? "Erkek" : "Kız"}</span>
            {child.profession && (
              <><span>·</span><span className="capitalize">{child.profession}</span></>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {isHeir && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 border border-amber-900/40 px-2 py-0.5 rounded-sm font-heading">
              <Crown className="w-2.5 h-2.5" /> Vâris
            </span>
          )}
          {!isHeir && (
            <button
              onClick={() => onSetHeir(child.id)}
              className="text-[10px] btn-ghost-ash px-2 py-0.5 font-heading tracking-wider"
            >
              Vâris Yap
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-1.5">
        <div className="label-tiny">Özellikler</div>
        {Object.entries(stats).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className="w-14 text-stone-500 flex items-center gap-1">
              <span>{STAT_ICONS[key]}</span>
              <span>{STAT_LABELS[key] || key}</span>
            </span>
            <StatBar val={val} max={100} />
            <span className="w-6 text-right text-stone-400 font-heading">{val}</span>
          </div>
        ))}
      </div>

      {/* Skills */}
      {Object.keys(skills).length > 0 && (
        <div className="space-y-1">
          <div className="label-tiny">Beceriler</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(skills)
              .filter(([, v]) => v > 0)
              .map(([key, val]) => (
                <div key={key} className="flex items-center gap-1 text-[10px] border border-stone-800 rounded-sm px-2 py-1">
                  <span className="text-stone-400">{SKILL_LABELS[key] || key}</span>
                  <span className="text-amber-400 font-heading">{val}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Health bar */}
      <div className="flex items-center gap-2 text-xs">
        <Heart className="w-3 h-3 text-red-400" />
        <StatBar val={child.health || 0} />
        <span className="text-stone-500 w-8 text-right">{child.health || 0}</span>
      </div>
    </div>
  );
}

function InheritanceSummary({ player, children }) {
  if (!children.length) return null;

  const inherited_money = Math.round((player.money || 0) * 0.60);
  const inherited_rep = Math.round((player.reputation || 0) * 0.20);

  return (
    <div className="card-frame p-4 space-y-3 border-stone-700/60">
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-stone-400" />
        <span className="font-heading text-stone-200">Miras Önizlemesi</span>
      </div>
      <p className="text-xs text-stone-400">
        {player.name} ölürse, seçili vâris şunları devralır:
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="border border-stone-800 rounded-sm p-2">
          <div className="label-tiny">Altın Mirası</div>
          <div className="font-heading text-amber-400 text-lg">{inherited_money}A</div>
          <div className="text-stone-600 text-[10px]">toplam paranın %60'ı</div>
        </div>
        <div className="border border-stone-800 rounded-sm p-2">
          <div className="label-tiny">İtibar Mirası</div>
          <div className="font-heading text-sky-400 text-lg">{inherited_rep}</div>
          <div className="text-stone-600 text-[10px]">toplam itibarın %20'si</div>
        </div>
      </div>
      <div className="text-xs text-stone-500">
        Stat mirası: Ebeveyn statlarının <span className="text-stone-300">%30'u</span> alınır.
      </div>
    </div>
  );
}

function SpouseCard({ spouse }) {
  if (!spouse) return null;
  return (
    <div className="card-frame p-3 flex items-center gap-3">
      <UserCircle className="w-8 h-8 text-rose-500/60" />
      <div>
        <div className="label-tiny">Eş</div>
        <div className="font-heading text-stone-100">{spouse.name}</div>
        <div className="text-xs text-stone-500">{spouse.age} yaş · {spouse.profession}</div>
      </div>
      <div className="ml-auto text-xs text-stone-500">
        Sağlık: <span className="text-stone-300">{spouse.health}</span>
      </div>
    </div>
  );
}

function EmptyFamily() {
  return (
    <div className="card-frame p-8 text-center space-y-3 border-stone-800/50">
      <Baby className="w-10 h-10 text-stone-700 mx-auto" />
      <div className="font-heading text-stone-400">Henüz çocuğun yok</div>
      <p className="text-stone-600 text-sm max-w-xs mx-auto">
        Evlen ve aile kur. Çocukların büyür, onlarla devam edebilirsin.
      </p>
    </div>
  );
}

export default function Generation() {
  const { state, fetchState } = useGame();
  const [busy, setBusy] = useState(false);

  const player = state?.player || {};
  const npcs = state?.world?.npcs || [];
  const generation = state?.generation || 1;

  const spouse = useMemo(() => {
    if (!player.spouse_id) return null;
    return npcs.find(n => n.id === player.spouse_id && n.alive !== false);
  }, [npcs, player.spouse_id]);

  const children = useMemo(() => {
    const ids = player.children_ids || [];
    return ids
      .map(id => npcs.find(n => n.id === id))
      .filter(Boolean)
      .filter(n => n.alive !== false);
  }, [npcs, player.children_ids]);

  // Find which child is designated heir
  const heirId = useMemo(() => {
    // Youngest adult, or oldest child
    const adults = children.filter(c => c.age >= 18);
    if (adults.length) return adults.sort((a, b) => a.age - b.age)[0]?.id;
    return children.sort((a, b) => (b.age || 0) - (a.age || 0))[0]?.id;
  }, [children]);

  const [selectedHeirId, setSelectedHeirId] = useState(null);
  const effectiveHeirId = selectedHeirId || heirId;

  // Inheritance summary for current player
  const inheritSummary = useMemo(() => {
    return state?.inheritance_summary;
  }, [state]);

  return (
    <div className="space-y-5 rise-in">
      <div>
        <div className="label-tiny">Soy</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <Baby className="w-6 h-6 text-rose-500/80" /> Nesil & Aile
        </h1>
        <p className="text-stone-400 text-sm mt-1">
          Ailenin büyüsün. Çocukların güçlensin. Neslin yaşasın.
        </p>
      </div>

      {/* Nesil sayacı */}
      <div className="card-frame p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-orange-500" />
          <span className="label-tiny">Aktif Nesil</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-heading text-2xl text-orange-400">{generation}</span>
          <span className="text-stone-500 text-xs">. Kuşak</span>
        </div>
      </div>

      {/* Miras özeti (önceki oyuncudan aktarım) */}
      {inheritSummary && (
        <div className="card-frame p-4 space-y-2 border-amber-900/40 bg-amber-950/10">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="font-heading text-amber-400">Miras Alındı</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-stone-500">Altın: </span>
              <span className="text-amber-400 font-heading">+{inheritSummary.inherited_money}A</span>
            </div>
            <div>
              <span className="text-stone-500">İtibar: </span>
              <span className="text-sky-400 font-heading">+{inheritSummary.inherited_reputation}</span>
            </div>
          </div>
          {inheritSummary.inherited_stats && (
            <div className="text-xs text-stone-400">
              Stat bonusu: {Object.entries(inheritSummary.inherited_stats)
                .map(([k, v]) => `+${v} ${STAT_LABELS[k] || k}`)
                .join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Eş */}
      {spouse && <SpouseCard spouse={spouse} />}
      {!spouse && player.age >= 18 && (
        <div className="card-frame p-3 text-center text-xs text-stone-500 border-stone-800/40">
          Bekârsın · Evlilik için <a href="/oyun/evlilik" className="text-orange-400 underline">Evlilik ekranına</a> git
        </div>
      )}

      {/* Çocuklar */}
      <div className="space-y-3">
        <div className="label-tiny">Çocuklar ({children.length})</div>
        {children.length === 0
          ? <EmptyFamily />
          : children.map(child => (
              <ChildCard
                key={child.id}
                child={child}
                isHeir={child.id === effectiveHeirId}
                onSetHeir={setSelectedHeirId}
              />
            ))
        }
      </div>

      {/* Miras önizlemesi */}
      {children.length > 0 && (
        <InheritanceSummary player={player} children={children} />
      )}

      {/* Büyüme göstergesi */}
      {children.filter(c => c.age < 18).length > 0 && (
        <div className="card-frame p-3 space-y-2 border-stone-800/40">
          <div className="flex items-center gap-2">
            <Hourglass className="w-3.5 h-3.5 text-stone-500" />
            <span className="label-tiny">Büyüme Süreci</span>
          </div>
          {children
            .filter(c => c.age < 18)
            .map(c => {
              const yearsLeft = 18 - c.age;
              const pct = Math.round((c.age / 18) * 100);
              return (
                <div key={c.id} className="flex items-center gap-2 text-xs">
                  <span className="text-stone-400 w-24 truncate">{c.name}</span>
                  <div className="stat-bar flex-1">
                    <div className="h-full stat-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-stone-500 w-24 text-right">{c.age} yaş · {yearsLeft}y kaldı</span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
