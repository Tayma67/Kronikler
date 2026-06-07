import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import LifeEventModal from "@/components/LifeEventModal";
import PerkChoiceModal from "@/components/PerkChoiceModal";
import {
  Heart, Apple, Flame, Scroll, AlertTriangle,
  Hourglass, Loader2, Swords, Crown, ChevronRight,
  Shield, Landmark, ChevronDown,
  Globe, Leaf, ShoppingBag, Users, Sun, Sword, Newspaper,
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
  kariyer_terfi: "🏆",
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
  kariyer_terfi:     "border-amber-400",
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

// ─── Adım 9: Aktif Dünya Olayları Banner'ı ──────────────────────────────────

const WE_CAT_STYLE = {
  tehlike: { border: "border-red-800",    bg: "bg-red-950/30",    text: "text-red-300",    icon: AlertTriangle },
  doğa:    { border: "border-emerald-800",bg: "bg-emerald-950/30",text: "text-emerald-300",icon: Leaf },
  ekonomi: { border: "border-sky-800",    bg: "bg-sky-950/30",    text: "text-sky-300",    icon: ShoppingBag },
  sosyal:  { border: "border-amber-800",  bg: "bg-amber-950/30",  text: "text-amber-300",  icon: Users },
  haber:   { border: "border-purple-800", bg: "bg-purple-950/30", text: "text-purple-300", icon: Globe },
};

function WorldEventBanner({ activeEvents }) {
  if (!activeEvents || activeEvents.length === 0) return null;
  // Sadece tehlike + doğa kategorisindeki kritik eventleri göster
  const critical = activeEvents.filter(ev =>
    ["tehlike", "doğa"].includes(ev.category) ||
    ["savaş_ilanı", "salgın_hastalık", "kuraklık", "büyük_yangın"].includes(ev.type)
  );
  if (critical.length === 0) return null;
  return (
    <div className="card-frame border border-red-900/50 bg-red-950/20 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-heading tracking-wider uppercase">
        <Newspaper className="w-3 h-3" />
        Aktif Dünya Olayları
      </div>
      {critical.map((ev) => {
        const cfg = WE_CAT_STYLE[ev.category] || WE_CAT_STYLE.haber;
        const IconComp = cfg.icon;
        return (
          <div key={ev.id} className={`flex items-start gap-2 px-2.5 py-2 rounded-sm border ${cfg.border} ${cfg.bg}`}>
            <IconComp className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cfg.text}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium leading-tight ${cfg.text}`}>{ev.headline}</div>
              <div className="text-[10px] text-stone-500 mt-0.5">{ev.location_name} · {ev.ends_day - (ev.started_day)} gün kaldı</div>
            </div>
          </div>
        );
      })}
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

// ── main ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { state, advance, lastWorldEvent, clearWorldEvent } = useGame() || {};
  const navigate = useNavigate();
  const [advancing, setAdvancing]           = useState(false);
  const [showPeriod, setShowPeriod]         = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0]);
  const [advProgress, setAdvProgress]       = useState(null);
  const [lastAdvNewCount, setLastAdvNewCount] = useState(0);
  const [yearSummary, setYearSummary]       = useState(null);
  const [showLifeEvent, setShowLifeEvent]   = useState(false);
  const [showPerkChoice, setShowPerkChoice] = useState(false);
  const [syntheticEvents, setSyntheticEvents] = useState([]); // diff'ten üretilen anlatı olayları
  const [periodStartTurn, setPeriodStartTurn] = useState(-1); // son atlamadan önceki turn (-1: tümünü göster)
  const [activeWorldEvents, setActiveWorldEvents] = useState([]); // Adım 9
  const [eventFilter, setEventFilter]       = useState("karakter"); // "karakter" | "dünya"

  const player = state?.player || {};
  const cal    = state?.calendar || { season: "Bilinmiyor", month_name: "", year: 0 };
  const rep    = reputationLabel(player?.reputation || 0);

  // Aktif görevler & fırsatlar
  const activeQuests  = (state?.quests || []).filter(q => ["açık", "kabul_edildi"].includes(q.status));
  const acceptedOpps  = (state?.opportunities || []).filter(o => o.status === "kabul_edildi");
  // Adım 15: bu hafta kapanacak açık fırsatlar
  const currentTurn   = state?.turn ?? 0;
  const criticalOpps  = (state?.opportunities || []).filter(o =>
    o.status === "açık" && o.expires_at != null && (o.expires_at - currentTurn) <= 1
  );

  // Adım 9: Aktif dünya olayları (state üzerinden)
  const activeWorldEventsFromState = (state?.world_events || []).filter(ev => ev.active);

  // Durum uyarıları
  const alerts = [];
  if ((player?.health ?? 100) < 25)  alerts.push({ type: "urgent", icon: "❤️",  text: "Sağlığın kritik! Dinlen veya tedavi ol." });
  if ((player?.hunger ?? 100) < 25)  alerts.push({ type: "urgent", icon: "🍞", text: "Çok acıktın. Yemezsen güçten düşersin." });
  if ((player?.crime  ?? 0)   > 60)  alerts.push({ type: "high",   icon: "⚖️",  text: "Suç puanın yüksek. Yetkililer seni izliyor." });
  if (criticalOpps.length > 0)       alerts.push({ type: "urgent", icon: "⏳", text: `${criticalOpps.length} fırsat bu hafta kapanıyor — kaçırma!` });
  if (acceptedOpps.length > 0)       alerts.push({ type: "normal", icon: "⚡",  text: `${acceptedOpps.length} üstlenilmiş fırsat seni bekliyor.` });
  if (activeQuests.some(q => q.status === "kabul_edildi"))
    alerts.push({ type: "normal", icon: "✅", text: "Devam eden görevin var. Bitirmeyi unutma." });

  // Olaylar — iki kategoriye ayrılır
  const safeHistory = Array.isArray(state?.history) ? state.history : [];
  const KARAKTER_TYPES = new Set([
    "doğum", "ölüm", "evlilik", "nesil_devri", "miras",
    "çalışma", "ticaret", "yolculuk", "meslek_değişimi",
    "suç", "suç_yakalandı", "dedikodu", "başlangıç",
    "okul", "beceri", "ilişki", "haydut_baskını",
    "misilleme", "kaçırma", "starvation_warning", "enforcement",
    "görev_tamamlandı", "iyileşme", "hastalık", "ozel_olay",
  ]);
  const DUNYA_TYPES = new Set([
    "savaş_ilanı", "barış", "kıtlık", "şenlik", "kral_değişimi",
    "tahta_çıkış", "savaş_zaferi", "faction_savaş", "ittifak",
    "isyan", "vergi_artışı", "vergi_indirimi", "savunma_yatırımı",
    "isyan_bastırma", "haydut_baskını",
  ]);

  // Oyuncu aile adları (doğum filtresi için)
  const playerFamilyNames = new Set();
  if (player?.name) playerFamilyNames.add(player.name);
  if (player?.spouse_id) {
    const spouseNpc = (state?.world?.npcs || []).find(n => n.id === player.spouse_id);
    if (spouseNpc?.name) playerFamilyNames.add(spouseNpc.name);
  }
  // Ebeveyn adları (karakter başlangıç olayı için)
  if (player?.parent_ids?.length) {
    player.parent_ids.forEach(pid => {
      const p = (state?.world?.npcs || []).find(n => n.id === pid);
      if (p?.name) playerFamilyNames.add(p.name);
    });
  }

  // Sadece son atlamadan bu yana gelen olayları göster (-1 ise tüm geçmiş)
  const periodEvents = periodStartTurn < 0
    ? safeHistory
    : safeHistory.filter(ev => (ev.day ?? 0) > periodStartTurn);

  // Doğum olayları: sadece aile üyelerini göster
  const isFamilyRelated = (ev) => {
    if (ev.type !== "doğum") return true;
    if (playerFamilyNames.size === 0) return true; // henüz aile bilgisi yoksa hepsini göster
    return [...playerFamilyNames].some(name => (ev.text || "").includes(name));
  };

  const allEvents = [...periodEvents].reverse();
  const recentEvents = allEvents
    .filter(ev => eventFilter === "karakter" ? KARAKTER_TYPES.has(ev.type) : DUNYA_TYPES.has(ev.type))
    .filter(isFamilyRelated)
    .slice(0, 30);

  const handleAdvance = async () => {
    const totalWeeks    = selectedPeriod.weeks;
    const histLenBefore = (state?.history || []).length;
    const turnBefore    = state?.turn ?? 0;
    setAdvancing(true);
    setShowPeriod(false);
    setYearSummary(null);
    setSyntheticEvents([]);
    setAdvProgress(null); // tek istek — progress bar yerine spinner yeterli
    try {
      if (!advance) return;
      // Tüm haftaları tek API isteğinde gönder (backend zaten toplu işliyor)
      const result = await advance(totalWeeks);
      if (!result) return;
      if (result?.player?.dead) return;

      // Yeni olayları hesapla
      const finalHist = Array.isArray(result?.history) ? result.history : [];
      const allNewEvents = finalHist.slice(histLenBefore);

      // Kaç yeni olay geldi — highlight için
      setLastAdvNewCount(allNewEvents.length);
      // Dönem başlangıcını güncelle — sadece bu periyottaki olaylar görünsün
      setPeriodStartTurn(turnBefore);
      // Yıl özeti
      if (totalWeeks >= 52 && allNewEvents.length > 0) {
        setYearSummary({ totalWeeks, events: allNewEvents });
      }
      const diff     = Array.isArray(result?.advance_diff) ? result?.advance_diff : [];
      const triggers = Array.isArray(result?.triggers)     ? result?.triggers     : [];

      // Diff öğelerini hikayesel anlatıya çevir ve olaylar bölümüne ekle
      const FIELD_NARRATIVES = {
        money:      { pos: (d) => `Kasana ${Math.abs(d).toFixed(0)} altın girdi.`,        neg: (d) => `Harcamalar ${Math.abs(d).toFixed(0)} altın götürdü.` },
        hunger:     { pos: (d) => `Karın doydu; vücut dinç hissediyor.`,                  neg: (d) => `Açlık çekildi; bu hafta yemek bulmak güçtü.` },
        health:     { pos: (d) => `Sağlık biraz toparladı.`,                              neg: (d) => `Sağlık geriledi; yorgunluk ağır basmaya başladı.` },
        reputation: { pos: (d) => `İtibarın arttı; insanlar seni daha saygıyla karşılıyor.`, neg: (d) => `İtibarın biraz sarsıldı.` },
        crime:      { pos: (d) => `Suç kaydın ağırlaştı; yetkililer gözünü dikmiş durumda.`,  neg: (d) => `Suç kaydın hafifçe silindi.` },
      };
      const currentTurnAfter = result?.turn ?? (turnBefore + totalWeeks);
      const newSynthetics = diff
        .filter(d => d?.field && FIELD_NARRATIVES[d.field])
        .map((d, i) => ({
          type: d.positive ? "iyileşme" : "hastalık",
          day: currentTurnAfter,
          text: d.positive
            ? FIELD_NARRATIVES[d.field].pos(Math.abs(d.delta))
            : FIELD_NARRATIVES[d.field].neg(Math.abs(d.delta)),
          _synthetic: true,
        }));

      // Acil uyarılar da olaylara ekle
      triggers.filter(t => t?.urgent).forEach(t => {
        newSynthetics.push({ type: "enforcement", day: currentTurnAfter, text: t.text, _synthetic: true });
      });

      if (newSynthetics.length > 0) setSyntheticEvents(newSynthetics);

      // Erken durma kontrolü — açlık/yiyeceksizlik
      const earlyStop = result?.advance_early_stop;
      if (earlyStop) {
        // Sentetik uyarı olayı ekle
        setSyntheticEvents(prev => [...prev, {
          type: "starvation_warning",
          day: currentTurnAfter,
          text: `🍞 Yiyecek stoğun tükendi ve açlık kritik seviyeye düştü. ${earlyStop.week_done} hafta geçti — devam etmedi.`,
          _synthetic: true,
        }]);
        toast.error("Yiyecek stoğun tükendi, çok açsın! Zaman atlaması durduruldu.", {
          duration: 7000,
          description: `${earlyStop.week_done} / ${earlyStop.total} hafta tamamlandı.`,
        });
      } else {
        toast.success(
          totalWeeks === 1 ? "Bir hafta geçti."
          : totalWeeks <= 4 ? "Bir ay geçti."
          : "Bir yıl geçti."
        );
      }
      // Kervan olayı bildirimi
      const ce = result?.caravan_event;
      if (ce) {
        if (ce.type === "arrived") {
          const profitStr = ce.profit != null
            ? ` Kâr: +${ce.profit.toFixed(1)}A`
            : "";
          toast.success(`🚛 Kervanın hedefe ulaştı!${profitStr}`, { duration: 5000 });
        } else if (ce.type === "attack") {
          toast.error(`⚔️ Kervanın saldırıya uğradı! Kayıp: ${ce.lost_value?.toFixed(1)}A`, { duration: 5000 });
        } else if (ce.type === "caravan_destroyed") {
          toast.error(`💀 Kervanın tamamen yağmalandı!`, { duration: 6000 });
        }
      }
      // Dünya olayı bildirimi (Adım 9)
      const we = result?.new_world_events?.[0];
      if (we) {
        const CAT_EMOJIS = {
          tehlike: "⚠️", doğa: "🌿", ekonomi: "📈", sosyal: "🎉", haber: "📰",
        };
        const em = CAT_EMOJIS[we.category] || "🌍";
        if (we.category === "tehlike") {
          toast.error(`${em} ${we.headline}`, { duration: 6000, description: we.location_name });
        } else {
          toast.info(`${em} ${we.headline}`, { duration: 5000, description: we.location_name });
        }
      }
    } catch {
      toast.error("Zaman ilerletilemedi.");
    } finally {
      setAdvancing(false);
      setAdvProgress(null);
      // Pending life event kontrolü
      try {
        const evRes = await api.get("/life-event/pending");
        if (evRes.data.event) setShowLifeEvent(true);
      } catch {
        // Sessizce geç
      }
      // Pending perk seçimi kontrolü (Adım 16)
      try {
        const perkRes = await api.get("/perk/pending");
        if (perkRes.data.pending_perk) setShowPerkChoice(true);
      } catch {
        // Sessizce geç
      }
    }
  };

  if (!state) return null;

  return (
    <div className="space-y-5 rise-in pb-24 lg:pb-6 max-w-2xl mx-auto">

      {/* Life Event Popup */}
      <LifeEventModal
        open={showLifeEvent}
        onClose={() => setShowLifeEvent(false)}
        onComplete={() => {
          setShowLifeEvent(false);
          // Stat değişimlerini yansıtmak için state yenile
          if (advance) advance(0).catch(() => {});
        }}
      />

      {/* Perk Seçim Popup — Adım 16 */}
      <PerkChoiceModal
        open={showPerkChoice && !showLifeEvent}
        onClose={() => setShowPerkChoice(false)}
        onComplete={() => {
          setShowPerkChoice(false);
          if (advance) advance(0).catch(() => {});
        }}
      />

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
      {(recentEvents.length > 0 || syntheticEvents.length > 0 || yearSummary) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Scroll className="w-3.5 h-3.5 text-stone-600" />
              <span className="label-tiny">Olaylar</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-800 text-stone-500 font-heading">
                {selectedPeriod.label}
              </span>
            </div>
            <Link to="/oyun/tarih" className="text-[10px] text-stone-600 hover:text-amber-400 font-heading tracking-wider">
              TÜM TARİH →
            </Link>
          </div>
          {/* Filtre butonları */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setEventFilter("karakter")}
              className={`flex-1 py-1.5 text-[10px] font-heading tracking-wider rounded-sm border transition-colors ${
                eventFilter === "karakter"
                  ? "border-orange-700 bg-orange-950/40 text-orange-300"
                  : "border-stone-800 text-stone-500 hover:text-stone-300"
              }`}
            >
              👤 Karakter & Aile
            </button>
            <button
              onClick={() => setEventFilter("dünya")}
              className={`flex-1 py-1.5 text-[10px] font-heading tracking-wider rounded-sm border transition-colors ${
                eventFilter === "dünya"
                  ? "border-violet-700 bg-violet-950/40 text-violet-300"
                  : "border-stone-800 text-stone-500 hover:text-stone-300"
              }`}
            >
              🌍 Dünya
            </button>
          </div>

          <div className="card-frame overflow-hidden max-h-96 overflow-y-auto">
            {/* Yıl özeti kartı */}
            {yearSummary && (
              <div className="border-b border-stone-800">
                <YearSummaryCard summary={yearSummary} onDismiss={() => setYearSummary(null)} />
              </div>
            )}
            {/* Sentetik anlatı olayları (diff'ten üretilen) — sadece karakter sekmesinde */}
            {eventFilter === "karakter" && syntheticEvents.length > 0 && (
              <div className="divide-y divide-stone-900/60 border-b border-stone-800">
                {syntheticEvents.map((ev, i) => (
                  <EventCard key={`syn-${i}`} event={ev} isNew={true} />
                ))}
              </div>
            )}
            {/* Olay akışı */}
            <div className="divide-y divide-stone-900/60">
              {recentEvents.length > 0 ? recentEvents.map((ev, i) => (
                <EventCard
                  key={i}
                  event={ev}
                  isNew={i < lastAdvNewCount}
                />
              )) : (
                <div className="px-4 py-6 text-center text-stone-600 text-xs font-heading tracking-wider">
                  Bu dönemde kayda değer bir olay yaşanmadı.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Dünya Olayları Banner (Adım 9) ── */}
      <WorldEventBanner activeEvents={activeWorldEventsFromState} />

      {/* ── 5. Durum uyarıları ── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => <AlertBanner key={i} {...a} />)}
        </div>
      )}

      {/* ── 6. Faction Rank & Yönetici HUD ── */}
      <FactionGovernorHUD player={player} world={state?.world} />


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
