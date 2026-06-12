/**
 * Chronicle.jsx — Küllerin Kroniği
 * Artık gerçek chronicle_summary API'sini kullanıyor:
 *  - /game/chronicle/summary  → haftalık özet + önemli olaylar
 *  - /game/chronicle/full     → dönem gruplu tam geçmiş
 */
import { useEffect, useState } from "react";
import { useGame } from "@/lib/GameContext";
import { PageHeader } from "@/components/ui/Kit";
import { api } from "@/lib/api";
import { ScrollText, Star, Loader2, ChevronDown, ChevronUp, BookOpen } from "lucide-react";

const TYPE_LABEL = {
  başlangıç: "Başlangıç", ölüm: "Ölüm", doğum: "Doğum",
  evlilik: "Evlilik", tahta_çıkış: "Taht", savaş_ilanı: "Savaş",
  barış: "Barış", isyan: "İsyan", kıtlık: "Kıtlık",
  haydut_baskını: "Baskın", şenlik: "Şenlik", yolculuk: "Yolculuk",
  ticaret: "Ticaret", çalışma: "Emek", suç: "Suç",
  suç_yakalandı: "Yakalandı", meslek_değişimi: "Meslek",
  görev_tamamlandı: "Görev", savaş_zaferi: "Zafer",
  misilleme: "Misilleme", kaçırma: "Kaçırma", dedikodu: "Dedikodu",
  enforcement: "Baskı",
};

const TYPE_COLOR = {
  ölüm: "border-red-900 text-red-400",
  doğum: "border-emerald-900 text-emerald-400",
  evlilik: "border-pink-900 text-pink-300",
  tahta_çıkış: "border-amber-900 text-amber-400",
  savaş_ilanı: "border-red-900 text-red-400",
  savaş_zaferi: "border-amber-800 text-amber-300",
  barış: "border-emerald-900 text-emerald-300",
  isyan: "border-red-900 text-red-300",
  başlangıç: "border-orange-900 text-orange-400",
  ticaret: "border-stone-700 text-stone-400",
  görev_tamamlandı: "border-blue-900 text-blue-300",
  kaçırma: "border-purple-900 text-purple-300",
};

function EventRow({ event }) {
  const colorClass = TYPE_COLOR[event.type] || "border-stone-700 text-stone-400";
  const label = TYPE_LABEL[event.type] || event.type;
  return (
    <div className="card-frame px-4 py-3 flex gap-3 items-start">
      <div className="shrink-0 w-16 text-right">
        <div className="label-tiny">Gün</div>
        <div className="text-stone-200 font-heading">{event.day}</div>
      </div>
      <div className="flex-1">
        <span className={`text-xs px-2 py-0.5 border rounded-sm font-heading tracking-wider ${colorClass}`}>
          {label}
        </span>
        {/* Narrative varsa onu göster (zengin, kişisel metin) */}
        {event.narrative ? (
          <>
            <div className="text-sm text-stone-200 mt-1.5 leading-relaxed">{event.narrative}</div>
            <div className="text-[10px] text-stone-700 mt-1">{event.text}</div>
          </>
        ) : (
          <div className="text-sm text-stone-200 mt-1.5">{event.text}</div>
        )}
      </div>
    </div>
  );
}

function PeriodGroup({ period, events, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-stone-800 rounded-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-stone-900/50 hover:bg-stone-900 transition-colors"
      >
        <span className="font-heading text-xs text-stone-400 tracking-wider">{period}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-stone-600">{events.length} olay</span>
          {open
            ? <ChevronUp className="w-3.5 h-3.5 text-stone-600" />
            : <ChevronDown className="w-3.5 h-3.5 text-stone-600" />
          }
        </div>
      </button>
      {open && (
        <div className="space-y-1 p-2">
          {events.map(e => <EventRow key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}

function YearStory({ yearData, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-stone-800 rounded-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-900/60 hover:bg-stone-900 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-amber-700" />
          <span className="font-heading text-xs text-stone-300 tracking-wider">{yearData.year_label}</span>
          <span className="text-[10px] text-stone-600">{yearData.event_count} olay</span>
        </div>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-stone-600" />
          : <ChevronDown className="w-3.5 h-3.5 text-stone-600" />
        }
      </button>
      {open && (
        <div className="px-4 py-3 bg-stone-950/30 border-t border-stone-800">
          <p className="text-sm text-stone-300 leading-relaxed italic">{yearData.story}</p>
        </div>
      )}
    </div>
  );
}

// ── S3 Chronicle 2.0: Hayat Romanı perdeleri ─────────────────────────────────
function NovelActs({ director }) {
  if (!director?.perdeler?.length) return null;
  const yayCls = {
    kriz: "text-red-400 border-red-900/50", doruk: "text-orange-400 border-orange-900/50",
    cozulme: "text-sky-400 border-sky-900/50", yukselis: "text-emerald-400 border-emerald-900/50",
    durgun: "text-stone-400 border-stone-700", kurulus: "text-amber-400 border-amber-900/50",
  }[director.aktif_yay] || "text-stone-400 border-stone-700";
  return (
    <div className="card-frame p-4 space-y-2 border-purple-900/30 bg-purple-950/5">
      <div className="flex items-center justify-between">
        <div className="label-tiny text-purple-400">Hayat Romanı</div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] px-1.5 py-0.5 border rounded-sm font-heading tracking-wider ${yayCls}`}>
            {director.yay_label?.toUpperCase()}
          </span>
          <span className="text-[10px] text-stone-600" title="Dramatik gerilim">
            🌡 {director.gerilim}
          </span>
        </div>
      </div>
      <div className="space-y-1">
        {[...director.perdeler].reverse().slice(0, 6).map((p) => (
          <div key={p.no} className={`flex items-baseline gap-2 text-xs ${p.bitis == null ? "text-stone-200" : "text-stone-500"}`}>
            <span className="font-heading tracking-wider">{p.baslik}</span>
            <span className="text-[9px] text-stone-600 ml-auto shrink-0">
              {1247 + Math.floor(p.baslangic / 12)}{p.bitis != null ? `–${1247 + Math.floor(p.bitis / 12)}` : " — sürüyor"}
            </span>
          </div>
        ))}
      </div>
      {(director.nemesisler || []).length > 0 && (
        <div className="pt-1.5 border-t border-stone-800">
          {director.nemesisler.map((n) => (
            <div key={n.id} className="text-[11px] text-red-300/90 italic">
              🗡 {n.name} seni unutmadı — gölgesi üstünde.
            </div>
          ))}
        </div>
      )}
      {director.bekleyen_tohum > 0 && (
        <div className="text-[10px] text-stone-600 italic">
          🌰 Geçmişte ekilmiş {director.bekleyen_tohum} tohum hâlâ toprağın altında…
        </div>
      )}
    </div>
  );
}

export default function Chronicle() {
  const { state } = useGame();
  const [summary, setSummary] = useState(null);
  const [full, setFull] = useState(null);
  const [director, setDirector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("full"); // "summary" | "full"

  useEffect(() => {
    if (!state) return;
    setLoading(true);
    Promise.all([
      api.get("/game/chronicle/summary").catch(() => null),
      api.get("/game/chronicle/full?limit=80").catch(() => null),
      api.get("/game/yonetmen").catch(() => null),
    ]).then(([s, f, d]) => {
      if (s?.data) setSummary(s.data);
      if (f?.data) setFull(f.data);
      if (d?.data) setDirector(d.data);
    }).finally(() => setLoading(false));
  }, [state]);

  // Fallback: API yoksa state.history kullan
  const fallbackEvents = [...(state?.history || [])].reverse();

  return (
    <div className="page-shell space-y-6 rise-in">
      {/* Başlık */}
      <PageHeader
        kicker="Tarih"
        icon="📜"
        title="Küllerin Kroniği"
        sub="Yaşanmış her şey burada — senin romanın, mürekkep kurudukça."
      />

      {/* ── Güncel Dünya Durumu ── */}
      {(() => {
        const kingdoms = state?.world?.kingdoms || [];
        const warPairs = [];
        const seen = new Set();
        for (const k of kingdoms.filter(k => k.at_war_with?.length > 0)) {
          for (const eid of (k.at_war_with || [])) {
            const key = [k.id, eid].sort().join("-");
            if (!seen.has(key)) {
              seen.add(key);
              const enemy = kingdoms.find(x => x.id === eid);
              if (enemy) warPairs.push(`${k.name} ⚔️ ${enemy.name}`);
            }
          }
        }
        if (!warPairs.length) return null;
        return (
          <div className="card-frame p-4 border-red-900/50 bg-red-950/10 space-y-2">
            <div className="label-tiny text-red-400">Güncel — Aktif Savaşlar</div>
            {warPairs.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-stone-300">
                <span className="text-red-400">⚔️</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {loading && (
        <div className="flex items-center gap-2 text-stone-600 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Kronik yükleniyor…
        </div>
      )}

      {/* ── S3: Hayat Romanı — perdeler, gerilim, nemesis ── */}
      <NovelActs director={director} />

      {/* ── Yılın Özeti (narrative_engine'den) ── */}
      {summary?.brief && (
        <div className="card-frame p-4 space-y-2 border-amber-900/30 bg-amber-950/5">
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-heading text-stone-300 text-sm tracking-wider">BU YIL — HİKAYEN</span>
          </div>
          <p className="text-sm text-stone-300 leading-relaxed">{summary.brief}</p>
        </div>
      )}

      {/* ── Önemli Anlar ── */}
      {summary?.important_events?.length > 0 && (
        <div className="card-frame p-4 space-y-2">
          <div className="label-tiny">Öne Çıkan Anlar</div>
          {summary.important_events.map((e, i) => (
            <div key={i} className="py-2 border-b border-stone-900 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-1.5 py-0.5 border rounded-sm font-heading ${TYPE_COLOR[e.type] || "border-stone-700 text-stone-500"}`}>
                  {TYPE_LABEL[e.type] || e.type}
                </span>
                <span className="text-[10px] text-stone-600">Gün {e.day}</span>
              </div>
              {/* Narrative varsa onu göster */}
              <p className="text-sm text-stone-300 leading-relaxed">
                {e.narrative || e.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Yıllara Göre Hayat Hikayesi ── */}
      {full?.year_stories?.length > 0 && (
        <div className="space-y-2">
          <div className="label-tiny">Hayat Hikayesi — Yıllara Göre</div>
          {full.year_stories.map((ys, i) => (
            <YearStory
              key={ys.year_idx}
              yearData={ys}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}

      {/* ── Dönem Gruplu Tam Geçmiş ── */}
      {full?.periods?.length > 0 ? (
        <div className="space-y-2">
          <div className="label-tiny">Tüm Geçmiş ({full.total} olay)</div>
          {full.periods.map((p, i) => (
            <PeriodGroup
              key={p.period}
              period={p.period}
              events={p.events}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      ) : !loading && (
        /* Fallback düz liste */
        <div className="space-y-2">
          {fallbackEvents.map(e => <EventRow key={e.id} event={e} />)}
          {fallbackEvents.length === 0 && (
            <div className="text-stone-500">Henüz tarih yazılmadı.</div>
          )}
        </div>
      )}
    </div>
  );
}
