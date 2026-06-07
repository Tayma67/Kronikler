import { createContext, useContext, useState, useCallback } from "react";
import { api } from "@/lib/api";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchState = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/game/state");
      setState(data);
      return data;
    } catch (e) {
      const status = e.response?.status;
      if (status === 404 || status === 409) {
        // 404: oyun yok, 409: şema uyumsuzluğu → yeni oyun gerekli
        setState(false);
        return false;
      }
      // Ağ hatası, 500 vb. — state'i silme, yönlendirme yapma
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
      // TELEFONDA HATAYI GÖREBİLMEK İÇİN EKRANA UYARI VERDİRİYORUZ
      const hataMesaji = error.response?.data?.detail || error.message;
      alert("OYUN KURULURKEN HATA OLUŞTU: " + JSON.stringify(hataMesaji));
      return null; // Çökmeyi engellemek için null dönüyoruz
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
    try {
      const { data } = await api.post(`/game/advance?weeks=${weeks}`);
      setState(data);
      return data;
    } catch (error) {
      alert("İlerleme hatası: " + error.message);
      return null;
    }
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
      value={{ state, setState, loading, fetchState, newGame, deleteGame, advance, action }}
    >
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
