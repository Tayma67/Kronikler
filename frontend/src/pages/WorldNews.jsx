import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useGame } from "@/lib/GameContext";
import {
  Newspaper, Loader2, Sun, Cloud, Flame, Sword, ShoppingBag,
  Heart, Users, Star, AlertTriangle, Leaf, Gem, Drumstick,
  Globe, Clock, CheckCircle, Crown, Handshake, ArrowRightLeft,
} from "lucide-react";

// ─── Olay Kategorisi Ayarları ────────────────────────────────────────────────

const CAT_CONFIG = {
  doğa:    { label: "Doğa",    color: "text-emerald-400",  bg: "bg-emerald-900/30", border: "border-emerald-800", icon: Leaf },
  sosyal:  { label: "Sosyal",  color: "text-amber-400",    bg: "bg-amber-900/30",   border: "border-amber-800",   icon: Heart },
  ekonomi: { label: "Ekonomi", color: "text-sky-400",      bg: "bg-sky-900/30",     border: "border-sky-800",     icon: ShoppingBag },
  tehlike: { label: "Tehlike", color: "text-red-400",      bg: "bg-red-900/30",     border: "border-red-800",     icon: AlertTriangle },
  haber:   { label: "Haber",   color: "text-purple-400",   bg: "bg-purple-900/30",  border: "border-purple-800",  icon: Star },
};

const TYPE_ICON = {
  kuraklık:           Sun,
  bereketli_hasat:    Leaf,
  büyük_yangın:       Flame,
  salgın_hastalık:    AlertTriangle,
  haydut_saldırıları: Sword,
  asker_toplama:      Sword,
  ticaret_patlaması:  ShoppingBag,
  yeni_maden:         Gem,
  festival:           Drumstick,
  dini_kutlama:       Star,
  soylu_düğünü:       Heart,
  göç_dalgası:        Users,
  ünlü_ölümü:         Globe,
  tahta_çıkış:        Crown,
  savaş_ilanı:        Sword,
  savaş_hareketi:     Sword,
  barış:              Handshake,
  göç:                ArrowRightLeft,
  meslek_edinme:      Star,
};

// ─── Bileşenler ──────────────────────────────────────────────────────────────

function EventBadge({ category, active }) {
  const cfg = CAT_CONFIG[category] || CAT_CONFIG.haber;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-sm border font-heading tracking-wider ${cfg.color} ${cfg.border} ${cfg.bg}`}>
      {active ? "● AKTİF" : cfg.label.toUpperCase()}
    </span>
  );
}

function EventCard({ event, compact = false }) {
  const cfg = CAT_CONFIG[event.category] || CAT_CONFIG.haber;
  const IconComp = TYPE_ICON[event.type] || Globe;
  const isActive = event.active;

  return (
    <div
      className={`card-frame p-4 border-l-2 transition-all ${isActive ? cfg.border : "border-stone-700"} ${isActive ? cfg.bg : ""}`}
    >
      {/* Başlık satırı */}
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-9 h-9 rounded-sm flex items-center justify-center ${isActive ? cfg.bg : "bg-stone-900"} border ${isActive ? cfg.border : "border-stone-800"}`}>
          <IconComp className={`w-4 h-4 ${isActive ? cfg.color : "text-stone-500"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <EventBadge category={event.category} active={isActive} />
            <span className="text-[10px] text-stone-500 uppercase tracking-wider">
              {event.location_name}
            </span>
          </div>
          <div className={`font-heading text-sm leading-tight ${isActive ? "text-stone-100" : "text-stone-400"}`}>
            {event.headline}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1 text-[10px] text-stone-600">
          <Clock className="w-3 h-3" />
          <span>T{event.started_day}</span>
        </div>
      </div>

      {/* Detay (compact değilse) */}
      {!compact && (
        <>
          <p className="text-sm text-stone-400 mt-3 leading-relaxed pl-12">
            {event.detail}
          </p>

          {/* Etkiler listesi */}
          {event.effects && event.effects.length > 0 && (
            <div className="mt-3 pl-12 flex flex-wrap gap-2">
              {event.effects.map((eff, i) => (
                <span
                  key={i}
                  className={`text-[11px] px-2 py-0.5 rounded-sm border ${cfg.border} ${cfg.bg} ${cfg.color}`}
                >
                  {eff}
                </span>
              ))}
            </div>
          )}

          {/* Bitiş bilgisi */}
          {isActive && (
            <div className="mt-3 pl-12 flex items-center gap-2 text-[10px] text-stone-500">
              <Clock className="w-3 h-3" />
              <span>Sona eriyor: Tur {event.ends_day}</span>
            </div>
          )}
          {!isActive && (
            <div className="mt-3 pl-12 flex items-center gap-2 text-[10px] text-stone-600">
              <CheckCircle className="w-3 h-3" />
              <span>Sona erdi</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ActiveEventsBanner({ events }) {
  if (!events || events.length === 0) return null;
  return (
    <div className="card-frame p-4 border border-orange-900 bg-orange-950/30">
      <div className="label-tiny text-orange-500 mb-2">Şu An Aktif Olaylar</div>
      <div className="space-y-2">
        {events.map((ev) => {
          const cfg = CAT_CONFIG[ev.category] || CAT_CONFIG.haber;
          const IconComp = TYPE_ICON[ev.type] || Globe;
          return (
            <div key={ev.id} className="flex items-center gap-2 text-sm">
              <IconComp className={`w-3.5 h-3.5 shrink-0 ${cfg.color}`} />
              <span className="text-stone-300 leading-tight">{ev.headline}</span>
              <span className="text-[10px] text-stone-600 shrink-0">— {ev.location_name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Ana Sayfa ───────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { key: "all",     label: "Tümü" },
  { key: "active",  label: "Aktif" },
  { key: "doğa",    label: "Doğa" },
  { key: "sosyal",  label: "Sosyal" },
  { key: "ekonomi", label: "Ekonomi" },
  { key: "tehlike", label: "Tehlike" },
  { key: "haber",   label: "Haber" },
];

export default function WorldNews() {
  const { state } = useGame() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    api.get("/game/world-news")
      .then(({ data }) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Haberler yüklenemedi.");
        setLoading(false);
      });
  }, [state?.turn]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-stone-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 p-4">{error}</div>
    );
  }

  const { active_events = [], all_events = [], pinned_events = [], calendar } = data || {};

  // Filtrele
  const filtered = filter === "all"
    ? all_events
    : filter === "active"
    ? all_events.filter(ev => ev.active)
    : all_events.filter(ev => ev.category === filter);

  return (
    <div className="space-y-6 rise-in">
      {/* Başlık */}
      <div>
        <div className="label-tiny">Gündem</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <Newspaper className="w-7 h-7 text-orange-600" /> Dünya Haberleri
        </h1>
        {calendar && (
          <p className="text-sm text-stone-500 mt-1">
            {calendar.month_name} {calendar.year} · {calendar.season}
          </p>
        )}
      </div>

      {/* Aktif olaylar banner */}
      <ActiveEventsBanner events={active_events} />

      {/* Kritik olaylar — tahta çıkış, savaş, barış, göç */}
      {pinned_events.length > 0 && (
        <div className="card-frame p-4 border border-red-900/60 bg-red-950/20">
          <div className="label-tiny text-red-400 mb-3 flex items-center gap-1.5">
            <Crown className="w-3 h-3" /> KRİTİK HABERLER
          </div>
          <div className="space-y-2">
            {pinned_events.map((ev) => {
              const IconComp = TYPE_ICON[ev.type] || Globe;
              const isWar   = ev.type === "savaş_ilanı" || ev.type === "savaş_hareketi";
              const isPeace = ev.type === "barış";
              const isThrone = ev.type === "tahta_çıkış";
              const colCls  = isWar ? "text-red-400" : isPeace ? "text-emerald-400" : isThrone ? "text-amber-400" : "text-purple-400";
              return (
                <div key={ev.id} className="flex items-start gap-2 text-sm">
                  <IconComp className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${colCls}`} />
                  <span className="text-stone-300 leading-snug">{ev.text}</span>
                  <span className="text-[10px] text-stone-600 shrink-0 ml-auto">T{ev.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Boş durum */}
      {active_events.length === 0 && (
        <div className="card-frame p-6 text-center text-stone-500">
          <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <div className="text-sm">Şu an aktif dünya olayı yok.</div>
          <div className="text-xs text-stone-600 mt-1">Her ay yeni olaylar oluşur. Zamanı ilerlet!</div>
        </div>
      )}

      {/* Filtre butonları */}
      {all_events.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map(opt => {
            const cfg = CAT_CONFIG[opt.key];
            const isActive = filter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`text-xs px-3 py-1 rounded-sm border font-heading tracking-wider transition-all ${
                  isActive
                    ? (cfg ? `${cfg.color} ${cfg.border} ${cfg.bg}` : "text-orange-400 border-orange-800 bg-orange-950/40")
                    : "text-stone-500 border-stone-700 hover:text-stone-300 hover:border-stone-600"
                }`}
              >
                {opt.label}
                {opt.key === "active" && active_events.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] bg-orange-600 text-white rounded-full">
                    {active_events.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Olay listesi */}
      {all_events.length > 0 && (
        <div className="space-y-3 max-w-3xl">
          {filtered.length === 0 && (
            <div className="text-stone-500 text-sm p-4">Bu kategoride olay bulunamadı.</div>
          )}
          {filtered.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}

      {all_events.length === 0 && active_events.length === 0 && (
        <div className="card-frame p-8 text-center space-y-2">
          <Globe className="w-10 h-10 mx-auto text-stone-700" />
          <div className="font-heading text-stone-400 text-lg">Dünya Sessiz</div>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            Henüz kayıtlı dünya olayı yok. Zamanı ilerletince dünya kendi kendine değişmeye başlayacak.
            Her ay yeni olaylar oluşur: kuraklıklar, festivaller, salgınlar, ticaret patlamaları…
          </p>
          <div className="text-xs text-stone-700 italic mt-2">
            Oyuncudan bağımsız, dünya kendi hikayesini yaşar.
          </div>
        </div>
      )}
    </div>
  );
}
