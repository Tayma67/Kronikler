/**
 * Factions.jsx — Örgütler & Güç Dengesi
 *
 * Adım 6: Faction savaşı UI derinleştirme
 * - WarAlertBanner: Oyuncu factioni savaştaysa üst uyarı
 * - WarDecisionModal: Katıl/Kaçın karar ekranı (strateji seçimi)
 * - WarOutcomeModal: Savaş sonuç ekranı (log + stat değişimleri)
 * - BattleLogEntry: Geçmiş çatışma kayıtları
 * - Güç değişimi görsel göstergesi (ok + bar)
 */

import { useEffect, useState, useCallback } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Shield, Swords, Crown, Users, Coins, AlertTriangle,
  Loader2, MapPin, LogIn, LogOut, Plus, X, Star,
  ChevronRight, TrendingUp, TrendingDown, Minus, Eye, Flame, BookOpen,
  Heart, Church, Music, Skull, Lock, Landmark, Search, Unlock,
  Zap, Clock, Activity, ArrowRight, CheckCircle2, XCircle,
  Sword, Shield as ShieldIcon, Wind, Trophy, Crosshair,
} from "lucide-react";

// ─── Faction Tip Konfigürasyonu ───────────────────────────────────────────────
const FACTION_TYPES = {
  krallık_ordusu:    { label: "Krallık Ordusu",       color: "text-sky-300",     border: "border-sky-900/60",    bg: "bg-sky-950/20",    Icon: Shield  },
  tuccar_loncasi:    { label: "Tüccar Loncası",        color: "text-amber-400",   border: "border-amber-900/60",  bg: "bg-amber-950/20",  Icon: Coins   },
  zanaatkar_loncasi: { label: "Zanaatkar Loncası",     color: "text-violet-400",  border: "border-violet-900/60", bg: "bg-violet-950/15", Icon: Landmark },
  paralı_asker:      { label: "Paralı Asker Loncası",  color: "text-red-400",     border: "border-red-900/60",    bg: "bg-red-950/15",    Icon: Swords  },
  ilim_cemiyeti:     { label: "İlim Cemiyeti",         color: "text-emerald-400", border: "border-emerald-900/60",bg: "bg-emerald-950/15",Icon: BookOpen },
  sifaci_birligi:    { label: "Şifacı Birliği",        color: "text-green-400",   border: "border-green-900/60",  bg: "bg-green-950/15",  Icon: Heart   },
  dini_tarikat:      { label: "Dini Tarikat",          color: "text-purple-400",  border: "border-purple-900/60", bg: "bg-purple-950/15", Icon: Church  },
  oyuncu_kumpanya:   { label: "Seyyah Kumpanya",       color: "text-pink-400",    border: "border-pink-900/60",   bg: "bg-pink-950/15",   Icon: Music   },
  eskiya_cetesi:     { label: "Eşkıya Çetesi",         color: "text-orange-400",  border: "border-orange-900/60", bg: "bg-orange-950/20", Icon: Skull   },
  gizli_cemiyet:     { label: "Gizli Cemiyet",         color: "text-teal-400",    border: "border-teal-900/60",   bg: "bg-teal-950/15",   Icon: Lock    },
};

function ftCfg(type) {
  return FACTION_TYPES[type] || FACTION_TYPES["tuccar_loncasi"];
}

// ─── Küçük yardımcılar ────────────────────────────────────────────────────────
function clamp(v, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }

function Bar({ value, max = 100, color = "bg-orange-700", label, labelRight }) {
  const pct = clamp((value / max) * 100);
  return (
    <div className="space-y-0.5">
      {(label || labelRight) && (
        <div className="flex justify-between items-center">
          {label && <span className="label-tiny">{label}</span>}
          {labelRight && <span className="text-xs text-stone-400">{labelRight}</span>}
        </div>
      )}
      <div className="bg-stone-900 rounded-full overflow-hidden h-1.5">
        <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InfluenceDot({ value }) {
  const col = value >= 75 ? "bg-amber-400" : value >= 50 ? "bg-sky-400" : value >= 25 ? "bg-emerald-500" : "bg-stone-600";
  return <span className={`inline-block w-2 h-2 rounded-full ${col}`} />;
}

// ─── Savaş Momentum Rozeti ────────────────────────────────────────────────────
function MomentumBadge({ momentum }) {
  const cfg = {
    üstün:    { color: "text-emerald-400", border: "border-emerald-900/60", bg: "bg-emerald-950/20", Icon: TrendingUp,   label: "Üstün Geliyor" },
    geride:   { color: "text-red-400",     border: "border-red-900/60",     bg: "bg-red-950/20",     Icon: TrendingDown, label: "Geride Kalıyor" },
    dengeli:  { color: "text-stone-400",   border: "border-stone-700",      bg: "bg-stone-900/30",   Icon: Minus,        label: "Dengeli" },
  }[momentum] || { color: "text-stone-500", border: "border-stone-800", bg: "bg-stone-900/20", Icon: Minus, label: "—" };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-heading tracking-wider px-2 py-0.5 rounded-sm border ${cfg.border} ${cfg.bg} ${cfg.color}`}>
      <cfg.Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

// ─── Güç Karşılaştırma Barı ───────────────────────────────────────────────────
function StrengthComparison({ ourPower, enemyPower, ourName, enemyName }) {
  const total = Math.max(1, ourPower + enemyPower);
  const ourPct = Math.round((ourPower / total) * 100);
  const enemyPct = 100 - ourPct;
  const dominant = ourPct > 60 ? "biz" : ourPct < 40 ? "düşman" : "dengeli";
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] text-stone-500 font-heading">
        <span>{ourName}</span>
        <span className={dominant === "biz" ? "text-emerald-400" : dominant === "düşman" ? "text-red-400" : "text-stone-400"}>
          {dominant === "biz" ? "Biz Önde" : dominant === "düşman" ? "Düşman Önde" : "Dengeli"}
        </span>
        <span>{enemyName}</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 bg-stone-900">
        <div className="bg-sky-700 transition-all duration-500" style={{ width: `${ourPct}%` }} />
        <div className="bg-red-700 transition-all duration-500" style={{ width: `${enemyPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-sky-400 font-heading">{ourPower} güç</span>
        <span className="text-red-400 font-heading">{enemyPower} güç</span>
      </div>
    </div>
  );
}

// ─── Savaş Bildirimi Üst Banner ───────────────────────────────────────────────
function WarAlertBanner({ warDetail, onOpenDecision, loading }) {
  if (!warDetail) return null;
  const { our_faction, enemy_faction, cause, duration_weeks, momentum } = warDetail;
  const causeLabel = {
    toprak_genişlemesi: "Toprak Genişlemesi",
    ihanet: "İhanet",
    ekonomik_baskı: "Ekonomik Baskı",
    iç_savaş: "İç Savaş",
    toprak_talebi: "Toprak Talebi",
  }[cause] || cause?.replace(/_/g, " ") || "Bilinmiyor";

  return (
    <div className="card-frame border-red-900/70 bg-red-950/20 p-4 space-y-3">
      {/* Başlık */}
      <div className="flex items-center gap-2">
        <Swords className="w-5 h-5 text-red-400 animate-pulse shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="label-tiny text-red-500">⚠️ Factionın Savaşta!</div>
          <div className="font-heading text-sm text-stone-100">
            {our_faction.name}
            <span className="text-red-400 mx-2">⚔️</span>
            {enemy_faction.name}
          </div>
        </div>
        <MomentumBadge momentum={momentum} />
      </div>

      {/* Detaylar */}
      <div className="flex items-center gap-3 text-xs text-stone-500">
        <span><span className="text-stone-400">Sebep:</span> {causeLabel}</span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {duration_weeks} hafta
        </span>
        <span>·</span>
        <span>{warDetail.battles_count} çatışma</span>
      </div>

      {/* Güç karşılaştırması */}
      <StrengthComparison
        ourPower={our_faction.military_power}
        enemyPower={enemy_faction.military_power}
        ourName={our_faction.name}
        enemyName={enemy_faction.name}
      />

      {/* Aksiyon butonu */}
      <button
        onClick={onOpenDecision}
        disabled={loading}
        className="btn-ember w-full py-2.5 text-sm font-heading tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
        Savaş Kararını Ver
      </button>
    </div>
  );
}

// ─── Savaş Karar Modali ───────────────────────────────────────────────────────
function WarDecisionModal({ warDetail, onClose, onDecide, busy }) {
  const [strategy, setStrategy] = useState("saldır");
  const { our_faction, enemy_faction, cause } = warDetail;

  const STRATEGIES = [
    {
      key: "saldır",
      Icon: Sword,
      label: "Saldır",
      color: "text-red-400",
      border: "border-red-900/60",
      bg: "bg-red-950/20",
      desc: "Hasar +35% · Savunma -30%",
      detail: "Yüksek risk, yüksek ödül. Düşmanı çabuk bitirmek için.",
    },
    {
      key: "savun",
      Icon: ShieldIcon,
      label: "Savun",
      color: "text-sky-400",
      border: "border-sky-900/60",
      bg: "bg-sky-950/20",
      desc: "Savunma +45% · Hasar -30%",
      detail: "Düşmanı yıprat. Uzun vadede daha güvenli.",
    },
    {
      key: "kaç",
      Icon: Wind,
      label: "Geri Çekil",
      color: "text-stone-400",
      border: "border-stone-700",
      bg: "bg-stone-900/30",
      desc: "İtibar -5 · Onur -5",
      detail: "Faction çağrısını görmezden gelirsin. İtibar kaybedersin.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80">
      <div className="card-frame p-5 max-w-sm w-full space-y-4">
        {/* Başlık */}
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base text-red-400 flex items-center gap-2">
            <Swords className="w-4 h-4" /> Savaş Kararı
          </h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Güç karşılaştırması */}
        <StrengthComparison
          ourPower={our_faction.military_power}
          enemyPower={enemy_faction.military_power}
          ourName={our_faction.name}
          enemyName={enemy_faction.name}
        />

        {/* Strateji seçimi */}
        <div>
          <div className="label-tiny mb-2">Taktik Seç</div>
          <div className="space-y-2">
            {STRATEGIES.map((s) => (
              <button
                key={s.key}
                onClick={() => setStrategy(s.key)}
                className={`w-full p-3 rounded-sm border text-left transition-all ${
                  strategy === s.key ? `${s.border} ${s.bg} ${s.color}` : "border-stone-800 text-stone-500 hover:border-stone-600"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2 font-heading text-sm">
                    <s.Icon className="w-3.5 h-3.5" />
                    {s.label}
                  </div>
                  <span className="text-[10px] font-heading">{s.desc}</span>
                </div>
                <div className="text-[10px] text-stone-600">{s.detail}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost-ash flex-1 py-2 text-xs font-heading tracking-wider">
            İptal
          </button>
          <button
            onClick={() => onDecide(strategy)}
            disabled={busy}
            className={`flex-1 py-2 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 rounded-sm border transition-all disabled:opacity-50 ${
              strategy === "kaç"
                ? "border-stone-700 text-stone-400 hover:border-stone-600"
                : "btn-ember"
            }`}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
              strategy === "kaç" ? <Wind className="w-3.5 h-3.5" /> : <Swords className="w-3.5 h-3.5" />}
            {strategy === "kaç" ? "Geri Çekil" : "Savaşa Katıl"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Savaş Sonuç Modali ───────────────────────────────────────────────────────
function WarOutcomeModal({ result, onClose }) {
  const { outcome, log, loot, reputation_change, honor_change,
          our_military_power, enemy_military_power, strategy } = result;

  const OUTCOME_CFG = {
    zafer:     { color: "text-amber-400", Icon: Trophy,     bg: "border-amber-900/60 bg-amber-950/20", label: "Zafer!" },
    kayıp:     { color: "text-red-400",   Icon: XCircle,    bg: "border-red-900/60 bg-red-950/20",     label: "Yenildin" },
    beraberlik:{ color: "text-stone-400", Icon: Minus,      bg: "border-stone-700 bg-stone-900/30",    label: "Beraberlik" },
    kaçış:     { color: "text-stone-500", Icon: Wind,       bg: "border-stone-800 bg-stone-950/20",    label: "Geri Çekildin" },
  };
  const cfg = OUTCOME_CFG[outcome] || OUTCOME_CFG["beraberlik"];
  const { Icon } = cfg;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/85">
      <div className="card-frame p-5 max-w-sm w-full space-y-4">
        {/* Sonuç Başlık */}
        <div className={`card-frame p-3 border ${cfg.bg} flex items-center gap-3`}>
          <Icon className={`w-7 h-7 ${cfg.color} shrink-0`} />
          <div>
            <div className={`font-heading text-lg ${cfg.color}`}>{cfg.label}</div>
            <div className="text-xs text-stone-500 capitalize">{strategy?.replace("kaç", "Geri Çekilme")}</div>
          </div>
        </div>

        {/* Stat değişimleri */}
        <div className="grid grid-cols-3 gap-2">
          {loot > 0 && (
            <div className="card-frame p-2 text-center">
              <Coins className="w-3.5 h-3.5 text-amber-400 mx-auto mb-0.5" />
              <div className="font-heading text-sm text-amber-400">+{loot}</div>
              <div className="text-[9px] text-stone-600">altın</div>
            </div>
          )}
          {reputation_change !== 0 && (
            <div className="card-frame p-2 text-center">
              <Star className="w-3.5 h-3.5 text-sky-400 mx-auto mb-0.5" />
              <div className={`font-heading text-sm ${reputation_change > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {reputation_change > 0 ? "+" : ""}{reputation_change}
              </div>
              <div className="text-[9px] text-stone-600">itibar</div>
            </div>
          )}
          {honor_change !== 0 && (
            <div className="card-frame p-2 text-center">
              <Crown className="w-3.5 h-3.5 text-purple-400 mx-auto mb-0.5" />
              <div className={`font-heading text-sm ${honor_change > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {honor_change > 0 ? "+" : ""}{honor_change}
              </div>
              <div className="text-[9px] text-stone-600">onur</div>
            </div>
          )}
        </div>

        {/* Güç durumu (varsa) */}
        {our_military_power != null && enemy_military_power != null && (
          <div className="space-y-1.5">
            <div className="label-tiny">Savaş Durumu</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-sky-400 shrink-0 w-24 truncate">Bizim güç:</span>
              <div className="flex-1 bg-stone-900 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-sky-700 transition-all" style={{ width: `${our_military_power}%` }} />
              </div>
              <span className="text-sky-400 text-[10px] w-6 text-right">{our_military_power}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-red-400 shrink-0 w-24 truncate">Düşman güç:</span>
              <div className="flex-1 bg-stone-900 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-red-700 transition-all" style={{ width: `${enemy_military_power}%` }} />
              </div>
              <span className="text-red-400 text-[10px] w-6 text-right">{enemy_military_power}</span>
            </div>
          </div>
        )}

        {/* Savaş Logu */}
        <div>
          <div className="label-tiny mb-1.5">Savaş Günlüğü</div>
          <div className="bg-stone-950 border border-stone-800 rounded-sm p-3 space-y-1 max-h-36 overflow-y-auto">
            {log?.map((line, i) => (
              <div key={i} className={`text-[10px] font-mono leading-relaxed ${
                line.includes("⚔️") || line.includes("🏆") ? "text-amber-400" :
                line.includes("💀") || line.includes("hasar aldın") ? "text-red-400" :
                line.includes("💨") || line.includes("Geri çekildin") ? "text-stone-500" :
                line.includes("hasar verdin") ? "text-emerald-400" : "text-stone-400"
              }`}>{line}</div>
            ))}
          </div>
        </div>

        <button onClick={onClose} className="btn-ember w-full py-2.5 text-sm font-heading tracking-wider">
          Tamam
        </button>
      </div>
    </div>
  );
}

// ─── Geçmiş Çatışma Kaydı ─────────────────────────────────────────────────────
function BattleLogEntry({ battle, ourFactionId, turn }) {
  const weeksAgo = turn != null && battle.turn != null ? turn - battle.turn : null;
  const isWin = battle.winner_id === ourFactionId;
  return (
    <div className={`flex items-start gap-3 p-2.5 rounded-sm border ${
      isWin ? "border-emerald-900/40 bg-emerald-950/10" : "border-red-900/40 bg-red-950/10"
    }`}>
      {isWin
        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
        : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`text-xs font-heading ${isWin ? "text-emerald-400" : "text-red-400"}`}>
            {isWin ? "Zafer" : "Mağlubiyet"} — {battle.region_name}
          </span>
          {weeksAgo != null && (
            <span className="text-[9px] text-stone-600">{weeksAgo} hafta önce</span>
          )}
        </div>
        <div className="text-[10px] text-stone-500 mt-0.5 flex gap-3 flex-wrap">
          <span>Galibin kaybı: <span className="text-stone-400">{battle.winner_casualties}</span></span>
          <span>Kaybedenin kaybı: <span className="text-stone-400">{battle.loser_casualties}</span></span>
        </div>
        {battle.npc_events?.length > 0 && (
          <div className="text-[9px] text-amber-700 mt-1 italic">
            {battle.npc_events.slice(0, 2).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Savaş Detay Kartı (Savaşlar tabı) ───────────────────────────────────────
function WarDetailCard({ war, playerFactionId, turn, onOpenDecision }) {
  const [expanded, setExpanded] = useState(false);
  const isOurWar = war.faction_a === playerFactionId || war.faction_b === playerFactionId;

  return (
    <div className={`card-frame p-4 space-y-3 border ${
      isOurWar ? "border-red-900/60 bg-red-950/20" : "border-stone-800/60"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Swords className={`w-4 h-4 shrink-0 ${isOurWar ? "text-red-400 animate-pulse" : "text-stone-500"}`} />
          <div>
            <div className="font-heading text-sm text-stone-100">
              {war.attacker_name || war.faction_a}
              <span className="text-red-400 mx-2">⚔️</span>
              {war.defender_name || war.faction_b}
            </div>
            <div className="text-xs text-stone-500">
              {war.cause?.replace(/_/g, " ")} · {war.battles_fought ?? 0} çatışma
            </div>
          </div>
        </div>
        {isOurWar && (
          <span className="text-[9px] font-heading uppercase px-1.5 py-0.5 border border-red-900 bg-red-950/40 text-red-400 rounded-sm shrink-0">
            Senin Savaşın
          </span>
        )}
      </div>

      {/* Genişlet butonu */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-stone-600 hover:text-stone-400 transition-colors"
      >
        <Activity className="w-3 h-3" />
        Geçmiş Çatışmalar
        <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && war._battles?.length > 0 && (
        <div className="space-y-2">
          {war._battles.map((b, i) => (
            <BattleLogEntry key={i} battle={b} ourFactionId={playerFactionId} turn={turn} />
          ))}
        </div>
      )}
      {expanded && (!war._battles || war._battles.length === 0) && (
        <div className="text-[10px] text-stone-600 italic text-center py-2">
          Henüz kayıtlı çatışma yok.
        </div>
      )}

      {isOurWar && (
        <button
          onClick={onOpenDecision}
          className="btn-ember w-full py-2 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5"
        >
          <Swords className="w-3.5 h-3.5" /> Savaşa Katıl
        </button>
      )}
    </div>
  );
}

// ─── Rank İlerleme ────────────────────────────────────────────────────────────
function RankProgress({ faction, player }) {
  const rankTable = faction.rank_table || [];
  const playerRank = player?.faction_rank ?? 0;
  const contribution = player?.faction_contribution ?? 0;
  if (!rankTable.length) return null;
  const currentRankName = rankTable[playerRank] || rankTable[0];
  const nextRankName    = rankTable[playerRank + 1];
  const isMaxRank       = playerRank >= rankTable.length - 1;
  const goal = player?.faction_contribution_goal || 20;
  return (
    <div className="card-frame p-4 space-y-3">
      <div className="label-tiny text-orange-400">Senin Durumun</div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-stone-500">Mevcut Rank</span>
          <div className="font-heading text-base text-stone-100">{currentRankName}</div>
        </div>
        {!isMaxRank && nextRankName && (
          <div className="text-right">
            <span className="text-xs text-stone-500">Sonraki</span>
            <div className="flex items-center gap-1 text-amber-400 text-xs font-heading">
              {nextRankName} <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        )}
        {isMaxRank && <Star className="w-4 h-4 text-amber-400" />}
      </div>
      {!isMaxRank && (
        <Bar value={contribution} max={goal} color="bg-amber-600" label="Katkı" labelRight={`${contribution} / ${goal}`} />
      )}
      {player?.faction_joined_turn != null && (
        <div className="text-xs text-stone-500">
          Üyelik süresi: <span className="text-stone-300">{Math.max(0, (player.turn || 0) - player.faction_joined_turn)} hafta</span>
        </div>
      )}
    </div>
  );
}

// ─── Şehir Nüfuz Haritası ─────────────────────────────────────────────────────
function InfluenceMap({ cityInfluence, locations }) {
  const entries = Object.entries(cityInfluence || {}).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
  if (!entries.length) return (
    <div className="text-xs text-stone-600 italic py-2 text-center">Henüz hiçbir şehirde nüfuz yok.</div>
  );
  const locName = (id) => locations.find((l) => l.id === id)?.name || id.slice(0, 12);
  return (
    <div className="space-y-2">
      {entries.map(([locId, val]) => (
        <div key={locId} className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-stone-300">
              <InfluenceDot value={val} />{locName(locId)}
            </span>
            <span className="text-stone-400">{val}/100</span>
          </div>
          <div className="bg-stone-900 rounded-full overflow-hidden h-1">
            <div
              className={`h-full transition-all ${val >= 100 ? "bg-amber-400" : val >= 75 ? "bg-amber-600" : val >= 50 ? "bg-sky-600" : val >= 25 ? "bg-emerald-700" : "bg-stone-600"}`}
              style={{ width: `${val}%` }}
            />
          </div>
          {val >= 25 && (
            <div className="text-[9px] text-stone-600">
              {val >= 100 ? "Kontrol" : val >= 75 ? "Aday gösterebilir" : val >= 50 ? "Baskı yapabilir" : "Faaliyet gösterebilir"}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Faction Kartı ────────────────────────────────────────────────────────────
function FactionCard({
  faction, playerFactionId, playerAge, canJoin, joinBlocked, joinWeeksLeft,
  onJoin, onLeave, onRebel, onInfluence, onDonate, busy, locations, player,
  warDetail, onOpenDecision,
}) {
  const cfg = ftCfg(faction.type);
  const { Icon } = cfg;
  const isPlayerFaction = faction.id === playerFactionId;
  const isBusy = busy === faction.id;
  const [expanded, setExpanded] = useState(false);
  const [donateAmount, setDonateAmount] = useState(10);
  const [donateMsg, setDonateMsg] = useState(null);
  const atWar = faction.at_war_with?.length > 0;

  return (
    <div className={`card-frame p-4 flex flex-col gap-3 border ${cfg.border} ${cfg.bg} transition-all ${isPlayerFaction ? "ring-1 ring-orange-700/50" : ""}`}>

      {/* Başlık */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-5 h-5 shrink-0 ${cfg.color}`} />
          <div className="min-w-0">
            <div className="label-tiny">{cfg.label}</div>
            <h3 className={`font-heading text-sm leading-tight ${cfg.color} truncate`}>{faction.name}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {isPlayerFaction && (
            <span className="text-[9px] font-heading tracking-wider uppercase px-2 py-0.5 rounded-sm border border-orange-800 bg-orange-950/30 text-orange-400">
              ÜYEsin
            </span>
          )}
          {atWar && (
            <span className="text-[9px] font-heading tracking-wider uppercase text-red-400 border border-red-900 bg-red-950/30 px-1.5 py-0.5 rounded-sm animate-pulse">
              Savaşta
            </span>
          )}
        </div>
      </div>

      {/* Lider + Trend */}
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span><span className="text-stone-400">Lider:</span> {faction.leader || "—"}</span>
        <div className="flex items-center gap-2">
          {faction.influence_trend === "yukari" && (
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-heading">
              <TrendingUp className="w-3 h-3" />{faction.influence_delta_4w > 0 ? `+${faction.influence_delta_4w}` : ""}
            </span>
          )}
          {faction.influence_trend === "asagi" && (
            <span className="flex items-center gap-0.5 text-[10px] text-red-400 font-heading">
              <TrendingDown className="w-3 h-3" />{faction.influence_delta_4w}
            </span>
          )}
          {faction.influence_trend === "sabit" && (
            <span className="flex items-center gap-0.5 text-[10px] text-stone-500 font-heading">
              <Minus className="w-3 h-3" />
            </span>
          )}
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {faction.member_count ?? faction.members?.length ?? 0}</span>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Bar label="İstikrar"   value={faction.stability}     color={faction.stability >= 70 ? "bg-emerald-700" : faction.stability >= 40 ? "bg-amber-700" : "bg-red-700"} />
        <Bar label="Ekonomi"    value={faction.economy_level} color="bg-amber-700" />
        <Bar label="İtibar"     value={faction.reputation}    color="bg-sky-700" />
        <Bar label="Asker Güç" value={faction.military_power ?? 50} color={faction.military_power >= 70 ? "bg-red-600" : "bg-orange-800"} />
      </div>

      {/* Savaştaysa güç karşılaştırması */}
      {isPlayerFaction && atWar && warDetail && (
        <div className="space-y-1.5 pt-1 border-t border-red-900/30">
          <div className="label-tiny text-red-500">Savaş Gücü Karşılaştırması</div>
          <StrengthComparison
            ourPower={warDetail.our_faction.military_power}
            enemyPower={warDetail.enemy_faction.military_power}
            ourName={warDetail.our_faction.name}
            enemyName={warDetail.enemy_faction.name}
          />
        </div>
      )}

      {/* Hedef */}
      {faction.primary_goal && (
        <div className="text-[10px] text-stone-500 italic border-l-2 border-stone-800 pl-2">{faction.primary_goal}</div>
      )}

      {/* Nüfuz Haritası */}
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] text-stone-600 hover:text-stone-400 transition-colors">
        <MapPin className="w-3 h-3" />Şehir Nüfuzları
        <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && <InfluenceMap cityInfluence={faction.city_influence} locations={locations} />}

      {isPlayerFaction && <RankProgress faction={faction} player={player} />}

      {/* Bağış Paneli */}
      {isPlayerFaction && (
        <div className="card-frame p-4 space-y-3">
          <div className="label-tiny text-orange-400">Hazineye Bağış</div>
          <div className="text-xs text-stone-500">Her 10 altın = 1 katkı puanı</div>
          <div className="flex items-center gap-2">
            <input
              type="number" min={10} step={10} value={donateAmount}
              onChange={e => setDonateAmount(Math.max(10, parseInt(e.target.value) || 10))}
              className="w-24 bg-stone-800 border border-stone-700 text-stone-100 text-sm rounded-sm px-2 py-1 focus:outline-none focus:border-amber-600"
            />
            <button
              onClick={async () => {
                setDonateMsg(null);
                const res = await onDonate(donateAmount);
                if (res?.success) setDonateMsg({ ok: true, text: `+${res.contribution_gained} katkı kazandın!` });
                else setDonateMsg({ ok: false, text: res?.reason || "Bağış başarısız." });
              }}
              disabled={isBusy}
              className="btn-ember py-1.5 px-4 text-xs font-heading tracking-wider flex items-center gap-1.5 disabled:opacity-50"
            >
              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Bağış Yap
            </button>
          </div>
          {donateMsg && (
            <div className={`text-xs ${donateMsg.ok ? "text-green-400" : "text-red-400"}`}>{donateMsg.text}</div>
          )}
        </div>
      )}

      {/* Aksiyon butonları */}
      <div className="flex gap-2 pt-0.5">
        {isPlayerFaction ? (
          <>
            {atWar && (
              <button
                onClick={onOpenDecision}
                className="btn-ember flex-1 py-1.5 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5"
              >
                <Swords className="w-3.5 h-3.5" /> Savaşa Katıl
              </button>
            )}
            <button
              onClick={() => onInfluence(faction.id)}
              disabled={isBusy}
              className="btn-ghost-ash flex-1 py-1.5 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
              Nüfuz
            </button>
            <button
              onClick={onLeave} disabled={isBusy}
              className="btn-ghost-ash flex-1 py-1.5 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" /> Ayrıl
            </button>
            {playerAge >= 18 && (
              <button
                onClick={() => onRebel(faction.id)} disabled={isBusy}
                className="py-1.5 px-3 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50 border border-red-900/50 text-red-400 hover:border-red-700 rounded-sm transition-all"
              >
                <Swords className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : !playerFactionId ? (
          canJoin ? (
            <button onClick={() => onJoin(faction.id)} disabled={isBusy}
              className="btn-ember flex-1 py-1.5 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50">
              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}Katıl
            </button>
          ) : joinBlocked ? (
            <div className="flex-1 py-1.5 text-xs text-orange-700 italic text-center flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {joinWeeksLeft === -1 ? "Kalıcı yasak" : `${joinWeeksLeft} hafta yasak`}
            </div>
          ) : (
            <div className="text-xs text-amber-700 italic flex-1 text-center py-1">Katılmak için biraz daha büyümen gerekiyor</div>
          )
        ) : (
          <div className="text-xs text-stone-600 italic flex-1 text-center py-1">Başka örgüte üyesin</div>
        )}
      </div>
    </div>
  );
}

// ─── Dormant Faction ──────────────────────────────────────────────────────────
function DormantFactionCard({ faction }) {
  const cfg = ftCfg(faction.type);
  return (
    <div className="card-frame p-4 flex flex-col gap-3 border border-stone-800/50 bg-stone-950/20 opacity-50">
      <div className="flex items-center gap-2">
        <cfg.Icon className="w-5 h-5 text-stone-700" />
        <div>
          <div className="label-tiny text-stone-700">{cfg.label}</div>
          <h3 className="font-heading text-sm text-stone-700">Henüz bilinmiyor</h3>
        </div>
      </div>
      <p className="text-[10px] text-stone-700 italic">Bu tür örgüt henüz bölgede aktif değil.</p>
    </div>
  );
}

// ─── Gizli Cemiyet Kartı ──────────────────────────────────────────────────────
function SecretSocietyCard({ faction, clueCount = 0, threshold = 5, onInvestigate, onReveal, busy }) {
  const pct = Math.min(100, (clueCount / threshold) * 100);
  const canReveal = clueCount >= threshold;
  const isBusy = busy === faction.id + "_inv";
  return (
    <div className="card-frame p-4 flex flex-col gap-3 border border-teal-900/60 bg-teal-950/15">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-teal-400" />
          <div>
            <div className="label-tiny text-teal-600">Gizli Cemiyet</div>
            <h3 className="font-heading text-sm text-teal-300">Kimliği Bilinmiyor</h3>
          </div>
        </div>
        <span className="text-[9px] font-heading tracking-wider uppercase px-2 py-0.5 rounded-sm border border-teal-900 bg-teal-950/50 text-teal-500">Gizli</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="label-tiny text-stone-500">İpucu İlerlemesi</span>
          <span className="text-[10px] text-stone-400 font-heading">{clueCount} / {threshold}</span>
        </div>
        <div className="bg-stone-900 rounded-full overflow-hidden h-1.5">
          <div className={`h-full transition-all duration-500 ${canReveal ? "bg-amber-400" : "bg-teal-700"}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-stone-600 italic">
          {canReveal ? "Yeterli kanıt topladın. Artık bu örgütü ifşa edebilirsin." : "Gizli bu örgüt hakkında daha fazla ipucu toplamalısın."}
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onInvestigate(faction.id)} disabled={isBusy || busy === "reveal_" + faction.id}
          className="btn-ghost-ash flex-1 py-1.5 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50">
          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}Araştır
        </button>
        {canReveal && (
          <button onClick={() => onReveal(faction.id)} disabled={busy === "reveal_" + faction.id}
            className="flex-1 py-1.5 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 border border-amber-800/60 text-amber-400 hover:border-amber-600 rounded-sm transition-all disabled:opacity-50">
            {busy === "reveal_" + faction.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}İfşa Et
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Nüfuz Operasyonu Modali ──────────────────────────────────────────────────
function InfluenceModal({ faction, locations, onClose, onConfirm, busy }) {
  const [locId, setLocId] = useState(locations[0]?.id || "");
  const influence = faction.city_influence || {};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="card-frame p-6 max-w-sm w-full space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base text-orange-400">Nüfuz Operasyonu</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-stone-500">Faction adına seçili şehirde gizli operasyon başlat. Başarı durumunda nüfuz artar.</p>
        <div>
          <div className="label-tiny mb-1.5">Hedef Şehir</div>
          <select value={locId} onChange={(e) => setLocId(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-sm px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-orange-700">
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name} — Mevcut nüfuz: {influence[l.id] ?? 0}/100</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[10px] text-stone-600">
          {[["25", "Faaliyet"], ["50", "Baskı"], ["75", "Aday"], ["100", "Kontrol"]].map(([t, label]) => (
            <div key={t} className="flex items-center gap-1"><span className="text-stone-400">{t}</span> → {label}</div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost-ash flex-1 py-2 text-xs font-heading tracking-wider">İptal</button>
          <button onClick={() => onConfirm(locId)} disabled={busy || !locId}
            className="btn-ember flex-1 py-2 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}Başlat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Faction Kurma Modali ─────────────────────────────────────────────────────
function CreateFactionModal({ locations, onClose, onCreate, busy }) {
  const [name, setName]   = useState("");
  const [type, setType]   = useState("tuccar_loncasi");
  const [locId, setLocId] = useState(locations[0]?.id || "");
  const AVAILABLE_TYPES = Object.entries(FACTION_TYPES).filter(([k]) => k !== "krallık_ordusu" && k !== "gizli_cemiyet");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="card-frame p-6 max-w-sm w-full space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg text-orange-400">Örgüt Kur</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <div className="label-tiny mb-1">Örgüt Adı</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örgütünün adı..."
              className="w-full bg-stone-900 border border-stone-700 rounded-sm px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-orange-700" />
          </div>
          <div>
            <div className="label-tiny mb-1.5">Tür</div>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {AVAILABLE_TYPES.map(([k, cfg]) => (
                <button key={k} onClick={() => setType(k)}
                  className={`py-1.5 px-2 text-[10px] font-heading tracking-wider rounded-sm border transition-all text-left flex items-center gap-1.5 ${type === k ? `${cfg.border} ${cfg.bg} ${cfg.color}` : "border-stone-700 text-stone-500"}`}>
                  <cfg.Icon className="w-3 h-3 shrink-0" />{cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label-tiny mb-1">Merkez Konum</div>
            <select value={locId} onChange={(e) => setLocId(e.target.value)}
              className="w-full bg-stone-900 border border-stone-700 rounded-sm px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-orange-700">
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.kind})</option>)}
            </select>
          </div>
        </div>
        <div className="divider-ash" />
        <p className="text-xs text-stone-500">Örgüt kurmak 200 altın gerektirir. Lider olarak başlarsın.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost-ash flex-1 py-2 text-xs font-heading tracking-wider">İptal</button>
          <button onClick={() => onCreate({ name, type, locId })} disabled={busy || !name.trim() || !locId}
            className="btn-ember flex-1 py-2 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Kur
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Üyelik Banner ────────────────────────────────────────────────────────────
const MS_CFG = {
  left:   { label: "Ayrıldı",  color: "text-amber-400",  border: "border-amber-900/50",  bg: "bg-amber-950/10"  },
  kicked: { label: "Kovuldu",  color: "text-orange-400", border: "border-orange-900/50", bg: "bg-orange-950/10" },
  rebel:  { label: "İsyancı",  color: "text-red-400",    border: "border-red-900/50",    bg: "bg-red-950/15"    },
  banned: { label: "Yasaklı",  color: "text-red-500",    border: "border-red-900/60",    bg: "bg-red-950/20"    },
};
function MembershipBanner({ status, weeksLeft, permanent }) {
  if (!status || status === "active") return null;
  const cfg = MS_CFG[status] || MS_CFG["left"];
  const msg = permanent ? "Kalıcı olarak yasaklandın." : weeksLeft > 0 ? `${weeksLeft} hafta sonra yeniden katılabilirsin.` : "";
  return (
    <div className={`card-frame p-3 flex items-start gap-3 border ${cfg.border} ${cfg.bg}`}>
      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
      <div>
        <div className={`label-tiny ${cfg.color} mb-0.5`}>{cfg.label}</div>
        <p className="text-xs text-stone-400">{msg}</p>
      </div>
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: "factions", label: "Örgütler" },
  { key: "wars",     label: "Savaşlar" },
];
function TabBar({ active, onChange, warCount }) {
  return (
    <div className="flex gap-1.5">
      {TABS.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 text-xs font-heading tracking-wider rounded-sm border transition-all ${
            active === t.key ? "border-orange-800 bg-stone-900 text-orange-400" : "border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-600"
          }`}>
          {t.label}
          {t.key === "wars" && warCount > 0 && (
            <span className="ml-1.5 text-[9px] bg-red-900 text-red-300 rounded-sm px-1">{warCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
export default function Factions() {
  const { state, setState } = useGame();
  const [factions, setFactions] = useState([]);
  const [wars,     setWars]     = useState([]);
  const [clues,    setClues]    = useState([]);
  const [warDetail, setWarDetail] = useState(null);   // Adım 6: Savaş detayları
  const [loading,  setLoading]  = useState(true);
  const [busy,     setBusy]     = useState(null);
  const [tab,      setTab]      = useState("factions");
  const [showCreate,    setShowCreate]    = useState(false);
  const [influenceFac,  setInfluenceFac]  = useState(null);
  const [showDecision,  setShowDecision]  = useState(false);  // Adım 6
  const [warOutcome,    setWarOutcome]    = useState(null);   // Adım 6

  const player          = state?.player || {};
  const playerFactionId = player.faction_id || null;
  const playerAge       = player.age || 0;
  const membershipStatus = player.faction_membership_status || null;
  const joinWeeksLeft   = player.faction_join_banned_until
    ? Math.max(0, player.faction_join_banned_until - (state?.turn || 0))
    : 0;
  const permanentBan    = joinWeeksLeft === -1;
  const canJoin         = playerAge >= 13 && !joinWeeksLeft && !permanentBan;
  const joinBlocked     = playerAge >= 13 && (joinWeeksLeft > 0 || permanentBan);
  const locations       = state?.world?.locations || [];
  const currentTurn     = state?.turn || 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, wRes, cRes, wdRes] = await Promise.all([
        api.get("/game/factions"),
        api.get("/game/factions/wars"),
        api.get("/game/factions/gizli-cemiyet/clues").catch(() => ({ data: { clues: [] } })),
        api.get("/game/factions/wars/detail").catch(() => ({ data: { war: null } })),
      ]);
      setFactions(fRes.data.factions || []);
      setWars(wRes.data.wars || []);
      setClues(cRes.data.clues || []);
      setWarDetail(wdRes.data.war || null);
    } catch {
      toast.error("Örgüt bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshState = async () => {
    try {
      const { data } = await api.get("/game/state");
      setState(data);
    } catch {}
  };

  // ─── Savaş Katılım / Kaçınma ─────────────────────────────────────────────
  const handleWarDecision = async (strategy) => {
    setBusy("war");
    try {
      if (strategy === "kaçın") {
        const { data } = await api.post("/game/factions/wars/avoid");
        if (data.success) {
          toast("Savaş çağrısından kaçındın. İtibar −5, Onur −3.");
          await refreshState();
          setState(data.state);
        }
        setShowDecision(false);
        return;
      }
      // Katıl
      const { data } = await api.post("/game/factions/wars/participate", { strategy });
      if (data.success) {
        setShowDecision(false);
        setWarOutcome(data);
        await load();
        if (data.state) setState(data.state);
      } else {
        toast.error(data.message || "Katılım başarısız.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata oluştu.");
    } finally {
      setBusy(null);
    }
  };

  // ─── Diğer handler'lar ────────────────────────────────────────────────────
  const handleJoin = async (factionId) => {
    setBusy(factionId);
    try {
      const { data } = await api.post("/game/factions/join", { faction_id: factionId });
      if (data.success) {
        toast.success(`${data.faction?.name || "Örgüt"}'e katıldın.`);
        await load(); await refreshState();
      } else {
        toast.error(data.reason || data.message || "Katılamadın.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally { setBusy(null); }
  };

  const handleLeave = async () => {
    setBusy("leave");
    try {
      const { data } = await api.post("/game/factions/leave");
      if (data.success) {
        const weeks = data.cooldown_weeks;
        toast(data.permanent ? "Ayrıldın — kalıcı yasak." : `Ayrıldın. ${weeks} hafta yasak.`);
        await load(); await refreshState();
      } else {
        toast.error(data.reason || data.message || "Ayrılamadın.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally { setBusy(null); }
  };

  const handleRebel = async (factionId) => {
    if (!window.confirm("İsyan başlatmak seni İsyancı damgalar. Emin misin?")) return;
    setBusy(factionId);
    try {
      const { data } = await api.post("/game/factions/rebel");
      if (data.success) {
        toast.success("İsyan başladı.");
        await load(); await refreshState();
      } else {
        toast.error(data.reason || data.message || "İsyan başlatılamadı.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally { setBusy(null); }
  };

  const handleInfluenceOpen  = (factionId) => { const fac = factions.find((f) => f.id === factionId); if (fac) setInfluenceFac(fac); };
  const handleInfluenceConfirm = async (locationId) => {
    if (!influenceFac) return;
    setBusy("influence");
    try {
      const { data } = await api.post("/game/factions/influence", { faction_id: influenceFac.id, location_id: locationId });
      if (data.success) {
        const locName = locations.find((l) => l.id === locationId)?.name || locationId;
        toast.success(`${locName}'de nüfuz kazanıldı! (+${data.gain ?? "?"}, toplam: ${data.new_influence ?? "?"})`);
        await load();
      } else {
        toast("Operasyon başarısız oldu.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally { setBusy(null); setInfluenceFac(null); }
  };

  const handleCreate = async ({ name, type, locId }) => {
    setBusy("create");
    try {
      const { data } = await api.post("/game/factions/create", { name, faction_type: type, home_location_id: locId });
      if (data.success) {
        toast.success(`${name} kuruldu!`);
        setShowCreate(false);
        await load(); await refreshState();
      } else {
        toast.error(data.message || "Kurulamadı.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally { setBusy(null); }
  };

  const handleInvestigate = async (factionId) => {
    setBusy(factionId + "_inv");
    try {
      const { data } = await api.post("/game/factions/gizli-cemiyet/investigate", {});
      if (data.success) {
        toast.success(`İpucu bulundu: "${data.clue_text}"`);
        await load();
      } else {
        toast.error(data.reason || "İpucu bulunamadı.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally { setBusy(null); }
  };

  const handleReveal = async (factionId) => {
    setBusy("reveal_" + factionId);
    try {
      const { data } = await api.post(`/game/factions/gizli-cemiyet/reveal/${factionId}`);
      if (data.success) {
        toast.success(data.message || "Gizli cemiyet ifşa edildi!");
        await load(); await refreshState();
      } else {
        toast.error(data.reason || "İfşa başarısız.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally { setBusy(null); }
  };

  const handleDonate = async (amount) => {
    setBusy(playerFactionId);
    try {
      const { data } = await api.post("/game/factions/donate", { amount });
      if (data.success) { await load(); await refreshState(); }
      return data;
    } catch (e) {
      return { success: false, reason: e.response?.data?.detail || "Hata" };
    } finally { setBusy(null); }
  };

  // Savaşlar tabı için savaş kartına geçmiş çatışmaları ekle
  const warsWithLog = wars.map(w => ({
    ...w,
    _battles: warDetail?.id === w.id ? warDetail.battles : [],
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-stone-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Örgüt ağı taranıyor…
      </div>
    );
  }

  return (
    <div className="space-y-5 rise-in">
      {/* Başlık */}
      <div>
        <div className="label-tiny">Örgütler & Güç Dengesi</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <Shield className="w-7 h-7 text-orange-500" /> Factionlar
        </h1>
        <p className="text-stone-400 text-sm mt-1">Dünya üzerinde faaliyet gösteren örgütler. Coğrafyayı aşan güçler.</p>
      </div>

      {/* Savaş Uyarı Bannerı (Adım 6) */}
      {playerFactionId && warDetail && (
        <WarAlertBanner
          warDetail={warDetail}
          onOpenDecision={() => setShowDecision(true)}
          loading={busy === "war"}
        />
      )}

      {/* Yaş uyarısı */}
      {playerAge < 13 && (
        <div className="card-frame p-4 border-amber-800/50 bg-amber-950/20 text-amber-400 text-sm">
          Bir örgüte katılmak için biraz daha büyümen gerekiyor. (Gerekli yaş: 13)
        </div>
      )}

      {/* Üyelik yasak banner */}
      {!playerFactionId && membershipStatus && membershipStatus !== "active" && (
        <MembershipBanner status={membershipStatus} weeksLeft={joinWeeksLeft} permanent={permanentBan} />
      )}

      {/* Mevcut üyelik özeti */}
      {playerFactionId && (() => {
        const myFac = factions.find((f) => f.id === playerFactionId);
        if (!myFac) return null;
        const cfg = ftCfg(myFac.type);
        return (
          <div className={`card-frame p-3 flex items-center gap-3 border ${cfg.border} ${cfg.bg}`}>
            <cfg.Icon className={`w-5 h-5 shrink-0 ${cfg.color}`} />
            <div className="flex-1 min-w-0">
              <div className="label-tiny mb-0.5">Üyesi Olduğun Örgüt</div>
              <div className="font-heading text-sm text-stone-100">{myFac.name}</div>
              <div className="text-xs text-stone-500">{cfg.label}</div>
            </div>
            {warDetail && (
              <div className="text-right shrink-0">
                <div className="text-[9px] text-red-500 font-heading uppercase">Savaşta</div>
                <div className="text-xs text-stone-400">{warDetail.duration_weeks} hafta</div>
              </div>
            )}
          </div>
        );
      })()}

      {/* İstatistik özet */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card-frame p-2.5 text-center">
          <div className="label-tiny mb-0.5">Aktif Örgüt</div>
          <div className="font-heading text-xl text-orange-400">{factions.filter(f => f.active).length}</div>
        </div>
        <div className="card-frame p-2.5 text-center">
          <div className="label-tiny mb-0.5">Savaşta</div>
          <div className="font-heading text-xl text-red-400">{wars.length}</div>
        </div>
        <div className="card-frame p-2.5 text-center">
          <div className="label-tiny mb-0.5">Uyuyan</div>
          <div className="font-heading text-xl text-stone-600">{factions.filter(f => !f.active).length}</div>
        </div>
      </div>

      {/* Tab */}
      <TabBar active={tab} onChange={setTab} warCount={wars.length} />

      {/* ── ÖRGÜTLER TAB ── */}
      {tab === "factions" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {factions.map((f) => {
              if (!f.active) return <DormantFactionCard key={f.id} faction={f} />;
              if (f.is_secret) {
                const clueEntry = clues.find(c => c.faction_id === f.id) || {};
                return (
                  <SecretSocietyCard key={f.id} faction={f}
                    clueCount={clueEntry.clue_count || 0} threshold={clueEntry.threshold || 5}
                    onInvestigate={handleInvestigate} onReveal={handleReveal} busy={busy} />
                );
              }
              return (
                <FactionCard key={f.id} faction={f}
                  playerFactionId={playerFactionId} playerAge={playerAge}
                  canJoin={canJoin} joinBlocked={joinBlocked} joinWeeksLeft={joinWeeksLeft}
                  onJoin={handleJoin} onLeave={handleLeave} onRebel={handleRebel}
                  onInfluence={handleInfluenceOpen} onDonate={handleDonate}
                  busy={busy} locations={locations} player={player}
                  warDetail={f.id === playerFactionId ? warDetail : null}
                  onOpenDecision={() => setShowDecision(true)}
                />
              );
            })}
            {factions.length === 0 && (
              <div className="card-frame p-8 text-center text-stone-500 col-span-2">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Henüz örgüt oluşmamış.</p>
              </div>
            )}
          </div>

          {!playerFactionId && playerAge >= 16 ? (
            <button onClick={() => setShowCreate(true)}
              className="btn-ghost-ash w-full py-2.5 text-sm font-heading tracking-wider flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Kendi Örgütünü Kur
            </button>
          ) : !playerFactionId && playerAge < 16 ? (
            <p className="text-center text-xs text-stone-600 italic">Örgüt kurmak için 16 yaşında olmalısın.</p>
          ) : null}
        </div>
      )}

      {/* ── SAVAŞLAR TAB ── */}
      {tab === "wars" && (
        <div className="space-y-3">
          {wars.length === 0 ? (
            <div className="card-frame p-8 text-center text-stone-500">
              <Swords className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Şu an aktif savaş yok.</p>
            </div>
          ) : (
            <>
              {/* Adım 6: Zenginleştirilmiş savaş kartları */}
              {warsWithLog.map((w, i) => (
                <WarDetailCard
                  key={w.id || i}
                  war={w}
                  playerFactionId={playerFactionId}
                  turn={currentTurn}
                  onOpenDecision={() => setShowDecision(true)}
                />
              ))}
              {/* Toplam güç tablosu */}
              <div className="card-frame p-4 space-y-3">
                <div className="label-tiny">Güç Dengesi — Tüm Savaşlar</div>
                {wars.map((w, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3">
                    <Bar label={w.attacker_name || w.faction_a} value={w.attacker_strength || 50} color="bg-orange-700" />
                    <Bar label={w.defender_name || w.faction_b} value={w.defender_strength || 50} color="bg-red-700" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MODALLAR ── */}
      {showCreate && (
        <CreateFactionModal locations={locations} onClose={() => setShowCreate(false)}
          onCreate={handleCreate} busy={busy === "create"} />
      )}
      {influenceFac && (
        <InfluenceModal faction={influenceFac} locations={locations}
          onClose={() => setInfluenceFac(null)} onConfirm={handleInfluenceConfirm}
          busy={busy === "influence"} />
      )}

      {/* Adım 6: Savaş Karar Modali */}
      {showDecision && warDetail && (
        <WarDecisionModal
          warDetail={warDetail}
          onClose={() => setShowDecision(false)}
          onDecide={handleWarDecision}
          busy={busy === "war"}
        />
      )}

      {/* Adım 6: Savaş Sonuç Modali */}
      {warOutcome && (
        <WarOutcomeModal
          result={warOutcome}
          onClose={() => setWarOutcome(null)}
        />
      )}
    </div>
  );
}
