// Çok oyuncu yapılandırması: sunucu adresi + kalıcı misafir kimliği.
// Sunucu adresi YARIN doldurulacak (Cloudflare Worker WebSocket URL'i).
import AsyncStorage from "@react-native-async-storage/async-storage";

// Dağıtımdan sonra buraya Worker adresini yaz (örn "wss://kronikler-mp.<hesap>.workers.dev").
// Boş bırakılırsa istemci "sunucu ayarlanmadı" der; uygulama-içi ayardan da girilebilir.
export const DEFAULT_SERVER_URL = "wss://kronikler-mp.tayma.workers.dev";

const URL_KEY = "kronikler_mp_server_url";
const ID_KEY = "kronikler_guest_id";
const NAME_KEY = "kronikler_mp_name";

let _serverUrl: string | null = null;
let _guestId: string | null = null;

export async function getServerUrl(): Promise<string> {
  if (_serverUrl !== null) return _serverUrl;
  try { const v = await AsyncStorage.getItem(URL_KEY); _serverUrl = v ?? DEFAULT_SERVER_URL; }
  catch { _serverUrl = DEFAULT_SERVER_URL; }
  return _serverUrl;
}
export async function setServerUrl(url: string): Promise<void> {
  _serverUrl = url.trim();
  try { await AsyncStorage.setItem(URL_KEY, _serverUrl); } catch {}
}

// Açık diyar listesi gibi HTTP istekleri için temel adres (wss→https, ws→http).
export async function getHttpBase(): Promise<string> {
  const u = await getServerUrl();
  return u.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:").replace(/\/$/, "");
}

// Kalıcı misafir kimliği — hesapsız oynanış (cihaz başına bir hanedan kimliği).
export async function getGuestId(): Promise<string> {
  if (_guestId) return _guestId;
  try {
    let v = await AsyncStorage.getItem(ID_KEY);
    if (!v) { v = "g_" + randomId(); await AsyncStorage.setItem(ID_KEY, v); }
    _guestId = v; return v;
  } catch { _guestId = "g_" + randomId(); return _guestId; }
}

export async function getSavedName(): Promise<string> {
  try { return (await AsyncStorage.getItem(NAME_KEY)) || ""; } catch { return ""; }
}
export async function setSavedName(n: string): Promise<void> {
  try { await AsyncStorage.setItem(NAME_KEY, n); } catch {}
}

// İlk-giriş tanıtımı görüldü mü (bir kez gösterilir).
const TUT_KEY = "kronikler_mp_tut_seen";
export async function getTutorialSeen(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(TUT_KEY)) === "1"; } catch { return false; }
}
export async function setTutorialSeen(): Promise<void> {
  try { await AsyncStorage.setItem(TUT_KEY, "1"); } catch {}
}

// AsyncStorage tabanlı; Math.random kullanır (kimlik üretimi, deterministik olması gerekmez).
function randomId(): string {
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}
