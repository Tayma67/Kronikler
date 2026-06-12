/**
 * Savaş Meydanı — KÜL & KÖZ.
 * Duygu görevi: "Kılıç ağır" — duruş/kart seçimi arena hissi.
 * İşlevsellik (API çağrıları, state akışı, data-testid'ler) birebir korunur.
 */
import { useEffect, useState, useCallback } from "react";
import { useGame } from "@/lib/GameContext";
import { playSfx } from "@/lib/audio";
import { useNavigate } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageHeader, Panel, Pill, GoldRule, Coin } from "@/components/ui/Kit";

/* ── Sabitler ──────────────────────────────────────────────────────── */
const TYPE_ICONS = {
  duello: "⚔️", soygun: "🗡️", turnuva: "🏆", kusatma: "🏰",
};
const STANCE_DESC = {
  "saldırgan": "Saldırı +%35 · Savunma -%30",
  "dengeli": "Dengeli saldırı ve savunma",
  "savunmacı": "Savunma +%40 · Saldırı -%30",
};
const STANCE_ICONS = { "saldırgan": "🔥", "dengeli": "⚖️", "savunmacı": "🛡️" };
const CARD_ICONS = { hamle: "⚔", savustur: "🛡", ozel: "⚡" };
const CARD_HINTS = {
  hamle: "Özel Yeteneği bozar",
  savustur: "Hamleyi savuşturur",
  ozel: "Savuşturanı delip geçer",
};

function HpBar({ label, hp, maxHp, color }) {
  const pct = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
  const friendly = color === "bg-emerald-600";
  const grad = friendly
    ? "linear-gradient(to right, #2E6B3C, #4A9A5A 55%, #6FBF7F)"
    : "linear-gradient(to right, #8B6914, #C9A84C 40%, #E05A30 75%, #C84040)";
  const glow = friendly ? "rgba(74,154,90,0.45)" : "rgba(224,90,48,0.45)";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.25rem" }}>
        <span className="label-tiny" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <span className="font-display" style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--color-parchment-dim)", flexShrink: 0 }}>
          {hp}/{maxHp}
        </span>
      </div>
      <div className="tension-track" style={{ height: "7px", border: "1px solid var(--color-border)" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: "2px",
          background: grad, boxShadow: `0 0 8px ${glow}`,
          transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

/* ── Yara listesi ──────────────────────────────────────────────────── */
function InjuryList({ injuries }) {
  if (!injuries?.length) return null;
  return (
    <Panel title="Yaraların" icon="🩹" tone="blood">
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        {injuries.map((inj, i) => (
          <div key={i} className="row-frame" style={{ padding: "0.45rem 0.65rem" }}>
            <span className="font-serif" style={{ flex: 1, fontSize: "0.82rem", color: "var(--color-parchment-dim)" }}>
              {inj.label}
              <span className="font-display" style={{ fontSize: "0.58rem", color: "#C84040", marginLeft: "0.4rem" }}>
                ({inj.stat} {inj.delta})
              </span>
            </span>
            <Pill tone={inj.permanent ? "blood" : "ash"}>
              {inj.permanent ? "Kalıcı" : `${inj.weeks_left} ay`}
            </Pill>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Sonuç ekranı ──────────────────────────────────────────────────── */
function ResultScreen({ result, onClose }) {
  const won = result.outcome === "zafer";
  const dead = result.outcome === "ölüm";
  const toneColor = won ? "#4A9A5A" : "#C84040";
  return (
    <div className="card-frame" style={{
      padding: "1.1rem", textAlign: "center",
      border: `1px solid ${won ? "rgba(74,154,90,0.5)" : "rgba(200,64,64,0.5)"}`,
      boxShadow: `0 0 24px ${won ? "rgba(74,154,90,0.12)" : "rgba(200,64,64,0.12)"}, 0 4px 16px rgba(0,0,0,0.45)`,
    }}>
      <div style={{ fontSize: "2rem", marginBottom: "0.4rem", filter: `drop-shadow(0 0 14px ${toneColor}66)` }}>
        {dead ? "💀" : won ? "🏆" : "🏳️"}
      </div>
      <h2 className="font-display" style={{
        fontSize: "1.15rem", fontWeight: 700, letterSpacing: "0.14em",
        color: toneColor, textShadow: `0 0 16px ${toneColor}55`, marginBottom: "0.6rem",
      }}>
        {dead ? "ÖLÜM" : won ? "ZAFER!" : result.outcome === "kaçış" ? "Geri Çekildin" : "Yenilgi"}
      </h2>
      <GoldRule label="Vakanüvis Yazdı" />
      <div style={{
        textAlign: "left", maxHeight: "11rem", overflowY: "auto",
        border: "1px solid var(--color-border)", borderRadius: "6px",
        background: "rgba(10,7,4,0.45)", padding: "0.6rem 0.7rem",
      }}>
        {result.log.map((l, i) => (
          <p key={i} className="font-serif" style={{
            fontSize: "0.78rem", fontStyle: "italic", lineHeight: 1.55,
            color: "var(--color-parchment-dim)", margin: "0 0 0.25rem",
          }}>
            {l}
          </p>
        ))}
      </div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "0.9rem", flexWrap: "wrap", marginTop: "0.7rem",
      }}>
        {result.loot != null && result.loot !== 0 && (
          result.loot > 0
            ? <Coin value={`+${result.loot}`} />
            : <span className="font-display" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#C84040" }}>{result.loot} ⚜</span>
        )}
        {result.injury && (
          <Pill tone="blood">🩹 {result.injury.label}</Pill>
        )}
        {result.rep_change ? (
          <Pill tone={result.rep_change > 0 ? "sage" : "blood"}>
            İtibar {result.rep_change > 0 ? "+" : ""}{result.rep_change}
          </Pill>
        ) : null}
      </div>
      <button onClick={onClose} className="btn-ember"
        style={{ width: "100%", padding: "0.6rem", fontSize: "0.7rem", marginTop: "0.85rem" }}>
        Devam Et
      </button>
    </div>
  );
}

/* ── Aktif çatışma ─────────────────────────────────────────────────── */
function ActiveCombat({ combat, busy, onStance, onCard, onFlee, playerMaxHp }) {
  return (
    <div className="card-frame" data-testid="active-combat"
      style={{
        padding: "1rem",
        border: "1px solid rgba(224,90,48,0.4)",
        boxShadow: "0 0 22px rgba(224,90,48,0.08), 0 4px 16px rgba(0,0,0,0.5)",
      }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.8rem" }}>
        <h2 className="font-display" style={{
          fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.1em",
          color: "#E05A30", textShadow: "0 0 12px rgba(224,90,48,0.35)",
        }}>
          ⚔️ {combat.type_label}
        </h2>
        <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }}>
          {combat.stages > 1 && <Pill tone="ash">Aşama {combat.stage}/{combat.stages}</Pill>}
          {combat.phase === "catisma" && <Pill tone="ember">Tur {combat.round}/{combat.max_rounds}</Pill>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
        <HpBar label="Sen" hp={combat.player_hp} maxHp={playerMaxHp || 100} color="bg-emerald-600" />
        <HpBar label={combat.enemy.name} hp={combat.enemy.hp} maxHp={combat.enemy.max_hp} color="bg-red-600" />
      </div>

      <GoldRule label={combat.phase === "hazirlik" ? "Duruşunu Seç" : "Meydan"} />

      {combat.phase === "hazirlik" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          <p className="font-serif" style={{
            fontSize: "0.78rem", fontStyle: "italic",
            color: "var(--color-parchment-muted)", margin: 0,
          }}>
            Kılıç çekilmeden önce ayağını nereye basacağını bil.
          </p>
          {Object.entries(combat.stances).map(([key, s]) => (
            <button key={key} disabled={busy} onClick={() => onStance(key)}
              className="row-frame"
              style={{
                width: "100%", textAlign: "left", cursor: "pointer",
                background: "linear-gradient(180deg, rgba(255,255,255,0.02), transparent)",
              }}>
              <span style={{ fontSize: "1rem", flexShrink: 0, filter: "drop-shadow(0 0 6px rgba(224,90,48,0.25))" }}>
                {STANCE_ICONS[key] || "⚔"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-display" style={{
                  fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.08em",
                  color: "var(--color-parchment)",
                }}>
                  {s.label}
                </div>
                <div className="font-serif" style={{
                  fontSize: "0.7rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
                }}>
                  {STANCE_DESC[key]}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div style={{
            border: "1px solid rgba(123,79,175,0.45)", borderRadius: "6px",
            background: "rgba(123,79,175,0.08)", padding: "0.5rem 0.7rem",
            marginBottom: "0.6rem",
          }}>
            <p className="font-serif" style={{
              fontSize: "0.8rem", fontStyle: "italic", margin: 0,
              color: "#C9B3E5",
            }}>
              👁 {combat.intent}
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.45rem" }}>
            {combat.cards.map((c) => (
              <button key={c.id} disabled={busy || c.locked}
                onClick={() => onCard(c.id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: "0.3rem", padding: "0.7rem 0.25rem", borderRadius: "6px",
                  cursor: c.locked ? "not-allowed" : "pointer",
                  border: c.locked
                    ? "1px dashed rgba(122,106,79,0.4)"
                    : "1px solid rgba(201,168,76,0.45)",
                  background: c.locked
                    ? "rgba(10,7,4,0.4)"
                    : "linear-gradient(170deg, rgba(201,168,76,0.10) 0%, rgba(20,14,7,0.7) 65%)",
                  boxShadow: c.locked ? "none" : "0 0 12px rgba(201,168,76,0.08), inset 0 1px 0 rgba(201,168,76,0.12)",
                  opacity: c.locked ? 0.55 : 1,
                }}>
                <span style={{
                  fontSize: "1.1rem",
                  filter: c.locked ? "grayscale(1)" : "drop-shadow(0 0 8px rgba(201,168,76,0.35))",
                }}>
                  {c.locked ? "🔒" : CARD_ICONS[c.id]}
                </span>
                <span className="font-display" style={{
                  fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.06em",
                  color: c.locked ? "var(--color-parchment-muted)" : "var(--color-gold)",
                }}>
                  {c.label}
                </span>
                <span className="font-serif" style={{
                  fontSize: "0.58rem", fontStyle: "italic", textAlign: "center",
                  color: "var(--color-parchment-muted)", padding: "0 0.15rem", lineHeight: 1.3,
                }}>
                  {c.locked ? "Savaş bec. 3+" : CARD_HINTS[c.id]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{
        maxHeight: "7rem", overflowY: "auto", marginTop: "0.8rem",
        borderTop: "1px solid var(--color-border)", paddingTop: "0.5rem",
      }}>
        {combat.log.slice(-5).map((l, i) => (
          <p key={i} className="font-serif" style={{
            fontSize: "0.72rem", fontStyle: "italic", lineHeight: 1.5,
            color: "var(--color-parchment-muted)", margin: "0 0 0.2rem",
          }}>
            {l}
          </p>
        ))}
      </div>

      <button disabled={busy} onClick={onFlee}
        className="btn-ghost-ash"
        style={{
          width: "100%", padding: "0.45rem", fontSize: "0.6rem", marginTop: "0.6rem",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
        }}>
        🏳️ Kaç (itibar bedeli)
      </button>
    </div>
  );
}

/* ── Komutan modu ──────────────────────────────────────────────────── */
function CommanderPanel({ decisions, busy, onCommand }) {
  const [picks, setPicks] = useState({});
  const ready = decisions && Object.keys(decisions).every((k) => picks[k]);
  return (
    <Panel title="Komutan Modu — Örgüt Savaşı" icon="👑" tone="gold">
      <p className="font-serif" style={{
        fontSize: "0.76rem", fontStyle: "italic",
        color: "var(--color-parchment-muted)", margin: "0 0 0.7rem",
      }}>
        Üç stratejik karar ver; savaşın sonucunu ±%30 etkiler. Zekân riskleri azaltır.
      </p>
      {Object.entries(decisions).map(([key, d]) => (
        <div key={key} style={{ marginBottom: "0.7rem" }}>
          <p className="label-tiny" style={{ margin: "0 0 0.3rem" }}>{d.label}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
            {d.options.map((o) => (
              <button key={o.id} disabled={busy}
                onClick={() => setPicks((p) => ({ ...p, [key]: o.id }))}
                className="font-display"
                style={{
                  fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.05em",
                  padding: "0.3rem 0.55rem", borderRadius: "4px", cursor: "pointer",
                  border: picks[key] === o.id
                    ? "1px solid rgba(201,168,76,0.7)"
                    : "1px solid var(--color-border-hi)",
                  background: picks[key] === o.id ? "rgba(201,168,76,0.12)" : "transparent",
                  color: picks[key] === o.id ? "var(--color-gold)" : "var(--color-parchment-muted)",
                  boxShadow: picks[key] === o.id ? "0 0 10px rgba(201,168,76,0.18)" : "none",
                }}>
                {o.label} <span style={{ color: "#4A9A5A" }}>{o.bonus}</span>
                {o.risk && <span style={{ color: "#C84040", marginLeft: "0.3rem" }}>risk {o.risk}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button disabled={busy || !ready} onClick={() => onCommand(picks)}
        className="btn-ember"
        style={{ width: "100%", padding: "0.6rem", fontSize: "0.68rem" }}>
        ⚔️ Orduyu Savaşa Sür
      </button>
    </Panel>
  );
}

/* ── Ana sayfa ─────────────────────────────────────────────────────── */
export default function Battle() {
  const { setState, setLastActionPage } = useGame();
  const navigate = useNavigate();
  const [options, setOptions] = useState(null);
  const [combat, setCombat] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [bet, setBet] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/combat/options");
      setOptions(data);
      setCombat(data.active);
    } catch (e) {
      toast.error(extractErrorMessage(e));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const act = async (fn) => {
    setBusy(true);
    try {
      const data = await fn();
      if (data?.combat) { setCombat(data.combat); setResult(null); }
      if (data?.result) {
        setResult(data.result);
        setCombat(null);
        if (data.state) setState(data.state);
      }
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onStart = (type) =>
    act(async () => (await api.post("/combat/start", { type, bet: type === "turnuva" ? bet : 0 })).data);
  const onStance = (stance) =>
    act(async () => (await api.post("/combat/stance", { stance })).data);
  const onCard = (card) => {
    playSfx("sword");
    return act(async () => (await api.post("/combat/card", { card })).data);
  };
  const onFlee = () =>
    act(async () => (await api.post("/combat/flee")).data);
  const onCommand = (picks) =>
    act(async () => (await api.post("/combat/commander", picks)).data);

  if (!options) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5rem 0" }}>
        <Loader2 className="animate-spin" style={{ width: "1.25rem", height: "1.25rem", color: "var(--color-gold-dim)" }} />
      </div>
    );
  }

  return (
    <div className="page-shell rise-in" data-testid="battle-page" style={{ padding: "0 0 1.5rem" }}>
      <PageHeader
        kicker="Meydan"
        icon="⚔️"
        title="Savaş Meydanı"
        sub="Kılıç ağırdır; kaldıran bilek hesabını verir."
        right={
          <div style={{ textAlign: "right" }}>
            <div className="label-tiny" style={{ marginBottom: "0.1rem" }}>Sağlık</div>
            <span className="font-display" style={{
              fontSize: "1rem", fontWeight: 700, color: "#6FBF7F",
              textShadow: "0 0 10px rgba(74,154,90,0.35)",
            }}>
              ❤ {options.health}
            </span>
          </div>
        }
      />

      {result && <ResultScreen result={result} onClose={() => {
        setResult(null);
        setLastActionPage({ path: "/oyun/savas", label: "Savaş" });
        navigate("/oyun");
      }} />}

      {combat && !result && (
        <ActiveCombat combat={combat} busy={busy} playerMaxHp={100}
          onStance={onStance} onCard={onCard} onFlee={onFlee} />
      )}

      {!combat && !result && (
        <>
          <InjuryList injuries={options.injuries} />
          {options.injuries?.length > 0 && <div style={{ height: "0.75rem" }} />}
          <Panel title="Çatışma Türleri" icon="🛡" tone="blood">
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.55rem" }}>
              {options.types.map((bt) => {
                const icon = TYPE_ICONS[bt.id] || "⚔";
                return (
                  <div key={bt.id} className="card-frame"
                    style={{
                      padding: "0.7rem 0.8rem",
                      opacity: bt.locked ? 0.6 : 1,
                      border: bt.locked ? "1px dashed rgba(122,106,79,0.4)" : undefined,
                    }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                      <span className="font-display" style={{
                        fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.06em",
                        color: "var(--color-parchment)", display: "flex", alignItems: "center", gap: "0.45rem",
                      }}>
                        <span style={{ filter: "drop-shadow(0 0 6px rgba(224,90,48,0.3))" }}>{icon}</span>
                        {bt.label}
                      </span>
                      {bt.critical && (
                        <Pill tone="blood" pulse="danger">☠ Ölüm Riski</Pill>
                      )}
                    </div>
                    {bt.stages > 1 && (
                      <p className="font-serif" style={{
                        fontSize: "0.7rem", fontStyle: "italic",
                        color: "var(--color-parchment-muted)", margin: "0.3rem 0 0",
                      }}>
                        {bt.stages} aşamalı çetin döğüş
                      </p>
                    )}
                    {bt.has_bet && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: "0.4rem",
                        marginTop: "0.45rem",
                      }}>
                        <span className="label-tiny">Bahis</span>
                        {[0, 20, 50, 100].map((b) => (
                          <button key={b} onClick={() => setBet(b)}
                            className="font-display"
                            style={{
                              fontSize: "0.6rem", fontWeight: 700, padding: "0.2rem 0.45rem",
                              borderRadius: "4px", cursor: "pointer",
                              border: bet === b ? "1px solid rgba(201,168,76,0.7)" : "1px solid var(--color-border-hi)",
                              background: bet === b ? "rgba(201,168,76,0.12)" : "transparent",
                              color: bet === b ? "var(--color-gold)" : "var(--color-parchment-muted)",
                            }}>
                            {b} ⚜
                          </button>
                        ))}
                      </div>
                    )}
                    {bt.locked ? (
                      <p className="font-serif" style={{
                        fontSize: "0.7rem", fontStyle: "italic",
                        color: "var(--color-parchment-muted)", margin: "0.45rem 0 0",
                        display: "flex", alignItems: "center", gap: "0.3rem",
                      }}>
                        🔒 {bt.lock_reason}
                      </p>
                    ) : (
                      <button disabled={busy} onClick={() => onStart(bt.id)}
                        className="btn-ember"
                        style={{ width: "100%", padding: "0.5rem", fontSize: "0.64rem", marginTop: "0.55rem" }}>
                        Meydana Çık
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          {options.commander_available && (
            <>
              <div style={{ height: "0.75rem" }} />
              <CommanderPanel decisions={options.commander_decisions}
                busy={busy} onCommand={onCommand} />
            </>
          )}
        </>
      )}
    </div>
  );
}
