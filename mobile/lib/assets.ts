// Statik görsel haritası (RN require literal yol ister).
// Yaş kuşağı × mevsim. cocuk (0-12) · genc (13-29) · orta (30-54) · yasli (55+).
const HERO: Record<string, Record<string, any>> = {
  cocuk: {
    "Yaz": require("../assets/hero/cocuk_yaz.jpg"),
    "Kış": require("../assets/hero/cocuk_kis.jpg"),
    "Sonbahar": require("../assets/hero/cocuk_sonbahar.jpg"),
    "İlkbahar": require("../assets/hero/cocuk_ilkbahar.jpg"),
  },
  genc: {
    "Yaz": require("../assets/hero/genc_yaz.jpg"),
    "Kış": require("../assets/hero/genc_kis.jpg"),
    "Sonbahar": require("../assets/hero/genc_sonbahar.jpg"),
    "İlkbahar": require("../assets/hero/genc_ilkbahar.jpg"),
  },
  orta: {
    "Yaz": require("../assets/hero/orta_yaz.jpg"),
    "Kış": require("../assets/hero/orta_kis.jpg"),
    "Sonbahar": require("../assets/hero/orta_sonbahar.jpg"),
    "İlkbahar": require("../assets/hero/orta_ilkbahar.jpg"),
  },
  yasli: {
    "Yaz": require("../assets/hero/yasli_yaz.jpg"),
    "Kış": require("../assets/hero/yasli_kis.jpg"),
    "Sonbahar": require("../assets/hero/yasli_sonbahar.jpg"),
    "İlkbahar": require("../assets/hero/yasli_ilkbahar.jpg"),
  },
};
function heroBand(age: number): string {
  if (age < 13) return "cocuk";
  if (age < 30) return "genc";
  if (age < 55) return "orta";
  return "yasli";
}
export function heroImage(age: number, season: string): any {
  const set = HERO[heroBand(age)] || HERO.cocuk;
  return set[season] || set["Yaz"];
}

// Portreler — yaş kuşağı + cinsiyete göre.
const PORTRE: Record<string, any> = {
  e_cocuk: require("../assets/portre/e_cocuk.jpg"), e_ergen: require("../assets/portre/e_ergen.jpg"),
  e_genc: require("../assets/portre/e_genc.jpg"), e_yetiskin: require("../assets/portre/e_yetiskin.jpg"),
  e_olgun: require("../assets/portre/e_olgun.jpg"), e_yasli: require("../assets/portre/e_yasli.jpg"),
  e_ihtiyar: require("../assets/portre/e_ihtiyar.jpg"),
  k_cocuk: require("../assets/portre/k_cocuk.jpg"), k_ergen: require("../assets/portre/k_ergen.jpg"),
  k_genc: require("../assets/portre/k_genc.jpg"), k_yetiskin: require("../assets/portre/k_yetiskin.jpg"),
  k_olgun: require("../assets/portre/k_olgun.jpg"), k_yasli: require("../assets/portre/k_yasli.jpg"),
  k_ihtiyar: require("../assets/portre/k_ihtiyar.jpg"),
};
function band(age: number): string {
  if (age <= 12) return "cocuk"; if (age <= 17) return "ergen"; if (age <= 24) return "genc";
  if (age <= 32) return "yetiskin"; if (age <= 45) return "olgun"; if (age <= 59) return "yasli"; return "ihtiyar";
}
export function portreImage(age: number, gender: "erkek" | "kadın"): any {
  const c = gender === "kadın" ? "k" : "e";
  return PORTRE[`${c}_${band(age)}`];
}

// Hanedan armaları — soyada göre deterministik seçilir.
const ARMA: any[] = [
  require("../assets/arma/kurt.jpg"), require("../assets/arma/tac.jpg"), require("../assets/arma/hancer.jpg"),
  require("../assets/arma/hilal.jpg"), require("../assets/arma/kilic.jpg"), require("../assets/arma/bugday.jpg"),
];
export function armaImage(seed: string | number): any {
  const str = String(seed || "x"); let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return ARMA[h % ARMA.length];
}
