import React, { useState } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Briefcase, Loader2, TrendingUp, Zap, Star,
  ChevronRight, Lock, Flame, AlertTriangle,
} from "lucide-react";

// ── Meslek tanımları (frontend'de gösterim için) ──────────────────────────
const PROFESSION_DATA = {
  "işsiz":          { icon: "😴", color: "text-stone-500",   barColor: "bg-stone-600",   income: [0, 0],   trains: [] },
  "köylü":          { icon: "🌾", color: "text-green-400",   barColor: "bg-green-700",   income: [0, 2],   trains: ["Dayanıklılık"] },
  "çiftçi":         { icon: "🌿", color: "text-emerald-400", barColor: "bg-emerald-700", income: [1, 4],   trains: ["Dayanıklılık", "Zanaatkarlık"] },
  "avcı":           { icon: "🏹", color: "text-amber-400",   barColor: "bg-amber-700",   income: [1, 6],   trains: ["Savaş", "Dayanıklılık"] },
  "demirci çırağı": { icon: "🔨", color: "text-orange-400",  barColor: "bg-orange-800",  income: [1, 4],   trains: ["Zanaatkarlık", "Güç"] },
  "demirci":        { icon: "⚒️", color: "text-orange-500",  barColor: "bg-orange-700",  income: [4, 12],  trains: ["Zanaatkarlık", "Güç"] },
  "tüccar":         { icon: "💰", color: "text-yellow-400",  barColor: "bg-yellow-700",  income: [3, 8],   trains: ["Ticaret", "Sosyal", "Karizm"] },
  "haydut":         { icon: "🗡️", color: "text-red-400",    barColor: "bg-red-800",     income: [3, 12],  trains: ["Savaş", "Ticaret"] },
  "asker":          { icon: "⚔️", color: "text-red-500",    barColor: "bg-red-700",     income: [2, 5],   trains: ["Savaş", "Güç", "Dayanıklılık"] },
  "şövalye":        { icon: "🛡️", color: "text-sky-400",    barColor: "bg-sky-700",     income: [6, 18],  trains: ["Savaş", "Güç", "Karizm"] },
  "şifacı":         { icon: "🌿", color: "text-teal-400",   barColor: "bg-teal-700",    income: [3, 10],  trains: ["Zanaatkarlık", "Sosyal", "Zeka"] },
  "zanaatkar":      { icon: "🛠️", color: "text-stone-300",  barColor: "bg-stone-600",   income: [2, 7],   trains: ["Zanaatkarlık", "Zeka"] },
  "katip":          { icon: "📜", color: "text-blue-400",   barColor: "bg-blue-700",    income: [2, 7],   trains: ["Zeka"] },
  "rahip":          { icon: "✝️", color: "text-purple-400", barColor: "bg-purple-700",  income: [2, 8],   trains: ["Sosyal", "Karizm"] },
  "lord":           { icon: "👑", color: "text-amber-500",  barColor: "bg-amber-700",   income: [15, 70], trains: ["Sosyal", "Savaş", "Karizm"] },
};

// ── Kariyer aşamaları önizleme ────────────────────────────────────────────
const CAREER_STAGES_PREVIEW = {
  "köylü":          ["Köylü", "Deneyimli Köylü", "Köy Ağası"],
  "çiftçi":         ["Çiftçi", "Verimli Çiftçi", "Toprak Sahibi", "Köy Zengini"],
  "avcı":           ["Avcı", "Tecrübeli Avcı", "Baş Avcı", "Efsane Avcı"],
  "demirci çırağı": ["Demirci Çırağı", "Yardımcı Demirci", "Kalfa Demirci"],
  "demirci":        ["Demirci", "Usta Demirci", "Demirci Üstadı", "Lonca Demircisi", "Efsane Demirci"],
  "tüccar":         ["Pazarcı", "Dükkan Sahibi", "Tüccar", "Kervan Sahibi", "Lonca Üyesi", "Lonca Yöneticisi", "Büyük Lonca Üstadı"],
  "asker":          ["Genç Asker", "Savaşmış Er", "Onbaşı", "Subaşı", "Yüzbaşı", "Bölge Komutanı", "Paşa"],
  "şövalye":        ["Şövalye", "Seçkin Şövalye", "Şampiyonu", "Efsane Şövalye"],
  "haydut":         ["Sıradan Hırsız", "Silahşör", "Çete Üyesi", "Çete Lideri", "Haraç Beyi", "Eşkıya Sultanı"],
  "şifacı":         ["Çırak Hekim", "Şifacı", "Hekim", "Ünlü Hekim", "Başhekim"],
  "zanaatkar":      ["Zanaatkar Çırak", "Kalfa", "Usta", "Tanınan Usta", "Lonca Başkanı"],
  "katip":          ["Katip", "Baş Katip", "Divân Kâtibi", "Divân Reisi"],
  "rahip":          ["Sıradan Mürit", "İmam", "Kadı", "Baş Kadı", "Müftü", "Şeyhülislam"],
  "lord":           ["Bey", "Güçlü Bey", "Vali", "Sultan"],
};

// ── Meslek değiştirme gereksinimleri (backend JOB_REQUIREMENTS ile senkronize) ──
const PROFESSION_REQS = {
  "köylü":          { minAge: 7,  stats: { strength: 2, stamina: 2 } },
  "çiftçi":         { minAge: 10, stats: { strength: 3, stamina: 3 } },
  "avcı":           { minAge: 12, stats: { stamina: 4, intelligence: 3 } },
  "demirci çırağı": { minAge: 13, stats: { strength: 4, stamina: 3 } },
  "demirci":        { minAge: 16, stats: { strength: 6, stamina: 5 }, skill: { crafting: 3 } },
  "tüccar":         { minAge: 14, stats: { charisma: 5, intelligence: 4 }, skill: { trade: 2 } },
  "haydut":         { minAge: 14, stats: { strength: 4, stamina: 3 } },
  "asker":          { minAge: 16, stats: { strength: 5, stamina: 5 }, skill: { combat: 2 } },
  "şövalye":        { minAge: 18, stats: { strength: 7, stamina: 6, charisma: 4 }, skill: { combat: 5 } },
  "şifacı":         { minAge: 16, stats: { intelligence: 6, charisma: 4 }, skill: { crafting: 3 } },
  "zanaatkar":      { minAge: 14, stats: { intelligence: 4, strength: 3 }, skill: { crafting: 2 } },
  "katip":          { minAge: 14, stats: { intelligence: 6 }, skill: { social: 2 } },
  "rahip":          { minAge: 18, stats: { intelligence: 5, charisma: 6 }, skill: { social: 4 } },
  "lord":           { minAge: 18, stats: { charisma: 6, strength: 5, intelligence: 5 }, skill: { combat: 5, social: 4 } },
};

// Stat ve skill görünen adları
const STAT_LABELS = {
  strength: "Güç", stamina: "Dayanıklılık",
  intelligence: "Zeka", charisma: "Karizm",
};
const SKILL_LABELS = {
  combat: "Savaş", trade: "Ticaret",
  crafting: "Zanaat", social: "Sosyal",
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
  const { career } = result;
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

          {/* Hikayeli anlatı */}
          {result.work_narrative && (
            <p className="text-xs text-stone-400 italic leading-relaxed border-b border-stone-900 pb-3">
              {result.work_narrative}
            </p>
          )}

          {/* Kariyer terfisi — EN ÖNEMLİ BİLGİ */}
          {career?.promoted && career.current_stage && (
            <div className="flex items-start gap-2 text-sm text-amber-400 bg-amber-950/20 border border-amber-900/40 rounded-sm px-3 py-2">
              <Star className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-heading tracking-wider">Yeni Unvan!</div>
                <div className="text-xs mt-0.5">{career.current_stage.title}</div>
                {career.current_stage.desc && (
                  <div className="text-xs text-amber-600 mt-0.5 italic">{career.current_stage.desc}</div>
                )}
              </div>
            </div>
          )}

          {/* Gelir */}
          {result.income > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              +{result.income} altın kazandın
            </div>
          )}

          {/* Hafta geçti */}
          {result.week_passed && (
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <Zap className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              Bir ay tamamlandı — eğitim uygulandı
            </div>
          )}

          {/* Stat/Skill seviye atlama */}
          {result.leveled?.length > 0 && result.leveled.map(([type, name, lvl], i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-emerald-400">
              <Star className="w-3.5 h-3.5 shrink-0" />
              {name} seviye {lvl}'e yükseldi!
            </div>
          ))}

          {/* Kariyer progress bar (terfi yoksa göster) */}
          {career && !career.promoted && career.next_stage && (
            <div className="pt-1">
              <div className="flex justify-between text-[10px] text-stone-600 mb-1">
                <span>Kariyer: {career.current_stage?.title}</span>
                <span>{career.job_xp} / {career.next_stage.xp_required} XP</span>
              </div>
              <div className="bg-stone-900 rounded-full h-1 overflow-hidden">
                <div
                  className="h-full bg-orange-800 transition-all duration-700"
                  style={{ width: `${career.progress_pct ?? 0}%` }}
                />
              </div>
            </div>
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
  const [working, setWorking]         = useState(false);
  const [changing, setChanging]       = useState(false);
  const [workResult, setWorkResult]   = useState(null);
  const [showChange, setShowChange]   = useState(false);
  const [confirmProf, setConfirmProf] = useState(null);
  // R2: çalışma tarzı (varsayılan hatırlanır) + bekleyen meslek mini-olayı
  const [workStyle, setWorkStyle] = useState(
    localStorage.getItem("kronikler_work_style") || "normal");
  const [workEvent, setWorkEvent] = useState(null);
  const WORK_STYLES = [
    { id: "garantici", label: "Garantici", icon: "🛡️", hint: "×0.8 · risksiz" },
    { id: "normal",    label: "Normal",    icon: "⚒️", hint: "×1.0" },
    { id: "hirsli",    label: "Hırslı",    icon: "🔥", hint: "×1.4 · %15 risk" },
    { id: "kaytarici", label: "Kaytarıcı", icon: "😴", hint: "×0.4 · sağlık +" },
  ];
  const pickStyle = (id) => {
    setWorkStyle(id);
    localStorage.setItem("kronikler_work_style", id);
  };

  const player   = state?.player || {};
  const age      = player?.age || 0;
  const prof     = player?.profession || "işsiz";
  const profData = PROFESSION_DATA[prof] || PROFESSION_DATA["işsiz"];
  const career   = player?.career || {};

  const handleWork = async () => {
    setWorking(true);
    try {
      const { data } = await api.post(`/game/work?style=${workStyle}`);
      if (data.needs_choice) {
        // R2 SIRADA: meslek mini-olayı — seçim modalı açılır
        setWorkEvent(data.work_event);
      } else {
        if (fetchState) await fetchState();
        setWorkResult(data);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Çalışılamadı.");
    } finally {
      setWorking(false);
    }
  };

  const resolveWorkEvent = async (choiceId) => {
    setWorking(true);
    try {
      const { data } = await api.post("/game/work/resolve", { choice_id: choiceId });
      setWorkEvent(null);
      if (fetchState) await fetchState();
      setWorkResult(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Seçim uygulanamadı.");
      setWorkEvent(null);
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

  // Kilit kontrolü — yaş, önkoşul meslek, stat ve skill
  const isLocked = (id) => {
    const req = PROFESSION_REQS[id];
    if (!req) return false;
    if (age < (req.minAge || 0)) return true;
    if (req.prev && player?.profession !== req.prev) return true;
    if (req.stats) {
      for (const [stat, val] of Object.entries(req.stats)) {
        if ((player?.stats?.[stat] || 0) < val) return true;
      }
    }
    if (req.skill) {
      for (const [skill, val] of Object.entries(req.skill)) {
        if ((player?.skills?.[skill] || 0) < val) return true;
      }
    }
    return false;
  };

  const available = Object.entries(PROFESSION_DATA).filter(([id]) => {
    if (id === "işsiz" || id === prof) return false;
    return !isLocked(id);
  });

  const locked = Object.entries(PROFESSION_DATA).filter(([id]) => {
    if (id === "işsiz" || id === prof) return false;
    return isLocked(id);
  });

  return (
    <div className="space-y-5 rise-in pb-24 lg:pb-6 max-w-2xl mx-auto">

      {/* ── Mevcut meslek ── */}
      <div>
        <div className="label-tiny mb-2">Meslek</div>
        <div className="card-frame p-5">

          {/* Hero kart — unvan + açıklama + kariyer bonusu */}
          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl mt-0.5">{profData.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="label-tiny mb-0.5 capitalize">{prof}</div>
              <div className={`font-heading text-2xl ${profData.color} leading-tight`}>
                {career.title || prof}
              </div>
              <div className="text-xs text-stone-500 mt-0.5">{age} yaş · {player?.location_name || "Bilinmiyor"}</div>
              {career.stage?.desc && (
                <p className="text-xs text-stone-400 mt-1.5 italic leading-relaxed">{career.stage.desc}</p>
              )}
            </div>
            {career.stage?.income_multiplier > 1 && (
              <div className="shrink-0 text-right">
                <div className="label-tiny">Kariyer Bonusu</div>
                <div className="font-heading text-emerald-400 text-sm">×{career.stage.income_multiplier.toFixed(1)}</div>
              </div>
            )}
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

          {/* Kariyer progress */}
          <div className="mb-3">
            {career.next_stage ? (
              <>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-stone-500">
                    Sonraki unvan: <span className={`font-heading ${profData.color}`}>{career.next_stage.title}</span>
                  </span>
                  <span className="text-stone-500 font-mono">{career.job_xp ?? 0} / {career.next_stage.xp_required} XP</span>
                </div>
                <div className="bg-stone-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${profData.barColor || "bg-orange-700"}`}
                    style={{ width: `${career.progress_pct ?? 0}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-heading ${profData.color}`}>{career.title}</span>
                <span className="text-stone-600">— Bu meslekte zirvedesin.</span>
              </div>
            )}
          </div>

          {/* Aylık çalışma progress — 7 gün kutusu */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-stone-500">Aylık çalışma</span>
              <span className="text-stone-500">{player?.work_units || 0}/7 gün</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 7 }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-sm transition-all ${
                    i < (player?.work_units || 0) ? "bg-amber-600" : "bg-stone-800"
                  }`}
                />
              ))}
            </div>
            <div className="text-[10px] text-stone-600 mt-1">Ay sonunda eğitim uygulanır — stat eğitimi uygulanır</div>
          </div>

          {/* R2: Çalışma Tarzı — görünür risk/ödül farkıyla 4 seçenek */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {WORK_STYLES.map((s) => (
              <button key={s.id} onClick={() => pickStyle(s.id)} disabled={working}
                className={`flex flex-col items-center gap-0.5 py-1.5 rounded-sm border transition-colors ${
                  workStyle === s.id
                    ? "border-amber-700 bg-amber-950/30 text-amber-300"
                    : "border-stone-800 text-stone-500 hover:text-stone-300"}`}>
                <span className="text-sm">{s.icon}</span>
                <span className="text-[8px] font-heading tracking-wide uppercase">{s.label}</span>
                <span className="text-[7px] text-stone-600">{s.hint}</span>
              </button>
            ))}
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
                    onClick={() => setConfirmProf(id)}
                    disabled={changing}
                    className={`w-full flex items-center gap-3 p-3 card-frame hover:border-stone-600 hover:bg-stone-900/60 transition-all text-left disabled:opacity-50 ${confirmProf === id ? "border-orange-700 bg-orange-950/20" : ""}`}
                  >
                    <span className="text-2xl">{data.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-heading text-sm capitalize ${data.color}`}>{id}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {data.trains.map(t => <TrainBadge key={t} label={t} />)}
                      </div>
                      {CAREER_STAGES_PREVIEW[id] && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {CAREER_STAGES_PREVIEW[id].map((title, i) => (
                            <React.Fragment key={title}>
                              <span className="text-[9px] text-stone-600">{title}</span>
                              {i < CAREER_STAGES_PREVIEW[id].length - 1 && (
                                <span className="text-[8px] text-stone-800">→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <IncomeRange lo={data.income[0]} hi={data.income[1]} />
                      <ChevronRight className="w-3.5 h-3.5 text-stone-600 mt-1 ml-auto" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Meslek değiştirme onay paneli */}
            {confirmProf && (() => {
              const cd = PROFESSION_DATA[confirmProf];
              const currentXp = career.job_xp || 0;
              return (
                <div className="card-frame border-orange-900/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cd?.icon}</span>
                    <div>
                      <div className={`font-heading text-base capitalize ${cd?.color}`}>{confirmProf}</div>
                      <div className="text-[10px] text-stone-500">olarak devam etmek istiyor musun?</div>
                    </div>
                  </div>
                  {currentXp > 0 && (
                    <div className="flex items-start gap-2 text-xs text-amber-500 bg-amber-950/20 border border-amber-900/30 rounded-sm px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Mevcut <strong>{currentXp} kariyer XP</strong>'in sıfırlanacak. Bu geri alınamaz.</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { handleChangeProfession(confirmProf); setConfirmProf(null); }}
                      disabled={changing}
                      className="flex-1 btn-ember py-2 text-xs font-heading tracking-wider disabled:opacity-50"
                    >
                      Evet, Değiştir
                    </button>
                    <button
                      onClick={() => setConfirmProf(null)}
                      className="px-4 py-2 text-xs font-heading text-stone-400 hover:text-stone-200 border border-stone-800 rounded-sm"
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              );
            })()}

            {locked.length > 0 && (
              <div className="space-y-2">
                <div className="label-tiny text-stone-600 mt-3">Kilitli Meslekler</div>
                {locked.map(([id, data]) => {
                  const req = PROFESSION_REQS[id];
                  return (
                    <div key={id} className="flex items-center gap-3 p-3 card-frame opacity-40">
                      <span className="text-2xl grayscale">{data.icon}</span>
                      <div className="flex-1">
                        <div className="font-heading text-sm capitalize text-stone-500">{id}</div>
                        <div className="text-[10px] text-stone-600 space-y-0.5 mt-0.5">
                          {age < (req?.minAge || 0) && (
                            <div>Yaş: {age}/{req.minAge}</div>
                          )}
                          {req?.stats && Object.entries(req.stats).map(([stat, val]) => {
                            const playerVal = player?.stats?.[stat] || 0;
                            const ok = playerVal >= val;
                            return (
                              <div key={stat} className={ok ? "text-stone-700" : "text-stone-600"}>
                                {STAT_LABELS[stat] || stat}: {playerVal}/{val}{ok ? " ✓" : ""}
                              </div>
                            );
                          })}
                          {req?.skill && Object.entries(req.skill).map(([skill, val]) => {
                            const playerVal = player?.skills?.[skill] || 0;
                            const ok = playerVal >= val;
                            return (
                              <div key={skill} className={ok ? "text-stone-700" : "text-stone-600"}>
                                {SKILL_LABELS[skill] || skill} skili: {playerVal}/{val}{ok ? " ✓" : ""}
                              </div>
                            );
                          })}
                        </div>
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
    {/* R2: Meslek Mini-Olayı modalı — iş sahnesinde seçim */}
    {workEvent && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.8)" }}>
        <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-amber-600/40"
          style={{ background: "linear-gradient(160deg, #1c1814, #111)" }}>
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #92400e, #d97706, #92400e)" }} />
          <div className="p-5 space-y-4">
            <div className="text-center text-4xl">⚒️</div>
            <div className="text-center text-[10px] tracking-[0.25em] text-amber-600/80 uppercase">
              İş Başında Bir An
            </div>
            <p className="text-zinc-200 text-sm text-center leading-relaxed italic">
              {workEvent.metin}
            </p>
            <div className="space-y-2">
              {workEvent.secenekler.map((c) => (
                <button key={c.id} disabled={working}
                  onClick={() => resolveWorkEvent(c.id)}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-zinc-200 border border-zinc-700 hover:border-amber-600/60 hover:bg-amber-900/15 transition-colors">
                  <span>{c.metin}</span>
                  {c.test && (
                    <span className="block text-[10px] text-purple-300/90 mt-0.5">
                      🎲 Sınav: {c.test.stat || c.test.skill} {c.test.esik}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
