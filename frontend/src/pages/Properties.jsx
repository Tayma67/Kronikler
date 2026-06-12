/**
 * Mülkler — KÜL & KÖZ.
 * Duygu görevi: "Toprağım büyüyor" — her kart bir tapu senedi gibi.
 * İşlevsellik (API çağrıları, hook akışı, data-testid'ler) birebir korunur.
 */
import { useEffect, useState, useCallback } from "react";
import { profLabel } from "@/lib/labels";
import { useGame } from "@/lib/GameContext";
import { api, extractErrorMessage } from "@/lib/api";
import { useActionRedirect } from "@/hooks/useActionRedirect";
import { playSfx } from "@/lib/audio";
import { toast } from "sonner";
import { PageHeader, Panel, Pill, GoldRule, EmptyState, Coin, TONES } from "@/components/ui/Kit";

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

/* Seçilebilir küçük buton — config kontrolleri için ortak stil */
const optBtn = (active) => ({
  padding: "0.22rem 0.55rem", borderRadius: "4px", cursor: "pointer",
  fontFamily: "Cinzel, serif", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.08em",
  border: `1px solid ${active ? "rgba(201,168,76,0.55)" : "rgba(122,106,79,0.4)"}`,
  background: active ? "rgba(201,168,76,0.1)" : "transparent",
  color: active ? "var(--color-gold)" : "var(--color-parchment-muted)",
  transition: "all 0.15s",
});

/* ── Kondisyon çubuğu ─────────────────────────────────────────────── */
function ConditionBar({ value }) {
  const t = value > 60 ? TONES.sage : value > 30 ? TONES.gold : TONES.blood;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span className="label-tiny" style={{ flexShrink: 0 }}>Bakım</span>
      <div style={{ flex: 1, height: "5px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${value}%`, borderRadius: "2px",
          background: `linear-gradient(to right, ${t.text}99, ${t.text})`,
          boxShadow: `0 0 6px ${t.text}55`, transition: "width 0.5s ease",
        }} />
      </div>
      <span className="font-display" style={{ fontSize: "0.58rem", fontWeight: 700, color: t.text, flexShrink: 0 }}>
        %{value}
      </span>
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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="label-tiny">
          👥 İşçiler {prop.workers.length}/{prop.max_workers}
        </span>
        {prop.workers.length < prop.max_workers && (
          <button onClick={() => setOpen(!open)}
            className="font-display"
            style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "var(--color-gold)",
            }}>
            ＋ Tut
          </button>
        )}
      </div>
      {prop.workers.map((w) => (
        <div key={w.id} className="row-frame" style={{ padding: "0.35rem 0.6rem", justifyContent: "space-between" }}>
          <span className="font-serif" style={{ fontSize: "0.78rem", color: "var(--color-parchment)" }}>
            {w.name}
            <span style={{ color: "var(--color-parchment-muted)", marginLeft: "0.3rem", fontSize: "0.68rem" }}>
              ({profLabel(w.profession)} · ×{w.productivity})
            </span>
          </span>
          <button disabled={busy} onClick={() => onFire(prop.id, w.id)}
            style={{
              background: "none", border: "none", padding: "0 0.2rem", cursor: "pointer",
              color: "rgba(200,64,64,0.7)", fontSize: "0.75rem",
            }}>
            ✕
          </button>
        </div>
      ))}
      {open && (
        <div style={{
          border: "1px solid var(--color-border)", borderRadius: "6px", padding: "0.45rem",
          display: "flex", flexDirection: "column", gap: "0.2rem",
          maxHeight: "10rem", overflowY: "auto", background: "rgba(10,7,4,0.45)",
        }}>
          {candidates.length === 0 && (
            <p className="font-serif" style={{ fontSize: "0.7rem", fontStyle: "italic", color: "var(--color-parchment-muted)", margin: 0 }}>
              Bu yerleşimde uygun işçi yok.
            </p>
          )}
          {candidates.map((n) => (
            <button key={n.id} disabled={busy}
              onClick={() => { onHire(prop.id, n.id); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.3rem 0.5rem", borderRadius: "4px", border: "none", cursor: "pointer",
                background: "transparent", textAlign: "left",
              }}>
              <span className="font-serif" style={{ fontSize: "0.78rem", color: "var(--color-parchment)" }}>{n.name}</span>
              <span className="label-tiny">{profLabel(n.profession)}</span>
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
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
        <span className="label-tiny">Ekin:</span>
        {(catalog?.crops || ["buğday", "üzüm"]).map((c) => (
          <button key={c} disabled={busy}
            onClick={() => onConfigure(prop.id, { crop: c })}
            style={optBtn(prop.config.crop === c)}>
            {gl(c)}
          </button>
        ))}
      </div>
    );
  }
  if (prop.type === "dükkân") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          <span className="label-tiny">Stok:</span>
          <select
            value={prop.config.stock_good}
            disabled={busy}
            onChange={(e) => onConfigure(prop.id, { stock_good: e.target.value })}
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem" }}>
            {Object.keys(GOOD_LABELS).map((g) => (
              <option key={g} value={g}>{gl(g)}</option>
            ))}
          </select>
          <span className="label-tiny">Marj:</span>
          {[0.15, 0.25, 0.4].map((m) => (
            <button key={m} disabled={busy}
              onClick={() => onConfigure(prop.id, { margin: m })}
              style={optBtn(Math.abs(prop.config.margin - m) < 0.01)}>
              %{Math.round(m * 100)}
            </button>
          ))}
        </div>
        <p className="font-serif" style={{ fontSize: "0.66rem", fontStyle: "italic", color: "var(--color-parchment-muted)", margin: 0 }}>
          Yüksek marj az ama kârlı satış; düşük marj çok ama cüzi satış demektir.
        </p>
      </div>
    );
  }
  if (prop.type === "işlik") {
    const options = catalog?.recipe_options || [];
    const current = `${prop.config.recipe_prof}:${prop.config.recipe_id}`;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
        <span className="label-tiny">Ürün hattı:</span>
        <select
          value={current}
          disabled={busy}
          onChange={(e) => {
            const [rp, rid] = e.target.value.split(":");
            onConfigure(prop.id, { recipe_prof: rp, recipe_id: rid });
          }}
          style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem", maxWidth: "100%" }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
        <span className="label-tiny">Oda:</span>
        {[3, 5, 8, 12].map((p) => (
          <button key={p} disabled={busy}
            onClick={() => onConfigure(prop.id, { room_price: p })}
            style={optBtn(prop.config.room_price === p)}>
            {p}⚜
          </button>
        ))}
        <span className="label-tiny" style={{ marginLeft: "0.2rem" }}>Muhafız:</span>
        {[0, 1, 2].map((g) => (
          <button key={g} disabled={busy}
            onClick={() => onConfigure(prop.id, { guards: g })}
            style={optBtn(prop.config.guards === g)}>
            {g}
          </button>
        ))}
      </div>
    );
  }
  if (prop.type === "ev") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <span className="font-serif" style={{ fontSize: "0.78rem", fontStyle: "italic", color: "var(--color-parchment-dim)" }}>
          {prop.tier_label}
        </span>
        {prop.next_tier && (
          <button disabled={busy}
            onClick={() => onConfigure(prop.id, null, true)}
            className="font-display"
            style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              padding: "0.3rem 0.6rem", borderRadius: "4px", cursor: "pointer",
              fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.1em",
              border: "1px solid rgba(201,168,76,0.5)", background: "rgba(201,168,76,0.08)",
              color: "var(--color-gold)",
            }}>
            ↑ {prop.next_tier.label} (<Coin value={prop.next_tier.cost} size="0.62rem" />)
          </button>
        )}
      </div>
    );
  }
  return null;
}

/* ── Mülk kartı — tapu senedi ─────────────────────────────────────── */
function PropertyCard({ prop, catalog, npcs, busy, onConfigure, onHire, onFire, onHarvest, onSell }) {
  const [showLedger, setShowLedger] = useState(false);
  const profit = prop.total_profit || 0;
  return (
    <div className="card-frame"
      data-testid={`property-card-${prop.type}`}
      style={{ padding: "0.85rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {/* Tapu başlığı */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", minWidth: 0 }}>
          <span style={{ fontSize: "1.4rem", flexShrink: 0, filter: "drop-shadow(0 0 8px rgba(201,168,76,0.3))" }}>
            {prop.icon}
          </span>
          <div style={{ minWidth: 0 }}>
            <h3 className="font-display" style={{
              fontSize: "0.85rem", fontWeight: 700, color: "var(--color-parchment)",
              margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              textShadow: "0 0 10px rgba(201,168,76,0.15)",
            }}>
              {prop.name}
            </h3>
            <p className="font-serif" style={{
              fontSize: "0.68rem", fontStyle: "italic", color: "var(--color-parchment-muted)", margin: 0,
            }}>
              {prop.location_name} · bakım <Coin value={prop.maintenance} size="0.62rem" />/ay
            </p>
          </div>
        </div>
        <Pill tone={profit >= 0 ? "sage" : "blood"}>
          {profit >= 0 ? "▲ +" : "▼ "}{Math.round(profit)} ⚜
        </Pill>
      </div>

      <GoldRule />

      <ConditionBar value={prop.condition} />
      <ConfigSection prop={prop} catalog={catalog} onConfigure={onConfigure} busy={busy} />

      {prop.type === "tarla" && prop.pending_harvest > 0 && (
        <button disabled={busy} onClick={() => onHarvest(prop.id)}
          className="btn-ember font-display"
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            gap: "0.4rem", padding: "0.5rem 0", fontSize: "0.66rem",
          }}>
          🌾 Hasadı Topla ({prop.pending_harvest} {gl(prop.config.crop)})
        </button>
      )}

      {/* GDD v8 D3: defter eksideyken oyuncu 'zarar' sanmasın — toprakta
          büyüyen değer görünür olsun */}
      {prop.type === "tarla" && prop.bekleyen_hasat_degeri > 0 && prop.pending_harvest <= 0 && (
        <div className="row-frame" style={{
          padding: "0.4rem 0.6rem",
          border: "1px solid rgba(74,154,90,0.35)", background: "rgba(74,154,90,0.06)",
        }}>
          <span style={{ fontSize: "0.85rem" }}>🌱</span>
          <span className="font-serif" style={{ fontSize: "0.72rem", fontStyle: "italic", color: "#6FBF7F" }}>
            Toprakta büyüyen: ~<Coin value={prop.bekleyen_hasat_degeri} size="0.7rem" /> değerinde ekin
          </span>
        </div>
      )}

      {prop.type !== "ev" && (
        <WorkerSection prop={prop} npcs={npcs} onHire={onHire} onFire={onFire} busy={busy} />
      )}

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: "0.4rem", borderTop: "1px solid var(--color-border)",
      }}>
        <button onClick={() => setShowLedger(!showLedger)}
          className="font-display"
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--color-parchment-muted)", display: "flex", alignItems: "center", gap: "0.25rem",
          }}>
          📜 Defter {showLedger ? "▲" : "▼"}
        </button>
        <button disabled={busy} onClick={() => onSell(prop)}
          className="font-display"
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
            color: "rgba(200,64,64,0.8)",
          }}>
          Sat ({prop.sale_value} ⚜)
        </button>
      </div>
      {showLedger && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", maxHeight: "8rem", overflowY: "auto" }}>
          {prop.ledger.length === 0 && (
            <p className="font-serif" style={{ fontSize: "0.68rem", fontStyle: "italic", color: "var(--color-parchment-muted)", margin: 0 }}>
              Deftere henüz mürekkep değmedi.
            </p>
          )}
          {prop.ledger.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="font-serif" style={{ fontSize: "0.68rem", color: "var(--color-parchment-muted)" }}>
                T{l.day} · {l.kind}{l.note ? ` · ${l.note}` : ""}
              </span>
              <span className="font-display" style={{
                fontSize: "0.62rem", fontWeight: 700,
                color: l.amount >= 0 ? "rgba(111,191,127,0.85)" : "rgba(200,64,64,0.85)",
              }}>
                {l.amount >= 0 ? "+" : ""}{l.amount} ⚜
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
    <Panel title={`Tapu Dairesi — ${catalog.location}`} icon="🪶" tone="gold">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.6rem" }}>
        {catalog.types.map((t) => {
          const affordable = money >= t.cost;
          return (
            <div key={t.type} className="row-frame" style={{
              flexDirection: "column", alignItems: "stretch", gap: "0.4rem", padding: "0.7rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="font-display" style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-parchment)" }}>
                  {t.icon} {t.label}
                </span>
                <span style={{ opacity: affordable ? 1 : 0.45 }}>
                  <Coin value={t.cost} />
                </span>
              </div>
              <p className="font-serif" style={{
                fontSize: "0.7rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
                lineHeight: 1.5, margin: 0,
              }}>
                {t.desc}
              </p>
              {!t.eligible ? (
                <p className="font-serif" style={{ fontSize: "0.68rem", fontStyle: "italic", color: "rgba(200,64,64,0.8)", margin: 0 }}>
                  En az {t.min_age} yaş gerekli.
                </p>
              ) : (
                <button disabled={busy || !affordable}
                  onClick={() => onBuy(t.type)}
                  className={affordable ? "btn-ember" : "btn-ghost-ash"}
                  style={{ width: "100%", padding: "0.45rem 0", fontSize: "0.62rem" }}>
                  Senedi İmzala
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
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
      playSfx("click");
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onBuy = (type) =>
    withRedirect(async () => {
      const { data } = await api.post("/property/buy", { type });
      playSfx("coin");
      toast.success("Mülk satın alındı!");
      return data;
    }).catch((e) => toast.error(extractErrorMessage(e)));

  const onSell = (prop) => {
    if (!window.confirm(`${prop.name} ${prop.sale_value} altına satılsın mı?`)) return;
    withRedirect(async () => {
      const { data } = await api.post("/property/sell", { property_id: prop.id });
      playSfx("coin");
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
      playSfx("success");
      toast.success("Hasat toplandı!");
      return data;
    }).catch((e) => toast.error(extractErrorMessage(e)));

  const npcs = state?.world?.npcs || [];

  if (properties === null) {
    return (
      <div className="page-shell rise-in">
        <EmptyState icon="📜" title="Tapular sandıktan çıkarılıyor…" sub="Kayıtlar mühürleniyor, bir nefes bekle." />
      </div>
    );
  }

  return (
    <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }} data-testid="properties-page">
      <PageHeader
        kicker="Toprak & Taş"
        icon="🏰"
        title="Mülklerim"
        sub="Adının yazdığı her tapu, çocuklarına kalacak bir hikâyedir."
        right={
          <div style={{ textAlign: "right" }}>
            <div className="label-tiny" style={{ marginBottom: "0.1rem" }}>Kese</div>
            <Coin value={Math.round(money)} size="1rem" />
          </div>
        }
      />

      {properties.length === 0 ? (
        <Panel title="Tapu Sandığı" icon="🗝" tone="ash">
          <EmptyState
            icon="🏚"
            title="Henüz adına yazılı bir karış toprak yok."
            sub="Tarladan başla — 800 akçe civarı. Hasat, dükkân ve atölyelerle servetini büyüt."
          />
        </Panel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {properties.map((p) => (
            <PropertyCard key={p.id} prop={p} catalog={catalog} npcs={npcs} busy={busy}
              onConfigure={onConfigure} onHire={onHire} onFire={onFire}
              onHarvest={onHarvest} onSell={onSell} />
          ))}
        </div>
      )}

      <GoldRule label="Yeni Senet" />

      <Catalog catalog={catalog} money={money} busy={busy} onBuy={onBuy} />
    </div>
  );
}
