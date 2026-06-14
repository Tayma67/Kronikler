// Oyun durumu deposu — React context + AsyncStorage (offline kalıcı kayıt).
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameState, newGame, advance, eat, work, achievementsOf } from "./game";

const KEY = "kronikler_save_v1";

// Eski kayıtları yeni alanlarla uyumlulaştır (geriye dönük güvenli yükleme).
function migrate(s: GameState): GameState {
  const p: any = s.player || {};
  if (p.faction === undefined) p.faction = null;
  if (!p.faction_standing) p.faction_standing = {};
  if (!p.inventory) p.inventory = {};
  if (!p.properties) p.properties = [];
  if (p.generation === undefined) p.generation = 1;
  if (!p.skills) p.skills = { combat: 0, trade: 0, crafting: 0, social: 0 };
  if (!p.skill_xp) p.skill_xp = { combat: 0, trade: 0, crafting: 0, social: 0 };
  if (!p.perks) p.perks = [];
  if (!p.injuries) p.injuries = [];
  if (p.career_xp === undefined) p.career_xp = 0;
  if (!p.nam) p.nam = { comert: 0, zalim: 0, capkin: 0, dindar: 0, mert: 0 };
  if (!p.child_invests) p.child_invests = {};
  if (!p.equipped) p.equipped = { silah: null, zirh: null };
  if (!p.home_name) p.home_name = p.location_name;
  if (p.crowned === undefined) p.crowned = false;
  if (!p.will_pref) p.will_pref = "esit";
  if (!p.fates) p.fates = [];
  // Eski kayıt: hâlihazırda tamamlanmış başarımları 'alınmış' say (retroaktif puan seli olmasın).
  if (!p.claimed) { try { p.claimed = achievementsOf(s).filter((x) => x.done).map((x) => x.a.id); } catch { p.claimed = []; } }
  if (!(s as any).settlements) (s as any).settlements = [];
  if (!s.relationships) s.relationships = {};
  if (!s.dynasty) s.dynasty = [];
  if (!s.npc_state) s.npc_state = {};
  if (!s.story) s.story = { active: null, completed: [], tension: 0 };
  if (!s.wars) s.wars = [];
  if (s.caravan === undefined) s.caravan = null;
  if (s.econ === undefined) s.econ = 1;
  return s;
}

interface Ctx {
  state: GameState | null;
  loading: boolean;
  startGame: (first: string, surname: string, gender: "erkek" | "kadın") => Promise<void>;
  apply: (fn: (s: GameState) => GameState) => void;
  doAdvance: (n?: number) => void;
  doEat: () => void;
  doWork: () => void;
  resetGame: () => Promise<void>;
}

const GameContext = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const raw = await AsyncStorage.getItem(KEY); if (raw) setState(migrate(JSON.parse(raw))); } catch {}
      setLoading(false);
    })();
  }, []);

  // Tek geçiş noktası: state'i dönüştür + kalıcılaştır.
  const apply = useCallback((fn: (s: GameState) => GameState) => {
    setState((cur) => {
      if (!cur) return cur;
      const next = fn(cur);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const startGame = useCallback(async (first: string, surname: string, gender: "erkek" | "kadın") => {
    const s = newGame(first, surname, gender);
    setState(s);
    try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }, []);

  const doAdvance = useCallback((n = 1) => apply((s) => advance(s, n)), [apply]);
  const doEat = useCallback(() => apply(eat), [apply]);
  const doWork = useCallback(() => apply(work), [apply]);
  const resetGame = useCallback(async () => { await AsyncStorage.removeItem(KEY); setState(null); }, []);

  return (
    <GameContext.Provider value={{ state, loading, startGame, apply, doAdvance, doEat, doWork, resetGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): Ctx {
  const c = useContext(GameContext);
  if (!c) throw new Error("useGame must be used within GameProvider");
  return c;
}
