import { useEffect, useState, useCallback } from "react";
import { profLabel } from "@/lib/labels";
import { useGame } from "@/lib/GameContext";
import { api, extractErrorMessage } from "@/lib/api";
import { useActionRedirect } from "@/hooks/useActionRedirect";
import { toast } from "sonner";
import {
  Coins, Loader2, Home, Hammer, Users, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Wheat, ShoppingBag, X, Plus, ArrowUp,
} from "lucide-react";

const GOOD_LABELS = {
  "buğday": "Buğday", "un": "Un", "ekmek": "Ekmek", "et": "Et",
  "yün": "Yün", "kumaş": "Kumaş", "kıyafet": "Kıyafet",
  "demir_cevheri": "Demir Cevheri", "demir": "Demir", "silah": "Silah", "alet": "Alet",
  "üzüm": "Üzüm", "şıra": "Şıra", "şarap": "Şarap",
  "odun": "Odun", "kereste": "Kereste", "mobilya": "Mobilya",
  "deri": "Deri", "işlenmiş_deri": "İşlenmiş Deri", "zırh": "Zırh", "çizme": "Çizme",
  "ipek": "İpek", "baharat": "Baharat",
};
const gl = (g) => GOOD_LABELS[g] || g;

/* ── Kondisyon çubuğu ─────────────────────────────────────────────── */
function ConditionBar({ value }) {
  const color = value > 60 ? "bg-emerald-600" : value > 30 ? "bg-amber-600" : "bg-red-600";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-stone-800 rounded-sm overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] text-stone-500">%{value}</span>
    </div>
  );
}

/* ── İşçi yönetimi ────────────────────────────────────────────────── */
function WorkerSection({ prop, npcs, onHire, onFire, busy }) {
  const [open, setOpen] = useState(false);
  const candidates = npcs.filter(
    (n) => n.alive && n.location_id === prop.location_id &&
      !prop.workers.some((w) => w.id === n.id) &&
      !["kral", "veliaht", "lord", "general", "çocuk"].includes(n.profession)
  ).slice(0, 12);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-stone-500 font-heading tracking-wider uppercase">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />
          İşçiler {prop.workers.length}/{prop.max_workers}</span>
        {prop.workers.length < prop.max_workers && (
          <button onClick={() => setOpen(!open)}
            className="text-orange-400 flex items-center gap-0.5">
            <Plus className="w-3 h-3" /> Tut
          </button>
        )}
      </div>
      {prop.workers.map((w) => (
        <div key={w.id} className="flex items-center justify-between text-xs border border-stone-800/40 rounded-sm px-2 py-1">
          <span className="text-stone-300">{w.name}
            <span className="text-stone-600 ml-1">({profLabel(w.profession)} · ×{w.productivity})</span></span>
          <button disabled={busy} onClick={() => onFire(prop.id, w.id)}
            className="text-red-400/70 hover:text-red-400"><X className="w-3 h-3" /></button>
        </div>
      ))}
      {open && (
        <div className="border border-stone-800 rounded-sm p-2 space-y-1 max-h-40 overflow-y-auto bg-stone-950/40">
          {candidates.length === 0 && (
            <p className="text-[10px] text-stone-600">Bu yerleşimde uygun işçi yok.</p>
          )}
          {candidates.map((n) => (
            <button key={n.id} disabled={busy}
              onClick={() => { onHire(prop.id, n.id); setOpen(false); }}
              className="w-full flex items-center justify-between text-xs px-2 py-1 rounded-sm hover:bg-stone-900 text-left">
              <span className="text-stone-300">{n.name}</span>
              <span className="text-stone-600 text-[10px]">{profLabel(n.profession)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Tip-özel yönetim kontrolleri ─────────────────────────────────── */
function ConfigSection({ prop, catalog, onConfigure, busy }) {
  if (prop.type === "tarla") {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-stone-500">Ekin:</span>
        {(catalog?.crops || ["buğday", "üzüm"]).map((c) => (
          <button key={c} disabled={busy}
            onClick={() => onConfigure(prop.id, { crop: c })}
            className={`px-2 py-0.5 rounded-sm border ${
              prop.config.crop === c
                ? "border-orange-800 text-orange-400 bg-stone-900"
                : "border-stone-800 text-stone-500"}`}>
            {gl(c)}
          </button>
        ))}
      </div>
    );
  }
  if (prop.type === "dükkân") {
    return (
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-stone-500">Stok:</span>
          <select
            value={prop.config.stock_good}
            disabled={busy}
            onChange={(e) => onConfigure(prop.id, { stock_good: e.target.value })}
            className="bg-stone-950 border border-stone-800 rounded-sm px-1.5 py-0.5 text-stone-300">
            {Object.keys(GOOD_LABELS).map((g) => (
              <option key={g} value={g}>{gl(g)}</option>
            ))}
          </select>
          <span className="text-stone-500">Marj:</span>
          {[0.15, 0.25, 0.4].map((m) => (
            <button key={m} disabled={busy}
              onClick={() => onConfigure(prop.id, { margin: m })}
              className={`px-2 py-0.5 rounded-sm border ${
                Math.abs(prop.config.margin - m) < 0.01
                  ? "border-orange-800 text-orange-400 bg-stone-900"
                  : "border-stone-800 text-stone-500"}`}>
              %{Math.round(m * 100)}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-stone-600">Yüksek marj = az satış, düşük marj = çok satış.</p>
      </div>
    );
  }
  if (prop.type === "işlik") {
    const options = catalog?.recipe_options || [];
    const current = `${prop.config.recipe_prof}:${prop.config.recipe_id}`;
    return (
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="text-stone-500">Ürün hattı:</span>
        <select
          value={current}
          disabled={busy}
          onChange={(e) => {
            const [rp, rid] = e.target.value.split(":");
            onConfigure(prop.id, { recipe_prof: rp, recipe_id: rid });
          }}
          className="bg-stone-950 border border-stone-800 rounded-sm px-1.5 py-0.5 text-stone-300 max-w-full">
          {options.map((o) => {
            const inp = Object.entries(o.input).map(([g, q]) => `${q} ${gl(g)}`).join(" + ");
            const out = Object.entries(o.output).map(([g, q]) => `${q} ${gl(g)}`).join("");
            return (
              <option key={`${o.recipe_prof}:${o.recipe_id}`} value={`${o.recipe_prof}:${o.recipe_id}`}>
                {inp} → {out}
              </option>
            );
          })}
        </select>
      </div>
    );
  }
  if (prop.type === "han") {
    return (
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="text-stone-500">Oda:</span>
        {[3, 5, 8, 12].map((p) => (
          <button key={p} disabled={busy}
            onClick={() => onConfigure(prop.id, { room_price: p })}
            className={`px-2 py-0.5 rounded-sm border ${
              prop.config.room_price === p
                ? "border-orange-800 text-orange-400 bg-stone-900"
                : "border-stone-800 text-stone-500"}`}>
            {p}a
          </button>
        ))}
        <span className="text-stone-500 ml-1">Muhafız:</span>
        {[0, 1, 2].map((g) => (
          <button key={g} disabled={busy}
            onClick={() => onConfigure(prop.id, { guards: g })}
            className={`px-2 py-0.5 rounded-sm border ${
              prop.config.guards === g
                ? "border-orange-800 text-orange-400 bg-stone-900"
                : "border-stone-800 text-stone-500"}`}>
            {g}
          </button>
        ))}
      </div>
    );
  }
  if (prop.type === "ev") {
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="text-stone-400">{prop.tier_label}</span>
        {prop.next_tier && (
          <button disabled={busy}
            onClick={() => onConfigure(prop.id, null, true)}
            className="flex items-center gap-1 px-2 py-1 rounded-sm border border-amber-900 text-amber-400 hover:bg-stone-900">
            <ArrowUp className="w-3 h-3" />
            {prop.next_tier.label} ({prop.next_tier.cost}a)
          </button>
        )}
      </div>
    );
  }
  return null;
}

/* ── Mülk kartı ───────────────────────────────────────────────────── */
function PropertyCard({ prop, catalog, npcs, busy, onConfigure, onHire, onFire, onHarvest, onSell }) {
  const [showLedger, setShowLedger] = useState(false);
  const profit = prop.total_profit || 0;
  return (
    <div className="border border-stone-800 rounded-sm p-3 space-y-2.5 bg-stone-950/30"
      data-testid={`property-card-${prop.type}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{prop.icon}</span>
          <div className="min-w-0">
            <h3 className="text-sm text-stone-200 font-heading truncate">{prop.name}</h3>
            <p className="text-[10px] text-stone-500">{prop.location_name} · bakım {prop.maintenance}a/hafta</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-xs shrink-0 ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {profit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {profit >= 0 ? "+" : ""}{Math.round(profit)}a
        </div>
      </div>

      <ConditionBar value={prop.condition} />
      <ConfigSection prop={prop} catalog={catalog} onConfigure={onConfigure} busy={busy} />

      {prop.type === "tarla" && prop.pending_harvest > 0 && (
        <button disabled={busy} onClick={() => onHarvest(prop.id)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-sm bg-amber-900/40 border border-amber-800 text-amber-300 text-xs font-heading">
          <Wheat className="w-3.5 h-3.5" />
          Hasadı Topla ({prop.pending_harvest} {gl(prop.config.crop)})
        </button>
      )}

      {/* GDD v8 D3: defter eksideyken oyuncu 'zarar' sanmasın — toprakta
          büyüyen değer görünür olsun */}
      {prop.type === "tarla" && prop.bekleyen_hasat_degeri > 0 && prop.pending_harvest <= 0 && (
        <div className="text-[10px] text-emerald-400/80 italic flex items-center gap-1">
          🌱 Toprakta büyüyen: ~{prop.bekleyen_hasat_degeri} altın değerinde ekin
        </div>
      )}

      {prop.type !== "ev" && (
        <WorkerSection prop={prop} npcs={npcs} onHire={onHire} onFire={onFire} busy={busy} />
      )}

      <div className="flex items-center justify-between pt-1 border-t border-stone-800/50">
        <button onClick={() => setShowLedger(!showLedger)}
          className="text-[10px] text-stone-500 flex items-center gap-1">
          Defter {showLedger ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <button disabled={busy} onClick={() => onSell(prop)}
          className="text-[10px] text-red-400/70 hover:text-red-400">
          Sat ({prop.sale_value}a)
        </button>
      </div>
      {showLedger && (
        <div className="space-y-0.5 max-h-32 overflow-y-auto">
          {prop.ledger.length === 0 && <p className="text-[10px] text-stone-600">Henüz kayıt yok.</p>}
          {prop.ledger.map((l, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] text-stone-500">
              <span>T{l.day} · {l.kind}{l.note ? ` · ${l.note}` : ""}</span>
              <span className={l.amount >= 0 ? "text-emerald-500/80" : "text-red-500/80"}>
                {l.amount >= 0 ? "+" : ""}{l.amount}a
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Satın alma kataloğu ──────────────────────────────────────────── */
function Catalog({ catalog, money, busy, onBuy }) {
  if (!catalog) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-heading tracking-widest text-stone-500 uppercase flex items-center gap-1.5">
        <ShoppingBag className="w-3.5 h-3.5" />
        Satın Al — {catalog.location}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {catalog.types.map((t) => {
          const affordable = money >= t.cost;
          return (
            <div key={t.type} className="border border-stone-800 rounded-sm p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-200">{t.icon} {t.label}</span>
                <span className={`text-xs font-heading ${affordable ? "text-amber-400" : "text-stone-600"}`}>
                  {t.cost}a
                </span>
              </div>
              <p className="text-[10px] text-stone-500 leading-relaxed">{t.desc}</p>
              {!t.eligible ? (
                <p className="text-[10px] text-red-400/70">En az {t.min_age} yaş gerekli.</p>
              ) : (
                <button disabled={busy || !affordable}
                  onClick={() => onBuy(t.type)}
                  className={`w-full py-1.5 rounded-sm text-xs font-heading border ${
                    affordable
                      ? "border-orange-800 text-orange-400 hover:bg-stone-900"
                      : "border-stone-800 text-stone-600 cursor-not-allowed"}`}>
                  Satın Al
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Ana sayfa ────────────────────────────────────────────────────── */
export default function Properties() {
  const { state, setState } = useGame();
  const withRedirect = useActionRedirect("Mülkler");
  const [catalog, setCatalog] = useState(null);
  const [properties, setProperties] = useState(null);
  const [money, setMoney] = useState(0);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [cat, mine] = await Promise.all([
        api.get("/property/catalog"),
        api.get("/property/mine"),
      ]);
      setCatalog(cat.data);
      setProperties(mine.data.properties);
      setMoney(mine.data.money);
    } catch (e) {
      toast.error(extractErrorMessage(e));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const act = async (fn, successMsg) => {
    setBusy(true);
    try {
      const data = await fn();
      if (data?.properties) setProperties(data.properties);
      if (data?.money != null) setMoney(data.money);
      if (successMsg) toast.success(successMsg);
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onBuy = (type) =>
    withRedirect(async () => {
      const { data } = await api.post("/property/buy", { type });
      toast.success("Mülk satın alındı!");
      return data;
    }).catch((e) => toast.error(extractErrorMessage(e)));

  const onSell = (prop) => {
    if (!window.confirm(`${prop.name} ${prop.sale_value} altına satılsın mı?`)) return;
    withRedirect(async () => {
      const { data } = await api.post("/property/sell", { property_id: prop.id });
      toast.success("Mülk satıldı.");
      return data;
    }).catch((e) => toast.error(extractErrorMessage(e)));
  };

  const onConfigure = (propertyId, updates, upgrade = false) =>
    act(async () => (await api.post("/property/configure",
      { property_id: propertyId, ...(updates || {}), upgrade })).data);

  const onHire = (propertyId, npcId) =>
    act(async () => (await api.post("/property/hire",
      { property_id: propertyId, npc_id: npcId })).data, "İşçi tutuldu.");

  const onFire = (propertyId, npcId) =>
    act(async () => (await api.post("/property/fire",
      { property_id: propertyId, npc_id: npcId })).data, "İşçi çıkarıldı.");

  const onHarvest = (propertyId) =>
    withRedirect(async () => {
      const { data } = await api.post("/property/harvest", { property_id: propertyId });
      toast.success("Hasat toplandı!");
      return data;
    }).catch((e) => toast.error(extractErrorMessage(e)));

  const npcs = state?.world?.npcs || [];

  if (properties === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-stone-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3 py-4 space-y-5" data-testid="properties-page">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-heading text-stone-200 flex items-center gap-2">
          <Home className="w-4 h-4 text-orange-500" /> Mülklerim
        </h1>
        <span className="flex items-center gap-1 text-sm text-amber-400 font-heading">
          <Coins className="w-3.5 h-3.5" /> {Math.round(money)}a
        </span>
      </div>

      {properties.length === 0 ? (
        <div className="border border-dashed border-stone-800 rounded-sm p-6 text-center space-y-1">
          <Hammer className="w-6 h-6 text-stone-700 mx-auto" />
          <p className="text-sm text-stone-400">Henüz mülkün yok.</p>
          <p className="text-[11px] text-stone-600">
            Tarladan başla: 800 akçe civarı. Hasat, dükkân ve atölyelerle servetini büyüt.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} prop={p} catalog={catalog} npcs={npcs} busy={busy}
              onConfigure={onConfigure} onHire={onHire} onFire={onFire}
              onHarvest={onHarvest} onSell={onSell} />
          ))}
        </div>
      )}

      <Catalog catalog={catalog} money={money} busy={busy} onBuy={onBuy} />
    </div>
  );
}
