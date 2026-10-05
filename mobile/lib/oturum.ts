// Cihazda kalan oturum kaydı (TASARIM_PUSULASI Faz 4, ilke 11: ölçmeden "eğlenceli" deme).
// Yalnız bu cihazda tutulur, hiçbir yere gönderilmez; ayarlar ekranında özetlenir ve silinebilir.
// Oturum: uygulama öne gelince başlar, arka plana gidince kapanır. Eylem = ayı ilerletmeyen her durum değişikliği.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";

const KEY = "kronikler_oturum_v1";
const MAX = 40;
export interface Oturum { bas: number; sure: number; ay: number; eylem: number; ilkEylem?: number; yasBas?: number; yasSon?: number; ekran: Record<string, number>; son?: string }

let aktif: Oturum | null = null;
let kayitlar: Oturum[] | null = null;

async function yukle(): Promise<Oturum[]> {
  if (kayitlar) return kayitlar;
  try { const r = await AsyncStorage.getItem(KEY); const x = r ? JSON.parse(r) : []; kayitlar = Array.isArray(x) ? x : []; } catch { kayitlar = []; }
  return kayitlar!;
}
function baslat() { if (!aktif) aktif = { bas: Date.now(), sure: 0, ay: 0, eylem: 0, ekran: {} }; }
async function kapat() {
  const o = aktif; aktif = null; if (!o) return;
  o.sure = Math.round((Date.now() - o.bas) / 1000);
  if (o.sure < 5 && !o.eylem && !o.ay) return; // yanlışlıkla açılıp kapanan
  const l = await yukle(); l.push(o); while (l.length > MAX) l.shift();
  try { await AsyncStorage.setItem(KEY, JSON.stringify(l)); } catch {}
}
if (AppState.currentState === "active" || AppState.currentState == null) baslat();
AppState.addEventListener("change", (st) => { if (st === "active") baslat(); else kapat(); });

// Durum geçişi (store.apply): ay ilerlediyse ay, ilerlemediyse eylem sayılır.
export function oturumGecis(onceTurn: number, sonraTurn: number, yas: number) {
  baslat(); const o = aktif!;
  if (o.yasBas == null) o.yasBas = yas; o.yasSon = yas;
  if (sonraTurn > onceTurn) o.ay += sonraTurn - onceTurn;
  else { o.eylem++; if (o.ilkEylem == null) o.ilkEylem = Math.round((Date.now() - o.bas) / 1000); }
}
export function oturumEkran(ad: string) { baslat(); const o = aktif!; o.ekran[ad] = (o.ekran[ad] || 0) + 1; o.son = ad; }

const ortanca = (a: number[]) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export interface OturumOzeti { n: number; sureDk: number; eylem: number; ilkEylemSn: number | null; ay: number; dkBasinaEylem: number; ekranlar: [string, number][]; birakilan: [string, number][] }
export async function oturumOzeti(): Promise<OturumOzeti> {
  const kapanan = await yukle();
  const l = [...kapanan, ...(aktif ? [{ ...aktif, sure: Math.round((Date.now() - aktif.bas) / 1000) }] : [])]; // süren oturum da sayılır (bırakılan ekran hariç)
  const ekran: Record<string, number> = {}; const son: Record<string, number> = {};
  for (const o of l) for (const [k, v] of Object.entries(o.ekran || {})) ekran[k] = (ekran[k] || 0) + v;
  for (const o of kapanan) if (o.son) son[o.son] = (son[o.son] || 0) + 1;
  const ilk = l.map((o) => o.ilkEylem).filter((x): x is number => x != null);
  const toplamDk = l.reduce((a, o) => a + o.sure, 0) / 60; const toplamEylem = l.reduce((a, o) => a + o.eylem, 0);
  const sirala = (r: Record<string, number>) => Object.entries(r).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return { n: l.length, sureDk: Math.round(ortanca(l.map((o) => o.sure)) / 6) / 10, eylem: ortanca(l.map((o) => o.eylem)), ilkEylemSn: ilk.length ? Math.round(ortanca(ilk)) : null, ay: ortanca(l.map((o) => o.ay)), dkBasinaEylem: toplamDk > 0 ? Math.round((toplamEylem / toplamDk) * 10) / 10 : 0, ekranlar: sirala(ekran), birakilan: sirala(son) };
}
export async function oturumSil() { kayitlar = []; aktif = null; baslat(); try { await AsyncStorage.removeItem(KEY); } catch {} }
