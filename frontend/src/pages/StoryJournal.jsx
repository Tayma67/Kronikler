import { useEffect, useState, useCallback } from "react";
import { api, extractErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen, Loader2, Hourglass, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Sparkles, Clock, Dices,
} from "lucide-react";

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
    <span className="inline-flex items-center gap-1 text-[9px] text-purple-300 bg-purple-950/40 border border-purple-900 rounded-sm px-1.5 py-0.5 ml-2 shrink-0">
      <Dices className="w-2.5 h-2.5" /> {parts.join(" + ")}
    </span>
  );
}

function ArcLog({ log }) {
  const [open, setOpen] = useState(false);
  if (!log?.length) return null;
  return (
    <div className="pt-1">
      <button onClick={() => setOpen(!open)}
        className="text-[10px] text-stone-500 flex items-center gap-1">
        Geçmiş ({log.length}) {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5 border-l border-stone-800 pl-2.5">
          {log.map((l, i) => (
            <div key={i} className="text-[10px] leading-relaxed">
              <span className={l.basari === false ? "text-red-400/80" : "text-stone-400"}>
                ▸ {l.secim}
              </span>
              {l.sonuc && <p className="text-stone-500 italic">{l.sonuc}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveArc({ arc, busy, onChoose }) {
  return (
    <div className="border border-orange-900/40 bg-stone-950/40 rounded-sm p-3.5 space-y-3"
      data-testid={`story-active-${arc.arc_id}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm text-orange-300">{arc.title}</h3>
        {arc.deadline_weeks != null && (
          <span className={`text-[9px] flex items-center gap-1 px-1.5 py-0.5 rounded-sm border shrink-0 ${
            arc.deadline_weeks <= 2
              ? "text-red-300 border-red-800 bg-red-950/40 animate-pulse"
              : "text-stone-400 border-stone-700"}`}>
            <Clock className="w-2.5 h-2.5" /> {arc.deadline_weeks} hafta
          </span>
        )}
      </div>
      <p className="text-xs text-stone-300 leading-relaxed italic">{arc.step_text}</p>
      {arc.waiting ? (
        <div className="flex items-center gap-2 text-xs text-stone-500 border border-stone-800 rounded-sm px-3 py-2">
          <Hourglass className="w-3.5 h-3.5 animate-pulse" />
          Hikâye demleniyor — {arc.wait_weeks} hafta sonra devam edecek. Haftayı ilerlet.
        </div>
      ) : (
        <div className="space-y-1.5">
          {arc.choices.map((c) => (
            <button key={c.index} disabled={busy}
              onClick={() => onChoose(arc.arc_id, c.index)}
              className="w-full text-left text-xs px-3 py-2 rounded-sm border border-stone-700 text-stone-200 hover:border-orange-800 hover:bg-stone-900 transition-colors flex items-center justify-between">
              <span>{c.text}</span>
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
  const [journal, setJournal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastOutcome, setLastOutcome] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/story/journal");
      setJournal(data);
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
      }
      return data;
    });

  if (!journal) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-stone-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-5" data-testid="story-journal-page">
      <h1 className="text-lg font-heading text-stone-200 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-orange-500" /> Hikâyeler
      </h1>

      {lastOutcome?.result && (
        <div className={`border rounded-sm p-3 text-xs leading-relaxed italic ${
          lastOutcome.ok ? "border-emerald-900/50 bg-emerald-950/20 text-emerald-200"
                         : "border-red-900/50 bg-red-950/20 text-red-200"}`}>
          {lastOutcome.result}
        </div>
      )}

      {journal.offers.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-heading tracking-widest text-stone-500 uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Kapını Çalanlar
          </h2>
          {journal.offers.map((o) => (
            <div key={o.arc_id} className="border border-amber-900/40 bg-amber-950/10 rounded-sm p-3 space-y-2">
              <h3 className="font-heading text-sm text-amber-300">{o.title}</h3>
              <p className="text-xs text-stone-400 italic leading-relaxed">{o.hook}</p>
              <div className="flex gap-2">
                <button disabled={busy} onClick={() => onStart(o.arc_id)}
                  className="flex-1 py-1.5 rounded-sm text-xs font-heading border border-orange-800 text-orange-400 hover:bg-stone-900">
                  Hikâyeye Gir
                </button>
                <button disabled={busy} onClick={() => onDecline(o.arc_id)}
                  className="px-3 py-1.5 rounded-sm text-xs border border-stone-800 text-stone-500 hover:text-stone-300">
                  Geri Çevir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {journal.active.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xs font-heading tracking-widest text-stone-500 uppercase">
            Aktif Hikâyeler
          </h2>
          {journal.active.map((a) => (
            <ActiveArc key={a.arc_id} arc={a} busy={busy} onChoose={onChoose} />
          ))}
        </div>
      ) : journal.offers.length === 0 && (
        <div className="border border-dashed border-stone-800 rounded-sm p-6 text-center space-y-1">
          <BookOpen className="w-6 h-6 text-stone-700 mx-auto" />
          <p className="text-sm text-stone-400">Şu an seni bekleyen bir hikâye yok.</p>
          <p className="text-[11px] text-stone-600">
            Haftaları ilerlet — kader kapını çalacaktır. Bazı hikâyeler yaş, ün veya beceri ister.
          </p>
        </div>
      )}

      {journal.finished.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-heading tracking-widest text-stone-500 uppercase">
            Kapanan Defterler
          </h2>
          {journal.finished.map((f) => (
            <div key={f.arc_id} className="border border-stone-800/60 rounded-sm p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400 font-heading">{f.title}</span>
                {f.status === "tamamlandı" ? (
                  <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Tamamlandı
                  </span>
                ) : (
                  <span className="text-[9px] text-red-400/80 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {f.status === "süresi_doldu" ? "Süresi doldu"
                      : f.status === "yarım_kaldı" ? "Yarım kaldı (önceki nesil)"
                      : "Kötü bitti"}
                  </span>
                )}
              </div>
              <ArcLog log={f.log} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
