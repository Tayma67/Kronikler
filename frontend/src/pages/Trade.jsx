import { useState, useMemo } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Coins, ArrowUpDown, TrendingUp, TrendingDown, Loader2,
  Package, ShoppingCart, ArrowRight, ChevronDown, ChevronUp,
} from "lucide-react";

const GOOD_LABELS = {
  "buğday": "Buğday", "ekmek": "Ekmek", "et": "Et",
  "demir": "Demir", "odun": "Odun", "kumaş": "Kumaş", "silah": "Silah",
};

const GOOD_ICONS = {
  "buğday": "🌾", "ekmek": "🍞", "et": "🥩",
  "demir": "⚙️", "odun": "🪵", "kumaş": "🧵", "silah": "⚔️",
};

function PriceBar({ price, base, max }) {
  const pct = Math.min(100, Math.round((price / max) * 100));
  const ratio = price / base;
  const color = ratio > 1.15 ? "stat-bar-fill-bad" : ratio < 0.85 ? "stat-bar-fill-good" : "stat-bar-fill";
  return (
    <div className="stat-bar w-16">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ArbitrageTable({ locations, goods }) {
  const [sortGood, setSortGood] = useState(goods[0] || "buğday");

  const rows = useMemo(() => {
    return locations
      .filter(l => l.market && l.market[sortGood])
      .map(l => ({
        id: l.id,
        name: l.name,
        kind: l.kind,
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
      <div className="flex items-center justify-between">
        <div className="label-tiny">Arbitraj Analizi</div>
        <div className="flex gap-1 flex-wrap">
          {goods.map(g => (
            <button
              key={g}
              onClick={() => setSortGood(g)}
              className={`text-[10px] px-2 py-0.5 rounded-sm font-heading tracking-wider border transition-all ${
                sortGood === g
                  ? "border-orange-800 bg-stone-900 text-orange-400"
                  : "border-stone-800 text-stone-500 hover:text-stone-300"
              }`}
            >
              {GOOD_ICONS[g]} {GOOD_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {spread > 5 && (
        <div className="text-xs text-emerald-400 border border-emerald-900/40 bg-emerald-950/15 px-3 py-1.5 rounded-sm flex items-center gap-2">
          <TrendingUp className="w-3 h-3" />
          <span>
            <strong>{GOOD_LABELS[sortGood]}</strong>: En ucuz yer'den al, en pahalı yere sat → <strong>%{spread} kâr marjı</strong>
          </span>
        </div>
      )}

      <div className="space-y-1">
        {rows.map((row, i) => {
          const ratio = row.price / row.base;
          const isMin = i === 0;
          const isMax = i === rows.length - 1;
          return (
            <div key={row.id} className={`flex items-center gap-3 text-xs p-2 rounded-sm ${
              isMin ? "bg-emerald-950/20 border border-emerald-900/30" :
              isMax ? "bg-red-950/10 border border-red-900/20" :
              "border border-transparent"
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
                }`}>
                  {row.price}A
                </span>
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

function MarketPanel({ loc, playerInv, onTrade, busy }) {
  const [qty, setQty] = useState({});
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
          const buyCost = Math.round(m.price * q * 10) / 10;
          const sellEarn = Math.round(m.price * Math.min(q, inInv) * 10) / 10;

          return (
            <div key={good} className="border border-stone-800/60 rounded-sm p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{GOOD_ICONS[good]}</span>
                  <span className="text-sm text-stone-200">{GOOD_LABELS[good]}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-stone-500">Stok: <span className="text-stone-300">{m.supply}</span></span>
                  <PriceBar price={m.price} base={m.base} max={maxPriceInMarket} />
                  <span className="font-heading text-amber-400 w-10 text-right">{m.price}A</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center border border-stone-700 rounded-sm overflow-hidden">
                  <button
                    onClick={() => setQty(q_ => ({ ...q_, [good]: Math.max(1, (q_[good] || 1) - 1) }))}
                    className="px-2 py-1 text-stone-400 hover:text-stone-200 text-xs border-r border-stone-700"
                  >-</button>
                  <span className="px-3 text-xs text-stone-200 bg-stone-900 py-1">{q}</span>
                  <button
                    onClick={() => setQty(q_ => ({ ...q_, [good]: (q_[good] || 1) + 1 }))}
                    className="px-2 py-1 text-stone-400 hover:text-stone-200 text-xs border-l border-stone-700"
                  >+</button>
                </div>

                <button
                  onClick={() => onTrade(loc.id, good, "al", q)}
                  disabled={busy || m.supply < q}
                  className="flex-1 btn-ember py-1 text-[11px] font-heading tracking-wider disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  <Coins className="w-3 h-3" /> AL ({buyCost}A)
                </button>

                <button
                  onClick={() => onTrade(loc.id, good, "sat", q)}
                  disabled={busy || inInv < q}
                  className="flex-1 btn-ghost-ash py-1 text-[11px] font-heading tracking-wider disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  <Package className="w-3 h-3" /> SAT ({sellEarn}A)
                </button>

                {inInv > 0 && (
                  <span className="text-[10px] text-stone-500 shrink-0">Env: {inInv}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Trade() {
  const { state, setState } = useGame();
  const [busy, setBusy] = useState(false);
  const [expandedLocId, setExpandedLocId] = useState(null);

  const player = state?.player || {};
  const locations = state?.world?.locations || [];
  const playerLoc = locations.find(l => l.id === player.location_id);
  const inventory = player.inventory || {};

  const allGoods = useMemo(() => {
    const s = new Set();
    locations.forEach(l => l.market && Object.keys(l.market).forEach(g => s.add(g)));
    return Array.from(s);
  }, [locations]);

  const handleTrade = async (locId, good, action, qty) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/trade", {
        location_id: locId,
        good,
        action,
        qty,
      });
      setState(data);
      toast.success(action === "al"
        ? `${qty} ${GOOD_LABELS[good] || good} aldın`
        : `${qty} ${GOOD_LABELS[good] || good} sattın`
      );
    } catch (e) {
      toast.error(e.response?.data?.detail || "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  };

  // Sort locations: current first, then by wealth desc
  const sortedLocs = useMemo(() => {
    return [...locations]
      .filter(l => l.market)
      .sort((a, b) => {
        if (a.id === player.location_id) return -1;
        if (b.id === player.location_id) return 1;
        return (b.wealth || 0) - (a.wealth || 0);
      });
  }, [locations, player.location_id]);

  return (
    <div className="space-y-5 rise-in">
      <div>
        <div className="label-tiny">Pazar</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <ArrowUpDown className="w-6 h-6 text-amber-500" /> Ticaret & Kervan
        </h1>
        <p className="text-stone-400 text-sm mt-1">
          Fiyat farklarını kullan, şehirler arası arbitraj yap, kâr et.
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

      {/* Mevcut envanter */}
      {Object.keys(inventory).filter(g => inventory[g] > 0).length > 0 && (
        <div className="card-frame p-3">
          <div className="label-tiny mb-2">Envanterindeki Mallar</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(inventory)
              .filter(([, qty]) => qty > 0)
              .map(([good, qty]) => (
                <div key={good} className="flex items-center gap-1.5 text-xs border border-stone-700 rounded-sm px-2 py-1">
                  <span>{GOOD_ICONS[good] || "📦"}</span>
                  <span className="text-stone-300">{GOOD_LABELS[good] || good}</span>
                  <span className="text-amber-400 font-heading">×{qty}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Mevcut pazar */}
      {playerLoc?.market && (
        <MarketPanel
          loc={playerLoc}
          playerInv={inventory}
          onTrade={handleTrade}
          busy={busy}
        />
      )}

      {/* Arbitraj Tablosu */}
      <ArbitrageTable locations={sortedLocs} goods={allGoods} />

      {/* Diğer şehirlerin pazarları (akordiyon) */}
      <div className="space-y-2">
        <div className="label-tiny">Diğer Pazarlar</div>
        {sortedLocs
          .filter(l => l.id !== player.location_id)
          .map(loc => {
            const isExpanded = expandedLocId === loc.id;
            return (
              <div key={loc.id} className="card-frame overflow-hidden">
                <button
                  onClick={() => setExpandedLocId(isExpanded ? null : loc.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-stone-900/40 transition-colors"
                >
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
                          <div key={g} className="border border-stone-800/40 rounded-sm p-2 space-y-1">
                            <div className="flex items-center gap-1 text-[10px] text-stone-400">
                              <span>{GOOD_ICONS[g]}</span>
                              <span>{GOOD_LABELS[g]}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-heading text-sm text-stone-200">{m.price}A</span>
                              {currentM && (
                                <span className={`text-[10px] ${priceDiff > 0 ? "text-red-400" : priceDiff < 0 ? "text-emerald-400" : "text-stone-500"}`}>
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
  );
}
