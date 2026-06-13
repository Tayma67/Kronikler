// Oyun durumu deposu — React context + AsyncStorage (offline kalıcı kayıt).
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameState, newGame, advance, eat } from "./game";

const KEY = "kronikler_save_v1";

interface Ctx {
  state: GameState | null;
  loading: boolean;
  startGame: (first: string, surname: string, gender: "erkek" | "kadın") => Promise<void>;
  doAdvance: (n?: number) => Promise<void>;
  doEat: () => Promise<void>;
  resetGame: () => Promise<void>;
}

const GameContext = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setState(JSON.parse(raw));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (s: GameState) => {
    setState(s);
    try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }, []);

  const startGame = useCallback(async (first: string, surname: string, gender: "erkek" | "kadın") => {
    await persist(newGame(first, surname, gender));
  }, [persist]);

  const doAdvance = useCallback(async (n = 1) => {
    setState((cur) => { if (!cur) return cur; const next = advance(cur, n); AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {}); return next; });
  }, []);

  const doEat = useCallback(async () => {
    setState((cur) => { if (!cur) return cur; const next = eat(cur); AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {}); return next; });
  }, []);

  const resetGame = useCallback(async () => {
    await AsyncStorage.removeItem(KEY); setState(null);
  }, []);

  return (
    <GameContext.Provider value={{ state, loading, startGame, doAdvance, doEat, resetGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): Ctx {
  const c = useContext(GameContext);
  if (!c) throw new Error("useGame must be used within GameProvider");
  return c;
}
