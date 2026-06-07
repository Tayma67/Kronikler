import { useParams, useNavigate, Link } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Crown, Users, Coins, ShieldCheck, TrendingUp, Package, Wagon, Landmark, Heart, Star, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function CityDetail() {
  const { id } = useParams();
  const { state, setState } = useGame();
  const navigate = useNavigate();
  const loc = useMemo(
    () => state?.world.locations.find((l) => l.id === id),
    [state, id]
  );
  const [busy, setBusy] = useState(false);
  const [tradeGood, setTradeGood] = useState("buğday");
  const [qty, setQty] = useState(1);

  // Governance state
  const [governance, setGovernance] = useState(null);
  const [taxAmount, setTaxAmount] = useState(10);

  useEffect(() => {
    if (!id) return;
    api.get(`/game/governance/${id}`)
      .then(({ data }) => setGovernance(data))
      .catch(() => {}); // Governance yoksa sessiz geç
  }, [id]);

  if (!loc) {
    return (
      <div className="text-stone-400">
        Konum bulunamadı. <Link to="/oyun" className="text-orange-500">Geri dön</Link>
      </div>
    );
  }

  const kingdom = state.world.kingdoms.find((k) => k.id === loc.kingdom_id);
  const notableNpcs = state.world.npcs
    .filter((n) => n.location_id === loc.id && n.alive)
    .sort((a, b) => b.wealth - a.wealth)
    .slice(0, 8);

  const isHere = state.player.location_id === loc.id;
  const player = state.player;

  // Yöneticiye aday olma koşulları
  const canRunForGovernor = () => {
    if (!governance) return false;
    const age = player.age || 0;
    const rep = player.reputation || 0;
    const kind = governance.kind;
    if (kind === "krallık") return age >= 18 && rep >= 70;
    if (kind === "şehir")   return age >= 16 && rep >= 30;
    return age >= 13 && rep >= 30;
  };

  const handleRunForGovernor = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/governance/run-for-governor", { location_id: loc.id });
      if (data.success) {
        toast.success(data.message || "Adaylığın kaydedildi.");
        const { data: gov } = await api.get(`/game/governance/${id}`);
        setGovernance(gov);
      } else {
        toast.error(data.reason || "Aday olunamadı.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(false);
    }
  };

  const handlePayTax = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/governance/pay-taxes", {
        location_id: loc.id,
        amount: Number(taxAmount),
      });
      if (data.success) {
        toast.success(data.message || "Vergi ödendi.");
        setState((prev) => ({ ...prev, player: { ...prev.player, money: data.remaining } }));
        const { data: gov } = await api.get(`/game/governance/${id}`);
        setGovernance(gov);
      } else {
        toast.error(data.reason || "İşlem başarısız.");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(false);
    }
  };

  const travel = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/travel", { location_id: loc.id });
      if (data.blocked) {
        toast.error(data.message);
        setState(data.state);
        return;
      }
      setState(data.state);
      if (data.enforcement) {
        toast.error(`${data.enforcement.by} seni karşıladı: ${data.enforcement.fine} altın ceza.`);
      } else {
        toast.success(`${loc.name}'e ulaştın.`);
      }
    } catch (e) {
      toast.error("Yolculuk başarısız.");
    } finally {
      setBusy(false);
    }
  };

  const trade = async (action) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/trade", {
        location_id: loc.id,
        good: tradeGood,
        qty: Number(qty),
        action,
      });
      setState(data);
      toast.success(action === "al" ? "Satın aldın." : "Sattın.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "İşlem başarısız");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 rise-in">
      <button onClick={() => navigate("/oyun")} className="text-stone-400 hover:text-stone-200 flex items-center gap-2 text-sm" data-testid="city-back">
        <ArrowLeft className="w-4 h-4" /> Dünya Haritasına Dön
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-tiny">{loc.kind} · {kingdom?.name}</div>
          <h1 className="font-heading text-3xl text-stone-100">{loc.name}</h1>
        </div>
        {isHere ? (
          <span className="px-3 py-1.5 border border-emerald-800 bg-emerald-950/30 text-emerald-400 text-xs rounded-sm font-heading tracking-wider">
            BURADASIN
          </span>
        ) : (
          <button onClick={travel} disabled={busy} data-testid="city-travel" className="btn-ember px-4 py-2 text-xs font-heading tracking-widest disabled:opacity-50">
            BURAYA YOLCULUK ET (3 GÜN)
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Users} label="Nüfus" value={loc.population.toLocaleString()} />
        <StatCard icon={Coins} label="Refah" value={loc.wealth} suffix="%" />
        <StatCard icon={ShieldCheck} label="Güvenlik" value={loc.security} suffix="%" />
        <StatCard icon={TrendingUp} label="Bolluk" value={loc.prosperity} suffix="%" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-frame p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg text-stone-100">Pazar Fiyatları</h2>
            <span className="label-tiny">Altın / Birim</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 text-stone-500 text-xs">
                <th className="text-left py-2 font-normal label-tiny">Ürün</th>
                <th className="text-right py-2 font-normal label-tiny">Arz</th>
                <th className="text-right py-2 font-normal label-tiny">Talep</th>
                <th className="text-right py-2 font-normal label-tiny">Fiyat</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(loc.market || {}).map(([g, m]) => {
                const ratio = m.supply / Math.max(1, m.demand);
                const cls = ratio < 0.5 ? "text-red-400" : ratio > 1.5 ? "text-emerald-400" : "text-stone-300";
                return (
                  <tr key={g} className="border-b border-stone-900">
                    <td className="py-2 text-stone-200 capitalize">{g}</td>
                    <td className={`py-2 text-right ${cls}`}>{m.supply}</td>
                    <td className="py-2 text-right text-stone-400">{m.demand}</td>
                    <td className="py-2 text-right text-amber-400">{m.price}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {isHere && (
            <div className="mt-5 pt-5 border-t border-stone-800 space-y-3">
              <div className="label-tiny">Pazarda Al / Sat</div>
              <div className="flex flex-wrap gap-2 items-end">
                <select
                  value={tradeGood}
                  onChange={(e) => setTradeGood(e.target.value)}
                  data-testid="trade-good"
                  className="bg-stone-950 border border-stone-800 px-3 py-2 text-sm rounded-sm"
                >
                  {Object.keys(loc.market || loc.prices).map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  data-testid="trade-qty"
                  className="bg-stone-950 border border-stone-800 px-3 py-2 text-sm w-24 rounded-sm"
                />
                <button onClick={() => trade("al")} disabled={busy} data-testid="trade-buy" className="btn-ember px-4 py-2 text-xs font-heading tracking-widest">SATIN AL</button>
                <button onClick={() => trade("sat")} disabled={busy} data-testid="trade-sell" className="btn-ghost-ash px-4 py-2 text-xs font-heading tracking-widest">SAT</button>
              </div>
            </div>
          )}
        </div>

        <div className="card-frame p-5">
          <h2 className="font-heading text-lg text-stone-100 mb-4">Önemli Sakinler</h2>
          <ul className="space-y-2">
            {notableNpcs.map((n) => (
              <li key={n.id} className="flex items-center justify-between text-sm py-1.5 border-b border-stone-900 last:border-0">
                <Link to={`/oyun/npc/${n.id}`} className="flex items-center gap-2 text-stone-200 hover:text-orange-400" data-testid={`city-npc-${n.id}`}>
                  {n.profession === "kral" && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                  <span>{n.name}</span>
                </Link>
                <span className="text-xs text-stone-500">{n.profession} · {n.wealth}a</span>
              </li>
            ))}
            {notableNpcs.length === 0 && <li className="text-stone-500 text-sm">Bu konumda hayat eseri görünmüyor.</li>}
          </ul>
        </div>
      </div>

      {/* ── Şehir Yönetimi Widget ── */}
      {governance && (
        <div className="card-frame p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg text-stone-100 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-orange-600" /> Şehir Yönetimi
            </h2>
            {governance.governor_id === "PLAYER" && (
              <span className="text-[9px] font-heading tracking-wider uppercase px-2 py-0.5 rounded-sm border border-amber-800 bg-amber-950/30 text-amber-400">
                Sen Yönetiyorsun
              </span>
            )}
          </div>

          {/* Yönetici */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-500">Yönetici</span>
            <span className="text-stone-200 flex items-center gap-1">
              {governance.governor_id === "PLAYER" ? (
                <><Crown className="w-3.5 h-3.5 text-amber-400" /> {player.name}</>
              ) : governance.governor_name ? (
                <><Crown className="w-3.5 h-3.5 text-stone-500" /> {governance.governor_name}</>
              ) : (
                <span className="text-stone-600 italic">Boş</span>
              )}
            </span>
          </div>

          {/* Stat barları */}
          <div className="space-y-2">
            <GovBar label="Meşruiyet"        value={governance.governor_legitimacy}  color={governance.governor_legitimacy >= 60 ? "bg-emerald-700" : "bg-red-700"} />
            <GovBar label="Halk Memnuniyeti" value={governance.population_happiness} color={governance.population_happiness >= 60 ? "bg-sky-700" : "bg-amber-700"} />
          </div>

          {/* Vergi & Hazine */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="card-frame p-2.5 text-center">
              <div className="label-tiny mb-0.5">Vergi Oranı</div>
              <div className="font-heading text-lg text-amber-400">%{governance.tax_rate}</div>
            </div>
            <div className="card-frame p-2.5 text-center">
              <div className="label-tiny mb-0.5">Hazine</div>
              <div className="font-heading text-lg text-amber-400">{governance.treasury} ⚙</div>
            </div>
          </div>

          {/* Aktif Faction Nüfuzları */}
          {governance.faction_influence && Object.keys(governance.faction_influence).length > 0 && (
            <div className="space-y-2">
              <div className="label-tiny">Örgüt Nüfuzları</div>
              {Object.entries(governance.faction_influence)
                .sort(([, a], [, b]) => b - a)
                .map(([fId, val]) => {
                  const fName = governance.faction_names?.[fId] || fId.slice(0, 16);
                  const barCol = val >= 75 ? "bg-amber-500" : val >= 50 ? "bg-sky-600" : "bg-stone-600";
                  return (
                    <div key={fId} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-400">{fName}</span>
                        <span className="text-stone-500">{val}/100</span>
                      </div>
                      <div className="bg-stone-900 rounded-full h-1 overflow-hidden">
                        <div className={`h-full ${barCol}`} style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Gizli kontrol uyarısı */}
          {governance.controlled_by_faction && !governance.control_is_secret && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              Bu şehir bir örgütün kontrolünde.
            </div>
          )}

          {/* Aksiyon butonları */}
          <div className="flex flex-wrap gap-2 pt-1">
            {canRunForGovernor() && governance.governor_id !== "PLAYER" && (
              <button
                onClick={handleRunForGovernor}
                disabled={busy}
                className="btn-ember px-4 py-2 text-xs font-heading tracking-wider"
              >
                <Star className="w-3.5 h-3.5 inline mr-1" /> Aday Ol
              </button>
            )}
            {isHere && (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  className="bg-stone-950 border border-stone-800 px-2 py-1.5 text-sm w-20 rounded-sm"
                />
                <button
                  onClick={handlePayTax}
                  disabled={busy}
                  className="btn-ghost-ash px-3 py-1.5 text-xs font-heading tracking-wider"
                >
                  <Coins className="w-3.5 h-3.5 inline mr-1" /> Vergi Öde
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fiyat Geçmişi Grafiği */}
      {loc.price_history && loc.price_history.length >= 2 && (
        <div className="card-frame p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-heading text-lg text-stone-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" /> Pazar Fiyat Geçmişi
            </h2>
            <span className="text-[10px] text-stone-500 font-heading tracking-wider">
              SON {loc.price_history.length} ÖLÇÜM
            </span>
          </div>
          <p className="text-xs text-stone-600 mb-4">Her 4 turda bir snapshot · Buğday referans fiyatı</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={loc.price_history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="turn"
                tick={{ fontSize: 10, fill: "#78716c" }}
                tickFormatter={(v) => `T${v}`}
                stroke="#44403c"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#78716c" }}
                stroke="#44403c"
                tickFormatter={(v) => `${v}a`}
              />
              <Tooltip
                contentStyle={{ background: "#0c0a09", border: "1px solid #44403c", fontSize: 11, borderRadius: 2 }}
                labelFormatter={(v) => `Tur ${v}`}
                formatter={(val, name) => [`${Number(val).toFixed(1)}a`, name]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(val) => <span style={{ color: "#a8a29e" }}>{val}</span>}
              />
              {[
                ["buğday", "#f59e0b"],
                ["ekmek",  "#84cc16"],
                ["et",     "#fb923c"],
                ["demir",  "#94a3b8"],
                ["odun",   "#78716c"],
                ["kumaş",  "#c084fc"],
                ["silah",  "#f87171"],
              ].map(([g, color]) => (
                <Line
                  key={g}
                  type="monotone"
                  dataKey={g}
                  stroke={color}
                  dot={false}
                  strokeWidth={1.5}
                  activeDot={{ r: 3, fill: color }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Kervan Geçişleri */}
      {loc.caravan_log && loc.caravan_log.length > 0 && (
        <div className="card-frame p-5">
          <h2 className="font-heading text-lg text-stone-100 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-600" /> Son Kervan Geçişleri
          </h2>
          <ul className="space-y-1.5">
            {[...loc.caravan_log].reverse().map((c, i) => (
              <li key={i} className="flex items-center justify-between text-sm border-b border-stone-900 pb-1.5 last:border-0">
                <div className="flex items-center gap-2 text-stone-300">
                  <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{c.npc_name}</span>
                  <span className="text-xs text-stone-500">tüccar</span>
                </div>
                <span className="text-[10px] text-stone-600 font-mono">T{c.day}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, suffix = "" }) {
  return (
    <div className="card-frame p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="label-tiny">{label}</span>
        <Icon className="w-4 h-4 text-orange-700" />
      </div>
      <div className="font-heading text-2xl text-stone-100">{value}{suffix}</div>
    </div>
  );
}

function GovBar({ label, value, color = "bg-emerald-700" }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-stone-500">{label}</span>
        <span className="text-stone-400">{value}/100</span>
      </div>
      <div className="bg-stone-900 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
