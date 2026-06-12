/**
 * Mektep — KÜL & KÖZ.
 * Duygu görevi: "Mektep yıllarım" — çocuksu ama asil; dersler tarihî, oyuncaklı değil.
 * İşlevsellik (school API akışı, ders olayı modalı, kulüpler, sınavlar) birebir korunur.
 */
import { useEffect, useState, useCallback } from "react";
import { useGame } from "@/lib/GameContext";
import { api, extractErrorMessage } from "@/lib/api";
import { playSfx } from "@/lib/audio";
import { toast } from "sonner";
import { PageHeader, Panel, Pill, EmptyState, GoldRule } from "@/components/ui/Kit";

const TEACHERS = {
  din:       { name: "Hoca Efendi",  icon: "🧔" },
  matematik: { name: "Molla Hasan",  icon: "👳" },
  edebiyat:  { name: "Derviş Kâtip", icon: "🧙" },
  beden:     { name: "Pehlivan Ağa", icon: "💪" },
};

const SEASON_HERO = {
  "İlkbahar": "/images/hero/cocuk_ilkbahar.jpg",
  "Yaz":      "/images/hero/cocuk_yaz.jpg",
  "Sonbahar": "/images/hero/cocuk_sonbahar.jpg",
  "Kış":      "/images/hero/cocuk_kis.jpg",
};

function Stars({ value }) {
  const n = Math.max(0, Math.min(5, Math.floor((value || 0) / 8) + (value > 0 ? 1 : 0)));
  return (
    <span style={{ letterSpacing: "1.5px" }}>
      {[...Array(5)].map((_, i) => (
        <span key={i} style={{
          color: i < n ? "var(--color-gold-bright)" : "#3A3325", fontSize: "0.6rem",
          textShadow: i < n ? "0 0 5px rgba(240,192,64,0.5)" : "none",
        }}>★</span>
      ))}
    </span>
  );
}

/* ── Ders olayı seçim modalı (iki adımlı ders akışı) ─────────────── */
function LessonEventModal({ event, busy, onChoose }) {
  if (!event) return null;
  return (
    <div className="bg-black/80" style={{
      position: "fixed", inset: 0, zIndex: 60, display: "flex",
      alignItems: "center", justifyContent: "center", padding: "1rem",
    }}>
      <div className="card-frame" style={{
        width: "100%", maxWidth: "23rem", overflow: "hidden",
        borderColor: "rgba(201,168,76,0.45)",
        boxShadow: "0 0 28px rgba(201,168,76,0.15), 0 10px 30px rgba(0,0,0,0.7)",
      }}>
        <div style={{
          height: "3px",
          background: "linear-gradient(90deg, rgba(139,105,20,0.6), #C9A84C, rgba(139,105,20,0.6))",
        }} />
        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{
            textAlign: "center", fontSize: "2.1rem",
            filter: "drop-shadow(0 0 14px rgba(201,168,76,0.4))",
          }}>{event.icon || "🏫"}</div>
          <div className="font-display" style={{
            fontSize: "0.95rem", fontWeight: 700, letterSpacing: "0.06em",
            color: "var(--color-gold-bright)", textAlign: "center",
            textShadow: "0 0 12px rgba(240,192,64,0.3)",
          }}>{event.title || "Mektepte Bir An"}</div>
          <p className="font-serif" style={{
            fontSize: "0.84rem", color: "var(--color-parchment-dim)",
            textAlign: "center", lineHeight: 1.55, fontStyle: "italic", margin: 0,
          }}>{event.scene || event.text || event.description}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {(event.choices || []).map((c) => (
              <button key={c.id} disabled={busy} onClick={() => onChoose(c.id)}
                className="font-serif"
                style={{
                  padding: "0.65rem 0.8rem", borderRadius: "6px", cursor: "pointer",
                  background: c.brave ? "rgba(200,64,64,0.08)" : "rgba(201,168,76,0.07)",
                  border: `1px solid ${c.brave ? "rgba(200,64,64,0.45)" : "rgba(201,168,76,0.3)"}`,
                  color: "var(--color-parchment)", fontSize: "0.84rem",
                  textAlign: "left", transition: "border-color 0.15s",
                }}>
                <div>{c.brave ? "🗡 " : "❧ "}{c.label || c.text}</div>
                {c.hint && (
                  <div className="font-serif" style={{
                    fontSize: "0.68rem", fontStyle: "italic",
                    color: "var(--color-parchment-muted)", marginTop: "0.15rem",
                  }}>
                    {c.hint}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ ANA SAYFA ═══════════════════ */
export default function School() {
  const { state, setState } = useGame() || {};
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lessonEvent, setLessonEvent] = useState(null); // {lessonId, event}

  const refresh = useCallback(() => {
    api.get("/game/school").then(({ data }) => setSummary(data)).catch(() => {});
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const player = state?.player || {};
  const age = player.age ?? 7;
  const isStudent = age < 13;
  const season = summary?.current_season || "Yaz";
  const locName = state?.world?.locations?.find((l) => l.id === player.location_id)?.name || "";
  const year = 1247 + Math.floor((state?.turn || 0) / 12);

  const act = async (fn, refreshAfter = true) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res?.data?.state) setState(res.data.state);
      if (refreshAfter) refresh();
      return res;
    } catch (e) {
      playSfx("fail");
      toast.error(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const attendLesson = (id) =>
    act(async () => {
      playSfx("page");
      const res = await api.post(`/game/school/lesson/${id}`);
      if (res?.data?.result?.needs_event_choice) {
        setLessonEvent({ lessonId: id, event: res.data.result.lesson_event });
      } else if (res?.data?.result?.flavor) {
        playSfx("success");
        toast.success(res.data.result.flavor, { duration: 3500 });
      }
      return res;
    });

  const chooseLessonEvent = (choiceId) =>
    act(async () => {
      playSfx("click");
      const res = await api.post(`/game/school/lesson/${lessonEvent.lessonId}/choice`, {
        event_id: lessonEvent.event.id, choice_id: choiceId,
      });
      setLessonEvent(null);
      if (res?.data?.result?.flavor) {
        playSfx("success");
        toast.success(res.data.result.flavor, { duration: 3500 });
      }
      return res;
    });

  const clubAction = (id, joined) => {
    playSfx("click");
    return act(() => api.post(`/game/school/club/${id}/${joined ? "leave" : "join"}`));
  };

  const doSeasonal = (id) =>
    act(async () => {
      playSfx("click");
      const res = await api.post(`/game/school/seasonal/${id}`);
      if (res?.data?.result?.flavor) {
        playSfx("success");
        toast.success(res.data.result.flavor, { duration: 3000 });
      }
      return res;
    });

  /* ── Mezun ekranı ── */
  if (!isStudent) {
    return (
      <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }}>
        <PageHeader
          kicker="Mektep Yıllarım"
          icon="🎓"
          title="Mektep"
          sub="Çocukluğun mektep sıralarında geçti; öğrendiklerin hâlâ seninle."
        />
        <Panel title="Kapanan Defter" icon="🎓" tone="ash">
          <EmptyState icon="🎓"
            title="Mektep yılların geride kaldı."
            sub="Şimdi sıra hayat mektebinde — orada hoca da sensin, talebe de." />
          {summary?.total_lessons > 0 && (
            <div className="font-display" style={{
              textAlign: "center", fontSize: "0.62rem", letterSpacing: "0.12em",
              textTransform: "uppercase", color: "var(--color-parchment-muted)",
              paddingBottom: "0.5rem",
            }}>
              Toplam {summary.total_lessons} ders gördün ·{" "}
              {(summary.exam_history || []).filter((e) => e.passed).length} sınav geçtin
            </div>
          )}
        </Panel>
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={{
        minHeight: "60vh", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <span className="font-display ember-flicker" style={{
          fontSize: "0.62rem", letterSpacing: "0.25em", textTransform: "uppercase",
        }}>Mektep açılıyor…</span>
      </div>
    );
  }

  const lessons = Object.entries(summary.lessons || {});
  const clubs = Object.entries(summary.clubs || {});
  const grade = Math.max(1, age - 6);
  const examDue = summary.exam_due_in ?? 4;
  const examProgress = ((4 - examDue) / 4) * 100;
  const examHist = (summary.exam_history || []).slice(-3);

  return (
    <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }}>
      <PageHeader
        kicker="Mektep Yıllarım"
        icon="🏫"
        title={locName ? `${locName} Mektebi` : "Mektep"}
        sub={`${grade}. sınıf talebesisin — hocaların gözü üstünde, sene ${year}.`}
        right={<Pill tone="gold">{season}</Pill>}
      />

      {/* ── Mevsim manzarası ── */}
      <div className="card-frame" style={{ overflow: "hidden", marginBottom: "0.75rem" }}>
        <div style={{ position: "relative", height: "110px" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: `url(${SEASON_HERO[season]}) center 30% / cover no-repeat, #16120A`,
            filter: "brightness(0.55) saturate(0.9)",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(13,10,6,0.2) 0%, rgba(13,10,6,0.92) 95%)",
          }} />
          <div className="font-serif" style={{
            position: "absolute", left: "0.9rem", bottom: "0.6rem",
            fontSize: "0.78rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
            textShadow: "0 1px 6px rgba(0,0,0,0.8)",
          }}>
            Mektebin avlusunda {season.toLowerCase()} havası…
          </div>
        </div>
      </div>

      {/* ── DEVAM DURUMU ── */}
      <Panel title="Devam Durumu" icon="📖" tone="gold"
        right={<Pill tone="gold">{summary.total_lessons} ders</Pill>}>
        <div style={{ height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{
            width: `${examProgress}%`, height: "100%", borderRadius: "3px",
            background: "linear-gradient(90deg, #8B6914, #C9A84C)",
            boxShadow: "0 0 8px rgba(201,168,76,0.4)", transition: "width 0.5s",
          }} />
        </div>
        <div className="font-serif" style={{
          marginTop: "0.45rem", fontSize: "0.74rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", display: "flex", alignItems: "center", gap: "0.3rem",
        }}>
          <span style={{ color: "var(--color-gold-bright)" }}>⏳</span>
          Sınava: <span style={{ color: "var(--color-parchment-dim)", fontWeight: 600 }}>
            {examDue === 0 ? "bu ay!" : `${examDue} ay kaldı`}
          </span>
        </div>
      </Panel>

      <GoldRule label="Bu Ayın Dersleri" />

      {/* ── BU AYIN DERSLERİ ── */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
        {lessons.map(([id, l]) => {
          const locked = !l.available;
          const spent = !l.can_attend_today;
          const disabled = busy || locked || spent;
          return (
            <button key={id} disabled={disabled} onClick={() => attendLesson(id)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem",
                background: "transparent", border: "none", cursor: disabled ? "default" : "pointer",
                opacity: locked ? 0.35 : spent ? 0.55 : 1, padding: 0, flex: 1,
              }}>
              <div style={{
                width: "54px", height: "54px", borderRadius: "50%",
                background: "radial-gradient(circle at 35% 30%, #2A1F0C, #14100A)",
                border: `2px solid ${spent || locked ? "rgba(201,168,76,0.22)" : "var(--color-gold)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.35rem",
                boxShadow: spent || locked ? "none" : "0 0 14px rgba(201,168,76,0.3)",
              }}>{l.icon}</div>
              <span className="font-display" style={{
                fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.08em",
                color: spent || locked ? "var(--color-parchment-muted)" : "var(--color-parchment)",
                textAlign: "center", lineHeight: 1.3, textTransform: "uppercase",
              }}>{l.name.replace(" & ", " &\n")}</span>
              {locked && (
                <span className="font-serif" style={{
                  fontSize: "0.56rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
                }}>🔒 {l.min_age} yaş</span>
              )}
            </button>
          );
        })}
      </div>
      {lessons.some(([, l]) => !l.can_attend_today) && (
        <p className="font-serif" style={{
          fontSize: "0.7rem", fontStyle: "italic", textAlign: "center",
          color: "var(--color-parchment-muted)", margin: "0.6rem 0 0",
        }}>
          Bu ayın dersi alındı — ders zamanı ilerletir; gelecek ay yeni ders.
        </p>
      )}

      <GoldRule label="Talebe Toplulukları" />

      {/* ── ÖĞRENCİ TOPLULUKLARI ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        {clubs.map(([id, c]) => {
          const joined = c.joined;
          const canJoin = c.can_join;
          return (
            <button key={id} disabled={busy || (!joined && !canJoin)}
              onClick={() => clubAction(id, joined)}
              className="card-frame"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem",
                padding: "0.75rem 0.5rem", cursor: "pointer",
                opacity: !joined && !canJoin ? 0.45 : 1, position: "relative",
                ...(joined ? {
                  borderColor: "rgba(201,168,76,0.5)",
                  boxShadow: "0 0 14px rgba(201,168,76,0.12)",
                } : {}),
              }}>
              {joined && (
                <span className="font-display" style={{
                  position: "absolute", top: "0.35rem", right: "0.35rem",
                  fontSize: "0.46rem", fontWeight: 700, letterSpacing: "0.12em",
                  color: "#0D0A06", background: "var(--color-gold)",
                  borderRadius: "3px", padding: "0.1rem 0.3rem",
                }}>ÜYE</span>
              )}
              <span style={{ fontSize: "1.3rem",
                             filter: joined ? "drop-shadow(0 0 8px rgba(201,168,76,0.4))" : "none" }}>
                {c.icon}
              </span>
              <span className="font-display" style={{
                fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.06em",
                color: joined ? "var(--color-gold-bright)" : "var(--color-parchment)",
                textAlign: "center", lineHeight: 1.3, textTransform: "uppercase",
              }}>{c.name}</span>
              <span className="font-serif" style={{
                fontSize: "0.6rem", fontStyle: "italic",
                color: "var(--color-parchment-muted)", textAlign: "center",
              }}>
                {joined ? "ayrılmak için dokun"
                  : canJoin ? "katılmak için dokun"
                  : `${c.join_req.stat === "charisma" ? "Karizma" : c.join_req.stat === "strength" ? "Güç" : "Zeka"} ${c.join_req.min_val}+ gerek`}
              </span>
            </button>
          );
        })}
      </div>

      <GoldRule label="Sınav Durumu" />

      {/* ── SINAV DURUMU ── */}
      <Panel title="Sınav Defteri" icon="📜" tone="ink">
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {[0, 1, 2].map((i) => {
            const ex = examHist[i];
            const lessonMeta = ex ? summary.lessons?.[ex.lesson] : null;
            return (
              <div key={i} className="row-frame" style={{
                flex: 1, flexDirection: "column", gap: "0.25rem",
                padding: "0.55rem 0.25rem", opacity: ex ? 1 : 0.4,
              }}>
                <span className="font-display" style={{
                  fontSize: "0.52rem", letterSpacing: "0.1em",
                  color: "var(--color-parchment-muted)",
                }}>
                  {ex ? (lessonMeta?.icon || "📜") : `${i + 1}. SINAV`}
                </span>
                {ex ? (
                  <>
                    <span style={{ fontSize: "0.9rem" }}>{ex.passed ? "✅" : "❌"}</span>
                    <span className="font-display" style={{
                      fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.1em",
                      color: ex.passed ? "#4A9A5A" : "#C84040",
                    }}>{ex.passed ? "GEÇTİ" : "KALDI"}</span>
                  </>
                ) : (
                  <span style={{ fontSize: "0.8rem", color: "var(--color-parchment-muted)" }}>—</span>
                )}
              </div>
            );
          })}
          {/* Sıradaki sınav */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: "0.25rem", padding: "0.55rem 0.25rem",
            borderRadius: "6px", background: "rgba(201,168,76,0.07)",
            border: "1px dashed rgba(201,168,76,0.5)",
          }}>
            <span className="font-display" style={{
              fontSize: "0.52rem", letterSpacing: "0.1em", color: "var(--color-gold)",
            }}>SIRADAKİ</span>
            <span style={{ fontSize: "0.9rem" }}>⏳</span>
            <span className="font-display" style={{
              fontSize: "0.5rem", fontWeight: 700, textAlign: "center", lineHeight: 1.4,
              color: "var(--color-gold-bright)",
            }}>
              {examDue === 0 ? "BU AY" : `${examDue} AY SONRA`}
            </span>
          </div>
        </div>
      </Panel>

      {/* ── R5.2: SINIF SIRALAMASI ── */}
      {summary.rekabet?.standings?.length > 0 && (
        <>
          <div style={{ height: "0.75rem" }} />
          <Panel title="Sınıf Sıralaması" icon="🏆" tone="gold"
            right={
              <span className="label-tiny">
                {summary.rekabet.weeks_left > 0
                  ? `Dönem sonuna ${summary.rekabet.weeks_left} ay`
                  : "Dönem kapanıyor"}
              </span>
            }>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {summary.rekabet.standings.map((r) => (
                <div key={r.rank} className={r.is_player ? "" : undefined} style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.4rem 0.6rem", borderRadius: "6px",
                  background: r.is_player ? "rgba(201,168,76,0.1)" : "transparent",
                  border: r.is_player ? "1px solid rgba(201,168,76,0.35)" : "1px solid transparent",
                  boxShadow: r.is_player ? "0 0 10px rgba(201,168,76,0.1)" : "none",
                }}>
                  <span className="font-display" style={{
                    fontSize: "0.7rem", fontWeight: 700, width: "1.4rem",
                    color: r.rank === 1 ? "var(--color-gold-bright)" : "var(--color-parchment-muted)",
                  }}>{r.rank === 1 ? "👑" : `${r.rank}.`}</span>
                  <span className="font-serif" style={{
                    flex: 1, fontSize: "0.84rem",
                    color: r.is_player ? "var(--color-gold-bright)" : "var(--color-parchment)",
                    fontWeight: r.is_player ? 700 : 400,
                  }}>{r.name}{r.is_player ? " (sen)" : ""}</span>
                  <span className="font-display" style={{
                    fontSize: "0.66rem", color: "var(--color-parchment-dim)",
                  }}>
                    {r.score} puan
                  </span>
                </div>
              ))}
            </div>
            {summary.rekabet.last_term && (
              <div className="font-serif" style={{
                marginTop: "0.55rem", paddingTop: "0.55rem",
                borderTop: "1px solid var(--color-border)",
                fontSize: "0.72rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
              }}>
                Geçen dönem: {summary.rekabet.last_term.player_rank}. oldun
                {summary.rekabet.last_term.player_rank !== 1 &&
                  ` — birinci ${summary.rekabet.last_term.first_name}`}.
              </div>
            )}
          </Panel>
        </>
      )}

      <GoldRule label="Hocalarım" />

      {/* ── HOCALARIM ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        {lessons.filter(([, l]) => l.available).map(([id, l]) => {
          const t = TEACHERS[id] || { name: "Hoca", icon: "🧔" };
          const rel = l.teacher_relation || 0;
          return (
            <div key={id} className="row-frame">
              <div style={{
                width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
                background: "radial-gradient(circle at 35% 30%, #2A1F0C, #14100A)",
                border: "1.5px solid rgba(201,168,76,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.05rem",
              }}>{t.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-display" style={{
                  fontSize: "0.76rem", fontWeight: 700, color: "var(--color-parchment)",
                }}>
                  {t.name}
                </div>
                <div className="font-serif" style={{
                  fontSize: "0.68rem", fontStyle: "italic",
                  color: "var(--color-parchment-muted)",
                }}>
                  {l.name} · {l.count} ders
                </div>
                {(summary.teacher_memory?.[id] || []).length > 0 && (
                  <div className="font-serif" style={{
                    fontSize: "0.66rem", fontStyle: "italic", color: "var(--color-gold)",
                    marginTop: "0.1rem",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    "…{summary.teacher_memory[id][summary.teacher_memory[id].length - 1]}"
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.1rem", flexShrink: 0 }}>
                <Stars value={rel} />
                <span className="font-display" style={{
                  fontSize: "0.58rem", fontWeight: 700,
                  color: rel >= 0 ? "#4A9A5A" : "#C84040",
                }}>
                  Hatır {rel >= 0 ? "+" : ""}{rel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MEVSİMSEL ETKİNLİKLER ── */}
      {(summary.seasonal_activities || []).length > 0 && (
        <>
          <GoldRule label={`${season} Etkinlikleri`} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {summary.seasonal_activities.map((a) => (
              <button key={a.id} disabled={busy || a.done_this_week}
                onClick={() => doSeasonal(a.id)}
                className="card-frame"
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                  padding: "0.7rem 0.4rem", cursor: "pointer",
                  opacity: a.done_this_week ? 0.5 : 1,
                  ...(a.done_this_week ? {} : {
                    borderColor: "rgba(201,168,76,0.4)",
                  }),
                }}>
                <span style={{ fontSize: "1.2rem",
                               filter: a.done_this_week ? "grayscale(0.6)" : "drop-shadow(0 0 8px rgba(201,168,76,0.3))" }}>
                  {a.icon}
                </span>
                <span className="font-display" style={{
                  fontSize: "0.54rem", fontWeight: 700, letterSpacing: "0.05em",
                  color: "var(--color-parchment)", textAlign: "center",
                  lineHeight: 1.3, textTransform: "uppercase",
                }}>{a.name}</span>
                <span className="font-serif" style={{
                  fontSize: "0.58rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
                }}>
                  {a.done_this_week ? "✓ yapıldı" : Object.entries(a.stat_xp || {}).map(([k, v]) => `+${v} ${k.slice(0, 5)}`).join(" ")}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <LessonEventModal event={lessonEvent?.event} busy={busy} onChoose={chooseLessonEvent} />
    </div>
  );
}
