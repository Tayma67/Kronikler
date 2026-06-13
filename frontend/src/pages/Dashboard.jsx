import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Coins, ChevronRight, Scroll, Shield,
  Scale, BookMarked, Heart, Crown, Loader2, Sword, Star
} from 'lucide-react';
import { useGame } from '@/lib/GameContext';
import WeekPlanCard from '@/components/WeekPlanCard';
import SagaStrip, { SagaTab, useSaga } from '@/components/SagaStrip';
import { useHeroGorsel, Portre } from '@/components/ui/Gorsel';
import GameIcon from '@/components/ui/GameIcon';

// Meslek → game-icons.net ikonu (ASCII dosya adı; CC BY 3.0)
const PROF_GAME_ICON = {
  demirci:'anvil', çiftçi:'wheat', tüccar:'scales', asker:'crossed-swords', şövalye:'shield',
  şifacı:'herbs', eczacı:'potion', rahip:'prayer-beads', haydut:'hood', balıkçı:'fishing',
  fırıncı:'bread', avcı:'bow', marangoz:'saw', kunduracı:'boot', müzisyen:'lyre', katip:'scroll',
  lord:'crown', kral:'crown', çoban:'sheep', kervancı:'camel', kuyumcu:'gems', dokumacı:'wool',
  çömlekçi:'amphora', işsiz:'leaf', çocuk:'kite',
};

// Mesleğe göre ünvan ikonu — tek tip ⚒ yerine kimlik hissi
const PROF_ICON = {
  'demirci': '⚒', 'çiftçi': '🌾', 'tüccar': '⚖', 'asker': '⚔', 'şövalye': '🛡',
  'şifacı': '🌿', 'eczacı': '🧪', 'rahip': '📿', 'haydut': '🗡', 'balıkçı': '🎣',
  'fırıncı': '🍞', 'avcı': '🏹', 'marangoz': '🪚', 'kunduracı': '👞',
  'müzisyen': '🎶', 'katip': '📜', 'lord': '👑', 'kral': '👑', 'çoban': '🐑',
  'kervancı': '🐫', 'kuyumcu': '💎', 'dokumacı': '🧵', 'çömlekçi': '🏺',
  'işsiz': '🍂', 'çocuk': '🪁',
};

function avatarFor(age, gender) {
  const k = gender === 'kadın';
  if (age < 13) return k ? '👧' : '👦';
  if (age < 30) return k ? '👩' : '🧑';
  if (age < 55) return k ? '👩‍🦱' : '🧔';
  return k ? '👵' : '🧓';
}

// ── SEASON → HERO IMAGE MAP ──────────────────────────────────────────────────
const SEASON_IMAGE = {
  'Yaz':      '/images/hero/cocuk_yaz.jpg',
  'Kış':      '/images/hero/cocuk_kis.jpg',
  'Sonbahar': '/images/hero/cocuk_sonbahar.jpg',
  'İlkbahar': '/images/hero/cocuk_ilkbahar.jpg',
};

// ── EVENT TYPE → DISPLAY CONFIG ──────────────────────────────────────────────
const EVENT_MAP = {
  // ── Kişisel / kariyer ──────────────────────────────────────────
  çalışma:          { type: 'TİCARET',  typeColor: '#4A9A5A', icon: Coins,     iconColor: '#C9A84C', personal: true  },
  ticaret:          { type: 'TİCARET',  typeColor: '#4A9A5A', icon: Coins,     iconColor: '#C9A84C', personal: true  },
  kariyer_terfi:    { type: 'KARİYER',  typeColor: '#C9A84C', icon: Crown,     iconColor: '#C9A84C', personal: true  },
  meslek_değişimi:  { type: 'MESLEK',   typeColor: '#2A6FA8', icon: BookMarked,iconColor: '#2A6FA8', personal: true  },
  yolculuk:         { type: 'SEYAHAT',  typeColor: '#2A6FA8', icon: Scroll,    iconColor: '#2A6FA8', personal: true  },
  savaş_zaferi:     { type: 'SAVAŞ',    typeColor: '#E05A30', icon: Sword,     iconColor: '#E05A30', personal: true  },
  savaş_kaybı:      { type: 'SAVAŞ',    typeColor: '#C84040', icon: Shield,    iconColor: '#C84040', personal: true  },
  savaş_kaçış:      { type: 'KAÇIŞ',   typeColor: '#E05A30', icon: Shield,    iconColor: '#E05A30', personal: true  },
  evlilik:          { type: 'AİLE',     typeColor: '#D4528A', icon: Heart,     iconColor: '#D4528A', personal: 'isim' },
  doğum:            { type: 'AİLE',     typeColor: '#7B4FAF', icon: Star,      iconColor: '#7B4FAF', personal: 'isim' },
  suç:              { type: 'GÖLGE',    typeColor: '#7B3FBF', icon: Shield,    iconColor: '#7B3FBF', personal: true  },
  suç_yakalandı:    { type: 'CEZA',     typeColor: '#C84040', icon: Shield,    iconColor: '#C84040', personal: true  },
  görev_tamamlandı: { type: 'GÖREV',    typeColor: '#4A9A5A', icon: Scroll,    iconColor: '#4A9A5A', personal: true  },
  görev_başarısız:  { type: 'GÖREV',    typeColor: '#C84040', icon: Scroll,    iconColor: '#C84040', personal: true  },
  cocuk_meslek:     { type: 'EĞİTİM',   typeColor: '#2A6FA8', icon: BookMarked,iconColor: '#2A6FA8', personal: true  },
  cocuk_yatirim:    { type: 'YATIRIM',  typeColor: '#4A9A5A', icon: Coins,     iconColor: '#C9A84C', personal: true  },
  kullanım:         { type: 'EŞYA',     typeColor: '#7A6A4F', icon: Scroll,    iconColor: '#7A6A4F', personal: true  },
  kuşanma:          { type: 'EKİPMAN',  typeColor: '#7A6A4F', icon: Shield,    iconColor: '#7A6A4F', personal: true  },
  life_event:       { type: 'OLAY',     typeColor: '#C9A84C', icon: Star,      iconColor: '#C9A84C', personal: true  },
  hapis:            { type: 'CEZA',     typeColor: '#C84040', icon: Shield,    iconColor: '#C84040', personal: true  },
  ceza:             { type: 'CEZA',     typeColor: '#C84040', icon: Shield,    iconColor: '#C84040', personal: true  },
  // ── Dünya / faction ────────────────────────────────────────────
  isyan:            { type: 'DÜNYA',    typeColor: '#D4820A', icon: Scale,     iconColor: '#D4820A', personal: false },
  savaş:            { type: 'DÜNYA',    typeColor: '#C84040', icon: Sword,     iconColor: '#C84040', personal: false },
  kıtlık:           { type: 'DÜNYA',    typeColor: '#D4820A', icon: Scale,     iconColor: '#D4820A', personal: false },
  festival:         { type: 'DÜNYA',    typeColor: '#C9A84C', icon: Star,      iconColor: '#C9A84C', personal: false },
  death:            { type: 'DÜNYA',    typeColor: '#7A6A4F', icon: Scroll,    iconColor: '#7A6A4F', personal: false },
  raid:             { type: 'DÜNYA',    typeColor: '#C84040', icon: Sword,     iconColor: '#C84040', personal: false },
  kriz_kuraklik:    { type: 'KRİZ',     typeColor: '#D4820A', icon: Scale,     iconColor: '#D4820A', personal: false },
  kriz_veba:        { type: 'KRİZ',     typeColor: '#C84040', icon: Scale,     iconColor: '#C84040', personal: false },
  kriz_yangin:      { type: 'KRİZ',     typeColor: '#E05A30', icon: Scale,     iconColor: '#E05A30', personal: false },
  // ── Faction olayları (dünya) ────────────────────────────────────
  nüfuz_eşik:       { type: 'GÜÇLER',   typeColor: '#7B4FAF', icon: Shield,    iconColor: '#7B4FAF', personal: false },
  nüfuz_kontrol:    { type: 'GÜÇLER',   typeColor: '#C84040', icon: Sword,     iconColor: '#C84040', personal: false },
  nüfuz_kayıp:      { type: 'GÜÇLER',   typeColor: '#7B4FAF', icon: Shield,    iconColor: '#7B4FAF', personal: false },
  casus_belli:      { type: 'SAVAŞ',    typeColor: '#C84040', icon: Sword,     iconColor: '#C84040', personal: false },
  aggression_artis: { type: 'GERGİNLİK',typeColor: '#E05A30', icon: Scale,     iconColor: '#E05A30', personal: false },
  ko_mudahale_zorunluluk: { type: 'ORDU', typeColor: '#C84040', icon: Sword,   iconColor: '#C84040', personal: false },
  koalisyon_kuruldu:{ type: 'İTTİFAK',  typeColor: '#C9A84C', icon: Shield,   iconColor: '#C9A84C', personal: false },
  savunma_mudahale: { type: 'ORDU',     typeColor: '#C84040', icon: Sword,     iconColor: '#C84040', personal: false },
  arabuluculuk_basarili: { type: 'BARIŞ',typeColor: '#4A9A5A',icon: Scale,    iconColor: '#4A9A5A', personal: false },
  arabuluculuk_red: { type: 'GERGİNLİK',typeColor: '#E05A30', icon: Scale,    iconColor: '#E05A30', personal: false },
  zanaatkar_grev:   { type: 'DÜNYA',    typeColor: '#D4820A', icon: Scale,     iconColor: '#D4820A', personal: false },
  gizli_cemiyet_ifsa:{ type: 'GÖLGE',  typeColor: '#7B3FBF', icon: Shield,    iconColor: '#7B3FBF', personal: false },
  paralı_asker_kiralama: { type: 'GÜÇLER',typeColor: '#7A6A4F',icon: Sword,   iconColor: '#7A6A4F', personal: false },
  paralı_asker_ihanet:  { type: 'İHANET',typeColor: '#C84040', icon: Sword,  iconColor: '#C84040', personal: false },
  suikast:          { type: 'GÖLGE',    typeColor: '#7B3FBF', icon: Shield,    iconColor: '#7B3FBF', personal: false },
  sabotaj:          { type: 'GÖLGE',    typeColor: '#7B3FBF', icon: Shield,    iconColor: '#7B3FBF', personal: false },
  manipülasyon:     { type: 'GÖLGE',    typeColor: '#7B3FBF', icon: Shield,    iconColor: '#7B3FBF', personal: false },
  yardim_cagrisi:   { type: 'İTTİFAK',  typeColor: '#C9A84C', icon: Shield,   iconColor: '#C9A84C', personal: false },
  istihbarat_satis: { type: 'GÖLGE',    typeColor: '#7B3FBF', icon: BookMarked,iconColor:'#7B3FBF', personal: false },
  vaaz:             { type: 'DÜNYA',    typeColor: '#C9A84C', icon: Star,      iconColor: '#C9A84C', personal: false },
  // ── GDD v5 yeni tipler ──────────────────────────────────────────
  mülk_alım:        { type: 'MÜLK',     typeColor: '#C9A84C', icon: Coins,     iconColor: '#C9A84C', personal: true  },
  mülk_satış:       { type: 'MÜLK',     typeColor: '#C9A84C', icon: Coins,     iconColor: '#C9A84C', personal: true  },
  mülk_hasat:       { type: 'HASAT',    typeColor: '#4A9A5A', icon: Star,      iconColor: '#4A9A5A', personal: true  },
  mülk_yağma:       { type: 'MÜLK',     typeColor: '#C84040', icon: Shield,    iconColor: '#C84040', personal: true  },
  mülk_soygun:      { type: 'MÜLK',     typeColor: '#C84040', icon: Shield,    iconColor: '#C84040', personal: true  },
  mülk_durgun:      { type: 'MÜLK',     typeColor: '#D4820A', icon: Scale,     iconColor: '#D4820A', personal: true  },
  hikâye:           { type: 'HİKÂYE',   typeColor: '#7B4FAF', icon: BookMarked,iconColor: '#7B4FAF', personal: true  },
  hikâye_teklifi:   { type: 'HİKÂYE',   typeColor: '#7B4FAF', icon: Star,      iconColor: '#7B4FAF', personal: true  },
  başarım:          { type: 'BAŞARIM',  typeColor: '#C9A84C', icon: Crown,     iconColor: '#C9A84C', personal: true  },
  komutan_savaşı:   { type: 'KOMUTA',   typeColor: '#E05A30', icon: Sword,     iconColor: '#E05A30', personal: true  },
  aile_krizi:       { type: 'AİLE',     typeColor: '#D4528A', icon: Heart,     iconColor: '#D4528A', personal: true  },
  aile_destek:      { type: 'AİLE',     typeColor: '#D4528A', icon: Heart,     iconColor: '#D4528A', personal: true  },
  aile_görevi_açıldı:{ type: 'AİLE',    typeColor: '#D4528A', icon: Scroll,    iconColor: '#D4528A', personal: true  },
  iyileşme:         { type: 'SAĞLIK',   typeColor: '#4A9A5A', icon: Heart,     iconColor: '#4A9A5A', personal: true  },
  yakalandı:        { type: 'CEZA',     typeColor: '#C84040', icon: Shield,    iconColor: '#C84040', personal: true  },
  rank_bonusu:      { type: 'ÖRGÜT',    typeColor: '#7B4FAF', icon: Shield,    iconColor: '#7B4FAF', personal: true  },
  şehir_kuruluşu:   { type: 'KURULUŞ',  typeColor: '#C9A84C', icon: Crown,     iconColor: '#C9A84C', personal: true  },
  nesil_devri:      { type: 'NESİL',    typeColor: '#7B4FAF', icon: Star,      iconColor: '#7B4FAF', personal: true  },
  zanaat_durgun:    { type: 'DÜNYA',    typeColor: '#D4820A', icon: Scale,     iconColor: '#D4820A', personal: false },
  piyasa_olayı:     { type: 'PİYASA',   typeColor: '#4A9A5A', icon: Coins,     iconColor: '#4A9A5A', personal: false },
  kıtlık_etkisi:    { type: 'DÜNYA',    typeColor: '#D4820A', icon: Scale,     iconColor: '#D4820A', personal: false },
  çağ_olayı:        { type: 'ÇAĞ',      typeColor: '#C84040', icon: Crown,     iconColor: '#C84040', personal: false },
  göç:              { type: 'DÜNYA',    typeColor: '#7A6A4F', icon: Scroll,    iconColor: '#7A6A4F', personal: false },
  ölüm:             { type: 'DÜNYA',    typeColor: '#7A6A4F', icon: Scroll,    iconColor: '#7A6A4F', personal: false },
  meslek_edinme:    { type: 'DÜNYA',    typeColor: '#7A6A4F', icon: Scroll,    iconColor: '#7A6A4F', personal: false },
  şenlik:           { type: 'DÜNYA',    typeColor: '#C9A84C', icon: Star,      iconColor: '#C9A84C', personal: false },
  haydut_baskını:   { type: 'DÜNYA',    typeColor: '#C84040', icon: Sword,     iconColor: '#C84040', personal: false },
  savaş_ilanı:      { type: 'DÜNYA',    typeColor: '#C84040', icon: Sword,     iconColor: '#C84040', personal: false },
  savaş_hareketi:   { type: 'DÜNYA',    typeColor: '#C84040', icon: Sword,     iconColor: '#C84040', personal: false },
  barış:            { type: 'DÜNYA',    typeColor: '#4A9A5A', icon: Scale,     iconColor: '#4A9A5A', personal: false },
  istikrar_artışı:  { type: 'DÜNYA',    typeColor: '#4A9A5A', icon: Scale,     iconColor: '#4A9A5A', personal: false },
  tahta_çıkış:      { type: 'DÜNYA',    typeColor: '#C9A84C', icon: Crown,     iconColor: '#C9A84C', personal: false },
  işgal:            { type: 'DÜNYA',    typeColor: '#C84040', icon: Sword,     iconColor: '#C84040', personal: false },
};
const DEFAULT_EVENT = { type: 'OLAY', typeColor: '#C9A84C', icon: Star, iconColor: '#C9A84C', personal: false };

// Hayatın dönüm noktaları — günlükte altın bir vurgu ile öne çıkar.
// Rutin satırların arasında, bir ömrün zirveleri göze çarpsın.
const LANDMARK_TYPES = new Set([
  'evlilik', 'doğum', 'kariyer_terfi', 'tahta_çıkış', 'savaş_zaferi',
  'başarım', 'şehir_kuruluşu', 'nesil_devri', 'komutan_savaşı',
]);

// ── HELPERS ──────────────────────────────────────────────────────────────────
function fameLabel(fame) {
  if (fame >= 80) return 'EFSANEVİ';
  if (fame >= 60) return 'TANINMIŞ';
  if (fame >= 40) return 'DUYULAN';
  if (fame >= 20) return 'BİLİNEN';
  return 'TANINMAYAN';
}

function timeAgo(eventTurn, currentTurn) {
  // Zaman Reformu: 1 tur = 1 ay
  const diff = (currentTurn || 0) - (eventTurn || 0);
  if (diff <= 0) return 'Bu ay';
  if (diff === 1) return 'Geçen ay';
  if (diff < 12)  return `${diff} ay önce`;
  return `${Math.floor(diff / 12)} yıl önce`;
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
    landmark:  LANDMARK_TYPES.has(ev.type),
  };
}

// ── STAT CARD ────────────────────────────────────────────────────────────────
// ── EVENT CARD ────────────────────────────────────────────────────────────────
function EventCard({ event, isLast }) {
  const IconComp = event.icon;
  const isUrgent = event.urgent;
  const isLandmark = event.landmark;
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
          background: isLandmark
            ? `radial-gradient(circle at 40% 30%, rgba(224,188,90,0.30) 0%, rgba(46,32,10,0.95) 72%)`
            : isUrgent
            ? `radial-gradient(circle at 40% 30%, rgba(224,90,48,0.18) 0%, var(--color-card) 70%)`
            : `radial-gradient(circle at 40% 30%, rgba(201,168,76,0.10) 0%, var(--color-card) 70%)`,
          border: `1.5px solid ${isLandmark ? 'rgba(224,188,90,0.8)' : isUrgent ? event.iconColor + '70' : 'rgba(184,148,64,0.35)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isLandmark
            ? `0 0 18px rgba(224,188,90,0.5), inset 0 1px 0 rgba(255,255,255,0.10)`
            : isUrgent
            ? `0 0 14px ${event.iconColor}35, inset 0 1px 0 rgba(255,255,255,0.05)`
            : `0 0 10px rgba(184,148,64,0.18), inset 0 1px 0 rgba(255,255,255,0.04)`,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 3, borderRadius: '50%',
            background: `radial-gradient(circle, ${event.iconColor}12 0%, transparent 70%)`,
          }} />
          <IconComp size={12} color={isLandmark ? '#F0D88A' : event.iconColor} strokeWidth={1.8} />
        </div>
      </div>
      <div className="flex-1 card-shadow" style={{
        background: isLandmark
          ? `linear-gradient(160deg, rgba(224,188,90,0.16) 0%, rgba(46,32,10,0.55) 45%, var(--color-card) 100%)`
          : isUrgent
          ? `linear-gradient(160deg, rgba(224,90,48,0.06) 0%, var(--color-card) 40%)`
          : 'var(--color-card)',
        border: `1px solid ${isLandmark ? 'rgba(224,188,90,0.45)' : isUrgent ? event.iconColor + '30' : 'var(--color-border)'}`,
        borderLeft: `2.5px solid ${isLandmark ? 'rgba(224,188,90,0.9)' : event.iconColor + '55'}`,
        borderRadius: '8px',
        padding: '0.75rem 0.9rem',
        marginBottom: '0.1rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isLandmark ? '0 0 18px rgba(224,188,90,0.12)' : undefined,
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: isLandmark
            ? `linear-gradient(to right, rgba(224,188,90,0.55), rgba(224,188,90,0.85) 40%, transparent)`
            : `linear-gradient(to right, ${event.iconColor}22, ${event.iconColor}44 40%, transparent)`,
        }} />
        <div className="flex items-center justify-between" style={{ marginBottom: '0.4rem' }}>
          <div className="flex items-center gap-1.5">
            <div style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: event.typeColor, boxShadow: `0 0 5px ${event.typeColor}`, flexShrink: 0,
            }} />
            <span className="font-display uppercase"
              style={{ fontSize: '0.55rem', color: isLandmark ? '#E6C46A' : event.typeColor, letterSpacing: '0.16em', fontWeight: 700 }}>
              {event.type}
            </span>
            {isLandmark && (
              <span title="Dönüm noktası" style={{
                fontSize: '0.6rem', color: '#E6C46A', lineHeight: 1,
                filter: 'drop-shadow(0 0 5px rgba(224,188,90,0.6))',
              }}>⚜</span>
            )}
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



// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { state } = useGame() || {};
  // Ay ilerletme + popup zinciri artık GameLayout'ta (nav bardaki butondan).
  const [activeTab, setActiveTab]     = useState('gunluk');
  const navigate = useNavigate();
  const saga = useSaga(state);
  // Hook'lar erken return'den ÖNCE ve KOŞULSUZ çağrılmalı (rules-of-hooks).
  // useHeroGorsel'i state-güvenli değerlerle burada çağırıyoruz; state
  // yüklendiğinde değer aşağıdaki playerAge/season ile birebir aynı olur.
  const _heroAge    = state?.player?.age || 0;
  const _heroSeason = state?.calendar?.season || 'Yaz';
  const yetiskinHero = useHeroGorsel(_heroAge, _heroSeason);

  // ROMAN sekmesi reşit olunca (13) ilk kez belirir — sessizce açılmasın,
  // oyuncu fark edene dek nazik bir "yeni" közü yansın (bir kez).
  const [romanSeen, setRomanSeen] = useState(() => {
    try { return localStorage.getItem('kr_roman_gorulus') === '1'; } catch { return true; }
  });
  React.useEffect(() => {
    if (activeTab === 'roman' && !romanSeen) {
      setRomanSeen(true);
      try { localStorage.setItem('kr_roman_gorulus', '1'); } catch {}
    }
  }, [activeTab, romanSeen]);

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
  const titleIcon   = PROF_ICON[player.profession] || '⚒';
  const playerAge   = player.age || 0;
  const avatarEmoji = avatarFor(playerAge, player.gender);

  const season      = cal.season || 'Yaz';
  const dateStr     = `${cal.month_name || 'Ocak'} ${cal.year || 1247}`.toUpperCase();
  const fame        = player.fame || 0;
  const repTitle    = fameLabel(fame);
  const heroImage   = SEASON_IMAGE[season] || SEASON_IMAGE['Yaz'];
  const heroHazir = playerAge >= 13 && !!yetiskinHero;

  const stats = {
    health: Math.round(player.health || 0),
    hunger: Math.round(player.hunger ?? 100),
    money:  Math.round(player.money  || 0),
    fame:   Math.round(fame),
  };

  // ── Filter events by tab ───────────────────────────────────────────────────
  const reversed = [...chronicle].reverse();

  // Kişisel günlük: haritada personal=true olan tipler + metinde oyuncunun
  // adı geçen olaylar (kendi evliliğin/doğumun gibi). Gerisi dünya sekmesine.
  const firstName = (player?.name || '').split(' ')[0];
  const mentionsPlayer = (e) =>
    firstName && firstName.length > 2 && (e.text || '').includes(firstName);

  const isPersonal = (e) => {
    // Backend kapsamı önceliklidir: kişisel → günlüğe, arkaplan → hiçbir yere
    if (e.scope === 'kişisel') return true;
    const cfg = EVENT_MAP[e.type];
    if (cfg?.personal === true) return true;
    if (cfg?.personal === 'isim') return mentionsPlayer(e);
    if (cfg?.personal === false) return false;
    return mentionsPlayer(e);
  };

  // Dünya sekmesi = MAKRO olaylar. Sıradan NPC yaşamı (falanca doğdu/öldü/
  // evlendi, meslek edindi, göçtü) oyuncunun dünyasına ait değil — gösterme.
  // Hanedan haberleri (scope: makro) ve devlet/ekonomi olayları kalır.
  const BACKGROUND_TYPES = new Set([
    'ölüm', 'doğum', 'evlilik', 'death',
    'meslek_edinme', 'göç', 'aile_destek', 'zanaat_durgun',
  ]);
  const isWorldWorthy = (e) => {
    if (e.scope === 'makro') return true;
    if (e.scope === 'arkaplan') return false;
    return !BACKGROUND_TYPES.has(e.type);
  };

  // Günlük = yaşam akışı: çerçeve içinde kaydırılan zengin geçmiş (8 değil, bol)
  const personalEvents = reversed.filter(isPersonal).slice(0, 60);
  const worldEvents = reversed
    .filter(e => !isPersonal(e) && isWorldWorthy(e))
    .slice(0, 60);

  const currentTabEvents =
    activeTab === 'gunluk' ? personalEvents :
    activeTab === 'dunya'  ? worldEvents    :
    [];

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: '100%', overflow: 'hidden', background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
      maxWidth: '480px', margin: '0 auto', position: 'relative',
    }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="hero-section" style={{ flexShrink: 0 }}>
        {/* Çocuklukta gerçek görsel; yetişkinlikte mevsim sahnesi
            (çocuk fotoğrafı 40 yaşındaki karakterde aldatmaca olur) */}
        {playerAge < 13 ? (
          <div className="hero-image" style={{ backgroundImage: `url(${heroImage})` }} />
        ) : heroHazir ? (
          <div className="hero-image" style={{ backgroundImage: `url(${yetiskinHero})` }} />
        ) : (
          <div className={`hero-scene hero-scene--${
            season === 'Kış' ? 'kis' : season === 'Sonbahar' ? 'sonbahar'
            : season === 'İlkbahar' ? 'ilkbahar' : 'yaz'}`} />
        )}
        <div className="hero-bg" />
        <div className="hero-overlay" />

        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column',
          padding: '0.8rem 0.9rem 1rem', justifyContent: 'space-between',
        }}>
          <div className="flex items-start justify-between">

            {/* Avatar + Compact Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>

              {/* Avatar circle */}
              <div style={{
                width: '3.2rem', height: '3.2rem', borderRadius: '50%',
                border: '2px solid var(--color-gold)',
                boxShadow: '0 0 0 3px rgba(201,168,76,0.15), 0 0 16px rgba(201,168,76,0.45)',
                background: 'linear-gradient(135deg, #3A2010 0%, #2A1808 50%, #1A0E06 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <Portre age={playerAge} gender={player.gender} id={player.name || 'oyuncu'}
                        emoji={avatarEmoji} size="3.2rem" ring={false} />
              </div>

              {/* Mini stats — okunabilirlik için ferahlatıldı */}
              <div style={{
                background: 'rgba(8,5,2,0.68)',
                border: '1px solid rgba(201,168,76,0.20)',
                borderRadius: '9px',
                padding: '0.5rem 0.55rem',
                backdropFilter: 'blur(8px)',
                width: '5rem',
                display: 'flex', flexDirection: 'column', gap: '0.46rem',
              }}>
                {[
                  { icon: '❤', value: stats.health, color: '#C84040', max: 100, suffix: '' },
                  { icon: '🍎', value: stats.hunger, color: '#4A9A5A', max: 100, suffix: '' },
                  { icon: '⚜', value: stats.money,  color: '#C9A84C', max: 500, suffix: '' },
                  { icon: '👑', value: stats.fame,   color: '#7B4FAF', max: 100, suffix: '' },
                ].map(({ icon, value, color, max, suffix }) => (
                  <div key={icon} style={{ display: 'flex', alignItems: 'center', gap: '0.32rem' }}>
                    <span style={{ fontSize: '0.72rem', lineHeight: 1, flexShrink: 0,
                                   color: icon === '⚜' ? '#C9A84C' : undefined }}>{icon}</span>
                    <div style={{
                      flex: 1, height: '3px',
                      background: 'rgba(255,255,255,0.09)',
                      borderRadius: '2px', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, (value / max) * 100))}%`,
                        background: `linear-gradient(to right, ${color}bb, ${color})`,
                        boxShadow: `0 0 4px ${color}77`,
                        borderRadius: '2px',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <span style={{
                      fontSize: '0.64rem', color: 'var(--color-parchment)',
                      minWidth: '1.95rem', textAlign: 'right',
                      fontFamily: 'Cinzel, serif', fontWeight: 700, lineHeight: 1,
                    }}>
                      {value}{suffix}
                    </span>
                  </div>
                ))}
              </div>
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
                  marginBottom: '0.2rem',
                  textShadow: '0 1px 8px rgba(0,0,0,0.8)',
                  fontStyle: 'italic',
                }}>
                {PROF_GAME_ICON[player.profession]
                  ? <GameIcon name={PROF_GAME_ICON[player.profession]} size="0.95rem" title={careerTitle} />
                  : <span style={{ fontStyle: 'normal' }}>{titleIcon}</span>}
                {careerTitle}
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

          {/* Age / Season / Date — bottom-right of hero */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div className="flex items-center gap-2 font-display uppercase"
              style={{
                fontSize: '0.5rem', color: 'var(--color-parchment-dim)', letterSpacing: '0.12em',
                background: 'rgba(8,5,2,0.50)', borderRadius: '20px',
                padding: '0.22rem 0.7rem',
                border: '1px solid rgba(201,168,76,0.14)',
                backdropFilter: 'blur(6px)',
              }}>
              <span>🛡 {playerAge} YAŞ</span>
              <span style={{ color: 'var(--color-border-hi)', fontSize: '0.7rem' }}>·</span>
              <span>❄ {season.toUpperCase()}</span>
              <span style={{ color: 'var(--color-border-hi)', fontSize: '0.7rem' }}>·</span>
              <span>📅 {dateStr}</span>
            </div>
          </div>
        </div>

        <div className="hero-sep" />
      </div>

      {/* ── SCROLLABLE CONTENT ─────────────────────────────────────────────── */}
      {/* Not: alt boşluk panelin kendi marginBottom'ı ile veriliyor; burada
          ekstra paddingBottom panelle çakışıp günlüğü küçültüyordu (kaldırıldı) */}
      <div style={{ flex: 1, overflow: 'hidden', paddingBottom: 0, background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

        {/* S3 Makyaj: Hayat Romanı şeridi — perde, gerilim, kapındaki elçiler.
            GDD v8 aşamalı keşif: çocuklukta gizli — 13'te dünya açılınca belirir.
            (Çocuklukta mevsim fısıltısı kaldırıldı — günlük ekranın çoğunu alsın.) */}
        {playerAge >= 13 && <SagaStrip saga={saga} />}

        {/* ── JOURNAL PANEL ─────────────────────────────────────────────── */}
        {/* R1: Hafta Planı kartı (kompakt; dokununca 3 slotlu seçici) */}
        <WeekPlanCard />

        <div style={{
          margin: '0.7rem 0.75rem 0',
          // Alt nav barın üzerinde bitir (Ayı İlerle artık nav barda):
          // panel içi scroll çalışır, içerik nav'ın altında kaybolmaz
          marginBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border-hi)',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
          overflow: 'hidden',
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
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
            flexShrink: 0,
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
              <button onClick={() => navigate('/oyun/tarih')} style={{
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
                // Aşamalı keşif: ROMAN sekmesi 13'te belirir
                ...(playerAge >= 13 ? [{ key: 'roman', icon: '📖', label: 'ROMAN' }] : []),
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
                    {tab.key === 'roman' && !romanSeen && (
                      <span aria-label="yeni" style={{
                        position: 'absolute', top: '4px', right: '6px',
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: 'radial-gradient(circle, #F0C040 0%, #C9A84C 70%)',
                        boxShadow: '0 0 8px rgba(240,192,64,0.9)',
                        animation: 'yeni-koz 1.6s ease-in-out infinite',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event list */}
          <div style={{
            padding: '0.85rem 0.85rem 1rem',
            flex: 1,
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(201,168,76,0.22) transparent',
            background: 'linear-gradient(180deg, #271D0C 0%, #231808 50%, #1F1507 100%)',
            boxShadow: 'inset 0 0 50px rgba(201,168,76,0.05), inset 0 2px 0 rgba(201,168,76,0.07), inset 0 -2px 0 rgba(201,168,76,0.04)',
          }}>
            {activeTab === 'roman' ? (
              <SagaTab saga={saga} state={state} />
            ) : currentTabEvents.length > 0 ? (
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
                  {activeTab === 'gunluk' ? '📜' : '🌍'}
                </div>
                <p className="font-serif" style={{ fontSize: '0.85rem', fontStyle: 'italic', lineHeight: 1.5 }}>
                  {activeTab === 'gunluk'
                    ? 'Günlüğün henüz boş.\nAyı ilerlet, yeni hikayeler başlasın.'
                    : 'Dünyadan henüz haber yok.\nBüyük olaylar yakında gelecek.'}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
