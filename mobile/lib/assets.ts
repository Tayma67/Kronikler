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
