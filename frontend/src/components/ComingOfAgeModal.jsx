import { useState, useEffect } from "react";
import { playSfx } from "@/lib/audio";

/**
 * ComingOfAgeModal — reşit olma (13) sinematiği.
 * Ölüm/miras ekranının coşkulu kardeşi: çocukluk biter, dünya açılır.
 * advance yanıtındaki `coming_of_age` ile tetiklenir (Dashboard).
 *   data: { name, age, year, unlocked: [...] }
 */
export default function ComingOfAgeModal({ data, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    try { playSfx("success"); } catch (_) {}
    return () => clearTimeout(t);
  }, []);
  if (!data) return null;

  const name = (data.name || "Kahraman").toUpperCase();
  const unlocked = data.unlocked || ["Meslek", "Savaş", "Ticaret", "Evlilik"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600&family=Crimson+Text:ital,wght@0,400;1,400&display=swap');
        .coa-root { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; overflow-y: auto; padding: 24px;
          background: radial-gradient(ellipse 90% 60% at 50% 8%, rgba(201,168,76,0.14) 0%, transparent 55%), #070502; }
        .coa-card { max-width: 520px; width: 100%; text-align: center; }
        .coa-fade { transition: opacity 1s ease, transform 1s ease; }
        .coa-fade.hidden { opacity: 0; transform: translateY(14px); }
        .coa-fade.shown  { opacity: 1; transform: translateY(0); }
        .coa-sun { font-size: 56px; margin-bottom: 6px; filter: drop-shadow(0 0 22px rgba(240,192,64,0.55)); }
        .coa-kicker { font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 0.55em; color: #8a6a2a; text-transform: uppercase; margin-bottom: 10px; }
        .coa-title { font-family: 'Cinzel Decorative', serif; font-size: clamp(24px, 6.5vw, 42px); color: #e0bb58; line-height: 1.1;
          text-shadow: 0 2px 18px rgba(0,0,0,0.8), 0 0 36px rgba(201,168,76,0.3); }
        .coa-sub { font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.32em; color: #6a5226; text-transform: uppercase; margin-top: 8px; }
        .coa-divider { width: 46px; height: 1px; background: linear-gradient(to right, transparent, #6a4a1a, transparent); margin: 22px auto; }
        .coa-quote { font-family: 'Crimson Text', serif; font-style: italic; font-size: clamp(14px, 3.2vw, 17px); color: #b89868; line-height: 1.9; margin: 0 6px; }
        .coa-section { font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 0.55em; color: #6a5226; text-transform: uppercase; margin-bottom: 12px; }
        .coa-badges { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
        .coa-badge { font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 0.06em; color: #d4a96a; background: linear-gradient(160deg, rgba(201,168,76,0.12), rgba(201,168,76,0.03)); border: 1px solid rgba(201,168,76,0.35); padding: 6px 12px; border-radius: 4px; }
        .coa-btn { width: 100%; max-width: 320px; padding: 14px; font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.32em; text-transform: uppercase; color: #1a1206; font-weight: 700;
          background: linear-gradient(180deg, #e0bb58 0%, #c39a3c 60%, #a37f28 100%); border: none; cursor: pointer; border-radius: 6px; margin-top: 26px;
          box-shadow: 0 0 26px rgba(201,168,76,0.35), 0 6px 18px rgba(0,0,0,0.6); transition: filter 0.2s, transform 0.1s; }
        .coa-btn:hover { filter: brightness(1.08); }
        .coa-btn:active { transform: scale(0.98); }
      `}</style>

      <div className="coa-root">
        <div className={`coa-card coa-fade ${visible ? "shown" : "hidden"}`}>
          <div className="coa-sun">🌅</div>
          <div className="coa-kicker">Çocukluk Sona Erdi</div>
          <div className="coa-title">{name}</div>
          <div className="coa-sub">{data.age} Yaşında · {data.year || ""}</div>

          <div className="coa-divider" />

          <p className="coa-quote">
            Çocukluğun küllerinden bir genç doğdu.<br />
            Artık baban da yanında değil, kararların senin.<br />
            Önünde koca bir dünya — kaderini kendin yazacaksın.
          </p>

          <div className="coa-divider" />

          <div className="coa-section">Dünya Sana Açıldı</div>
          <div className="coa-badges">
            {unlocked.map((u) => (
              <span key={u} className="coa-badge">{u}</span>
            ))}
          </div>

          <button className="coa-btn" onClick={onClose}>
            Dünyaya Adım At →
          </button>
        </div>
      </div>
    </>
  );
}
