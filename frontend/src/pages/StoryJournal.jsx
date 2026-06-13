/**
 * Hikâyelerim — KÜL & KÖZ görsel katman.
 * Duygu görevi: yay (arc) kartları kitap sırtı gibi; tamamlanan yaylar mühürlü.
 * İşlevsellik (API/state/koşul akışı, test kimlikleri) birebir korunur.
 */
import { useEffect, useState, useCallback } from "react";
import { api, extractErrorMessage } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { toast } from "sonner";
import { playSfx } from "@/lib/audio";
import { PageHeader, Panel, Pill, EmptyState, TONES } from "@/components/ui/Kit";

const TEST_LABELS = {
  strength: "Güç", intelligence: "Zeka", charisma: "Karizma", stamina: "Dayanıklılık",
  combat: "Savaş", trade: "Ticaret", crafting: "Zanaat", social: "Sosyal",
};

function TestBadge({ test }) {
  if (!test) return null;
  const parts = [];
  for (const [k, v] of Object.entries(test.stat || {})) parts.push(`${TEST_LABELS[k] || k} ${v}`);
  for (const [k, v] of Object.entries(test.skill || {})) parts.push(`${TEST_LABELS[k] || k} ${v}`);
  return (
    <span style={{ marginLeft: "0.5rem", flexShrink: 0 }}>
      <Pill tone="ink">🎲 {parts.join(" + ")}</Pill>
    </span>
  );
}

function ArcLog({ log }) {
  const [open, setOpen] = useState(false);
  if (!log?.length) return null;
  return (
    <div style={{ paddingTop: "0.25rem" }}>
      <button onClick={() => setOpen(!open)}
        className="font-display"
        style={{
          background: "none", border: "none", padding: 0, cursor: "pointer",
          fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--color-parchment-muted)",
          display: "inline-flex", alignItems: "center", gap: "0.3rem",
        }}>
        Geçmiş ({log.length}) {open ? "▴" : "▾"}
      </button>
      {open && (
        <div style={{
          marginTop: "0.4rem", paddingLeft: "0.65rem",
          borderLeft: "1px solid rgba(201,168,76,0.25)",
          display: "flex", flexDirection: "column", gap: "0.35rem",
        }}>
          {log.map((l, i) => (
            <div key={i} style={{ lineHeight: 1.45 }}>
              <span className="font-serif" style={{
                fontSize: "0.74rem", fontWeight: 600,
                color: l.basari === false ? TONES.blood.text : "var(--color-parchment-dim)",
              }}>
                ▸ {l.secim}
              </span>
              {l.sonuc && (
                <p className="font-serif" style={{
                  fontSize: "0.72rem", fontStyle: "italic",
                  color: "var(--color-parchment-muted)", margin: 0,
                }}>
                  {l.sonuc}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveArc({ arc, busy, onChoose }) {
  return (
    <div data-testid={`story-active-${arc.arc_id}`}
      className="card-frame"
      style={{
        padding: "0.85rem 0.85rem 0.85rem 1rem",
        borderLeft: "4px solid rgba(201,168,76,0.55)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.45), inset 4px 0 12px -6px rgba(201,168,76,0.25)",
        display: "flex", flexDirection: "column", gap: "0.7rem",
      }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <h3 className="font-display" style={{
          fontSize: "0.85rem", fontWeight: 700, color: "var(--color-gold)",
          letterSpacing: "0.05em", textShadow: "0 0 10px rgba(201,168,76,0.25)",
          margin: 0, minWidth: 0,
        }}>
          📜 {arc.title}
        </h3>
        {arc.deadline_weeks != null && (
          <Pill
            tone={arc.deadline_weeks <= 2 ? "blood" : "ash"}
            pulse={arc.deadline_weeks <= 2 ? "danger" : undefined}>
            ⌛ {arc.deadline_weeks} ay
          </Pill>
        )}
      </div>
      <p className="font-serif" style={{
        fontSize: "0.86rem", fontStyle: "italic", lineHeight: 1.55,
        color: "var(--color-parchment)", margin: 0,
      }}>
        {arc.step_text}
      </p>
      {arc.waiting ? (
        <div className="row-frame" style={{
          background: "linear-gradient(to right, rgba(122,106,79,0.08), transparent 70%)",
        }}>
          <span style={{ fontSize: "0.9rem", flexShrink: 0, opacity: 0.7 }}>⏳</span>
          <span className="font-serif" style={{
            fontSize: "0.78rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
          }}>
            Hikâye demleniyor — {arc.wait_weeks} ay sonra devam edecek. Ayı ilerlet.
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {arc.choices.map((c) => (
            <button key={c.index} disabled={busy}
              onClick={() => { playSfx("page"); onChoose(arc.arc_id, c.index); }}
              className="row-frame"
              style={{
                width: "100%", textAlign: "left", cursor: busy ? "not-allowed" : "pointer",
                justifyContent: "space-between", opacity: busy ? 0.6 : 1,
              }}>
              <span className="font-serif" style={{
                fontSize: "0.82rem", color: "var(--color-parchment)", lineHeight: 1.4,
              }}>
                ❧ {c.text}
              </span>
              <TestBadge test={c.test} />
            </button>
          ))}
        </div>
      )}
      <ArcLog log={arc.log} />
    </div>
  );
}

export default function StoryJournal() {
  const navigate = useNavigate();
  const { setState, setLastActionPage, setFreshEvents, state: gameState } = useGame();
  const [journal, setJournal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastOutcome, setLastOutcome] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/story/journal");
      // Eksik/kısmi yanıtta da ekran çökmesin — diziler garanti
      setJournal({ offers: [], active: [], finished: [], ...(data || {}) });
    } catch (e) {
      toast.error(extractErrorMessage(e));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const act = async (fn) => {
    setBusy(true);
    try {
      const data = await fn();
      if (data?.journal) setJournal(data.journal);
      if (data?.outcome) setLastOutcome(data.outcome);
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onStart = (arcId) =>
    act(async () => (await api.post("/story/start", { arc_id: arcId })).data);
  const onDecline = (arcId) =>
    act(async () => (await api.post("/story/decline", { arc_id: arcId })).data);
  const onChoose = (arcId, idx) =>
    act(async () => {
      const { data } = await api.post("/story/choose", { arc_id: arcId, choice_index: idx });
      if (data.outcome?.finished) {
        data.outcome.ending === "tamamlandı"
          ? toast.success("Hikâye tamamlandı!")
          : toast.error("Hikâye kötü bitti...");
        // Yay bitti: sonuç günlüğe düşsün, oyuncu anasayfada hikâyesini görsün
        if (data.state) {
          const oldLen = (gameState?.history || []).length;
          setState(data.state);
          const fresh = (data.state.history || []).slice(oldLen);
          if (fresh.length && setFreshEvents) setFreshEvents(fresh);
        }
        setLastActionPage({ path: "/oyun/hikayeler", label: "Hikâyeler" });
        navigate("/oyun");
      } else if (data.state) {
        setState(data.state);
      }
      return data;
    });

  if (!journal) {
    return (
      <div className="page-shell rise-in" style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "5rem 1rem", gap: "0.6rem",
      }}>
        <span style={{ fontSize: "1.5rem", opacity: 0.5,
                       filter: "drop-shadow(0 0 10px rgba(201,168,76,0.3))" }}>📖</span>
        <span className="font-serif" style={{
          fontSize: "0.85rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
        }}>
          Defterin sayfaları çevriliyor…
        </span>
      </div>
    );
  }

  return (
    <div className="page-shell rise-in"
      style={{ display: "flex", flexDirection: "column", gap: "0.9rem", padding: "0 0.75rem 1.5rem" }}
      data-testid="story-journal-page">
      <PageHeader
        kicker="Kader Defteri"
        icon="📖"
        title="Hikâyelerim"
        sub="Her yay bir kitap sırtı — kimi açık durur, kimi mühürlenmiştir."
      />

      {lastOutcome?.result && (
        <div className="row-frame" style={{
          alignItems: "flex-start",
          borderLeft: `2px solid ${lastOutcome.ok ? TONES.sage.border : TONES.blood.border}`,
          background: `linear-gradient(to right, ${lastOutcome.ok ? TONES.sage.bg : TONES.blood.bg}, transparent 65%)`,
        }}>
          <span style={{ fontSize: "0.9rem", flexShrink: 0, marginTop: "0.05rem" }}>
            {lastOutcome.ok ? "🕊" : "🩸"}
          </span>
          <span className="font-serif" style={{
            fontSize: "0.84rem", fontStyle: "italic", lineHeight: 1.5,
            color: lastOutcome.ok ? TONES.sage.text : TONES.blood.text,
          }}>
            {lastOutcome.result}
          </span>
        </div>
      )}

      {journal.offers.length > 0 && (
        <Panel title="Kapını Çalanlar" icon="✉" tone="gold"
          right={<Pill tone="gold">{journal.offers.length} davet</Pill>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {journal.offers.map((o) => (
              <div key={o.arc_id} style={{
                padding: "0.75rem",
                borderRadius: "6px",
                border: "1px solid rgba(201,168,76,0.35)",
                background: "linear-gradient(160deg, rgba(201,168,76,0.07) 0%, rgba(20,14,7,0.5) 65%)",
                boxShadow: "inset 0 1px 0 rgba(201,168,76,0.12)",
                display: "flex", flexDirection: "column", gap: "0.5rem",
              }}>
                <h3 className="font-display" style={{
                  fontSize: "0.82rem", fontWeight: 700, color: "var(--color-gold)",
                  letterSpacing: "0.05em", margin: 0,
                  textShadow: "0 0 10px rgba(201,168,76,0.25)",
                }}>
                  ✉ {o.title}
                </h3>
                <p className="font-serif" style={{
                  fontSize: "0.82rem", fontStyle: "italic", lineHeight: 1.5,
                  color: "var(--color-parchment-dim)", margin: 0,
                }}>
                  {o.hook}
                </p>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button disabled={busy}
                    onClick={() => { playSfx("page"); onStart(o.arc_id); }}
                    className="btn-ember"
                    style={{ flex: 1, padding: "0.45rem 0.6rem", fontSize: "0.6rem" }}>
                    Hikâyeye Gir
                  </button>
                  <button disabled={busy}
                    onClick={() => { playSfx("click"); onDecline(o.arc_id); }}
                    className="btn-ghost-ash"
                    style={{ padding: "0.45rem 0.8rem", fontSize: "0.58rem" }}>
                    Geri Çevir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {journal.active.length > 0 ? (
        <Panel title="Aktif Hikâyeler" icon="🔥" tone="ember"
          right={<Pill tone="ember">{journal.active.length} yay</Pill>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {journal.active.map((a) => (
              <ActiveArc key={a.arc_id} arc={a} busy={busy} onChoose={onChoose} />
            ))}
          </div>
        </Panel>
      ) : journal.offers.length === 0 && (
        <div className="card-frame">
          <EmptyState icon="📖"
            title="Şu an seni bekleyen bir hikâye yok."
            sub="Ayları ilerlet — kader kapını çalacaktır. Bazı hikâyeler yaş, ün veya beceri ister." />
        </div>
      )}

      {journal.finished.length > 0 && (
        <Panel title="Kapanan Defterler" icon="🔏" tone="ash"
          right={<Pill tone="ash">{journal.finished.length} cilt</Pill>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {journal.finished.map((f) => {
              const sealed = f.status === "tamamlandı";
              return (
                <div key={f.arc_id} style={{
                  padding: "0.65rem 0.75rem 0.65rem 0.9rem",
                  borderRadius: "6px",
                  border: "1px solid var(--color-border)",
                  borderLeft: sealed
                    ? "4px solid rgba(201,168,76,0.5)"
                    : "4px solid rgba(122,106,79,0.35)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.015), transparent)",
                  opacity: sealed ? 1 : 0.85,
                  display: "flex", flexDirection: "column", gap: "0.3rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                      <span style={{
                        width: "1.5rem", height: "1.5rem", flexShrink: 0, borderRadius: "50%",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.65rem",
                        border: sealed ? "1px solid rgba(201,168,76,0.5)" : "1px solid rgba(200,64,64,0.4)",
                        background: sealed
                          ? "radial-gradient(circle, rgba(201,168,76,0.25), rgba(139,105,20,0.1))"
                          : "radial-gradient(circle, rgba(200,64,64,0.2), rgba(60,20,20,0.15))",
                        boxShadow: sealed ? "0 0 8px rgba(201,168,76,0.25)" : "none",
                      }}>
                        {sealed ? "⚜" : "✕"}
                      </span>
                      <span className="font-display" style={{
                        fontSize: "0.76rem", fontWeight: 700,
                        color: sealed ? "var(--color-parchment)" : "var(--color-parchment-dim)",
                        letterSpacing: "0.04em",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {f.title}
                      </span>
                    </span>
                    {f.status === "tamamlandı" ? (
                      <Pill tone="sage">🔏 Tamamlandı</Pill>
                    ) : (
                      <Pill tone="blood">
                        {f.status === "süresi_doldu" ? "Süresi doldu"
                          : f.status === "yarım_kaldı" ? "Yarım kaldı (önceki nesil)"
                          : "Kötü bitti"}
                      </Pill>
                    )}
                  </div>
                  <ArcLog log={f.log} />
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
