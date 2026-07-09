// Diyar oturumu koordinatörü — UI çizmez. Kökte (MpProvider altında) mount edilir.
// Görev: sunucu tick'inde yerel hayatı 1 ay ilerlet + çapraz-oyuncu stat etkilerini uygula + senkron + yedek.
// Böylece çok-oyunculu, tek-oyuncu ana ekranının AYNISINDA oynanır; ayrı bir "diyar panosu" gerekmez.
import { useEffect, useRef } from "react";
import { useGame } from "../store";
import { useMp } from "./store";
import { mePublic, applyTickEvents } from "./world";
import { advance, GameState } from "../game";

export function RealmSession() {
  const { state, apply, mpMode } = useGame();
  const { guestId, snapshot, lastTick, missed, clearMissed, syncPlayer, saveState } = useMp();
  const sRef = useRef<GameState | null>(state);
  useEffect(() => { sRef.current = state; }, [state]);
  const processedTurn = useRef(-1);
  const syncedInit = useRef(false);

  // Diyar oturumu bittiğinde (mpMode kapanınca) bir sonraki oturum için bayrakları sıfırla.
  useEffect(() => { if (!mpMode) { syncedInit.current = false; processedTurn.current = -1; } }, [mpMode]);

  // İlk kamu senkronu + ilk yedek (karakter ortak depoya girince).
  useEffect(() => {
    if (mpMode && state && guestId && snapshot && !syncedInit.current) {
      syncedInit.current = true;
      syncPlayer(mePublic(guestId, state, false));
      saveState(JSON.stringify(state));
    }
  }, [mpMode, state, guestId, snapshot, syncPlayer, saveState]);

  // Sunucu tick'i → dünya ayı ilerledi: yerel karakteri 1 ay ilerlet + çapraz etkiler + senkron + yedek.
  useEffect(() => {
    if (!mpMode || !lastTick || !guestId || !sRef.current) return;
    if (lastTick.turn === processedTurn.current) return;
    processedTurn.current = lastTick.turn;
    let ns = advance(sRef.current, 1);
    const mine = lastTick.results.find((r) => r.playerId === guestId);
    if (mine && mine.events.length) ns = applyTickEvents(ns, mine.events);
    apply(() => ns);
    syncPlayer(mePublic(guestId, ns, false));
    saveState(JSON.stringify(ns)); // her ay sonunda sunucuya yedek → çıkıp girince aynı karaktere devam
  }, [lastTick, mpMode, guestId]);

  // Yoklukta biriken kişisel olaylar (hediye altını, borç düşümü...) — katılımda sunucudan gelir, bir kez işlenir.
  useEffect(() => {
    if (!mpMode || !missed || !missed.length || !guestId || !sRef.current) return;
    const ns = applyTickEvents(sRef.current, missed);
    apply(() => ns);
    clearMissed();
    syncPlayer(mePublic(guestId, ns, false));
    saveState(JSON.stringify(ns));
  }, [missed, mpMode, guestId]);

  return null;
}
