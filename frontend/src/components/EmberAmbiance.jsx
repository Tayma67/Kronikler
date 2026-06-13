import { useMemo } from "react";

/**
 * EmberAmbiance — "Köz Atmosferi"
 * Sönmekte olan bir ocaktan savrulan kıvılcımlar gibi, tüm uygulamada usulca
 * yükselen ince köz zerreleri. İçeriği örtmez (pointer-events yok, düşük
 * opaklık, içeriğin önünde ama solgun). prefers-reduced-motion'da kapanır.
 * "Kül & Köz" kimliğini her ekrana sızdırır.
 */
const COUNT = 18;

export default function EmberAmbiance() {
  const embers = useMemo(() =>
    Array.from({ length: COUNT }, (_, i) => {
      const rnd = (a, b) => a + Math.random() * (b - a);
      const size = rnd(2.2, 5);
      const warm = Math.random() < 0.5 ? "242,176,76" : "228,124,62"; // altın / kor
      return {
        key: i,
        left: rnd(2, 98),
        size,
        dur: rnd(8, 15),
        delay: rnd(0, 9),
        drift: rnd(-30, 30),
        sway: rnd(10, 26),
        opacity: rnd(0.34, 0.74),
        warm,
        rise: rnd(62, 92),       // ne kadar yükselir (vh)
      };
    }), []);

  return (
    <div aria-hidden="true" style={{
      position: "fixed", inset: 0, zIndex: 6, pointerEvents: "none", overflow: "hidden",
    }}>
      <style>{`
        @keyframes ember-rise {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          10%  { opacity: var(--ember-o); }
          50%  { transform: translateY(calc(var(--ember-rise) * -0.5vh)) translateX(var(--ember-sway)); }
          85%  { opacity: var(--ember-o); }
          100% { transform: translateY(calc(var(--ember-rise) * -1vh)) translateX(var(--ember-drift)); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ember-amb { display: none; }
        }
      `}</style>
      {embers.map(e => (
        <span key={e.key} className="ember-amb" style={{
          position: "absolute",
          bottom: "-2vh",
          left: `${e.left}%`,
          width: `${e.size}px`,
          height: `${e.size}px`,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(${e.warm},1) 0%, rgba(${e.warm},0.5) 42%, transparent 72%)`,
          boxShadow: `0 0 ${e.size * 3}px rgba(${e.warm},0.6)`,
          "--ember-o": e.opacity,
          "--ember-rise": e.rise,
          "--ember-drift": `${e.drift}px`,
          "--ember-sway": `${e.sway}px`,
          animation: `ember-rise ${e.dur}s ease-in ${e.delay}s infinite`,
          willChange: "transform, opacity",
        }} />
      ))}
    </div>
  );
}
