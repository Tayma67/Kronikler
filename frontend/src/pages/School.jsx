import { useEffect, useState, useCallback } from "react";
import { useGame } from "@/lib/GameContext";
import { api, extractErrorMessage } from "@/lib/api";
import { toast } from "sonner";

/* ─────────────────────────────────────────────────────────────────
   School.jsx — MEKTEP (mockup uygulaması)
   Hero başlık → devam durumu → bu hafta dersleri (yuvarlak ikonlar)
   → öğrenci toplulukları → sınav durumu → hocalarım → mevsimsel
   etkinlikler. Mevcut school.py sistemine birebir bağlı.
   ───────────────────────────────────────────────────────────────── */

const C = {
  bg: "#0A0A0A", card: "#111111", card2: "#16120A",
  gold: "#C9A84C", goldBright: "#F0C040", goldDim: "#5A4010",
  goldBorder: "rgba(201,168,76,0.22)", goldBg: "rgba(201,168,76,0.07)",
  text: "#D8C8A0", textDim: "#7A7060", textMid: "#A09070",
  red: "#C0392B", green: "#27AE60",
};

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

function GoldDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${C.goldDim} 60%, transparent)` }} />
      <div style={{ width: 5, height: 5, background: C.gold, transform: "rotate(45deg)", margin: "0 8px", boxShadow: `0 0 4px ${C.gold}` }} />
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${C.goldDim} 60%, transparent)` }} />
    </div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 9px" }}>
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.2em", color: C.gold, flexShrink: 0 }}>
        {children}
      </span>
      <div style={{ flex: 1 }}><GoldDivider /></div>
      {right}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.goldBorder}`,
      borderRadius: 10, padding: "12px", ...style,
    }}>{children}</div>
  );
}

function Stars({ value }) {
  const n = Math.max(0, Math.min(5, Math.floor((value || 0) / 8) + (value > 0 ? 1 : 0)));
  return (
    <span style={{ letterSpacing: 1.5 }}>
      {[...Array(5)].map((_, i) => (
        <span key={i} style={{ color: i < n ? C.goldBright : "#3A3325", fontSize: 9 }}>★</span>
      ))}
    </span>
  );
}

/* ── Ders olayı seçim modalı (iki adımlı ders akışı) ─────────────── */
function LessonEventModal({ event, busy, onChoose }) {
  if (!event) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16,
      background: "rgba(0,0,0,0.8)",
    }}>
      <div style={{
        width: "100%", maxWidth: 360, borderRadius: 14, overflow: "hidden",
        background: "linear-gradient(160deg, #1c1814, #111)",
        border: `1px solid ${C.gold}66`,
      }}>
        <div style={{ height: 4, background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold}, ${C.goldDim})` }} />
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ textAlign: "center", fontSize: 34 }}>{event.icon || "🏫"}</div>
          <div style={{
            fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700,
            color: C.goldBright, textAlign: "center",
          }}>{event.title || "Mektepte Bir An"}</div>
          <p style={{
            fontFamily: "'Lora', serif", fontSize: 12, color: C.text,
            textAlign: "center", lineHeight: 1.5, fontStyle: "italic", margin: 0,
          }}>{event.scene || event.text || event.description}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {(event.choices || []).map((c) => (
              <button key={c.id} disabled={busy} onClick={() => onChoose(c.id)}
                style={{
                  padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                  background: c.brave ? "rgba(178, 34, 34, 0.12)" : C.goldBg,
                  border: `1px solid ${c.brave ? "#b2222266" : C.goldBorder}`,
                  color: C.text, fontFamily: "'Lora', serif", fontSize: 12,
                  textAlign: "left",
                }}>
                <div>{c.label || c.text}</div>
                {c.hint && (
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
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

  const act = async (fn, refreshAfter = true) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res?.data?.state) setState(res.data.state);
      if (refreshAfter) refresh();
      return res;
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const attendLesson = (id) =>
    act(async () => {
      const res = await api.post(`/game/school/lesson/${id}`);
      if (res?.data?.result?.needs_event_choice) {
        setLessonEvent({ lessonId: id, event: res.data.result.lesson_event });
      } else if (res?.data?.result?.flavor) {
        toast.success(res.data.result.flavor, { duration: 3500 });
      }
      return res;
    });

  const chooseLessonEvent = (choiceId) =>
    act(async () => {
      const res = await api.post(`/game/school/lesson/${lessonEvent.lessonId}/choice`, {
        event_id: lessonEvent.event.id, choice_id: choiceId,
      });
      setLessonEvent(null);
      if (res?.data?.result?.flavor) toast.success(res.data.result.flavor, { duration: 3500 });
      return res;
    });

  const clubAction = (id, joined) =>
    act(() => api.post(`/game/school/club/${id}/${joined ? "leave" : "join"}`));

  const doSeasonal = (id) =>
    act(async () => {
      const res = await api.post(`/game/school/seasonal/${id}`);
      if (res?.data?.result?.flavor) toast.success(res.data.result.flavor, { duration: 3000 });
      return res;
    });

  /* ── Mezun ekranı ── */
  if (!isStudent) {
    return (
      <div style={{ minHeight: "100%", background: C.bg, maxWidth: 480, margin: "0 auto", padding: "40px 16px" }}>
        <Card style={{ textAlign: "center", padding: "36px 20px" }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🎓</div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: "0.1em" }}>
            MEKTEP YILLARIN GERİDE KALDI
          </div>
          <p style={{ fontFamily: "'Lora', serif", fontSize: 11.5, color: C.textDim, lineHeight: 1.6, marginTop: 8 }}>
            Çocukluğun mektep sıralarında geçti; öğrendiklerin hâlâ seninle.
            Şimdi sıra hayat mektebinde.
          </p>
          {summary?.total_lessons > 0 && (
            <div style={{ marginTop: 12, fontFamily: "'Cinzel', serif", fontSize: 10, color: C.textMid }}>
              Toplam {summary.total_lessons} ders gördün ·{" "}
              {(summary.exam_history || []).filter((e) => e.passed).length} sınav geçtin
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <span style={{ color: C.textDim, fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "0.2em" }}>MEKTEP AÇILIYOR…</span>
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
    <div style={{ minHeight: "100%", background: C.bg, maxWidth: 480, margin: "0 auto", paddingBottom: "6.5rem" }}>

      {/* ── HERO ── */}
      <div style={{ position: "relative", height: 150, overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: `url(${SEASON_HERO[season]}) center 30% / cover no-repeat, #16120A`,
          filter: "brightness(0.55) saturate(0.9)",
        }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,10,10,0.25) 0%, rgba(10,10,10,0.92) 95%)" }} />
        <div style={{ position: "absolute", left: 14, bottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 9,
            background: "linear-gradient(135deg, #2A1A08, #1A1008)",
            border: `1.5px solid ${C.gold}`, display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: 19,
            boxShadow: `0 0 14px rgba(201,168,76,0.3)`,
          }}>🏫</div>
          <div>
            <div style={{
              fontFamily: "'Cinzel', serif", fontSize: 15, fontWeight: 700,
              color: C.goldBright, letterSpacing: "0.06em",
              textShadow: "0 0 16px rgba(201,168,76,0.4)",
            }}>{(locName ? `${locName} Mektebi` : "Mektep").toUpperCase()}</div>
            <div style={{ fontFamily: "'Lora', serif", fontSize: 10, color: C.textMid, fontStyle: "italic" }}>
              {grade}. Sınıf Öğrencisi
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 12px 0" }}>

        {/* ── DEVAM DURUMU ── */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8.5, letterSpacing: "0.2em", color: C.textDim }}>DEVAM DURUMU</span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, fontWeight: 700, color: C.gold }}>
              {summary.total_lessons} DERS
            </span>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "hidden" }}>
            <div style={{
              width: `${examProgress}%`, height: "100%",
              background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold})`,
              boxShadow: `0 0 8px ${C.gold}66`, transition: "width 0.5s",
            }} />
          </div>
          <div style={{ marginTop: 6, fontFamily: "'Lora', serif", fontSize: 9.5, color: C.textDim, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: C.goldBright }}>⏳</span>
            SINAVA: <span style={{ color: C.textMid, fontWeight: 600 }}>
              {examDue === 0 ? "bu hafta!" : `${examDue} ay kaldı`}
            </span>
          </div>
        </Card>

        {/* ── BU HAFTA DERSLERİ ── */}
        <SectionTitle>BU HAFTA DERSLERİ</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {lessons.map(([id, l]) => {
            const locked = !l.available;
            const spent = !l.can_attend_today;
            const disabled = busy || locked || spent;
            return (
              <button key={id} disabled={disabled} onClick={() => attendLesson(id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  background: "transparent", border: "none", cursor: disabled ? "default" : "pointer",
                  opacity: locked ? 0.35 : spent ? 0.55 : 1, padding: 0,
                }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 30%, #2A1F0C, #14100A)",
                  border: `2px solid ${spent || locked ? C.goldBorder : C.gold}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                  boxShadow: spent || locked ? "none" : `0 0 14px rgba(201,168,76,0.3)`,
                }}>{l.icon}</div>
                <span style={{
                  fontFamily: "'Cinzel', serif", fontSize: 7.5, fontWeight: 700,
                  letterSpacing: "0.08em", color: spent || locked ? C.textDim : C.text,
                  textAlign: "center", lineHeight: 1.3, textTransform: "uppercase",
                }}>{l.name.replace(" & ", " &\n")}</span>
                {locked && <span style={{ fontSize: 7, color: C.textDim }}>{l.min_age} yaş</span>}
              </button>
            );
          })}
        </div>
        {lessons.some(([, l]) => !l.can_attend_today) && (
          <p style={{ fontFamily: "'Lora', serif", fontSize: 9, color: C.textDim, fontStyle: "italic", textAlign: "center", margin: "8px 0 0" }}>
            Bu haftanın dersi alındı — ders zamanı ilerletir, haftaya yeni ders.
          </p>
        )}

        {/* ── ÖĞRENCİ TOPLULUKLARI ── */}
        <SectionTitle>ÖĞRENCİ TOPLULUKLARI</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {clubs.map(([id, c]) => {
            const joined = c.joined;
            const canJoin = c.can_join;
            return (
              <button key={id} disabled={busy || (!joined && !canJoin)}
                onClick={() => clubAction(id, joined)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  background: joined ? "rgba(201,168,76,0.1)" : C.card,
                  border: `1px solid ${joined ? C.gold : C.goldBorder}`,
                  borderRadius: 10, padding: "12px 6px",
                  cursor: "pointer", opacity: !joined && !canJoin ? 0.45 : 1,
                  position: "relative",
                }}>
                {joined && (
                  <span style={{
                    position: "absolute", top: 5, right: 5,
                    fontFamily: "'Cinzel', serif", fontSize: 6.5, fontWeight: 700,
                    letterSpacing: "0.12em", color: "#0A0A0A",
                    background: C.gold, borderRadius: 3, padding: "1.5px 4px",
                  }}>ÜYE</span>
                )}
                <span style={{ fontSize: 21 }}>{c.icon}</span>
                <span style={{
                  fontFamily: "'Cinzel', serif", fontSize: 8, fontWeight: 700,
                  letterSpacing: "0.06em", color: joined ? C.goldBright : C.text,
                  textAlign: "center", lineHeight: 1.3, textTransform: "uppercase",
                }}>{c.name}</span>
                <span style={{ fontFamily: "'Lora', serif", fontSize: 7.5, color: C.textDim, textAlign: "center" }}>
                  {joined ? "ayrılmak için dokun"
                    : canJoin ? "katılmak için dokun"
                    : `${c.join_req.stat === "charisma" ? "Karizma" : c.join_req.stat === "strength" ? "Güç" : "Zeka"} ${c.join_req.min_val}+ gerek`}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── SINAV DURUMU ── */}
        <SectionTitle>SINAV DURUMU</SectionTitle>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {[0, 1, 2].map((i) => {
              const ex = examHist[i];
              const lessonMeta = ex ? summary.lessons?.[ex.lesson] : null;
              return (
                <div key={i} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  padding: "9px 4px", borderRadius: 8,
                  background: C.card2, border: `1px solid ${C.goldBorder}`,
                  opacity: ex ? 1 : 0.35,
                }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 7.5, color: C.textDim, letterSpacing: "0.1em" }}>
                    {ex ? (lessonMeta?.icon || "📜") : `${i + 1}. SINAV`}
                  </span>
                  {ex ? (
                    <>
                      <span style={{ fontSize: 15 }}>{ex.passed ? "✅" : "❌"}</span>
                      <span style={{
                        fontFamily: "'Cinzel', serif", fontSize: 8, fontWeight: 700,
                        color: ex.passed ? C.green : C.red, letterSpacing: "0.1em",
                      }}>{ex.passed ? "GEÇTİ" : "KALDI"}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 13, color: C.textDim }}>—</span>
                  )}
                </div>
              );
            })}
            {/* Sıradaki sınav */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              padding: "9px 4px", borderRadius: 8,
              background: "rgba(201,168,76,0.08)", border: `1px dashed ${C.gold}88`,
            }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 7.5, color: C.gold, letterSpacing: "0.1em" }}>SIRADAKİ</span>
              <span style={{ fontSize: 15 }}>⏳</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 7, fontWeight: 700, color: C.goldBright, textAlign: "center", lineHeight: 1.4 }}>
                {examDue === 0 ? "BU HAFTA" : `${examDue} HAFTA SONRA`}
              </span>
            </div>
          </div>
        </Card>

        {/* ── R5.2: SINIF SIRALAMASI ── */}
        {summary.rekabet?.standings?.length > 0 && (
          <>
            <SectionTitle right={
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 7.5, color: C.textDim, letterSpacing: "0.12em" }}>
                {summary.rekabet.weeks_left > 0
                  ? `DÖNEM SONUNA ${summary.rekabet.weeks_left} HAFTA`
                  : "DÖNEM KAPANIYOR"}
              </span>
            }>SINIF SIRALAMASI</SectionTitle>
            <Card>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {summary.rekabet.standings.map((r) => (
                  <div key={r.rank} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 9px", borderRadius: 8,
                    background: r.is_player ? "rgba(201,168,76,0.10)" : "transparent",
                    border: r.is_player ? `1px solid ${C.gold}55` : "1px solid transparent",
                  }}>
                    <span style={{
                      fontFamily: "'Cinzel', serif", fontSize: 10, fontWeight: 700,
                      width: 20, color: r.rank === 1 ? C.goldBright : C.textDim,
                    }}>{r.rank === 1 ? "👑" : `${r.rank}.`}</span>
                    <span style={{
                      flex: 1, fontFamily: "'Lora', serif", fontSize: 11,
                      color: r.is_player ? C.goldBright : C.text,
                      fontWeight: r.is_player ? 700 : 400,
                    }}>{r.name}{r.is_player ? " (sen)" : ""}</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9.5, color: C.textMid }}>
                      {r.score} puan
                    </span>
                  </div>
                ))}
              </div>
              {summary.rekabet.last_term && (
                <div style={{
                  marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.goldBorder}`,
                  fontFamily: "'Lora', serif", fontSize: 9.5, color: C.textDim, fontStyle: "italic",
                }}>
                  Geçen dönem: {summary.rekabet.last_term.player_rank}. oldun
                  {summary.rekabet.last_term.player_rank !== 1 &&
                    ` — birinci ${summary.rekabet.last_term.first_name}`}.
                </div>
              )}
            </Card>
          </>
        )}

        {/* ── HOCALARIM ── */}
        <SectionTitle>HOCALARIM</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {lessons.filter(([, l]) => l.available).map(([id, l]) => {
            const t = TEACHERS[id] || { name: "Hoca", icon: "🧔" };
            const rel = l.teacher_relation || 0;
            return (
              <div key={id} style={{
                display: "flex", alignItems: "center", gap: 10,
                background: C.card, border: `1px solid ${C.goldBorder}`,
                borderRadius: 10, padding: "9px 11px",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: "radial-gradient(circle at 35% 30%, #2A1F0C, #14100A)",
                  border: `1.5px solid ${C.goldBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
                }}>{t.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10.5, fontWeight: 700, color: C.text }}>
                    {t.name}
                  </div>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: 8.5, color: C.textDim }}>
                    {l.name} · {l.count} ders
                  </div>
                  {(summary.teacher_memory?.[id] || []).length > 0 && (
                    <div style={{
                      fontFamily: "'Lora', serif", fontSize: 8, color: C.gold,
                      fontStyle: "italic", marginTop: 2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      "…{summary.teacher_memory[id][summary.teacher_memory[id].length - 1]}"
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                  <Stars value={rel} />
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8.5, color: rel >= 0 ? C.green : C.red }}>
                    İlişki {rel >= 0 ? "+" : ""}{rel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── MEVSİMSEL ETKİNLİKLER ── */}
        {(summary.seasonal_activities || []).length > 0 && (
          <>
            <SectionTitle right={
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 7.5, color: C.textDim, letterSpacing: "0.12em" }}>
                {season.toUpperCase()}
              </span>
            }>MEVSİMSEL ETKİNLİKLER</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {summary.seasonal_activities.map((a) => (
                <button key={a.id} disabled={busy || a.done_this_week}
                  onClick={() => doSeasonal(a.id)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                    background: a.done_this_week ? C.card2 : C.card,
                    border: `1px solid ${a.done_this_week ? C.goldBorder : C.gold}66`,
                    borderRadius: 10, padding: "11px 6px", cursor: "pointer",
                    opacity: a.done_this_week ? 0.5 : 1,
                  }}>
                  <span style={{ fontSize: 19 }}>{a.icon}</span>
                  <span style={{
                    fontFamily: "'Cinzel', serif", fontSize: 7.5, fontWeight: 700,
                    color: C.text, textAlign: "center", lineHeight: 1.3,
                    letterSpacing: "0.05em", textTransform: "uppercase",
                  }}>{a.name}</span>
                  <span style={{ fontFamily: "'Lora', serif", fontSize: 7, color: C.textDim }}>
                    {a.done_this_week ? "✓ yapıldı" : Object.entries(a.stat_xp || {}).map(([k, v]) => `+${v} ${k.slice(0, 5)}`).join(" ")}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <LessonEventModal event={lessonEvent?.event} busy={busy} onChoose={chooseLessonEvent} />
    </div>
  );
}
