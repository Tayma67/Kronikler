// Oyun durumu deposu — React context + AsyncStorage (offline kalıcı kayıt).
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameState, newGame, advance, eat, work, achievementsOf, WorkStyle , migrate } from "./game";
export { migrate }; // MP ekranı ve testler store üzerinden erişmeye devam eder

const KEY = "kronikler_save_v1";
// Yazmadan önce son sağlam kaydı yedeğe kaydır: yarım yazım/bozulma tek noktadan toplam kayba dönmesin.
async function persistWithBackup(s: unknown) {
  try {
    const prev = await AsyncStorage.getItem(KEY);
    if (prev) await AsyncStorage.setItem(KEY + "_bak", prev);
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

// Kaydın ham JSON'unu dışa ver (ayarlar ekranındaki yedekle/paylaş): tek offline kayıt telefonla birlikte kaybolmasın.
export async function exportSaveText(): Promise<string | null> {
  try { return (await AsyncStorage.getItem(KEY)) || (await AsyncStorage.getItem(KEY + "_bak")); } catch { return null; }
}


interface Ctx {
  state: GameState | null;
  loading: boolean;
  startGame: (first: string, surname: string, gender: "erkek" | "kadın") => Promise<void>;
  apply: (fn: (s: GameState) => GameState) => void;
  doAdvance: (n?: number) => void;
  doEat: () => void;
  importSave: (raw: string) => Promise<boolean>;
  doWork: (style?: WorkStyle) => void;
  resetGame: () => Promise<void>;
  // ── Çok oyuncu köprüsü ── MP karakterini aynı depoya koyar; böylece TÜM /oyun
  // alt-ekranları (meslek/mektep/savaş…) MP karakteri üstünde de değişiklik yapmadan çalışır.
  // mpMode true iken SP kaydına (AsyncStorage) YAZILMAZ → çevrimdışı kayıt korunur.
  mpMode: boolean;
  enterMp: (s: GameState) => void;
  exitMp: () => Promise<void>;
}

const GameContext = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [mpMode, setMpMode] = useState(false);
  const mpRef = useRef(false); // persist gating senkron okuma için

  useEffect(() => {
    (async () => {
      try {
        const parseOk = (raw: string | null) => {
          if (!raw) return null;
          try { const obj = JSON.parse(raw); return obj && typeof obj === "object" && obj.player && typeof obj.player === "object" ? obj : null; } catch { return null; }
        };
        // Bozuk/eksik kayıt (sürüm geçişi, yarım yazım) "Devam Et"i gösterip /oyun'da çökmesin:
        // önce ana kayıt, o bozuksa bir önceki yazımın yedeği (tek nokta = toplam kayıp olmasın).
        const obj = parseOk(await AsyncStorage.getItem(KEY)) || parseOk(await AsyncStorage.getItem(KEY + "_bak"));
        if (obj) setState(migrate(obj));
      } catch {}
      setLoading(false);
    })();
  }, []);

  // Kalıcılaştırmayı geciktir: bellekte anında, diske en çok ~1.2 sn'de bir yaz.
  // (Her aksiyonda tüm state'i JSON'a çevirip diske yazmak CPU/pil yakıyordu.)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<GameState | null>(null);
  const flush = useCallback(() => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const s = pending.current; pending.current = null;
    if (mpRef.current) return; // MP modunda SP kaydına yazma
    if (s) persistWithBackup(s);
  }, []);
  const schedulePersist = useCallback((s: GameState) => {
    if (mpRef.current) return; // MP modunda SP kaydına yazma (çevrimdışı kayıt korunur)
    pending.current = s;
    if (saveTimer.current) return;
    saveTimer.current = setTimeout(() => { saveTimer.current = null; const x = pending.current; pending.current = null; if (x) persistWithBackup(x); }, 1200);
  }, []);
  // Uygulama arka plana alınınca / kapanırken bekleyen kaydı hemen diske yaz.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => { if (st !== "active") flush(); });
    return () => { sub.remove(); flush(); };
  }, [flush]);

  // Tek geçiş noktası: state'i dönüştür (bellek anında) + kalıcılaştırmayı geciktir.
  const apply = useCallback((fn: (s: GameState) => GameState) => {
    setState((cur) => {
      if (!cur) return cur;
      const next = fn(cur);
      schedulePersist(next);
      return next;
    });
  }, [schedulePersist]);

  const startGame = useCallback(async (first: string, surname: string, gender: "erkek" | "kadın") => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; } pending.current = null;
    const s = newGame(first, surname, gender);
    setState(s);
    try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }, []);

  // MP modunda zaman yalnız sunucu tick'iyle ilerler → yerel doAdvance no-op (desenkron önlenir).
  const doAdvance = useCallback((n = 1) => { if (mpRef.current) return; apply((s) => advance(s, n)); }, [apply]);
  const doEat = useCallback(() => apply(eat), [apply]);
  // Yedeği içe al: yapıştırılan JSON'u doğrula, göçten geçir, kayda ve yedeğe yaz. MP diyarında kapalı (SP kaydı ezilmesin).
  const importSave = useCallback(async (raw: string): Promise<boolean> => {
    if (mpRef.current) return false;
    try {
      const obj = JSON.parse(raw.trim());
      if (!obj || typeof obj !== "object" || !obj.player || typeof obj.turn !== "number") return false;
      const s = migrate(obj);
      await AsyncStorage.setItem(KEY, JSON.stringify(s));
      await AsyncStorage.setItem(KEY + "_bak", JSON.stringify(s));
      setState(s);
      return true;
    } catch { return false; }
  }, []);
  const doWork = useCallback((style?: WorkStyle) => apply((s) => work(s, style)), [apply]);
  const resetGame = useCallback(async () => { if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; } pending.current = null; if (mpRef.current) return; await AsyncStorage.removeItem(KEY); setState(null); }, []);

  // ── Çok oyuncu köprüsü ──
  const enterMp = useCallback((s: GameState) => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; } pending.current = null; // bekleyen SP yazımını iptal et
    mpRef.current = true; setMpMode(true); setState(s);
  }, []);
  const exitMp = useCallback(async () => {
    mpRef.current = false; setMpMode(false);
    // SP kaydını diskten geri yükle (Devam Et için); yoksa null
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) { const obj = JSON.parse(raw); if (obj && typeof obj === "object" && obj.player) { setState(migrate(obj)); return; } }
    } catch {}
    setState(null);
  }, []);

  return (
    <GameContext.Provider value={{ state, loading, startGame, apply, doAdvance, doEat, importSave, doWork, resetGame, mpMode, enterMp, exitMp }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): Ctx {
  const c = useContext(GameContext);
  if (!c) throw new Error("useGame must be used within GameProvider");
  return c;
}
