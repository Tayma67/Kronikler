// Sade mod (animasyonları azalt) — pil dostu. Kalıcı aç/kapa.
// İlk açılışta RAM < 3 GB algılandığında otomatik devreye girer; sonraki açılışlarda kullanıcı tercihi geçerlidir.
// Açıkken: sürekli dönen dekoratif animasyonlar (hero zoom, ortam parçacıkları, düğme tozu) durur.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const KEY = "kronikler_reducemotion_v1";
let reduced = false;
const listeners = new Set<() => void>();

function isLowEndDevice(): boolean {
  if (Platform.OS !== "android") return false;
  const mem = (Platform.constants as Record<string, unknown>).totalMemory;
  return typeof mem === "number" && mem < 3 * 1024 * 1024 * 1024;
}

export async function loadReduceMotion(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v !== null) {
      reduced = v === "1";
    } else {
      reduced = isLowEndDevice();
      await AsyncStorage.setItem(KEY, reduced ? "1" : "0");
    }
  } catch {}
  return reduced;
}
export function isReduceMotion(): boolean { return reduced; }
export async function setReduceMotion(on: boolean): Promise<void> {
  reduced = on;
  try { await AsyncStorage.setItem(KEY, on ? "1" : "0"); } catch {}
  listeners.forEach((l) => { try { l(); } catch {} });
}
// Anlık değişimde animasyonlu bileşenlerin yeniden çizilmesi için abonelik.
export function onReduceMotionChange(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }
