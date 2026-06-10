import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useGame } from "@/lib/GameContext";
import {
  Scroll, Flame, Shield, Castle, Users,
  Briefcase, Sword, Hourglass, Loader2,
  Zap, Newspaper, GraduationCap, ArrowUpDown,
  GitBranch, Coffee, X, Heart, Apple, Home, BookOpen, Crown, Settings,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import InheritanceScreen from "@/pages/InheritanceScreen";
import { api } from "@/lib/api";

// ── Nav definitions ──────────────────────────────────────────────────────────
const PRIMARY_NAV = [
  { to: "/oyun",           label: "Ana Sayfa", icon: Flame,  end: true, testid: "nav-world"     },
  { to: "/oyun/karakter",  label: "Karakter",  icon: Shield,            testid: "nav-character" },
  { to: "/oyun/harita",    label: "Şehir",     icon: Castle,            testid: "nav-map"       },
  { to: "/oyun/iliskiler", label: "İlişkiler", icon: Users,             testid: "nav-relationships" },
];

const SECONDARY_NAV = [
  { to: "/oyun/meslek",          label: "Meslek",       icon: Briefcase,      testid: "nav-profession"  },
  { to: "/oyun/factionlar",      label: "Örgütler",     icon: Shield,         testid: "nav-factions"    },
  { to: "/oyun/tarih",           label: "Tarih",        icon: Scroll,         testid: "nav-history"     },
  { to: "/oyun/firsatlar",       label: "Fırsatlar",    icon: Zap,            testid: "nav-opportunities" },
  { to: "/oyun/dunya-haberleri", label: "Haberler",     icon: Newspaper,      testid: "nav-world-news"  },
  { to: "/oyun/mektep",          label: "Mektep",       icon: GraduationCap,  testid: "nav-school"      },
  { to: "/oyun/savas",           label: "Savaş",        icon: Sword,          testid: "nav-battle"      },
  { to: "/oyun/npcler",          label: "Yakınlar",     icon: Users,          testid: "nav-npcs"        },
  { to: "/oyun/suc",             label: "Gölge",        icon: Sword,          testid: "nav-crime"       },
  { to: "/oyun/ticaret",         label: "Pazar",        icon: ArrowUpDown,    testid: "nav-trade"       },
  { to: "/oyun/mulkler",         label: "Mülkler",      icon: Home,           testid: "nav-properties"  },
  { to: "/oyun/hikayeler",       label: "Hikâyeler",    icon: BookOpen,       testid: "nav-stories"     },
  { to: "/oyun/hanedan",         label: "Hanedan",      icon: Crown,          testid: "nav-legacy"      },
  { to: "/oyun/ayarlar",         label: "Ayarlar",      icon: Settings,       testid: "nav-settings"    },
  { to: "/oyun/nesil",           label: "Nesil",        icon: GitBranch,      testid: "nav-generation"  },
  { to: "/oyun/kasaba",          label: "Kasaba",       icon: Coffee,         testid: "nav-townfeed"    },
];

// ── Mobile nav item ──────────────────────────────────────────────────────────
function MobileNavItem({ to, label, icon: Icon, end, testid, pulse }) {
  return (
    <NavLink to={to} end={end} data-testid={`m-${testid}`}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
               justifyContent: 'center', gap: 4, paddingTop: 4, textDecoration: 'none' }}>
      {({ isActive }) => (
        <>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isActive ? 'linear-gradient(145deg, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.07) 100%)' : 'transparent',
            border: isActive ? '1px solid rgba(201,168,76,0.45)' : '1px solid transparent',
            boxShadow: isActive ? '0 0 14px rgba(201,168,76,0.28), inset 0 1px 0 rgba(201,168,76,0.15)' : 'none',
            transform: isActive ? 'translateY(-2px)' : 'none',
            transition: 'all 250ms ease',
            position: 'relative',
          }}>
            <Icon size={17}
              color={isActive ? 'var(--color-gold)' : 'var(--color-parchment-muted)'}
              strokeWidth={isActive ? 2 : 1.5}
              style={{ filter: isActive ? 'drop-shadow(0 0 6px rgba(201,168,76,0.5))' : 'none' }}
            />
            {pulse && (
              <span style={{
                position: 'absolute', top: 7, right: 7,
                width: 5, height: 5, borderRadius: '50%',
                background: '#C84040', boxShadow: '0 0 5px rgba(200,64,64,0.7)',
              }} />
            )}
          </div>
          <span style={{
            fontSize: 10, fontFamily: 'Cinzel, serif', letterSpacing: '0.07em',
            textTransform: 'uppercase', lineHeight: 1,
            color: isActive ? 'var(--color-gold)' : 'var(--color-parchment-muted)',
            fontWeight: isActive ? 600 : 400,
          }}>
            {label}
          </span>
          {isActive && (
            <div style={{
              position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px',
              background: 'linear-gradient(to right, transparent, var(--color-gold-bright), var(--color-gold), transparent)',
              boxShadow: '0 0 8px var(--color-gold)',
              borderRadius: '0 0 2px 2px',
            }} />
          )}
        </>
      )}
    </NavLink>
  );
}

// ── Desktop sidebar nav item ──────────────────────────────────────────────────
function SideNavItem({ to, label, icon: Icon, end, testid, pulse }) {
  return (
    <NavLink to={to} end={end} data-testid={testid}
      style={{ textDecoration: 'none' }}
    >
      {({ isActive }) => (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.45rem 0.75rem', borderRadius: '6px',
          cursor: 'pointer', transition: 'all 0.18s',
          background: isActive ? 'linear-gradient(135deg, rgba(201,168,76,0.14) 0%, rgba(201,168,76,0.06) 100%)' : 'transparent',
          border: isActive ? '1px solid rgba(201,168,76,0.35)' : '1px solid transparent',
        }}>
          <Icon size={14}
            color={isActive ? 'var(--color-gold)' : 'var(--color-parchment-muted)'}
            strokeWidth={isActive ? 2 : 1.5}
          />
          <span style={{
            fontFamily: 'Cinzel, serif', fontSize: '0.62rem',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: isActive ? 'var(--color-gold)' : 'var(--color-parchment-muted)',
            fontWeight: isActive ? 700 : 400,
          }}>
            {label}
          </span>
          {pulse && (
            <div style={{
              width: 5, height: 5, borderRadius: '50%', marginLeft: 'auto',
              background: '#C84040', boxShadow: '0 0 5px rgba(200,64,64,0.6)',
            }} />
          )}
        </div>
      )}
    </NavLink>
  );
}

// ── More menu (mobile secondary nav) ─────────────────────────────────────────
function MoreMenu({ items, state, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={onClose}>
      <div style={{
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border-hi)',
        borderRadius: '12px 12px 0 0',
        padding: '1rem 1rem 2rem',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.7)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', letterSpacing: '0.14em',
                         textTransform: 'uppercase', color: 'var(--color-gold)' }}>
            Diğer Bölümler
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-parchment-muted)' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {items.map(n => (
            <NavLink key={n.to} to={n.to} data-testid={`more-${n.testid}`}
              onClick={onClose} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                  padding: '0.7rem 0.4rem', borderRadius: '8px',
                  background: isActive ? 'rgba(201,168,76,0.12)' : 'var(--color-card)',
                  border: isActive ? '1px solid rgba(201,168,76,0.4)' : '1px solid var(--color-border)',
                }}>
                  <n.icon size={16} color={isActive ? 'var(--color-gold)' : 'var(--color-parchment-muted)'} strokeWidth={1.5} />
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', letterSpacing: '0.09em',
                                 textTransform: 'uppercase', color: isActive ? 'var(--color-gold)' : 'var(--color-parchment-muted)' }}>
                    {n.label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main layout ──────────────────────────────────────────────────────────────
export default function GameLayout() {
  const { state, fetchState, advance, lastActionPage, clearLastActionPage } = useGame() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/oyun" || location.pathname === "/oyun/";
  const isCharacterSheet = location.pathname === "/oyun/karakter";
  const [advancing, setAdvancing]       = useState(false);
  const [showInheritance, setShowInheritance] = useState(false);
  const [inheritanceData, setInheritanceData] = useState(null);
  const [inheritanceBusy, setInheritanceBusy] = useState(false);
  const [showMore, setShowMore]         = useState(false);

  useEffect(() => {
    if (fetchState) fetchState().then(s => { if (s === false) navigate("/yeni-oyun"); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state?.player?.dead && !showInheritance) {
      api.get("/game/inheritance/options")
        .then(({ data }) => { setInheritanceData(data); setShowInheritance(true); })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.player?.dead]);

  const onAdvance = async (weeks) => {
    setAdvancing(true);
    try {
      const newState = await advance(weeks);
      if (newState?.player?.dead) {
        try { const { data } = await api.get("/game/inheritance/options"); setInheritanceData(data); setShowInheritance(true); }
        catch (_) {}
      } else {
        toast.success(`${weeks} hafta geçti.`);
      }
    } catch (e) { toast.error("Zaman ilerletilemedi."); }
    finally { setAdvancing(false); }
  };

  const onInherit = async (childId) => {
    setInheritanceBusy(true);
    try {
      await api.post("/game/inheritance/begin", { child_id: childId ?? null });
      setShowInheritance(false); setInheritanceData(null);
      if (fetchState) await fetchState();
      toast.success("Yeni nesil başladı!");
    } catch (e) { toast.error("Nesil devri başlatılamadı."); }
    finally { setInheritanceBusy(false); }
  };

  if (!state || !state.world || !state.player) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} color="var(--color-gold)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const player  = state.player || {};
  const cal     = state.calendar || { season: 'Kış', month_name: '?', year: 0, week_in_month: 1 };

  const visiblePrimary   = PRIMARY_NAV.filter(n => !(player.age < 13 && n.testid === "nav-factions"));
  const visibleSecondary = SECONDARY_NAV.filter(n => !(player.age < 13 && n.testid === "nav-battle"));

  const pulseOpportunities = (state.opportunities || []).some(o => o.status === "açık");
  const pulseNews          = (state.world_events  || []).some(e => e.active);

  return (
    <div style={{ height: '100vh', background: 'var(--color-bg)', display: 'flex', overflow: 'hidden' }}>
      <Toaster theme="dark" position="top-center" />

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex" style={{
        flexDirection: 'column', width: 220, flexShrink: 0,
        borderRight: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        padding: '1rem 0.75rem', overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem',
                      padding: '0 0.25rem' }}>
          <Flame size={20} color="var(--color-gold)" style={{ filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.5))' }} />
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', letterSpacing: '0.16em',
                          textTransform: 'uppercase', color: 'var(--color-parchment-muted)' }}>
              KRONİKLER
            </div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', letterSpacing: '0.06em',
                          color: 'var(--color-parchment)', fontWeight: 700 }}>
              Küllerin Mirası
            </div>
          </div>
        </div>

        {/* Player mini card */}
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)',
                      borderRadius: 8, padding: '0.65rem 0.75rem', marginBottom: '1rem' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.78rem', fontWeight: 700,
                        color: 'var(--color-parchment)', letterSpacing: '0.08em',
                        marginBottom: '0.15rem' }} data-testid="layout-player-name">
            {player.name || "Karakter"}
          </div>
          <div style={{ fontFamily: 'Crimson Text, serif', fontSize: '0.75rem', fontStyle: 'italic',
                        color: 'var(--color-gold)', marginBottom: '0.5rem' }}>
            {player.profession || "İşsiz"} · <span data-testid="hud-age">{player.age || 0}</span> yaş
          </div>
          {/* Stat mini bars */}
          {[
            { label: '❤', value: player.health || 0, color: '#C84040' },
            { label: '🍎', value: player.hunger ?? 100, color: '#4A9A5A' },
          ].map(s => (
            <div key={s.label} style={{ marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--color-parchment-muted)' }}>{s.label}</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--color-parchment-dim)' }}>{s.value}</span>
              </div>
              <div style={{ height: 3, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.value}%`,
                              background: s.color, boxShadow: `0 0 4px ${s.color}88` }} />
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem',
                        fontFamily: 'Cinzel, serif', fontSize: '0.55rem' }}>
            <span style={{ color: 'var(--color-parchment-muted)' }}>Altın</span>
            <span style={{ color: 'var(--color-gold)' }} data-testid="layout-money">{player.money || 0}A</span>
          </div>
        </div>

        {/* Calendar */}
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)',
                      borderRadius: 8, padding: '0.55rem 0.75rem', marginBottom: '1rem' }}
          data-testid="hud-calendar">
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: 'var(--color-gold)',
                        marginBottom: '0.15rem' }} data-testid="hud-season">
            {cal.season} · {cal.week_in_month}. Hafta
          </div>
          <div style={{ fontFamily: 'Crimson Text, serif', fontSize: '0.75rem', fontStyle: 'italic',
                        color: 'var(--color-parchment-muted)' }}>
            {cal.month_name} {cal.year}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem',
                      overflowY: 'auto', marginBottom: '0.75rem' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.45rem', letterSpacing: '0.16em',
                        textTransform: 'uppercase', color: 'var(--color-parchment-muted)',
                        padding: '0.2rem 0.75rem 0.4rem' }}>
            Ana Bölümler
          </div>
          {visiblePrimary.map(n => (
            <SideNavItem key={n.to} {...n}
              pulse={(n.testid === "nav-opportunities" && pulseOpportunities) ||
                     (n.testid === "nav-world-news" && pulseNews)} />
          ))}
          <div style={{ height: 1, margin: '0.5rem 0',
                        background: 'linear-gradient(to right, transparent, var(--color-border-hi), transparent)' }} />
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.45rem', letterSpacing: '0.16em',
                        textTransform: 'uppercase', color: 'var(--color-parchment-muted)',
                        padding: '0.2rem 0.75rem 0.4rem' }}>
            Diğer
          </div>
          {visibleSecondary.map(n => (
            <SideNavItem key={n.to} {...n}
              pulse={(n.testid === "nav-opportunities" && pulseOpportunities) ||
                     (n.testid === "nav-world-news" && pulseNews)} />
          ))}
        </nav>

        {/* Advance buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <button onClick={() => onAdvance(1)} disabled={advancing}
            data-testid="advance-week"
            className="btn-ember"
            style={{ padding: '0.6rem', fontSize: '0.6rem', display: 'flex',
                     alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <Hourglass size={13} />
            {advancing ? 'GEÇİYOR…' : 'BİR HAFTA İLERLE'}
          </button>
          <button onClick={() => onAdvance(4)} disabled={advancing}
            data-testid="advance-month"
            className="btn-ghost-ash"
            style={{ padding: '0.5rem', fontSize: '0.55rem' }}>
            BİR AY İLERLE
          </button>
          <div style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between',
                        fontFamily: 'Cinzel, serif', fontSize: '0.5rem',
                        color: 'var(--color-parchment-muted)' }}>
            <span>Tur <span style={{ color: 'var(--color-parchment-dim)' }}
                    data-testid="layout-turn">{state.turn ?? 0}</span></span>
            <button onClick={() => navigate("/yeni-oyun")}
              data-testid="logout-button"
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                       color: 'var(--color-parchment-muted)', fontFamily: 'Cinzel, serif',
                       fontSize: '0.5rem', letterSpacing: '0.08em' }}>
              Yeni Oyun
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Mobile top header (non-dashboard, non-character pages) */}
        {!isDashboard && !isCharacterSheet && (
          <header className="lg:hidden" style={{
            position: 'sticky', top: 0, zIndex: 20,
            background: 'rgba(13,10,6,0.96)', backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--color-border)',
            padding: '0.6rem 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 2px 12px rgba(0,0,0,0.55)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
              <Flame size={16} color="var(--color-gold-dim)"
                style={{ flexShrink: 0, filter: 'drop-shadow(0 0 4px rgba(201,168,76,0.4))' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', fontWeight: 700,
                              color: 'var(--color-parchment)', letterSpacing: '0.08em',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  data-testid="mobile-player-name">
                  {player.name || "Karakter"} · {player.age || 0}y
                </div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.48rem', letterSpacing: '0.12em',
                              textTransform: 'uppercase', color: 'var(--color-parchment-muted)',
                              display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-gold-dim)' }}>{cal.season}</span>
                  <span>·</span>
                  <span>❤{player.health || 0}</span>
                  <span>·</span>
                  <span>{player.money || 0}A</span>
                </div>
              </div>
            </div>
            <button onClick={() => onAdvance(1)} disabled={advancing}
              data-testid="mobile-advance-week"
              className="btn-ember"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.55rem', flexShrink: 0,
                       display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Hourglass size={11} />
              {advancing ? '…' : 'HAFTA'}
            </button>
          </header>
        )}

        {/* Page content */}
        <div style={{
          flex: 1, overflowY: 'auto',
          paddingBottom: isDashboard || isCharacterSheet ? 0 : '7rem',
          padding: isDashboard || isCharacterSheet ? 0 : undefined,
        }}
          className={isDashboard ? '' : 'lg:p-6'}>
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      {/* KarakterEkrani kendi nav barını getiriyor; karakter sayfasında gizle */}
      <nav className="lg:hidden" style={{
        display: isCharacterSheet ? 'none' : undefined,
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        display: 'flex', alignItems: 'center',
        height: 'calc(68px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: '0.25rem', paddingRight: '0.25rem',
        background: 'rgba(13,10,6,0.97)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--color-border-hi)',
        boxShadow: '0 -6px 28px rgba(0,0,0,0.75)',
      }}>
        {/* Gold top line */}
        <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px',
                      background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.2) 50%, transparent)',
                      pointerEvents: 'none' }} />
        {visiblePrimary.map(n => (
          <MobileNavItem key={n.to} {...n}
            pulse={(n.testid === "nav-opportunities" && pulseOpportunities) ||
                   (n.testid === "nav-world-news" && pulseNews)} />
        ))}
        {/* Menü button */}
        <button onClick={() => setShowMore(true)} data-testid="mobile-more-btn"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                   justifyContent: 'center', gap: 4, paddingTop: 4,
                   background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid transparent' }}>
            <Scroll size={17} color="var(--color-parchment-muted)" strokeWidth={1.5} />
          </div>
          <span style={{ fontSize: 10, fontFamily: 'Cinzel, serif', letterSpacing: '0.07em',
                         textTransform: 'uppercase', color: 'var(--color-parchment-muted)' }}>
            Menü
          </span>
        </button>
      </nav>

      {/* More menu overlay */}
      {showMore && <MoreMenu items={visibleSecondary} state={state} onClose={() => setShowMore(false)} />}

      {/* Back button */}
      {lastActionPage && (
        <button data-testid="geri-don-btn"
          onClick={() => { const path = lastActionPage.path; clearLastActionPage(); navigate(path); }}
          style={{
            position: 'fixed', right: '1rem', zIndex: 50,
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
            background: 'var(--color-card)',
            border: '1px solid var(--color-border-hi)',
            borderRadius: 6, padding: '0.45rem 0.75rem',
            fontFamily: 'Cinzel, serif', fontSize: '0.55rem',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--color-parchment-dim)', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}>
          ↩ {lastActionPage.label}
        </button>
      )}

      {/* Inheritance screen */}
      {showInheritance && inheritanceData && (
        <InheritanceScreen data={inheritanceData} onSelect={onInherit} busy={inheritanceBusy} />
      )}
    </div>
  );
}
