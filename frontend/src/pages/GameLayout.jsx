import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useGame } from "@/lib/GameContext";
import {
  Map, User, Scroll, Briefcase,
  Sword, Heart, Flame, Hourglass, Loader2,
  CalendarDays, Apple, Sparkles, Shield,
  MoreHorizontal, X,
  Zap, Newspaper, Baby, GraduationCap, ListChecks, Users,
  ArrowUpDown, GitBranch, Coffee,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import InheritanceScreen from "@/pages/InheritanceScreen";
import { api } from "@/lib/api";

// Ana navigasyon — 4 madde (mobilde dengeli görünüm)
const PRIMARY_NAV = [
  { to: "/oyun",            label: "Ana Sayfa", icon: Flame,     end: true, testid: "nav-world" },
  { to: "/oyun/karakter",   label: "Karakter",  icon: User,      testid: "nav-character" },
  { to: "/oyun/harita",     label: "Şehir",     icon: Map,       testid: "nav-map" },
  { to: "/oyun/iliskiler",  label: "İlişkiler", icon: Users,     testid: "nav-relationships" },
];

// Alt bardan kaldırılan öğeler — "Daha Fazla" menüsünde gösterilecek
const SECONDARY_NAV = [
  { to: "/oyun/meslek",         label: "Meslek",      icon: Briefcase, testid: "nav-profession" },
  { to: "/oyun/factionlar",     label: "Faction",     icon: Shield,    testid: "nav-factions" },
  { to: "/oyun/tarih",          label: "Tarih",       icon: Scroll,    testid: "nav-history" },
  { to: "/oyun/firsatlar",      label: "Fırsatlar",   icon: Zap,       testid: "nav-opportunities" },
  { to: "/oyun/dunya-haberleri",label: "Haberler",    icon: Newspaper, testid: "nav-world-news" },
  { to: "/oyun/mektep",         label: "Mektep",      icon: GraduationCap, testid: "nav-school" },
  { to: "/oyun/savas",          label: "Savaş",       icon: Sword,     testid: "nav-battle" },
  { to: "/oyun/npcler",         label: "Yakınındakiler", icon: Users,  testid: "nav-npcs" },
  { to: "/oyun/suc",            label: "Gölge",       icon: Sword,     testid: "nav-crime" },
  { to: "/oyun/ticaret",        label: "Pazar",        icon: ArrowUpDown, testid: "nav-trade" },
  { to: "/oyun/nesil",          label: "Nesil",        icon: GitBranch,   testid: "nav-generation" },
  { to: "/oyun/kasaba",         label: "Kasaba",       icon: Coffee,      testid: "nav-townfeed" },
];

const SEASON_TINT = {
  "İlkbahar": "text-emerald-400",
  "Yaz":      "text-amber-400",
  "Sonbahar": "text-orange-400",
  "Kış":      "text-sky-300",
};

function NavItem({ to, label, icon: Icon, end, testid, pulse }) {
  return (
    <NavLink
      to={to}
      end={end}
      data-testid={testid}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-sm border transition-all ${
          isActive
            ? "border-orange-800 bg-stone-900 text-orange-400"
            : "border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
        }`
      }
    >
      <div className="relative">
        <Icon className="w-4 h-4 shrink-0" />
        {pulse && (
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        )}
      </div>
      <span className="text-sm font-heading tracking-wider">{label}</span>
    </NavLink>
  );
}

function MobileNavItem({ to, label, icon: Icon, end, testid, pulse }) {
  return (
    <NavLink
      to={to}
      end={end}
      data-testid={`m-${testid}`}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-1 py-2 flex-1 transition-colors ${
          isActive ? "text-orange-400" : "text-stone-500 hover:text-stone-300"
        }`
      }
    >
      <div className="relative">
        <Icon className="w-6 h-6" />
        {pulse && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        )}
      </div>
      <span className="text-[10px] font-heading tracking-wider leading-none">{label}</span>
    </NavLink>
  );
}

function MiniBar({ value, max = 100, color }) {
  const w = Math.max(0, Math.min(100, ((value || 0) / max) * 100));
  return (
    <div className="h-1 rounded-sm bg-stone-900 overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

// Mobil "Daha Fazla" açılır menü
function MoreMenu({ items, state, onClose }) {
  const pulseSet = new Set();
  if ((state.opportunities || []).some(o => o.status === "açık")) pulseSet.add("nav-opportunities");
  if ((state.world_events || []).some(e => e.active)) pulseSet.add("nav-world-news");

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-stone-950 border-t border-stone-800 p-4 pb-6 rounded-t-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-heading text-stone-300 tracking-wider text-sm">Diğer Bölümler</span>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={`more-${n.testid}`}
              onClick={onClose}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1.5 p-3 rounded-sm border transition-all ${
                  isActive
                    ? "border-orange-800 bg-stone-900 text-orange-400"
                    : "border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-900/60"
                }`
              }
            >
              <div className="relative">
                <n.icon className="w-5 h-5" />
                {pulseSet.has(n.testid) && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                )}
              </div>
              <span className="text-[10px] tracking-wider font-heading">{n.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GameLayout() {
  const { state, fetchState, advance, lastActionPage, clearLastActionPage } = useGame() || {};
  const navigate = useNavigate();
  const [advancing, setAdvancing] = useState(false);
  const [showInheritance, setShowInheritance] = useState(false);
  const [inheritanceData, setInheritanceData] = useState(null);
  const [inheritanceBusy, setInheritanceBusy] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (fetchState) {
      fetchState().then((s) => {
        // false  → 404/409: oyun yok → yeni oyun ekranına git
        // null   → ağ hatası/500: geçici sorun → YÖNLENDIRME YOK, bekle
        // object → başarılı → zaten oyunda
        if (s === false) navigate("/yeni-oyun");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAdvance = async (weeks) => {
    setAdvancing(true);
    try {
      const newState = await advance(weeks);
      if (newState?.player?.dead) {
        try {
          const { data } = await api.get("/game/inheritance/options");
          setInheritanceData(data);
          setShowInheritance(true);
        } catch (_) {}
      } else {
        toast.success(`${weeks} hafta geçti.`);
      }
    } catch (e) {
      toast.error("Zaman ilerletilemedi.");
    } finally {
      setAdvancing(false);
    }
  };

  const onInherit = async (childId) => {
    setInheritanceBusy(true);
    try {
      await api.post("/game/inheritance/begin", { child_id: childId ?? null });
      setShowInheritance(false);
      setInheritanceData(null);
      if (fetchState) await fetchState();
      toast.success("Yeni nesil başladı!");
    } catch (e) {
      toast.error("Nesil devri başlatılamadı.");
    } finally {
      setInheritanceBusy(false);
    }
  };

  if (!state || !state.world || !state.player) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500 bg-stone-950">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const player = state.player || {};
  const playerAge = player.age || 0;
  const cal = state.calendar || { season: "Kış", month_name: "?", year: 0, week_in_month: 1 };
  const seasonClass = SEASON_TINT[cal.season] || "text-stone-300";

  // Yaşa göre filtre: 0-12 yaşta savaş gizlenir
  const visiblePrimary = PRIMARY_NAV.filter((n) => {
    if (playerAge < 13 && n.testid === "nav-factions") return false;
    return true;
  });

  const visibleSecondary = SECONDARY_NAV.filter((n) => {
    if (playerAge < 13 && n.testid === "nav-battle") return false;
    return true;
  });

  // Desktop sidebar'da primary + secondary hepsi gösterilir (sidebar geniş, sorun yok)
  const allDesktopNav = [...visiblePrimary, ...visibleSecondary];

  const pulseOpportunities = (state.opportunities || []).some(o => o.status === "açık");
  const pulseNews = (state.world_events || []).some(e => e.active);

  return (
    <div className="h-screen bg-stone-950 text-stone-200 flex overflow-hidden">
      <div className="grain-overlay" />
      <Toaster theme="dark" position="top-center" />

      {/* Desktop sidebar — tüm nav öğeleri */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-stone-800 bg-stone-950 p-4 sticky top-0 h-screen z-10">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-6 h-6 text-orange-600 ember-flicker" />
          <div>
            <div className="label-tiny">Kronikler</div>
            <div className="font-heading text-lg text-stone-100 leading-tight">Küllerin Mirası</div>
          </div>
        </div>

        {/* Calendar / Season */}
        <div className="card-frame p-3 mb-3 text-xs" data-testid="hud-calendar">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-3.5 h-3.5 text-stone-500" />
            <span className="label-tiny">{cal.month_name} {cal.year}</span>
          </div>
          <div className={`font-heading text-sm ${seasonClass}`} data-testid="hud-season">
            {cal.season} · {cal.week_in_month}. hafta
          </div>
          <div className="text-[10px] text-stone-500 mt-1 italic">{cal.season_flavor || ""}</div>
        </div>

        {/* Player card */}
        <div className="card-frame p-3 mb-4 text-xs">
          <div className="label-tiny mb-1">Oyuncu</div>
          <div className="font-heading text-stone-100 text-sm" data-testid="layout-player-name">
            {player.name || "Karakter"}
          </div>
          <div className="text-stone-500 flex items-center gap-1">
            <span data-testid="hud-age">{player.age || 0} yaş</span>
            {player.is_child && (
              <span className="text-[9px] uppercase tracking-wider text-amber-500 border border-amber-900 px-1 py-0.5 rounded-sm">
                Çocuk
              </span>
            )}
          </div>
          <div className="text-stone-500 capitalize text-[11px]">{player.profession || "işsiz"}</div>

          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="label-tiny flex items-center gap-1"><Heart className="w-2.5 h-2.5" />Sağlık</span>
              <span className="text-emerald-400" data-testid="hud-health">{player.health || 0}</span>
            </div>
            <MiniBar value={player.health || 0} color="bg-emerald-700" />

            <div className="flex justify-between text-[10px]">
              <span className="label-tiny flex items-center gap-1"><Apple className="w-2.5 h-2.5" />Açlık</span>
              <span className={(player.hunger ?? 100) < 25 ? "text-red-400" : "text-orange-300"} data-testid="hud-hunger">
                {player.hunger ?? 100}
              </span>
            </div>
            <MiniBar value={player.hunger ?? 100} color="bg-orange-700" />

            <div className="flex justify-between text-[10px] pt-1">
              <span className="label-tiny">Altın</span>
              <span className="text-amber-400" data-testid="layout-money">{player.money || 0}</span>
            </div>
          </div>
        </div>

        {/* Desktop nav — tümü gösterilir */}
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {/* Ana bölümler başlık */}
          <div className="label-tiny px-3 mb-1 mt-1">Ana Bölümler</div>
          {visiblePrimary.map((n) => (
            <NavItem
              key={n.to} {...n}
              pulse={
                (n.testid === "nav-opportunities" && pulseOpportunities) ||
                (n.testid === "nav-world-news" && pulseNews)
              }
            />
          ))}
          <div className="divider-ash my-2" />
          <div className="label-tiny px-3 mb-1">Diğer</div>
          {visibleSecondary.map((n) => (
            <NavItem
              key={n.to} {...n}
              pulse={
                (n.testid === "nav-opportunities" && pulseOpportunities) ||
                (n.testid === "nav-world-news" && pulseNews)
              }
            />
          ))}
        </nav>

        <div className="divider-ash my-3" />
        <button
          onClick={() => onAdvance(1)}
          disabled={advancing}
          data-testid="advance-week"
          className="btn-ember w-full py-2 font-heading text-xs tracking-widest mb-2 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Hourglass className="w-4 h-4" />
          {advancing ? "GEÇİYOR…" : "BİR HAFTA İLERLE"}
        </button>
        <button
          onClick={() => onAdvance(4)}
          disabled={advancing}
          data-testid="advance-month"
          className="btn-ghost-ash w-full py-2 font-heading text-xs tracking-widest disabled:opacity-50"
        >
          BİR AY İLERLE
        </button>
        <div className="mt-3 text-xs">
          <div className="text-stone-600 mb-2">
            Tur <span className="text-stone-300" data-testid="layout-turn">{state.turn ?? (state.day || 0)}</span> · Oyuncu
          </div>
          <button
            onClick={() => navigate("/yeni-oyun")}
            data-testid="logout-button"
            className="flex items-center gap-2 text-stone-500 hover:text-stone-300 text-xs"
          >
            Yeni Oyun
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 relative z-[2] flex flex-col min-h-0">
        {/* Mobile header — sabit kalır */}
        <header className="lg:hidden sticky top-0 z-20 bg-stone-950/95 backdrop-blur border-b border-amber-900/40 px-4 py-3 flex items-center justify-between" style={{boxShadow: '0 2px 12px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(120,60,10,0.1)'}}>
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="w-5 h-5 text-orange-600 ember-flicker shrink-0" />
            <div className="min-w-0">
              <div className="font-heading text-sm text-stone-100 truncate" data-testid="mobile-player-name">
                {player.name || "Karakter"} · {player.age || 0}y
              </div>
              <div className="text-[10px] text-stone-500 uppercase tracking-wider flex items-center gap-1">
                <span className={seasonClass}>{cal.season || "Kış"}</span>
                <span>·</span>
                <span>♥{player.health || 0}</span>
                <span>·</span>
                <span className={(player.hunger ?? 100) < 25 ? "text-red-400" : ""}>🍞{player.hunger ?? 100}</span>
                <span>·</span>
                <span className="text-amber-400">{player.money || 0}A</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onAdvance(1)}
            disabled={advancing}
            data-testid="mobile-advance-week"
            className="btn-ember px-3 py-1.5 text-xs font-heading tracking-wider disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            <Hourglass className="w-3.5 h-3.5" />
            {advancing ? "…" : "HAFTA"}
          </button>
        </header>

        {/* Sadece bu alan scroll eder */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-32 lg:pb-6">
          <Outlet />
        </div>
      </main>

      {/* Mobil alt navigation — 4 ana + "Menü" */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-amber-900/40 bg-stone-950/60 backdrop-blur-md flex pb-safe" style={{boxShadow: '0 -2px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,100,20,0.06)'}}>
        {visiblePrimary.map((n) => (
          <MobileNavItem
            key={n.to} {...n}
            pulse={
              (n.testid === "nav-opportunities" && pulseOpportunities) ||
              (n.testid === "nav-world-news" && pulseNews)
            }
          />
        ))}
        {/* Daha Fazla butonu */}
        <button
          data-testid="mobile-more-btn"
          onClick={() => setShowMore(true)}
          className="flex flex-col items-center justify-center gap-1 py-2 flex-1 text-stone-500 hover:text-stone-300 transition-colors"
        >
          <MoreHorizontal className="w-6 h-6" />
          <span className="text-[10px] font-heading tracking-wider leading-none">Menü</span>
        </button>
      </nav>

      {/* Mobil "Daha Fazla" açılır menü */}
      {showMore && (
        <MoreMenu
          items={visibleSecondary}
          state={state}
          onClose={() => setShowMore(false)}
        />
      )}

      {/* Adım 14 — "Geri Dön" butonu: aksiyon sonrası aktif, mobilde nav barın üstünde */}
      {lastActionPage && (
        <button
          data-testid="geri-don-btn"
          onClick={() => {
            const path = lastActionPage.path;
            clearLastActionPage();
            navigate(path);
          }}
          className="fixed right-4 z-50 flex items-center gap-1.5
                     text-xs font-heading tracking-wider px-3 py-2
                     bg-stone-900 border border-stone-700 rounded-sm
                     text-stone-300 hover:text-stone-100 hover:border-stone-500
                     shadow-lg transition-all"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
        >
          ↩ {lastActionPage.label}
        </button>
      )}

      {/* Miras ekranı */}
      {showInheritance && inheritanceData && (
        <InheritanceScreen
          data={inheritanceData}
          onSelect={onInherit}
          busy={inheritanceBusy}
        />
      )}
    </div>
  );
}
