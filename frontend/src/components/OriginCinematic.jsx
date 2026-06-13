import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * OriginCinematic — "Doğuş Sahnesi"
 * Yeni bir hayatın ilk anı: küllerin diyarına gelişini çerçeveler.
 * Hayat-yayı sinematiklerinin ilki (doğuş → reşit olma → ölüm).
 * NewGame, karakter yaratıldıktan sonra gösterir; "Gözlerini Aç" → oyun.
 *
 * props: name, gender, onClose
 */
const BG = "/images/hero/cocuk_sonbahar.jpg";

export default function OriginCinematic({ name, gender, onClose }) {
  const [step, setStep] = useState(0); // 0: karanlık/setting · 1: doğuş · 2: hazır
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1400);
    const t2 = setTimeout(() => setStep(2), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const cocuk = gender === "kadın" ? "bir kız çocuğu" : "bir oğlan çocuğu";

  return createPortal(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600&family=Crimson+Text:ital,wght@0,400;1,400&display=swap');
        .or-root { position: fixed; inset: 0; z-index: 9999; overflow: hidden; background: #050302;
          display: flex; align-items: center; justify-content: center; }
        .or-bg { position: absolute; inset: 0; background-size: cover; background-position: center 38%;
          transition: opacity 2.4s ease, transform 7s ease; }
        .or-veil { position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(5,3,2,0.78) 0%, rgba(5,3,2,0.5) 40%, rgba(5,3,2,0.82) 100%); }
        .or-grain::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:0.5;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");}
        .or-inner { position: relative; z-index: 2; max-width: 480px; padding: 28px; text-align: center; }
        .or-line { font-family:'Crimson Text',serif; font-style:italic; color:#c4a87a; line-height:1.95;
          transition: opacity 1.4s ease, transform 1.4s ease; }
        .or-l1 { font-size: clamp(15px,4vw,19px); }
        .or-l2 { font-size: clamp(16px,4.2vw,20px); margin-top: 18px; color:#d4b884; }
        .or-name { font-family:'Cinzel Decorative',serif; font-size:clamp(22px,6vw,32px); color:#e0bb58; margin:22px 0 6px;
          text-shadow:0 2px 16px rgba(0,0,0,0.85), 0 0 30px rgba(201,168,76,0.25); }
        .or-hide { opacity: 0; transform: translateY(10px); }
        .or-show { opacity: 1; transform: none; }
        .or-btn { margin-top: 30px; padding: 14px 30px; font-family:'Cinzel',serif; font-size:12px; letter-spacing:0.3em; text-transform:uppercase;
          color:#1a1206; font-weight:700; border:none; border-radius:7px; cursor:pointer;
          background:linear-gradient(180deg,#e0bb58,#c39a3c 60%,#a37f28); box-shadow:0 0 26px rgba(201,168,76,0.35), 0 6px 18px rgba(0,0,0,0.6);
          transition: opacity 1.2s ease, filter 0.2s; }
        .or-btn:hover { filter: brightness(1.08); }
      `}</style>

      <div className="or-root or-grain">
        <div className="or-bg" style={{
          backgroundImage: `url(${BG})`,
          opacity: step >= 1 ? 0.9 : 0,
          transform: step >= 1 ? "scale(1.06)" : "scale(1.0)",
        }} />
        <div className="or-veil" />
        <div className="or-inner">
          <p className={`or-line or-l1 ${step >= 0 ? "or-show" : "or-hide"}`}>
            Küllerin diyarında, eski savaşların külü daha soğumadan…
          </p>
          <p className={`or-line or-l2 ${step >= 1 ? "or-show" : "or-hide"}`}>
            Yoksul ama onurlu bir ailenin {cocuk} olarak,
            sıradan bir köyde dünyaya geldin.
          </p>
          {step >= 2 && (
            <>
              <div className="or-name or-show">{name || "Kahraman"}</div>
              <p className="or-line or-l1 or-show" style={{ marginTop: 0 }}>
                Yedi yaşındasın. Önünde koca bir ömür, arkanda küller.<br />
                Hikâyen şimdi başlıyor.
              </p>
              <button className="or-btn or-show" onClick={onClose}>Gözlerini Aç →</button>
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
