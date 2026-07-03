import React, { useEffect, useState } from "react";
import { Text, AppState } from "react-native";

// İzole geri sayım: yalnız bu küçük yazı saniyede bir render olur (tüm ekran değil).
// Arka plana geçilince timer durur → pil/CPU tasarrufu. React.memo ile dış render'lardan korunur.
// (diyar.tsx'ten ortaklaştırıldı: lobi VE oyun ekranı aynı sayacı kullanır.)
export const CountdownSecs = React.memo(function CountdownSecs({ deadline, fmt, style }: { deadline: number; fmt: (s: number) => string; style: object }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.round((deadline - Date.now()) / 1000)));
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const tick = () => setSecs(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    const start = () => { if (!id) { tick(); id = setInterval(tick, 1000); } };
    const stop = () => { if (id) { clearInterval(id); id = null; } };
    start();
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") start(); else stop(); });
    return () => { stop(); sub.remove(); };
  }, [deadline]);
  return <Text style={style} numberOfLines={1}>{fmt(secs)}</Text>;
});
