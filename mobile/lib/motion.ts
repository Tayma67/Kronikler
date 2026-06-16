// Ortak hareket sabitleri (Material esinli). Linear KULLANMA — mekanik durur.
import { Easing } from "react-native-reanimated";

export const DUR = { fast: 120, base: 220, enter: 225, exit: 195, screen: 320 };
// giriş = decelerate, çıkış = accelerate, genel = standard
export const EASE = {
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),
  decel: Easing.bezier(0.0, 0.0, 0.2, 1),
  accel: Easing.bezier(0.4, 0.0, 1, 1),
};
