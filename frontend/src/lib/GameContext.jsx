import { createContext, useContext, useState, useCallback } from "react";
import { api, extractErrorMessage } from "@/lib/api";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastCaravanEvent, setLastCaravanEvent] = useState(null);
  const [lastWorldEvent, setLastWorldEvent] = useState(null);   // Adım 9
  const [lastCrisisEvents, setLastCrisisEvents] = useState([]);   // GDD v4 Bölüm 5.4
  const [lastActionPage, setLastActionPage] = useState(null);   // Adım 14
  const [freshEvents, setFreshEvents] = useState([]);           // Anlık eylem olayları

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
      alert("OYUN KURULURKEN HATA OLUŞTU: " + JSON.stringify(hataMesaji));
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
    const MAX_RETRIES = 2;
    let lastError = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { data } = await api.post(`/game/advance?weeks=${weeks}`);
        setState(data);
        if (data?.caravan_event) {
          setLastCaravanEvent(data.caravan_event);
        }
        // Adım 9: dünya olayı
        if (data?.new_world_events?.length > 0) {
          setLastWorldEvent(data.new_world_events[0]);
        }
        // GDD v4: kriz olayları
        if (data?.crisis_events?.length > 0) {
          setLastCrisisEvents(data.crisis_events);
        }
        return data;
      } catch (error) {
        lastError = error;
        const isNetwork = error.message === "Network Error" || !error.response;
        if (isNetwork && attempt < MAX_RETRIES) {
          // Railway uyanma süresi için kısa bekle, sonra tekrar dene
          await new Promise(res => setTimeout(res, 1200 * (attempt + 1)));
          continue;
        }
        break;
      }
    }
    const msg = extractErrorMessage(lastError);
    alert("İlerleme hatası: " + msg);
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
      alert("Aksiyon hatası: " + (error.response?.data?.detail || error.message));
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
