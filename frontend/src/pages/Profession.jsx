import { useState } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Briefcase, Loader2, TrendingUp, Zap, Star,
  ChevronRight, Lock, Flame,
} from "lucide-react";

// ── Meslek tanımları (frontend'de gösterim için) ──────────────────────────
const PROFESSION_DATA = {
  "işsiz":          { icon: "😴", color: "text-stone-500",  income: [0, 0],    trains: [] },
  "köylü":          { icon: "🌾", color: "text-green-400",  income: [0, 2],    trains: ["Dayanıklılık"] },
  "çiftçi":         { icon: "🌿", color: "text-emerald-400",income: [1, 4],    trains: ["Dayanıklılık", "Zanaatkarlık"] },
  "avcı":           { icon: "🏹", color: "text-amber-400",  income: [1, 6],    trains: ["Savaş", "Dayanıklılık"] },
  "demirci çırağı": { icon: "🔨", color: "text-orange-400", income: [1, 4],    trains: ["Zanaatkarlık", "Güç"] },
  "demirci":        { icon: "⚒️", color: "text-orange-500", income: [4, 12],   trains: ["Zanaatkarlık", "Güç"] },
  "tüccar":         { icon: "💰", color: "text-yellow-400", income: [3, 8],    trains: ["Ticaret", "Sosyal", "Karizm"] },
  "haydut":         { icon: "🗡️", color: "text-red-400",   income: [3, 12],   trains: ["Savaş", "Ticaret"] },
  "asker":          { icon: "⚔️", color: "text-red-500",   income: [2, 5],    trains: ["Savaş", "Güç", "Dayanıklılık"] },
  "şövalye":        { icon: "🛡️", color: "text-sky-400",   income: [6, 18],   trains: ["Savaş", "Güç", "Karizm"] },
  "şifacı":         { icon: "🌿", color: "text-teal-400",  income: [3, 10],   trains: ["Zanaatkarlık", "Sosyal", "Zeka"] },
  "katip":          { icon: "📜", color: "text-blue-400",  income: [2, 7],    trains: ["Zeka"] },
  "rahip":          { icon: "✝️", color: "text-purple-400",income: [2, 8],    trains: ["Sosyal", "Karizm"] },
  "lord":           { icon: "👑", color: "text-amber-500", income: [15, 70],  trains: ["Sosyal", "Savaş", "Karizm"] },
};

// Meslek değiştirme gereksinimleri
const PROFESSION_REQS = {
  "köylü":          { minAge: 7  },
  "çiftçi":         { minAge: 10 },
  "avcı":           { minAge: 12 },
  "demirci çırağı": { minAge: 13 },
  "demirci":        { minAge: 13, prev: "demirci çırağı" },
  "tüccar":         { minAge: 14 },
  "haydut":         { minAge: 14 },
  "asker":          { minAge: 16 },
  "şövalye":        { minAge: 18 },
  "şifacı":         { minAge: 16 },
  "katip":          { minAge: 13 },
  "rahip":          { minAge: 16 },
  "lord":           { minAge: 18 },
};

// ── sub-components ────────────────────────────────────────────────────────
function IncomeRange({ lo, hi }) {
  if (lo === 0 && hi === 0) return <span className="text-stone-600">Gelir yok</span>;
  return (
    <span className="text-amber-400 font-heading">
      {lo}–{hi} <span className="text-stone-500 font-normal text-[10px]">altın/gün</span>
    </span>
  );
}

function TrainBadge({ label }) {
  return (
    <span className="text-[9px] font-heading tracking-wider border border-stone-700 text-stone-400 px-1.5 py-0.5 rounded-sm">
      {label}
    </span>
  );
}

function WorkResult({ result, onClose }) {
  if (!result) return null;
  return (
    <div className="fixed inset-0 z-50 bg-stone-950/90 flex items-center justify-center p-4">
      <div className="bg-stone-950 border border-stone-800 w-full max-w-sm rounded-sm">
        <div className="px-5 pt-5 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <span className="font-heading text-stone-200 tracking-wider text-sm">ÇALIŞMA SONUCU</span>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {result.income > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              +{result.income} altın kazandın
            </div>
          )}
          {result.week_passed && (
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <Zap className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              Bir hafta tamamlandı
            </div>
          )}
          {result.leveled?.length > 0 && result.leveled.map(([type, name, lvl], i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-emerald-400">
              <Star className="w-3.5 h-3.5 shrink-0" />
              {type === "stat" ? name : name} seviye {lvl}'e yükseldi!
            </div>
          ))}
          {result.week_passed && result.income === 0 && !result.leveled?.length && (
            <div className="text-sm text-stone-500">Bu hafta boyunca çalıştın.</div>
          )}
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full btn-ember py-2.5 font-heading text-xs tracking-widest">
            Devam Et →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────
export default function Profession() {
  const { state, fetchState } = useGame() || {};
  const [working, setWorking]     = useState(false);
  const [changing, setChanging]   = useState(false);
  const [workResult, setWorkResult] = useState(null);
  const [showChange, setShowChange] = useState(false);

  const player = state?.player || {};
  const age    = player?.age || 0;
  const prof   = player?.profession || "işsiz";
  const profData = PROFESSION_DATA[prof] || PROFESSION_DATA["işsiz"];

  const handleWork = async () => {
    setWorking(true);
    try {
      const { data } = await api.post("/game/work");
      if (fetchState) await fetchState();
      setWorkResult(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Çalışılamadı.");
    } finally {
      setWorking(false);
    }
  };

  const handleChangeProfession = async (newProf) => {
    setChanging(true);
    try {
      await api.post("/game/job", { profession: newProf });
      if (fetchState) await fetchState();
      setShowChange(false);
      toast.success(`Mesleğin değişti: ${newProf}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Meslek değiştirilemedi.");
    } finally {
      setChanging(false);
    }
  };

  if (!state) return null;

  // Erişilebilir meslekler
  const available = Object.entries(PROFESSION_DATA).filter(([id]) => {
    if (id === "işsiz" || id === prof) return false;
    const req = PROFESSION_REQS[id];
    if (!req) return true;
    if (age < (req.minAge || 0)) return false;
    if (req.prev && player?.profession !== req.prev) return false;
    return true;
  });

  const locked = Object.entries(PROFESSION_DATA).filter(([id]) => {
    if (id === "işsiz" || id === prof) return false;
    const req = PROFESSION_REQS[id];
    if (!req) return false;
    return age < (req.minAge || 0) || (req.prev && player?.profession !== req.prev);
  });

  return (
    <div className="space-y-5 rise-in pb-24 lg:pb-6 max-w-2xl mx-auto">

      {/* ── Mevcut meslek ── */}
      <div>
        <div className="label-tiny mb-2">Meslek</div>
        <div className="card-frame p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{profData.icon}</span>
            <div>
              <div className={`font-heading text-xl capitalize ${profData.color}`}>{prof}</div>
              <div className="text-xs text-stone-500">{age} yaş · {player?.location_name || "Bilinmiyor"}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <div className="label-tiny mb-1">Günlük Kazanç</div>
              <IncomeRange lo={profData.income[0]} hi={profData.income[1]} />
            </div>
            <div>
              <div className="label-tiny mb-1">Geliştirdiği Alanlar</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {profData.trains.length > 0
                  ? profData.trains.map(t => <TrainBadge key={t} label={t} />)
                  : <span className="text-stone-600 text-xs">—</span>
                }
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-stone-500 mb-4">
            <div>Çalışma birimi: <span className="text-stone-300">{player?.work_units || 0}/7</span></div>
            <div>7 birimde 1 hafta geçer ve eğitim uygulanır</div>
          </div>

          <button
            onClick={handleWork}
            disabled={working || prof === "işsiz"}
            className="w-full btn-ember py-3 font-heading text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
            {working ? "ÇALIŞIYOR…" : "BİR GÜN ÇALIŞ"}
          </button>

          {prof === "işsiz" && (
            <p className="text-center text-xs text-stone-600 mt-2">Bir meslek seç, sonra çalışabilirsin.</p>
          )}
        </div>
      </div>

      {/* ── Meslek değiştir ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="label-tiny">Meslek Değiştir</div>
          <button
            onClick={() => setShowChange(v => !v)}
            className="text-[10px] font-heading tracking-wider text-stone-500 hover:text-amber-400 flex items-center gap-1"
          >
            {showChange ? "Kapat" : "Göster"} <ChevronRight className={`w-3 h-3 transition-transform ${showChange ? "rotate-90" : ""}`} />
          </button>
        </div>

        {showChange && (
          <div className="space-y-2">
            {available.length > 0 && (
              <div className="space-y-2">
                {available.map(([id, data]) => (
                  <button
                    key={id}
                    onClick={() => handleChangeProfession(id)}
                    disabled={changing}
                    className="w-full flex items-center gap-3 p-3 card-frame hover:border-stone-600 hover:bg-stone-900/60 transition-all text-left disabled:opacity-50"
                  >
                    <span className="text-2xl">{data.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-heading text-sm capitalize ${data.color}`}>{id}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {data.trains.map(t => <TrainBadge key={t} label={t} />)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <IncomeRange lo={data.income[0]} hi={data.income[1]} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {locked.length > 0 && (
              <div className="space-y-2">
                <div className="label-tiny text-stone-600 mt-3">Kilitli Meslekler</div>
                {locked.map(([id, data]) => {
                  const req = PROFESSION_REQS[id];
                  const reason = age < (req?.minAge || 0)
                    ? `${req?.minAge} yaş gerekli`
                    : req?.prev ? `Önce "${req.prev}" olman gerekli` : "";
                  return (
                    <div key={id} className="flex items-center gap-3 p-3 card-frame opacity-40">
                      <span className="text-2xl grayscale">{data.icon}</span>
                      <div className="flex-1">
                        <div className="font-heading text-sm capitalize text-stone-500">{id}</div>
                        <div className="text-[10px] text-stone-600">{reason}</div>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-stone-700 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}

            {available.length === 0 && locked.length === 0 && (
              <div className="card-frame p-4 text-stone-500 text-sm text-center">
                Şu an değiştirebileceğin başka bir meslek yok.
              </div>
            )}
          </div>
        )}
      </div>

      {workResult && (
        <WorkResult result={workResult} onClose={() => setWorkResult(null)} />
      )}
    </div>
  );
}
