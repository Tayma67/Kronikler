import { useEffect, useState } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Zap, Brain, MessageCircle, Heart, Plus, Loader2, AlertCircle, TrendingUp, Star } from "lucide-react";

// ─── Stat konfigürasyonu ──────────────────────────────────────────────────────
const STATS = [
  {
    key: "strength",
    label: "Güç",
    icon: Zap,
    color: "text-red-400",
    border: "border-red-900/60",
    bg: "bg-red-950/15",
    fill: "bg-red-700",
    description: "Fiziksel güç. Savaşta saldırı, ağır işlerde kazanç.",
    perks: ["Savaş hasarı +", "Ağır yük taşıma", "Çiftçilik & demircilik geliri"],
    professions: ["asker", "şövalye", "demirci", "çiftçi", "haydut"],
  },
  {
    key: "intelligence",
    label: "Zeka",
    icon: Brain,
    color: "text-sky-400",
    border: "border-sky-900/60",
    bg: "bg-sky-950/15",
    fill: "bg-sky-700",
    description: "Düşünme kapasitesi. Ticaret, okul, gizli cemiyet araştırması.",
    perks: ["Ticaret kazancı +", "Gizli cemiyet ipucu şansı +", "Okul dersleri hızlanır"],
    professions: ["tüccar", "katip", "şifacı", "rahip", "zanaatkar"],
  },
  {
    key: "charisma",
    label: "Karizma",
    icon: MessageCircle,
    color: "text-violet-400",
    border: "border-violet-900/60",
    bg: "bg-violet-950/15",
    fill: "bg-violet-700",
    description: "Sosyal etki. NPC ilişkileri, pazarlık, faction yükselişi.",
    perks: ["NPC ilişki gelişimi +", "Pazarlık avantajı", "Faction katkı bonusu"],
    professions: ["tüccar", "rahip", "lord", "şövalye", "katip"],
  },
  {
    key: "stamina",
    label: "Dayanıklılık",
    icon: Heart,
    color: "text-emerald-400",
    border: "border-emerald-900/60",
    bg: "bg-emerald-950/15",
    fill: "bg-emerald-700",
    description: "Sağlamlık ve enerji. Maksimum can, açlık direnci, iyileşme.",
    perks: ["Maksimum can +", "Açlık azalması yavaşlar", "Savaş savunması +"],
    professions: ["asker", "avcı", "şövalye", "çiftçi", "demirci çırağı"],
  },
];

// Meslekten hangi statlar önerilir
const PROF_PRIMARY = {
  "asker":          ["strength", "stamina"],
  "şövalye":        ["strength", "stamina", "charisma"],
  "haydut":         ["strength", "stamina"],
  "çiftçi":         ["strength", "stamina"],
  "demirci":        ["strength", "stamina"],
  "demirci çırağı": ["strength", "stamina"],
  "avcı":           ["stamina", "intelligence"],
  "tüccar":         ["intelligence", "charisma"],
  "katip":          ["intelligence", "charisma"],
  "şifacı":         ["intelligence", "charisma"],
  "rahip":          ["intelligence", "charisma"],
  "zanaatkar":      ["intelligence", "strength"],
  "lord":           ["charisma", "intelligence", "strength"],
  "köylü":          ["stamina", "strength"],
};

function xpForNext(level) {
  return 10 + level * 15;
}

// ─── Tek stat kartı ───────────────────────────────────────────────────────────
function StatCard({ stat, value, xp = 0, onAllocate, busy, hasPoints, maxed, isRecommended }) {
  const Icon = stat.icon;
  const pct      = Math.max(0, Math.min(100, (value / 10) * 100));
  const xpNeeded = xpForNext(value);
  const xpPct    = Math.min(100, (xp / xpNeeded) * 100);

  return (
    <div className={`card-frame p-4 border ${stat.border} ${stat.bg} space-y-3 relative`}>
      {/* Önerilen rozeti */}
      {isRecommended && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-[9px] font-heading tracking-wider text-amber-400 border border-amber-800/60 bg-amber-950/30 px-1.5 py-0.5 rounded-sm">
          <Star className="w-2.5 h-2.5" /> Önerilen
        </div>
      )}

      {/* Başlık + değer */}
      <div className="flex items-center gap-2 pr-16">
        <Icon className={`w-4 h-4 ${stat.color} shrink-0`} />
        <span className="label-tiny">{stat.label}</span>
        <span className={`font-heading text-2xl ${stat.color} ml-auto`}>{value}</span>
        <span className="text-stone-600 text-xs font-heading">/ 10</span>
      </div>

      {/* Seviye barı */}
      <div className="space-y-0.5">
        <div className="stat-bar">
          <div className={`h-full transition-all duration-500 ${stat.fill}`} style={{ width: `${pct}%` }} />
        </div>

        {/* XP barı */}
        {!maxed && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-0.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-700 opacity-60 ${stat.fill}`}
                style={{ width: `${xpPct}%` }}
              />
            </div>
            <span className="text-[9px] text-stone-600 font-heading shrink-0">
              {xp}/{xpNeeded} XP
            </span>
          </div>
        )}
      </div>

      {/* Açıklama */}
      <p className="text-xs text-stone-500">{stat.description}</p>

      {/* Bonuslar */}
      <ul className="space-y-0.5">
        {stat.perks.map((p) => (
          <li key={p} className="text-xs text-stone-400 flex items-center gap-1.5">
            <span className={`w-1 h-1 rounded-full shrink-0 ${stat.fill}`} />
            {p}
          </li>
        ))}
      </ul>

      {/* Artır butonu */}
      {maxed ? (
        <div className="text-center text-xs text-stone-600 font-heading tracking-wider py-1 border border-stone-800/50 rounded-sm">
          MAKSİMUM
        </div>
      ) : (
        <button
          onClick={() => onAllocate(stat.key)}
          disabled={busy || !hasPoints}
          className={`w-full flex items-center justify-center gap-1.5 py-2 text-xs font-heading tracking-wider border rounded-sm transition-all
            ${hasPoints && !busy
              ? `${stat.border} ${stat.color} hover:bg-white/5`
              : "border-stone-800/50 text-stone-700 cursor-not-allowed"
            }`}
        >
          {busy === stat.key
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Plus className="w-3.5 h-3.5" />}
          +1 Ekle
        </button>
      )}
    </div>
  );
}

// ─── Ana sayfa ────────────────────────────────────────────────────────────────
export default function StatAllocate() {
  const { state, setState } = useGame();
  const [busy,    setBusy]    = useState(null);
  const [statXp,  setStatXp]  = useState({});

  const player     = state?.player || {};
  const stats      = player.stats || { strength: 1, intelligence: 1, charisma: 1, stamina: 2 };
  const statPoints = player.stat_points || 0;
  const profession = player.profession || "işsiz";
  const recommended = PROF_PRIMARY[profession] || [];

  // XP bilgisini çek
  useEffect(() => {
    api.get("/game/skills").then(({ data }) => {
      setStatXp(data.stat_xp || {});
    }).catch(() => {});
  }, [state?.turn]);

  const allocate = async (statKey) => {
    if (!statPoints) { toast.error("Harcanacak stat puanın yok."); return; }
    setBusy(statKey);
    try {
      const { data } = await api.post("/game/stat/allocate", { stat: statKey });
      if (data.state) setState(data.state);
      const label = STATS.find(s => s.key === statKey)?.label || statKey;
      toast.success(`${label} → ${data.new_value} (${data.stat_points_remaining} puan kaldı)`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(null);
    }
  };

  const totalStats = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5 rise-in">
      {/* Başlık */}
      <div>
        <div className="label-tiny">Karakter Gelişimi</div>
        <h1 className="font-heading text-3xl text-stone-100">Stat Dağılımı</h1>
        <p className="text-stone-400 text-sm mt-1">
          Deneyim kazandıkça stat puanı kazanırsın. Nereye harcadığın karakterini şekillendirir.
        </p>
      </div>

      {/* Puan + meslek önerisi */}
      <div className="space-y-2">
        <div className={`card-frame p-4 flex items-center gap-4 ${statPoints > 0 ? "border-amber-800/60 bg-amber-950/15" : ""}`}>
          <div className="flex-1">
            <div className="label-tiny mb-0.5">Harcanabilir Puan</div>
            <div className={`font-heading text-3xl ${statPoints > 0 ? "text-amber-400" : "text-stone-500"}`}>
              {statPoints}
            </div>
          </div>
          {statPoints > 0 ? (
            <div className="text-xs text-amber-500/80 text-right max-w-[140px]">
              Aşağıdaki statlardan birine ekleyebilirsin.
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <AlertCircle className="w-4 h-4" />
              <span>Şimdilik puan yok. Çalış, öğren, büyü.</span>
            </div>
          )}
        </div>

        {/* Meslek önerisi */}
        {recommended.length > 0 && (
          <div className="flex items-start gap-2 px-3 py-2 border border-amber-900/40 bg-amber-950/10 rounded-sm">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-stone-400">
              <span className="text-amber-400 font-heading">{profession}</span> mesleğin için{" "}
              <span className="text-stone-200">
                {recommended.map(k => STATS.find(s => s.key === k)?.label).filter(Boolean).join(", ")}
              </span>{" "}
              statları öncelikli geliştirilmesi önerilir.
            </p>
          </div>
        )}
      </div>

      {/* Stat kartları */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STATS.map((s) => (
          <StatCard
            key={s.key}
            stat={s}
            value={stats[s.key] ?? 1}
            xp={statXp[s.key] ?? 0}
            onAllocate={allocate}
            busy={busy}
            hasPoints={statPoints > 0}
            maxed={(stats[s.key] ?? 1) >= 10}
            isRecommended={recommended.includes(s.key)}
          />
        ))}
      </div>

      {/* Toplam */}
      <div className="card-frame p-3 flex items-center justify-between text-sm">
        <span className="text-stone-500">Toplam dağıtılan stat</span>
        <span className="font-heading text-stone-300">{totalStats}</span>
      </div>
    </div>
  );
}
