import axios from "axios";

// ─────────────────────────────────────────────────────────────
//  Cihaz Kimliği (Device ID)
//  Her tarayıcı/telefon ilk açılışta benzersiz bir UUID üretir
//  ve bunu localStorage'a kaydeder. Sonraki ziyaretlerde aynı
//  ID kullanılır — böylece her cihaz kendi oyun kaydını oynar.
// ─────────────────────────────────────────────────────────────
function getOrCreateDeviceId() {
  const STORAGE_KEY = "kronikler_device_id";
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    // crypto.randomUUID() tüm modern tarayıcılarda desteklenir.
    // Desteklenmeyen çok eski tarayıcılar için basit bir fallback.
    deviceId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
          });
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
}

const BACKEND_URL = "https://kronikler-production.up.railway.app";
export const API = `${BACKEND_URL.replace(/\/$/, "")}/api`;

export const api = axios.create({ baseURL: API });

// ─────────────────────────────────────────────────────────────
//  Axios request interceptor:
//  Her istekte X-Device-ID başlığını otomatik ekler.
//  Bu sayede backend hangi cihazdan geldiğini bilir.
// ─────────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const deviceId = getOrCreateDeviceId();
  config.headers["X-Device-ID"] = deviceId;
  // Faz 5E: çoklu kayıt slotu (1-3); Ayarlar sayfasından değiştirilir
  config.headers["X-Save-Slot"] = localStorage.getItem("kronikler_save_slot") || "1";
  // Faz 6A: oyun dili (tr varsayılan; en hazır, de/es/ar yolda)
  config.headers["X-Lang"] = localStorage.getItem("kronikler_lang") || "tr";
  return config;
});

export function formatApiErrorDetail(detail) {
  if (detail == null) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : null))
      .filter(Boolean);
    if (msgs.length === 0) return null;
    return msgs.join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  try {
    return JSON.stringify(detail);
  } catch {
    return null;
  }
}

export function extractErrorMessage(e) {
  // Prefer FastAPI's `detail`, fall back to axios message, then a generic
  const fromDetail = formatApiErrorDetail(e?.response?.data?.detail);
  if (fromDetail) return fromDetail;
  if (e?.response?.status === 401) return "E-posta veya şifre hatalı";
  if (e?.response?.status === 403) return "Bu eylem için yetkin yok";
  if (e?.response?.status >= 500) return "Sunucu hatası. Lütfen birazdan tekrar dene.";
  if (e?.message === "Network Error") return "Ağ hatası — bağlantıyı kontrol et.";
  if (e?.message) return e.message;
  return "Beklenmedik bir hata oluştu.";
}
