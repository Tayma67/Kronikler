/**
 * GameIcon — game-icons.net (CC BY 3.0) SVG ikonlarını tema rengine boyar.
 * CSS mask ile tek-şekil SVG'yi istenen renge (varsayılan altın) döker;
 * böylece emoji yerine tutarlı, ortaçağ temalı, her boyutta net ikonlar.
 * Görseller /public/images/game-icons/{name}.svg (arka plan karesi temizlenmiş).
 */
export default function GameIcon({ name, size = "1rem", color = "var(--color-gold)", title, style }) {
  const url = `/images/game-icons/${name}.svg`;
  return (
    <span
      aria-label={title || name}
      title={title}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        flexShrink: 0,
        verticalAlign: "middle",
        ...style,
      }}
    />
  );
}
