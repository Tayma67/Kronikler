import React, { useMemo, useState, useEffect } from "react";
import { profLabel } from "@/lib/labels";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { playSfx } from "@/lib/audio";
import { ArrowLeft, Crown, Users, Coins, ShieldCheck, TrendingUp, Package, Landmark, Star, AlertTriangle, Building2, Church, MapPin, Flame } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PageHeader, Panel, Pill, EmptyState, Coin, GoldRule } from "@/components/ui/Kit";

/* ─────────────────────────────────────────────────────────────────
   CityDetail.jsx — "Bu şehrin nabzı": KÜL & KÖZ tasarım dili.
   Vali / güvenlik / pazar üç mühür gibi öne çıkar; fiyatlar Coin ile,
   çubuklar tension-track ile. İşlevsellik birebir korunur.
   ───────────────────────────────────────────────────────────────── */

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

const KIND_SEAL = { "şehir": "🏰", "köy": "⛰️", "kale": "🏯" };

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
          <div className="flex items-center gap-2 text-sm font-display font-bold tracking-wider" style={{ color: "var(--color-gold)" }}>
            <MapPin className="w-4 h-4" />
            <span>🐎 {loc.name} Yolculuğu</span>
          </div>
          {phase === "route" && (
            <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-xs">✕</button>
          )}
        </div>

        {/* ── ROTA SEÇİMİ ── */}
        {phase === "route" && (
          <div className="space-y-2">
            <p className="font-serif italic text-xs" style={{ color: "var(--color-parchment-muted)" }}>
              Hangi yoldan gideceksin? Yol bir mekândır — her rotanın kendi hikâyesi var.
            </p>
            {!routes && (
              <div className="font-serif italic text-center text-xs py-4" style={{ color: "var(--color-parchment-muted)" }}>
                Yollar haritaya bakılıyor…
              </div>
            )}
            {routes?.map(r => (
              <button key={r.id} onClick={() => pickRoute(r.id)} disabled={busyT}
                className={`w-full text-left p-3 border rounded-sm transition-all disabled:opacity-40 ${ROUTE_STYLES[r.id] || "border-stone-700"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-sm" style={{ color: "var(--color-parchment)" }}>{r.icon} {r.label}</span>
                  <span className={`text-[9px] uppercase tracking-wider font-display ${
                    r.risk === "yüksek" ? "text-red-400" : "text-emerald-400"
                  }`}>{r.risk} risk</span>
                </div>
                <p className="font-serif italic text-[11px] text-stone-400 mt-1">{r.desc}</p>
                <p className="text-[10px] text-amber-500/80 mt-0.5">{r.perk}</p>
              </button>
            ))}
          </div>
        )}

        {/* ── YOL EVENTİ ── */}
        {phase === "event" && scene && (
          <div className="space-y-3">
            <div className="label-tiny">
              {scene.route_label} · {scene.dest_name} yolunda
              {scene.traveler && <span className="text-amber-500/80"> · {scene.traveler}</span>}
            </div>
            <p className="font-serif text-sm text-stone-200 italic border border-stone-800/60 bg-stone-900/40 rounded-sm px-3 py-2.5">
              {scene.text}
            </p>
            <div className="space-y-2">
              {scene.choices.map(c => (
                <button key={c.id} onClick={() => choose(c.id)} disabled={busyT}
                  className="w-full text-left px-3 py-2.5 border border-amber-900/40 rounded-sm hover:bg-amber-950/15 transition-all disabled:opacity-40">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-xs tracking-wider" style={{ color: "var(--color-parchment)" }}>{c.label}</span>
                    {c.test && (
                      <span className="text-[9px] text-stone-500 border border-stone-800 rounded-sm px-1.5 py-0.5">
                        🎲 {c.test}
                      </span>
                    )}
                  </div>
                  <p className="font-serif italic text-[10px] text-stone-500 mt-0.5">{c.hint}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── VARIŞ ── */}
        {phase === "done" && result && (
          <div className="space-y-3">
            <div className="text-center space-y-1">
              <div className="text-2xl" style={{ filter: "drop-shadow(0 0 10px rgba(201,168,76,0.4))" }}>🏰</div>
              <div className="font-display font-bold text-lg tracking-widest" style={{ color: "var(--color-gold)", textShadow: "0 0 14px rgba(201,168,76,0.3)" }}>
                {result.result?.dest_name?.toUpperCase()}'E VARDIN
              </div>
            </div>
            {result.result?.effects?.map((t, i) => (
              <p key={i} className="font-serif italic text-xs text-stone-300 border border-stone-800/60 bg-stone-900/40 rounded-sm px-3 py-2">
                {t}
              </p>
            ))}
            {result.enforcement && (
              <p className="text-xs text-red-400 border border-red-900/40 bg-red-950/10 rounded-sm px-3 py-2">
                {result.enforcement.by} seni karşıladı: {result.enforcement.fine} altın ceza.
              </p>
            )}
            <button onClick={() => onDone(result)}
              className="w-full btn-ember py-2 text-xs font-display tracking-widest">
              🏰 ŞEHRE GİR
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
      <div className="page-shell rise-in">
        <EmptyState icon="🗺️"
          title="Bu konum haritada bulunamadı."
          sub="Yol kaybolmuş olabilir — diyara geri dön." />
        <div style={{ textAlign: "center" }}>
          <Link to="/oyun" className="font-display text-xs tracking-widest" style={{ color: "var(--color-gold)" }}>← Geri dön</Link>
        </div>
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

  const year = 1247 + Math.floor((state?.turn || 0) / 12);

  return (
    <div className="page-shell rise-in space-y-5">
      {travelOpen && (
        <TravelModal
          loc={loc}
          onDone={onTravelDone}
          onClose={() => setTravelOpen(false)}
        />
      )}
      <button onClick={() => navigate("/oyun/harita")}
        className="font-display flex items-center gap-2 text-xs tracking-widest uppercase"
        style={{ color: "var(--color-parchment-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        data-testid="city-back">
        <ArrowLeft className="w-4 h-4" /> Diyar Haritasına Dön
      </button>

      <PageHeader
        kicker={`${loc.kind} · ${kingdom?.name || "Serbest Topraklar"} · Yıl ${year}`}
        icon={KIND_SEAL[loc.kind] || "🏰"}
        title={loc.name}
        sub="Bu şehrin nabzı sokaklarında atar — pazarını dinle, valisini tanı, kapısını bil."
        right={isHere ? (
          <Pill tone="sage">◆ Buradasın</Pill>
        ) : (
          <button onClick={() => { playSfx("click"); travel(); }} disabled={busy} data-testid="city-travel"
            className="btn-ember px-4 py-2 text-xs font-display tracking-widest disabled:opacity-50">
            🐎 YOLA ÇIK{loc.travel_days ? ` (${loc.travel_days} GÜN)` : ""}
          </button>
        )}
      />

      {/* ── Şehrin mühürleri: dört nişan ── */}
      <div className="grid gap-3 grid-cols-2">
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

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Pazar mührü ── */}
        <Panel title="Pazar Fiyatları" icon="⚖" tone="gold"
          right={<span className="label-tiny">Altın / Birim</span>}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800">
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
                      <td className="py-2 font-serif text-stone-200 capitalize">
                        {g}
                        {isHere && <span className="text-stone-600 text-[10px] ml-1.5">{isActive ? "▲" : "▼"}</span>}
                      </td>
                      <td className={`py-2 text-right font-display ${cls}`}>{m.supply}</td>
                      <td className="py-2 text-right font-display text-stone-400">{m.demand}</td>
                      <td className="py-2 text-right"><Coin value={m.price} size="0.78rem" /></td>
                    </tr>
                    {isActive && isHere && (
                      <tr className="bg-stone-900/40">
                        <td colSpan={4} className="px-2 py-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center border border-stone-700 rounded-sm overflow-hidden">
                              <button
                                onClick={(e) => { e.stopPropagation(); setTradeQty(q => Math.max(1, q - 1)); }}
                                className="text-stone-400 hover:text-stone-200 hover:bg-stone-800 font-display flex items-center justify-center"
                                style={{ minWidth: 40, minHeight: 40, fontSize: "1.15rem", lineHeight: 1 }}
                                aria-label="azalt"
                              >−</button>
                              <span className="font-display text-stone-200 text-center flex items-center justify-center"
                                style={{ minWidth: "2.5rem", minHeight: 40, fontSize: "0.95rem" }}>{tradeQty}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setTradeQty(q => q + 1); }}
                                className="text-stone-400 hover:text-stone-200 hover:bg-stone-800 font-display flex items-center justify-center"
                                style={{ minWidth: 40, minHeight: 40, fontSize: "1.15rem", lineHeight: 1 }}
                                aria-label="artır"
                              >+</button>
                            </div>
                            <span className="text-xs text-stone-500">= <Coin value={tradeQty * m.price} size="0.72rem" /></span>
                            <button
                              onClick={(e) => { e.stopPropagation(); trade("al"); }}
                              disabled={busy}
                              className="btn-ember px-4 text-[11px] font-display tracking-wider disabled:opacity-50"
                              style={{ minHeight: 40 }}
                            >
                              SATIN AL
                            </button>
                            {invQty > 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); trade("sat"); }}
                                disabled={busy}
                                className="btn-ghost-ash px-4 text-[11px] font-display tracking-wider disabled:opacity-50"
                                style={{ minHeight: 40 }}
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
        </Panel>

        {/* ── Sakinler ── */}
        <Panel title="Önemli Sakinler" icon="🏘" tone="ink"
          right={<Pill tone="ash">{sortedNpcs.length} kişi</Pill>}>
          <ul className="space-y-1.5">
            {sortedNpcs.map((n) => {
              const relScore = state.relationships?.[n.id];
              const relColor = relScore == null ? null
                : relScore >= 50  ? "text-emerald-400"
                : relScore >= 20  ? "text-emerald-600"
                : relScore >= -19 ? "text-stone-500"
                : relScore >= -49 ? "text-red-500"
                : "text-red-400";
              return (
                <li key={n.id} className="row-frame flex items-center justify-between text-sm">
                  <Link to={`/oyun/npc/${n.id}`} className="flex items-center gap-2 min-w-0 font-serif"
                    style={{ color: "var(--color-parchment)" }} data-testid={`city-npc-${n.id}`}>
                    {n.profession === "kral" && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    <span className="truncate">{n.name}</span>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    {relScore != null && (
                      <span className={`font-display font-bold ${relColor}`}>
                        {relScore > 0 ? `+${relScore}` : relScore}
                      </span>
                    )}
                    <span className="label-tiny">{profLabel(n.profession)}</span>
                  </div>
                </li>
              );
            })}
            {sortedNpcs.length === 0 && (
              <li>
                <EmptyState icon="🕯" title="Bu konumda hayat eseri görünmüyor."
                  sub="Sokaklar boş, ocaklar sönmüş." />
              </li>
            )}
          </ul>
        </Panel>
      </div>

      {/* ── Vali mührü: Şehir Yönetimi ── */}
      {governance && (
        <Panel title="Şehir Yönetimi" icon="🏛" tone="ember"
          right={governance.governor_id === "PLAYER" && (
            <Pill tone="gold">👑 Sen Yönetiyorsun</Pill>
          )}>
          <div className="space-y-4">
            {/* Yönetici */}
            <div className="row-frame flex items-center justify-between text-sm">
              <span className="label-tiny">Vali</span>
              <span className="font-display font-bold flex items-center gap-1.5" style={{ color: "var(--color-parchment)" }}>
                {governance.governor_id === "PLAYER" ? (
                  <><Crown className="w-3.5 h-3.5 text-amber-400" /> {player.name}</>
                ) : governance.governor_name ? (
                  <><Crown className="w-3.5 h-3.5 text-stone-500" /> {governance.governor_name}</>
                ) : (
                  <span className="font-serif italic text-stone-600">Makam boş</span>
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
                <div className="font-display font-bold text-lg" style={{ color: "var(--color-gold)" }}>%{governance.tax_rate}</div>
              </div>
              <div className="card-frame p-2.5 text-center">
                <div className="label-tiny mb-0.5">Hazine</div>
                <div className="text-lg"><Coin value={governance.treasury} size="1.05rem" /></div>
              </div>
            </div>

            {/* Aktif Faction Nüfuzları */}
            {governance.faction_influence && Object.keys(governance.faction_influence).length > 0 && (
              <div className="space-y-2">
                <GoldRule label="Örgüt Nüfuzları" />
                {Object.entries(governance.faction_influence)
                  .sort(([, a], [, b]) => b - a)
                  .map(([fId, val]) => {
                    const fName = governance.faction_names?.[fId] || fId.slice(0, 16);
                    const barCol = val >= 75 ? "bg-amber-500" : val >= 50 ? "bg-sky-600" : "bg-stone-600";
                    return (
                      <div key={fId} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-serif text-stone-400">{fName}</span>
                          <span className="font-display text-stone-500">{val}/100</span>
                        </div>
                        <div className="tension-track">
                          <div className={`h-full ${barCol}`} style={{ width: `${val}%`, borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Gizli kontrol uyarısı */}
            {governance.controlled_by_faction && !governance.control_is_secret && (
              <div className="flex items-center gap-2 text-xs font-serif italic text-amber-400">
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
                  className="btn-ember px-4 py-2 text-xs font-display tracking-wider"
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
                    className="bg-stone-950 border border-stone-800 px-2 py-1.5 text-sm w-20 rounded-sm font-display"
                  />
                  <button
                    onClick={handlePayTax}
                    disabled={busy}
                    className="btn-ghost-ash px-3 py-1.5 text-xs font-display tracking-wider"
                  >
                    <Coins className="w-3.5 h-3.5 inline mr-1" /> Vergi Öde
                  </button>
                </div>
              )}
            </div>
          </div>
        </Panel>
      )}

      {/* ── Yerleşim & Altyapı ── */}
      {region && (
        <Panel title="Yerleşim & Altyapı" icon="🏗" tone="ash"
          right={
            <span className="text-xl" title={ALTYAPI_LABEL[region.altyapi_seviyesi]}>
              {ALTYAPI_ICON[region.altyapi_seviyesi] || "🏕️"}
            </span>
          }>
          <div className="space-y-4">
            {/* Seviye göstergesi */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="font-display font-bold tracking-wide" style={{ color: "var(--color-parchment)" }}>
                  {ALTYAPI_LABEL[region.altyapi_seviyesi] || `Seviye ${region.altyapi_seviyesi}`}
                </span>
                <span className="label-tiny">
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
              <div className="flex justify-between text-[10px] text-stone-600 font-display tracking-wider">
                <span>MEZRA</span>
                <span>KÖY</span>
                <span>KASABA</span>
                <span>ŞEHİR</span>
                <span>BÜYÜK ŞEHİR</span>
              </div>
            </div>

            {/* Nüfus ve gelir çarpanı — 2 kolonu geçme */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="card-frame p-2.5 text-center">
                <div className="label-tiny mb-0.5">Nüfus</div>
                <div className="font-display font-bold text-base" style={{ color: "var(--color-parchment)" }}>
                  {region.nufus?.toLocaleString() || "—"}
                </div>
                {region.nufus_max && (
                  <div className="text-[10px] text-stone-600 mt-0.5">
                    / {region.nufus_max.toLocaleString()} azami
                  </div>
                )}
              </div>
              <div className="card-frame p-2.5 text-center">
                <div className="label-tiny mb-0.5">Gelir Çarpanı</div>
                <div className={`font-display font-bold text-base ${
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
                <div className="font-display font-bold text-base" style={{ color: "var(--color-parchment)" }}>
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
            <div className="font-serif italic text-xs text-stone-500 border-t border-stone-900 pt-3">
              <span className="text-stone-400">Sonraki seviye </span>
              {region.altyapi_seviyesi < 5
                ? <>({ALTYAPI_LABEL[region.altyapi_seviyesi + 1]}) için bölgedeki örgütlerin bölgeyi yatırım yapması gerekiyor.</>
                : <span className="text-amber-600">Maksimum seviyeye ulaşıldı.</span>
              }
            </div>
          </div>
        </Panel>
      )}

      {/* ── İnanç Dağılımı ── */}
      {region?.inanc_dagilimi && Object.keys(region.inanc_dagilimi).length > 0 && (
        <Panel title="İnanç Haritası" icon="🕯" tone="ink">
          <div className="space-y-4">
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
                        <span className={`font-serif capitalize ${textColor}`}>{inanc}</span>
                        <span className="font-display text-stone-500">{pct}%</span>
                      </div>
                      <div className="tension-track" style={{ height: 6 }}>
                        <div
                          className={`h-full ${barColor} transition-all`}
                          style={{ width: `${Math.min(100, pct)}%`, borderRadius: 2 }}
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
                  <div className="flex items-center gap-2 text-xs font-serif italic text-amber-400 border-t border-stone-900 pt-3">
                    <Flame className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      <span className="capitalize font-display">{dominant[0]}</span> inancı
                      bölgede hakimiyetini kurmuş (%{pct}). Dini Tarikat bundan güç kazanıyor.
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </Panel>
      )}

      {/* Fiyat Geçmişi Grafiği */}
      {loc.price_history && loc.price_history.length >= 2 && (
        <Panel title="Pazar Fiyat Geçmişi" icon="📜" tone="sage"
          right={
            <span className="label-tiny">
              SON {loc.price_history.length} ÖLÇÜM
            </span>
          }>
          <p className="font-serif italic text-xs text-stone-600 mb-4">Dört ayda bir düşülen kayıt · Buğday referans fiyatı</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={loc.price_history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="turn"
                tick={{ fontSize: 10, fill: "#7A6A4F" }}
                tickFormatter={(v) => `${1247 + Math.floor(v / 12)}`}
                stroke="#4A3820"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#7A6A4F" }}
                stroke="#4A3820"
                tickFormatter={(v) => `${v}⚜`}
              />
              <Tooltip
                contentStyle={{ background: "#15110A", border: "1px solid #4A3820", fontSize: 11, borderRadius: 6, color: "#E8D5B0" }}
                labelFormatter={(v) => `${1247 + Math.floor(v / 12)} yılı`}
                formatter={(val, name) => [`${Number(val).toFixed(1)} ⚜`, name]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(val) => <span style={{ color: "#B8A880" }}>{val}</span>}
              />
              {[
                ["buğday", "#C9A84C"],
                ["ekmek",  "#D98C40"],
                ["et",     "#C84040"],
                ["demir",  "#8A94A8"],
                ["odun",   "#7A6A4F"],
                ["kumaş",  "#7B4FAF"],
                ["silah",  "#E05A30"],
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
        </Panel>
      )}

      {/* Kervan Geçişleri */}
      {loc.caravan_log && loc.caravan_log.length > 0 && (
        <Panel title="Son Kervan Geçişleri" icon="🐪" tone="gold">
          <ul className="space-y-1.5">
            {[...loc.caravan_log].reverse().map((c, i) => (
              <li key={i} className="row-frame flex items-center justify-between text-sm">
                <div className="flex items-center gap-2" style={{ color: "var(--color-parchment-dim)" }}>
                  <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="font-serif">{c.npc_name}</span>
                  <span className="label-tiny">tüccar</span>
                </div>
                <span className="font-display text-[10px] text-stone-600">T{c.day}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

/* ── Mühür kartı: şehrin dört nişanı ───────────────────────────── */
function StatCard({ icon: Icon, label, value, suffix = "", colorize = false, subtitle }) {
  const numVal = typeof value === "number" ? value : parseFloat(value);
  const color = !colorize ? "text-stone-100"
    : numVal >= 70 ? "text-emerald-400"
    : numVal >= 40 ? "text-amber-400"
    : "text-red-400";
  const pct = colorize && !Number.isNaN(numVal) ? Math.max(0, Math.min(100, numVal)) : null;
  return (
    <div className="card-frame p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="label-tiny">{label}</span>
        <Icon className={`w-4 h-4 ${!colorize ? "text-orange-700" : color}`} />
      </div>
      <div className={`font-display font-bold text-2xl ${color}`}
        style={{ textShadow: "0 0 12px rgba(201,168,76,0.15)" }}>
        {value}{suffix}
      </div>
      {pct != null && (
        <div className="tension-track" style={{ marginTop: 6 }}>
          <div className="tension-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
      {subtitle && <div className="text-[10px] text-stone-500 font-display tracking-wider mt-1 uppercase">{subtitle}</div>}
    </div>
  );
}

function GovBar({ label, value, color = "bg-emerald-700" }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="label-tiny">{label}</span>
        <span className="font-display text-stone-400">{value}/100</span>
      </div>
      <div className="tension-track" style={{ height: 6 }}>
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%`, borderRadius: 2 }} />
      </div>
    </div>
  );
}
