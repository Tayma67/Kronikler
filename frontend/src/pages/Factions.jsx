/**
 * Factions.jsx — Örgütler & Güç Dengesi
 *
 * Yeniden tasarım: Adım 4
 * - 10 faction tipi (yeni sistem)
 * - Şehir nüfuz haritası (bölge yerine)
 * - Rank ilerleme sistemi
 * - Nüfuz operasyonu butonu
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
} from "lucide-react";

// ─── Faction Tip Konfigürasyonu (10 tip) ─────────────────────────────────────

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

// ─── Yardımcı bileşenler ──────────────────────────────────────────────────────

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

// ─── Rank İlerleme ───────────────────────────────────────────────────────────

function RankProgress({ faction, player }) {
  const rankTable = faction.rank_table || [];
  const playerRank = player?.faction_rank ?? 0;
  const contribution = player?.faction_contribution ?? 0;

  if (!rankTable.length) return null;

  const currentRankName = rankTable[playerRank] || rankTable[0];
  const nextRankName    = rankTable[playerRank + 1];
  const isMaxRank       = playerRank >= rankTable.length - 1;

  // Katkı progress (yaklaşık — backend'den contribution_goal beklenir, yoksa göster)
  const goal = player?.faction_contribution_goal || 20;

  return (
    <div className="card-frame p-4 space-y-3">
      <div className="label-tiny text-orange-400">Senin Durumun</div>

      {/* Rank */}
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
        {isMaxRank && (
          <Star className="w-4 h-4 text-amber-400" />
        )}
      </div>

      {/* Katkı progress */}
      {!isMaxRank && (
        <Bar
          value={contribution}
          max={goal}
          color="bg-amber-600"
          label="Katkı"
          labelRight={`${contribution} / ${goal}`}
        />
      )}

      {/* Hafta bilgisi */}
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
  const entries = Object.entries(cityInfluence || {})
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  if (!entries.length) {
    return (
      <div className="text-xs text-stone-600 italic py-2 text-center">
        Henüz hiçbir şehirde nüfuz yok.
      </div>
    );
  }

  const locName = (id) =>
    locations.find((l) => l.id === id)?.name || id.slice(0, 12);

  return (
    <div className="space-y-2">
      {entries.map(([locId, val]) => (
        <div key={locId} className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-stone-300">
              <InfluenceDot value={val} />
              {locName(locId)}
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
}) {
  const cfg = ftCfg(faction.type);
  const { Icon } = cfg;
  const isPlayerFaction = faction.id === playerFactionId;
  const isBusy = busy === faction.id;
  const [expanded, setExpanded] = useState(false);
  const [donateAmount, setDonateAmount] = useState(10);
  const [donateMsg, setDonateMsg] = useState(null);

  return (
    <div className={`card-frame p-4 flex flex-col gap-3 border ${cfg.border} ${cfg.bg} transition-all ${isPlayerFaction ? "ring-1 ring-orange-700/50" : ""}`}>

      {/* Başlık */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-5 h-5 shrink-0 ${cfg.color}`} />
          <div className="min-w-0">
            <div className="label-tiny">{cfg.label}</div>
            <h3 className={`font-heading text-sm leading-tight ${cfg.color} truncate`}>
              {faction.name}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isPlayerFaction && (
            <span className="text-[9px] font-heading tracking-wider uppercase px-2 py-0.5 rounded-sm border border-orange-800 bg-orange-950/30 text-orange-400">
              ÜYEsin
            </span>
          )}
          {faction.at_war_with?.length > 0 && (
            <span className="text-[9px] font-heading tracking-wider uppercase text-red-400 border border-red-900 bg-red-950/30 px-1.5 py-0.5 rounded-sm animate-pulse">
              Savaşta
            </span>
          )}
        </div>
      </div>

      {/* Lider + Üye sayısı + Trend */}
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>
          <span className="text-stone-400">Lider:</span> {faction.leader || "—"}
        </span>
        <div className="flex items-center gap-2">
          {/* Trend rozeti */}
          {faction.influence_trend === "yukari" && (
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-heading">
              <TrendingUp className="w-3 h-3" />
              {faction.influence_delta_4w > 0 ? `+${faction.influence_delta_4w}` : ""}
            </span>
          )}
          {faction.influence_trend === "asagi" && (
            <span className="flex items-center gap-0.5 text-[10px] text-red-400 font-heading">
              <TrendingDown className="w-3 h-3" />
              {faction.influence_delta_4w}
            </span>
          )}
          {faction.influence_trend === "sabit" && (
            <span className="flex items-center gap-0.5 text-[10px] text-stone-500 font-heading">
              <Minus className="w-3 h-3" />
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {faction.member_count ?? faction.members?.length ?? 0}
          </span>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Bar label="İstikrar"    value={faction.stability}      color={faction.stability >= 70 ? "bg-emerald-700" : faction.stability >= 40 ? "bg-amber-700" : "bg-red-700"} />
        <Bar label="Ekonomi"     value={faction.economy_level}  color="bg-amber-700" />
        <Bar label="İtibar"      value={faction.reputation}     color="bg-sky-700" />
        <Bar label="Korku"       value={faction.fear_level}     color="bg-purple-700" />
      </div>

      {/* Hedef */}
      {faction.primary_goal && (
        <div className="text-[10px] text-stone-500 italic border-l-2 border-stone-800 pl-2">
          {faction.primary_goal}
        </div>
      )}

      {/* Nüfuz Haritası (toggle) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-stone-600 hover:text-stone-400 transition-colors"
      >
        <MapPin className="w-3 h-3" />
        Şehir Nüfuzları
        <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && (
        <InfluenceMap cityInfluence={faction.city_influence} locations={locations} />
      )}

      {/* Oyuncu rank progress (sadece kendi factionı) */}
      {isPlayerFaction && (
        <RankProgress faction={faction} player={player} />
      )}

      {/* Bağış Paneli (sadece kendi factionı) */}
      {isPlayerFaction && (
        <div className="card-frame p-4 space-y-3">
          <div className="label-tiny text-orange-400">Hazineye Bağış</div>
          <div className="text-xs text-stone-500">Her 10 altın = 1 katkı puanı</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={10}
              step={10}
              value={donateAmount}
              onChange={e => setDonateAmount(Math.max(10, parseInt(e.target.value) || 10))}
              className="w-24 bg-stone-800 border border-stone-700 text-stone-100 text-sm rounded-sm px-2 py-1 focus:outline-none focus:border-amber-600"
            />
            <button
              onClick={async () => {
                setDonateMsg(null);
                const res = await onDonate(donateAmount);
                if (res?.success) {
                  setDonateMsg({ ok: true, text: `+${res.contribution_gained} katkı kazandın! (Toplam: ${res.new_contribution})` });
                } else {
                  setDonateMsg({ ok: false, text: res?.reason || "Bağış başarısız." });
                }
              }}
              disabled={isBusy}
              className="btn-ember py-1.5 px-4 text-xs font-heading tracking-wider flex items-center gap-1.5 disabled:opacity-50"
            >
              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Bağış Yap
            </button>
          </div>
          {donateMsg && (
            <div className={`text-xs ${donateMsg.ok ? "text-green-400" : "text-red-400"}`}>
              {donateMsg.text}
            </div>
          )}
        </div>
      )}

      {/* Aksiyon butonları */}
      <div className="flex gap-2 pt-0.5">
        {isPlayerFaction ? (
          <>
            {/* Nüfuz operasyonu */}
            <button
              onClick={() => onInfluence(faction.id)}
              disabled={isBusy}
              className="btn-ghost-ash flex-1 py-1.5 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
              Nüfuz
            </button>
            <button
              onClick={onLeave}
              disabled={isBusy}
              className="btn-ghost-ash flex-1 py-1.5 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" /> Ayrıl
            </button>
            {playerAge >= 18 && (
              <button
                onClick={() => onRebel(faction.id)}
                disabled={isBusy}
                className="py-1.5 px-3 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50 border border-red-900/50 text-red-400 hover:border-red-700 rounded-sm transition-all"
              >
                <Swords className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : !playerFactionId ? (
          canJoin ? (
            <button
              onClick={() => onJoin(faction.id)}
              disabled={isBusy}
              className="btn-ember flex-1 py-1.5 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
              Katıl
            </button>
          ) : joinBlocked ? (
            <div className="flex-1 py-1.5 text-xs text-orange-700 italic text-center flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {joinWeeksLeft === -1 ? "Kalıcı yasak" : `${joinWeeksLeft} hafta yasak`}
            </div>
          ) : (
            <div className="text-xs text-amber-700 italic flex-1 text-center py-1">
              Katılmak için biraz daha büyümen gerekiyor
            </div>
          )
        ) : (
          <div className="text-xs text-stone-600 italic flex-1 text-center py-1">
            Başka örgüte üyesin
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Uyuyan (Dormant) Faction Kartı ─────────────────────────────────────────

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
      <p className="text-[10px] text-stone-700 italic">
        Bu tür örgüt henüz bölgede aktif değil.
      </p>
    </div>
  );
}

// ─── Gizli Cemiyet Dedektif Kartı ────────────────────────────────────────────

function SecretSocietyCard({ faction, clueCount = 0, threshold = 5, onInvestigate, onReveal, busy }) {
  const pct = Math.min(100, (clueCount / threshold) * 100);
  const canReveal = clueCount >= threshold;
  const isBusy = busy === faction.id + "_inv";

  return (
    <div className="card-frame p-4 flex flex-col gap-3 border border-teal-900/60 bg-teal-950/15">
      {/* Başlık */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-teal-400" />
          <div>
            <div className="label-tiny text-teal-600">Gizli Cemiyet</div>
            <h3 className="font-heading text-sm text-teal-300">Kimliği Bilinmiyor</h3>
          </div>
        </div>
        <span className="text-[9px] font-heading tracking-wider uppercase px-2 py-0.5 rounded-sm border border-teal-900 bg-teal-950/50 text-teal-500">
          Gizli
        </span>
      </div>

      {/* Dedektif progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="label-tiny text-stone-500">İpucu İlerlemesi</span>
          <span className="text-[10px] text-stone-400 font-heading">{clueCount} / {threshold}</span>
        </div>
        <div className="bg-stone-900 rounded-full overflow-hidden h-1.5">
          <div
            className={`h-full transition-all duration-500 ${canReveal ? "bg-amber-400" : "bg-teal-700"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-stone-600 italic">
          {canReveal
            ? "Yeterli kanıt topladın. Artık bu örgütü ifşa edebilirsin."
            : "Gizli bu örgüt hakkında daha fazla ipucu toplamalısın."}
        </p>
      </div>

      {/* Trend (maskelenmiş ama gösterilir) */}
      {faction.influence_trend && faction.influence_trend !== "sabit" && (
        <div className="text-[10px] text-stone-600 italic border-l-2 border-teal-900/50 pl-2">
          Fısıltılar bu örgütün son zamanlarda{" "}
          {faction.influence_trend === "yukari" ? "güçlendiğini" : "zayıfladığını"} söylüyor.
        </div>
      )}

      {/* Aksiyon butonları */}
      <div className="flex gap-2">
        <button
          onClick={() => onInvestigate(faction.id)}
          disabled={isBusy || busy === "reveal_" + faction.id}
          className="btn-ghost-ash flex-1 py-1.5 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Araştır
        </button>
        {canReveal && (
          <button
            onClick={() => onReveal(faction.id)}
            disabled={busy === "reveal_" + faction.id}
            className="flex-1 py-1.5 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 border border-amber-800/60 text-amber-400 hover:border-amber-600 rounded-sm transition-all disabled:opacity-50"
          >
            {busy === "reveal_" + faction.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
            İfşa Et
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Nüfuz Operasyonu Modal ──────────────────────────────────────────────────

function InfluenceModal({ faction, locations, onClose, onConfirm, busy }) {
  const [locId, setLocId] = useState(locations[0]?.id || "");

  // Mevcut nüfuzları göster
  const influence = faction.city_influence || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="card-frame p-6 max-w-sm w-full space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base text-orange-400">Nüfuz Operasyonu</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-stone-500">
          Faction adına seçili şehirde gizli operasyon başlat. Başarı durumunda nüfuz artar.
        </p>

        <div>
          <div className="label-tiny mb-1.5">Hedef Şehir</div>
          <select
            value={locId}
            onChange={(e) => setLocId(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-sm px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-orange-700"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} — Mevcut nüfuz: {influence[l.id] ?? 0}/100
              </option>
            ))}
          </select>
        </div>

        {/* Eşik bilgisi */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px] text-stone-600">
          {[["25", "Faaliyet"], ["50", "Baskı"], ["75", "Aday"], ["100", "Kontrol"]].map(([t, label]) => (
            <div key={t} className="flex items-center gap-1">
              <span className="text-stone-400">{t}</span> → {label}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost-ash flex-1 py-2 text-xs font-heading tracking-wider">
            İptal
          </button>
          <button
            onClick={() => onConfirm(locId)}
            disabled={busy || !locId}
            className="btn-ember flex-1 py-2 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            Başlat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Faction Kurma Modal ──────────────────────────────────────────────────────

function CreateFactionModal({ locations, onClose, onCreate, busy }) {
  const [name, setName]   = useState("");
  const [type, setType]   = useState("tuccar_loncasi");
  const [locId, setLocId] = useState(locations[0]?.id || "");

  // Oyuncunun kurabileceği tipler (krallık_ordusu ve gizli_cemiyet hariç)
  const AVAILABLE_TYPES = Object.entries(FACTION_TYPES).filter(
    ([k]) => k !== "krallık_ordusu" && k !== "gizli_cemiyet"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="card-frame p-6 max-w-sm w-full space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg text-orange-400">Örgüt Kur</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="label-tiny mb-1">Örgüt Adı</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örgütünün adı..."
              className="w-full bg-stone-900 border border-stone-700 rounded-sm px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-orange-700"
            />
          </div>
          <div>
            <div className="label-tiny mb-1.5">Tür</div>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {AVAILABLE_TYPES.map(([k, cfg]) => (
                <button
                  key={k}
                  onClick={() => setType(k)}
                  className={`py-1.5 px-2 text-[10px] font-heading tracking-wider rounded-sm border transition-all text-left flex items-center gap-1.5 ${type === k ? `${cfg.border} ${cfg.bg} ${cfg.color}` : "border-stone-700 text-stone-500"}`}
                >
                  <cfg.Icon className="w-3 h-3 shrink-0" />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label-tiny mb-1">Merkez Konum</div>
            <select
              value={locId}
              onChange={(e) => setLocId(e.target.value)}
              className="w-full bg-stone-900 border border-stone-700 rounded-sm px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-orange-700"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name} ({l.kind})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="divider-ash" />
        <p className="text-xs text-stone-500">
          Örgüt kurmak 200 altın gerektirir. Lider olarak başlarsın.
        </p>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost-ash flex-1 py-2 text-xs font-heading tracking-wider">
            İptal
          </button>
          <button
            onClick={() => onCreate({ name, type, locId })}
            disabled={busy || !name.trim() || !locId}
            className="btn-ember flex-1 py-2 text-xs font-heading tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Kur
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Üyelik Durumu Banner ─────────────────────────────────────────────────────

const MS_CFG = {
  left:   { label: "Ayrıldı",  color: "text-amber-400",  border: "border-amber-900/50",  bg: "bg-amber-950/10"  },
  kicked: { label: "Kovuldu",  color: "text-orange-400", border: "border-orange-900/50", bg: "bg-orange-950/10" },
  rebel:  { label: "İsyancı",  color: "text-red-400",    border: "border-red-900/50",    bg: "bg-red-950/15"    },
  banned: { label: "Yasaklı",  color: "text-red-500",    border: "border-red-900/60",    bg: "bg-red-950/20"    },
};

function MembershipBanner({ status, weeksLeft, permanent }) {
  if (!status || status === "active") return null;
  const cfg = MS_CFG[status] || MS_CFG["left"];
  const msg = permanent
    ? "Kalıcı olarak yasaklandın."
    : weeksLeft > 0 ? `${weeksLeft} hafta sonra yeniden katılabilirsin.` : "";
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

// ─── Savaş Banner ─────────────────────────────────────────────────────────────

function WarBanner({ wars }) {
  if (!wars?.length) return null;
  return (
    <div className="card-frame border-red-900/60 bg-red-950/20 p-3 flex items-start gap-3">
      <Swords className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="label-tiny text-red-400 mb-1">Aktif Savaşlar</div>
        {wars.map((w, i) => (
          <div key={i} className="text-sm text-stone-300">
            <span className="text-orange-400">{w.attacker_name}</span>
            <span className="text-stone-500 mx-1.5">⚔️</span>
            <span className="text-red-400">{w.defender_name}</span>
            <span className="text-stone-600 ml-2 text-xs">({w.cause?.replace(/_/g, " ")})</span>
          </div>
        ))}
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
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 text-xs font-heading tracking-wider rounded-sm border transition-all ${
            active === t.key
              ? "border-orange-800 bg-stone-900 text-orange-400"
              : "border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-600"
          }`}
        >
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
  const [clues,    setClues]    = useState([]);   // P3a: ipucu durumu
  const [loading,  setLoading]  = useState(true);
  const [busy,     setBusy]     = useState(null);
  const [tab,      setTab]      = useState("factions");
  const [showCreate,    setShowCreate]    = useState(false);
  const [influenceFac,  setInfluenceFac]  = useState(null); // modal için seçili faction

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, wRes, cRes] = await Promise.all([
        api.get("/game/factions"),
        api.get("/game/factions/wars"),
        api.get("/game/factions/gizli-cemiyet/clues").catch(() => ({ data: { clues: [] } })),
      ]);
      setFactions(fRes.data.factions || []);
      setWars(wRes.data.wars || []);
      setClues(cRes.data.clues || []);
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
    } finally {
      setBusy(null);
    }
  };

  const handleLeave = async () => {
    setBusy("leave");
    try {
      const { data } = await api.post("/game/factions/leave");
      if (data.success) {
        const weeks = data.cooldown_weeks;
        const isPerm = data.permanent;
        toast(isPerm ? "Ayrıldın — kalıcı yasak." : `Ayrıldın. ${weeks} hafta yasak.`);
        await load(); await refreshState();
      } else {
        toast.error(data.reason || data.message || "Ayrılamadın.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(null);
    }
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
    } finally {
      setBusy(null);
    }
  };

  const handleInfluenceOpen = (factionId) => {
    const fac = factions.find((f) => f.id === factionId);
    if (fac) setInfluenceFac(fac);
  };

  const handleInfluenceConfirm = async (locationId) => {
    if (!influenceFac) return;
    setBusy("influence");
    try {
      const { data } = await api.post("/game/factions/influence", {
        faction_id: influenceFac.id,
        location_id: locationId,
      });
      if (data.success) {
        const locName = locations.find((l) => l.id === locationId)?.name || locationId;
        toast.success(`${locName}'de nüfuz kazanıldı! (+${data.gain ?? "?"}, toplam: ${data.new_influence ?? "?"})`);
        await load();
      } else {
        toast(`Operasyon başarısız oldu. Deşifre riski var.`);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(null);
      setInfluenceFac(null);
    }
  };

  const handleCreate = async ({ name, type, locId }) => {
    setBusy("create");
    try {
      const { data } = await api.post("/game/factions/create", {
        name,
        faction_type: type,
        home_location_id: locId,
      });
      if (data.success) {
        toast.success(`${name} kuruldu!`);
        setShowCreate(false);
        await load(); await refreshState();
      } else {
        toast.error(data.message || "Kurulamadı.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(null);
    }
  };

  // P3a: Gizli cemiyet araştırma
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
    } finally {
      setBusy(null);
    }
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
    } finally {
      setBusy(null);
    }
  };

  const handleDonate = async (amount) => {
    setBusy(playerFactionId);
    try {
      const { data } = await api.post("/game/factions/donate", { amount });
      if (data.success) {
        await load(); await refreshState();
      }
      return data;
    } catch (e) {
      return { success: false, reason: e.response?.data?.detail || "Hata" };
    } finally {
      setBusy(null);
    }
  };

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
        <p className="text-stone-400 text-sm mt-1">
          Dünya üzerinde faaliyet gösteren örgütler. Coğrafyayı aşan güçler.
        </p>
      </div>

      {/* Yaş uyarısı */}
      {playerAge < 13 && (
        <div className="card-frame p-4 border-amber-800/50 bg-amber-950/20 text-amber-400 text-sm">
          Bir örgüte katılmak için biraz daha büyümen gerekiyor. (Gerekli yaş: 13)
        </div>
      )}

      {/* Üyelik yasak banner */}
      {!playerFactionId && membershipStatus && membershipStatus !== "active" && (
        <MembershipBanner
          status={membershipStatus}
          weeksLeft={joinWeeksLeft}
          permanent={permanentBan}
        />
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
          </div>
        );
      })()}

      {/* Savaş banner */}
      <WarBanner wars={wars} />

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
                  <SecretSocietyCard
                    key={f.id}
                    faction={f}
                    clueCount={clueEntry.clue_count || 0}
                    threshold={clueEntry.threshold || 5}
                    onInvestigate={handleInvestigate}
                    onReveal={handleReveal}
                    busy={busy}
                  />
                );
              }
              return (
                <FactionCard
                  key={f.id}
                  faction={f}
                  playerFactionId={playerFactionId}
                  playerAge={playerAge}
                  canJoin={canJoin}
                  joinBlocked={joinBlocked}
                  joinWeeksLeft={joinWeeksLeft}
                  onJoin={handleJoin}
                  onLeave={handleLeave}
                  onRebel={handleRebel}
                  onInfluence={handleInfluenceOpen}
                  onDonate={handleDonate}
                  busy={busy}
                  locations={locations}
                  player={player}
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

          {/* Örgüt kur butonu */}
          {!playerFactionId && playerAge >= 16 ? (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-ghost-ash w-full py-2.5 text-sm font-heading tracking-wider flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Kendi Örgütünü Kur
            </button>
          ) : !playerFactionId && playerAge < 16 ? (
            <p className="text-center text-xs text-stone-600 italic">
              Örgüt kurmak için 16 yaşında olmalısın.
            </p>
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
            wars.map((w, i) => (
              <div key={i} className="card-frame p-4 border-red-900/50 bg-red-950/15 space-y-2">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-red-400" />
                  <span className="font-heading text-sm text-stone-100">
                    {w.attacker_name} <span className="text-red-400">⚔️</span> {w.defender_name}
                  </span>
                </div>
                <div className="text-xs text-stone-500">
                  <span className="text-stone-400">Sebep:</span> {w.cause?.replace(/_/g, " ")}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Bar label={w.attacker_name} value={w.attacker_strength || 50} color="bg-orange-700" />
                  <Bar label={w.defender_name} value={w.defender_strength || 50} color="bg-red-700" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modallar */}
      {showCreate && (
        <CreateFactionModal
          locations={locations}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          busy={busy === "create"}
        />
      )}
      {influenceFac && (
        <InfluenceModal
          faction={influenceFac}
          locations={locations}
          onClose={() => setInfluenceFac(null)}
          onConfirm={handleInfluenceConfirm}
          busy={busy === "influence"}
        />
      )}
    </div>
  );
}
