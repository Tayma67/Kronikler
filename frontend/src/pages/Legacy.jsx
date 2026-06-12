/**
 * Hanedan — KÜL & KÖZ görsel yeniden tasarım.
 * Duygu görevi: "Soyumun mührü." — hanedan puanı ve vasiyet ağır,
 * törensel; altın mühür havası, GoldRule ayraçlar, ağır Cinzel başlıklar.
 * İşlevsellik (API çağrıları, koşullar, data-testid) birebir korunur.
 */
import { useEffect, useState, useCallback } from "react";
import { api, extractErrorMessage } from "@/lib/api";
import { useGame } from "@/lib/GameContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { playSfx } from "@/lib/audio";
import { PageHeader, Panel, Pill, GoldRule, Coin, ConfirmModal } from "@/components/ui/Kit";

const WILL_STYLES = [
  { id: "eşit", label: "Eşit Pay", desc: "Her çocuğa eşit; küslük çıkmaz. (%60 para mirası)" },
  { id: "tek_varis", label: "Tek Varis", desc: "Servet bölünmez ama kardeşler küser. (%75)" },
  { id: "hayır", label: "Hayır İşleri", desc: "Adın dualarla anılır: +15 itibar yeni nesle. (%40)" },
];

const THRONE_LABELS = { age: "Yaş", reputation: "İtibar", fame: "Ün", money: "Altın" };

export default function Legacy() {
  const { setState, setLastActionPage } = useGame();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [settlementName, setSettlementName] = useState("");
  const [confirm, setConfirm] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/legacy/overview");
      setData(data);
    } catch (e) {
      toast.error(extractErrorMessage(e));
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const act = async (fn, msg) => {
    setBusy(true);
    try {
      const res = await fn();
      if (msg) toast.success(msg);
      if (res?.state) setState(res.state);
      await refresh();
      return res;
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="page-shell" style={{ textAlign: "center", padding: "5rem 1rem" }}>
        <div className="ember-flicker" style={{ fontSize: "1.6rem", marginBottom: "0.6rem" }}>👑</div>
        <p className="font-serif" style={{
          fontStyle: "italic", fontSize: "0.85rem", color: "var(--color-parchment-muted)",
        }}>
          Mühür sandığı açılıyor…
        </p>
      </div>
    );
  }

  const throneReqs = Object.entries(data.throne).filter(([k]) => k !== "already_king");
  const throneReady = throneReqs.every(([, v]) => v.ok);

  return (
    <div className="page-shell rise-in" data-testid="legacy-page" style={{ padding: "0 0 1.5rem" }}>
      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
      <PageHeader
        kicker="Soyumun Mührü"
        icon="👑"
        title="Hanedan"
        sub="Bir ad bırak ki taş kitabelerde yaşasın, dualarda anılsın."
      />

      {/* ── Hanedan mührü ── */}
      <div className="card-frame" style={{
        padding: "1.5rem 1rem 1.25rem", textAlign: "center",
        border: "1px solid rgba(201,168,76,0.4)",
        boxShadow: "0 0 22px rgba(201,168,76,0.10), inset 0 1px 0 rgba(201,168,76,0.15)",
      }}>
        <div className="label-tiny" style={{ letterSpacing: "0.3em", color: "var(--color-gold-dim)" }}>
          Hanedan Mührü
        </div>
        <div className="font-display" style={{
          fontSize: "2.6rem", fontWeight: 900, lineHeight: 1.1, marginTop: "0.3rem",
          color: "var(--color-gold)",
          textShadow: "0 0 18px rgba(201,168,76,0.45), 0 2px 8px rgba(0,0,0,0.6)",
        }}>
          {data.dynasty.score}
        </div>
        <div className="font-serif" style={{
          fontStyle: "italic", fontSize: "0.9rem", color: "var(--color-parchment)",
          marginTop: "0.2rem",
        }}>
          {data.dynasty.title}
        </div>
        <div style={{ marginTop: "0.5rem" }}>
          <Pill tone="gold">{data.dynasty.generation}. Nesil</Pill>
        </div>
        {data.dynasty.log.length > 0 && (
          <div style={{ textAlign: "left" }}>
            <GoldRule label="Mühre İşlenenler" />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {data.dynasty.log.slice(0, 5).map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem" }}>
                  <span className="font-serif" style={{
                    fontSize: "0.74rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
                  }}>
                    {l.reason}
                  </span>
                  <span className="font-display" style={{
                    fontSize: "0.7rem", fontWeight: 700, flexShrink: 0,
                    color: l.pts > 0 ? "#4A9A5A" : "#C84040",
                  }}>
                    {l.pts > 0 ? "+" : ""}{l.pts}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ height: "0.75rem" }} />

      {/* ── Eş ilişkisi ── */}
      {data.spouse && (
        <>
          <Panel title="Evlilik" icon="❤" tone="blood">
            <div className="row-frame" style={{ justifyContent: "space-between" }}>
              <span className="font-serif" style={{
                fontSize: "0.9rem", fontWeight: 600, color: "var(--color-parchment)",
              }}>
                {data.spouse.name}
              </span>
              <Pill tone={data.spouse.relationship > 40 ? "sage"
                : data.spouse.relationship > 20 ? "gold" : "blood"}>
                İlişki: {data.spouse.relationship}
              </Pill>
            </div>
            {data.spouse.relationship <= 25 && (
              <p className="font-serif" style={{
                marginTop: "0.5rem", fontSize: "0.74rem", fontStyle: "italic", color: "#C84040",
              }}>
                ⚠ Evlilik soğuyor — iltifat et, hediye ver, vakit geçir.
              </p>
            )}
          </Panel>
          <div style={{ height: "0.75rem" }} />
        </>
      )}

      {/* ── Çocuk yatırımları ── */}
      {data.children.length > 0 && (
        <>
          <Panel title="Çocuk Eğitimi" icon="🎓" tone="sage">
            <p className="font-serif" style={{
              fontSize: "0.74rem", fontStyle: "italic",
              color: "var(--color-parchment-muted)", marginBottom: "0.6rem",
            }}>
              Eğitim yönü seç; aylık masraf işler, nesil geçişinde başlangıç bonusu olur.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {data.children.map((c) => (
                <div key={c.id} className="row-frame" style={{
                  flexDirection: "column", alignItems: "stretch", gap: "0.45rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    <span className="font-display" style={{
                      fontSize: "0.8rem", fontWeight: 700, color: "var(--color-parchment)",
                      display: "flex", alignItems: "center", gap: "0.35rem",
                    }}>
                      <span style={{ fontSize: "0.85rem" }}>👶</span> {c.name} ({c.age})
                    </span>
                    {c.track && (
                      <Pill tone="sage">{data.tracks[c.track]?.label} · {c.weeks} ay</Pill>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                    {Object.entries(data.tracks).map(([key, t]) => (
                      <button key={key} disabled={busy}
                        onClick={() => act(async () =>
                          (await api.post("/legacy/child-invest",
                            { child_id: c.id, track: c.track === key ? null : key })).data)}
                        className="font-display"
                        style={{
                          padding: "0.25rem 0.55rem", borderRadius: "4px", cursor: "pointer",
                          fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          border: c.track === key
                            ? "1px solid rgba(74,154,90,0.6)"
                            : "1px solid var(--color-border)",
                          background: c.track === key ? "rgba(74,154,90,0.10)" : "transparent",
                          color: c.track === key ? "#6FBF7F" : "var(--color-parchment-muted)",
                          boxShadow: c.track === key ? "0 0 10px rgba(74,154,90,0.15)" : "none",
                        }}>
                        {t.label} ({t.weekly_cost}⚜/ay)
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <div style={{ height: "0.75rem" }} />
        </>
      )}

      {/* ── Vasiyet ── */}
      <Panel title="Vasiyet" icon="📜" tone="gold">
        <p className="font-serif" style={{
          fontSize: "0.74rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", marginBottom: "0.6rem",
        }}>
          Mirasın nasıl bölüneceğini şimdiden belirle — nesil geçişini şekillendirir.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {WILL_STYLES.map((w) => (
            <button key={w.id} disabled={busy}
              onClick={() => { playSfx("page"); act(async () =>
                (await api.post("/legacy/will", { style: w.id })).data, "Vasiyet güncellendi."); }}
              style={{
                width: "100%", textAlign: "left", padding: "0.6rem 0.75rem",
                borderRadius: "6px", cursor: "pointer",
                border: data.will.style === w.id
                  ? "1px solid rgba(201,168,76,0.55)"
                  : "1px solid var(--color-border)",
                background: data.will.style === w.id
                  ? "linear-gradient(160deg, rgba(201,168,76,0.10) 0%, rgba(20,14,7,0.5) 60%)"
                  : "linear-gradient(180deg, rgba(255,255,255,0.015), transparent)",
                boxShadow: data.will.style === w.id
                  ? "0 0 14px rgba(201,168,76,0.12), inset 0 1px 0 rgba(201,168,76,0.15)"
                  : "none",
              }}>
              <div className="font-display" style={{
                fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.06em",
                color: data.will.style === w.id ? "var(--color-gold)" : "var(--color-parchment)",
              }}>
                {w.label}
                {data.will.style === w.id && (
                  <span style={{ marginLeft: "0.5rem", textShadow: "0 0 8px rgba(201,168,76,0.5)" }}>✓</span>
                )}
              </div>
              <div className="font-serif" style={{
                fontSize: "0.72rem", fontStyle: "italic",
                color: "var(--color-parchment-muted)", marginTop: "0.15rem",
              }}>
                {w.desc}
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <div style={{ height: "0.75rem" }} />

      {/* ── Taht iddiası ── */}
      <Panel title="Taht Yolu" icon="👑" tone="ember">
        {data.throne.already_king ? (
          <p className="font-serif" style={{
            fontSize: "0.9rem", fontStyle: "italic", color: "var(--color-gold)",
            textShadow: "0 0 10px rgba(201,168,76,0.3)",
          }}>
            👑 Tahttasın. Hükmün sürsün!
          </p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
              {throneReqs.map(([key, v]) => (
                <div key={key} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.35rem 0.6rem", borderRadius: "5px",
                  border: v.ok ? "1px solid rgba(74,154,90,0.45)" : "1px solid var(--color-border)",
                  background: v.ok ? "rgba(74,154,90,0.07)" : "rgba(10,7,4,0.4)",
                }}>
                  <span className="label-tiny" style={{ color: v.ok ? "#6FBF7F" : undefined }}>
                    {THRONE_LABELS[key]}
                  </span>
                  <span className="font-display" style={{
                    fontSize: "0.66rem", fontWeight: 700,
                    color: v.ok ? "#6FBF7F" : "var(--color-parchment-muted)",
                  }}>
                    {v.have}/{v.need}
                  </span>
                </div>
              ))}
            </div>
            <GoldRule />
            <button disabled={busy || !throneReady}
              onClick={() => setConfirm({
                title: "Taht İddiası",
                message: "Taht iddiası tehlikelidir: kampanya 3000 altına mal olur; başarısızlık sürgün ve itibar kaybı demektir. Yine de devam edecek misin?",
                confirmLabel: "Tahtı İddia Et",
                onConfirm: () => {
                  playSfx("sword");
                  act(async () => {
                    const res = (await api.post("/legacy/claim-throne")).data;
                    res.result.outcome === "zafer"
                      ? toast.success("TAHT SENİN! 👑")
                      : toast.error("İddia bastırıldı...");
                    setLastActionPage({ path: "/oyun/hanedan", label: "Hanedan" });
                    navigate("/oyun");
                    return res;
                  });
                },
              })}
              className={throneReady ? "btn-ember" : "btn-ghost-ash"}
              style={{ width: "100%", padding: "0.65rem", fontSize: "0.7rem" }}>
              ⚔ Taht İddiasında Bulun
            </button>
          </>
        )}
      </Panel>

      <div style={{ height: "0.75rem" }} />

      {/* ── Şehir kurma ── */}
      <Panel title="Yerleşim Kur" icon="🏰" tone="gold">
        <p className="font-serif" style={{
          fontSize: "0.74rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", marginBottom: "0.6rem",
        }}>
          {data.settlement_cost} altına kendi köyünü kur: haritada senin adınla yaşar,
          kurucu konağı hediye. (Yaş 25+)
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input value={settlementName} onChange={(e) => setSettlementName(e.target.value)}
            placeholder="Yerleşim adı..."
            style={{ flex: 1, padding: "0.45rem 0.6rem", fontSize: "0.85rem" }} />
          <button disabled={busy || data.money < data.settlement_cost || settlementName.trim().length < 3}
            onClick={() => { playSfx("coin"); act(async () => {
              const res = (await api.post("/legacy/found", { name: settlementName })).data;
              toast.success("Yerleşim kuruldu! 🏘");
              if (res.state) setState(res.state);
              setLastActionPage({ path: "/oyun/hanedan", label: "Hanedan" });
              navigate("/oyun");
              return res;
            }); }}
            className={data.money >= data.settlement_cost && settlementName.trim().length >= 3
              ? "btn-ember" : "btn-ghost-ash"}
            style={{ padding: "0.45rem 0.85rem", fontSize: "0.62rem", flexShrink: 0 }}>
            🏘 Kur
          </button>
        </div>
        <div style={{
          marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.4rem",
        }}>
          <span className="label-tiny">Keseniz</span>
          <Coin value={data.money} />
        </div>
      </Panel>

      {/* ── Nesil geçmişi ── */}
      {data.legacy_history.length > 0 && (
        <>
          <div style={{ height: "0.75rem" }} />
          <Panel title="Nesil Geçmişi" icon="🕰" tone="ash">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {data.legacy_history.map((h, i) => (
                <div key={i} className="row-frame" style={{ justifyContent: "space-between" }}>
                  <span className="font-serif" style={{
                    fontSize: "0.8rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
                  }}>
                    {h.generation}. nesil — {h.previous_name}
                  </span>
                  <span className="font-display" style={{
                    fontSize: "0.62rem", color: "var(--color-parchment-muted)", flexShrink: 0,
                  }}>
                    {h.origin} · <Coin value={h.inherited_money} size="0.62rem" /> miras
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
