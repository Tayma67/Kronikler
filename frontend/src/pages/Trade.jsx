import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Coins, ArrowUpDown, TrendingUp, TrendingDown, Loader2,
  Package, ShoppingCart, ArrowRight, ChevronDown, ChevronUp,
  Truck, MapPin, AlertTriangle, CheckCircle2, XCircle,
  History, Plus, Minus, Navigation, Trophy, Swords, X,
  Zap,
} from "lucide-react";

/* ─── Sabitler ─────────────────────────────────────────────────────── */
const GOOD_LABELS = {
  "buğday": "Buğday", "un": "Un", "ekmek": "Ekmek", "et": "Et",
  "yün": "Yün", "kumaş": "Kumaş", "kıyafet": "Kıyafet",
  "demir_cevheri": "Demir Cevheri", "demir": "Demir", "silah": "Silah", "alet": "Alet",
  "üzüm": "Üzüm", "şıra": "Şıra", "şarap": "Şarap",
  "odun": "Odun", "kereste": "Kereste", "mobilya": "Mobilya",
  "deri": "Deri", "işlenmiş_deri": "İşlenmiş Deri", "zırh": "Zırh", "çizme": "Çizme",
  "ipek": "İpek", "baharat": "Baharat",
};
const GOOD_ICONS = {
  "buğday": "🌾", "un": "🫓", "ekmek": "🍞", "et": "🥩",
  "yün": "🐑", "kumaş": "🧵", "kıyafet": "👘",
  "demir_cevheri": "🪨", "demir": "⚙️", "silah": "⚔️", "alet": "🔨",
  "üzüm": "🍇", "şıra": "🍶", "şarap": "🍷",
  "odun": "🪵", "kereste": "🪚", "mobilya": "🪑",
  "deri": "🦌", "işlenmiş_deri": "🧳", "zırh": "🛡️", "çizme": "🥾",
  "ipek": "🪡", "baharat": "🌶️",
};

/* ─── R3.2: Mal Kalitesi ───────────────────────────────────────────── */
const QUALITY_GOODS = new Set([
  "kıyafet", "kumaş", "silah", "alet", "zırh", "çizme",
  "işlenmiş_deri", "mobilya", "şarap",
]);
const QUALITY_BADGES = {
  "kusurlu":  { icon: "⚠️", label: "Kusurlu",  cls: "text-red-400 border-red-900/40 bg-red-950/10" },
  "iyi":      { icon: "✨", label: "İyi",      cls: "text-amber-400 border-amber-900/40 bg-amber-950/10" },
  "usta_işi": { icon: "🏆", label: "Usta İşi", cls: "text-purple-300 border-purple-900/40 bg-purple-950/10" },
};

function QualityBadge({ kalite }) {
  const b = QUALITY_BADGES[kalite];
  if (!b) return null;
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-sm border ${b.cls}`}>
      {b.icon} {b.label}
    </span>
  );
}

/* ─── S4: Fiyat Trendi Yardımcısı ──────────────────────────────────── */
/**
 * Lokasyonun price_history'sine bakarak belirli bir malın
 * fiyat trendini döndürür: "rising" | "falling" | "stable" | null
 */
function priceTrend(loc, good) {
  const history = loc?.price_history;
  if (!history || history.length < 2) return null;
  const last = history[history.length - 1]?.[good];
  const prev = history[history.length - 2]?.[good];
  if (last == null || prev == null || prev === 0) return null;
  if (last > prev * 1.05) return "rising";
  if (last < prev * 0.95) return "falling";
  return "stable";
}

function TrendIcon({ trend }) {
  if (trend === "rising")  return <TrendingUp  className="w-3 h-3 text-red-400"     title="Fiyat yükseliyor" />;
  if (trend === "falling") return <TrendingDown className="w-3 h-3 text-emerald-400" title="Fiyat düşüyor"  />;
  if (trend === "stable")  return <span className="text-[10px] text-stone-600">→</span>;
  return null;
}

/* ─── S5: Backend Arbitraj Paneli ──────────────────────────────────── */
function ArbitrageOpportunities() {
  const [opps, setOpps] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/game/market/arbitrage");
      setOpps(data.opportunities || []);
    } catch { setOpps([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open && opps === null) fetch(); }, [open, opps, fetch]);

  return (
    <div className="card-frame overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-3 hover:bg-stone-900/40 transition-colors">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="label-tiny">Arbitraj Fırsatları</span>
          {opps !== null && opps.length > 0 && (
            <span className="text-[10px] bg-amber-900/40 text-amber-400 border border-amber-800/50 px-1.5 rounded-sm font-heading">
              {opps.length}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
      </button>
      {open && (
        <div className="border-t border-stone-800/50 px-3 pb-3 pt-2 space-y-2">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-stone-500" />
            </div>
          ) : !opps?.length ? (
            <p className="text-xs text-stone-500 italic py-2">Şu an büyük fiyat farkı yok.</p>
          ) : (
            opps.map((op, i) => (
              <div key={i}
                className="flex items-center gap-2 text-xs border border-stone-800/40 rounded-sm px-3 py-2 bg-stone-950/20">
                <span className="text-base shrink-0">{GOOD_ICONS[op.good] || "📦"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-stone-200 font-heading">{GOOD_LABELS[op.good] || op.good}</div>
                  <div className="text-[10px] text-stone-500 flex items-center gap-1 flex-wrap">
                    <span className="text-emerald-400">{op.cheap_city}</span>
                    <span>{op.cheap_price}A</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                    <span className="text-red-400">{op.expensive_city}</span>
                    <span>{op.expensive_price}A</span>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-0.5">
                  <span className="text-emerald-400 font-heading text-sm">+%{op.spread_pct}</span>
                  <span className="text-[10px] text-stone-600">kâr marjı</span>
                </div>
              </div>
            ))
          )}
          <button
            onClick={fetch}
            disabled={loading}
            className="text-[10px] text-stone-500 hover:text-stone-300 transition-colors flex items-center gap-1 disabled:opacity-40">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Yenile
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Yardımcı: Fiyat Çubuğu ───────────────────────────────────────── */
function PriceBar({ price, base, max }) {
  const pct = Math.min(100, Math.round((price / max) * 100));
  const ratio = price / base;
  const color =
    ratio > 1.15 ? "stat-bar-fill-bad" : ratio < 0.85 ? "stat-bar-fill-good" : "stat-bar-fill";
  return (
    <div className="stat-bar w-16">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ─── Arbitraj Tablosu ──────────────────────────────────────────────── */
function ArbitrageTable({ locations, goods }) {
  const [sortGood, setSortGood] = useState(goods[0] || "buğday");
  const rows = useMemo(() => {
    return locations
      .filter(l => l.market && l.market[sortGood])
      .map(l => ({
        id: l.id, name: l.name, kind: l.kind,
        price: l.market[sortGood].price,
        base: l.market[sortGood].base,
        supply: l.market[sortGood].supply,
      }))
      .sort((a, b) => a.price - b.price);
  }, [locations, sortGood]);

  if (!rows.length) return null;
  const cheapest = rows[0]?.price;
  const dearest = rows[rows.length - 1]?.price;
  const spread = Math.round(((dearest - cheapest) / cheapest) * 100);

  return (
    <div className="card-frame p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="label-tiny">Arbitraj Analizi</div>
        <div className="flex gap-1 flex-wrap">
          {goods.map(g => (
            <button key={g} onClick={() => setSortGood(g)}
              className={`text-[10px] px-2 py-0.5 rounded-sm font-heading tracking-wider border transition-all ${
                sortGood === g
                  ? "border-orange-800 bg-stone-900 text-orange-400"
                  : "border-stone-800 text-stone-500 hover:text-stone-300"
              }`}>
              {GOOD_ICONS[g]} {GOOD_LABELS[g]}
            </button>
          ))}
        </div>
      </div>
      {spread > 5 && (
        <div className="text-xs text-emerald-400 border border-emerald-900/40 bg-emerald-950/15 px-3 py-1.5 rounded-sm flex items-center gap-2">
          <TrendingUp className="w-3 h-3" />
          <span>
            <strong>{GOOD_LABELS[sortGood]}</strong>: En ucuzdan al, en pahalıya sat →{" "}
            <strong>%{spread} kâr marjı</strong>
          </span>
        </div>
      )}
      <div className="space-y-1">
        {rows.map((row, i) => {
          const ratio = row.price / row.base;
          const isMin = i === 0, isMax = i === rows.length - 1;
          return (
            <div key={row.id}
              className={`flex items-center gap-3 text-xs p-2 rounded-sm ${
                isMin ? "bg-emerald-950/20 border border-emerald-900/30" :
                isMax ? "bg-red-950/10 border border-red-900/20" : "border border-transparent"
              }`}>
              <span className="text-stone-500 w-4 text-[10px]">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="text-stone-200 capitalize">{row.name}</span>
                <span className="text-stone-600 text-[10px] ml-1">({row.kind})</span>
              </div>
              <div className="flex items-center gap-2">
                <PriceBar price={row.price} base={row.base} max={dearest * 1.1} />
                <span className={`font-heading w-10 text-right ${
                  ratio > 1.15 ? "text-red-400" : ratio < 0.85 ? "text-emerald-400" : "text-stone-300"
                }`}>{row.price}A</span>
              </div>
              {isMin && <TrendingDown className="w-3 h-3 text-emerald-400 shrink-0" />}
              {isMax && <TrendingUp className="w-3 h-3 text-red-400 shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Pazar Paneli ──────────────────────────────────────────────────── */
function MarketPanel({ loc, playerInv, onTrade, onBargain, onInspect, turn, qualityIntel, busy }) {
  const [qty, setQty] = useState({});
  const [previews, setPreviews] = useState({});   // { "buğday_al": {total, avg, ...}, ... }
  const [previewBusy, setPreviewBusy] = useState({});

  // qty veya action değişince preview çek (debounced)
  const fetchPreview = useCallback(async (good, action, q) => {
    if (q < 1) return;
    const key = `${good}_${action}`;
    setPreviewBusy(p => ({ ...p, [key]: true }));
    try {
      const { data } = await api.get("/game/trade/preview", {
        params: { location_id: loc?.id, good, qty: q, action },
      });
      setPreviews(p => ({ ...p, [key]: data }));
    } catch {
      // preview başarısız olursa eski hesabı göster
      setPreviews(p => ({ ...p, [key]: null }));
    } finally {
      setPreviewBusy(p => ({ ...p, [key]: false }));
    }
  }, [loc?.id]);

  // qty değişince debounce ile preview çek
  const timerRef = useRef({});
  const schedulePreview = useCallback((good, action, q) => {
    const key = `${good}_${action}`;
    clearTimeout(timerRef.current[key]);
    timerRef.current[key] = setTimeout(() => fetchPreview(good, action, q), 300);
  }, [fetchPreview]);

  const changeQty = useCallback((good, delta) => {
    setQty(q_ => {
      const next = Math.max(1, (q_[good] || 1) + delta);
      schedulePreview(good, "al",  next);
      schedulePreview(good, "sat", next);
      return { ...q_, [good]: next };
    });
  }, [schedulePreview]);

  if (!loc?.market) return null;
  const goods = Object.keys(loc.market);
  const maxPriceInMarket = Math.max(...goods.map(g => loc.market[g].price));

  return (
    <div className="card-frame p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingCart className="w-4 h-4 text-orange-500" />
        <span className="font-heading text-stone-100">{loc.name} Pazarı</span>
        <span className="label-tiny capitalize ml-auto">{loc.kind} · Zenginlik {loc.wealth}</span>
      </div>
      <div className="space-y-2">
        {goods.map(good => {
          const m = loc.market[good];
          const inInv = playerInv[good] || 0;
          const q = qty[good] || 1;
          const trend = priceTrend(loc, good);

          // Preview veya fallback
          const buyPreview  = previews[`${good}_al`];
          const sellPreview = previews[`${good}_sat`];
          const buyCost  = buyPreview  ? buyPreview.total  : Math.round(m.price * q * 10) / 10;
          const sellEarn = sellPreview ? sellPreview.total : Math.round(m.price * Math.min(q, inInv) * 10) / 10;
          const buyAvg   = buyPreview  ? buyPreview.avg_unit_price  : null;
          const sellAvg  = sellPreview ? sellPreview.avg_unit_price : null;
          const buyImpact  = buyPreview?.has_impact  && q > 1;
          const sellImpact = sellPreview?.has_impact && q > 1;

          // R3.2: parti kalitesi — iyi/usta görünür; kusurlu ancak incelemeyle
          const lotQ = m.kalite;
          const intelKey = `${loc.id}|${good}|${turn}`;
          const intelVal = qualityIntel?.[intelKey];
          const visibleQ =
            lotQ === "iyi" || lotQ === "usta_işi" ? lotQ
            : lotQ === "kusurlu" && intelVal === "revealed" ? "kusurlu"
            : null;
          const canInspect = QUALITY_GOODS.has(good) && !visibleQ && !intelVal;

          return (
            <div key={good} className="border border-stone-800/60 rounded-sm p-3 space-y-2">
              {/* Başlık satırı */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{GOOD_ICONS[good]}</span>
                  <span className="text-sm text-stone-200">{GOOD_LABELS[good] || good}</span>
                  {visibleQ && <QualityBadge kalite={visibleQ} />}
                  {canInspect && (
                    <button
                      onClick={() => onInspect?.(loc.id, good)}
                      disabled={busy}
                      title="İncele — işçiliği elden geçir (zekâ)"
                      className="text-[10px] px-1.5 py-0.5 border border-stone-700 rounded-sm text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-all">
                      🔍
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-stone-500">
                    Stok: <span className="text-stone-300">{m.supply}</span>
                  </span>
                  <PriceBar price={m.price} base={m.base} max={maxPriceInMarket} />
                  <TrendIcon trend={trend} />
                  <span className="font-heading text-amber-400 w-10 text-right">{m.price}A</span>
                </div>
              </div>

              {/* Miktar + butonlar */}
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-stone-700 rounded-sm overflow-hidden">
                  <button
                    onClick={() => changeQty(good, -1)}
                    className="px-2 py-1 text-stone-400 hover:text-stone-200 text-xs border-r border-stone-700">
                    -
                  </button>
                  <span className="px-3 text-xs text-stone-200 bg-stone-900 py-1 min-w-[2rem] text-center">
                    {q}
                  </span>
                  <button
                    onClick={() => changeQty(good, +1)}
                    className="px-2 py-1 text-stone-400 hover:text-stone-200 text-xs border-l border-stone-700">
                    +
                  </button>
                </div>

                <button onClick={() => onTrade(loc.id, good, "al", q)}
                  disabled={busy || m.supply < q}
                  className="flex-1 btn-ember py-1 text-[11px] font-heading tracking-wider disabled:opacity-40 flex items-center justify-center gap-1">
                  {previewBusy[`${good}_al`]
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Coins className="w-3 h-3" />}
                  AL ({buyCost}A)
                </button>

                <button onClick={() => onTrade(loc.id, good, "sat", q)}
                  disabled={busy || inInv < q}
                  className="flex-1 btn-ghost-ash py-1 text-[11px] font-heading tracking-wider disabled:opacity-40 flex items-center justify-center gap-1">
                  {previewBusy[`${good}_sat`]
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Package className="w-3 h-3" />}
                  SAT ({sellEarn}A)
                </button>

                <button
                  onClick={() => onBargain?.({
                    locId: loc.id, good, qty: q,
                    canBuy: m.supply >= q, canSell: inInv >= q,
                  })}
                  disabled={busy || (m.supply < q && inInv < q)}
                  title="Pazarlık et"
                  className="px-2 py-1 text-sm border border-amber-900/50 rounded-sm hover:bg-amber-950/20 transition-all disabled:opacity-30 shrink-0">
                  🤝
                </button>

                {inInv > 0 && (
                  <span className="text-[10px] text-stone-500 shrink-0">Env: {inInv}</span>
                )}
              </div>

              {/* Ortalama fiyat satırı — sadece q > 1 ve preview varsa göster */}
              {q > 1 && (buyAvg || sellAvg) && (
                <div className="flex flex-wrap gap-2 text-[10px] text-stone-500">
                  {buyAvg && (
                    <span>
                      Alım ort.: <span className="text-amber-400">{buyAvg}A/birim</span>
                      {buyPreview && (
                        <span className="text-stone-600">
                          {" "}({buyPreview.first_unit_price}A → {buyPreview.last_unit_price}A)
                        </span>
                      )}
                    </span>
                  )}
                  {sellAvg && (
                    <span>
                      Satış ort.: <span className="text-emerald-400">{sellAvg}A/birim</span>
                      {sellPreview && (
                        <span className="text-stone-600">
                          {" "}({sellPreview.first_unit_price}A → {sellPreview.last_unit_price}A)
                        </span>
                      )}
                    </span>
                  )}
                </div>
              )}

              {/* Piyasa etkisi uyarısı */}
              {(buyImpact || sellImpact) && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400 border border-amber-900/30 bg-amber-950/10 px-2 py-1 rounded-sm">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>
                    Büyük işlem — piyasa etkilenecek
                    {buyImpact  && ` (alım: +%${buyPreview.price_impact_pct})`}
                    {sellImpact && ` (satış: ${sellPreview.price_impact_pct}%)`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Kervan: Durum Kartı ───────────────────────────────────────────── */
function CaravanStatusCard({ status, onDisband, busy }) {
  const {
    caravan, current_location_name, route_names,
    steps_completed, total_steps, progress_pct,
  } = status;

  const statusConfig = {
    traveling: {
      label: "Yolda", color: "text-amber-400",
      bg: "bg-amber-950/20 border-amber-800/40",
      icon: <Truck className="w-3 h-3" />,
    },
    arrived: {
      label: "Ulaştı", color: "text-emerald-400",
      bg: "bg-emerald-950/20 border-emerald-800/40",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    attacked: {
      label: "Saldırıya Uğradı", color: "text-red-400",
      bg: "bg-red-950/20 border-red-800/40",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
  };
  const cfg = statusConfig[caravan.status] || statusConfig.traveling;

  return (
    <div className="card-frame p-4 space-y-4">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-amber-500" />
          <span className="font-heading text-stone-100">Aktif Kervan</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-sm border font-heading tracking-wider flex items-center gap-1 ${cfg.bg} ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      {/* Rota */}
      <div className="flex items-center gap-1 flex-wrap text-xs">
        {route_names?.map((name, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className={
              i === steps_completed ? "text-amber-300 font-heading" :
              i < steps_completed ? "text-stone-500 line-through" : "text-stone-400"
            }>
              {i === steps_completed && (
                <Navigation className="w-2.5 h-2.5 inline mr-0.5" />
              )}
              {name}
            </span>
            {i < route_names.length - 1 && (
              <ArrowRight className="w-3 h-3 text-stone-600" />
            )}
          </span>
        ))}
      </div>

      {/* İlerleme Çubuğu */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-stone-500">
          <span>{steps_completed}/{total_steps} adım</span>
          <span>%{progress_pct}</span>
        </div>
        <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-600 transition-all duration-500"
            style={{ width: `${progress_pct}%` }}
          />
        </div>
      </div>

      {/* Kargo Özeti */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(caravan.goods || {}).map(([good, gdata]) => (
          <div key={good}
            className="flex items-center gap-1 text-[11px] border border-stone-700/60 rounded-sm px-2 py-1">
            <span>{GOOD_ICONS[good] || "📦"}</span>
            <span className="text-stone-300">{GOOD_LABELS[good] || good}</span>
            <span className="text-amber-400 font-heading">×{gdata.qty}</span>
          </div>
        ))}
        {caravan.cash_on_hand > 0 && (
          <div className="flex items-center gap-1 text-[11px] border border-stone-700/60 rounded-sm px-2 py-1">
            <Coins className="w-3 h-3 text-amber-400" />
            <span className="text-amber-300 font-heading">{caravan.cash_on_hand}A nakit</span>
          </div>
        )}
      </div>

      {/* Saldırı Logları */}
      {caravan.attack_events?.length > 0 && (
        <div className="space-y-1">
          {caravan.attack_events.map((ev, i) => (
            <div key={i}
              className="text-[10px] text-red-400 flex items-center gap-1.5 border border-red-900/30 bg-red-950/10 px-2 py-1 rounded-sm">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>{ev.summary} (−{ev.lost_value}A)</span>
            </div>
          ))}
        </div>
      )}

      {/* Dağıt Butonu */}
      <button onClick={onDisband} disabled={busy}
        className="w-full btn-ghost-ash py-2 text-xs font-heading tracking-wider flex items-center justify-center gap-2 text-red-400 border-red-900/40 hover:border-red-700/60 disabled:opacity-40">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
        Kervanı Dağıt (Mallar Geri Alınır)
      </button>
    </div>
  );
}

/* ─── Kervan: Kur Formu ─────────────────────────────────────────────── */
function CaravanCreateForm({ locations, inventory, playerMoney, onSubmit, busy }) {
  const [destId, setDestId] = useState("");
  const [goods, setGoods] = useState({});
  const [cashOnHand, setCashOnHand] = useState(0);

  const destLoc = locations.find(l => l.id === destId);
  const invGoods = Object.entries(inventory).filter(([, q]) => q > 0);
  const totalUnits = Object.values(goods).reduce((s, q) => s + q, 0);

  const estimatedMargin = useMemo(() => {
    if (!destLoc?.market) return null;
    let sellVal = 0, unitCount = 0;
    for (const [good, qty] of Object.entries(goods)) {
      if (!qty) continue;
      const destPrice = destLoc.market[good]?.price;
      if (!destPrice) continue;
      sellVal += destPrice * qty;
      unitCount += qty;
    }
    return sellVal > 0 && unitCount > 0
      ? Math.round(((sellVal / unitCount - 1) / 1) * 100) // basit gösterge
      : null;
  }, [goods, destLoc]);

  const setGoodQty = (good, delta) => {
    setGoods(prev => {
      const cur = prev[good] || 0;
      const max = inventory[good] || 0;
      const next = Math.max(0, Math.min(max, cur + delta));
      if (next === 0) {
        const { [good]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [good]: next };
    });
  };

  const canSubmit = destId && totalUnits > 0 && cashOnHand <= playerMoney && !busy;

  return (
    <div className="card-frame p-4 space-y-5">
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-amber-500" />
        <span className="font-heading text-stone-100">Kervan Kur</span>
      </div>

      {/* Hedef Şehir */}
      <div className="space-y-1.5">
        <div className="label-tiny">Hedef Şehir</div>
        <div className="grid gap-1.5 max-h-40 overflow-y-auto pr-1">
          {locations.map(loc => (
            <button key={loc.id} onClick={() => setDestId(loc.id)}
              className={`flex items-center justify-between text-xs p-2.5 rounded-sm border transition-all text-left ${
                destId === loc.id
                  ? "border-amber-700/60 bg-amber-950/20 text-stone-100"
                  : "border-stone-800/60 text-stone-400 hover:border-stone-700 hover:text-stone-300"
              }`}>
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="font-heading">{loc.name}</span>
                <span className="text-[10px] opacity-60 capitalize">{loc.kind}</span>
              </div>
              {loc.kingdom_name && (
                <span className="text-[10px] text-stone-600">{loc.kingdom_name}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Mal Seçimi */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="label-tiny">Yüklenecek Mallar</div>
          <span className="text-[10px] text-stone-500">{totalUnits}/200 birim</span>
        </div>
        {invGoods.length === 0 ? (
          <p className="text-xs text-stone-500 italic">Envanterde mal yok.</p>
        ) : (
          <div className="space-y-1.5">
            {invGoods.map(([good, maxQty]) => {
              const selected = goods[good] || 0;
              const destPrice = destLoc?.market?.[good]?.price;
              return (
                <div key={good}
                  className={`flex items-center gap-3 p-2.5 rounded-sm border transition-all ${
                    selected > 0 ? "border-amber-800/50 bg-amber-950/10" : "border-stone-800/40"
                  }`}>
                  <span className="text-base shrink-0">{GOOD_ICONS[good] || "📦"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-stone-200">{GOOD_LABELS[good] || good}</div>
                    <div className="text-[10px] text-stone-500">
                      Envanter: {maxQty}
                      {destPrice && (
                        <span className="text-emerald-500 ml-2">→ {destPrice}A</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center border border-stone-700 rounded-sm overflow-hidden shrink-0">
                    <button onClick={() => setGoodQty(good, -1)}
                      className="px-2 py-1 text-stone-400 hover:text-stone-200 text-xs border-r border-stone-700">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className={`px-3 text-xs py-1 w-8 text-center ${
                      selected > 0 ? "text-amber-300 bg-amber-950/30" : "text-stone-400 bg-stone-900"
                    }`}>
                      {selected}
                    </span>
                    <button onClick={() => setGoodQty(good, 1)}
                      disabled={selected >= maxQty || totalUnits >= 200}
                      className="px-2 py-1 text-stone-400 hover:text-stone-200 text-xs border-l border-stone-700 disabled:opacity-30">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nakit */}
      <div className="space-y-1.5">
        <div className="label-tiny">Yanına Alınacak Nakit</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-stone-700 rounded-sm overflow-hidden">
            <button onClick={() => setCashOnHand(c => Math.max(0, c - 10))}
              className="px-2 py-1.5 text-stone-400 hover:text-stone-200 text-xs border-r border-stone-700">
              <Minus className="w-3 h-3" />
            </button>
            <span className="px-3 text-xs text-amber-300 bg-stone-900 py-1.5 font-heading w-16 text-center">
              {cashOnHand}A
            </span>
            <button onClick={() => setCashOnHand(c => Math.min(playerMoney, c + 10))}
              disabled={cashOnHand >= playerMoney}
              className="px-2 py-1.5 text-stone-400 hover:text-stone-200 text-xs border-l border-stone-700 disabled:opacity-30">
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="text-[10px] text-stone-500">Mevcut: {playerMoney}A</span>
        </div>
      </div>

      {/* Özet */}
      {destId && totalUnits > 0 && (
        <div className="border border-stone-800/60 rounded-sm p-3 space-y-1 bg-stone-950/40">
          <div className="text-[10px] text-stone-500 font-heading tracking-wider">ÖZET</div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Toplam yük</span>
            <span className="text-stone-200">{totalUnits} birim</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Hedef</span>
            <span className="text-stone-200">{destLoc?.name}</span>
          </div>
          {estimatedMargin !== null && (
            <div className="flex justify-between text-xs">
              <span className="text-stone-400">Tahmini fiyat farkı</span>
              <span className={estimatedMargin >= 0 ? "text-emerald-400" : "text-red-400"}>
                {estimatedMargin >= 0 ? "+" : ""}{estimatedMargin}%
              </span>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => onSubmit({ destination_id: destId, goods, cash_on_hand: cashOnHand })}
        disabled={!canSubmit}
        className="w-full btn-ember py-2.5 text-sm font-heading tracking-wider flex items-center justify-center gap-2 disabled:opacity-40">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
        Kervanı Başlat
      </button>
    </div>
  );
}

/* ─── Kervan: Geçmiş ────────────────────────────────────────────────── */
function CaravanHistory({ history }) {
  const [open, setOpen] = useState(false);
  if (!history?.length) return null;
  const recent = history.slice(-5).reverse();

  return (
    <div className="card-frame overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-3 hover:bg-stone-900/40 transition-colors">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-stone-500" />
          <span className="label-tiny">Kervan Geçmişi</span>
          <span className="text-[10px] text-stone-600">({history.length})</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-stone-500" />
          : <ChevronDown className="w-4 h-4 text-stone-500" />}
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-stone-800/50 space-y-2 pt-2">
          {recent.map((c, i) => {
            const profit = c.profit;
            const isGood = profit > 0;
            const isNeutral = profit === null || profit === undefined;
            return (
              <div key={c.id || i}
                className="flex items-center justify-between text-xs border border-stone-800/40 rounded-sm px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`shrink-0 ${
                    c.status === "arrived"   ? "text-emerald-400" :
                    c.status === "attacked"  ? "text-red-400"     :
                    c.status === "disbanded" ? "text-stone-500"   : "text-amber-400"
                  }`}>
                    {c.status === "arrived" ? "✓" :
                     c.status === "attacked" ? "✕" :
                     c.status === "disbanded" ? "—" : "…"}
                  </span>
                  <span className="text-stone-400 truncate">
                    {c.origin_name} → {c.destination_name}
                  </span>
                </div>
                {!isNeutral ? (
                  <span className={`shrink-0 font-heading text-xs ml-2 ${isGood ? "text-emerald-400" : "text-red-400"}`}>
                    {isGood ? "+" : ""}{profit?.toFixed(1)}A
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] text-stone-600 ml-2 capitalize">
                    {c.status}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Kervan Sonuç Modalı ───────────────────────────────────────────── */
function CaravanResultModal({ event, onClose }) {
  const isArrived   = event?.type === "arrived";
  const isAttack    = event?.type === "attack";
  const isDestroyed = event?.type === "caravan_destroyed";

  /* Kâr detayı satırları */
  const profitRows = useMemo(() => {
    if (!isArrived || !event?.profit_detail) return [];
    return Object.entries(event.profit_detail).map(([good, d]) => ({
      good,
      qty:       d.qty       ?? 0,
      buyPrice:  d.buy_price ?? 0,
      sellPrice: d.sell_price ?? 0,
      profit:    d.profit    ?? 0,
    }));
  }, [event, isArrived]);

  if (!event) return null;

  const totalProfit  = event.profit      ?? 0;
  const lostValue    = event.lost_value  ?? 0;
  const tradeXP      = event.trade_xp   ?? Math.max(1, Math.round(totalProfit / 20));

  const headerCfg = isArrived
    ? { icon: <Trophy className="w-5 h-5 text-amber-400" />, title: "Kervan Ulaştı!", color: "text-emerald-400", bg: "border-emerald-900/40 bg-emerald-950/10" }
    : isAttack
    ? { icon: <Swords className="w-4 h-4 text-red-400" />,  title: "Saldırıya Uğradı",  color: "text-red-400",     bg: "border-red-900/40 bg-red-950/10" }
    : { icon: <XCircle className="w-4 h-4 text-red-500" />, title: "Kervan Yağmalandı", color: "text-red-500",     bg: "border-red-900/40 bg-red-950/15" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm card-frame p-5 space-y-5 rise-in">

        {/* Başlık */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 text-sm font-heading ${headerCfg.color}`}>
            {headerCfg.icon}
            <span>{headerCfg.title}</span>
          </div>
          <button onClick={onClose}
            className="text-stone-500 hover:text-stone-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Özet mesajı */}
        {event.summary && (
          <p className={`text-xs px-3 py-2 rounded-sm border ${headerCfg.bg} ${headerCfg.color}`}>
            {event.summary}
          </p>
        )}

        {/* ── ULAŞTI: Kâr Tablosu ── */}
        {isArrived && profitRows.length > 0 && (
          <div className="space-y-2">
            <div className="label-tiny">Satış Özeti</div>
            <div className="space-y-1">
              {profitRows.map(row => (
                <div key={row.good}
                  className="flex items-center gap-2 text-xs border border-stone-800/50 rounded-sm px-3 py-2">
                  <span className="text-base shrink-0">{GOOD_ICONS[row.good] || "📦"}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-stone-200">{GOOD_LABELS[row.good] || row.good}</span>
                    <span className="text-stone-500 ml-1">×{row.qty}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-stone-500 shrink-0">
                    <span>{row.buyPrice.toFixed(1)}A</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                    <span className="text-stone-300">{row.sellPrice.toFixed(1)}A</span>
                  </div>
                  <span className={`font-heading text-xs w-14 text-right shrink-0 ${
                    row.profit >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {row.profit >= 0 ? "+" : ""}{row.profit.toFixed(1)}A
                  </span>
                </div>
              ))}
            </div>

            {/* Toplam kâr */}
            <div className="flex items-center justify-between border border-amber-900/30 bg-amber-950/10 rounded-sm px-3 py-2">
              <span className="text-xs text-stone-400 font-heading tracking-wider">TOPLAM KÂR</span>
              <span className={`font-heading text-base ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(1)} Akçe
              </span>
            </div>

            {/* Trade XP */}
            {tradeXP > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-400 border border-amber-900/30 rounded-sm px-3 py-1.5">
                <TrendingUp className="w-3 h-3 shrink-0" />
                <span>Ticaret deneyimi kazandın: <strong>+{tradeXP} XP</strong></span>
              </div>
            )}
          </div>
        )}

        {/* ── SALDIRI: Kayıp Detayı ── */}
        {(isAttack || isDestroyed) && (
          <div className="space-y-2">
            <div className="label-tiny">Hasar Raporu</div>
            <div className="flex items-center justify-between border border-red-900/30 bg-red-950/10 rounded-sm px-3 py-2">
              <span className="text-xs text-stone-400">Toplam Kayıp</span>
              <span className="font-heading text-base text-red-400">−{lostValue.toFixed(1)} Akçe</span>
            </div>

            {/* Kalan mallar (saldırıda hayatta kaldıysa) */}
            {isAttack && event.remaining_goods && Object.keys(event.remaining_goods).length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-stone-500 font-heading tracking-wider">KALAN MALLAR</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(event.remaining_goods).map(([good, qty]) => (
                    <div key={good}
                      className="flex items-center gap-1 text-[11px] border border-stone-700/60 rounded-sm px-2 py-1">
                      <span>{GOOD_ICONS[good] || "📦"}</span>
                      <span className="text-stone-300">{GOOD_LABELS[good] || good}</span>
                      <span className="text-amber-400 font-heading">×{qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isDestroyed && (
              <p className="text-xs text-stone-500 italic">Tüm mallar ve nakit eşkıyalar tarafından alındı.</p>
            )}
          </div>
        )}

        {/* Kapat Butonu */}
        <button onClick={onClose}
          className={`w-full py-2.5 text-sm font-heading tracking-wider rounded-sm border transition-all ${
            isArrived
              ? "btn-ember"
              : "btn-ghost-ash border-stone-700 hover:border-stone-500"
          }`}>
          {isArrived ? "Harika! 🎉" : "Tamam"}
        </button>
      </div>
    </div>
  );
}

/* ─── Ana Bileşen ───────────────────────────────────────────────────── */
/* ─── Pazarlık Modalı (GDD v7 R3.1) ─────────────────────────────────── */
function BargainModal({ target, onTrade, onClose }) {
  // target: { locId, good, qty, canBuy, canSell }
  const [action, setAction] = useState(target.canBuy ? "al" : "sat");
  const [phase, setPhase]   = useState("setup");   // setup | live | done
  const [view, setView]     = useState(null);
  const [result, setResult] = useState(null);
  const [note, setNote]     = useState(null);
  const [busyB, setBusyB]   = useState(false);

  const goodName = GOOD_LABELS[target.good] || target.good;

  const start = async () => {
    setBusyB(true);
    try {
      const { data } = await api.post("/game/bargain/start", {
        location_id: target.locId, good: target.good, qty: target.qty, action,
      });
      setView(data); setNote(null); setPhase("live");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Pazarlık başlatılamadı.");
    } finally { setBusyB(false); }
  };

  const move = async (m) => {
    setBusyB(true);
    try {
      const { data } = await api.post("/game/bargain/move", { move: m });
      if (data.done) { setResult(data); setPhase("done"); }
      else { setView(data); setNote(data.note || null); }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hamle yapılamadı.");
    } finally { setBusyB(false); }
  };

  const finishTrade = async () => {
    setBusyB(true);
    try {
      await onTrade(target.locId, target.good, action, target.qty);
      onClose();
    } finally { setBusyB(false); }
  };

  const saved = result?.saved ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm card-frame p-5 space-y-4 rise-in">

        {/* Başlık */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-heading text-amber-400">
            <span className="text-base">🤝</span>
            <span>Pazarlık — {GOOD_ICONS[target.good] || "📦"} {goodName} ×{target.qty}</span>
          </div>
          <button onClick={onClose}
            className="text-stone-500 hover:text-stone-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── KURULUM ── */}
        {phase === "setup" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {[
                { id: "al",  label: "ALIRKEN", ok: target.canBuy },
                { id: "sat", label: "SATARKEN", ok: target.canSell },
              ].map(a => (
                <button key={a.id} disabled={!a.ok}
                  onClick={() => setAction(a.id)}
                  className={`flex-1 py-2 text-[11px] font-heading tracking-wider border rounded-sm transition-all disabled:opacity-30 ${
                    action === a.id
                      ? "border-amber-600 text-amber-400 bg-amber-950/20"
                      : "border-stone-700 text-stone-500 hover:text-stone-300"
                  }`}>
                  {a.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-400">
              Tezgâha yanaşıp fiyatı çekiştirebilirsin. Satıcı yüksekten açar;
              dil dökersen iner — ama blöfün tutmazsa alınır.
            </p>
            <button onClick={start} disabled={busyB}
              className="w-full btn-ember py-2 text-xs font-heading tracking-wider disabled:opacity-40 flex items-center justify-center gap-2">
              {busyB ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "🤝"} TEZGÂHA YANAŞ
            </button>
          </div>
        )}

        {/* ── ÇEKİŞME ── */}
        {phase === "live" && view && (
          <div className="space-y-3">
            <p className="text-xs text-stone-200 italic border border-stone-800/60 bg-stone-900/40 rounded-sm px-3 py-2">
              {view.line}
            </p>
            {note && <p className="text-[11px] text-amber-400">{note}</p>}

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="border border-stone-800/60 rounded-sm py-2">
                <div className="label-tiny">Normal Fiyat</div>
                <div className="font-heading text-stone-300 text-sm">{view.base}A</div>
              </div>
              <div className="border border-amber-900/40 bg-amber-950/10 rounded-sm py-2">
                <div className="label-tiny">Eldeki Teklif</div>
                <div className="font-heading text-amber-400 text-sm">{view.offer}A</div>
              </div>
            </div>

            {view.floor_visible && view.floor != null && (
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 border border-emerald-900/30 bg-emerald-950/10 px-2 py-1 rounded-sm">
                👁 Tabanını seziyorsun: <strong>{view.floor}A</strong>
                {action === "al" ? " — bunun altına inmez." : " — bunun üstüne çıkmaz."}
              </div>
            )}

            <div className="text-[10px] text-stone-500 text-center">
              Tur {view.round}/{view.max_rounds}
            </div>

            <div className="space-y-2">
              <button onClick={() => move("kabul")} disabled={busyB}
                className="w-full btn-ember py-2 text-[11px] font-heading tracking-wider disabled:opacity-40">
                KABUL ET ({view.offer}A)
              </button>
              <div className="flex gap-2">
                <button onClick={() => move("karsi")} disabled={busyB}
                  className="flex-1 btn-ghost-ash py-2 text-[11px] font-heading tracking-wider disabled:opacity-40">
                  KARŞI TEKLİF
                </button>
                <button onClick={() => move("blof")} disabled={busyB}
                  className="flex-1 py-2 text-[11px] font-heading tracking-wider border border-red-900/50 text-red-400 hover:bg-red-950/20 rounded-sm transition-all disabled:opacity-40">
                  BLÖF YAP
                </button>
              </div>
              <button onClick={() => move("vazgec")} disabled={busyB}
                className="w-full py-1.5 text-[10px] text-stone-500 hover:text-stone-300 transition-colors">
                Vazgeç, tezgâhtan ayrıl
              </button>
            </div>
            <p className="text-[10px] text-stone-600">
              Blöf: "Çarşıda ucuza buldum" — tutarsa taban fiyat, tutmazsa satıcı alınır.
            </p>
          </div>
        )}

        {/* ── SONUÇ ── */}
        {phase === "done" && result && (
          <div className="space-y-3">
            <p className="text-xs text-stone-200 italic border border-stone-800/60 bg-stone-900/40 rounded-sm px-3 py-2">
              {result.note}
            </p>

            {result.cancelled ? (
              <button onClick={onClose}
                className="w-full btn-ghost-ash py-2 text-xs font-heading tracking-wider">
                KAPAT
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between border border-amber-900/30 bg-amber-950/10 rounded-sm px-3 py-2">
                  <span className="text-xs text-stone-400 font-heading tracking-wider">
                    ANLAŞILAN FİYAT
                  </span>
                  <span className="font-heading text-base text-amber-400">{result.final}A</span>
                </div>
                <div className={`text-[11px] px-2 py-1 rounded-sm border ${
                  saved >= 0
                    ? "text-emerald-400 border-emerald-900/30 bg-emerald-950/10"
                    : "text-red-400 border-red-900/30 bg-red-950/10"
                }`}>
                  {saved >= 0
                    ? `Normal fiyata göre ${saved}A ${action === "al" ? "ucuza" : "fazlaya"} bağladın.`
                    : `Normal fiyattan ${Math.abs(saved)}A daha kötü — yine de bağlamak ister misin?`}
                </div>
                <button onClick={finishTrade} disabled={busyB}
                  className="w-full btn-ember py-2 text-xs font-heading tracking-wider disabled:opacity-40 flex items-center justify-center gap-2">
                  {busyB && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  ANLAŞMAYI TAMAMLA — {action === "al" ? "AL" : "SAT"}
                </button>
                <button onClick={onClose}
                  className="w-full py-1.5 text-[10px] text-stone-500 hover:text-stone-300 transition-colors">
                  Şimdi değil (söz bu hafta geçerli)
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Trade() {
  const { state, setState, lastCaravanEvent, clearCaravanEvent } = useGame();
  const [tab, setTab] = useState("pazar");
  const [busy, setBusy] = useState(false);
  const [expandedLocId, setExpandedLocId] = useState(null);
  const [caravanStatus, setCaravanStatus] = useState(null);
  const [caravanHistory, setCaravanHistory] = useState([]);
  const [caravanLoading, setCaravanLoading] = useState(false);
  const [resultEvent, setResultEvent] = useState(null);
  const [bargainTarget, setBargainTarget] = useState(null);

  const player    = state?.player || {};
  const locations = useMemo(() => state?.world?.locations || [], [state?.world?.locations]);
  const playerLoc = locations.find(l => l.id === player.location_id);
  const inventory = player.inventory || {};

  const allGoods = useMemo(() => {
    const s = new Set();
    locations.forEach(l => l.market && Object.keys(l.market).forEach(g => s.add(g)));
    return Array.from(s);
  }, [locations]);

  const sortedLocs = useMemo(() =>
    [...locations]
      .filter(l => l.market)
      .sort((a, b) => {
        if (a.id === player.location_id) return -1;
        if (b.id === player.location_id) return 1;
        return (b.wealth || 0) - (a.wealth || 0);
      }),
    [locations, player.location_id]
  );

  const caravanDestinations = useMemo(() =>
    locations.filter(l => l.id !== player.location_id && l.market),
    [locations, player.location_id]
  );

  const fetchCaravanStatus = useCallback(async () => {
    setCaravanLoading(true);
    try {
      const { data } = await api.get("/game/caravan/status");
      setCaravanStatus(data);
      if (data.active || data.caravan) {
        const { data: hist } = await api.get("/game/caravan/history");
        setCaravanHistory(hist.history || []);
      }
      // Bekleyen kervan olayı var mı? (advance'den önce tab açıldıysa)
      try {
        const { data: evData } = await api.get("/game/caravan/pending-event");
        if (evData?.event) setResultEvent(evData.event);
      } catch { /* endpoint yoksa geç */ }
    } catch { /* sessizce geç */ }
    finally { setCaravanLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "kervan") fetchCaravanStatus();
  }, [tab, fetchCaravanStatus]);

  // advance'den gelen kervan eventi → modal göster (Trade sayfasındayken)
  useEffect(() => {
    if (lastCaravanEvent) {
      setResultEvent(lastCaravanEvent);
      clearCaravanEvent();
      // Tab'ı kervan'a geç ki sonuç anlamlı olsun
      setTab("kervan");
    }
  }, [lastCaravanEvent, clearCaravanEvent]);

  /* ── Pazar: Al / Sat ── */
  const handleTrade = async (locId, good, action, qty) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/trade", { location_id: locId, good, action, qty });
      const note = data._trade_note;
      delete data._trade_note;
      setState(data);
      toast.success(
        action === "al"
          ? `${qty} ${GOOD_LABELS[good] || good} aldın`
          : `${qty} ${GOOD_LABELS[good] || good} sattın`
      );
      // R3.2: kalite notu — kusur tuzağı / prim / kakalama sonucu
      if (note) {
        if (note.includes("⚠️") || note.includes("KUSURLU")) toast.warning(note, { duration: 6000 });
        else toast.message(note, { duration: 5000 });
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "İşlem başarısız.");
    } finally { setBusy(false); }
  };

  /* ── Pazar: İncele (R3.2) ── */
  const handleInspect = async (locId, good) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/trade/inspect", { location_id: locId, good });
      if (data.ok) toast.success(data.note, { duration: 6000 });
      else toast.message(data.note, { duration: 5000 });
      // Yerel intel'i güncelle ki rozet/buton anında değişsin
      const key = `${locId}|${good}|${state?.turn}`;
      const val = data.ok ? "revealed" : data.tried ? "tried" : null;
      if (val) {
        setState(s => ({
          ...s,
          player: {
            ...s.player,
            quality_intel: { ...(s.player?.quality_intel || {}), [key]: val },
          },
        }));
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "İnceleme yapılamadı.");
    } finally { setBusy(false); }
  };

  /* ── Kervan: Kur ── */
  const handleCaravanCreate = async ({ destination_id, goods, cash_on_hand }) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/caravan/create", {
        destination_id, goods, cash_on_hand,
      });
      setState(data.state);
      // Status'u yenile (gerçek route_names vb. için)
      await fetchCaravanStatus();
      toast.success(`Kervan yola çıktı! ${data.route_names?.join(" → ")}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Kervan kurulamadı.");
    } finally { setBusy(false); }
  };

  /* ── Kervan: Dağıt ── */
  const handleCaravanDisband = async () => {
    if (!window.confirm("Kervanı dağıtmak istediğine emin misin? Mallar geri alınır.")) return;
    setBusy(true);
    try {
      const { data } = await api.post("/game/caravan/disband");
      setState(data.state);
      setCaravanStatus({ active: false, caravan: null });
      toast.success("Kervan dağıtıldı. Mallar envanterine eklendi.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Dağıtma başarısız.");
    } finally { setBusy(false); }
  };

  /* ─── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5 rise-in">
      {/* Kervan Sonuç Modalı */}
      {resultEvent && (
        <CaravanResultModal
          event={resultEvent}
          onClose={() => {
            setResultEvent(null);
            fetchCaravanStatus(); // modalı kapattıktan sonra durumu yenile
          }}
        />
      )}
      {/* Pazarlık Modalı */}
      {bargainTarget && (
        <BargainModal
          target={bargainTarget}
          onTrade={handleTrade}
          onClose={() => setBargainTarget(null)}
        />
      )}
      {/* Başlık */}
      <div>
        <div className="label-tiny">Ekonomi</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <ArrowUpDown className="w-6 h-6 text-amber-500" /> Ticaret & Kervan
        </h1>
        <p className="text-stone-400 text-sm mt-1">
          Pazar arbitrajı yap ya da kervan kurarak şehirler arası ticaret yürüt.
        </p>
      </div>

      {/* Cüzdan */}
      <div className="card-frame p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="label-tiny">Altın</span>
        </div>
        <span className="font-heading text-amber-400 text-lg">{player.money || 0}</span>
      </div>

      {/* Sekmeler */}
      <div className="flex border-b border-stone-800/60">
        {[
          { id: "pazar",  label: "Pazar",  icon: <ShoppingCart className="w-3.5 h-3.5" /> },
          { id: "kervan", label: "Kervan", icon: <Truck className="w-3.5 h-3.5" /> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-heading tracking-wider border-b-2 transition-all -mb-px ${
              tab === t.id
                ? "border-amber-600 text-amber-400"
                : "border-transparent text-stone-500 hover:text-stone-300"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── PAZAR SEKMESİ ── */}
      {tab === "pazar" && (
        <div className="space-y-5">
          {/* Envanter özeti */}
          {Object.keys(inventory).filter(g => inventory[g] > 0).length > 0 && (
            <div className="card-frame p-3">
              <div className="label-tiny mb-2">Envanterindeki Mallar</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(inventory)
                  .filter(([, qty]) => qty > 0)
                  .map(([good, qty]) => (
                    <div key={good}
                      className="flex items-center gap-1.5 text-xs border border-stone-700 rounded-sm px-2 py-1">
                      <span>{GOOD_ICONS[good] || "📦"}</span>
                      <span className="text-stone-300">{GOOD_LABELS[good] || good}</span>
                      <span className="text-amber-400 font-heading">×{qty}</span>
                      {player.inv_quality?.[good] && (
                        <QualityBadge kalite={player.inv_quality[good]} />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Mevcut konum pazarı */}
          {playerLoc?.market && (
            <MarketPanel
              loc={playerLoc}
              playerInv={inventory}
              onTrade={handleTrade}
              onBargain={setBargainTarget}
              onInspect={handleInspect}
              turn={state?.turn}
              qualityIntel={player.quality_intel}
              busy={busy}
            />
          )}

          {/* Arbitraj analizi — backend destekli (S5) */}
          <ArbitrageOpportunities />

          {/* Şehirler arası fiyat karşılaştırması (frontend, anlık) */}
          <ArbitrageTable locations={sortedLocs} goods={allGoods} />

          {/* Diğer pazarlar */}
          <div className="space-y-2">
            <div className="label-tiny">Diğer Pazarlar</div>
            {sortedLocs.filter(l => l.id !== player.location_id).map(loc => {
              const isExpanded = expandedLocId === loc.id;
              return (
                <div key={loc.id} className="card-frame overflow-hidden">
                  <button
                    onClick={() => setExpandedLocId(isExpanded ? null : loc.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-stone-900/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-200 text-sm font-heading">{loc.name}</span>
                      <span className="label-tiny capitalize">{loc.kind}</span>
                      {loc.kingdom_name && (
                        <span className="text-[10px] text-stone-600">{loc.kingdom_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        {allGoods.slice(0, 4).map(g => loc.market?.[g] && (
                          <span key={g} className="text-[10px] text-stone-500">
                            {GOOD_ICONS[g]}{loc.market[g].price}A
                          </span>
                        ))}
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-stone-500" />
                        : <ChevronDown className="w-4 h-4 text-stone-500" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-stone-800/50">
                      <div className="text-xs text-stone-500 py-2 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        Bu pazarda alım satım yapmak için önce o şehre git.
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1">
                        {allGoods.map(g => {
                          const m = loc.market?.[g];
                          if (!m) return null;
                          const currentM = playerLoc?.market?.[g];
                          const priceDiff = currentM ? m.price - currentM.price : 0;
                          return (
                            <div key={g}
                              className="border border-stone-800/40 rounded-sm p-2 space-y-1">
                              <div className="flex items-center gap-1 text-[10px] text-stone-400">
                                <span>{GOOD_ICONS[g]}</span>
                                <span>{GOOD_LABELS[g]}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="font-heading text-sm text-stone-200">
                                  {m.price}A
                                </span>
                                {currentM && (
                                  <span className={`text-[10px] ${
                                    priceDiff > 0 ? "text-red-400" :
                                    priceDiff < 0 ? "text-emerald-400" : "text-stone-500"
                                  }`}>
                                    {priceDiff > 0 ? `+${priceDiff.toFixed(1)}` : priceDiff.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── KERVAN SEKMESİ ── */}
      {tab === "kervan" && (
        <div className="space-y-4">
          {caravanLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-stone-500" />
            </div>
          ) : caravanStatus?.active ? (
            <>
              <CaravanStatusCard
                status={caravanStatus}
                onDisband={handleCaravanDisband}
                busy={busy}
              />
              <CaravanHistory history={caravanHistory} />
            </>
          ) : (
            <>
              {player.age < 13 && (
                <div className="text-xs text-amber-400 border border-amber-900/40 bg-amber-950/15 px-3 py-2 rounded-sm flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  Kervan kurmak için 13 yaşında olmalısın.
                </div>
              )}
              <CaravanCreateForm
                locations={caravanDestinations}
                inventory={inventory}
                playerMoney={player.money || 0}
                onSubmit={handleCaravanCreate}
                busy={busy || player.age < 13}
              />
              <CaravanHistory history={caravanHistory} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
