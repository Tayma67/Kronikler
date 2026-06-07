import { useState, useMemo } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Baby, Heart, Sword, BookOpen, Star, Crown,
  Loader2, UserCircle, GitBranch, Hourglass,
  ChevronDown, ChevronUp, X, Coins, Shield,
  Hammer, MessageSquare, Stethoscope, Briefcase,
  TrendingUp, Scroll,
} from "lucide-react";

/* ─────────────────── Sabitler ─────────────────── */
const STAT_ICONS  = { strength: "⚔", intelligence: "📖", charisma: "💬", stamina: "🛡", str: "⚔", agi: "🏃", int: "📖", cha: "💬", end: "🛡" };
const STAT_LABELS = { strength: "Güç", intelligence: "Zeka", charisma: "Karizma", stamina: "Dayanıklılık", str: "Güç", agi: "Çeviklik", int: "Zeka", cha: "Karizma", end: "Dayanıklılık" };
const SKILL_LABELS= { combat: "Dövüş", trade: "Ticaret", crafting: "Zanaat", social: "Sosyal" };

const INVEST_OPTIONS = [
  { type: "egitim",         label: "Eğitim",         desc: "Zekasını artır",       cost: 50, icon: BookOpen,     color: "text-sky-400",    gainLabel: "+5 Zeka" },
  { type: "savas_egitimi",  label: "Savaş Eğitimi",  desc: "Gücünü ve dövüşünü artır", cost: 50, icon: Sword, color: "text-red-400",  gainLabel: "+5 Güç, +5 Dövüş" },
  { type: "zanaat_egitimi", label: "Zanaat Eğitimi", desc: "Zanaat becerisini artır",   cost: 40, icon: Hammer, color: "text-orange-400", gainLabel: "+5 Zanaat" },
  { type: "sosyal_egitim",  label: "Sosyal Eğitim",  desc: "Karizmasını ve sosyal becerisini artır", cost: 40, icon: MessageSquare, color: "text-emerald-400", gainLabel: "+5 Karizma, +5 Sosyal" },
  { type: "saglik_bakimi",  label: "Sağlık Bakımı",  desc: "Sağlığını yenile",      cost: 30, icon: Stethoscope,  color: "text-rose-400",   gainLabel: "+15 Sağlık" },
];

const PROFESSION_OPTIONS = [
  "çiftçi", "tüccar", "asker", "zanaatkar", "din adamı",
  "seyyar satıcı", "şifacı", "muhafız", "mülteci", "çoban",
  "kasap", "demirci", "aşçı", "öğretmen", "kâtip",
];

/* ─────────────────── Yardımcı Bileşenler ─────────────────── */
function StatBar({ val, max = 100 }) {
  const pct = Math.min(100, Math.round(((val || 0) / max) * 100));
  const color = val >= 70 ? "stat-bar-fill-good" : val >= 40 ? "stat-bar-fill" : "stat-bar-fill-bad";
  return (
    <div className="stat-bar flex-1">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Pill({ children, color = "border-stone-700 text-stone-400" }) {
  return (
    <span className={`inline-flex items-center gap-1 border rounded-sm px-2 py-0.5 text-[10px] font-heading tracking-wider ${color}`}>
      {children}
    </span>
  );
}

/* ─────────────────── InvestModal ─────────────────── */
function InvestModal({ child, playerMoney, onClose, onConfirm, busy }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm card-frame rounded-sm space-y-4 p-5 rise-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="label-tiny">Yatırım Yap</div>
            <div className="font-heading text-stone-100 text-lg">{child.name}</div>
          </div>
          <button onClick={onClose} className="text-stone-600 hover:text-stone-300"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-400 border border-stone-800 rounded-sm px-3 py-2">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>Mevcut altın:</span>
          <span className="text-amber-400 font-heading">{playerMoney}A</span>
        </div>

        <div className="space-y-2">
          {INVEST_OPTIONS.map((opt) => {
            const canAfford = playerMoney >= opt.cost;
            const isSelected = selected?.type === opt.type;
            const Icon = opt.icon;
            return (
              <button
                key={opt.type}
                disabled={!canAfford}
                onClick={() => setSelected(opt)}
                className={`w-full text-left border rounded-sm px-3 py-2.5 transition-all
                  ${isSelected ? "border-orange-700 bg-orange-950/30" : "border-stone-800 bg-stone-900/40"}
                  ${!canAfford ? "opacity-40 cursor-not-allowed" : "hover:border-stone-600 cursor-pointer"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${opt.color}`} />
                    <span className="font-heading text-stone-200 text-sm">{opt.label}</span>
                  </div>
                  <span className="text-amber-400 font-heading text-sm">{opt.cost}A</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-stone-500 text-xs">{opt.desc}</span>
                  <span className={`text-xs font-heading ${opt.color}`}>{opt.gainLabel}</span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          disabled={!selected || busy}
          onClick={() => selected && onConfirm(child.id, selected.type)}
          className="w-full btn-primary-ash py-2.5 font-heading tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {selected ? `${selected.label} — ${selected.cost}A Harca` : "Yatırım Seç"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── SetProfessionModal ─────────────────── */
function SetProfessionModal({ child, onClose, onConfirm, busy }) {
  const [profession, setProfession] = useState(child.profession || "");
  const [custom, setCustom] = useState("");

  const finalProfession = custom.trim() || profession;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm card-frame rounded-sm space-y-4 p-5 rise-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="label-tiny">Meslek Ata</div>
            <div className="font-heading text-stone-100 text-lg">{child.name}</div>
          </div>
          <button onClick={onClose} className="text-stone-600 hover:text-stone-300"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PROFESSION_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => { setProfession(p); setCustom(""); }}
              className={`text-xs px-2.5 py-1 border rounded-sm font-heading tracking-wider transition-all
                ${profession === p && !custom ? "border-orange-700 text-orange-300 bg-orange-950/30" : "border-stone-800 text-stone-500 hover:border-stone-600 hover:text-stone-300"}`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <div className="label-tiny">Veya Özel Meslek Gir</div>
          <input
            value={custom}
            onChange={(e) => { setCustom(e.target.value); setProfession(""); }}
            placeholder="ör. kâhin, casus, gezgin..."
            className="w-full bg-stone-900 border border-stone-800 rounded-sm px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-600"
          />
        </div>

        <button
          disabled={!finalProfession || busy}
          onClick={() => finalProfession && onConfirm(child.id, finalProfession)}
          className="w-full btn-primary-ash py-2.5 font-heading tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {finalProfession ? `"${finalProfession}" Olarak Ata` : "Meslek Seç"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── ChildDetailModal ─────────────────── */
function ChildDetailModal({ child, isHeir, playerMoney, factions, onClose, onSetHeir, onInvest, onSetProfession }) {
  const stats  = child.stats  || {};
  const skills = child.skills || {};
  const age    = child.age || 0;
  const isAdult = age >= 18;
  const isTeen  = age >= 13 && age < 18;

  // Faction üyeliği
  const childFaction = useMemo(() => {
    if (!factions?.length) return null;
    return factions.find(f =>
      (f.member_ids || []).includes(child.id) ||
      (f.members || []).some(m => m.id === child.id || m === child.id)
    );
  }, [factions, child.id]);

  const [showInvest, setShowInvest]         = useState(false);
  const [showProfession, setShowProfession] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/80 p-4">
      {/* Invest modal üstte */}
      {showInvest && (
        <InvestModal
          child={child}
          playerMoney={playerMoney}
          onClose={() => setShowInvest(false)}
          onConfirm={(cid, type) => { setShowInvest(false); onInvest(cid, type); }}
          busy={false}
        />
      )}
      {showProfession && (
        <SetProfessionModal
          child={child}
          onClose={() => setShowProfession(false)}
          onConfirm={(cid, prof) => { setShowProfession(false); onSetProfession(cid, prof); }}
          busy={false}
        />
      )}

      {!showInvest && !showProfession && (
        <div className="w-full max-w-sm card-frame rounded-sm space-y-4 p-5 rise-in max-h-[90vh] overflow-y-auto">
          {/* Başlık */}
          <div className="flex items-start justify-between">
            <div>
              <div className="label-tiny">{isAdult ? "Yetişkin Çocuk" : isTeen ? "Genç" : "Çocuk"}</div>
              <div className="font-heading text-stone-100 text-2xl">{child.name}</div>
              <div className="text-xs text-stone-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                <span>{age} yaş</span>
                <span>·</span>
                <span>{child.gender === "erkek" ? "Erkek" : "Kız"}</span>
                {child.profession && <><span>·</span><span className="capitalize">{child.profession}</span></>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {isHeir && <Pill color="border-amber-800/50 text-amber-400"><Crown className="w-2.5 h-2.5" /> Vâris</Pill>}
              <button onClick={onClose} className="text-stone-600 hover:text-stone-300 mt-1"><X className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Faction rozeti */}
          {childFaction && (
            <div className="flex items-center gap-2 border border-stone-800 rounded-sm px-3 py-2 text-xs">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-stone-400">Faction:</span>
              <span className="text-sky-300 font-heading">{childFaction.name}</span>
              <Pill color="border-sky-800/40 text-sky-400">{childFaction.type || "grup"}</Pill>
            </div>
          )}

          {/* Sağlık */}
          <div className="flex items-center gap-2 text-xs">
            <Heart className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-stone-500 w-16">Sağlık</span>
            <StatBar val={child.health || 0} />
            <span className="text-stone-400 w-8 text-right font-heading">{child.health || 0}</span>
          </div>

          {/* Stats */}
          <div className="space-y-1.5">
            <div className="label-tiny">Özellikler</div>
            {Object.entries(stats).length > 0
              ? Object.entries(stats).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-stone-500 flex items-center gap-1 shrink-0">
                      <span>{STAT_ICONS[key] || "•"}</span>
                      <span>{STAT_LABELS[key] || key}</span>
                    </span>
                    <StatBar val={val} max={100} />
                    <span className="w-6 text-right text-stone-400 font-heading">{val}</span>
                  </div>
                ))
              : <p className="text-xs text-stone-600 italic">Henüz stat verisi yok.</p>
            }
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

          {/* Büyüme ilerlemesi (reşit değilse) */}
          {!isAdult && (
            <div className="border border-stone-800 rounded-sm px-3 py-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500 flex items-center gap-1"><Hourglass className="w-3 h-3" /> Büyüme</span>
                <span className="text-stone-400">{18 - age} yıl kaldı</span>
              </div>
              <div className="stat-bar">
                <div className="h-full stat-bar-fill" style={{ width: `${Math.round((age / 18) * 100)}%` }} />
              </div>
            </div>
          )}

          {/* Aksiyon butonları */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {!isHeir && (
              <button
                onClick={() => { onSetHeir(child.id); onClose(); }}
                className="btn-ghost-ash py-2 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5" /> Vâris Yap
              </button>
            )}
            <button
              onClick={() => setShowInvest(true)}
              className={`btn-primary-ash py-2 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 ${isHeir ? "col-span-2" : ""}`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Yatırım Yap
            </button>
            {(isTeen || isAdult) && (
              <button
                onClick={() => setShowProfession(true)}
                className="col-span-2 btn-ghost-ash py-2 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 border-stone-700"
              >
                <Briefcase className="w-3.5 h-3.5" /> Meslek Ata
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── ChildCard ─────────────────── */
function ChildCard({ child, isHeir, factions, onSetHeir, onOpenDetail }) {
  const age       = child.age || 0;
  const isAdult   = age >= 18;
  const isTeen    = age >= 13 && age < 18;
  const ageLabel  = isAdult ? "Yetişkin" : isTeen ? "Genç" : "Çocuk";
  const pct       = Math.min(100, Math.round((age / 18) * 100));

  const childFaction = useMemo(() => {
    if (!factions?.length) return null;
    return factions.find(f =>
      (f.member_ids || []).includes(child.id) ||
      (f.members || []).some(m => m.id === child.id || m === child.id)
    );
  }, [factions, child.id]);

  return (
    <div
      className={`card-frame p-4 space-y-2.5 cursor-pointer hover:border-stone-600 transition-all ${isHeir ? "border-amber-800/60 ring-1 ring-amber-900/40" : ""}`}
      onClick={onOpenDetail}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="label-tiny">{ageLabel}</div>
          <div className="font-heading text-stone-100 text-lg">{child.name}</div>
          <div className="text-xs text-stone-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            <span>{age} yaş</span>
            <span>·</span>
            <span>{child.gender === "erkek" ? "Erkek" : "Kız"}</span>
            {child.profession && <><span>·</span><span className="capitalize">{child.profession}</span></>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {isHeir && <Pill color="border-amber-800/50 text-amber-400"><Crown className="w-2.5 h-2.5" /> Vâris</Pill>}
          {childFaction && <Pill color="border-sky-800/40 text-sky-400"><Shield className="w-2.5 h-2.5" /> {childFaction.name}</Pill>}
        </div>
      </div>

      {/* Sağlık + Büyüme çubuğu */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="label-tiny mb-1">Sağlık</div>
          <div className="flex items-center gap-1.5">
            <StatBar val={child.health || 0} />
            <span className="text-stone-500 w-6 text-right">{child.health || 0}</span>
          </div>
        </div>
        {!isAdult && (
          <div>
            <div className="label-tiny mb-1">Büyüme</div>
            <div className="flex items-center gap-1.5">
              <div className="stat-bar flex-1">
                <div className="h-full stat-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-stone-500 w-8 text-right">{18 - age}y</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-stone-600 pt-0.5">
        <span>Detay için dokun</span>
        <ChevronDown className="w-3 h-3" />
      </div>
    </div>
  );
}

/* ─────────────────── LegacyPanel ─────────────────── */
function LegacyPanel({ legacyHistory, generation }) {
  const [expanded, setExpanded] = useState(false);

  if (!legacyHistory?.length && generation <= 1) return null;

  return (
    <div className="card-frame p-4 space-y-3 border-stone-800/40">
      <button
        className="flex items-center justify-between w-full"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <Scroll className="w-4 h-4 text-stone-500" />
          <span className="font-heading text-stone-300">Nesil Geçmişi</span>
          <Pill color="border-stone-700 text-stone-500">{generation}. Kuşak</Pill>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-stone-600" /> : <ChevronDown className="w-4 h-4 text-stone-600" />}
      </button>

      {expanded && (
        <div className="space-y-2 pt-1">
          {(!legacyHistory || legacyHistory.length === 0) ? (
            <p className="text-xs text-stone-600 italic">Bu ilk nesil — geçmiş yok.</p>
          ) : (
            legacyHistory.slice().reverse().map((entry, idx) => (
              <div key={idx} className="border-l-2 border-stone-800 pl-3 py-1 space-y-0.5">
                {entry.previous_name && (
                  <div className="text-sm font-heading text-stone-300">{entry.previous_name}</div>
                )}
                <div className="text-xs text-stone-600">
                  {entry.generation && <span>{entry.generation}. Nesil</span>}
                  {entry.generation_turn != null && <span> · Tur {entry.generation_turn}</span>}
                  {entry.origin && (
                    <span className="ml-1">
                      · {entry.origin === "çocuk" ? "çocukla devam" : "sürgün olarak başladı"}
                    </span>
                  )}
                </div>
                {entry.inherited_money > 0 && (
                  <div className="text-[10px] text-amber-700">+{entry.inherited_money}A miras</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── InheritanceSummary ─────────────────── */
function InheritanceSummary({ player, children }) {
  if (!children.length) return null;
  const inherited_money = Math.round((player.money || 0) * 0.60);
  const inherited_rep   = Math.round((player.reputation || 0) * 0.20);

  return (
    <div className="card-frame p-4 space-y-3 border-stone-700/60">
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-stone-400" />
        <span className="font-heading text-stone-200">Miras Önizlemesi</span>
      </div>
      <p className="text-xs text-stone-400">{player.name} ölürse, seçili vâris şunları devralır:</p>
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

/* ─────────────────── SpouseCard ─────────────────── */
function SpouseCard({ spouse }) {
  if (!spouse) return null;
  return (
    <div className="card-frame p-3 flex items-center gap-3">
      <UserCircle className="w-8 h-8 text-rose-500/60 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="label-tiny">Eş</div>
        <div className="font-heading text-stone-100 truncate">{spouse.name}</div>
        <div className="text-xs text-stone-500">{spouse.age} yaş · {spouse.profession}</div>
      </div>
      <div className="text-xs text-stone-500 shrink-0">
        <Heart className="w-3 h-3 text-red-400 inline mr-1" />
        <span>{spouse.health}</span>
      </div>
    </div>
  );
}

/* ─────────────────── EmptyFamily ─────────────────── */
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

/* ─────────────────── Ana Sayfa ─────────────────── */
export default function Generation() {
  const { state, fetchState } = useGame();
  const [busy, setBusy]             = useState(false);
  const [activeChildId, setActiveChildId] = useState(null);
  const [selectedHeirId, setSelectedHeirId] = useState(null);

  const player     = state?.player || {};
  const npcs       = state?.world?.npcs || [];
  const factions   = state?.world?.factions || [];
  const generation = state?.generation || 1;
  const legacyHistory = state?.legacy_history || [];

  const spouse = useMemo(() => {
    if (!player.spouse_id) return null;
    return npcs.find(n => n.id === player.spouse_id && n.alive !== false);
  }, [npcs, player.spouse_id]);

  const children = useMemo(() => {
    const ids = player.children_ids || [];
    return ids.map(id => npcs.find(n => n.id === id)).filter(Boolean).filter(n => n.alive !== false);
  }, [npcs, player.children_ids]);

  // Otomatik varis seçimi
  const autoHeirId = useMemo(() => {
    const adults = children.filter(c => c.age >= 18);
    if (adults.length) return adults.sort((a, b) => a.age - b.age)[0]?.id;
    return children.sort((a, b) => (b.age || 0) - (a.age || 0))[0]?.id;
  }, [children]);

  const effectiveHeirId = selectedHeirId || autoHeirId;
  const activeChild     = activeChildId ? children.find(c => c.id === activeChildId) : null;

  /* Yatırım yap */
  const handleInvest = async (childId, investmentType) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/children/invest", {
        child_id: childId,
        investment_type: investmentType,
      });
      const opt = INVEST_OPTIONS.find(o => o.type === investmentType);
      toast.success(`${data.child_name} için ${opt?.label || investmentType} tamamlandı! (${data.cost}A)`);
      if (fetchState) await fetchState();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Yatırım başarısız.");
    } finally {
      setBusy(false);
      setActiveChildId(null);
    }
  };

  /* Meslek ata */
  const handleSetProfession = async (childId, profession) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/children/set_profession", {
        child_id: childId,
        profession,
      });
      toast.success(`${data.child_name} artık ${profession}!`);
      if (fetchState) await fetchState();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Meslek atanamadı.");
    } finally {
      setBusy(false);
      setActiveChildId(null);
    }
  };

  const inheritSummary = state?.inheritance_summary;

  return (
    <div className="space-y-5 rise-in">
      {/* Detay modalı */}
      {activeChild && (
        <ChildDetailModal
          child={activeChild}
          isHeir={activeChild.id === effectiveHeirId}
          playerMoney={player.money || 0}
          factions={factions}
          onClose={() => setActiveChildId(null)}
          onSetHeir={(id) => setSelectedHeirId(id)}
          onInvest={handleInvest}
          onSetProfession={handleSetProfession}
        />
      )}

      {/* Başlık */}
      <div>
        <div className="label-tiny">Soy</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <Baby className="w-6 h-6 text-rose-500/80" /> Nesil & Aile
        </h1>
        <p className="text-stone-400 text-sm mt-1">Ailenin büyüsün. Çocukların güçlensin. Neslin yaşasın.</p>
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

      {/* Miras özeti (önceki oyuncudan) */}
      {inheritSummary && (
        <div className="card-frame p-4 space-y-2 border-amber-900/40 bg-amber-950/10">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="font-heading text-amber-400">Miras Alındı</span>
            <span className="text-xs text-stone-500">— {inheritSummary.previous_name}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {inheritSummary.inherited_money > 0 && (
              <span><span className="text-stone-500">Altın: </span><span className="text-amber-400 font-heading">+{inheritSummary.inherited_money}A</span></span>
            )}
            {inheritSummary.inherited_reputation !== 0 && (
              <span><span className="text-stone-500">İtibar: </span><span className="text-sky-400 font-heading">+{inheritSummary.inherited_reputation}</span></span>
            )}
          </div>
          {inheritSummary.inherited_stats && (
            <div className="text-xs text-stone-400">
              Stat bonusu: {Object.entries(inheritSummary.inherited_stats)
                .filter(([, v]) => v > 0)
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
          Bekârsın · Evlilik için{" "}
          <a href="/oyun/evlilik" className="text-orange-400 underline">Evlilik ekranına</a> git
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
                factions={factions}
                onSetHeir={setSelectedHeirId}
                onOpenDetail={() => setActiveChildId(child.id)}
              />
            ))
        }
      </div>

      {/* Miras önizlemesi */}
      {children.length > 0 && (
        <InheritanceSummary player={player} children={children} />
      )}

      {/* Nesil geçmişi */}
      <LegacyPanel legacyHistory={legacyHistory} generation={generation} />
    </div>
  );
}
