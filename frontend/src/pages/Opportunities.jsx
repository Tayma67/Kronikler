import { useEffect, useState, useCallback } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useActionRedirect } from "@/hooks/useActionRedirect";
import {
  Zap, Coins, Shield, Clock, RefreshCw,
  CheckCircle, XCircle, ChevronRight,
  Sword, Users, Star, AlertTriangle, Skull,
  Loader2, TrendingUp, Heart, X, Play, Target,
  Dumbbell, Swords, TrendingDown, Sparkles,
} from "lucide-react";

// ── Urgency helpers ───────────────────────────────────────────────────────────

export function weeksRemaining(opp, currentTurn) {
  if (opp.expires_at == null) return null;
  return opp.expires_at - (currentTurn || 0);
}

export function urgencyTier(weeks) {
  if (weeks == null) return null;
  if (weeks <= 1)   return "critical";
  if (weeks === 2)  return "warning";
  return "info";
}

const URGENCY_STYLES = {
  critical: {
    badge:  "bg-red-950 border border-red-700 text-red-300",
    pulse:  true,
    card:   "ring-1 ring-red-800",
  },
  warning: {
    badge:  "bg-orange-950 border border-orange-800 text-orange-300",
    pulse:  false,
    card:   "ring-1 ring-orange-900",
  },
  info: {
    badge:  "bg-stone-900 border border-stone-700 text-stone-400",
    pulse:  false,
    card:   "",
  },
};

function UrgencyBadge({ weeks }) {
  const tier = urgencyTier(weeks);
  if (!tier) return null;
  const s = URGENCY_STYLES[tier];
  const label = tier === "critical" ? "Son Ay!" : `${weeks} ay kaldı`;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-heading tracking-wider uppercase px-1.5 py-0.5 rounded-sm ${s.badge} ${s.pulse ? "animate-pulse" : ""}`}
    >
      ⏳ {label}
    </span>
  );
}

// ── Skill map ─────────────────────────────────────────────────────────────────

const SKILL_MAP = {
  combat:  { label: "Dövüş",        icon: Sword,    color: "text-red-400",     barColor: "bg-red-500"     },
  social:  { label: "Sosyal",       icon: Users,    color: "text-emerald-400", barColor: "bg-emerald-500" },
  trade:   { label: "Ticaret",      icon: Coins,    color: "text-amber-400",   barColor: "bg-amber-500"   },
  stamina: { label: "Dayanıklılık", icon: Dumbbell, color: "text-sky-400",     barColor: "bg-sky-500"     },
};

/** Mirrors backend formula: chance = min(0.92, risk_mult + skill * 0.07) */
function calcDifficulty(opp, playerSkills) {
  const skillVal = (playerSkills || {})[opp.skill_check] || 0;
  const riskMult = { düşük: 0.80, orta: 0.60, yüksek: 0.40 }[opp.risk_level] ?? 0.60;
  const chance   = Math.min(0.92, riskMult + skillVal * 0.07);
  const pct      = Math.round(chance * 100);
  if (chance >= 0.75) return { label: "Kolay", color: "text-emerald-400", barColor: "bg-emerald-500", pct };
  if (chance >= 0.55) return { label: "Orta",  color: "text-amber-400",   barColor: "bg-amber-500",   pct };
  return                     { label: "Zor",   color: "text-red-400",     barColor: "bg-red-500",     pct };
}

// ── Category & risk config ────────────────────────────────────────────────────

const CAT = {
  iş:      { label: "İş",      color: "text-amber-400",   border: "border-amber-900/60",   bg: "bg-amber-950/30",  icon: Coins  },
  suç:     { label: "Suç",     color: "text-red-400",     border: "border-red-900/60",     bg: "bg-red-950/30",    icon: Skull  },
  sosyal:  { label: "Sosyal",  color: "text-emerald-400", border: "border-emerald-900/60", bg: "bg-emerald-950/20",icon: Users  },
  macera:  { label: "Macera",  color: "text-orange-400",  border: "border-orange-900/60",  bg: "bg-orange-950/30", icon: Sword  },
  kişisel: { label: "Kişisel", color: "text-pink-400",    border: "border-pink-900/60",    bg: "bg-pink-950/20",   icon: Heart  },
};

const RISK = {
  düşük:  { label: "Düşük Risk",  color: "text-emerald-400", dot: "bg-emerald-500" },
  orta:   { label: "Orta Risk",   color: "text-amber-400",   dot: "bg-amber-500"   },
  yüksek: { label: "Yüksek Risk", color: "text-red-400",     dot: "bg-red-500"     },
};

const STATUS_LABELS = {
  açık:         "Açık",
  kabul_edildi: "Kabul Edildi",
  tamamlandı:   "Tamamlandı",
  reddedildi:   "Reddedildi",
  başarısız:    "Başarısız",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function TagChip({ tag }) {
  return (
    <span className="text-[9px] font-heading tracking-wider uppercase px-1.5 py-0.5 rounded-sm bg-stone-800 text-stone-400 border border-stone-700">
      {tag}
    </span>
  );
}

function RewardRow({ gold, rep, rel }) {
  return (
    <div className="flex items-center gap-3 text-xs mt-2 flex-wrap">
      {gold > 0 && (
        <span className="flex items-center gap-1 text-amber-400">
          <Coins className="w-3 h-3" /> {gold} altın
        </span>
      )}
      {rep > 0 && (
        <span className="flex items-center gap-1 text-sky-400">
          <Star className="w-3 h-3" /> +{rep} itibar
        </span>
      )}
      {rep < 0 && (
        <span className="flex items-center gap-1 text-red-400">
          <TrendingDown className="w-3 h-3" /> {rep} itibar
        </span>
      )}
      {rel > 0 && (
        <span className="flex items-center gap-1 text-emerald-400">
          <Heart className="w-3 h-3" /> +{rel} ilişki
        </span>
      )}
    </div>
  );
}

// ── Task Execution Modal ──────────────────────────────────────────────────────

function TaskExecutionModal({ opp, player, onConfirm, onClose, busy }) {
  const cat        = CAT[opp.category] || CAT["iş"];
  const CatIcon    = cat.icon;
  const risk       = RISK[opp.risk_level] || RISK["orta"];
  const skillCfg   = SKILL_MAP[opp.skill_check] || SKILL_MAP.social;
  const SkillIcon  = skillCfg.icon;
  const skillVal   = (player?.skills || {})[opp.skill_check] || 0;
  const difficulty = calcDifficulty(opp, player?.skills);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg sm:mx-4 rounded-t-2xl sm:rounded-xl border ${cat.border} bg-stone-950 overflow-hidden flex flex-col max-h-[90vh]`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <CatIcon className={`w-4 h-4 ${cat.color}`} />
            <span className={`font-heading text-sm ${cat.color}`}>{opp.title}</span>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-stone-500 hover:text-stone-300 transition-colors p-1 rounded disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Description */}
          <p className="text-stone-300 text-sm leading-relaxed">{opp.description}</p>

          {/* Skill check panel */}
          <div className="rounded-lg bg-stone-900 border border-stone-800 p-3 space-y-2">
            <div className="label-tiny text-stone-500">Gereken Beceri</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SkillIcon className={`w-4 h-4 ${skillCfg.color}`} />
                <span className={`text-sm font-heading ${skillCfg.color}`}>{skillCfg.label}</span>
              </div>
              <span className="text-stone-400 text-xs tabular-nums">
                Seviye <span className="text-stone-200 font-heading">{skillVal}</span>
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-stone-800">
              <div
                className={`h-1.5 rounded-full ${skillCfg.barColor} transition-all`}
                style={{ width: `${Math.min(100, skillVal * 10)}%` }}
              />
            </div>
          </div>

          {/* Success estimate */}
          <div className="rounded-lg bg-stone-900 border border-stone-800 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="label-tiny text-stone-500">Başarı Tahmini</div>
              <span className={`font-heading text-xs ${difficulty.color}`}>{difficulty.label}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-800">
              <div
                className={`h-2 rounded-full ${difficulty.barColor} transition-all`}
                style={{ width: `${difficulty.pct}%` }}
              />
            </div>
            <div className="text-stone-600 text-[10px] tabular-nums">
              Tahmini oran: ~%{difficulty.pct}
            </div>
          </div>

          {/* Risk note */}
          <div className="flex items-start gap-2 text-xs">
            <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${risk.color}`} />
            <div>
              <span className={`font-heading ${risk.color}`}>{risk.label} — </span>
              <span className="text-stone-400">{opp.risk}</span>
            </div>
          </div>

          {/* Rewards at stake */}
          <div className="rounded-lg border border-stone-800 p-3">
            <div className="label-tiny text-stone-500 mb-1">Başarırsan Kazanırsın</div>
            <RewardRow gold={opp.reward_gold} rep={opp.reward_reputation} rel={opp.reward_relation} />
          </div>

          {/* Penalty note for high-risk */}
          {opp.risk_level === "yüksek" && (
            <div className="flex items-center gap-2 text-[11px] text-red-400/70 border border-red-900/40 rounded-lg px-3 py-2 bg-red-950/20">
              <Skull className="w-3 h-3 shrink-0" />
              Başarısız olursan itibar kaybeder, sağlığın zarar görebilir.
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-stone-800 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={busy}
            className="btn-ghost-ash px-4 py-2.5 text-sm disabled:opacity-40"
          >
            Geri Dön
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="btn-ember flex-1 py-2.5 text-sm font-heading tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Gerçekleştiriliyor…</>
            ) : (
              <><Play className="w-4 h-4" /> Görevi Gerçekleştir</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Opportunity Card ──────────────────────────────────────────────────────────

function OpportunityCard({ opp, playerSkills, onAccept, onDecline, onExecute, busy, currentTurn }) {
  const cat     = CAT[opp.category] || CAT["iş"];
  const risk    = RISK[opp.risk_level] || RISK["orta"];
  const CatIcon = cat.icon;
  const isBusy  = busy === opp.id;

  const isOpen     = opp.status === "açık";
  const isAccepted = opp.status === "kabul_edildi";
  const isDone     = ["tamamlandı", "reddedildi", "başarısız"].includes(opp.status);

  const weeks     = isOpen ? weeksRemaining(opp, currentTurn) : null;
  const tier      = urgencyTier(weeks);
  const ringClass = tier ? URGENCY_STYLES[tier].card : "";

  // Skill & difficulty info for accepted card preview
  const skillCfg   = SKILL_MAP[opp.skill_check] || SKILL_MAP.social;
  const SkillIcon  = skillCfg.icon;
  const difficulty = calcDifficulty(opp, playerSkills);

  return (
    <div
      className={`card-frame p-4 flex flex-col gap-3 transition-all ${
        isDone ? "opacity-50" : ""
      } ${cat.bg} border ${cat.border} ${ringClass}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CatIcon className={`w-4 h-4 shrink-0 ${cat.color}`} />
          <h3 className={`font-heading text-sm ${cat.color} truncate`}>{opp.title}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {isOpen && <UrgencyBadge weeks={weeks} />}
          <span className={`flex items-center gap-1 text-[9px] font-heading tracking-wider uppercase ${risk.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
            {risk.label}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-stone-300 text-sm leading-relaxed">{opp.description}</p>

      {/* Risk warning */}
      <div className="flex items-start gap-1.5 text-xs text-stone-500">
        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
        <span>{opp.risk}</span>
      </div>

      {/* Rewards */}
      <RewardRow gold={opp.reward_gold} rep={opp.reward_reputation} rel={opp.reward_relation} />

      {/* Tags */}
      {opp.tags && opp.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {opp.tags.map(t => <TagChip key={t} tag={t} />)}
        </div>
      )}

      {/* ── Status / Actions ── */}
      {isDone ? (
        <div className={`text-xs font-heading tracking-wider uppercase text-center py-1 ${
          opp.status === "tamamlandı" ? "text-emerald-400" :
          opp.status === "başarısız"  ? "text-red-400"     : "text-stone-500"
        }`}>
          {STATUS_LABELS[opp.status]}
        </div>

      ) : isAccepted ? (
        // ── Accepted state: show skill preview + execute button ──
        <div className="space-y-2.5 pt-1 border-t border-stone-800/60">
          {/* Skill + difficulty mini row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-stone-400">
              <SkillIcon className={`w-3 h-3 ${skillCfg.color}`} />
              <span>{skillCfg.label} sınavı</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${difficulty.barColor}`} />
              <span className={`font-heading text-[10px] tracking-wider ${difficulty.color}`}>
                {difficulty.label}
              </span>
            </div>
          </div>

          {/* Slim success bar */}
          <div className="w-full h-1 rounded-full bg-stone-800">
            <div
              className={`h-1 rounded-full ${difficulty.barColor}`}
              style={{ width: `${difficulty.pct}%` }}
            />
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2">
            <div className="text-[9px] font-heading text-orange-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <CheckCircle className="w-3 h-3" /> Kabul Edildi
            </div>
            <button
              onClick={() => onExecute(opp)}
              disabled={isBusy}
              className="btn-ember flex-1 py-1.5 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isBusy
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Target className="w-3.5 h-3.5" />
              }
              Görevi Yürüt
            </button>
          </div>
        </div>

      ) : (
        // ── Open state: accept / decline ──
        <div className="flex gap-2">
          <button
            onClick={() => onDecline(opp.id)}
            disabled={isBusy}
            className="btn-ghost-ash px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" /> Reddet
          </button>
          <button
            onClick={() => onAccept(opp.id)}
            disabled={isBusy}
            className="btn-ember flex-1 py-1.5 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Kabul Et
          </button>
        </div>
      )}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: "all",     label: "Tümü"    },
  { key: "iş",     label: "İş"       },
  { key: "suç",    label: "Suç"      },
  { key: "sosyal",  label: "Sosyal"  },
  { key: "macera",  label: "Macera"  },
  { key: "kişisel", label: "Kişisel" },
];

function FilterBar({ active, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {FILTERS.map(f => {
        const isActive = active === f.key;
        const cat = CAT[f.key];
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className={`px-3 py-1 text-xs font-heading tracking-wider rounded-sm border transition-all ${
              isActive
                ? `border-orange-800 bg-stone-900 ${cat ? cat.color : "text-orange-400"}`
                : "border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-600"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Result overlay ────────────────────────────────────────────────────────────

function ResultOverlay({ result, onClose }) {
  if (!result) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className={`card-frame p-6 max-w-sm w-full text-center ${
        result.success ? "border-emerald-900" : "border-red-900"
      }`}>
        {result.success
          ? <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          : <XCircle     className="w-10 h-10 text-red-400     mx-auto mb-3" />
        }
        <h2 className={`font-heading text-lg mb-2 ${result.success ? "text-emerald-300" : "text-red-300"}`}>
          {result.success ? "Başarılı!" : "Başarısız"}
        </h2>
        <p className="text-stone-300 text-sm mb-4 leading-relaxed">{result.message}</p>

        {/* Stat changes */}
        <div className="flex items-center justify-center gap-4 flex-wrap mb-4">
          {result.gold_gained > 0 && (
            <div className="flex items-center gap-1.5 text-amber-400 font-heading text-sm">
              <Coins className="w-4 h-4" /> +{result.gold_gained} Altın
            </div>
          )}
          {result.rep_gained > 0 && (
            <div className="flex items-center gap-1.5 text-sky-400 font-heading text-sm">
              <Star className="w-4 h-4" /> +{result.rep_gained} İtibar
            </div>
          )}
          {result.rep_gained < 0 && (
            <div className="flex items-center gap-1.5 text-red-400 font-heading text-sm">
              <TrendingDown className="w-4 h-4" /> {result.rep_gained} İtibar
            </div>
          )}
        </div>

        <button onClick={onClose} className="btn-ember px-6 py-2 text-sm font-heading tracking-wider">
          Devam
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Opportunities() {
  const { state, setState }         = useGame();
  const withRedirect                = useActionRedirect("Fırsatlar");
  const [opps, setOpps]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [busy, setBusy]             = useState(null);
  const [filter, setFilter]         = useState("all");
  const [result, setResult]         = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [executingOpp, setExecutingOpp] = useState(null); // Task Execution Modal

  const playerAge   = state?.player?.age    ?? 0;
  const currentTurn = state?.turn           ?? 0;
  const player      = state?.player         ?? {};

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/game/opportunities");
      setOpps(data.opportunities || []);
    } catch {
      toast.error("Fırsatlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (id) => {
    const opp = opps.find(o => o.id === id);
    if (opp?.min_age && playerAge < opp.min_age) {
      toast.error("Bu görevi üstlenmek için çok küçüksün.");
      return;
    }
    setBusy(id);
    try {
      await withRedirect(async () => {
        const { data } = await api.post("/game/opportunities/accept", { opportunity_id: id });
        setOpps(prev => prev.map(o => o.id === id ? data.opportunity : o));
        if (data.state) setState(data.state);
        toast.success("Fırsat kabul edildi.");
        return data;
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(null);
    }
  };

  const handleDecline = async (id) => {
    setBusy(id);
    try {
      const { data } = await api.post("/game/opportunities/decline", { opportunity_id: id });
      if (data.state) {
        setState(data.state);
        setOpps(data.state.opportunities || []);
      } else {
        setOpps(prev => prev.map(o => o.id === id ? data.opportunity : o));
      }
      toast("Fırsat reddedildi.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(null);
    }
  };

  /**
   * Called from TaskExecutionModal's confirm button.
   * Uses executingOpp.id so we don't need to pass it explicitly.
   */
  const handleComplete = async () => {
    if (!executingOpp) return;
    const id = executingOpp.id;
    setBusy(id);
    try {
      await withRedirect(async () => {
        const { data } = await api.post("/game/opportunities/complete", { opportunity_id: id });
        if (data.state) {
          setState(data.state);
          setOpps(data.state.opportunities || []);
        }
        setExecutingOpp(null);
        setResult(data);
        return data;
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data } = await api.post("/game/opportunities/refresh");
      setOpps(data.opportunities || []);
      toast.success("Fırsatlar yenilendi.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Şu an yenileyemezsin, biraz bekle.");
    } finally {
      setRefreshing(false);
    }
  };

  // Grouping
  const openOpps     = opps.filter(o => o.status === "açık");
  const acceptedOpps = opps.filter(o => o.status === "kabul_edildi");
  const historyOpps  = opps.filter(o => ["tamamlandı", "reddedildi", "başarısız"].includes(o.status));

  const sortByUrgency = (list) =>
    [...list].sort((a, b) => (a.expires_at ?? Infinity) - (b.expires_at ?? Infinity));

  const filteredOpen = sortByUrgency(
    filter === "all" ? openOpps : openOpps.filter(o => o.category === filter)
  );

  const criticalOpps = filteredOpen.filter(o => {
    const w = weeksRemaining(o, currentTurn);
    return w != null && w <= 1;
  });

  const cardProps = {
    playerSkills: player.skills,
    onAccept:     handleAccept,
    onDecline:    handleDecline,
    onExecute:    setExecutingOpp,
    busy,
    currentTurn,
  };

  return (
    <div className="space-y-6 rise-in">

      {/* Header */}
      <div>
        <div className="label-tiny">Dünya Haberleri</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <Zap className="w-7 h-7 text-orange-500" /> Fırsatlar
          {openOpps.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-orange-500 text-stone-950 text-xs font-heading font-bold animate-pulse">
              {openOpps.length}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
          <span><span className="text-amber-400 font-heading">{openOpps.length}</span> açık</span>
          {acceptedOpps.length > 0 && (
            <>
              <span className="text-stone-700">·</span>
              <span><span className="text-orange-400 font-heading">{acceptedOpps.length}</span> üstlenildi</span>
            </>
          )}
          {historyOpps.length > 0 && (
            <>
              <span className="text-stone-700">·</span>
              <span><span className="text-stone-400 font-heading">{historyOpps.length}</span> geçmiş</span>
            </>
          )}
        </div>
      </div>

      {/* Critical / Son Şans section */}
      {criticalOpps.length > 0 && (
        <div className="space-y-2">
          <div className="label-tiny flex items-center gap-2 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Son Şans — Bu Ay Kapanıyor
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {criticalOpps.map(o => <OpportunityCard key={o.id} opp={o} {...cardProps} />)}
          </div>
        </div>
      )}

      {/* Accepted / Üstlenilen */}
      {acceptedOpps.length > 0 && (
        <div className="space-y-2">
          <div className="label-tiny flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            Üstlenilen Fırsatlar
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {acceptedOpps.map(o => <OpportunityCard key={o.id} opp={o} {...cardProps} />)}
          </div>
        </div>
      )}

      {/* Open opportunities */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="label-tiny flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Mevcut Fırsatlar
            <span className="text-stone-600">({openOpps.length})</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-ghost-ash px-3 py-1 text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            Yenile
          </button>
        </div>

        <FilterBar active={filter} onChange={setFilter} />

        {loading ? (
          <div className="flex items-center justify-center py-12 text-stone-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filteredOpen.length === 0 ? (
          <div className="card-frame p-8 text-center text-stone-500">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {filter === "all"
                ? "Şu an fırsat yok. Bir ay geçir, yenileri çıkar."
                : "Bu kategoride şu an fırsat yok."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredOpen.map(o => <OpportunityCard key={o.id} opp={o} {...cardProps} />)}
          </div>
        )}
      </div>

      {/* History */}
      {historyOpps.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowHistory(h => !h)}
            className="label-tiny flex items-center gap-2 text-stone-600 hover:text-stone-400 transition-colors"
          >
            <Shield className="w-3 h-3" />
            Geçmiş ({historyOpps.length})
            <ChevronRight className={`w-3 h-3 transition-transform ${showHistory ? "rotate-90" : ""}`} />
          </button>
          {showHistory && (
            <div className="grid gap-3 sm:grid-cols-2">
              {historyOpps.map(o => <OpportunityCard key={o.id} opp={o} {...cardProps} />)}
            </div>
          )}
        </div>
      )}

      {/* Task Execution Modal */}
      {executingOpp && (
        <TaskExecutionModal
          opp={executingOpp}
          player={player}
          onConfirm={handleComplete}
          onClose={() => !busy && setExecutingOpp(null)}
          busy={busy === executingOpp.id}
        />
      )}

      {/* Result overlay */}
      <ResultOverlay result={result} onClose={() => setResult(null)} />
    </div>
  );
}
