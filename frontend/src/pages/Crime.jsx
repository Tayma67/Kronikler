import { useState, useMemo } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useActionRedirect } from "@/hooks/useActionRedirect";
import {
  Eye, Coins, AlertTriangle, ShieldAlert, Lock, CheckCircle,
  XCircle, Loader2, Skull, TrendingDown, ChevronRight, Users, Sword, Star,
} from "lucide-react";

// ─── Suç konfigürasyonu ───────────────────────────────────────────────────────
const CRIMES = [
  {
    id: "hırsızlık",
    label: "Hırsızlık",
    icon: Eye,
    color: "text-amber-400",
    border: "border-amber-900/60",
    bg: "bg-amber-950/15",
    reward: "30–150 altın",
    repLoss: 2,
    crimePts: 10,
    severity: "Düşük",
    severityColor: "text-emerald-400",
    desc: "Pazardan ya da evlerden değerli şeyler çal. Az kayıp, az risk.",
    flavor: "Karanlıkta sessizce hareket etmek gerekiyor.",
  },
  {
    id: "kaçakçılık",
    label: "Kaçakçılık",
    icon: ChevronRight,
    color: "text-orange-400",
    border: "border-orange-900/60",
    bg: "bg-orange-950/15",
    reward: "80–300 altın",
    repLoss: 1,
    crimePts: 15,
    severity: "Orta",
    severityColor: "text-amber-400",
    desc: "Yasak malları sınır ötesine taşı. İtibar kaybı az ama risk yüksek.",
    flavor: "Garnizon kontrol noktalarından geçmek ustalık ister.",
  },
  {
    id: "dolandırıcılık",
    label: "Dolandırıcılık",
    icon: Coins,
    color: "text-violet-400",
    border: "border-violet-900/60",
    bg: "bg-violet-950/15",
    reward: "50–200 altın",
    repLoss: 3,
    crimePts: 12,
    severity: "Orta",
    severityColor: "text-amber-400",
    desc: "Tüccarları ve köylüleri sahte sözlerle aldatıp para kopar.",
    flavor: "Dil kılıçtan keskindir — doğru söylenirse.",
  },
  {
    id: "cinayet",
    label: "Cinayet",
    icon: Skull,
    color: "text-red-400",
    border: "border-red-900/60",
    bg: "bg-red-950/20",
    reward: "0 altın (miras beklentisi)",
    repLoss: 25,
    crimePts: 60,
    severity: "Ağır",
    severityColor: "text-red-400",
    desc: "Birini ortadan kaldır. Büyük suç kaydı, ağır itibar kaybı.",
    flavor: "Kan bedelini toprak bile ödemez.",
    dangerous: true,
  },
];

// ─── Güvenlik Risk Göstergesi ─────────────────────────────────────────────────
function SecurityBadge({ security }) {
  const chance = Math.max(0.15, 0.85 - security / 100);
  const pct = Math.round(chance * 100);
  const color = pct >= 65 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-red-400";
  const barColor = pct >= 65 ? "stat-bar-fill-good" : pct >= 40 ? "stat-bar-fill" : "stat-bar-fill-bad";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-stone-500 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" /> Başarı şansı (güvenlik {security})
        </span>
        <span className={`font-heading ${color}`}>%{pct}</span>
      </div>
      <div className="stat-bar">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Suç Kartı ────────────────────────────────────────────────────────────────
function CrimeCard({ crime, selected, onSelect, disabled }) {
  const Icon = crime.icon;
  return (
    <button
      onClick={() => onSelect(crime.id)}
      disabled={disabled}
      className={`w-full text-left p-4 border rounded-sm transition-all space-y-2 ${
        selected
          ? `${crime.border} ${crime.bg} ring-1 ring-inset ${crime.border}`
          : disabled
          ? "border-stone-800/40 opacity-40 cursor-not-allowed"
          : `${crime.border} ${crime.bg} hover:opacity-90`
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${crime.color}`} />
          <span className={`font-heading text-sm ${crime.color}`}>{crime.label}</span>
        </div>
        <span className={`text-[10px] font-heading tracking-wider ${crime.severityColor}`}>
          {crime.severity}
        </span>
      </div>

      <p className="text-xs text-stone-400">{crime.desc}</p>

      <div className="flex flex-wrap gap-3 text-[10px] text-stone-500">
        <span className="flex items-center gap-1 text-amber-500/80">
          <Coins className="w-3 h-3" /> {crime.reward}
        </span>
        <span className="flex items-center gap-1 text-red-400/70">
          <TrendingDown className="w-3 h-3" /> -{crime.repLoss} itibar
        </span>
        <span className="flex items-center gap-1">
          suç +{crime.crimePts}
        </span>
      </div>
    </button>
  );
}

// ─── Sonuç Ekranı ─────────────────────────────────────────────────────────────
function CrimeResult({ result, crimeName, onDone }) {
  const { success, gain, fine, caught, rep_changes } = result;
  return (
    <div className="space-y-4 rise-in">
      {/* Sonuç başlık */}
      <div className={`card-frame p-5 text-center border space-y-3 ${
        success
          ? "border-amber-800/60 bg-amber-950/15"
          : "border-red-900/60 bg-red-950/20"
      }`}>
        {success ? (
          <CheckCircle className="w-8 h-8 text-amber-500 mx-auto" />
        ) : (
          <XCircle className="w-8 h-8 text-red-500 mx-auto" />
        )}
        <div>
          <div className={`font-heading text-2xl tracking-widest ${success ? "text-amber-400" : "text-red-400"}`}>
            {success ? "BAŞARILI" : "YAKALANDIN"}
          </div>
          <p className="text-stone-400 text-sm mt-1 capitalize">{crimeName}</p>
        </div>
        {success && gain > 0 && (
          <div className="font-heading text-lg text-amber-300">
            +{gain} altın
          </div>
        )}
        {caught && (
          <div className="text-red-400 text-sm">
            Ceza: <span className="font-heading">{fine} altın</span> ödendi
          </div>
        )}
      </div>

      {/* İtibar değişimleri */}
      {rep_changes?.length > 0 && (
        <div className="card-frame p-3 space-y-1">
          <div className="label-tiny mb-2">İtibar Etkileri</div>
          {rep_changes.map((msg, i) => (
            <p key={i} className="text-xs text-stone-400">{msg}</p>
          ))}
        </div>
      )}

      <button
        onClick={onDone}
        className="w-full btn-ghost-ash py-2.5 text-xs font-heading tracking-widest"
      >
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

  // Find eskiya factions
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
      // Use the crime endpoint with eskiya crime type
      const { data } = await api.post("/game/crime", { crime_type: "kaçakçılık" });
      if (data.state) setState(data.state);
      onResult({
        ...data.outcome,
        eskiyaAction: actionType,
        factionName: eskiyaFactions.find(f => f.id === selectedFaction)?.name || "Çete",
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

      {/* Çete seç */}
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

      {/* Eylem türü */}
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
  const { state, setState } = useGame();
  const withRedirect = useActionRedirect("Gölge");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
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

  const handleCommit = async () => {
    if (!selected) { toast.error("Bir suç türü seç."); return; }
    setBusy(true);
    try {
      await withRedirect(async () => {
        const { data } = await api.post("/game/crime", { crime_type: selected });
        if (data.state) setState(data.state);
        setResult(data.outcome);
        return data;
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Suç gerçekleştirilemedi.");
    } finally {
      setBusy(false);
    }
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
    const crimeName = CRIMES.find((c) => c.id === selected)?.label || selected;
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
          crimeName={crimeName}
          onDone={() => { setResult(null); setSelected(null); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 rise-in">
      <div>
        <div className="label-tiny">Gölge</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <Eye className="w-6 h-6 text-stone-500" /> Yasadışı Aktivite
        </h1>
        <p className="text-stone-400 text-sm mt-1">
          Yasaların dışında para kazanmak — ama her şeyin bir bedeli var.
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

      {/* Konum güvenliği */}
      {currentLoc && (
        <div className="card-frame p-3">
          <SecurityBadge security={currentLoc.security} />
          <p className="text-[10px] text-stone-600 mt-1.5 italic">
            "{currentLoc.name}" güvenlik seviyesi: {currentLoc.security}/100.
            {currentLoc.security > 70 && " Burası çok güvenli, risk yüksek."}
            {currentLoc.security <= 30 && " Burası oldukça tenha, şans yüksek."}
          </p>
        </div>
      )}

      {/* Uyarı */}
      <div className="border border-stone-800/40 rounded-sm p-3 text-xs text-stone-500 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-stone-600" />
        <span>Yakalanırsan para cezası öder ve sicil kaydı artar. Yüksek suç skoru saldırı riskini artırır ve bazı faction'lara girişi engeller.</span>
      </div>

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
            {t === "bireysel" ? "Bireysel Suç" : "⚔ Çete Operasyonu"}
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
      {/* Suç kartları */}
      <div className="space-y-2">
        <div className="label-tiny">Aktivite Seç</div>
        {CRIMES.map((crime) => (
          <CrimeCard
            key={crime.id}
            crime={crime}
            selected={selected === crime.id}
            onSelect={setSelected}
            disabled={busy}
          />
        ))}
      </div>

      {/* Seçilen suç flavoru */}
      {selected && (() => {
        const crime = CRIMES.find((c) => c.id === selected);
        return crime ? (
          <div className="border border-stone-800/40 rounded-sm px-3 py-2 text-xs text-stone-400 italic">
            "{crime.flavor}"
          </div>
        ) : null;
      })()}

      {/* Onayla */}
      <button
        onClick={handleCommit}
        disabled={busy || !selected}
        className="w-full btn-ember py-3 font-heading tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {busy ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Gerçekleştiriliyor…</>
        ) : (
          <><Eye className="w-4 h-4" /> HAREKETE GEÇ</>
        )}
      </button>
        </>
      )}
    </div>
  );
}
