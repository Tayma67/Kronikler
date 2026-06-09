import React, { useState } from 'react';
import {
  Coins, ChevronRight, Scroll, Flame, Shield, Castle, Users,
  Hourglass, Scale, BookMarked, Home, Map, Sword
} from 'lucide-react';

// ── SEASON → HERO IMAGE MAP ──────────────────────────────────────────────────
const SEASON_IMAGE = {
  'YAZ':       '/images/hero/cocuk_yaz.jpg',
  'KIŞ':       '/images/hero/cocuk_kis.jpg',
  'SONBAHAR':  '/images/hero/cocuk_sonbahar.jpg',
  'İLKBAHAR':  '/images/hero/cocuk_ilkbahar.jpg',
};

// ── MOCK DATA ────────────────────────────────────────────────────────────────
const character = {
  name:      'İLKNUR HAN',
  title:     'Demirci Çırağı',
  titleIcon: '⚒',
  age:       15,
  season:    'YAZ',
  date:      'HAZİRAN 1255',
  rep:       3,
  repTitle:  'TANINMAYAN',
  repIcon:   '🦁',
  stats: { health: 100, hunger: 75, money: 158.4, fame: 3 },
};

const events = {
  gunluk: [
    {
      id: 1, type: 'ACİL', typeColor: '#E05A30',
      icon: Hourglass, iconColor: '#E05A30',
      title: '3 fırsat bu hafta kapanıyor — kaçırma!',
      body: 'Bazı önemli fırsatlar zamanla kaybolur.\nKararlarını iyi seç.',
      time: 'Az önce', timeDot: '#E05A30', badge: null,
      urgent: true,
    },
    {
      id: 2, type: 'DÜNYA', typeColor: '#D4820A',
      icon: Scale, iconColor: '#D4820A',
      title: "Külkale'de halkın huzursuzluğu artıyor.",
      body: 'Pazar yerinde ekmek fiyatları son haftalarda iki katına çıktı.\nYerel yöneticiler olası bir isyandan endişe ediyor.',
      time: '2 saat önce', timeDot: '#D4820A',
      badge: { label: '⚠ İsyan Riski +12', color: '#7B2020', textColor: '#E05A30' },
      urgent: true,
    },
    {
      id: 3, type: 'TİCARET', typeColor: '#4A9A5A',
      icon: Coins, iconColor: '#C9A84C',
      title: 'Değirmende çalışarak ustana yardım ettin.',
      body: 'Bugün un çuvallarını taşıyarak emeğini gösterdin.\nUstan senden memnun kaldı.',
      time: '5 saat önce', timeDot: '#4A9A5A',
      badge: { label: '💰 +5 Akçe', color: '#1A3020', textColor: '#C9A84C' },
      urgent: false,
    },
    {
      id: 4, type: 'BİLGİ', typeColor: '#2A6FA8',
      icon: BookMarked, iconColor: '#2A6FA8',
      title: 'Yaşlı bir adamla uzun uzun konuştun.',
      body: 'Sana eski savaşlardan ve krallıkların yükselişinden bahsetti.\nÇok şey öğrendin.',
      time: '1 gün önce', timeDot: '#2A6FA8',
      badge: { label: '📚 +1 Bilgi', color: '#0D2040', textColor: '#4A9AE8' },
      urgent: false,
    },
  ],
};

// ── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, barColor, isLast }) {
  const pct = Math.min(100, Math.max(0, (value / (label === 'AKÇE' ? 500 : 100)) * 100));
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center relative"
      style={{
        padding: '0.85rem 0.4rem 0.6rem',
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
        width: '2.2rem', height: '2.2rem', borderRadius: '50%',
        background: `radial-gradient(circle, ${barColor}18 0%, transparent 70%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '0.18rem',
      }}>
        <span style={{ fontSize: '1.45rem', lineHeight: 1, filter: `drop-shadow(0 0 4px ${barColor}88)` }}>
          {icon}
        </span>
      </div>

      <div className="font-display font-bold leading-none"
        style={{
          fontSize: 'clamp(1.1rem, 4.5vw, 1.4rem)',
          color: 'var(--color-parchment)',
          letterSpacing: '0.02em',
          textShadow: `0 0 12px ${barColor}44, 0 1px 3px rgba(0,0,0,0.8)`,
          marginBottom: '0.2rem',
        }}>
        {label === 'AKÇE' ? `${value}A` : value}
      </div>

      <div className="font-display uppercase"
        style={{
          fontSize: '0.52rem',
          color: 'var(--color-parchment-muted)',
          letterSpacing: '0.13em',
          marginBottom: '0.5rem',
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

// ── STEP 6+7+8: ENHANCED EVENT CARD WITH PREMIUM TIMELINE ────────────────────
function EventCard({ event, isLast }) {
  const IconComp = event.icon;
  const isUrgent = event.urgent;

  return (
    <div className="relative flex gap-0" style={{ paddingBottom: isLast ? 0 : '0.5rem' }}>

      {/* ── STEP 6: Premium Timeline Line ── */}
      {!isLast && (
        <div style={{
          position: 'absolute',
          left: '1.42rem',
          top: '3.1rem',
          bottom: '-0.5rem',
          width: '2px',
          background: 'linear-gradient(to bottom, rgba(184,148,64,0.7) 0%, rgba(120,88,40,0.45) 50%, rgba(80,56,24,0.18) 100%)',
          boxShadow: '0 0 6px rgba(184,148,64,0.18)',
        }} />
      )}

      {/* ── STEP 6: Timeline Icon Circle (Ornate) ── */}
      <div style={{ width: '2.85rem', flexShrink: 0, paddingTop: '0.7rem', zIndex: 1 }}>
        {/* Outer ring */}
        <div style={{
          width: '2.25rem', height: '2.25rem', borderRadius: '50%',
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
          {/* Inner subtle glow dot */}
          <div style={{
            position: 'absolute', inset: 3,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${event.iconColor}12 0%, transparent 70%)`,
          }} />
          <IconComp size={13} color={event.iconColor} strokeWidth={1.8} />
        </div>
      </div>

      {/* ── STEP 7+8: Story Card Body ── */}
      <div className="flex-1 card-shadow" style={{
        background: isUrgent
          ? `linear-gradient(160deg, rgba(224,90,48,0.06) 0%, var(--color-card) 40%)`
          : 'var(--color-card)',
        border: `1px solid ${isUrgent ? event.iconColor + '30' : 'var(--color-border)'}`,
        borderLeft: `2.5px solid ${event.iconColor}55`,
        borderRadius: '8px',
        padding: '1rem 1.05rem 1rem',
        marginBottom: '0.1rem',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Subtle top sheen */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: `linear-gradient(to right, ${event.iconColor}22, ${event.iconColor}44 40%, transparent)`,
        }} />

        {/* ── Type label + timestamp ── */}
        <div className="flex items-center justify-between" style={{ marginBottom: '0.6rem' }}>
          <div className="flex items-center gap-1.5">
            <div style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: event.typeColor,
              boxShadow: `0 0 5px ${event.typeColor}`,
              flexShrink: 0,
            }} />
            <span className="font-display uppercase"
              style={{ fontSize: '0.6rem', color: event.typeColor, letterSpacing: '0.16em', fontWeight: 700 }}>
              {event.type}
            </span>
          </div>
          <span style={{
            fontSize: '0.65rem',
            color: 'var(--color-parchment-muted)',
            fontFamily: 'Crimson Text, serif',
            fontStyle: 'italic',
          }}>
            {event.time}
          </span>
        </div>

        {/* ── STEP 7+8: Title (story size) ── */}
        <div className="font-serif font-semibold"
          style={{
            fontSize: '1.05rem',
            color: 'var(--color-parchment)',
            lineHeight: '1.32',
            marginBottom: '0.5rem',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}>
          {event.title}
        </div>

        {/* ── Body text ── */}
        <div className="font-serif"
          style={{
            fontSize: '0.86rem',
            color: 'var(--color-parchment-muted)',
            lineHeight: '1.55',
            whiteSpace: 'pre-line',
            marginBottom: event.badge ? '0.85rem' : '0.2rem',
          }}>
          {event.body}
        </div>

        {/* ── STEP 8: Badge (bottom-right, physical stamp) ── */}
        {event.badge ? (
          <div className="flex items-end justify-between" style={{ alignItems: 'center' }}>
            <div />
            <div style={{
              background: event.badge.color,
              border: `1px solid ${event.badge.textColor}50`,
              borderRadius: '5px',
              padding: '0.22rem 0.65rem',
              fontSize: '0.72rem',
              color: event.badge.textColor,
              fontFamily: 'Cinzel, serif',
              fontWeight: 700,
              letterSpacing: '0.05em',
              boxShadow: `0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 ${event.badge.textColor}20`,
              position: 'relative',
            }}>
              {/* Top highlight on stamp */}
              <div style={{
                position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
                background: `linear-gradient(to right, transparent, ${event.badge.textColor}30, transparent)`,
              }} />
              {event.badge.label}
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <ChevronRight size={14} color="var(--color-parchment-muted)" strokeWidth={1.5} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── STEP 10: ENHANCED NAV ITEM ────────────────────────────────────────────────
function NavItem({ icon: Icon, label, active }) {
  return (
    <button style={{
      flex: 1,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '0.22rem',
      paddingTop: '0.55rem', paddingBottom: '0.4rem',
      border: 'none', background: 'transparent',
      cursor: 'pointer', position: 'relative',
      transition: 'all 0.2s',
    }}>
      {/* STEP 10: Active top bar — gold glow */}
      {active && (
        <div style={{
          position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px',
          background: 'linear-gradient(to right, transparent, var(--color-gold-bright), var(--color-gold), var(--color-gold-bright), transparent)',
          boxShadow: '0 0 10px var(--color-gold), 0 0 20px rgba(201,168,76,0.40)',
          borderRadius: '0 0 2px 2px',
        }} />
      )}

      {/* STEP 10: Icon container with premium active state */}
      <div style={{
        width: '2.2rem', height: '2.2rem', borderRadius: '9px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active
          ? 'linear-gradient(145deg, rgba(201,168,76,0.20) 0%, rgba(201,168,76,0.08) 100%)'
          : 'rgba(255,255,255,0.02)',
        border: active
          ? '1px solid rgba(201,168,76,0.45)'
          : '1px solid rgba(255,255,255,0.04)',
        boxShadow: active
          ? '0 0 14px rgba(201,168,76,0.30), inset 0 1px 0 rgba(201,168,76,0.18), 0 2px 4px rgba(0,0,0,0.4)'
          : 'none',
        transition: 'all 0.2s',
      }}>
        <Icon size={17}
          color={active ? 'var(--color-gold)' : 'var(--color-parchment-muted)'}
          strokeWidth={active ? 2 : 1.5} />
      </div>

      {/* STEP 10: Label */}
      <span className="font-display uppercase"
        style={{
          fontSize: '0.5rem', letterSpacing: '0.09em',
          color: active ? 'var(--color-gold)' : 'var(--color-parchment-muted)',
          textShadow: active ? '0 0 8px rgba(201,168,76,0.5)' : 'none',
          transition: 'all 0.2s',
        }}>
        {label}
      </span>
    </button>
  );
}

// ── STEP 9: DECORATIVE CORNER ORNAMENT ───────────────────────────────────────
function CornerOrnament({ position }) {
  const isTop = position.includes('top');
  const isLeft = position.includes('left');
  return (
    <div style={{
      position: 'absolute',
      top: isTop ? 0 : 'auto',
      bottom: isTop ? 'auto' : 0,
      left: isLeft ? 0 : 'auto',
      right: isLeft ? 'auto' : 0,
      width: '18px', height: '18px',
      pointerEvents: 'none',
    }}>
      {/* Horizontal bar */}
      <div style={{
        position: 'absolute',
        top: isTop ? '4px' : 'auto', bottom: isTop ? 'auto' : '4px',
        left: isLeft ? '4px' : 'auto', right: isLeft ? 'auto' : '4px',
        width: '10px', height: '1.5px',
        background: 'rgba(201,168,76,0.75)',
        boxShadow: '0 0 4px rgba(201,168,76,0.4)',
      }} />
      {/* Vertical bar */}
      <div style={{
        position: 'absolute',
        top: isTop ? '4px' : 'auto', bottom: isTop ? 'auto' : '4px',
        left: isLeft ? '4px' : 'auto', right: isLeft ? 'auto' : '4px',
        width: '1.5px', height: '10px',
        background: 'rgba(201,168,76,0.75)',
        boxShadow: '0 0 4px rgba(201,168,76,0.4)',
      }} />
      {/* Corner dot */}
      <div style={{
        position: 'absolute',
        top: isTop ? '3.5px' : 'auto', bottom: isTop ? 'auto' : '3.5px',
        left: isLeft ? '3.5px' : 'auto', right: isLeft ? 'auto' : '3.5px',
        width: '2.5px', height: '2.5px', borderRadius: '50%',
        background: 'var(--color-gold)',
        boxShadow: '0 0 4px rgba(201,168,76,0.8)',
      }} />
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('gunluk');
  const { stats } = character;
  const heroImage = SEASON_IMAGE[character.season] || SEASON_IMAGE['YAZ'];

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
      maxWidth: '480px', margin: '0 auto', position: 'relative',
    }}>

      {/* ══════════════════════════════════════════
          HERO SECTION (Steps 2+3 — unchanged)
         ══════════════════════════════════════════ */}
      <div className="hero-section">
        <div className="hero-image" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="hero-bg" />
        <div className="hero-overlay" />

        {/* CHARACTER LAYER */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column',
          padding: '0.9rem 1rem 1.1rem', justifyContent: 'flex-start',
        }}>
          <div className="flex items-start justify-between">

            {/* Avatar */}
            <div style={{
              width: '3.6rem', height: '3.6rem', borderRadius: '50%', flexShrink: 0,
              border: '2px solid var(--color-gold)',
              boxShadow: '0 0 0 3px rgba(201,168,76,0.15), 0 0 16px rgba(201,168,76,0.45), 0 0 32px rgba(201,168,76,0.15)',
              background: 'linear-gradient(135deg, #3A2010 0%, #2A1808 50%, #1A0E06 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <span style={{ fontSize: '1.55rem' }}>👤</span>
            </div>

            {/* Center: Name / Title / Meta */}
            <div className="flex-1 flex flex-col items-center"
              style={{ paddingTop: '0.05rem', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
              <h1 className="font-display font-bold text-center"
                style={{
                  fontSize: 'clamp(1.1rem, 5.2vw, 1.45rem)',
                  color: 'var(--color-parchment)',
                  letterSpacing: '0.18em', lineHeight: 1.1, marginBottom: '0.25rem',
                  textShadow: '0 1px 12px rgba(0,0,0,0.9), 0 0 28px rgba(201,168,76,0.22), 0 2px 4px rgba(0,0,0,0.8)',
                }}>
                {character.name}
              </h1>
              <div style={{
                width: '60%', height: '1px', marginBottom: '0.3rem',
                background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.55), transparent)',
              }} />
              <div className="font-serif flex items-center gap-1"
                style={{
                  fontSize: '0.88rem', color: 'var(--color-gold)', letterSpacing: '0.05em',
                  marginBottom: '0.5rem',
                  textShadow: '0 1px 8px rgba(0,0,0,0.8), 0 0 12px rgba(201,168,76,0.30)',
                  fontStyle: 'italic',
                }}>
                <span style={{ fontStyle: 'normal' }}>{character.titleIcon}</span>
                {character.title}
              </div>
              <div className="flex items-center gap-2 font-display uppercase"
                style={{
                  fontSize: '0.56rem', color: 'var(--color-parchment-dim)', letterSpacing: '0.12em',
                  background: 'rgba(8,5,2,0.45)', borderRadius: '20px',
                  padding: '0.22rem 0.65rem',
                  border: '1px solid rgba(201,168,76,0.12)',
                  backdropFilter: 'blur(4px)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                }}>
                <span>🛡 {character.age} YAŞ</span>
                <span style={{ color: 'var(--color-border-hi)', fontSize: '0.7rem', lineHeight: 1 }}>·</span>
                <span>❄ {character.season}</span>
                <span style={{ color: 'var(--color-border-hi)', fontSize: '0.7rem', lineHeight: 1 }}>·</span>
                <span>📅 {character.date}</span>
              </div>
            </div>

            {/* Rep Badge */}
            <div className="flex flex-col items-center" style={{ paddingTop: '0.05rem', gap: '0.18rem' }}>
              <div style={{
                width: '2.6rem', height: '2.6rem', borderRadius: '8px',
                background: 'rgba(8,5,2,0.72)',
                border: '1.5px solid rgba(201,168,76,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 10px rgba(201,168,76,0.22), inset 0 1px 0 rgba(201,168,76,0.12)',
                backdropFilter: 'blur(6px)',
              }}>
                <span style={{ fontSize: '1.15rem' }}>{character.repIcon}</span>
              </div>
              <span className="font-display uppercase text-center"
                style={{
                  fontSize: '0.42rem', color: 'var(--color-parchment-muted)',
                  letterSpacing: '0.07em', lineHeight: 1.3,
                  textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                }}>
                {character.repTitle}
              </span>
              <div style={{
                width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                background: 'rgba(8,5,2,0.80)',
                border: '1.5px solid rgba(201,168,76,0.40)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 6px rgba(201,168,76,0.18)',
              }}>
                <span className="font-display font-bold"
                  style={{ fontSize: '0.68rem', color: 'var(--color-parchment)' }}>
                  {character.rep}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-sep" />
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        background: 'var(--color-surface)',
        borderTop: '1px solid rgba(201,168,76,0.30)',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45), inset 0 1px 0 rgba(201,168,76,0.08)',
      }}>
        <StatCard icon="❤" value={stats.health} label="SAĞLIK"  barColor="#C84040" />
        <StatCard icon="🍎" value={stats.hunger} label="TOKLUK"  barColor="#4A9A5A" />
        <StatCard icon="💰" value={stats.money}  label="AKÇE"    barColor="#C9A84C" />
        <StatCard icon="👑" value={stats.fame}   label="TANINMA" barColor="#7B4FAF" isLast />
      </div>

      {/* ── SCROLLABLE CONTENT ────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '8rem', background: 'var(--color-bg)' }}>

        {/* ── STEP 5: JOURNAL PREMIUM PANEL ─────────────────────────────── */}
        <div style={{
          margin: '0.9rem 0.8rem 0',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border-hi)',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 1px 0 rgba(201,168,76,0.10), inset 0 1px 0 rgba(201,168,76,0.06)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: '40px', height: '40px',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.18) 0%, transparent 60%)',
            borderRadius: '10px 0 0 0', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: '40px', height: '40px',
            background: 'linear-gradient(225deg, rgba(201,168,76,0.12) 0%, transparent 60%)',
            borderRadius: '0 10px 0 0', pointerEvents: 'none',
          }} />

          {/* Panel Header */}
          <div style={{
            padding: '1rem 1rem 0',
            background: 'linear-gradient(180deg, rgba(201,168,76,0.05) 0%, transparent 100%)',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <div style={{
                    width: '3px', height: '1.3rem', borderRadius: '2px',
                    background: 'linear-gradient(to bottom, var(--color-gold-bright), var(--color-gold-dim))',
                    boxShadow: '0 0 6px rgba(201,168,76,0.5)', flexShrink: 0,
                  }} />
                  <h2 className="font-display font-bold"
                    style={{
                      fontSize: '1.05rem', color: 'var(--color-gold)',
                      letterSpacing: '0.14em',
                      textShadow: '0 0 16px rgba(201,168,76,0.35), 0 1px 3px rgba(0,0,0,0.8)',
                    }}>
                    HAYAT GÜNLÜĞÜ
                  </h2>
                </div>
                <p className="font-serif"
                  style={{
                    fontSize: '0.78rem', color: 'var(--color-parchment-muted)',
                    marginTop: '0.12rem', marginLeft: '0.95rem', fontStyle: 'italic',
                  }}>
                  Yaşananların izleri...
                </p>
              </div>
              <button style={{
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                paddingTop: '0.12rem', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Cinzel, serif', fontSize: '0.58rem',
                fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--color-gold-dim)',
                textShadow: '0 0 8px rgba(201,168,76,0.2)', transition: 'color 0.2s',
              }}>
                TÜMÜNÜ GÖR
                <ChevronRight size={12} strokeWidth={2} color="var(--color-gold-dim)" />
              </button>
            </div>

            <div style={{
              height: '1px', marginBottom: '0.75rem', marginLeft: '0.95rem',
              background: 'linear-gradient(to right, rgba(201,168,76,0.25), transparent)',
            }} />

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', paddingBottom: '0.75rem' }}>
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
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      padding: '0.55rem 0.3rem', borderRadius: '7px',
                      fontFamily: 'Cinzel, serif', fontSize: '0.57rem',
                      fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase',
                      cursor: 'pointer', transition: 'all 0.2s',
                      border: isActive ? '1px solid rgba(201,168,76,0.45)' : '1px solid var(--color-border)',
                      background: isActive
                        ? 'linear-gradient(160deg, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.07) 100%)'
                        : 'linear-gradient(160deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
                      color: isActive ? 'var(--color-gold)' : 'var(--color-parchment-muted)',
                      boxShadow: isActive
                        ? '0 0 12px rgba(201,168,76,0.18), inset 0 1px 0 rgba(201,168,76,0.15)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                      position: 'relative', overflow: 'hidden',
                    }}>
                    {isActive && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: '15%', right: '15%', height: '1.5px',
                        background: 'linear-gradient(to right, transparent, var(--color-gold), transparent)',
                        boxShadow: '0 0 6px var(--color-gold)',
                      }} />
                    )}
                    <span style={{ fontSize: '0.72rem' }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── STEP 6+7+8: Event List with Premium Timeline ── */}
          <div style={{ padding: '1rem 0.9rem 1.1rem' }}>
            {events.gunluk.map((ev, i) => (
              <EventCard key={ev.id} event={ev} isLast={i === events.gunluk.length - 1} />
            ))}
          </div>

        </div>
        {/* ── END JOURNAL PANEL ─────────────────────────────────────────── */}

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STEP 9: PRIMARY CTA — RPG PREMIUM BUTTON
         ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'fixed', bottom: '4.5rem', left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(480px, 100vw)',
        padding: '0 0.875rem', zIndex: 50,
      }}>
        <button className="w-full animate-pulse-gold" style={{
          background: 'linear-gradient(180deg, #3D2A08 0%, #2C1E06 35%, #1E1404 70%, #160E02 100%)',
          border: '1.5px solid rgba(201,168,76,0.55)',
          borderRadius: '8px',
          padding: '1.05rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '1rem', cursor: 'pointer',
          boxShadow: '0 0 30px rgba(201,168,76,0.25), 0 0 60px rgba(201,168,76,0.08), 0 6px 24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(201,168,76,0.25), inset 0 -1px 0 rgba(0,0,0,0.5)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Top shine line */}
          <div style={{
            position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(240,192,64,0.7) 30%, rgba(240,192,64,0.9) 50%, rgba(240,192,64,0.7) 70%, transparent)',
          }} />
          {/* Bottom dim line */}
          <div style={{
            position: 'absolute', bottom: 0, left: '10%', right: '10%', height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.35), transparent)',
          }} />
          {/* Inner surface sheen */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.04) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* STEP 9: Decorative corner ornaments */}
          <CornerOrnament position="top-left" />
          <CornerOrnament position="top-right" />
          <CornerOrnament position="bottom-left" />
          <CornerOrnament position="bottom-right" />

          {/* Content */}
          <span style={{ fontSize: '1.4rem', filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.6))' }}>⏳</span>
          <div style={{ textAlign: 'left' }}>
            <div className="font-display font-bold uppercase"
              style={{
                fontSize: '1.05rem', color: 'var(--color-gold)',
                letterSpacing: '0.2em',
                textShadow: '0 0 14px rgba(201,168,76,0.6), 0 1px 3px rgba(0,0,0,0.9)',
              }}>
              HAFTAYI İLERLE
            </div>
            <div className="font-serif"
              style={{
                fontSize: '0.74rem', color: 'var(--color-parchment-muted)',
                fontStyle: 'italic', marginTop: '0.12rem',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}>
              Yeni olaylar seni bekliyor...
            </div>
          </div>

          {/* Right arrow hint */}
          <div style={{
            position: 'absolute', right: '1.1rem',
            display: 'flex', alignItems: 'center',
            opacity: 0.5,
          }}>
            <ChevronRight size={16} color="var(--color-gold)" strokeWidth={1.5} />
          </div>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STEP 10: NAVBAR — PREMIUM RPG
         ══════════════════════════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: 'min(480px, 100vw)',
        background: 'linear-gradient(180deg, var(--color-surface) 0%, #0F0B07 100%)',
        borderTop: '1px solid var(--color-border-hi)',
        display: 'flex', zIndex: 60,
        boxShadow: '0 -6px 28px rgba(0,0,0,0.65), 0 -1px 0 rgba(201,168,76,0.08)',
      }}>
        {/* Top inner highlight */}
        <div style={{
          position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.15) 30%, rgba(201,168,76,0.22) 50%, rgba(201,168,76,0.15) 70%, transparent)',
          pointerEvents: 'none',
        }} />

        <NavItem icon={Flame}  label="Ana Sayfa" active={true}  />
        <NavItem icon={Shield} label="Karakter"  active={false} />
        <NavItem icon={Castle} label="Şehir"     active={false} />
        <NavItem icon={Users}  label="İlişkiler" active={false} />
        <NavItem icon={Scroll} label="Menü"      active={false} />
      </nav>

    </div>
  );
}
