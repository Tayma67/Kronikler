import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Portre, heroYolu } from "@/components/ui/Gorsel";
import { playSfx } from "@/lib/audio";

/**
 * HayatKarti — "Hayat Kartı"
 * Oyuncunun romanının KAPAĞI: tek, güzel, paylaşılabilir kimlik kartı.
 * Portre + ad + ünvan + nesil + şiirsel slogan + öne çıkan iz.
 *
 * props: player, calendar, onClose
 */

function fameLabel(f) {
  if (f >= 80) return "Efsanevî";
  if (f >= 60) return "Tanınmış";
  if (f >= 40) return "Duyulan";
  if (f >= 20) return "Bilinen";
  return "Tanınmayan";
}

function tagline(p) {
  const fame = p.fame || 0;
  const soc = p.social || {};
  const honor = p.honor ?? soc.honor ?? 0;
  const fear = p.fear ?? soc.fear ?? 0;
  if (fame >= 70) return "Adı destanlara karıştı, dilden dile dolaşır.";
  if (fear >= 45) return "Adı korkuyla fısıldanır, gölgesi önünden yürür.";
  if (honor >= 45) return "Onuruyla yaşadı; sözü senet, eli açıktı.";
  if (fame >= 35) return "Bu diyarda tanıdık bir sima, saygıyla anılır.";
  if ((p.age || 0) < 13) return "Henüz hikâyesinin ilk satırlarında, küllerin çocuğu.";
  return "Küllerin diyarında kendi yolunu arayan bir can.";
}

export default function HayatKarti({ player, calendar, onClose }) {
  const [visible, setVisible] = useState(false);
  const [shareNote, setShareNote] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);
  if (!player) return null;

  const p = player;
  const name = p.name || "Kahraman";
  const title = p.career?.title || p.profession || "İşsiz";
  const age = p.age || 0;
  const gen = (p.generation ?? 1);
  const season = calendar?.season || "Sonbahar";
  const seasonKey = season === "Kış" ? "kis" : season === "Sonbahar" ? "sonbahar"
    : season === "İlkbahar" ? "ilkbahar" : "yaz";
  const bg = age < 13 ? `/images/hero/cocuk_${seasonKey}.jpg` : heroYolu(age, season);

  const share = async () => {
    playSfx("click");
    const text = `${name} — ${title}, ${gen}. Nesil. ${tagline(p)} · Kronikler: Küllerin Mirası`;
    try {
      if (navigator.share) { await navigator.share({ title: "Kronikler — Hayat Kartım", text }); }
      else { await navigator.clipboard.writeText(text); setShareNote("Panoya kopyalandı ✓"); }
    } catch (_) { setShareNote("Ekran görüntüsü alıp paylaşabilirsin"); }
  };

  return createPortal(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600&family=Crimson+Text:ital,wght@0,400;1,400&display=swap');
        .hk-root { position: fixed; inset: 0; z-index: 9998; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow-y: auto; padding: 22px;
          background: radial-gradient(ellipse 90% 55% at 50% 10%, rgba(201,168,76,0.12) 0%, transparent 55%), #070502; }
        .hk-close { position: fixed; top: calc(env(safe-area-inset-top,0px) + 12px); right: 16px; width: 38px; height: 38px; border-radius: 50%;
          border: 1px solid rgba(201,168,76,0.35); background: rgba(8,5,2,0.7); color: #c9a84c; font-size: 18px; cursor: pointer; backdrop-filter: blur(6px); }
        .hk-fade { transition: opacity 0.8s ease, transform 0.8s ease; opacity: 0; transform: translateY(12px) scale(0.98); }
        .hk-fade.shown { opacity: 1; transform: none; }
        .hk-card { position: relative; width: 100%; max-width: 340px; aspect-ratio: 3/4.35; border-radius: 14px; overflow: hidden;
          border: 1px solid rgba(201,168,76,0.5); box-shadow: 0 0 40px rgba(201,168,76,0.18), 0 18px 50px rgba(0,0,0,0.7); }
        .hk-bg { position: absolute; inset: 0; background-size: cover; background-position: center 35%; }
        .hk-veil { position: absolute; inset: 0; background:
          linear-gradient(180deg, rgba(8,5,2,0.62) 0%, rgba(8,5,2,0.42) 32%, rgba(8,5,2,0.78) 64%, rgba(8,5,2,0.96) 100%); }
        .hk-frame { position: absolute; inset: 8px; border: 1px solid rgba(201,168,76,0.3); border-radius: 9px; pointer-events: none; }
        .hk-inner { position: relative; height: 100%; display: flex; flex-direction: column; align-items: center; padding: 20px 20px 16px; text-align: center; }
        .hk-kicker { font-family:'Cinzel',serif; font-size:9px; letter-spacing:0.5em; color:#8a6a2a; text-transform:uppercase; }
        .hk-flourish { color:#7a5a22; font-size:12px; letter-spacing:0.4em; margin:6px 0 14px; }
        @property --hk-ang { syntax: '<angle>'; inherits: false; initial-value: 210deg; }
        .hk-portre-ring { border-radius:50%; padding:3px;
          background: conic-gradient(from var(--hk-ang, 210deg), #6a4a1a, #e0bb58, #8b6914, #e0bb58, #6a4a1a);
          box-shadow: 0 0 22px rgba(201,168,76,0.4);
          animation: hk-ring-spin 7s linear infinite; }
        @keyframes hk-ring-spin { to { --hk-ang: 570deg; } }
        @media (prefers-reduced-motion: reduce) { .hk-portre-ring { animation: none; } }
        .hk-name { font-family:'Cinzel Decorative',serif; font-size:clamp(22px,6vw,30px); color:#e0bb58; margin-top:14px; line-height:1.1;
          text-shadow:0 2px 14px rgba(0,0,0,0.9), 0 0 28px rgba(201,168,76,0.3); }
        .hk-title { font-family:'Cinzel',serif; font-size:11px; letter-spacing:0.16em; color:#c9a84c; margin-top:7px; text-transform:uppercase; }
        .hk-rule { width:54%; height:1px; margin:14px 0; background:linear-gradient(to right, transparent, rgba(201,168,76,0.55), transparent); }
        .hk-tag { font-family:'Crimson Text',serif; font-style:italic; font-size:14px; color:#bda47a; line-height:1.6; padding:0 6px; }
        .hk-stats { display:flex; gap:14px; margin-top:auto; padding-top:14px; }
        .hk-stat { text-align:center; }
        .hk-stat-v { font-family:'Cinzel',serif; font-size:16px; font-weight:700; color:#d9b65a; }
        .hk-stat-l { font-family:'Cinzel',serif; font-size:7px; letter-spacing:0.18em; color:#7a6a4f; text-transform:uppercase; margin-top:2px; }
        .hk-foot { font-family:'Cinzel',serif; font-size:8px; letter-spacing:0.4em; color:#6a5226; text-transform:uppercase; margin-top:12px; }
        .hk-actions { display:flex; gap:10px; margin-top:18px; }
        .hk-btn { padding:11px 20px; font-family:'Cinzel',serif; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; cursor:pointer; border-radius:7px; }
        .hk-btn-share { color:#1a1206; font-weight:700; border:none; background:linear-gradient(180deg,#e0bb58,#c39a3c 60%,#a37f28); box-shadow:0 0 20px rgba(201,168,76,0.3); }
        .hk-btn-close { color:#b8a880; background:transparent; border:1px solid var(--color-border-hi); }
        .hk-note { font-family:'Crimson Text',serif; font-style:italic; font-size:12px; color:#8a7250; margin-top:10px; min-height:16px; }
      `}</style>

      <div className="hk-root">
        <button className="hk-close" onClick={onClose} aria-label="Kapat">✕</button>

        <div className={`hk-card hk-fade ${visible ? "shown" : ""}`}>
          <div className="hk-bg" style={{ backgroundImage: `url(${bg})` }} />
          <div className="hk-veil" />
          <div className="hk-frame" />
          <div className="hk-inner">
            <div className="hk-kicker">Kronikler · Hayat Kartı</div>
            <div className="hk-flourish">⚜</div>
            <div className="hk-portre-ring">
              <Portre age={age} gender={p.gender} id={name} size="6.4rem" ring={false} />
            </div>
            <div className="hk-name">{name}</div>
            <div className="hk-title">{title} · {age} yaş · {gen}. Nesil</div>
            <div className="hk-rule" />
            <div className="hk-tag">“{tagline(p)}”</div>
            <div className="hk-stats">
              <div className="hk-stat"><div className="hk-stat-v">{fameLabel(p.fame || 0)}</div><div className="hk-stat-l">Nam</div></div>
              <div className="hk-stat"><div className="hk-stat-v">{(p.children_ids?.length ?? p.children?.length ?? 0)}</div><div className="hk-stat-l">Evlat</div></div>
              <div className="hk-stat"><div className="hk-stat-v">{calendar?.year || ""}</div><div className="hk-stat-l">Yıl</div></div>
            </div>
            <div className="hk-foot">— Küllerin Mirası —</div>
          </div>
        </div>

        <div className="hk-actions hk-fade shown">
          <button className="hk-btn hk-btn-share" onClick={share}>📤 Paylaş</button>
          <button className="hk-btn hk-btn-close" onClick={onClose}>Kapat</button>
        </div>
        <div className="hk-note">{shareNote}</div>
      </div>
    </>,
    document.body
  );
}
