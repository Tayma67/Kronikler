// hooks/useActionRedirect.js — Adım 14
// Aksiyon sonrası Dashboard'a yönlendirme + "Geri Dön" butonu için
import { useNavigate, useLocation } from "react-router-dom";
import { useGame } from "@/lib/GameContext";

/**
 * Kullanım:
 *   const withRedirect = useActionRedirect("Factions");
 *   await withRedirect(async () => {
 *     const { data } = await api.post(...);
 *     setState(data.state ?? data);
 *     return data;
 *   });
 *
 * Aksiyon tamamlanınca:
 *  1. lastActionPage kaydedilir (bu sayfa)
 *  2. Dashboard'a (/oyun) navigate edilir
 *  3. GameLayout "Geri Dön" butonunu gösterir
 */
export function useActionRedirect(label) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setLastActionPage, setState, state: currentState, setFreshEvents } = useGame();

  return async function withRedirect(actionFn) {
    const result = await actionFn();
    if (result !== null && result !== undefined) {
      // ── Aksiyon sonucu state içeriyorsa anında GameContext'e yaz ──
      // Böylece Dashboard'daki olaylar feed'i yeni event'leri gösterir
      let newState = null;
      if (result?.state) {
        newState = result.state;
        setState(result.state);
      } else if (result?.world) {
        newState = result;
        setState(result);
      }
      // Yeni eklenen olayları tespit et (anlık eylem feed'i için)
      if (newState && setFreshEvents) {
        const oldLen = (currentState?.history || []).length;
        const newHistory = newState?.history || [];
        const newEvents = newHistory.slice(oldLen);
        if (newEvents.length > 0) {
          setFreshEvents(newEvents);
        }
      }
      // Sadece başarılı aksiyonlarda yönlendir
      setLastActionPage({ path: location.pathname, label });
      navigate("/oyun");
    }
    return result;
  };
}
