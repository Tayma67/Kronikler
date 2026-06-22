// Sade mod (animasyonları azalt) — pil dostu. Kalıcı aç/kapa (varsayılan kapalı = tam animasyon).
// Açıkken: sürekli dönen dekoratif animasyonlar (hero zoom, ortam parçacıkları, düğme tozu) durur.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "kronikler_reducemotion_v1";
let reduced = false;
const listeners = new Set<() => void>();

export async function loadReduceMotion(): Promise<boolean> {
  try { const v = await AsyncStorage.getItem(KEY); if (v !== null) reduced = v === "1"; } catch {}
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
