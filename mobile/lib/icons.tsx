import Svg, { Path } from "react-native-svg";
import { ICON_PATHS } from "./icon-paths";
import { C } from "./theme";

// Oyun kavramı → game-icons adı. Eksikse emoji'ye düşmez; boş döner.
export const ICON: Record<string, string> = {
  // Sekmeler / ana
  ana: "flame", karakter: "shield", iliskiler: "family", menu: "scroll-open",
  // Geçim
  meslek: "anvil", pazar: "scales", mulkler: "castle", firsatlar: "compass", mektep: "graduate-cap",
  // Güç & mevki
  orgutler: "crown", sosyal: "prayer-beads", savas: "crossed-swords", suc: "hood",
  // Diyar & soy
  sehir: "house", haberler: "scroll", hanedan: "banner",
  // Kayıt & anı
  tarih: "book", roman: "scroll-open", ayarlar: "cog",
  // Aksiyonlar
  ye: "bread", calis: "anvil", ilerle: "hourglass",
  // Özellikler
  guc: "fist", zeka: "book", karizma: "lyre", dayaniklilik: "boot",
  saglik: "healing", tokluk: "wheat", akce: "coins",
  // Diğer
  evlilik: "ring", dogum: "baby", olum: "tombstone", zafer: "trophy", silah: "crossed-swords",
};

export function GameIcon({ name, size = 22, color = C.gold }: { name: string; size?: number; color?: string }) {
  const key = ICON[name] || name;
  const paths = ICON_PATHS[key];
  if (!paths) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      {paths.map((d, i) => <Path key={i} d={d} fill={color} />)}
    </Svg>
  );
}
