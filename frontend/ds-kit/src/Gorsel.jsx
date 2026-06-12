/**
 * Görsel varlık köprüsü — dosya varsa resim, yoksa zarif geri dönüş.
 * tools/gorsel_uret.py varlıkları üretene KADAR oyun emoji/gradyanla
 * yaşar; ürettiği an aynı kod resimli moda geçer (sıfır ek değişiklik).
 */
import { useEffect, useState } from "react";

const _durum = {};   // yol → true/false (oturum içi önbellek)

export function useGorselVar(src) {
  const [var_, setVar] = useState(_durum[src] === true);
  useEffect(() => {
    if (!src) return;
    if (src in _durum) { setVar(_durum[src]); return; }
    const im = new Image();
    im.onload = () => { _durum[src] = true; setVar(true); };
    im.onerror = () => { _durum[src] = false; setVar(false); };
    im.src = src;
  }, [src]);
  return var_;
}

/** Yaş/cinsiyetten portre yolu — varyant NPC kimliğinden deterministik. */
export function portreYolu(age, gender, id = "") {
  const kusak = age < 30 ? "genc" : age < 55 ? "orta" : "yasli";
  const cins = gender === "kadın" ? "k" : "e";
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `/images/portre/${cins}_${kusak}_${(h % 3) + 1}.jpg`;
}

/** Dairesel portre: resim varsa resim, yoksa emoji. */
export function Portre({ age = 30, gender, id, emoji = "👤", size = "3rem", ring = true }) {
  const yol = portreYolu(age, gender, id);
  const hazir = useGorselVar(yol);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      overflow: "hidden",
      border: ring ? "2px solid var(--color-gold)" : "1px solid var(--color-border-hi)",
      boxShadow: ring ? "0 0 0 3px rgba(201,168,76,0.15), 0 0 16px rgba(201,168,76,0.35)" : "none",
      background: "linear-gradient(135deg, #3A2010 0%, #1A0E06 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {hazir ? (
        <img src={yol} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: `calc(${size} * 0.45)` }}>{emoji}</span>
      )}
    </div>
  );
}

/** Hanedan arması: resim varsa mühür, yoksa emoji sembol. */
export function Arma({ dynastyId, emoji, size = "1.6rem" }) {
  const yol = `/images/arma/${dynastyId}.jpg`;
  const hazir = useGorselVar(yol);
  if (!hazir) return <span style={{ fontSize: size }}>{emoji}</span>;
  return (
    <img src={yol} alt="" style={{
      width: size, height: size, borderRadius: "50%",
      objectFit: "cover", border: "1px solid rgba(201,168,76,0.4)",
      boxShadow: "0 0 8px rgba(201,168,76,0.25)",
    }} />
  );
}

/** Yetişkin hero yolu (Dashboard). */
export function heroYolu(age, season) {
  const donem = age < 30 ? "genc" : age < 55 ? "orta" : "yasli";
  const mevsim = season === "Kış" ? "kis" : season === "Sonbahar" ? "sonbahar"
    : season === "İlkbahar" ? "ilkbahar" : "yaz";
  return `/images/hero/${donem}_${mevsim}.jpg`;
}
