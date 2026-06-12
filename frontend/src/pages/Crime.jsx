import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Eye, Coins, AlertTriangle, ShieldAlert, Lock, CheckCircle,
  XCircle, Loader2, TrendingDown, Users, Sword, Star, Footprints, Flame,
} from "lucide-react";

// ─── R6: Risk merdiveni görselleri ───────────────────────────────────────────
const RISK_STYLES = {
  "düşük":  { color: "text-emerald-400", border: "border-emerald-900/50", bg: "bg-emerald-950/10" },
  "orta":   { color: "text-amber-400",   border: "border-amber-900/50",   bg: "bg-amber-950/10" },
  "yüksek": { color: "text-orange-400",  border: "border-orange-900/50",  bg: "bg-orange-950/10" },
  "kritik": { color: "text-red-400",     border: "border-red-900/50",     bg: "bg-red-950/15" },
};
const JOB_ICONS = {
  yankesicilik: "🤏", dukkan_soyma: "🏚", kervan_baskini: "🐫", konak_soygunu: "🏰",
};
const GOOD_LABELS = { "ipek": "İpek", "baharat": "Baharat", "mücevher": "Mücevher" };

// ─── Güvenlik Risk Göstergesi ─────────────────────────────────────────────────
function SecurityBadge({ security }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-stone-500 flex items-center gap-1">
        <ShieldAlert className="w-3 h-3" /> Bölge güvenliği
      </span>
      <span className={`font-heading ${
        security >= 70 ? "text-red-400" : security >= 40 ? "text-amber-400" : "text-emerald-400"
      }`}>{security}/100</span>
    </div>
  );
}

// ─── R6.1: İş Kartı ──────────────────────────────────────────────────────────
function JobCard({ job, selected, onSelect, disabled }) {
  const st = RISK_STYLES[job.risk] || RISK_STYLES["orta"];
  const locked = !!job.locked;
  return (
    <button
      onClick={() => onSelect(job.id)}
      disabled={disabled}
      className={`w-full text-left p-4 border rounded-sm transition-all space-y-2 ${
        selected
          ? `${st.border} ${st.bg} ring-1 ring-inset ${st.border}`
          : `${st.border} ${locked ? "opacity-60" : st.bg} hover:opacity-90`
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{JOB_ICONS[job.id] || "🗡"}</span>
          <span className={`font-heading text-sm ${st.color}`}>{job.label}</span>
          {job.scouted && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-sm border border-sky-900/50 bg-sky-950/20 text-sky-300">
              🔭 Keşfedildi
            </span>
          )}
        </div>
        <span className={`text-[10px] font-heading tracking-wider uppercase ${st.color}`}>
          {job.risk}
        </span>
      </div>

      <p className="text-xs text-stone-400">{job.desc}</p>

      <div className="flex flex-wrap gap-3 text-[10px] text-stone-500">
        <span className="flex items-center gap-1 text-amber-500/80">
          <Coins className="w-3 h-3" /> {job.reward_min}–{job.reward_max} akçe
        </span>
        <span className="flex items-center gap-1">suç +{job.crime_pts}</span>
        <span className={`flex items-center gap-1 ${
          job.chance_pct >= 55 ? "text-emerald-400" : job.chance_pct >= 35 ? "text-amber-400" : "text-red-400"
        }`}>şans %{job.chance_pct}</span>
      </div>

      {locked && (
        <div className="flex items-center gap-1.5 text-[10px] text-stone-500 border border-stone-800/60 rounded-sm px-2 py-1">
          <Lock className="w-3 h-3 shrink-0" /> {job.locked}
        </div>
      )}
    </button>
  );
}

// ─── R6.2: İcra Sahnesi Modalı ───────────────────────────────────────────────
function SceneModal({ scene, onChoose, busy }) {
  const CHOICE_STYLES = {
    saklan:      "border-sky-900/50 text-sky-300 hover:bg-sky-950/20",
    sustur:      "border-red-900/50 text-red-400 hover:bg-red-950/20",
    kac:         "border-amber-900/50 text-amber-400 hover:bg-amber-950/20",
    kacis_plani: "border-emerald-800/60 text-emerald-300 hover:bg-emerald-950/20",
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-sm card-frame p-5 space-y-4 rise-in border-red-900/40">
        <div className="flex items-center gap-2 text-sm font-heading text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span>{scene.label} — İşler Sarpa Sardı</span>
        </div>
        <p className="text-sm text-stone-200 italic border border-red-900/30 bg-red-950/10 rounded-sm px-3 py-2.5">
          {scene.scene}
        </p>
        <div className="space-y-2">
          {scene.choices.map(c => (
            <button key={c.id} onClick={() => onChoose(c.id)} disabled={busy}
              className={`w-full text-left px-3 py-2.5 border rounded-sm transition-all disabled:opacity-40 ${CHOICE_STYLES[c.id] || "border-stone-700 text-stone-300"}`}>
              <div className="flex items-center justify-between">
                <span className="font-heading text-xs tracking-wider">{c.label}</span>
                {c.test && (
                  <span className="text-[9px] text-stone-500 border border-stone-800 rounded-sm px-1.5 py-0.5">
                    🎲 {c.test}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-stone-500 mt-0.5">{c.hint}</p>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-stone-600 text-center">Geri dönüş yok — bir yol seç.</p>
      </div>
    </div>
  );
}

// ─── Sonuç Ekranı ─────────────────────────────────────────────────────────────
function CrimeResult({ result, onDone }) {
  const cfg = {
    temiz:      { icon: <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />, cls: "border-emerald-800/60 bg-emerald-950/10", color: "text-emerald-400" },
    goruldun:   { icon: <Eye className="w-8 h-8 text-amber-500 mx-auto" />,          cls: "border-amber-800/60 bg-amber-950/15",    color: "text-amber-400" },
    kacti:      { icon: <Footprints className="w-8 h-8 text-stone-400 mx-auto" />,   cls: "border-stone-700/60 bg-stone-900/40",    color: "text-stone-300" },
    yakalandin: { icon: <XCircle className="w-8 h-8 text-red-500 mx-auto" />,        cls: "border-red-900/60 bg-red-950/20",        color: "text-red-400" },
  }[result.outcome] || { icon: null, cls: "border-stone-800", color: "text-stone-300" };

  return (
    <div className="space-y-4 rise-in">
      <div className={`card-frame p-5 text-center border space-y-3 ${cfg.cls}`}>
        {cfg.icon}
        <div className={`font-heading text-2xl tracking-widest ${cfg.color}`}>
          {result.title}
        </div>
        <p className="text-stone-300 text-sm">{result.note}</p>
        {result.gain > 0 && (
          <div className="font-heading text-lg text-amber-300">+{result.gain} akçe</div>
        )}
        {result.fine > 0 && (
          <div className="text-red-400 text-sm">
            Ceza: <span className="font-heading">{result.fine} akçe</span> ödendi
          </div>
        )}
      </div>

      {/* Ganimet — sıcak mal işaretli */}
      {result.loot?.length > 0 && (
        <div className="card-frame p-3 space-y-2">
          <div className="label-tiny">Ganimet</div>
          <div className="flex flex-wrap gap-2">
            {result.loot.map((l, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs border border-orange-900/50 bg-orange-950/10 rounded-sm px-2 py-1">
                {GOOD_LABELS[l.good] || l.good} ×{l.qty}
                {l.hot && (
                  <span className="text-[9px] text-orange-400 flex items-center gap-0.5">
                    <Flame className="w-2.5 h-2.5" /> sıcak
                  </span>
                )}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-stone-500">
            Sıcak mal satarken dikkat: çalıntı olduğu anlaşılırsa adın lekelenir.
            Çete bağlantısı malı güvenle eritir.
          </p>
        </div>
      )}

      {result.witness && (
        <div className="card-frame p-3 text-xs text-amber-400/90 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span>{result.witness} seni gördü — bunu unutmayacak.</span>
        </div>
      )}

      {result.rep_notes?.length > 0 && (
        <div className="card-frame p-3 space-y-1">
          <div className="label-tiny mb-1">İtibar Etkileri</div>
          {result.rep_notes.map((msg, i) => (
            <p key={i} className="text-xs text-stone-400">{msg}</p>
          ))}
        </div>
      )}

      <button onClick={onDone}
        className="w-full btn-ghost-ash py-2.5 text-xs font-heading tracking-widest">
        Tamam
      </button>
    </div>
  );
}

// ─── Eşkıya Çetesi Paneli ────────────────────────────────────────────────────
function EskiyaPanel({ state, onResult, busy, setBusy, setState }) {
  const player = state?.player || {};
  const factions = state?.world?.factions || [];
  const playerFaction = factions.find(f => f.id === player.faction_id);
  const isEskiya = playerFaction?.type === "eskiya_cetesi";

  const eskiyaFactions = factions.filter(f => f.type === "eskiya_cetesi" && f.active);
  const [selectedFaction, setSelectedFaction] = useState(eskiyaFactions[0]?.id || null);
  const [actionType, setActionType] = useState("kervan_soygunu");

  const ESKIYA_ACTIONS = [
    {
      id: "kervan_soygunu",
      label: "Kervan Soygunu",
      desc: "Tüccar kervanlarına baskın yap. Yüksek kâr, yüksek risk.",
      reward: "100–500 altın",
      icon: Sword,
      color: "text-orange-400",
    },
    {
      id: "haraç",
      label: "Haraç Al",
      desc: "Kasaba ve köylerden koruma parası topla.",
      reward: "40–200 altın",
      icon: Users,
      color: "text-amber-400",
    },
    {
      id: "faction_baskını",
      label: "Faction Baskını",
      desc: "Rakip faction üslerine saldır, değerli şeyler çal.",
      reward: "50–300 altın + nüfuz kaybı",
      icon: Star,
      color: "text-red-400",
    },
  ];

  const handleAction = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/crime", { crime_type: "kaçakçılık" });
      if (data.state) setState(data.state);
      const o = data.outcome || {};
      onResult({
        outcome: o.success ? "temiz" : "yakalandin",
        title: o.success ? "OPERASYON BAŞARILI" : "YAKALANDIN",
        note: o.success
          ? "Çete payını aldı, sen de kendi payını cebe attın."
          : "Operasyon ters gitti; bekçiler ensendeydi.",
        gain: o.gain || 0,
        fine: o.fine || 0,
        rep_notes: o.rep_changes || [],
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Operasyon başarısız.");
    } finally {
      setBusy(false);
    }
  };

  if (!eskiyaFactions.length && !isEskiya) {
    return (
      <div className="card-frame p-4 space-y-2 border-stone-800/50">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-stone-500" />
          <span className="font-heading text-stone-400">Eşkıya Çetesi</span>
        </div>
        <p className="text-xs text-stone-500">
          Bu bölgede aktif bir eşkıya çetesi yok. Bir faction kur ya da dün kurulmuş bir çeteye katıl.
        </p>
      </div>
    );
  }

  return (
    <div className="card-frame p-4 space-y-4 border-orange-900/40 bg-orange-950/10">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-orange-500" />
        <span className="font-heading text-orange-400">Eşkıya Operasyonu</span>
        {isEskiya && (
          <span className="ml-auto label-tiny text-orange-400 border border-orange-900/40 px-2 py-0.5 rounded-sm">
            {playerFaction?.name}
          </span>
        )}
      </div>

      {eskiyaFactions.length > 1 && !isEskiya && (
        <div className="space-y-1">
          <div className="label-tiny">Birlikte Çalış</div>
          {eskiyaFactions.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFaction(f.id)}
              className={`w-full text-left px-3 py-2 text-xs rounded-sm border transition-all ${
                selectedFaction === f.id
                  ? "border-orange-800 bg-stone-900 text-orange-400"
                  : "border-stone-800 text-stone-400 hover:text-stone-200"
              }`}
            >
              {f.name} · {f.member_count || 0} üye
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <div className="label-tiny">Operasyon Türü</div>
        {ESKIYA_ACTIONS.map(a => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => setActionType(a.id)}
              className={`w-full text-left p-3 border rounded-sm transition-all space-y-1 ${
                actionType === a.id
                  ? "border-orange-800/60 bg-orange-950/20"
                  : "border-stone-800/60 hover:border-stone-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${a.color}`} />
                <span className={`font-heading text-sm ${a.color}`}>{a.label}</span>
              </div>
              <p className="text-xs text-stone-400">{a.desc}</p>
              <span className="text-[10px] text-amber-500/80 flex items-center gap-1">
                <Coins className="w-3 h-3" /> {a.reward}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleAction}
        disabled={busy || !selectedFaction}
        className="w-full btn-ember py-2.5 font-heading tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {busy
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Operasyon…</>
          : <><Sword className="w-4 h-4" /> OPERASYONA GEÇ</>
        }
      </button>
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function Crime() {
  const { state, setState, setLastActionPage } = useGame();
  const navigate = useNavigate();
  const location = useLocation();
  const [jobs, setJobs] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [scene, setScene] = useState(null);
  const [tab, setTab] = useState("bireysel"); // bireysel | eskiya

  const player = state?.player || {};
  const playerAge = player.age ?? 0;
  const tooYoung = playerAge < 13;

  const currentLoc = useMemo(() => {
    return state?.world?.locations?.find((l) => l.id === player.location_id);
  }, [state, player.location_id]);

  const crimeRecord = player.crime ?? 0;
  const crimeTier =
    crimeRecord >= 80 ? { label: "Aranan Suçlu", color: "text-red-400", border: "border-red-900/60" } :
    crimeRecord >= 40 ? { label: "Şüpheli", color: "text-orange-400", border: "border-orange-800/60" } :
    crimeRecord >= 15 ? { label: "Kayıt Var", color: "text-amber-400", border: "border-amber-800/60" } :
    { label: "Temiz", color: "text-emerald-400", border: "border-emerald-900/60" };

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await api.get("/game/crime/jobs");
      setJobs(data);
    } catch { /* sessizce geç */ }
  }, []);

  useEffect(() => {
    if (!tooYoung) fetchJobs();
  }, [fetchJobs, tooYoung, state?.turn]);

  const selectedJob = jobs?.jobs?.find(j => j.id === selected);

  /* ── R6.1: Keşif ── */
  const handleScout = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data } = await api.post("/game/crime/scout", { job_id: selected });
      if (data.state) setState(data.state);
      toast.success(`${data.note} (${data.bonus})`, { duration: 6000 });
      await fetchJobs();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Keşif yapılamadı.");
    } finally { setBusy(false); }
  };

  /* ── R6.2: İcra ── */
  const handleExecute = async () => {
    if (!selected) { toast.error("Bir iş seç."); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/game/crime/execute", { job_id: selected });
      if (data.needs_choice) {
        setScene(data);
      } else {
        if (data.state) setState(data.state);
        setResult(data.result);
        await fetchJobs();
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "İş gerçekleştirilemedi.");
    } finally { setBusy(false); }
  };

  const handleResolve = async (choiceId) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/crime/resolve", { choice: choiceId });
      if (data.state) setState(data.state);
      setScene(null);
      setResult(data.result);
      await fetchJobs();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Seçim çözülemedi.");
    } finally { setBusy(false); }
  };

  if (tooYoung) {
    return (
      <div className="rise-in space-y-4">
        <div>
          <div className="label-tiny">Gölge</div>
          <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
            <Eye className="w-6 h-6 text-stone-500" /> Yasadışı Aktivite
          </h1>
        </div>
        <div className="card-frame p-6 text-center space-y-3 border-stone-800/50">
          <Lock className="w-8 h-8 text-stone-700 mx-auto" />
          <p className="text-stone-400 font-heading">Henüz çok küçüksün.</p>
          <p className="text-stone-600 text-sm">13 yaşında bu yollar açılır.</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="rise-in space-y-4">
        <div>
          <div className="label-tiny">Gölge</div>
          <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
            <Eye className="w-6 h-6 text-stone-500" /> Yasadışı Aktivite
          </h1>
        </div>
        <CrimeResult
          result={result}
          onDone={() => {
            setResult(null);
            setSelected(null);
            // Eylem tamamlandı — hafta ilerledi, anasayfaya dön (geri dön butonlu)
            setLastActionPage?.({ path: location.pathname, label: "Gölge" });
            navigate("/oyun");
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 rise-in">
      {/* İcra sahnesi */}
      {scene && <SceneModal scene={scene} onChoose={handleResolve} busy={busy} />}

      <div>
        <div className="label-tiny">Gölge</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <Eye className="w-6 h-6 text-stone-500" /> Yasadışı Aktivite
        </h1>
        <p className="text-stone-400 text-sm mt-1">
          İş seç, istersen önce keşfet, sonra harekete geç. Her şeyin bir bedeli var.
        </p>
      </div>

      {/* Suç sicili */}
      <div className={`card-frame p-3 flex items-center justify-between border ${crimeTier.border}`}>
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${crimeTier.color}`} />
          <span className="label-tiny">Suç Sicili</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="stat-bar w-24">
            <div
              className="h-full stat-bar-fill-bad"
              style={{ width: `${Math.min(100, crimeRecord)}%` }}
            />
          </div>
          <span className={`text-xs font-heading ${crimeTier.color}`}>{crimeTier.label}</span>
          <span className="text-stone-600 text-xs">({crimeRecord})</span>
        </div>
      </div>

      {/* Konum güvenliği + sıcak mal uyarısı */}
      {currentLoc && (
        <div className="card-frame p-3 space-y-1.5">
          <SecurityBadge security={currentLoc.security} />
          {Object.keys(player.hot_goods || {}).length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-orange-400">
              <Flame className="w-3 h-3 shrink-0" />
              <span>
                Elinde sıcak mal var:{" "}
                {Object.entries(player.hot_goods)
                  .map(([g, q]) => `${GOOD_LABELS[g] || g} ×${q}`)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 border border-stone-800 rounded-sm overflow-hidden">
        {["bireysel", "eskiya"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-heading tracking-wider transition-all ${
              tab === t
                ? "bg-stone-900 text-orange-400 border-r border-stone-800"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            {t === "bireysel" ? "Bireysel İş" : "⚔ Çete Operasyonu"}
          </button>
        ))}
      </div>

      {tab === "eskiya" ? (
        <EskiyaPanel
          state={state}
          onResult={setResult}
          busy={busy}
          setBusy={setBusy}
          setState={setState}
        />
      ) : (
        <>
          {/* İş kartları */}
          <div className="space-y-2">
            <div className="label-tiny">İş Seç</div>
            {!jobs && (
              <div className="card-frame p-4 flex items-center justify-center text-stone-500">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
            {jobs?.jobs?.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                selected={selected === job.id}
                onSelect={setSelected}
                disabled={busy}
              />
            ))}
          </div>

          {/* Eylem butonları */}
          {selectedJob && (
            <div className="space-y-2">
              {!selectedJob.scouted && (
                <button
                  onClick={handleScout}
                  disabled={busy}
                  className="w-full btn-ghost-ash py-2.5 text-xs font-heading tracking-widest flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {busy
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : "🔭"} KEŞİF YAP (1 hafta) — +%20 şans & kaçış planı
                </button>
              )}
              <button
                onClick={handleExecute}
                disabled={busy || !!selectedJob.locked}
                className="w-full btn-ember py-3 font-heading tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {busy ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> İş başında…</>
                ) : (
                  <><Eye className="w-4 h-4" /> HAREKETE GEÇ (%{selectedJob.chance_pct})</>
                )}
              </button>
              {selectedJob.locked && (
                <p className="text-[10px] text-stone-500 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> {selectedJob.locked}
                </p>
              )}
            </div>
          )}

          {/* Uyarı */}
          <div className="border border-stone-800/40 rounded-sm p-3 text-xs text-stone-500 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-stone-600" />
            <span>
              İş ortasında işler sarpa sarabilir: saklan, sustur ya da kaç.
              Görülürsen tanık unutmaz; yakalanırsan ceza ödersin. Büyük işlerin
              ganimeti sıcaktır — satarken yakalanma riski taşır.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
