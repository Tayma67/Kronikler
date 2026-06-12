import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Crown, Users, Coins, ShieldCheck, TrendingUp, Package, Wagon, Landmark, Star, AlertTriangle, Building2, Church, Home, MapPin, Flame, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const ROLE_PRIORITY = [
  "kral", "vali", "komutan", "rahip", "asker",
  "muhafız", "tüccar", "zanaatkar", "çiftçi", "köylü",
];

const ALTYAPI_LABEL = {
  1: "Mezra",
  2: "Köy",
  3: "Kasaba",
  4: "Şehir",
  5: "Büyük Şehir",
};

const ALTYAPI_ICON = {
  1: "🏕️",
  2: "🏘️",
  3: "🏙️",
  4: "🏯",
  5: "🏰",
};

// Altyapı seviyesine göre gelir çarpanı açıklaması
const ALTYAPI_CARPAN = {
  1: "×0.6",
  2: "×1.0",
  3: "×1.5",
  4: "×2.0",
  5: "×4.0",
};

// ─── R7: Yolculuk Modalı — rota seç → yol eventi → varış ─────────────────
const ROUTE_STYLES = {
  ana_yol: "border-emerald-900/50 hover:bg-emerald-950/15",
  patika:  "border-red-900/50 hover:bg-red-950/15",
  kervan:  "border-amber-900/50 hover:bg-amber-950/15",
};

function TravelModal({ loc, onDone, onClose }) {
  const [phase, setPhase] = useState("route");  // route | event | done
  const [routes, setRoutes] = useState(null);
  const [scene, setScene] = useState(null);
  const [result, setResult] = useState(null);
  const [busyT, setBusyT] = useState(false);

  useEffect(() => {
    api.get("/game/travel/routes")
      .then(({ data }) => setRoutes(data.routes))
      .catch(() => setRoutes([
        { id: "ana_yol", label: "Ana Yol", icon: "🛤", risk: "düşük",
          desc: "Taş döşeli, bekçili yol.", perk: "Güvenli" },
      ]));
  }, []);

  const pickRoute = async (routeId) => {
    setBusyT(true);
    try {
      const { data } = await api.post("/game/travel/start", {
        location_id: loc.id, route: routeId,
      });
      if (data.blocked) {
        toast.error(data.message);
        onClose();
        return;
      }
      setScene(data);
      setPhase("event");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Yola çıkılamadı.");
      onClose();
    } finally { setBusyT(false); }
  };

  const choose = async (choiceId) => {
    setBusyT(true);
    try {
      const { data } = await api.post("/game/travel/resolve", { choice: choiceId });
      setResult(data);
      setPhase("done");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Seçim çözülemedi.");
    } finally { setBusyT(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-sm card-frame p-5 space-y-4 rise-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-heading text-amber-400">
            <MapPin className="w-4 h-4" />
            <span>{loc.name} Yolculuğu</span>
          </div>
          {phase === "route" && (
            <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-xs">✕</button>
          )}
        </div>

        {/* ── ROTA SEÇİMİ ── */}
        {phase === "route" && (
          <div className="space-y-2">
            <p className="text-xs text-stone-400">Hangi yoldan gideceksin? Yol bir mekândır — her rotanın kendi hikâyesi var.</p>
            {!routes && <div className="text-center text-stone-500 text-xs py-4">Yollar haritaya bakılıyor…</div>}
            {routes?.map(r => (
              <button key={r.id} onClick={() => pickRoute(r.id)} disabled={busyT}
                className={`w-full text-left p-3 border rounded-sm transition-all disabled:opacity-40 ${ROUTE_STYLES[r.id] || "border-stone-700"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-heading text-sm text-stone-100">{r.icon} {r.label}</span>
                  <span className={`text-[9px] uppercase tracking-wider font-heading ${
                    r.risk === "yüksek" ? "text-red-400" : "text-emerald-400"
                  }`}>{r.risk} risk</span>
                </div>
                <p className="text-[11px] text-stone-400 mt-1">{r.desc}</p>
                <p className="text-[10px] text-amber-500/80 mt-0.5">{r.perk}</p>
              </button>
            ))}
          </div>
        )}

        {/* ── YOL EVENTİ ── */}
        {phase === "event" && scene && (
          <div className="space-y-3">
            <div className="text-[10px] text-stone-500 uppercase tracking-wider">
              {scene.route_label} · {scene.dest_name} yolunda
              {scene.traveler && <span className="text-amber-500/80"> · {scene.traveler}</span>}
            </div>
            <p className="text-sm text-stone-200 italic border border-stone-800/60 bg-stone-900/40 rounded-sm px-3 py-2.5">
              {scene.text}
            </p>
            <div className="space-y-2">
              {scene.choices.map(c => (
                <button key={c.id} onClick={() => choose(c.id)} disabled={busyT}
                  className="w-full text-left px-3 py-2.5 border border-amber-900/40 rounded-sm hover:bg-amber-950/15 transition-all disabled:opacity-40">
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-xs tracking-wider text-stone-200">{c.label}</span>
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
          </div>
        )}

        {/* ── VARIŞ ── */}
        {phase === "done" && result && (
          <div className="space-y-3">
            <div className="text-center space-y-1">
              <div className="text-2xl">🏙</div>
              <div className="font-heading text-lg text-amber-400 tracking-widest">
                {result.result?.dest_name?.toUpperCase()}'E VARDIN
              </div>
            </div>
            {result.result?.effects?.map((t, i) => (
              <p key={i} className="text-xs text-stone-300 border border-stone-800/60 bg-stone-900/40 rounded-sm px-3 py-2">
                {t}
              </p>
            ))}
            {result.enforcement && (
              <p className="text-xs text-red-400 border border-red-900/40 bg-red-950/10 rounded-sm px-3 py-2">
                {result.enforcement.by} seni karşıladı: {result.enforcement.fine} altın ceza.
              </p>
            )}
            <button onClick={() => onDone(result)}
              className="w-full btn-ember py-2 text-xs font-heading tracking-widest">
              ŞEHRE GİR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// İnanç renkleri
const INANC_RENK = {
  "geleneksel": "bg-amber-700",
  "yabanci":    "bg-sky-700",
  "ateist":     "bg-stone-600",
};
const INANC_RENK_TEXT = {
  "geleneksel": "text-amber-400",
  "yabanci":    "text-sky-400",
  "ateist":     "text-stone-400",
};

export default function CityDetail() {
  const { id } = useParams();
  const { state, setState } = useGame();
  const navigate = useNavigate();
  const loc = useMemo(
    () => state?.world.locations.find((l) => l.id === id),
    [state, id]
  );
  const region = useMemo(
    () => (state?.world.regions_slim || []).find((r) => r.location_id === id),
    [state, id]
  );
  const [busy, setBusy] = useState(false);
  const [activeGood, setActiveGood] = useState(null);
  const [tradeQty, setTradeQty] = useState(1);

  // Governance state
  const [governance, setGovernance] = useState(null);
  const [taxAmount, setTaxAmount] = useState(10);
  // R7: yolculuk modalı
  const [travelOpen, setTravelOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/game/governance/${id}`)
      .then(({ data }) => setGovernance(data))
      .catch(() => {});
  }, [id]);

  const notableNpcs = useMemo(() => {
    if (!loc) return [];
    return state.world.npcs
      .filter((n) => n.location_id === loc.id && n.alive)
      .slice(0, 8);
  }, [loc, state.world.npcs]);

  const sortedNpcs = useMemo(() => {
    return [...notableNpcs].sort((a, b) => {
      const relA = Math.abs(state.relationships?.[a.id] ?? 0);
      const relB = Math.abs(state.relationships?.[b.id] ?? 0);
      if (relB !== relA) return relB - relA;
      const rA = ROLE_PRIORITY.indexOf(a.profession);
      const rB = ROLE_PRIORITY.indexOf(b.profession);
      const rankA = rA === -1 ? 99 : rA;
      const rankB = rB === -1 ? 99 : rB;
      if (rankA !== rankB) return rankA - rankB;
      return b.wealth - a.wealth;
    });
  }, [notableNpcs, state.relationships]);

  if (!loc) {
    return (
      <div className="text-stone-400">
        Konum bulunamadı. <Link to="/oyun" className="text-orange-500">Geri dön</Link>
      </div>
    );
  }

  const kingdom = state.world.kingdoms.find((k) => k.id === loc.kingdom_id);

  const isHere = state.player.location_id === loc.id;
  const player = state.player;

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

  // R7: yolculuk artık rota + yol eventi ile (TravelModal)
  const travel = () => setTravelOpen(true);
  const onTravelDone = (data) => {
    if (data.state) setState(data.state);
    setTravelOpen(false);
    toast.success(`${loc.name}'e ulaştın.`);
  };

  const trade = async (action) => {
    if (!activeGood) return;
    setBusy(true);
    try {
      const { data } = await api.post("/game/trade", {
        location_id: loc.id,
        good: activeGood,
        qty: Number(tradeQty),
        action,
      });
      setState(data);
      toast.success(action === "al" ? "Satın aldın." : "Sattın.");
      setActiveGood(null);
      setTradeQty(1);
    } catch (e) {
      toast.error(e.response?.data?.detail || "İşlem başarısız");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 rise-in">
      {travelOpen && (
        <TravelModal
          loc={loc}
          onDone={onTravelDone}
          onClose={() => setTravelOpen(false)}
        />
      )}
      <button onClick={() => navigate("/oyun/harita")} className="text-stone-400 hover:text-stone-200 flex items-center gap-2 text-sm" data-testid="city-back">
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
            BURAYA YOLCULUK ET{loc.travel_days ? ` (${loc.travel_days} GÜN)` : ""}
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={Users}
          label="Nüfus"
          value={region ? region.nufus.toLocaleString() : loc.population.toLocaleString()}
          subtitle={region ? `${ALTYAPI_ICON[region.altyapi_seviyesi] || ""} ${ALTYAPI_LABEL[region.altyapi_seviyesi] || `Seviye ${region.altyapi_seviyesi}`}` : undefined}
        />
        <StatCard icon={Coins}       label="Refah"    value={loc.wealth}     suffix="%" colorize />
        <StatCard icon={ShieldCheck} label="Güvenlik" value={loc.security}   suffix="%" colorize />
        <StatCard icon={TrendingUp}  label="Bolluk"   value={loc.prosperity} suffix="%" colorize />
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
                const isActive = activeGood === g;
                const invQty = state.player.inventory?.[g] || 0;
                return (
                  <React.Fragment key={g}>
                    <tr
                      className={`border-b border-stone-900 transition-colors ${isHere ? "cursor-pointer hover:bg-stone-900/40" : ""} ${isActive ? "bg-stone-900/60" : ""}`}
                      onClick={() => {
                        if (!isHere) return;
                        setActiveGood(isActive ? null : g);
                        setTradeQty(1);
                      }}
                    >
                      <td className="py-2 text-stone-200 capitalize">
                        {g}
                        {isHere && <span className="text-stone-600 text-[10px] ml-1.5">{isActive ? "▲" : "▼"}</span>}
                      </td>
                      <td className={`py-2 text-right ${cls}`}>{m.supply}</td>
                      <td className="py-2 text-right text-stone-400">{m.demand}</td>
                      <td className="py-2 text-right text-amber-400">{m.price}</td>
                    </tr>
                    {isActive && isHere && (
                      <tr className="bg-stone-900/40">
                        <td colSpan={4} className="px-2 py-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center border border-stone-700 rounded-sm overflow-hidden">
                              <button
                                onClick={(e) => { e.stopPropagation(); setTradeQty(q => Math.max(1, q - 1)); }}
                                className="px-2 py-1 text-stone-400 hover:text-stone-200 hover:bg-stone-800 text-sm"
                              >−</button>
                              <span className="px-3 py-1 text-sm font-heading text-stone-200 min-w-[2rem] text-center">{tradeQty}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setTradeQty(q => q + 1); }}
                                className="px-2 py-1 text-stone-400 hover:text-stone-200 hover:bg-stone-800 text-sm"
                              >+</button>
                            </div>
                            <span className="text-xs text-stone-500">= {tradeQty * m.price} altın</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); trade("al"); }}
                              disabled={busy}
                              className="btn-ember px-3 py-1.5 text-[11px] font-heading tracking-wider disabled:opacity-50"
                            >
                              SATIN AL
                            </button>
                            {invQty > 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); trade("sat"); }}
                                disabled={busy}
                                className="btn-ghost-ash px-3 py-1.5 text-[11px] font-heading tracking-wider disabled:opacity-50"
                              >
                                SAT ({invQty} var)
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card-frame p-5">
          <h2 className="font-heading text-lg text-stone-100 mb-4">Önemli Sakinler</h2>
          <ul className="space-y-2">
            {sortedNpcs.map((n) => {
              const relScore = state.relationships?.[n.id];
              const relColor = relScore == null ? null
                : relScore >= 50  ? "text-emerald-400"
                : relScore >= 20  ? "text-emerald-600"
                : relScore >= -19 ? "text-stone-500"
                : relScore >= -49 ? "text-red-500"
                : "text-red-400";
              return (
                <li key={n.id} className="flex items-center justify-between text-sm py-1.5 border-b border-stone-900 last:border-0">
                  <Link to={`/oyun/npc/${n.id}`} className="flex items-center gap-2 text-stone-200 hover:text-orange-400 min-w-0" data-testid={`city-npc-${n.id}`}>
                    {n.profession === "kral" && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    <span className="truncate">{n.name}</span>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    {relScore != null && (
                      <span className={`font-heading ${relColor}`}>
                        {relScore > 0 ? `+${relScore}` : relScore}
                      </span>
                    )}
                    <span className="text-stone-500">{n.profession}</span>
                  </div>
                </li>
              );
            })}
            {sortedNpcs.length === 0 && <li className="text-stone-500 text-sm">Bu konumda hayat eseri görünmüyor.</li>}
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

      {/* ── Yerleşim & Altyapı Widget ── */}
      {region && (
        <div className="card-frame p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg text-stone-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-600" /> Yerleşim & Altyapı
            </h2>
            <span className="font-heading text-xl" title={ALTYAPI_LABEL[region.altyapi_seviyesi]}>
              {ALTYAPI_ICON[region.altyapi_seviyesi] || "🏕️"}
            </span>
          </div>

          {/* Seviye göstergesi */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-300 font-heading tracking-wide">
                {ALTYAPI_LABEL[region.altyapi_seviyesi] || `Seviye ${region.altyapi_seviyesi}`}
              </span>
              <span className="text-stone-500 text-xs">
                Seviye {region.altyapi_seviyesi} / 5
              </span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <div
                  key={lvl}
                  className={`h-2 flex-1 rounded-sm transition-all ${
                    lvl <= region.altyapi_seviyesi
                      ? lvl <= 2 ? "bg-stone-600"
                        : lvl <= 3 ? "bg-amber-700"
                        : lvl <= 4 ? "bg-orange-600"
                        : "bg-orange-500"
                      : "bg-stone-900"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-stone-600 font-heading tracking-wider">
              <span>MEZRA</span>
              <span>KÖY</span>
              <span>KASABA</span>
              <span>ŞEHİR</span>
              <span>BÜYÜK ŞEHİR</span>
            </div>
          </div>

          {/* Nüfus ve gelir çarpanı */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="card-frame p-2.5 text-center">
              <div className="label-tiny mb-0.5">Nüfus</div>
              <div className="font-heading text-base text-stone-100">
                {region.nufus?.toLocaleString() || "—"}
              </div>
              {region.nufus_max && (
                <div className="text-[10px] text-stone-600 mt-0.5">
                  / {region.nufus_max.toLocaleString()} max
                </div>
              )}
            </div>
            <div className="card-frame p-2.5 text-center">
              <div className="label-tiny mb-0.5">Gelir Çarpanı</div>
              <div className={`font-heading text-base ${
                (region.gelir_carpan || 1) >= 1.4 ? "text-emerald-400"
                : (region.gelir_carpan || 1) >= 1.0 ? "text-amber-400"
                : "text-red-400"
              }`}>
                ×{(region.gelir_carpan || 1.0).toFixed(2)}
              </div>
              <div className="text-[10px] text-stone-600 mt-0.5">
                {ALTYAPI_CARPAN[region.altyapi_seviyesi] || "×1.0"} beklenen
              </div>
            </div>
            <div className="card-frame p-2.5 text-center">
              <div className="label-tiny mb-0.5">Nüfus Yoğ.</div>
              <div className="font-heading text-base text-stone-100">
                {region.nufus_max
                  ? `%${Math.round((region.nufus / region.nufus_max) * 100)}`
                  : "—"}
              </div>
              <div className={`text-[10px] mt-0.5 ${
                region.nufus_max && (region.nufus / region.nufus_max) < 0.3
                  ? "text-red-500"
                  : "text-stone-600"
              }`}>
                {region.nufus_max && (region.nufus / region.nufus_max) < 0.3
                  ? "düşük" : "normal"}
              </div>
            </div>
          </div>

          {/* Yerleşim seviyesinin faydaları */}
          <div className="text-xs text-stone-500 border-t border-stone-900 pt-3">
            <span className="text-stone-400">Sonraki seviye </span>
            {region.altyapi_seviyesi < 5
              ? <>({ALTYAPI_LABEL[region.altyapi_seviyesi + 1]}) için bölgedeki örgütlerin bölgeyi yatırım yapması gerekiyor.</>
              : <span className="text-amber-600">Maksimum seviyeye ulaşıldı.</span>
            }
          </div>
        </div>
      )}

      {/* ── İnanç Dağılımı Widget ── */}
      {region?.inanc_dagilimi && Object.keys(region.inanc_dagilimi).length > 0 && (
        <div className="card-frame p-5 space-y-4">
          <h2 className="font-heading text-lg text-stone-100 flex items-center gap-2">
            <Church className="w-4 h-4 text-orange-600" /> İnanç Haritası
          </h2>

          {/* Oranlar */}
          <div className="space-y-2">
            {Object.entries(region.inanc_dagilimi)
              .filter(([, v]) => v > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([inanc, oran]) => {
                const barColor = INANC_RENK[inanc] || "bg-stone-700";
                const textColor = INANC_RENK_TEXT[inanc] || "text-stone-400";
                const totalInanc = Object.values(region.inanc_dagilimi).reduce((a, b) => a + b, 0);
                const pct = totalInanc > 0 ? Math.round((oran / totalInanc) * 100) : 0;
                return (
                  <div key={inanc} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className={`capitalize ${textColor}`}>{inanc}</span>
                      <span className="text-stone-500">{pct}%</span>
                    </div>
                    <div className="bg-stone-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Dominant inanç uyarısı */}
          {(() => {
            const entries = Object.entries(region.inanc_dagilimi).sort(([,a],[,b]) => b - a);
            const total = Object.values(region.inanc_dagilimi).reduce((a, b) => a + b, 0);
            const dominant = entries[0];
            if (!dominant || total === 0) return null;
            const pct = Math.round((dominant[1] / total) * 100);
            if (pct >= 70) {
              return (
                <div className="flex items-center gap-2 text-xs text-amber-400 border-t border-stone-900 pt-3">
                  <Flame className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <span className="capitalize font-heading">{dominant[0]}</span> inancı
                    bölgede hakimiyetini kurmuş (%{pct}). Dini Tarikat bundan güç kazanıyor.
                  </span>
                </div>
              );
            }
            return null;
          })()}
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

function StatCard({ icon: Icon, label, value, suffix = "", colorize = false, subtitle }) {
  const numVal = typeof value === "number" ? value : parseFloat(value);
  const color = !colorize ? "text-stone-100"
    : numVal >= 70 ? "text-emerald-400"
    : numVal >= 40 ? "text-amber-400"
    : "text-red-400";
  return (
    <div className="card-frame p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="label-tiny">{label}</span>
        <Icon className={`w-4 h-4 ${!colorize ? "text-orange-700" : color}`} />
      </div>
      <div className={`font-heading text-2xl ${color}`}>{value}{suffix}</div>
      {subtitle && <div className="text-[10px] text-stone-500 font-heading tracking-wider mt-0.5 uppercase">{subtitle}</div>}
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
