import { useEffect, useState } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen, Dumbbell, Users, Star, Calendar,
  ChevronRight, Lock, CheckCircle2, AlertCircle,
  Sparkles, Trophy, Clock, Leaf
} from "lucide-react";

// ─── helpers ───────────────────────────────────────────────────────────────
const LESSON_COLORS = {
  din:       { border: "border-amber-900",  text: "text-amber-400",  bg: "bg-amber-950/40"  },
  matematik: { border: "border-blue-900",   text: "text-blue-400",   bg: "bg-blue-950/40"   },
  edebiyat:  { border: "border-purple-900", text: "text-purple-400", bg: "bg-purple-950/40" },
  beden:     { border: "border-emerald-900",text: "text-emerald-400",bg: "bg-emerald-950/40"},
};

const CLUB_COLORS = {
  medrese_korosu: { border: "border-amber-800",   text: "text-amber-300"  },
  gures_kulubu:   { border: "border-red-800",     text: "text-red-300"    },
  cirak_loncasi:  { border: "border-stone-600",   text: "text-stone-300"  },
};

const SEASON_COLORS = {
  "İlkbahar": "text-emerald-400",
  "Yaz":      "text-amber-400",
  "Sonbahar": "text-orange-400",
  "Kış":      "text-sky-300",
};

function StatBar({ label, value, max = 10, color = "bg-amber-700" }) {
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-stone-500 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-stone-900 rounded-sm overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${w}%` }} />
      </div>
      <span className="text-stone-400 w-4 text-right">{value}</span>
    </div>
  );
}

function XpBadge({ stat_xp, skill_xp }) {
  const items = [
    ...Object.entries(stat_xp || {}).map(([k, v]) => ({ label: k.slice(0,3).toUpperCase(), val: v, color: "text-amber-400" })),
    ...Object.entries(skill_xp || {}).map(([k, v]) => ({ label: k.slice(0,3).toUpperCase(), val: v, color: "text-emerald-400" })),
  ];
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.map(i => (
        <span key={i.label} className={`text-[10px] font-heading px-1.5 py-0.5 rounded-sm bg-stone-900 ${i.color}`}>
          +{i.val} {i.label}
        </span>
      ))}
    </div>
  );
}

// ─── sub-sections ──────────────────────────────────────────────────────────

function LessonsSection({ summary, onAction, busy }) {
  const { lessons } = summary;
  const canAttend = Object.values(lessons).some(l => l.can_attend_today && l.available);

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-amber-500" />
        <h2 className="font-heading text-stone-200 tracking-wider">DERSLER</h2>
        {!canAttend && (
          <span className="text-[10px] text-stone-600 border border-stone-800 px-2 py-0.5 rounded-sm font-heading">
            Bu hafta işlendi
          </span>
        )}
        {summary.exam_due_in <= 1 && (
          <span className="text-[10px] text-red-400 border border-red-900 px-2 py-0.5 rounded-sm font-heading animate-pulse">
            ⚠ Sınav yaklaşıyor!
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(lessons).map(([lid, lesson]) => {
          const colors = LESSON_COLORS[lid] || LESSON_COLORS.din;
          const locked = !lesson.available;
          const doneToday = !lesson.can_attend_today;

          return (
            <div
              key={lid}
              className={`card-frame p-4 border ${colors.border} ${locked ? "opacity-50" : ""} ${colors.bg}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{lesson.icon}</span>
                  <div>
                    <div className={`font-heading text-sm ${colors.text}`}>{lesson.name}</div>
                    <div className="text-[10px] text-stone-500">
                      {lesson.count} ders işlendi
                    </div>
                  </div>
                </div>
                {locked
                  ? <Lock className="w-4 h-4 text-stone-600" />
                  : doneToday
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  : null
                }
              </div>

              <p className="text-xs text-stone-400 mb-2">{lesson.description}</p>
              <XpBadge stat_xp={lesson.stat_xp} skill_xp={lesson.skill_xp} />

              {lesson.teacher_relation > 0 && (
                <div className="mt-2 text-[10px] text-stone-500">
                  Hoca ilişkisi: <span className="text-amber-400">{lesson.teacher_relation}</span>
                </div>
              )}

              {!locked && !doneToday && (
                <button
                  onClick={() => onAction("lesson", lid)}
                  disabled={busy}
                  className={`mt-3 w-full py-2 font-heading text-[11px] tracking-widest btn-ember disabled:opacity-50 flex items-center justify-center gap-1`}
                >
                  <ChevronRight className="w-3 h-3" />
                  Derse Katıl
                </button>
              )}
              {locked && (
                <div className="mt-3 text-[10px] text-stone-600 text-center font-heading">
                  {lesson.min_age} YAŞ GEREKLİ
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ClubsSection({ summary, onAction, busy }) {
  const { clubs } = summary;
  const myClubs = Object.entries(clubs).filter(([, c]) => c.joined).map(([id]) => id);

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-purple-400" />
        <h2 className="font-heading text-stone-200 tracking-wider">ÖĞRENCİ TOPLULUKLARI</h2>
        <span className="text-[10px] text-stone-600">{myClubs.length}/2 üyelik</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Object.entries(clubs).map(([cid, club]) => {
          const colors = CLUB_COLORS[cid] || { border: "border-stone-700", text: "text-stone-300" };
          return (
            <div key={cid} className={`card-frame p-4 border ${colors.border}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-2xl">{club.icon}</span>
                {club.joined && (
                  <span className="text-[9px] font-heading tracking-wider text-emerald-400 border border-emerald-900 px-1.5 py-0.5 rounded-sm">
                    ÜYE
                  </span>
                )}
              </div>
              <div className={`font-heading text-sm ${colors.text} mb-1`}>{club.name}</div>
              <p className="text-[11px] text-stone-500 mb-2">{club.description}</p>

              <div className="text-[10px] text-stone-600 mb-2">
                Haftalık pasif XP:
                <XpBadge
                  stat_xp={club.weekly_xp?.stat_xp}
                  skill_xp={club.weekly_xp?.skill_xp}
                />
              </div>

              {club.joined ? (
                <button
                  onClick={() => onAction("leave_club", cid)}
                  disabled={busy}
                  className="w-full py-1.5 text-[10px] font-heading tracking-wider text-stone-500 hover:text-stone-300 border border-stone-800 hover:border-stone-600 transition-colors"
                >
                  Ayrıl
                </button>
              ) : club.can_join ? (
                <button
                  onClick={() => onAction("join_club", cid)}
                  disabled={busy}
                  className="w-full py-1.5 text-[10px] font-heading tracking-wider btn-ember disabled:opacity-50"
                >
                  Katıl
                </button>
              ) : (
                <div className="text-[10px] text-stone-700 text-center font-heading mt-1">
                  {club.joined ? "" : "Stat gereksinimi karşılanmıyor"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SeasonalSection({ summary, onAction, busy }) {
  const { seasonal_activities, current_season } = summary;
  const seasonColor = SEASON_COLORS[current_season] || "text-stone-300";

  if (!seasonal_activities?.length) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Leaf className="w-4 h-4 text-emerald-500" />
        <h2 className="font-heading text-stone-200 tracking-wider">MEVSİMSEL AKTİVİTELER</h2>
        <span className={`text-[11px] font-heading ${seasonColor}`}>{current_season}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {seasonal_activities.map((act) => (
          <div key={act.id} className="card-frame p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{act.icon}</span>
              <div className="font-heading text-sm text-stone-200">{act.name}</div>
            </div>
            <p className="text-xs text-stone-400 mb-2">{act.desc}</p>
            <XpBadge stat_xp={act.stat_xp} skill_xp={act.skill_xp} />
            {act.done_this_week ? (
              <div className="mt-3 w-full py-2 font-heading text-[11px] tracking-widest text-center text-stone-500 border border-stone-700 rounded">
                ✓ Bu hafta yapıldı
              </div>
            ) : (
              <button
                onClick={() => onAction("seasonal", act.id)}
                disabled={busy}
                className="mt-3 w-full py-2 font-heading text-[11px] tracking-widest btn-ghost-ash disabled:opacity-50"
              >
                Katıl →
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SpecialEventBanner({ eventId, allEvents, onAction, busy, doneThistWeek }) {
  const event = allEvents?.find(e => e.id === eventId);
  if (!event) return null;
  return (
    <div className="card-frame p-4 border border-amber-700 bg-amber-950/20 animate-pulse-slow">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="font-heading text-amber-400 text-sm tracking-wider">ÖZEL OLAY!</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{event.icon}</span>
        <span className="font-heading text-stone-100">{event.name}</span>
      </div>
      <p className="text-xs text-stone-400 mb-3">{event.desc}</p>
      {doneThistWeek ? (
        <div className="w-full py-2 font-heading text-xs tracking-widest text-center text-stone-500 border border-stone-700 rounded">
          ✓ Bu etkinliğe zaten katıldın
        </div>
      ) : (
        <button
          onClick={() => onAction("event", event.id)}
          disabled={busy}
          className="w-full py-2 font-heading text-xs tracking-widest btn-ember disabled:opacity-50"
        >
          Katıl!
        </button>
      )}
    </div>
  );
}

function ExamHistory({ history }) {
  if (!history?.length) return null;
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-4 h-4 text-amber-500" />
        <h2 className="font-heading text-stone-400 text-xs tracking-wider">SON SINAVLAR</h2>
      </div>
      <div className="space-y-1">
        {history.slice().reverse().map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-stone-500">
            {e.passed
              ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              : <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
            }
            <span className="capitalize">{e.lesson}</span>
            <span className={e.passed ? "text-emerald-500" : "text-red-400"}>
              {e.passed ? "Geçti" : "Kaldı"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── result toast modal ────────────────────────────────────────────────────
function ResultModal({ result, onClose }) {
  if (!result) return null;
  const { result: r } = result;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur">
      <div className="card-frame p-6 max-w-sm w-full border border-amber-800 bg-stone-950">
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">
            {r.lesson ? "📖" : r.activity ? "🌿" : r.event ? "✨" : "✦"}
          </div>
          <div className="font-heading text-amber-400 text-lg">
            {r.lesson || r.activity || r.event}
          </div>
        </div>

        <p className="text-stone-300 text-sm text-center italic mb-4">"{r.flavor}"</p>

        {r.xp_gained && (
          <div className="mb-4">
            <div className="text-[10px] text-stone-500 font-heading mb-1">KAZANILAN XP</div>
            <XpBadge stat_xp={r.xp_gained.stat_xp} skill_xp={r.xp_gained.skill_xp} />
          </div>
        )}

        {r.money_bonus > 0 && (
          <div className="text-center text-amber-400 font-heading text-sm mb-3">
            +{r.money_bonus} Altın 💰
          </div>
        )}

        {r.leveled?.length > 0 && (
          <div className="mb-4 text-center">
            {r.leveled.map((l, i) => (
              <div key={i} className="text-emerald-400 font-heading text-xs">⬆ {l} seviye atladı!</div>
            ))}
          </div>
        )}

        {r.exam_result && (
          <div className={`text-center p-3 rounded-sm mb-4 ${r.exam_result.passed ? "bg-emerald-950 border border-emerald-800" : "bg-red-950 border border-red-900"}`}>
            <div className={`font-heading text-sm ${r.exam_result.passed ? "text-emerald-400" : "text-red-400"}`}>
              {r.exam_result.passed ? "SINAV BAŞARILI! 🎉" : "SINAV BAŞARISIZ"}
            </div>
            <div className="text-xs text-stone-400 mt-1 italic">"{r.exam_result.flavor}"</div>
          </div>
        )}

        <button onClick={onClose} className="w-full btn-ember py-2 font-heading text-xs tracking-widest">
          Devam
        </button>
      </div>
    </div>
  );
}

// ─── main page ─────────────────────────────────────────────────────────────
export default function School() {
  const { state } = useGame();
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("dersler"); // dersler | kulüpler | aktiviteler

  const player = state?.player;
  const isChild = player?.is_child;

  const loadSummary = () => {
    api.get("/game/school").then(({ data }) => setSummary(data)).catch(() => {});
  };

  useEffect(() => { loadSummary(); }, [state?.turn]);

  const onAction = async (type, id) => {
    setBusy(true);
    try {
      let res;
      if (type === "lesson")      res = await api.post(`/game/school/lesson/${id}`);
      else if (type === "join_club")  res = await api.post(`/game/school/club/${id}/join`);
      else if (type === "leave_club") res = await api.post(`/game/school/club/${id}/leave`);
      else if (type === "seasonal")   res = await api.post(`/game/school/seasonal/${id}`);
      else if (type === "event")      res = await api.post(`/game/school/event/${id}`);

      if (res?.data?.result) setResult(res.data);
      loadSummary();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  };

  if (!state) return null;

  if (!isChild) {
    return (
      <div className="space-y-4 rise-in">
        <div>
          <div className="label-tiny">Çocukluk</div>
          <h1 className="font-heading text-3xl text-stone-100">Mektep</h1>
        </div>
        <div className="card-frame p-6 text-center text-stone-500">
          <BookOpen className="w-8 h-8 mx-auto mb-3 text-stone-700" />
          <p className="font-heading text-stone-400">13 yaşını geçtin.</p>
          <p className="text-sm mt-1">Mektep günlerin geride kaldı.</p>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "dersler",    label: "Dersler",    icon: BookOpen  },
    { id: "kulüpler",   label: "Kulüpler",   icon: Users     },
    { id: "aktiviteler",label: "Aktiviteler",icon: Leaf      },
  ];

  return (
    <div className="space-y-6 rise-in">
      {/* header */}
      <div>
        <div className="label-tiny">Çocukluk</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-amber-500" /> Mektep
        </h1>
        <p className="text-stone-400 text-sm mt-1">
          {player.age} yaşındasın — dersler, topluluklar ve mevsimsel aktiviteler seni şekillendiriyor.
        </p>
      </div>

      {/* stats summary */}
      {summary && (
        <div className="card-frame p-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <StatBar label="STR"  value={player.stats?.strength    || 1} color="bg-red-700" />
            <StatBar label="INT"  value={player.stats?.intelligence || 1} color="bg-blue-700" />
            <StatBar label="CHA"  value={player.stats?.charisma     || 1} color="bg-amber-700" />
            <StatBar label="STA"  value={player.stats?.stamina      || 1} color="bg-emerald-700" />
          </div>
          <div className="mt-2 flex items-center gap-3 text-[10px] text-stone-500 font-heading">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Toplam {summary.total_lessons} ders
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {summary.exam_due_in > 0 ? `${summary.exam_due_in} haftada sınav` : "Bu hafta sınav!"}
            </span>
            <span className={`flex items-center gap-1 ${SEASON_COLORS[summary.current_season]}`}>
              <Leaf className="w-3 h-3" />
              {summary.current_season}
            </span>
          </div>
        </div>
      )}

      {/* pending special event banner */}
      {summary?.pending_special_event && (
        <SpecialEventBanner
          eventId={summary.pending_special_event}
          allEvents={summary.special_events}
          onAction={onAction}
          busy={busy}
          doneThistWeek={summary.special_event_done_this_week}
        />
      )}

      {/* tab nav */}
      <div className="flex border-b border-stone-800">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-heading text-xs tracking-wider border-b-2 transition-colors ${
              tab === t.id
                ? "border-amber-600 text-amber-400"
                : "border-transparent text-stone-500 hover:text-stone-300"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* tab content */}
      {summary && (
        <>
          {tab === "dersler" && (
            <LessonsSection summary={summary} onAction={onAction} busy={busy} />
          )}
          {tab === "kulüpler" && (
            <ClubsSection summary={summary} onAction={onAction} busy={busy} />
          )}
          {tab === "aktiviteler" && (
            <>
              <SeasonalSection summary={summary} onAction={onAction} busy={busy} />
              <ExamHistory history={summary.exam_history} />
            </>
          )}
        </>
      )}

      {/* result modal */}
      {result && (
        <ResultModal result={result} onClose={() => { setResult(null); loadSummary(); }} />
      )}
    </div>
  );
}
