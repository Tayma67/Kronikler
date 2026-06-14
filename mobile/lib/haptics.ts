// Dokunsal geri bildirim — az & anlamlı. Kalıcı aç/kapa (varsayılan açık).
// Asla tek sinyal değil: her zaman görsel/ses ile birlikte kullanılır.
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "kronikler_haptics_v1";
let enabled = true;

export async function loadHapticsSetting(): Promise<boolean> {
  try { const v = await AsyncStorage.getItem(KEY); if (v !== null) enabled = v === "1"; } catch {}
  return enabled;
}
export function isHapticsEnabled(): boolean { return enabled; }
export async function setHapticsEnabled(on: boolean): Promise<void> {
  enabled = on;
  try { await AsyncStorage.setItem(KEY, on ? "1" : "0"); } catch {}
}

// Anlamlı anlara eşlenmiş tek kapı. Hepsi fire-and-forget; hata yutulur.
export type Hap = "tap" | "advance" | "selection" | "success" | "warning" | "error" | "heavy";
export function hap(kind: Hap) {
  if (!enabled) return;
  try {
    switch (kind) {
      case "tap": Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break;
      case "advance": Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
      case "heavy": Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); break;
      case "selection": Haptics.selectionAsync(); break;
      case "success": Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
      case "warning": Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); break;
      case "error": Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); break;
    }
  } catch {}
}
