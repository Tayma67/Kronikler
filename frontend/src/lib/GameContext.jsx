import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, extractErrorMessage } from "@/lib/api";
import { toast } from "sonner";

const GameContext = createContext(null);

// Railway free tier 5 dakika işlem olmayınca uyuyor.
// Her 4 dakikada bir /health ping'i atarak uyku modunu engelle.
const KEEP_ALIVE_MS = 4 * 60 * 1000; // 4 dakika

export function GameProvider({ children }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastCaravanEvent, setLastCaravanEvent] = useState(null);
  const [lastWorldEvent, setLastWorldEvent] = useState(null);
  const [lastCrisisEvents, setLastCrisisEvents] = useState([]);
  const [comingOfAge, setComingOfAge] = useState(null);   // reşit olma (13) sinematiği
  const [lastActionPage, setLastActionPage] = useState(null);
  const [freshEvents, setFreshEvents] = useState([]);

  // ── Keep-alive: Railway uykuya geçmesin ──────────────────────
  useEffect(() => {
    const ping = () => api.get("/").catch(() => {});
    ping(); // uygulama açılışında hemen tetikle
    const id = setInterval(ping, KEEP_ALIVE_MS);
    return () => clearInterval(id);
  }, []);

  const fetchState = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/game/state");
      setState(data);
      return data;
    } catch (e) {
      const status = e.response?.status;
      if (status === 404 || status === 409) {
        setState(false);
        return false;
      }
      console.warn("fetchState geçici hata (yönlendirme yok):", e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const newGame = useCallback(async (firstName, surname, gender) => {
    try {
      const { data } = await api.post("/game/new", {
        first_name: firstName,
        surname,
        gender,
      });
      setState(data);
      return data;
    } catch (error) {
      const hataMesaji = error.response?.data?.detail || error.message;
      toast.error("Oyun kurulurken bir hata oluştu", {
        description: typeof hataMesaji === "string" ? hataMesaji : JSON.stringify(hataMesaji),
      });
      return null;
    }
  }, []);

  const deleteGame = useCallback(async () => {
    try {
      await api.delete("/game/state");
    } catch(e) {
      console.warn(e);
    } finally {
      setState(false);
    }
  }, []);

  const advance = useCallback(async (weeks = 1) => {
    // Railway cold-start'a karşı dayanıklı retry
    const RETRY_DELAYS = [0, 4000, 8000, 14000];
    const MAX_RETRIES = RETRY_DELAYS.length - 1;
    let lastError = null;
    let warmupToastId = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // 3. denemede (12s geçti) artık "uyanıyor" mesajı göster
      if (attempt === 2 && !warmupToastId) {
        warmupToastId = toast.loading("Sunucu uyanıyor, az kaldı…", {
          duration: 30000,
        });
      }

      const delay = RETRY_DELAYS[attempt];
      if (delay > 0) await new Promise(res => setTimeout(res, delay));

      try {
        const { data } = await api.post(`/game/advance?weeks=${weeks}`);
        // Başarılı — yükleniyor toastını kapat
        if (warmupToastId) toast.dismiss(warmupToastId);
        setState(data);
        if (data?.caravan_event) setLastCaravanEvent(data.caravan_event);
        if (data?.new_world_events?.length > 0) setLastWorldEvent(data.new_world_events[0]);
        if (data?.crisis_events?.length > 0) setLastCrisisEvents(data.crisis_events);
        if (data?.coming_of_age) setComingOfAge(data.coming_of_age);
        return data;
      } catch (error) {
        lastError = error;
        const isNetwork = error.message === "Network Error" || !error.response;
        // Ağ hatası ve retry hakkı varsa devam et
        if (isNetwork && attempt < MAX_RETRIES) continue;
        // 5xx sunucu hatası da retry'a girer
        if (error.response?.status >= 500 && attempt < MAX_RETRIES) continue;
        break;
      }
    }

    if (warmupToastId) toast.dismiss(warmupToastId);
    const msg = extractErrorMessage(lastError);
    toast.error("İlerleme hatası", {
      description: msg,
      duration: 6000,
      action: { label: "Tamam", onClick: () => {} },
    });
    return null;
  }, []);

  const action = useCallback(async (path, body = null) => {
    try {
      const { data } = await api.post(path, body);
      if (data?.state) {
        setState(data.state);
        return data;
      }
      if (data && data.world) {
        setState(data);
      }
      return data;
    } catch (error) {
      const msg = error.response?.data?.detail || error.message;
      toast.error("Aksiyon hatası", { description: msg, duration: 5000 });
      return null;
    }
  }, []);

  return (
    <GameContext.Provider
      value={{
        state, setState, loading, fetchState, newGame, deleteGame, advance, action,
        lastCaravanEvent, clearCaravanEvent: () => setLastCaravanEvent(null),
        lastWorldEvent, clearWorldEvent: () => setLastWorldEvent(null),   // Adım 9
        lastCrisisEvents, clearCrisisEvents: () => setLastCrisisEvents([]),   // GDD v4
        comingOfAge, clearComingOfAge: () => setComingOfAge(null),        // reşit olma (13)
        lastActionPage, setLastActionPage,                                // Adım 14
        clearLastActionPage: () => setLastActionPage(null),              // Adım 14
        freshEvents, setFreshEvents,                                       // Anlık eylem olayları
        clearFreshEvents: () => setFreshEvents([]),
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
