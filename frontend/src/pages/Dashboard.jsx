import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Coins, ChevronRight, Scroll, Flame, Shield, Castle, Users,
  Hourglass, Scale, BookMarked, Heart, Crown, Loader2, Sword, Star
} from 'lucide-react';
import { useGame } from '@/lib/GameContext';

// ── SEASON → HERO IMAGE MAP ──────────────────────────────────────────────────
const SEASON_IMAGE = {
  'Yaz':      '/images/hero/cocuk_yaz.jpg',
  'Kış':      '/images/hero/cocuk_kis.jpg',
  'Sonbahar': '/images/hero/cocuk_sonbahar.jpg',
  'İlkbahar': '/images/hero/cocuk_ilkbahar.jpg',
};

// ── EVENT TYPE → DISPLAY CONFIG ──────────────────────────────────────────────
const EVENT_MAP = {
  çalışma:          { type: 'TİCARET',  typeColor: '#4A9A5A', icon: Coins,     iconColor: '#C9A84C', personal: true  },
  ticaret:          { type: 'TİCARET',  typeColor: '#4A9A5A', icon: Coins,     iconColor: '#C9A84C', personal: true  },
  kariyer_terfi:    { type: 'KARİYER',  typeColor: '#C9A84C', icon: Crown,     iconColor: '#C9A84C', personal: true  },
  meslek_değişimi:  { type: 'MESLEK',   typeColor: '#2A6FA8', icon: BookMarked,iconColor: '#2A6FA8', personal: true  },
  yolculuk:         { type: 'SEYAHAT',  typeColor: '#2A6FA8', icon: Scroll,    iconColor: '#2A6FA8', personal: true  },
  savaş_zaferi:     { type: 'SAVAŞ',    typeColor: '#E05A30', icon: Sword,     iconColor: '#E05A30', personal: true  },
  savaş_kaybı:      { type: 'SAVAŞ',    typeColor: '#C84040', icon: Shield,    iconColor: '#C84040', personal: true  },
  savaş_kaçış:      { type: 'KAÇIŞ',   typeColor: '#E05A30', icon: Shield,    iconColor: '#E05A30', personal: true  },
  evlilik:          { type: 'AİLE',     typeColor: '#D4528A', icon: Heart,     iconColor: '#D4528A', personal: true  },
  doğum:            { type: 'AİLE',     typeColor: '#7B4FAF', icon: Star,      iconColor: '#7B4FAF', personal: true  },
  suç:              { type: 'GÖLGE',    typeColor: '#7B3FBF', icon: Shield,    iconColor: '#7B3FBF', personal: true  },
  suç_yakalandı:    { type: 'CEZA',     typeColor: '#C84040', icon: Shield,    iconColor: '#C84040', personal: true  },
  görev_tamamlandı: { type: 'GÖREV',    typeColor: '#4A9A5A', icon: Scroll,    iconColor: '#4A9A5A', personal: true  },
  görev_başarısız:  { type: 'GÖREV',    typeColor: '#C84040', icon: Scroll,    iconColor: '#C84040', personal: true  },
  cocuk_meslek:     { type: 'EĞİTİM',   typeColor: '#2A6FA8', icon: BookMarked,iconColor: '#2A6FA8', personal: true  },
  cocuk_yatirim:    { type: 'YATIRIM',  typeColor: '#4A9A5A', icon: Coins,     iconColor: '#C9A84C', personal: true  },
  kullanım:         { type: 'EŞYA',     typeColor: '#7A6A4F', icon: Scroll,    iconColor: '#7A6A4F', personal: true  },
  kuşanma:          { type: 'EKİPMAN',  typeColor: '#7A6A4F', icon: Shield,    iconColor: '#7A6A4F', personal: true  },
  isyan:            { type: 'DÜNYA',    typeColor: '#D4820A', icon: Scale,     iconColor: '#D4820A', personal: false },
  savaş:            { type: 'DÜNYA',    typeColor: '#C84040', icon: Sword,     iconColor: '#C84040', personal: false },
  kıtlık:           { type: 'DÜNYA',    typeColor: '#D4820A', icon: Scale,     iconColor: '#D4820A', personal: false },
  festival:         { type: 'DÜNYA',    typeColor: '#C9A84C', icon: Star,      iconColor: '#C9A84C', personal: false },
  death:            { type: 'DÜNYA',    typeColor: '#7A6A4F', icon: Scroll,    iconColor: '#7A6A4F', personal: false },
  raid:             { type: 'DÜNYA',    typeColor: '#C84040', icon: Sword,     iconColor: '#C84040', personal: false },
  kriz_kuraklik:    { type: 'KRİZ',     typeColor: '#D4820A', icon: Scale,     iconColor: '#D4820A', personal: false },
  kriz_veba:        { type: 'KRİZ',     typeColor: '#C84040', icon: Scale,     iconColor: '#C84040', personal: false },
  kriz_yangin:      { type: 'KRİZ',     typeColor: '#E05A30', icon: Scale,     iconColor: '#E05A30', personal: false },
};
const DEFAULT_EVENT = { type: 'OLAY', typeColor: '#7A6A4F', icon: Scroll, iconColor: '#7A6A4F', personal: true };

// ── HELPERS ──────────────────────────────────────────────────────────────────
function fameLabel(fame) {
  if (fame >= 80) return 'EFSANEVİ';
  if (fame >= 60) return 'TANILMIŞ';
  if (fame >= 40) return 'DUYULAN';
  if (fame >= 20) return 'BİLİNEN';
  return 'TANINMAYAN';
}

function timeAgo(eventTurn, currentTurn) {
  const diff = (currentTurn || 0) - (eventTurn || 0);
  if (diff <= 0) return 'Az önce';
  if (diff === 1) return '1 hafta önce';
  if (diff < 4)  return `${diff} hafta önce`;
  const months = Math.floor(diff / 4);
  if (months === 1)  return '1 ay önce';
  if (months < 12)   return `${months} ay önce`;
  return `${Math.floor(months / 12)} yıl önce`;
}

function mapChronicleEvent(ev, currentTurn) {
  const cfg = EVENT_MAP[ev.type] || DEFAULT_EVENT;
  const lines  = (ev.narrative || ev.text || '').split('\n').filter(Boolean);
  const title  = lines[0] || ev.text || ev.type;
  const body   = lines.slice(1).join('\n') || '';
  return {
    id:        ev.day + '_' + ev.type,
    icon:      cfg.icon,
    iconColor: cfg.iconColor,
    type:      cfg.type,
    typeColor: cfg.typeColor,
    title,
    body,
    time:      timeAgo(ev.day, currentTurn),
    timeDot:   cfg.typeColor,
    badge:     null,
    urgent:    false,
  };
}

// ── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, barColor, isLast }) {
  const pct = Math.min(100, Math.max(0, (value / (label === 'AKÇE' ? 500 : 100)) * 100));
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center relative"
      style={{
        padding: '0.6rem 0.3rem 0.5rem',
        background: `radial-gradient(ellipse at 50% 0%, ${barColor}0D 0%, transparent 70%), var(--color-card)`,
        borderRight: isLast ? 'none' : '1px solid var(--color-border)',
        boxShadow: `inset 0 2px 12px rgba(0,0,0,0.55), inset 0 -1px 0 rgba(201,168,76,0.06)`,
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(to right, transparent 0%, ${barColor}99 30%, ${barColor} 50%, ${barColor}99 70%, transparent 100%)`,
        boxShadow: `0 0 8px ${barColor}60`,
      }} />
      <div style={{
        width: '1.8rem', height: '1.8rem', borderRadius: '50%',
        background: `radial-gradient(circle, ${barColor}18 0%, transparent 70%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '0.12rem',
      }}>
        <span style={{ fontSize: '1.1rem', lineHeight: 1, filter: `drop-shadow(0 0 4px ${barColor}88)` }}>
          {icon}
        </span>
      </div>
      <div className="font-display font-bold leading-none"
        style={{
          fontSize: '1.05rem',
          color: 'var(--color-parchment)',
          letterSpacing: '0.02em',
          textShadow: `0 0 12px ${barColor}44, 0 1px 3px rgba(0,0,0,0.8)`,
          marginBottom: '0.15rem',
        }}>
        {label === 'AKÇE' ? `${value}A` : value}
      </div>
      <div className="font-display uppercase"
        style={{
          fontSize: '0.48rem',
          color: 'var(--color-parchment-muted)',
          letterSpacing: '0.13em',
          marginBottom: '0.4rem',
        }}>
        {label}
      </div>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px',
        background: 'rgba(0,0,0,0.5)',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(to right, ${barColor}77, ${barColor}EE)`,
          boxShadow: `0 0 8px ${barColor}99, 0 0 3px ${barColor}`,
          borderRadius: '0 2px 2px 0',
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

// ── EVENT CARD ────────────────────────────────────────────────────────────────
function EventCard({ event, isLast }) {
  const IconComp = event.icon;
  const isUrgent = event.urgent;
  return (
    <div className="relative flex gap-0" style={{ paddingBottom: isLast ? 0 : '0.5rem' }}>
      {!isLast && (
        <div style={{
          position: 'absolute', left: '1.42rem', top: '3.1rem', bottom: '-0.5rem',
          width: '2px',
          background: 'linear-gradient(to bottom, rgba(184,148,64,0.7) 0%, rgba(120,88,40,0.45) 50%, rgba(80,56,24,0.18) 100%)',
          boxShadow: '0 0 6px rgba(184,148,64,0.18)',
        }} />
      )}
      <div style={{ width: '2.85rem', flexShrink: 0, paddingTop: '0.7rem', zIndex: 1 }}>
        <div style={{
          width: '2.1rem', height: '2.1rem', borderRadius: '50%',
          background: isUrgent
            ? `radial-gradient(circle at 40% 30%, rgba(224,90,48,0.18) 0%, var(--color-card) 70%)`
            : `radial-gradient(circle at 40% 30%, rgba(201,168,76,0.10) 0%, var(--color-card) 70%)`,
          border: `1.5px solid ${isUrgent ? event.iconColor + '70' : 'rgba(184,148,64,0.35)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isUrgent
            ? `0 0 14px ${event.iconColor}35, inset 0 1px 0 rgba(255,255,255,0.05)`
            : `0 0 10px rgba(184,148,64,0.18), inset 0 1px 0 rgba(255,255,255,0.04)`,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 3, borderRadius: '50%',
            background: `radial-gradient(circle, ${event.iconColor}12 0%, transparent 70%)`,
          }} />
          <IconComp size={12} color={event.iconColor} strokeWidth={1.8} />
        </div>
      </div>
      <div className="flex-1 card-shadow" style={{
        background: isUrgent
          ? `linear-gradient(160deg, rgba(224,90,48,0.06) 0%, var(--color-card) 40%)`
          : 'var(--color-card)',
        border: `1px solid ${isUrgent ? event.iconColor + '30' : 'var(--color-border)'}`,
        borderLeft: `2.5px solid ${event.iconColor}55`,
        borderRadius: '8px',
        padding: '0.75rem 0.9rem',
        marginBottom: '0.1rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: `linear-gradient(to right, ${event.iconColor}22, ${event.iconColor}44 40%, transparent)`,
        }} />
        <div className="flex items-center justify-between" style={{ marginBottom: '0.4rem' }}>
          <div className="flex items-center gap-1.5">
            <div style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: event.typeColor, boxShadow: `0 0 5px ${event.typeColor}`, flexShrink: 0,
            }} />
            <span className="font-display uppercase"
              style={{ fontSize: '0.55rem', color: event.typeColor, letterSpacing: '0.16em', fontWeight: 700 }}>
              {event.type}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{
              fontSize: '0.6rem', color: 'var(--color-parchment-muted)',
              fontFamily: 'Crimson Text, serif', fontStyle: 'italic',
            }}>
              {event.time}
            </span>
            <div style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: event.timeDot + '99',
            }} />
          </div>
        </div>
        <div className="font-serif font-semibold"
          style={{
            fontSize: '0.88rem',
            color: 'var(--color-parchment)',
            lineHeight: '1.35',
            marginBottom: event.body ? '0.35rem' : '0.15rem',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}>
          {event.title}
        </div>
        {event.body ? (
          <div className="font-serif"
            style={{
              fontSize: '0.78rem', color: 'var(--color-parchment-muted)',
              lineHeight: '1.5', whiteSpace: 'pre-line',
              marginBottom: event.badge ? '0.7rem' : '0.1rem',
            }}>
            {event.body}
          </div>
        ) : null}
        {event.badge ? (
          <div className="flex justify-end">
            <div style={{
              background: event.badge.color,
              border: `1px solid ${event.badge.textColor}50`,
              borderRadius: '5px', padding: '0.2rem 0.6rem',
              fontSize: '0.7rem', color: event.badge.textColor,
              fontFamily: 'Cinzel, serif', fontWeight: 700, letterSpacing: '0.05em',
              boxShadow: `0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 ${event.badge.textColor}20`,
            }}>
              {event.badge.label}
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <ChevronRight size={12} color="var(--color-parchment-muted)" strokeWidth={1.5} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── NAV ITEM (uses NavLink for routing) ───────────────────────────────────────
function NavItem({ icon: Icon, label, to, end }) {
  return (
    <NavLink to={to} end={end} style={{ flex: 1, textDecoration: 'none' }}>
      {({ isActive }) => (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '0.18rem',
          paddingTop: '0.45rem', paddingBottom: '0.35rem',
          position: 'relative',
        }}>
          {isActive && (
            <div style={{
              position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px',
              background: 'linear-gradient(to right, transparent, var(--color-gold-bright), var(--color-gold), var(--color-gold-bright), transparent)',
              boxShadow: '0 0 10px var(--color-gold), 0 0 20px rgba(201,168,76,0.40)',
              borderRadius: '0 0 2px 2px',
            }} />
          )}
          <div style={{
            width: '2rem', height: '2rem', borderRadius: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isActive
              ? 'linear-gradient(145deg, rgba(201,168,76,0.20) 0%, rgba(201,168,76,0.08) 100%)'
              : 'rgba(255,255,255,0.02)',
            border: isActive
              ? '1px solid rgba(201,168,76,0.45)'
              : '1px solid rgba(255,255,255,0.04)',
            boxShadow: isActive
              ? '0 0 14px rgba(201,168,76,0.30), inset 0 1px 0 rgba(201,168,76,0.18), 0 2px 4px rgba(0,0,0,0.4)'
              : 'none',
            transition: 'all 0.2s',
          }}>
            <Icon size={16}
              color={isActive ? 'var(--color-gold)' : 'var(--color-parchment-muted)'}
              strokeWidth={isActive ? 2 : 1.5} />
          </div>
          <span className="font-display uppercase"
            style={{
              fontSize: '0.47rem', letterSpacing: '0.09em',
              color: isActive ? 'var(--color-gold)' : 'var(--color-parchment-muted)',
              textShadow: isActive ? '0 0 8px rgba(201,168,76,0.5)' : 'none',
            }}>
            {label}
          </span>
        </div>
      )}
    </NavLink>
  );
}

// ── CORNER ORNAMENT ───────────────────────────────────────────────────────────
function CornerOrnament({ position }) {
  const isTop  = position.includes('top');
  const isLeft = position.includes('left');
  return (
    <div style={{
      position: 'absolute',
      top: isTop ? 0 : 'auto', bottom: isTop ? 'auto' : 0,
      left: isLeft ? 0 : 'auto', right: isLeft ? 'auto' : 0,
      width: '18px', height: '18px', pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute',
        top: isTop ? '4px' : 'auto', bottom: isTop ? 'auto' : '4px',
        left: isLeft ? '4px' : 'auto', right: isLeft ? 'auto' : '4px',
        width: '10px', height: '1.5px',
        background: 'rgba(201,168,76,0.75)', boxShadow: '0 0 4px rgba(201,168,76,0.4)',
      }} />
      <div style={{
        position: 'absolute',
        top: isTop ? '4px' : 'auto', bottom: isTop ? 'auto' : '4px',
        left: isLeft ? '4px' : 'auto', right: isLeft ? 'auto' : '4px',
        width: '1.5px', height: '10px',
        background: 'rgba(201,168,76,0.75)', boxShadow: '0 0 4px rgba(201,168,76,0.4)',
      }} />
      <div style={{
        position: 'absolute',
        top: isTop ? '3.5px' : 'auto', bottom: isTop ? 'auto' : '3.5px',
        left: isLeft ? '3.5px' : 'auto', right: isLeft ? 'auto' : '3.5px',
        width: '2.5px', height: '2.5px', borderRadius: '50%',
        background: 'var(--color-gold)', boxShadow: '0 0 4px rgba(201,168,76,0.8)',
      }} />
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { state, advance } = useGame() || {};
  const [activeTab, setActiveTab]     = useState('gunluk');
  const [advancing, setAdvancing]     = useState(false);

  // ── Loading / no state ─────────────────────────────────────────────────────
  if (!state || !state.player) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Loader2 size={32} color="var(--color-gold)" className="animate-spin" />
      </div>
    );
  }

  // ── Extract real data from state ───────────────────────────────────────────
  const player    = state.player;
  const cal       = state.calendar || {};
  const chronicle = state.history || [];
  const turn      = state.turn || 0;

  const playerName  = (player.name || 'Kahraman').toUpperCase();
  const careerTitle = player.career?.title || player.profession || 'İşsiz';
  const titleIcon   = '⚒';
  const playerAge   = player.age || 0;
  const season      = cal.season || 'Yaz';
  const dateStr     = `${cal.month_name || 'Ocak'} ${cal.year || 1247}`.toUpperCase();
  const fame        = player.fame || 0;
  const repTitle    = fameLabel(fame);
  const heroImage   = SEASON_IMAGE[season] || SEASON_IMAGE['Yaz'];

  const stats = {
    health: Math.round(player.health || 0),
    hunger: Math.round(player.hunger ?? 100),
    money:  Math.round(player.money  || 0),
    fame:   Math.round(fame),
  };

  // ── Filter events by tab ───────────────────────────────────────────────────
  const reversed = [...chronicle].reverse();

  const personalEvents = reversed.filter(e => {
    const cfg = EVENT_MAP[e.type];
    return cfg ? cfg.personal !== false : true;
  }).slice(0, 8);

  const worldEvents = reversed.filter(e => {
    const cfg = EVENT_MAP[e.type];
    return cfg ? cfg.personal === false : false;
  }).slice(0, 8);

  const currentTabEvents =
    activeTab === 'gunluk' ? personalEvents :
    activeTab === 'dunya'  ? worldEvents    :
    [];

  // ── Advance handler ────────────────────────────────────────────────────────
  const handleAdvance = async () => {
    if (advancing || !advance) return;
    setAdvancing(true);
    try {
      const result = await advance(1);
      if (result && !result.player?.dead) {
        toast.success('1 hafta geçti', {
          description: 'Yeni olaylar günlüğünde belirdi.',
          duration: 2500,
        });
      }
    } finally {
      setAdvancing(false);
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
      maxWidth: '480px', margin: '0 auto', position: 'relative',
    }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="hero-section">
        <div className="hero-image" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="hero-bg" />
        <div className="hero-overlay" />

        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column',
          padding: '0.8rem 0.9rem 1rem', justifyContent: 'flex-start',
        }}>
          <div className="flex items-start justify-between">

            {/* Avatar */}
            <div style={{
              width: '3.2rem', height: '3.2rem', borderRadius: '50%', flexShrink: 0,
              border: '2px solid var(--color-gold)',
              boxShadow: '0 0 0 3px rgba(201,168,76,0.15), 0 0 16px rgba(201,168,76,0.45)',
              background: 'linear-gradient(135deg, #3A2010 0%, #2A1808 50%, #1A0E06 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '1.3rem' }}>👤</span>
            </div>

            {/* Name / Title / Meta */}
            <div className="flex-1 flex flex-col items-center"
              style={{ paddingTop: '0.05rem', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
              <h1 className="font-display font-bold text-center"
                style={{
                  fontSize: '1.05rem',
                  color: 'var(--color-parchment)',
                  letterSpacing: '0.16em', lineHeight: 1.1, marginBottom: '0.2rem',
                  textShadow: '0 1px 12px rgba(0,0,0,0.9), 0 0 28px rgba(201,168,76,0.22)',
                }}>
                {playerName}
              </h1>
              <div style={{
                width: '60%', height: '1px', marginBottom: '0.22rem',
                background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.55), transparent)',
              }} />
              <div className="font-serif flex items-center gap-1"
                style={{
                  fontSize: '0.8rem', color: 'var(--color-gold)', letterSpacing: '0.04em',
                  marginBottom: '0.4rem',
                  textShadow: '0 1px 8px rgba(0,0,0,0.8)',
                  fontStyle: 'italic',
                }}>
                <span style={{ fontStyle: 'normal' }}>{titleIcon}</span>
                {careerTitle}
              </div>
              <div className="flex items-center gap-2 font-display uppercase"
                style={{
                  fontSize: '0.5rem', color: 'var(--color-parchment-dim)', letterSpacing: '0.12em',
                  background: 'rgba(8,5,2,0.45)', borderRadius: '20px',
                  padding: '0.2rem 0.6rem',
                  border: '1px solid rgba(201,168,76,0.12)',
                  backdropFilter: 'blur(4px)',
                }}>
                <span>🛡 {playerAge} YAŞ</span>
                <span style={{ color: 'var(--color-border-hi)', fontSize: '0.7rem' }}>·</span>
                <span>❄ {season.toUpperCase()}</span>
                <span style={{ color: 'var(--color-border-hi)', fontSize: '0.7rem' }}>·</span>
                <span>📅 {dateStr}</span>
              </div>
            </div>

            {/* Rep Badge */}
            <div className="flex flex-col items-center" style={{ paddingTop: '0.05rem', gap: '0.15rem' }}>
              <div style={{
                width: '2.4rem', height: '2.4rem', borderRadius: '8px',
                background: 'rgba(8,5,2,0.72)',
                border: '1.5px solid rgba(201,168,76,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 10px rgba(201,168,76,0.22)',
                backdropFilter: 'blur(6px)',
              }}>
                <span style={{ fontSize: '1rem' }}>🦁</span>
              </div>
              <span className="font-display uppercase text-center"
                style={{
                  fontSize: '0.4rem', color: 'var(--color-parchment-muted)',
                  letterSpacing: '0.07em', lineHeight: 1.3,
                }}>
                {repTitle}
              </span>
              <div style={{
                width: '1.4rem', height: '1.4rem', borderRadius: '50%',
                background: 'rgba(8,5,2,0.80)',
                border: '1.5px solid rgba(201,168,76,0.40)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="font-display font-bold"
                  style={{ fontSize: '0.62rem', color: 'var(--color-parchment)' }}>
                  {stats.fame}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-sep" />
      </div>

      {/* ── STATS BAR ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        background: 'var(--color-surface)',
        borderTop: '1px solid rgba(201,168,76,0.30)',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
      }}>
        <StatCard icon="❤"  value={stats.health} label="SAĞLIK"  barColor="#C84040" />
        <StatCard icon="🍎" value={stats.hunger} label="TOKLUK"  barColor="#4A9A5A" />
        <StatCard icon="💰" value={stats.money}  label="AKÇE"    barColor="#C9A84C" />
        <StatCard icon="👑" value={stats.fame}   label="TANINMA" barColor="#7B4FAF" isLast />
      </div>

      {/* ── SCROLLABLE CONTENT ─────────────────────────────────────────────── */}
      <div style={{ paddingBottom: '10.5rem', background: 'var(--color-bg)' }}>

        {/* ── JOURNAL PANEL ─────────────────────────────────────────────── */}
        <div style={{
          margin: '0.7rem 0.75rem 0',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border-hi)',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Corner accents */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '40px', height: '40px',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.18) 0%, transparent 60%)',
            borderRadius: '10px 0 0 0', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: 0, right: 0, width: '40px', height: '40px',
            background: 'linear-gradient(225deg, rgba(201,168,76,0.12) 0%, transparent 60%)',
            borderRadius: '0 10px 0 0', pointerEvents: 'none',
          }} />

          {/* Panel Header */}
          <div style={{
            padding: '0.85rem 0.9rem 0',
            background: 'linear-gradient(180deg, rgba(201,168,76,0.05) 0%, transparent 100%)',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <div style={{
                    width: '3px', height: '1.2rem', borderRadius: '2px',
                    background: 'linear-gradient(to bottom, var(--color-gold-bright), var(--color-gold-dim))',
                    boxShadow: '0 0 6px rgba(201,168,76,0.5)', flexShrink: 0,
                  }} />
                  <h2 className="font-display font-bold"
                    style={{
                      fontSize: '0.88rem', color: 'var(--color-gold)',
                      letterSpacing: '0.14em',
                      textShadow: '0 0 16px rgba(201,168,76,0.35)',
                    }}>
                    HAYAT GÜNLÜĞÜ
                  </h2>
                </div>
                <p className="font-serif"
                  style={{
                    fontSize: '0.7rem', color: 'var(--color-parchment-muted)',
                    marginTop: '0.08rem', marginLeft: '0.9rem', fontStyle: 'italic',
                  }}>
                  Yaşananların izleri...
                </p>
              </div>
              <button style={{
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                paddingTop: '0.12rem', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Cinzel, serif', fontSize: '0.53rem',
                fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--color-gold-dim)',
              }}>
                TÜMÜNÜ GÖR
                <ChevronRight size={10} strokeWidth={2} color="var(--color-gold-dim)" />
              </button>
            </div>

            <div style={{
              height: '1px', marginBottom: '0.6rem', marginLeft: '0.9rem',
              background: 'linear-gradient(to right, rgba(201,168,76,0.25), transparent)',
            }} />

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem', paddingBottom: '0.65rem' }}>
              {[
                { key: 'gunluk', icon: '📋', label: 'GÜNLÜK' },
                { key: 'dunya',  icon: '🌍', label: 'DÜNYA' },
                { key: 'icsel',  icon: '✨', label: 'İÇSEL ARZU' },
              ].map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.32rem',
                      padding: '0.45rem 0.25rem', borderRadius: '7px',
                      fontFamily: 'Cinzel, serif', fontSize: '0.52rem',
                      fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase',
                      cursor: 'pointer', transition: 'all 0.2s',
                      border: isActive ? '1px solid rgba(201,168,76,0.45)' : '1px solid var(--color-border)',
                      background: isActive
                        ? 'linear-gradient(160deg, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.07) 100%)'
                        : 'linear-gradient(160deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
                      color: isActive ? 'var(--color-gold)' : 'var(--color-parchment-muted)',
                      boxShadow: isActive ? '0 0 12px rgba(201,168,76,0.18)' : 'none',
                      position: 'relative', overflow: 'hidden',
                    }}>
                    {isActive && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: '15%', right: '15%', height: '1.5px',
                        background: 'linear-gradient(to right, transparent, var(--color-gold), transparent)',
                        boxShadow: '0 0 6px var(--color-gold)',
                      }} />
                    )}
                    <span style={{ fontSize: '0.65rem' }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event list */}
          <div style={{ padding: '0.85rem 0.85rem 1rem' }}>
            {currentTabEvents.length > 0 ? (
              currentTabEvents.map((ev, i) => (
                <EventCard
                  key={ev.day + '_' + ev.type + '_' + i}
                  event={mapChronicleEvent(ev, turn)}
                  isLast={i === currentTabEvents.length - 1}
                />
              ))
            ) : (
              <div style={{
                textAlign: 'center', padding: '1.8rem 0.5rem',
                color: 'var(--color-parchment-muted)',
              }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem', opacity: 0.4 }}>
                  {activeTab === 'gunluk' ? '📜' : activeTab === 'dunya' ? '🌍' : '✨'}
                </div>
                <p className="font-serif" style={{ fontSize: '0.85rem', fontStyle: 'italic', lineHeight: 1.5 }}>
                  {activeTab === 'gunluk'
                    ? 'Günlüğün henüz boş.\nHaftayı ilerlet, yeni hikayeler başlasın.'
                    : activeTab === 'dunya'
                    ? 'Dünyadan henüz haber yok.\nBüyük olaylar yakında gelecek.'
                    : 'İçsel arzuların şekilleniyor...\nFırsatlar bölümünü keşfet.'}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── ADVANCE BUTTON (fixed, above nav) ─────────────────────────────── */}
      <div className="lg:hidden" style={{
        position: 'fixed',
        bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))',
        left: '50%', transform: 'translateX(-50%)',
        width: 'min(480px, 100vw)',
        padding: '0 0.875rem', zIndex: 55,
      }}>
        <button
          onClick={handleAdvance}
          disabled={advancing}
          className="w-full animate-pulse-gold"
          style={{
            background: advancing
              ? 'linear-gradient(180deg, #2A1C06 0%, #1A1004 100%)'
              : 'linear-gradient(180deg, #3D2A08 0%, #2C1E06 35%, #1E1404 70%, #160E02 100%)',
            border: '1.5px solid rgba(201,168,76,0.55)',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.9rem', cursor: advancing ? 'wait' : 'pointer',
            boxShadow: '0 0 30px rgba(201,168,76,0.25), 0 6px 24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(201,168,76,0.25)',
            position: 'relative', overflow: 'hidden',
            opacity: advancing ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}>
          <div style={{
            position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(240,192,64,0.7) 30%, rgba(240,192,64,0.9) 50%, rgba(240,192,64,0.7) 70%, transparent)',
          }} />
          <CornerOrnament position="top-left" />
          <CornerOrnament position="top-right" />
          <CornerOrnament position="bottom-left" />
          <CornerOrnament position="bottom-right" />

          {advancing ? (
            <Loader2 size={20} color="var(--color-gold)" className="animate-spin" style={{ filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.6))' }} />
          ) : (
            <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.6))' }}>⏳</span>
          )}
          <div style={{ textAlign: 'left' }}>
            <div className="font-display font-bold uppercase"
              style={{
                fontSize: '0.9rem', color: 'var(--color-gold)',
                letterSpacing: '0.2em',
                textShadow: '0 0 14px rgba(201,168,76,0.6)',
              }}>
              {advancing ? 'HAFTA İLERLİYOR…' : 'HAFTAYI İLERLE'}
            </div>
            <div className="font-serif"
              style={{
                fontSize: '0.68rem', color: 'var(--color-parchment-muted)',
                fontStyle: 'italic', marginTop: '0.08rem',
              }}>
              {advancing ? 'Birkaç saniye bekle...' : 'Yeni olaylar seni bekliyor...'}
            </div>
          </div>
          <div style={{ position: 'absolute', right: '1rem', opacity: advancing ? 0 : 0.5 }}>
            <ChevronRight size={14} color="var(--color-gold)" strokeWidth={1.5} />
          </div>
        </button>
      </div>

      {/* ── BOTTOM NAV ────────────────────────────────────────────────────────── */}
      <nav className="lg:hidden" style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: 'min(480px, 100vw)',
        background: 'linear-gradient(180deg, var(--color-surface) 0%, #0F0B07 100%)',
        borderTop: '1px solid var(--color-border-hi)',
        display: 'flex', zIndex: 60,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -6px 28px rgba(0,0,0,0.65)',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.22) 50%, transparent)',
          pointerEvents: 'none',
        }} />
        <NavItem icon={Flame}  label="Ana Sayfa" to="/oyun"           end={true} />
        <NavItem icon={Shield} label="Karakter"  to="/oyun/karakter"  />
        <NavItem icon={Castle} label="Şehir"     to="/oyun/harita"    />
        <NavItem icon={Users}  label="İlişkiler" to="/oyun/iliskiler" />
        <NavItem icon={Scroll} label="Menü"      to="/oyun/meslek"    />
      </nav>

    </div>
  );
}
