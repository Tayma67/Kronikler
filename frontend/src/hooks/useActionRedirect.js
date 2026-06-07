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
  const { setLastActionPage } = useGame();

  return async function withRedirect(actionFn) {
    const result = await actionFn();
    if (result !== null && result !== undefined) {
      // Sadece başarılı aksiyonlarda yönlendir
      setLastActionPage({ path: location.pathname, label });
      navigate("/oyun");
    }
    return result;
  };
}
