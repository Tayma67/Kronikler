import { useState, useEffect, useRef, useCallback } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Swords, Shield, Zap, Heart, Skull, Crown, Trophy,
  ChevronRight, RefreshCw, AlertTriangle, Loader2,
  User, Flame, Target, Dices, Lock, TrendingDown, TrendingUp,
  ShieldAlert, Footprints, Flag,
} from "lucide-react";

// ─── Sabitler ─────────────────────────────────────────────────────────────────
const NPC_DANGER = {
  kral:    { level: 5, label: "Ölümcül",      color: "text-red-400",     border: "border-red-900/60",    bg: "bg-red-950/20" },
  veliaht: { level: 4, label: "Çok Tehlikeli", color: "text-orange-400",  border: "border-orange-900/60", bg: "bg-orange-950/20" },
  lord:    { level: 4, label: "Çok Tehlikeli", color: "text-orange-400",  border: "border-orange-900/60", bg: "bg-orange-950/20" },
  general: { level: 4, label: "Çok Tehlikeli", color: "text-orange-400",  border: "border-orange-900/60", bg: "bg-orange-950/20" },
  şövalye: { level: 3, label: "Tehlikeli",     color: "text-amber-400",   border: "border-amber-900/60",  bg: "bg-amber-950/20" },
  asker:   { level: 2, label: "Orta",          color: "text-stone-400",   border: "border-stone-700/60",  bg: "bg-stone-900/20" },
  tüccar:  { level: 2, label: "Orta",          color: "text-stone-400",   border: "border-stone-700/60",  bg: "bg-stone-900/20" },
};
const DEFAULT_DANGER = { level: 1, label: "Kolay", color: "text-emerald-400", border: "border-emerald-900/60", bg: "bg-emerald-950/10" };
const npcDanger = (prof) => NPC_DANGER[prof] || DEFAULT_DANGER;

const STRATEGIES = [
  {
    key: "saldır",
    label: "Saldır",
    Icon: Zap,
    color: "text-red-400",
    border: "border-red-900/60",
    bg: "bg-red-950/15",
    desc: "Saldırı +%35, savunma -%30",
    detail: "Yüksek risk, yüksek ödül. Düşmanı hızlı bitir.",
  },
  {
    key: "savun",
    label: "Savun",
    Icon: ShieldAlert,
    color: "text-sky-400",
    border: "border-sky-900/60",
    bg: "bg-sky-950/15",
    desc: "Savunma +%45, saldırı -%30",
    detail: "Güçlü düşmanlara karşı yavaş ama güvenli.",
  },
  {
    key: "kaç",
    label: "Geri Çekil",
    Icon: Footprints,
    color: "text-stone-400",
    border: "border-stone-700/60",
    bg: "bg-stone-900/20",
    desc: "Kaçma şansı %60+",
    detail: "Canın azaldıysa ya da işe yaramaz görünüyorsa.",
  },
];

// ─── Log parser ───────────────────────────────────────────────────────────────
function parseFrames(log, startPlayerHp, isNpc) {
  const frames = [];
  let enemyHp = null, playerHp = startPlayerHp, enemyHpMax = null;
  for (let i = 0; i < log.length; i++) {
    const line = log[i];
    if (!isNpc) {
      const initM = line.match(/\((\d+) can\)/);
      if (initM && enemyHpMax === null) { enemyHpMax = parseInt(initM[1]); enemyHp = enemyHpMax; }
      const dmgM = line.match(/Düşman canı: (\d+)/);
      if (dmgM) enemyHp = parseInt(dmgM[1]);
      const takM = line.match(/Canın: (\d+)/);
      if (takM) playerHp = parseInt(takM[1]);
    } else {
      const dmgM = line.match(/\(kalan: (\d+)\)/);
      if (dmgM) {
        const newHp = parseInt(dmgM[1]);
        if (enemyHpMax === null) {
          const dealM = line.match(/(\d+) hasar\. \(kalan/);
          enemyHpMax = dealM ? newHp + parseInt(dealM[1]) : newHp + 20;
        }
        enemyHp = newHp;
      }
      const takM = line.match(/\(canın: (\d+)\)/i);
      if (takM) playerHp = parseInt(takM[1]);
    }
    let type = "neutral";
    if (line.startsWith("[")) type = "info";
    else if (line.includes("hasar verdin") || line.includes("hasar.")) type = "attack";
    else if (line.includes("hasar aldın") || line.startsWith("        ")) type = "defend";
    else if (line.includes("Zafer") || line.includes("öldü") || line.includes("yenildi")) type = "result";
    else if (line.includes("Yenildin") || line.includes("kaçtın")) type = "loss";
    frames.push({ line, enemyHp: enemyHp ?? null, enemyHpMax: enemyHpMax ?? null, playerHp, type });
  }
  return frames;
}

// ─── HP Barı ─────────────────────────────────────────────────────────────────
function HpBar({ current, max, label, side, colorClass, labelIcon: Icon }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const isLow = pct < 30;
  const isDead = pct === 0;
  return (
    <div className={`flex-1 ${side === "right" ? "text-right" : ""}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${side === "right" ? "justify-end" : ""}`}>
        {side !== "right" && Icon && <Icon className="w-3 h-3 text-stone-500" />}
        <span className="label-tiny">{label}</span>
        {side === "right" && Icon && <Icon className="w-3 h-3 text-stone-500" />}
      </div>
      <div className={`font-heading text-lg ${isDead ? "text-stone-600" : isLow ? "text-red-400" : colorClass} transition-colors duration-300`}>
        {isDead ? "—" : current}<span className="text-xs text-stone-600 font-normal"> / {max}</span>
      </div>
      <div className="stat-bar mt-1.5" style={{ height: "8px" }}>
        <div
          className={`h-full transition-all duration-700 ease-out ${isDead ? "bg-stone-800" : isLow ? "bg-red-700" : colorClass === "text-emerald-400" ? "stat-bar-fill-good" : "stat-bar-fill"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Log satırı ──────────────────────────────────────────────────────────────
function LogLine({ text, type }) {
  const styles = {
    attack:  "text-orange-300",
    defend:  "text-red-400",
    result:  "text-emerald-400 font-semibold",
    loss:    "text-red-500 font-semibold",
    info:    "text-sky-400/80 italic",
    neutral: "text-stone-300",
  };
  return (
    <div className={`text-xs leading-relaxed ${styles[type] || styles.neutral}`}>
      <span className={text.startsWith("        ") ? "pl-3 opacity-80" : ""}>{text.trimStart()}</span>
    </div>
  );
}

// ─── NPC Hedef Kartı ──────────────────────────────────────────────────────────
function NpcTargetCard({ npc, relationship, selected, onSelect }) {
  const danger = npcDanger(npc.profession);
  const rel = relationship ?? 0;
  const isAlly = rel >= 30;
  return (
    <button
      onClick={() => onSelect(npc)}
      className={`w-full text-left p-3 border rounded-sm transition-all ${
        selected ? "border-orange-700 bg-orange-950/20"
        : isAlly ? `${danger.border} ${danger.bg} opacity-60 hover:opacity-80`
        : `${danger.border} ${danger.bg} hover:border-stone-600`
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-200 font-heading">{npc.name}</span>
            {selected && <ChevronRight className="w-3 h-3 text-orange-400" />}
          </div>
          <p className="text-xs text-stone-500 mt-0.5 capitalize">
            {npc.profession || "Köylü"} · {npc.age} yaş
            {isAlly && <span className="text-amber-600 ml-1.5">— müttefikin</span>}
          </p>
        </div>
        <span className={`text-[10px] font-heading tracking-wider px-1.5 py-0.5 border rounded-sm shrink-0 ${danger.border} ${danger.color}`}>
          {danger.label}
        </span>
      </div>
    </button>
  );
}

// ─── Kazanma Olasılığı Tahmini ────────────────────────────────────────────────
function WinChance({ player, strategy, targetDangerLevel }) {
  const str = player.stats?.strength ?? 1;
  const combat = player.skills?.combat ?? 0;
  const bonuses = player.equipment_bonuses || { attack: 0, defense: 0 };
  const factionRank = player.faction_rank ?? 0;
  const atkBase = 5 + str * 2 + combat * 2 + (bonuses.attack || 0) + Math.min(factionRank * 2, 10);
  
  const atkMult = strategy === "saldır" ? 1.35 : strategy === "savun" ? 0.70 : 1;
  const effAtk  = atkBase * atkMult;
  const dangerAtk = [0, 12, 18, 25, 35, 50][targetDangerLevel] ?? 15;
  
  let pct = Math.round(Math.min(95, Math.max(5, (effAtk / (effAtk + dangerAtk)) * 100)));
  if (strategy === "kaç") pct = Math.round(60 + (player.stats?.stamina ?? 1) * 2);

  const color = pct >= 70 ? "text-emerald-400" : pct >= 45 ? "text-amber-400" : "text-red-400";
  const label = pct >= 70 ? "Avantajlısın" : pct >= 45 ? "Dengeli" : "Tehlikeli";

  return (
    <div className="flex items-center justify-between text-xs px-3 py-2 border border-stone-800/50 rounded-sm bg-stone-900/20">
      <span className="text-stone-500">Tahmini sonuç</span>
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <div className={`h-full transition-all ${pct >= 70 ? "bg-emerald-700" : pct >= 45 ? "bg-amber-700" : "bg-red-700"}`}
            style={{ width: `${pct}%` }} />
        </div>
        <span className={`font-heading ${color}`}>{pct}%</span>
        <span className={`text-[10px] ${color}`}>{label}</span>
      </div>
    </div>
  );
}

// ─── Oyuncu Savaş İstatistikleri ─────────────────────────────────────────────
function PlayerCombatStats({ player }) {
  const str = player.stats?.strength ?? 1;
  const combat = player.skills?.combat ?? 0;
  const bonuses = player.equipment_bonuses || { attack: 0, defense: 0 };
  const atkPower = 5 + str * 2 + combat * 2 + (bonuses.attack || 0);
  const defPower = bonuses.defense || 0;
  const equipment = player.equipment || {};
  return (
    <div className="card-frame p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="label-tiny">Savaş Gücü</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <Zap className="w-3 h-3 text-red-400" />
            <span className="text-stone-400">Saldırı</span>
            <span className="font-heading text-stone-200">{atkPower}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Shield className="w-3 h-3 text-sky-400" />
            <span className="text-stone-400">Savunma</span>
            <span className="font-heading text-stone-200">{defPower}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-stone-500 flex-wrap">
        {equipment.weapon
          ? <span className="flex items-center gap-1"><Swords className="w-3 h-3" /> {equipment.weapon}</span>
          : null}
        {equipment.armor
          ? <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {equipment.armor}</span>
          : null}
        {!equipment.weapon && !equipment.armor && <span className="italic text-stone-600">Ekipman yok — çıplak elle</span>}
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-stone-500 flex items-center gap-1"><Heart className="w-3 h-3 text-emerald-600" /> Can</span>
          <span className={`font-heading ${player.health < 30 ? "text-red-400" : "text-emerald-400"}`}>{player.health} / 100</span>
        </div>
        <div className="stat-bar">
          <div className={player.health < 30 ? "stat-bar-fill-bad h-full" : "stat-bar-fill-good h-full"}
            style={{ width: `${player.health}%` }} />
        </div>
        {player.health < 20 && (
          <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Can çok düşük, önce iyileş
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
export default function Battle() {
  const { state, setState } = useGame();
  const [phase,          setPhase]          = useState("prep");
  const [targetMode,     setTargetMode]     = useState("random");
  const [selectedNpc,    setSelectedNpc]    = useState(null);
  const [strategy,       setStrategy]       = useState("saldır");
  const [frames,         setFrames]         = useState([]);
  const [visibleCount,   setVisibleCount]   = useState(0);
  const [currentPlayerHp,setCurrentPlayerHp]= useState(null);
  const [currentEnemyHp, setCurrentEnemyHp] = useState(null);
  const [enemyHpMax,     setEnemyHpMax]     = useState(null);
  const [enemyName,      setEnemyName]      = useState("Düşman");
  const [outcome,        setOutcome]        = useState(null);
  const [lootInfo,       setLootInfo]       = useState(null);
  const [repChange,      setRepChange]      = useState(null);
  const [busy,           setBusy]           = useState(false);
  const logRef = useRef(null);

  const player     = state?.player || {};
  const playerAge  = player.age ?? 0;
  const tooYoung   = playerAge < 13;
  const tooWeak    = player.health < 20;
  const factionAtWar = player.faction && player.faction.at_war;

  const localNpcs = (state?.world?.npcs || []).filter(
    (n) => n.alive !== false && n.location_id === player.location_id
  );

  const dangerLevel = targetMode === "npc" && selectedNpc
    ? npcDanger(selectedNpc.profession).level
    : targetMode === "faction-war"
    ? 3
    : 1;

  // ─── Savaş başlat ─────────────────────────────────────────────────────────
  const startBattle = useCallback(async () => {
    if (tooYoung) { toast.error("Savaşmak için çok küçüksün."); return; }
    if (tooWeak && strategy !== "kaç") { toast.error("Can çok düşük. Önce iyileş ya da geri çekil."); return; }
    if (targetMode === "npc" && !selectedNpc) { toast.error("Bir hedef seç."); return; }
    if (targetMode === "faction-war" && !factionAtWar) { toast.error("Factionın savaşta değil."); return; }

    setBusy(true);
    setPhase("fighting");
    setVisibleCount(0);
    setFrames([]);
    setOutcome(null);
    setLootInfo(null);
    setRepChange(null);

    try {
      let data;
      const isNpc = targetMode === "npc";

      if (isNpc) {
        const res = await api.post("/game/attack_npc", { npc_id: selectedNpc.id });
        data = res.data;
        setEnemyName(selectedNpc.name);
      } else if (targetMode === "faction-war") {
        const res = await api.post("/game/battle/faction-war", { strategy });
        data = res.data;
        setEnemyName("Faction Düşmanı");
      } else {
        const res = await api.post("/game/battle", { strategy });
        data = res.data;
        const nameM = (data.log.find(l => l.includes("çıktı")) || "").match(/bir (.+?) çıktı/);
        setEnemyName(nameM ? nameM[1] : "Haydut");
      }

      if (data.state) setState(data.state);

      const startHp = player.health;
      const parsed  = parseFrames(data.log, startHp, isNpc);
      const firstWithMax = parsed.find(f => f.enemyHpMax !== null);
      const eMax = firstWithMax?.enemyHpMax ?? 80;
      setEnemyHpMax(eMax);
      setCurrentEnemyHp(eMax);
      setCurrentPlayerHp(startHp);
      setFrames(parsed);
      setOutcome(data.outcome);

      const lootLine = data.log.find(l => l.includes("altın") || l.includes("ganimet"));
      setLootInfo(lootLine || null);

      if (data.rep_changes) {
        const total = Object.values(data.rep_changes).reduce((a, b) => a + b, 0);
        if (total !== 0) setRepChange(total);
      }

      let delay = 200;
      for (let i = 0; i < parsed.length; i++) {
        const frame = parsed[i];
        ((f, d) => setTimeout(() => {
          setVisibleCount(c => c + 1);
          if (f.enemyHp !== null) setCurrentEnemyHp(f.enemyHp);
          if (f.playerHp !== null) setCurrentPlayerHp(f.playerHp);
          if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
        }, d))(frame, delay);
        delay += 280;
      }
      setTimeout(() => { setPhase("result"); setBusy(false); }, delay + 600);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Savaş başlatılamadı.");
      setPhase("prep");
      setBusy(false);
    }
  }, [targetMode, selectedNpc, strategy, player, tooYoung, tooWeak, factionAtWar, setState]);

  const reset = () => { setPhase("prep"); setSelectedNpc(null); setFrames([]); setOutcome(null); setVisibleCount(0); };

  // ─── Çok genç ─────────────────────────────────────────────────────────────
  if (tooYoung) {
    return (
      <div className="rise-in space-y-4">
        <div><div className="label-tiny">Çatışma</div>
          <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
            <Swords className="w-7 h-7 text-orange-600" /> Savaş Alanı
          </h1>
        </div>
        <div className="card-frame p-6 text-center space-y-3 border-amber-900/50 bg-amber-950/10">
          <Lock className="w-8 h-8 text-stone-700 mx-auto" />
          <p className="text-amber-400 font-heading">Savaşmak için çok küçüksün.</p>
          <p className="text-stone-600 text-sm">13 yaşına gelince savaş alanı açılır.</p>
        </div>
      </div>
    );
  }

  // ─── HAZIRLIK EKRANI ──────────────────────────────────────────────────────
  if (phase === "prep") {
    const selStrategy = STRATEGIES.find(s => s.key === strategy);
    return (
      <div className="space-y-5 rise-in">
        <div><div className="label-tiny">Çatışma</div>
          <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
            <Swords className="w-7 h-7 text-orange-600" /> Savaş Alanı
          </h1>
          <p className="text-stone-400 text-sm mt-1">Yollar tehlikelidir. Taktik ve hedefini seç.</p>
        </div>

        {/* Oyuncu durumu */}
        <PlayerCombatStats player={player} />

        {/* Hedef türü */}
        <div>
          <div className="label-tiny mb-3">Çatışma Türü</div>
          <div className={`grid gap-2 ${factionAtWar ? "grid-cols-3" : "grid-cols-2"}`}>
            <button onClick={() => { setTargetMode("random"); setSelectedNpc(null); }}
              className={`p-3 border rounded-sm text-left transition-all ${targetMode === "random" ? "border-orange-700 bg-orange-950/20" : "border-stone-800/60 hover:border-stone-700"}`}>
              <Dices className={`w-5 h-5 mb-2 ${targetMode === "random" ? "text-orange-400" : "text-stone-600"}`} />
              <div className="label-tiny mb-0.5">Rastgele</div>
              <p className="text-xs text-stone-500">Yolda biriyle kapış</p>
            </button>
            <button onClick={() => setTargetMode("npc")}
              className={`p-3 border rounded-sm text-left transition-all ${targetMode === "npc" ? "border-orange-700 bg-orange-950/20" : "border-stone-800/60 hover:border-stone-700"}`}>
              <Target className={`w-5 h-5 mb-2 ${targetMode === "npc" ? "text-orange-400" : "text-stone-600"}`} />
              <div className="label-tiny mb-0.5">NPC Hedef</div>
              <p className="text-xs text-stone-500">Lokasyondaki birini seç</p>
            </button>
            {factionAtWar && (
              <button onClick={() => { setTargetMode("faction-war"); setSelectedNpc(null); }}
                className={`p-3 border rounded-sm text-left transition-all ${targetMode === "faction-war" ? "border-red-800 bg-red-950/20" : "border-stone-800/60 hover:border-stone-700"}`}>
                <Flag className={`w-5 h-5 mb-2 ${targetMode === "faction-war" ? "text-red-400" : "text-stone-600"}`} />
                <div className="label-tiny mb-0.5">Faction Savaşı</div>
                <p className="text-xs text-stone-500">Örgütün adına savaş</p>
              </button>
            )}
          </div>
        </div>

        {/* NPC listesi */}
        {targetMode === "npc" && (
          <div className="space-y-2 rise-in">
            <div className="label-tiny flex items-center justify-between">
              <span>Bu bölgedeki hedefler ({localNpcs.length})</span>
              {selectedNpc && <span className="text-orange-400">{selectedNpc.name} seçildi</span>}
            </div>
            {localNpcs.length === 0 ? (
              <div className="card-frame p-4 text-center text-stone-500 text-sm">Lokasyonda NPC yok.</div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {localNpcs
                  .sort((a, b) => npcDanger(b.profession).level - npcDanger(a.profession).level)
                  .map(npc => (
                    <NpcTargetCard key={npc.id} npc={npc}
                      relationship={state?.relationships?.[npc.id]}
                      selected={selectedNpc?.id === npc.id}
                      onSelect={setSelectedNpc} />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Strateji seçimi */}
        <div>
          <div className="label-tiny mb-3">Taktik Seç</div>
          <div className="grid grid-cols-3 gap-2">
            {STRATEGIES.map(s => (
              <button key={s.key} onClick={() => setStrategy(s.key)}
                className={`p-3 border rounded-sm text-left transition-all ${strategy === s.key ? `${s.border} ${s.bg}` : "border-stone-800/60 hover:border-stone-700"}`}>
                <s.Icon className={`w-4 h-4 mb-1.5 ${strategy === s.key ? s.color : "text-stone-600"}`} />
                <div className={`text-xs font-heading tracking-wider mb-0.5 ${strategy === s.key ? s.color : "text-stone-500"}`}>{s.label}</div>
                <p className="text-[10px] text-stone-600">{s.desc}</p>
              </button>
            ))}
          </div>
          {selStrategy && (
            <p className="text-xs text-stone-500 italic mt-2 px-1">{selStrategy.detail}</p>
          )}
        </div>

        {/* Win probability */}
        <WinChance player={player} strategy={strategy} targetDangerLevel={dangerLevel} />

        {/* Uyarılar */}
        {targetMode === "npc" && (
          <div className="border border-orange-900/40 bg-orange-950/10 rounded-sm p-3 text-xs text-orange-400/80 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>NPC'ye saldırmak itibara zarar verir. Lord/kral saldırısı suç kayıtlarına girer.</span>
          </div>
        )}

        {/* Savaş butonu */}
        <button onClick={startBattle}
          disabled={busy || (tooWeak && strategy !== "kaç") || (targetMode === "npc" && !selectedNpc)}
          className="w-full btn-ember py-3 font-heading tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-40">
          <Swords className="w-4 h-4" />
          {tooWeak && strategy !== "kaç" ? "ÖNCE İYİLEŞ"
           : targetMode === "npc" && !selectedNpc ? "HEDEF SEÇ"
           : strategy === "kaç" ? "GERİ ÇEKİL"
           : "SAVAŞA GİR"}
        </button>
      </div>
    );
  }

  // ─── SAVAŞ EKRANI ─────────────────────────────────────────────────────────
  if (phase === "fighting") {
    const playerHpDisplay = currentPlayerHp ?? player.health;
    const enemyHpDisplay  = currentEnemyHp ?? (enemyHpMax ?? 80);
    return (
      <div className="space-y-4 rise-in">
        <div><div className="label-tiny">Çatışma</div>
          <h1 className="font-heading text-2xl text-stone-100 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500 ember-flicker" /> Muharebe
          </h1>
        </div>
        <div className="card-frame p-4 border-stone-700/60">
          <div className="flex items-end gap-3">
            <HpBar current={playerHpDisplay} max={100} label={player.name || "Sen"}
              colorClass="text-emerald-400" labelIcon={User} />
            <div className="shrink-0 pb-4"><Swords className="w-5 h-5 text-orange-600/80" /></div>
            <HpBar current={Math.max(0, enemyHpDisplay)} max={enemyHpMax ?? 80}
              label={enemyName} side="right" colorClass="text-red-400" labelIcon={Skull} />
          </div>
        </div>
        <div ref={logRef}
          className="bg-stone-950 border border-stone-800 rounded-sm p-4 min-h-[200px] max-h-[280px] overflow-y-auto space-y-1.5 font-mono">
          {frames.length === 0
            ? <div className="flex items-center gap-2 text-stone-600 text-xs"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Bağlanıyor...</div>
            : frames.slice(0, visibleCount).map((f, i) => <LogLine key={i} text={f.line} type={f.type} />)}
          {busy && visibleCount < frames.length && (
            <div className="text-stone-600 text-xs flex items-center gap-1.5 pt-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
              <span className="animate-pulse">devam ediyor...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── SONUÇ EKRANI ─────────────────────────────────────────────────────────
  const resultCfg = {
    zafer: { icon: Trophy, title: "Zafer",      subtitle: "Düşmanı devirdin.",              color: "text-amber-400",  border: "border-amber-800/60",  bg: "bg-amber-950/15",  iconColor: "text-amber-500"  },
    kaçış: { icon: Shield, title: "Beraberlik", subtitle: "Her iki taraf da geri çekildi.", color: "text-stone-300",  border: "border-stone-700/60",  bg: "bg-stone-900/20",  iconColor: "text-stone-500"  },
    kayıp: { icon: Skull,  title: "Yenilgi",    subtitle: "Kaçmak zorunda kaldın.",         color: "text-red-400",    border: "border-red-900/60",    bg: "bg-red-950/20",    iconColor: "text-red-500"    },
  };
  const cfg = resultCfg[outcome] || resultCfg["kayıp"];
  const ResultIcon = cfg.icon;
  const newPlayer  = state?.player || player;

  return (
    <div className="space-y-5 rise-in">
      <div><div className="label-tiny">Çatışma</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <Swords className="w-7 h-7 text-orange-600" /> Savaş Alanı
        </h1>
      </div>

      <div className={`card-frame p-6 border ${cfg.border} ${cfg.bg} text-center space-y-3`}>
        <ResultIcon className={`w-10 h-10 mx-auto ${cfg.iconColor}`} />
        <div>
          <div className={`font-heading text-3xl ${cfg.color} tracking-widest`}>{cfg.title.toUpperCase()}</div>
          <p className="text-stone-400 text-sm mt-1">{cfg.subtitle}</p>
        </div>
        <div className="divider-ash my-2" />
        <div className="text-xs text-stone-400 space-y-1.5">
          <p className="flex items-center justify-center gap-1.5">
            <span className="text-stone-500">Rakip:</span>
            <span className="text-stone-200">{enemyName}</span>
          </p>
          {lootInfo && (
            <p className="flex items-center justify-center gap-1.5 text-amber-400">
              <Crown className="w-3 h-3" /> {lootInfo.trim()}
            </p>
          )}
          {outcome === "zafer" && (
            <p className="flex items-center justify-center gap-1.5 text-emerald-400">
              <TrendingUp className="w-3 h-3" /> +1 İtibar, +3 Savaş XP
            </p>
          )}
          {repChange && repChange < 0 && (
            <p className="flex items-center justify-center gap-1.5 text-red-400">
              <TrendingDown className="w-3 h-3" /> {repChange} İtibar
            </p>
          )}
          {outcome === "kayıp" && (
            <p className="flex items-center justify-center gap-1.5 text-red-400">
              <TrendingDown className="w-3 h-3" /> Paranın bir kısmı çalındı
            </p>
          )}
        </div>
      </div>

      <div className="card-frame p-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-stone-500 flex items-center gap-1"><Heart className="w-3 h-3 text-emerald-600" /> Güncel can</span>
          <span className={`font-heading ${newPlayer.health < 30 ? "text-red-400" : "text-emerald-400"}`}>{newPlayer.health} / 100</span>
        </div>
        <div className="stat-bar">
          <div className={newPlayer.health < 30 ? "stat-bar-fill-bad h-full" : "stat-bar-fill-good h-full"}
            style={{ width: `${newPlayer.health}%` }} />
        </div>
      </div>

      <details className="text-xs">
        <summary className="text-stone-600 cursor-pointer hover:text-stone-400 font-heading tracking-wider">
          Savaş kaydını gör ({frames.length} tur)
        </summary>
        <div className="mt-2 bg-stone-950 border border-stone-800 rounded-sm p-3 max-h-48 overflow-y-auto space-y-1 font-mono">
          {frames.map((f, i) => <LogLine key={i} text={f.line} type={f.type} />)}
        </div>
      </details>

      <div className="flex gap-2">
        <button onClick={reset}
          className="flex-1 btn-ember py-2.5 font-heading tracking-widest text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Tekrar Savaş
        </button>
        <button onClick={() => window.history.back()}
          className="px-4 btn-ghost-ash py-2.5 text-xs font-heading tracking-wider">
          Geri
        </button>
      </div>
    </div>
  );
}
