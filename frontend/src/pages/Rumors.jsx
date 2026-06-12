import { useEffect, useState, useMemo } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Scroll, Sword, Skull, Heart, Crown, Flame, Wheat,
  AlertTriangle, Music, Wind, MessageSquare, RefreshCw, Loader2,
  Eye, Megaphone, Coins,
} from "lucide-react";

// ─── S2: Nam profili & oyuncu söylentileri ───────────────────────────────────
const NAM_CFG = {
  "cömert": { color: "text-emerald-400", bar: "bg-emerald-600" },
  "zalim":  { color: "text-red-400",     bar: "bg-red-700" },
  "çapkın": { color: "text-pink-400",    bar: "bg-pink-600" },
  "dindar": { color: "text-sky-400",     bar: "bg-sky-600" },
  "mert":   { color: "text-amber-400",   bar: "bg-amber-600" },
};

function NamPanel({ currentTurn }) {
  const [nam, setNam] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/game/nam");
      setNam(data);
    } catch { /* nam yoksa panel gizli kalır */ }
  };
  useEffect(() => { load(); }, []);

  if (!nam) return null;
  const maxVal = Math.max(8, ...Object.values(nam.profil || {}));
  const hasProfile = Object.values(nam.profil || {}).some((v) => v > 0);
  const rumors = nam.soylentiler || [];
  if (!hasProfile && rumors.length === 0) return null;

  const act = async (rumorId, eylem) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/nam/eylem", { rumor_id: rumorId, eylem });
      setResult(data.response);
      setNam((n) => ({ ...n, profil: data.profil, dominant: data.dominant, soylentiler: data.soylentiler }));
      (data.consequences || []).forEach((c) =>
        c.includes("⚠") ? toast.error(c) : toast.success(c));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Olmadı.");
    } finally { setBusy(false); }
  };

  return (
    <div className="card-frame p-4 space-y-3 border border-amber-900/30">
      <div className="flex items-center justify-between">
        <div>
          <div className="label-tiny">Namın</div>
          <div className="text-sm text-stone-300 font-heading tracking-wider">
            Halkın gözünde kimsin?
            {nam.dominant && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 border rounded-sm ${NAM_CFG[nam.dominant]?.color || ""} border-current`}>
                {nam.dominant.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Nam çubukları */}
      {hasProfile && (
        <div className="space-y-1">
          {Object.entries(nam.profil).map(([trait, val]) => (
            <div key={trait} className="flex items-center gap-2">
              <span className={`text-[10px] w-12 font-heading tracking-wider ${NAM_CFG[trait]?.color || "text-stone-400"}`}>
                {trait}
              </span>
              <div className="flex-1 h-1 bg-stone-900 rounded-full overflow-hidden">
                <div className={`h-full ${NAM_CFG[trait]?.bar || "bg-stone-600"}`}
                     style={{ width: `${Math.min(100, (val / maxVal) * 100)}%` }} />
              </div>
              <span className="text-[10px] text-stone-600 w-5 text-right">{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Baskın nam etkileri */}
      {(nam.etkiler || []).length > 0 && (
        <div className="space-y-0.5">
          {nam.etkiler.map((e, i) => (
            <div key={i} className="text-[11px] text-stone-400 italic">• {e}</div>
          ))}
        </div>
      )}

      {/* Hakkındaki söylentiler */}
      {rumors.length > 0 && (
        <div className="border-t border-stone-800 pt-2 space-y-2">
          <div className="text-[9px] font-heading tracking-[0.2em] text-stone-500 uppercase">
            Hamamda senin için şöyle demişler…
          </div>
          {rumors.map((r) => (
            <div key={r.id} className={`p-2.5 border rounded-sm ${
              r.yon > 0 ? "border-emerald-900/40 bg-emerald-950/10" : "border-red-900/40 bg-red-950/10"
            }`}>
              <p className="text-xs text-stone-200 italic leading-relaxed">"{r.text}"</p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[9px] text-stone-600">
                  Kaynak: {r.kaynak_name} · {timeAgo(currentTurn, r.hafta)} · şiddet {Math.round(r.siddet)}
                </span>
                <div className="ml-auto flex gap-1">
                  <button disabled={busy} onClick={() => act(r.id, "yuzles")}
                    className="text-[9px] px-1.5 py-0.5 border border-stone-700 text-stone-300 hover:border-amber-700 rounded-sm flex items-center gap-1">
                    <Eye className="w-2.5 h-2.5" /> Yüzleş
                  </button>
                  {r.yon > 0 && (
                    <button disabled={busy} onClick={() => act(r.id, "yay")}
                      className="text-[9px] px-1.5 py-0.5 border border-emerald-900 text-emerald-300 hover:border-emerald-700 rounded-sm flex items-center gap-1">
                      <Megaphone className="w-2.5 h-2.5" /> Yay
                    </button>
                  )}
                  <button disabled={busy} onClick={() => act(r.id, "sustur")}
                    className="text-[9px] px-1.5 py-0.5 border border-amber-900 text-amber-300 hover:border-amber-700 rounded-sm flex items-center gap-1">
                    <Coins className="w-2.5 h-2.5" /> Sustur ({15 * Math.round(r.siddet)})
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="text-[11px] text-amber-200/90 bg-amber-950/20 border border-amber-900/40 rounded-sm px-3 py-2 italic">
          {result}
        </div>
      )}
    </div>
  );
}

// ─── Tip konfigürasyonu ───────────────────────────────────────────────────────
const RUMOR_CFG = {
  ölüm:       { icon: Skull,   color: "text-red-400",    border: "border-red-900/50",    bg: "bg-red-950/20",    label: "Ölüm" },
  doğum:      { icon: Heart,   color: "text-pink-400",   border: "border-pink-900/50",   bg: "bg-pink-950/20",   label: "Doğum" },
  evlilik:    { icon: Heart,   color: "text-pink-400",   border: "border-pink-900/50",   bg: "bg-pink-950/20",   label: "Evlilik" },
  savaş:      { icon: Sword,   color: "text-red-400",    border: "border-red-900/50",    bg: "bg-red-950/20",    label: "Savaş" },
  cinayet:    { icon: Sword,   color: "text-orange-400", border: "border-orange-900/50", bg: "bg-orange-950/20", label: "Cinayet" },
  tahta_çıkış:{ icon: Crown,   color: "text-amber-400",  border: "border-amber-900/50",  bg: "bg-amber-950/20",  label: "Taht" },
  hapis:      { icon: AlertTriangle, color: "text-orange-400", border: "border-orange-900/50", bg: "bg-orange-950/20", label: "Hapis" },
  haydut:     { icon: Flame,   color: "text-orange-400", border: "border-orange-900/50", bg: "bg-orange-950/20", label: "Haydut" },
  yangın:     { icon: Flame,   color: "text-red-400",    border: "border-red-900/50",    bg: "bg-red-950/20",    label: "Yangın" },
  kıtlık:     { icon: Wheat,   color: "text-stone-400",  border: "border-stone-700/50",  bg: "bg-stone-900/30",  label: "Kıtlık" },
  iyi_hasat:  { icon: Wheat,   color: "text-emerald-400",border: "border-emerald-900/50",bg: "bg-emerald-950/20",label: "Bereket" },
  kötü_hasat: { icon: Wheat,   color: "text-orange-400", border: "border-orange-900/50", bg: "bg-orange-950/20", label: "Kötü Hasat" },
  festival:   { icon: Music,   color: "text-violet-400", border: "border-violet-900/50", bg: "bg-violet-950/20", label: "Şölen" },
  evlat:      { icon: Heart,   color: "text-pink-400",   border: "border-pink-900/50",   bg: "bg-pink-950/20",   label: "Çocuk" },
  default:    { icon: MessageSquare, color: "text-stone-400", border: "border-stone-700/50", bg: "bg-stone-900/30", label: "Haber" },
};

function rcfg(type) {
  return RUMOR_CFG[type] || RUMOR_CFG.default;
}

// ─── Güvenilirlik ─────────────────────────────────────────────────────────────
function TruthBadge({ truth = 0.5 }) {
  if (truth >= 0.85) return <span className="text-[10px] px-1.5 py-0.5 border border-emerald-800/60 text-emerald-400 font-heading tracking-wider rounded-sm">Güvenilir</span>;
  if (truth >= 0.65) return <span className="text-[10px] px-1.5 py-0.5 border border-amber-800/60 text-amber-400 font-heading tracking-wider rounded-sm">Muhtemel</span>;
  return <span className="text-[10px] px-1.5 py-0.5 border border-stone-700/60 text-stone-500 font-heading tracking-wider rounded-sm">Belirsiz</span>;
}

// ─── Zaman etiketi ────────────────────────────────────────────────────────────
function timeAgo(turn, rumorDay) {
  const diff = Math.max(0, turn - rumorDay);
  if (diff === 0) return "Bu hafta";
  if (diff === 1) return "Geçen hafta";
  if (diff < 4)  return `${diff} hafta önce`;
  const months = Math.round(diff / 4);
  if (months < 12) return `${months} ay önce`;
  return `${Math.round(months / 12)} yıl önce`;
}

// ─── Rumor kartı ──────────────────────────────────────────────────────────────
function RumorCard({ rumor, currentTurn }) {
  const cfg = rcfg(rumor.type);
  const Icon = cfg.icon;
  return (
    <div className={`card-frame p-4 border ${cfg.border} ${cfg.bg} rise-in`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-200 leading-relaxed italic">"{rumor.text}"</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 border rounded-sm font-heading tracking-wider ${cfg.border} ${cfg.color}`}>
              {cfg.label}
            </span>
            <TruthBadge truth={rumor.truth} />
            <span className="text-xs text-stone-600 ml-auto">
              {timeAgo(currentTurn, rumor.day)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Filtre butonu ────────────────────────────────────────────────────────────
function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] px-2.5 py-1 border rounded-sm font-heading tracking-widest transition-all ${
        active
          ? "border-orange-700 text-orange-300 bg-orange-950/30"
          : "border-stone-700/50 text-stone-500 hover:border-stone-600 hover:text-stone-400"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Ana sayfa ────────────────────────────────────────────────────────────────
export default function Rumors() {
  const { state } = useGame();
  const [rumors, setRumors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("hepsi");
  const currentTurn = state?.turn || 0;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/game/rumors");
      setRumors(data.rumors || []);
    } catch {
      setRumors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Benzersiz tipler
  const types = useMemo(() => {
    const seen = new Set(rumors.map(r => r.type).filter(Boolean));
    return Array.from(seen).filter(t => RUMOR_CFG[t]);
  }, [rumors]);

  const filtered = useMemo(() => {
    if (filter === "hepsi") return rumors;
    if (filter === "güvenilir") return rumors.filter(r => (r.truth || 0) >= 0.85);
    return rumors.filter(r => r.type === filter);
  }, [rumors, filter]);

  const FILTERS = [
    { key: "hepsi", label: `Hepsi (${rumors.length})` },
    { key: "güvenilir", label: "Güvenilir" },
    ...types.map(t => ({ key: t, label: RUMOR_CFG[t]?.label || t })),
  ];

  return (
    <div className="space-y-5 rise-in">
      {/* Başlık */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="label-tiny">Halk Arasında</div>
          <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
            <Scroll className="w-6 h-6 text-amber-600" /> Dedikodular
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Kasabada fısıldananlar, haber olup gelenler.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn-ghost-ash px-3 py-1.5 text-xs flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Yenile
        </button>
      </div>

      {/* S2: Nam profili & hakkındaki söylentiler */}
      <NamPanel currentTurn={currentTurn} />

      {/* Filtreler */}
      {rumors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <FilterChip key={f.key} label={f.label} active={filter === f.key} onClick={() => setFilter(f.key)} />
          ))}
        </div>
      )}

      {/* İçerik */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-stone-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-frame p-10 text-center">
          <Wind className="w-8 h-8 text-stone-700 mx-auto mb-3" />
          <p className="text-stone-500 text-sm font-heading tracking-wider">Ortalıkta dolaşan bir şey yok.</p>
          <p className="text-stone-600 text-xs mt-1">İnsanlarla konuş, seyahat et — dedikodular gelir.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <RumorCard key={r.id || r.day + r.text} rumor={r} currentTurn={currentTurn} />
          ))}
        </div>
      )}
    </div>
  );
}
