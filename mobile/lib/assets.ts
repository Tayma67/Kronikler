// Statik görsel haritası (RN require literal yol ister).
const HERO_COCUK: Record<string, any> = {
  "Yaz": require("../assets/hero/cocuk_yaz.jpg"),
  "Kış": require("../assets/hero/cocuk_kis.jpg"),
  "Sonbahar": require("../assets/hero/cocuk_sonbahar.jpg"),
  "İlkbahar": require("../assets/hero/cocuk_ilkbahar.jpg"),
};
export function heroImage(age: number, season: string): any {
  // İlk milestone: çocuk mevsim görselleri. Yetişkin setleri sonra eklenecek.
  return HERO_COCUK[season] || HERO_COCUK["Yaz"];
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
