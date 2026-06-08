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
  ChevronUp, User,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────
function reputationLabel(rep) {
  const r = Number(rep) || 0;
  if (r >= 80)  return { label: "Efsane",     color: "text-amber-400" };
  if (r >= 50)  return { label: "Saygın",     color: "text-emerald-400" };
  if (r >= 20)  return { label: "Tanınan",    color: "text-blue-400" };
  if (r >= 0)   return { label: "Tanınmayan", color: "text-stone-400" };
  if (r >= -20) return { label: "Güvenilmez", color: "text-orange-400" };
  return              { label: "Sürgün",     color: "text-red-400" };
}

const PERIODS = [
  { label: "Hafta", weeks: 1,  short: "H" },
  { label: "Ay",    weeks: 4,  short: "A" },
  { label: "Yıl",   weeks: 52, short: "Y" },
];

const EVENT_ICONS = {
  doğum: "👶", ölüm: "💀", evlilik: "💍", savaş_ilanı: "⚔️", barış: "🕊️",
  kıtlık: "🌵", şenlik: "🎉", kral_değişimi: "👑", tahta_çıkış: "👑",
  görev_tamamlandı: "✅", savaş_zaferi: "🏆", faction_savaş: "⚔️",
  enforcement: "⚖️", starvation_warning: "🍞", misilleme: "😤",
  kaçırma: "⛓️", nesil_devri: "🌿", miras: "📜",
  çalışma: "🔨", ticaret: "🪙", yolculuk: "🚶", meslek_değişimi: "🔄",
  suç: "🗡️", suç_yakalandı: "🚨", dedikodu: "🗣️", başlangıç: "🌅",
  okul: "📚", beceri: "⭐", ilişki: "🤝", haydut_baskını: "💥",
  isyan: "🔥", hastalık: "🤒", iyileşme: "💚",
  kariyer_terfi: "🏆",
  // uyarı tipleri (feed'e gömülü)
  _alert_urgent: "🚨", _alert_high: "⚠️", _alert_normal: "💬",
  _world_alert: "🌍",
  _kriz_alert: "🔥",
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
  _alert_urgent:     "border-red-600",
  _alert_high:       "border-amber-600",
  _alert_normal:     "border-stone-600",
  _world_alert:      "border-violet-600",
  _kriz_alert:       "border-red-700",
};

const KARAKTER_TYPES = new Set([
  "doğum", "ölüm", "evlilik", "nesil_devri", "miras",
  "çalışma", "ticaret", "yolculuk", "meslek_değişimi",
  "suç", "suç_yakalandı", "dedikodu", "başlangıç",
  "okul", "beceri", "ilişki", "haydut_baskını",
  "misilleme", "kaçırma", "starvation_warning", "enforcement",
  "görev_tamamlandı", "iyileşme", "hastalık", "ozel_olay",
  "_alert_urgent", "_alert_high", "_alert_normal",
]);

const DUNYA_TYPES = new Set([
  "savaş_ilanı", "barış", "kıtlık", "şenlik", "kral_değişimi",
  "tahta_çıkış", "savaş_zaferi", "faction_savaş", "ittifak",
  "isyan", "vergi_artışı", "vergi_indirimi", "savunma_yatırımı",
  "isyan_bastırma", "haydut_baskını", "_world_alert", "_kriz_alert",
]);

// ── sub-components ────────────────────────────────────────────────────────

// Kompakt stat pill (tek satır için)
function StatPill({ icon: Icon, value, warn = false, color = "text-stone-300" }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-sm border ${warn ? "bg-red-950/30 border-red-900/50" : "bg-amber-950/20 border-amber-900/30"}`}>
      <Icon className={`w-3 h-3 shrink-0 ${warn ? "text-red-400" : "text-amber-800"}`} />
      <span className={`text-[11px] font-heading tabular-nums ${warn ? "text-red-300" : color}`}>{value}</span>
    </div>
  );
}

// BitLife tarzı olay kartı
function EventCard({ event, pinned = false }) {
  const icon  = EVENT_ICONS[event?.type]  || "📜";
  const color = EVENT_COLORS[event?.type] || "border-stone-700";
  const isAlert = event?.type?.startsWith("_alert");
  const isWorld = event?.type === "_world_alert";
  const isKriz  = event?.type === "_kriz_alert";
  return (
    <div className={`flex gap-3 px-3 py-3 mx-3 my-2 rounded-sm border border-l-4 ${color} transition-colors
      ${pinned ? "bg-amber-950/20 border-r-amber-900/20 border-t-amber-900/20 border-b-amber-900/20" : ""}
      ${isAlert ? "bg-red-950/20 border-r-red-900/15 border-t-red-900/15 border-b-red-900/15" : ""}
      ${isWorld ? "bg-violet-950/20 border-r-violet-900/15 border-t-violet-900/15 border-b-violet-900/15" : ""}
      ${isKriz  ? "bg-red-950/30 border-r-red-900/20 border-t-red-900/20 border-b-red-900/20" : ""}
      ${!pinned && !isAlert && !isWorld && !isKriz ? "bg-stone-900/30 border-r-stone-800/40 border-t-stone-800/40 border-b-stone-800/40" : ""}
    `}>
      <span className="text-base shrink-0 leading-none mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${isAlert ? "text-amber-200" : isWorld ? "text-violet-200" : isKriz ? "text-red-300" : "text-stone-200"}`}>
          {event?.text || "Bilinmeyen olay"}
        </p>
        {pinned && (
          <span className="text-[9px] text-stone-600 font-heading tracking-wider uppercase mt-0.5 inline-block">
            {isKriz ? "Son Kriz" : "Aktif"}
          </span>
        )}
      </div>
    </div>
  );
}

// Yıl özeti kartı
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
    <div className="border-b border-stone-800 bg-amber-950/10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌟</span>
          <div>
            <div className="font-heading text-amber-400 text-xs tracking-wider">YIL ÖZETİ</div>
            <div className="text-[10px] text-stone-500">{summary.totalWeeks} hafta • {summary.events.length} olay</div>
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

// Faction/Yönetici özet satırı — kompakt, sadece rozet gibi
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

function StatusStrip({ player, world }) {
  const factionId = player?.faction_id;
  const factions  = world?.factions || [];
  const myFac     = factions.find((f) => f.id === factionId);
  const governances = world?.governances || [];
  const myGov       = governances.find((g) => g.governor_id === "PLAYER");
  const govLoc      = myGov ? (world?.locations || []).find((l) => l.id === myGov.location_id) : null;

  if (!myFac && !myGov) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-800/60 bg-stone-950/40 overflow-x-auto">
      {myFac && (() => {
        const rankTable  = myFac.rank_table || [];
        const playerRank = player?.faction_rank ?? 0;
        const rankName   = rankTable[playerRank] || "—";
        return (
          <Link to="/oyun/karakter" className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity">
            <Shield className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] text-stone-400 font-heading">{myFac.name}</span>
            <span className="text-[10px] text-amber-400 font-heading">· {rankName}</span>
          </Link>
        );
      })()}
      {myFac && myGov && <span className="text-stone-700 text-xs shrink-0">|</span>}
      {myGov && govLoc && (
        <Link to="/oyun/karakter" className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity">
          <Landmark className="w-3 h-3 text-amber-500" />
          <span className="text-[10px] text-stone-400 font-heading">{myGov.governor_title}</span>
          <span className="text-[10px] text-stone-500 font-heading">· {govLoc.name}</span>
          {myGov.governor_legitimacy < 40 && (
            <AlertTriangle className="w-3 h-3 text-red-400 ml-0.5" />
          )}
        </Link>
      )}
      <Link to="/oyun/karakter" className="ml-auto shrink-0 text-[9px] text-stone-600 hover:text-stone-400 font-heading tracking-wider">
        DETAY →
      </Link>
    </div>
  );
}

// Dünya savaş durumu özeti (Dünya tabı feed'inde gösterilecek)
function buildWorldAlertEvents(state) {
  const kingdoms = state?.world?.kingdoms || [];
  const factions = state?.world?.factions || [];
  const history  = Array.isArray(state?.history) ? state.history : [];
  const events   = [];

  const seen = new Set();
  for (const k of kingdoms.filter(k => k.at_war_with?.length > 0)) {
    for (const eid of (k.at_war_with || [])) {
      const key = [k.id, eid].sort().join("-");
      if (!seen.has(key)) {
        seen.add(key);
        const enemy = kingdoms.find(x => x.id === eid);
        if (enemy) events.push({ type: "_world_alert", text: `${k.name} ⚔️ ${enemy.name} savaşı sürüyor.`, _pinned: true });
      }
    }
  }
  const seenF = new Set();
  for (const f of factions.filter(f => f.at_war_with?.length > 0)) {
    for (const eid of (f.at_war_with || [])) {
      const key = [f.id, eid].sort().join("-");
      if (!seenF.has(key)) {
        seenF.add(key);
        const enemy = factions.find(x => x.id === eid);
        if (enemy) events.push({ type: "_world_alert", text: `${f.name} ⚔️ ${enemy.name} çatışması devam ediyor.`, _pinned: true });
      }
    }
  }
  const lastCrown = [...history].reverse().find(e => e.type === "kral_değişimi" || e.type === "tahta_çıkış");
  if (lastCrown) events.push({ type: "_world_alert", text: lastCrown.text, _pinned: true });

  return events;
}

// ── main ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { state, advance, lastWorldEvent, clearWorldEvent } = useGame() || {};
  const navigate = useNavigate();
  const [advancing, setAdvancing]             = useState(false);

  const [selectedPeriod, setSelectedPeriod]   = useState(PERIODS[0]);
  const [advProgress, setAdvProgress]         = useState(null);
  const [yearSummary, setYearSummary]         = useState(null);
  const [showLifeEvent, setShowLifeEvent]     = useState(false);
  const [showPerkChoice, setShowPerkChoice]   = useState(false);
  const [syntheticEvents, setSyntheticEvents] = useState([]);
  const [historyStartIdx, setHistoryStartIdx] = useState(-1);
  const [historyInitialized, setHistoryInitialized] = useState(false);
  const [eventFilter, setEventFilter]         = useState("karakter");

  const player = state?.player || {};
  const cal    = state?.calendar || { season: "Bilinmiyor", month_name: "", year: 0 };
  const rep    = reputationLabel(player?.reputation || 0);

  // İlk yüklemede son 25 olay
  useEffect(() => {
    if (state && !historyInitialized) {
      const len = (state?.history || []).length;
      setHistoryStartIdx(Math.max(0, len - 25));
      setHistoryInitialized(true);
    }
  }, [state, historyInitialized]);

  const safeHistoryLen = (state?.history || []).length;
  useEffect(() => {
    if (!advancing && historyInitialized && historyStartIdx >= 0) {
      setHistoryStartIdx(prev => Math.min(prev, Math.max(0, safeHistoryLen - 1)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeHistoryLen]);

  // Aktif görevler & fırsatlar
  const activeQuests = (state?.quests || []).filter(q => ["açık", "kabul_edildi"].includes(q.status));
  const acceptedOpps = (state?.opportunities || []).filter(o => o.status === "kabul_edildi");
  const currentTurn  = state?.turn ?? 0;
  const criticalOpps = (state?.opportunities || []).filter(o =>
    o.status === "açık" && o.expires_at != null && (o.expires_at - currentTurn) <= 1
  );

  // Uyarıları feed'e gömülü olay olarak üret
  const alertEvents = [];
  if ((player?.health ?? 100) < 25)
    alertEvents.push({ type: "_alert_urgent", text: "❤️ Sağlığın kritik! Dinlen veya tedavi ol.", _pinned: true });
  if ((player?.hunger ?? 100) < 25)
    alertEvents.push({ type: "_alert_urgent", text: "🍞 Çok acıktın. Yemezsen güçten düşersin.", _pinned: true });
  if ((player?.crime  ?? 0)   > 60)
    alertEvents.push({ type: "_alert_high",   text: "⚖️ Suç puanın yüksek. Yetkililer seni izliyor.", _pinned: true });
  if (criticalOpps.length > 0)
    alertEvents.push({ type: "_alert_urgent", text: `⏳ ${criticalOpps.length} fırsat bu hafta kapanıyor — kaçırma!`, _pinned: true });
  if (acceptedOpps.length > 0)
    alertEvents.push({ type: "_alert_normal", text: `⚡ ${acceptedOpps.length} üstlenilmiş fırsat seni bekliyor.`, _pinned: true });
  if (activeQuests.some(q => q.status === "kabul_edildi"))
    alertEvents.push({ type: "_alert_normal", text: "✅ Devam eden görevin var. Bitirmeyi unutma.", _pinned: true });

  // Dünya durum olayları (Dünya tabı için)
  const worldAlertEvents = buildWorldAlertEvents(state);

  // Aktif dünya olayları (state'den, banner yerine feed'e)
  const activeWorldEventsFromState = (state?.world_events || []).filter(ev => ev.active);
  const worldEventFeedItems = activeWorldEventsFromState.map(ev => ({
    type: "_world_alert",
    text: `${ev.headline} — ${ev.location_name}`,
    _pinned: true,
  }));

  // Olay geçmişi filtreleme
  const safeHistory = Array.isArray(state?.history) ? state.history : [];
  const playerFamilyNames = new Set();
  if (player?.name) playerFamilyNames.add(player.name);
  if (player?.spouse_id) {
    const spouseNpc = (state?.world?.npcs || []).find(n => n.id === player.spouse_id);
    if (spouseNpc?.name) playerFamilyNames.add(spouseNpc.name);
  }
  if (player?.parent_ids?.length) {
    player.parent_ids.forEach(pid => {
      const p = (state?.world?.npcs || []).find(n => n.id === pid);
      if (p?.name) playerFamilyNames.add(p.name);
    });
  }

  const periodEvents = historyStartIdx >= 0
    ? safeHistory.slice(historyStartIdx)
    : safeHistory.slice(-25);

  const isFamilyRelated = (ev) => {
    if (["doğum", "ölüm", "evlilik"].includes(ev.type)) {
      if (playerFamilyNames.size === 0) return true;
      return [...playerFamilyNames].some(name => (ev.text || "").includes(name));
    }
    return true;
  };

  const allEvents = [...periodEvents].reverse();
  const historyEvents = allEvents
    .filter(ev => eventFilter === "karakter" ? KARAKTER_TYPES.has(ev.type) : DUNYA_TYPES.has(ev.type))
    .filter(isFamilyRelated)
    .slice(0, 40);

  // handleAdvance — logic unchanged
  const handleAdvance = async () => {
    const totalWeeks    = selectedPeriod.weeks;
    const histLenBefore = (state?.history || []).length;
    setAdvancing(true);
    setYearSummary(null);
    setSyntheticEvents([]);
    setAdvProgress(null);
    try {
      if (!advance) return;
      const result = await advance(totalWeeks);
      if (!result) return;
      if (result?.player?.dead) return;

      const finalHist   = Array.isArray(result?.history) ? result.history : [];
      const allNewEvents = finalHist.slice(histLenBefore);
      setHistoryStartIdx(histLenBefore);

      if (totalWeeks >= 52 && allNewEvents.length > 0) {
        setYearSummary({ totalWeeks, events: allNewEvents });
      }

      const diff     = Array.isArray(result?.advance_diff) ? result?.advance_diff : [];
      const triggers = Array.isArray(result?.triggers)     ? result?.triggers     : [];

      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const FIELD_NARRATIVES = {
        money: {
          pos: [
            (d) => `Kasana ${Math.abs(d).toFixed(0)} altın girdi.`,
            (d) => `Bu hafta ${Math.abs(d).toFixed(0)} altın kazandın.`,
            (d) => `Gelir dengelendi; ${Math.abs(d).toFixed(0)} altın elde edildi.`,
          ],
          neg: [
            (d) => `Harcamalar ${Math.abs(d).toFixed(0)} altın götürdü.`,
            (d) => `Kasadan ${Math.abs(d).toFixed(0)} altın çıktı.`,
            (d) => `Bu hafta ${Math.abs(d).toFixed(0)} altın gidere aktı.`,
          ],
        },
        hunger: {
          pos: [
            () => `Karın doydu; vücut dinç hissediyor.`,
            () => `Bu hafta iyi beslenebildin; enerjin yerinde.`,
            () => `Yeterince yiyecek buldun; güçlü hissediyorsun.`,
          ],
          neg: [
            () => `Açlık çekildi; bu hafta yemek bulmak güçtü.`,
            () => `Karnını doyuramadın; yorgunluk çöktü.`,
            () => `Yiyecek kıttı; zayıflık hissediyorsun.`,
          ],
        },
        health: {
          pos: [
            () => `Sağlık biraz toparladı.`,
            () => `Dinlenme işe yaradı; kendini daha iyi hissediyorsun.`,
            () => `Bu hafta sağlığın iyileşti.`,
          ],
          neg: [
            () => `Sağlık geriledi; yorgunluk ağır basmaya başladı.`,
            () => `Bu hafta kendini pek iyi hissetmedin.`,
            () => `Zorlu geçen hafta sağlığına mal oldu.`,
          ],
        },
        reputation: {
          pos: [
            () => `İtibarın arttı; insanlar seni daha saygıyla karşılıyor.`,
            () => `Adın çevrede daha iyi duyulmaya başladı.`,
            () => `Bu hafta itibarına katkıda bulundun.`,
          ],
          neg: [
            () => `İtibarın biraz sarsıldı.`,
            () => `Bazı dedikodular adını lekeler gibi yayıldı.`,
            () => `Bu hafta çevredeki algın olumsuza döndü.`,
          ],
        },
        crime: {
          pos: [
            () => `Suç kaydın ağırlaştı; yetkililer gözünü dikmiş durumda.`,
            () => `Yaptıkların göze çarpmaya başladı; dikkatli ol.`,
          ],
          neg: [
            () => `Suç kaydın hafifçe silindi.`,
            () => `Temiz davranışların suç kaydını biraz temizledi.`,
          ],
        },
      };

      const currentTurnAfter = result?.turn ?? (0 + totalWeeks);
      const newSynthetics = diff
        .filter(d => d?.field && FIELD_NARRATIVES[d.field])
        .map((d) => {
          const variants = d.positive ? FIELD_NARRATIVES[d.field].pos : FIELD_NARRATIVES[d.field].neg;
          const fn = pick(variants);
          return {
            type: d.positive ? "iyileşme" : "hastalık",
            day: currentTurnAfter,
            text: fn(Math.abs(d.delta)),
            _synthetic: true,
          };
        });

      triggers.filter(t => t?.urgent).forEach(t => {
        newSynthetics.push({ type: "enforcement", day: currentTurnAfter, text: t.text, _synthetic: true });
      });

      if (newSynthetics.length > 0) setSyntheticEvents(newSynthetics);

      const earlyStop = result?.advance_early_stop;
      if (earlyStop) {
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

      const ce = result?.caravan_event;
      if (ce) {
        if (ce.type === "arrived") {
          const profitStr = ce.profit != null ? ` Kâr: +${ce.profit.toFixed(1)}A` : "";
          toast.success(`🚛 Kervanın hedefe ulaştı!${profitStr}`, { duration: 5000 });
        } else if (ce.type === "attack") {
          toast.error(`⚔️ Kervanın saldırıya uğradı! Kayıp: ${ce.lost_value?.toFixed(1)}A`, { duration: 5000 });
        } else if (ce.type === "caravan_destroyed") {
          toast.error(`💀 Kervanın tamamen yağmalandı!`, { duration: 6000 });
        }
      }

      const we = result?.new_world_events?.[0];
      if (we) {
        const CAT_EMOJIS = { tehlike: "⚠️", doğa: "🌿", ekonomi: "📈", sosyal: "🎉", haber: "📰" };
        const em = CAT_EMOJIS[we.category] || "🌍";
        if (we.category === "tehlike") {
          toast.error(`${em} ${we.headline}`, { duration: 6000, description: we.location_name });
        } else {
          toast.info(`${em} ${we.headline}`, { duration: 5000, description: we.location_name });
        }
      }

      // GDD v4 Bölüm 5.4 — Kriz Olayları bildirimi
      const crisisEvents = result?.crisis_events;
      if (crisisEvents?.length > 0) {
        const KRIZ_EMOJIS = { kriz_kuraklik: "☀️", kriz_veba: "💀", kriz_yangin: "🔥" };
        crisisEvents.slice(0, 3).forEach(ev => {
          const emoji = KRIZ_EMOJIS[ev.type] || "⚠️";
          toast.error(`${emoji} ${ev.text}`, { duration: 8000, description: "Kriz Olayı — Dünya Haberleri'ne bak" });
        });
      }
    } catch {
      toast.error("Zaman ilerletilemedi.");
    } finally {
      setAdvancing(false);
      setAdvProgress(null);
      try {
        const evRes = await api.get("/life-event/pending");
        if (evRes.data.event) setShowLifeEvent(true);
      } catch {}
      try {
        const perkRes = await api.get("/perk/pending");
        if (perkRes.data.pending_perk) setShowPerkChoice(true);
      } catch {}
    }
  };

  if (!state) return null;

  // Feed'e girecek sabitlenmiş olaylar (uyarılar)
  const KRIZ_EMOJIS_FEED = { kriz_kuraklik: "☀️", kriz_veba: "💀", kriz_yangin: "🔥" };
  const crisisFeedItems = (state?.recent_crises || []).map(ev => ({
    type: "_kriz_alert",
    text: `${KRIZ_EMOJIS_FEED[ev.type] || "⚠️"} ${ev.text}`,
    _pinned: true,
    _kriz: true,
  }));
  const pinnedFeedEvents = eventFilter === "karakter"
    ? alertEvents
    : [...crisisFeedItems, ...worldAlertEvents, ...worldEventFeedItems];

  return (
    <>
      <LifeEventModal
        open={showLifeEvent}
        onClose={() => setShowLifeEvent(false)}
        onComplete={() => {
          setShowLifeEvent(false);
          if (advance) advance(0).catch(() => {});
        }}
      />
      <PerkChoiceModal
        open={showPerkChoice && !showLifeEvent}
        onClose={() => setShowPerkChoice(false)}
        onComplete={() => {
          setShowPerkChoice(false);
          if (advance) advance(0).catch(() => {});
        }}
      />

      {/* Ana wrapper — tam yükseklik, flex kolon */}
      <div className="flex flex-col max-w-2xl mx-auto" style={{ minHeight: "calc(100dvh - 56px)" }}>

        {/* ── ÜST BAŞLIK — kompakt, sabit ── */}
        <div className="shrink-0 border-b border-amber-900/40 bg-gradient-to-b from-stone-900/90 to-stone-950/95 backdrop-blur-sm" style={{boxShadow: '0 2px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,120,40,0.08)'}}>

          {/* Karakter satırı */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 gap-3">
            {/* Sol: isim + yaş/tarih */}
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 min-w-0">
                <h1 className="font-heading text-xl text-amber-100 leading-none truncate" style={{textShadow: '0 0 20px rgba(180,100,20,0.4)'}}>
                  {player?.name || "İsimsiz"}
                </h1>
                {player?.is_child && (
                  <span className="text-[9px] text-amber-500 font-heading border border-amber-900/60 bg-amber-950/30 px-1 shrink-0">ÇOCUK</span>
                )}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5 truncate">
                {player?.age || 0} yaş
                <span className="mx-1.5 text-amber-900/70">·</span>
                {cal.season} · {cal.month_name} {cal.year}
              </div>
            </div>

            {/* Sağ: itibar */}
            <div className="text-right shrink-0">
              <div className={`font-heading text-sm ${rep.color}`}>{rep.label}</div>
              <div className="text-[10px] text-stone-600">
                {player?.reputation > 0 ? "+" : ""}{player?.reputation || 0}
              </div>
            </div>
          </div>

          {/* Stat pills satırı */}
          <div className="flex items-center gap-1.5 px-4 pb-2.5 overflow-x-auto">
            <StatPill
              icon={Heart}
              value={player?.health || 0}
              warn={(player?.health || 0) < 25}
              color="text-emerald-400"
            />
            <StatPill
              icon={Apple}
              value={player?.hunger ?? 100}
              warn={(player?.hunger ?? 100) < 25}
              color="text-orange-400"
            />
            <StatPill
              icon={Flame}
              value={`${player?.money || 0}A`}
              color="text-amber-400"
            />
            <StatPill
              icon={Scroll}
              value={player?.crime || 0}
              warn={(player?.crime || 0) > 50}
              color={(player?.crime || 0) > 50 ? "text-red-400" : "text-stone-400"}
            />
          </div>
        </div>

        {/* Faction/Yönetici strip — varsa */}
        <StatusStrip player={player} world={state?.world} />

        {/* ── OLAY AKIŞI — esnek yükseklik ── */}
        <div className="flex flex-col flex-1 min-h-0 pb-20">

          {/* Filtre + başlık */}
          <div className="shrink-0 flex items-center gap-0 border-b border-amber-900/30 bg-stone-950/50">
            <button
              onClick={() => setEventFilter("karakter")}
              className={`flex-1 py-2.5 text-[11px] font-heading tracking-wider transition-colors border-b-2 ${
                eventFilter === "karakter"
                  ? "border-orange-600 text-orange-300 bg-orange-950/20"
                  : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              👤 Karakter
            </button>
            <button
              onClick={() => setEventFilter("dünya")}
              className={`flex-1 py-2.5 text-[11px] font-heading tracking-wider transition-colors border-b-2 ${
                eventFilter === "dünya"
                  ? "border-violet-600 text-violet-300 bg-violet-950/20"
                  : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              🌍 Dünya
            </button>
            <Link
              to="/oyun/tarih"
              className="px-4 py-2.5 text-[10px] text-stone-600 hover:text-amber-400 font-heading tracking-wider border-b-2 border-transparent shrink-0"
            >
              TARİH →
            </Link>
          </div>

          {/* Kaydırılabilir olay listesi — tam geri kalan yükseklik */}
          <div className="flex-1 overflow-y-auto" style={{background: 'linear-gradient(180deg, rgba(20,14,8,0) 0%, rgba(15,10,6,0.6) 100%)'}}>

            {/* Yıl özeti */}
            {yearSummary && (
              <YearSummaryCard summary={yearSummary} onDismiss={() => setYearSummary(null)} />
            )}

            {/* Sabitlenmiş uyarılar (üstte) */}
            {pinnedFeedEvents.map((ev, i) => (
              <EventCard key={`pin-${i}`} event={ev} pinned />
            ))}

            {/* Sentetik anlatı (diff'ten) — sadece karakter sekmesinde */}
            {eventFilter === "karakter" && syntheticEvents.map((ev, i) => (
              <EventCard key={`syn-${i}`} event={ev} />
            ))}

            {/* Geçmiş olaylar */}
            {historyEvents.length > 0
              ? historyEvents.map((ev, i) => <EventCard key={i} event={ev} />)
              : (
                <div className="px-4 py-12 text-center">
                  <div className="text-2xl mb-2 opacity-30">
                    {eventFilter === "karakter" ? "👤" : "🌍"}
                  </div>
                  <div className="text-stone-600 text-xs font-heading tracking-wider">
                    {eventFilter === "karakter"
                      ? "Bu dönemde seni etkileyen bir olay yaşanmadı."
                      : "Bu dönemde kayda değer bir dünya olayı yaşanmadı."}
                  </div>
                </div>
              )
            }
          </div>
        </div>
      </div>

      {/* ── YAPIŞIK ALT BAR — sabit, her zaman görünür ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-amber-900/40 bg-stone-950/97 backdrop-blur-sm" style={{boxShadow: '0 -2px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(180,100,20,0.07)'}}>
        <div className="max-w-2xl mx-auto px-3 py-2.5">

          {/* İlerleme bar — çok haftalı atlamada */}
          {advancing && advProgress && (
            <div className="h-0.5 bg-stone-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-orange-600 transition-all duration-300"
                style={{ width: `${(advProgress.cur / advProgress.total) * 100}%` }}
              />
            </div>
          )}

          <div className="flex items-center gap-2">

            {/* Dönem seçici — pill butonlar */}
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setSelectedPeriod(p)}
                  disabled={advancing}
                  className={`px-2.5 py-2 text-[10px] font-heading tracking-wider rounded-sm border transition-colors disabled:opacity-40 ${
                    selectedPeriod.label === p.label
                      ? "border-orange-700 bg-orange-950/50 text-orange-300"
                      : "border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Ana ilerleme butonu */}
            <button
              onClick={handleAdvance}
              disabled={advancing}
              className="flex-1 btn-ember py-2.5 font-heading text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
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
          </div>
        </div>
      </div>
    </>
  );
}
