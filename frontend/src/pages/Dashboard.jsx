import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Heart, Apple, Flame, Clock, Scroll,
  AlertTriangle, TrendingUp, TrendingDown, Minus,
  Hourglass, Loader2, Swords, Crown, ChevronRight,
  Shield, Landmark, ChevronDown,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────
function reputationLabel(rep) {
  const r = Number(rep) || 0;
  if (r >= 80)  return { label: "Efsane",    color: "text-amber-400" };
  if (r >= 50)  return { label: "Saygın",    color: "text-emerald-400" };
  if (r >= 20)  return { label: "Tanınan",   color: "text-blue-400" };
  if (r >= 0)   return { label: "Tanınmayan",color: "text-stone-400" };
  if (r >= -20) return { label: "Güvenilmez",color: "text-orange-400" };
  return              { label: "Sürgün",    color: "text-red-400" };
}

// ── Zaman atlaması seçenekleri ───────────────────────────────────────────────
const PERIODS = [
  { label: "Hafta", weeks: 1,  desc: "7 gün" },
  { label: "Ay",    weeks: 4,  desc: "4 hafta" },
  { label: "Yıl",   weeks: 52, desc: "52 hafta" },
];

// Sadece oyuncuyu doğrudan etkileyen olaylar — NPC rutin aktiviteleri hariç

const EVENT_ICONS = {
  // Dünya olayları
  doğum: "👶", ölüm: "💀", evlilik: "💍", savaş_ilanı: "⚔️", barış: "🕊️",
  kıtlık: "🌵", şenlik: "🎉", kral_değişimi: "👑", tahta_çıkış: "👑",
  görev_tamamlandı: "✅", savaş_zaferi: "🏆", faction_savaş: "⚔️",
  enforcement: "⚖️", starvation_warning: "🍞", misilleme: "😤",
  kaçırma: "⛓️", nesil_devri: "🌿", miras: "📜",
  // Oyuncu eylemleri
  çalışma: "🔨", ticaret: "🪙", yolculuk: "🚶", meslek_değişimi: "🔄",
  suç: "🗡️", suç_yakalandı: "🚨", dedikodu: "🗣️", başlangıç: "🌅",
  okul: "📚", beceri: "⭐", ilişki: "🤝", haydut_baskını: "💥",
  isyan: "🔥", hastalık: "🤒", iyileşme: "💚",
};

const EVENT_COLORS = {
  ölüm:              "border-red-500",
  savaş_ilanı:       "border-red-600",
  faction_savaş:     "border-red-700",
  savaş_zaferi:      "border-amber-500",
  kral_değişimi:     "border-amber-400",
  tahta_çıkış:       "border-amber-400",
  evlilik:           "border-pink-500",
  doğum:             "border-emerald-500",
  nesil_devri:       "border-emerald-600",
  görev_tamamlandı:  "border-blue-500",
  miras:             "border-violet-500",
  kaçırma:           "border-purple-600",
  misilleme:         "border-orange-600",
  başlangıç:         "border-orange-500",
  barış:             "border-sky-500",
  şenlik:            "border-yellow-500",
  çalışma:           "border-stone-600",
  ticaret:           "border-emerald-700",
  yolculuk:          "border-stone-500",
  suç:               "border-red-800",
  suç_yakalandı:     "border-red-700",
  enforcement:       "border-amber-700",
  starvation_warning:"border-orange-700",
};

// ── sub-components ────────────────────────────────────────────────────────
function StatBar({ icon: Icon, label, value, max = 100, warn = false, color = "bg-amber-700" }) {
  const pct = Math.max(0, Math.min(100, ((Number(value) || 0) / (Number(max) || 100)) * 100));
  return (
    <div className={`flex items-center gap-2 px-3 py-2 card-frame ${warn ? "border-red-900 bg-red-950/20" : ""}`}>
      <Icon className={`w-3.5 h-3.5 shrink-0 ${warn ? "text-red-400" : "text-stone-500"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-stone-500 font-heading tracking-wider">{label}</span>
          <span className={warn ? "text-red-400 font-heading" : "text-stone-300"}>{Number(value) || 0}</span>
        </div>
        <div className="h-1 bg-stone-900 rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function AlertBanner({ type, text, icon }) {
  const styles = {
    urgent: "border-red-800 bg-red-950/30 text-red-300",
    high:   "border-amber-800 bg-amber-950/20 text-amber-300",
    normal: "border-stone-700 bg-stone-900/20 text-stone-300",
  };
  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 border rounded-sm text-sm ${styles[type] || styles.normal}`}>
      <span className="text-base shrink-0 leading-none mt-0.5">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

// Bitlife tarzı olay kartı
function EventCard({ event, isNew = false }) {
  const icon  = EVENT_ICONS[event?.type]   || "📜";
  const color = EVENT_COLORS[event?.type]  || "border-stone-700";
  return (
    <div className={`flex gap-3 px-4 py-3 border-l-2 ${color} transition-colors ${isNew ? "bg-amber-950/10" : ""}`}>
      <span className="text-lg shrink-0 leading-none mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 leading-snug">{event?.text || "Bilinmeyen olay"}</p>
        <span className="text-[10px] text-stone-600 font-heading tracking-wider">Gün {event?.day ?? "—"}</span>
      </div>
      {isNew && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2" />}
    </div>
  );
}

// Yıl özeti kartı (yıl atlamasından sonra)
function YearSummaryCard({ summary, onDismiss }) {
  const [open, setOpen] = useState(false);
  const counts = {};
  for (const ev of summary.events) {
    counts[ev.type] = (counts[ev.type] || 0) + 1;
  }
  const highlights = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, n]) => `${EVENT_ICONS[type] || "📜"} ${n}x ${type.replace(/_/g, " ")}`);
  const topEvents = summary.events
    .filter(ev => ["ölüm", "evlilik", "savaş_ilanı", "savaş_zaferi", "kral_değişimi", "nesil_devri"].includes(ev.type))
    .slice(0, 4);

  return (
    <div className="card-frame border-amber-900/60 bg-amber-950/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌟</span>
          <div>
            <div className="font-heading text-amber-400 text-sm tracking-wider">YIL ÖZETİ</div>
            <div className="text-[10px] text-stone-500">{summary.totalWeeks} haftalık dönem • {summary.events.length} olay</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(o => !o)} className="text-[10px] text-stone-500 hover:text-stone-300 font-heading tracking-wider">
            {open ? "KAPAT" : "DETAY"}
          </button>
          <button onClick={onDismiss} className="text-stone-700 hover:text-stone-400 text-lg leading-none">×</button>
        </div>
      </div>
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {highlights.map((h, i) => (
          <span key={i} className="text-[10px] text-stone-400 bg-stone-900 px-2 py-0.5 rounded-sm">{h}</span>
        ))}
      </div>
      {open && topEvents.length > 0 && (
        <div className="border-t border-stone-800 divide-y divide-stone-900">
          {topEvents.map((ev, i) => <EventCard key={i} event={ev} />)}
        </div>
      )}
    </div>
  );
}

function WorldAlerts({ state }) {
  const kingdoms  = state?.world?.kingdoms  || [];
  const factions  = state?.world?.factions  || [];

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

  const factionWarPairs = [];
  const seenF = new Set();
  for (const f of factions.filter(f => f.at_war_with?.length > 0)) {
    for (const eid of (f.at_war_with || [])) {
      const key = [f.id, eid].sort().join("-");
      if (!seenF.has(key)) {
        seenF.add(key);
        const enemy = factions.find(x => x.id === eid);
        if (enemy) factionWarPairs.push(`${f.name} ⚔️ ${enemy.name}`);
      }
    }
  }

  const history = Array.isArray(state?.history) ? state.history : [];
  const lastCrown = [...history].reverse().find(e =>
    e.type === "kral_değişimi" || e.type === "tahta_çıkış"
  );

  const items = [
    ...warPairs.map(t => ({ icon: <Swords className="w-3.5 h-3.5 text-red-500 shrink-0" />, text: t })),
    ...factionWarPairs.map(t => ({ icon: <Swords className="w-3.5 h-3.5 text-orange-500 shrink-0" />, text: t })),
    ...(lastCrown ? [{ icon: <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />, text: lastCrown.text }] : []),
  ];

  if (!items.length) return null;

  return (
    <div className="card-frame p-4 space-y-2">
      <div className="label-tiny mb-1">Dünyada Önemli Olaylar</div>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-stone-300">
          {item.icon}
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

function DiffModal({ diff, triggers, onClose }) {
  const safeDiff     = Array.isArray(diff)     ? diff     : [];
  const safeTriggers = Array.isArray(triggers) ? triggers : [];
  const positives    = safeDiff.filter(d => d?.positive);
  const negatives    = safeDiff.filter(d => d && !d.positive);
  const urgentTriggers = safeTriggers.filter(t => t?.urgent);

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/90 flex items-center justify-center p-4">
      <div className="bg-stone-950 border border-stone-800 w-full max-w-sm rounded-sm">
        <div className="px-5 pt-5 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="font-heading text-stone-200 tracking-wider text-sm">HAFTA GEÇTİ</span>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {urgentTriggers.map((t, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 border border-red-800 bg-red-950/30 text-red-300 rounded-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-sm">{t.text}</span>
            </div>
          ))}
          {(positives.length + negatives.length) > 0 ? (
            <div className="space-y-1.5">
              {[...positives, ...negatives].map((d, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm ${d.positive ? "text-emerald-400" : "text-red-400"}`}>
                  {d.positive
                    ? <TrendingUp  className="w-3.5 h-3.5 shrink-0" />
                    : <TrendingDown className="w-3.5 h-3.5 shrink-0" />}
                  {d.label}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Minus className="w-3.5 h-3.5" />
              Kayda değer bir değişiklik olmadı.
            </div>
          )}
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full btn-ember py-2.5 font-heading text-xs tracking-widest">
            Devam Et →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { state, advance } = useGame() || {};
  const navigate = useNavigate();
  const [advancing, setAdvancing]           = useState(false);
  const [diffData, setDiffData]             = useState(null);
  const [showPeriod, setShowPeriod]         = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0]);
  const [advProgress, setAdvProgress]       = useState(null);
  const [lastAdvNewCount, setLastAdvNewCount] = useState(0);
  const [yearSummary, setYearSummary]       = useState(null);

  const player = state?.player || {};
  const cal    = state?.calendar || { season: "Bilinmiyor", month_name: "", year: 0 };
  const rep    = reputationLabel(player?.reputation || 0);

  // Aktif görevler & fırsatlar
  const activeQuests  = (state?.quests || []).filter(q => ["açık", "kabul_edildi"].includes(q.status));
  const acceptedOpps  = (state?.opportunities || []).filter(o => o.status === "kabul_edildi");

  // Durum uyarıları
  const alerts = [];
  if ((player?.health ?? 100) < 25)  alerts.push({ type: "urgent", icon: "❤️",  text: "Sağlığın kritik! Dinlen veya tedavi ol." });
  if ((player?.hunger ?? 100) < 25)  alerts.push({ type: "urgent", icon: "🍞", text: "Çok acıktın. Yemezsen güçten düşersin." });
  if ((player?.crime  ?? 0)   > 60)  alerts.push({ type: "high",   icon: "⚖️",  text: "Suç puanın yüksek. Yetkililer seni izliyor." });
  if (acceptedOpps.length > 0)       alerts.push({ type: "normal", icon: "⚡",  text: `${acceptedOpps.length} üstlenilmiş fırsat seni bekliyor.` });
  if (activeQuests.some(q => q.status === "kabul_edildi"))
    alerts.push({ type: "normal", icon: "✅", text: "Devam eden görevin var. Bitirmeyi unutma." });

  // Olaylar — tip filtresi yok, tüm geçmiş gösterilir; en yeni üstte
  const safeHistory   = Array.isArray(state?.history) ? state.history : [];
  const recentEvents  = [...safeHistory].reverse().slice(0, 30);

  const handleAdvance = async () => {
    const totalWeeks    = selectedPeriod.weeks;
    const histLenBefore = (state?.history || []).length;
    setAdvancing(true);
    setShowPeriod(false);
    setYearSummary(null);
    setAdvProgress(totalWeeks > 1 ? { cur: 0, total: totalWeeks } : null);
    try {
      if (!advance) return;
      let lastResult    = null;
      const allNewEvents = [];
      for (let i = 0; i < totalWeeks; i++) {
        if (totalWeeks > 1) setAdvProgress({ cur: i + 1, total: totalWeeks });
        const result = await advance(1);
        lastResult = result;
        if (result?.player?.dead) return;
        // Her haftanın yeni olaylarını topla
        const hist = Array.isArray(result?.history) ? result.history : [];
        const sliceFrom = histLenBefore + allNewEvents.length;
        allNewEvents.push(...hist.slice(sliceFrom));
      }
      // Kaç yeni olay geldi — highlight için
      const finalHist = Array.isArray(lastResult?.history) ? lastResult.history : [];
      setLastAdvNewCount(Math.max(0, finalHist.length - histLenBefore));
      // Yıl özeti
      if (totalWeeks >= 52 && allNewEvents.length > 0) {
        setYearSummary({ totalWeeks, events: allNewEvents });
      }
      const diff     = Array.isArray(lastResult?.advance_diff) ? lastResult.advance_diff : [];
      const triggers = Array.isArray(lastResult?.triggers)     ? lastResult.triggers     : [];
      if (diff.length > 0 || triggers.some(t => t?.urgent)) {
        setDiffData({ diff, triggers });
      } else {
        toast.success(
          totalWeeks === 1 ? "Bir hafta geçti."
          : totalWeeks <= 4 ? "Bir ay geçti."
          : "Bir yıl geçti."
        );
      }
    } catch {
      toast.error("Zaman ilerletilemedi.");
    } finally {
      setAdvancing(false);
      setAdvProgress(null);
    }
  };

  if (!state) return null;

  return (
    <div className="space-y-5 rise-in pb-24 lg:pb-6 max-w-2xl mx-auto">

      {/* ── 1. Karakter başlığı ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="label-tiny">Karakter</div>
            <h1 className="font-heading text-2xl text-stone-100 leading-tight">
              {player?.name || "İsimsiz"}
            </h1>
            <div className="text-stone-500 text-xs mt-0.5">
              {player?.age || 0} yaş
              {player?.is_child && (
                <span className="ml-2 text-[9px] text-amber-500 font-heading border border-amber-900 px-1 py-0.5">ÇOCUK</span>
              )}
              <span className="mx-1.5 text-stone-700">·</span>
              <span className="text-stone-400">{cal.season} · {cal.month_name} {cal.year}</span>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-heading text-sm ${rep.color}`}>{rep.label}</div>
            <div className="text-[10px] text-stone-600">
              İtibar {player?.reputation > 0 ? "+" : ""}{player?.reputation || 0}
            </div>
          </div>
        </div>

        {/* ── 2. Temel istatistikler ── */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatBar icon={Heart} label="SAĞLIK" value={player?.health || 0}
            warn={(player?.health || 0) < 25} color="bg-emerald-700" />
          <StatBar icon={Apple} label="AÇLIK"  value={player?.hunger ?? 100}
            warn={(player?.hunger ?? 100) < 25} color="bg-orange-700" />
          <div className="flex items-center gap-2 px-3 py-2 card-frame">
            <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <div>
              <div className="text-[10px] text-stone-500 font-heading tracking-wider">ALTIN</div>
              <div className="text-sm font-heading text-amber-400">{player?.money || 0}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 card-frame">
            <Scroll className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <div>
              <div className="text-[10px] text-stone-500 font-heading tracking-wider">SUÇLULUK</div>
              <div className={`text-sm font-heading ${(player?.crime || 0) > 50 ? "text-red-400" : "text-stone-300"}`}>
                {player?.crime || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Hafta ilerleme butonu ── */}
      <div className="space-y-1">
        <div className="flex gap-2">
          {/* Ana ilerleme butonu */}
          <button
            onClick={handleAdvance}
            disabled={advancing}
            className="flex-1 btn-ember py-3 font-heading text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {advancing
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Hourglass className="w-4 h-4" />}
            {advancing
              ? advProgress
                ? `${advProgress.cur} / ${advProgress.total} HAFTA…`
                : "GEÇİYOR…"
              : `${selectedPeriod.label.toUpperCase()} İLERLE`}
          </button>

          {/* Dönem seçici toggle */}
          <button
            onClick={() => setShowPeriod(p => !p)}
            disabled={advancing}
            className="btn-ghost-ash px-3 py-3 font-heading text-xs tracking-widest disabled:opacity-50 flex items-center gap-1"
            title="Atlama süresini seç"
          >
            <span className="text-stone-400">{selectedPeriod.label}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-stone-500 transition-transform duration-200 ${showPeriod ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Progress bar — çok haftalı atlamada göster */}
        {advancing && advProgress && (
          <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-600 transition-all duration-300"
              style={{ width: `${(advProgress.cur / advProgress.total) * 100}%` }}
            />
          </div>
        )}

        {/* Dönem seçici paneli — aşağı açılır */}
        {showPeriod && !advancing && (
          <div className="card-frame overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p.label}
                onClick={() => { setSelectedPeriod(p); setShowPeriod(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-stone-800/60
                  ${selectedPeriod.label === p.label ? "text-amber-400" : "text-stone-300"}`}
              >
                <span className="font-heading tracking-wider">{p.label}</span>
                <span className="text-stone-600 text-xs">{p.desc}</span>
                {selectedPeriod.label === p.label && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-2 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Olaylar akışı — Bitlife tarzı ── */}
      {(recentEvents.length > 0 || yearSummary) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Scroll className="w-3.5 h-3.5 text-stone-600" />
              <span className="label-tiny">Olaylar</span>
              {lastAdvNewCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900/60 text-amber-400 font-heading">
                  +{lastAdvNewCount} yeni
                </span>
              )}
            </div>
            <Link to="/oyun/tarih" className="text-[10px] text-stone-600 hover:text-amber-400 font-heading tracking-wider">
              TÜM TARİH →
            </Link>
          </div>

          <div className="card-frame overflow-hidden max-h-96 overflow-y-auto">
            {/* Yıl özeti kartı */}
            {yearSummary && (
              <div className="border-b border-stone-800">
                <YearSummaryCard summary={yearSummary} onDismiss={() => setYearSummary(null)} />
              </div>
            )}
            {/* Olay akışı */}
            <div className="divide-y divide-stone-900/60">
              {recentEvents.map((ev, i) => (
                <EventCard
                  key={i}
                  event={ev}
                  isNew={i < lastAdvNewCount}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Durum uyarıları ── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => <AlertBanner key={i} {...a} />)}
        </div>
      )}

      {/* ── 6. Faction Rank & Yönetici HUD ── */}
      <FactionGovernorHUD player={player} world={state?.world} />

      {diffData && (
        <DiffModal diff={diffData.diff} triggers={diffData.triggers} onClose={() => setDiffData(null)} />
      )}
    </div>
  );
}

// ─── Faction Rank & Yönetici HUD Widget ────────────────────────────────────

const FACTION_TYPE_LABELS = {
  krallık_ordusu:    "Krallık Ordusu",
  tuccar_loncasi:    "Tüccar Loncası",
  zanaatkar_loncasi: "Zanaatkar Loncası",
  paralı_asker:      "Paralı Asker",
  ilim_cemiyeti:     "İlim Cemiyeti",
  sifaci_birligi:    "Şifacı Birliği",
  dini_tarikat:      "Dini Tarikat",
  oyuncu_kumpanya:   "Seyyah Kumpanya",
  eskiya_cetesi:     "Eşkıya Çetesi",
  gizli_cemiyet:     "Gizli Cemiyet",
};

function FactionGovernorHUD({ player, world }) {
  const factionId = player?.faction_id;
  const factions  = world?.factions || [];
  const myFac     = factions.find((f) => f.id === factionId);

  // Yönetici olduğu yer
  const governances = world?.governances || [];
  const myGov       = governances.find((g) => g.governor_id === "PLAYER");
  const govLoc      = myGov
    ? (world?.locations || []).find((l) => l.id === myGov.location_id)
    : null;

  if (!myFac && !myGov) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {/* Faction Rank */}
      {myFac && (() => {
        const rankTable    = myFac.rank_table || [];
        const playerRank   = player?.faction_rank ?? 0;
        const rankName     = rankTable[playerRank] || "—";
        const nextRankName = rankTable[playerRank + 1];
        const typeLabel    = FACTION_TYPE_LABELS[myFac.type] || myFac.type;
        const contribution = player?.faction_contribution ?? 0;
        const goal         = player?.faction_contribution_goal || 20;
        return (
          <div className="card-frame p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <div className="min-w-0">
                <div className="label-tiny truncate">{typeLabel}</div>
                <div className="text-xs text-stone-200 font-heading truncate">{myFac.name}</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-400 font-heading">{rankName}</span>
              {nextRankName && (
                <span className="text-stone-600 flex items-center gap-0.5">
                  → {nextRankName} <ChevronRight className="w-3 h-3" />
                </span>
              )}
            </div>
            {nextRankName && (
              <div className="space-y-0.5">
                <div className="bg-stone-900 rounded-full h-1 overflow-hidden">
                  <div
                    className="h-full bg-amber-700 transition-all"
                    style={{ width: `${Math.min(100, (contribution / goal) * 100)}%` }}
                  />
                </div>
                <div className="text-[9px] text-stone-600">{contribution}/{goal} katkı</div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Yönetici Widget */}
      {myGov && govLoc && (
        <div className="card-frame p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Landmark className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <div className="label-tiny">{myGov.governor_title}</div>
              <div className="text-xs text-stone-200 font-heading truncate">{govLoc.name}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-500">
            <span>💰 Hazine: <span className="text-amber-400">{myGov.treasury}</span></span>
            <span>😊 Mutluluk: <span className="text-sky-400">{myGov.population_happiness}</span></span>
          </div>
          {myGov.governor_legitimacy < 40 && (
            <div className="flex items-center gap-1 text-[10px] text-red-400">
              <AlertTriangle className="w-3 h-3" /> Meşruiyet düşük!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
