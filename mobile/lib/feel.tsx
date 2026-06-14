import { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import Animated, { FadeInUp, FadeOutUp, FadeIn, FadeOut, ZoomIn, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "./store";
import { socialTierIndex } from "./game";
import { useI18n } from "./i18n";
import { hap } from "./haptics";
import { C, F } from "./theme";

// Hangi alanları izliyoruz + nasıl gösteriliyor. "feel" katmanı: kimlik/itibar değişimleri anında patlar.
type Watch = { path: string; icon: string; color: string; label: string; min: number; onlyDrop?: boolean };

interface Toast { id: number; text: string; color: string; icon: string }

let _id = 0;

export function StatDeltaOverlay() {
  const insets = useSafeAreaInsets();
  const { state } = useGame();
  const { t } = useI18n();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [tierUp, setTierUp] = useState<null | { tier: number; tick: number }>(null);
  const prev = useRef<Record<string, number> | null>(null);
  const gen = useRef<number>(-1);
  const fameTier = useRef<number>(-1);

  // Şöhret kademe atlayınca büyük kutlama anı.
  useEffect(() => {
    if (!state) return;
    const ti = socialTierIndex(state.player.fame);
    if (fameTier.current < 0 || gen.current !== state.player.generation) { fameTier.current = ti; return; }
    if (ti > fameTier.current) {
      setTierUp({ tier: ti, tick: Date.now() });
      hap("success");
      setTimeout(() => setTierUp(null), 2600);
    }
    fameTier.current = ti;
  }, [state?.player.fame, state?.player.generation]);

  // İzlenenler — survival decay (açlık) gürültüsünü dışta tutar; sistemlerimizin "kimlik" eksenine odaklanır.
  const WATCH: Watch[] = [
    { path: "money",          icon: "⚜",  color: C.gold,  label: "", min: 3 },
    { path: "reputation",     icon: "🛡", color: C.sage,  label: t("soc.reputation.l"), min: 1 },
    { path: "honor",          icon: "⚖", color: C.azure, label: t("soc.honor.l"), min: 1 },
    { path: "fear",           icon: "🌒", color: C.blood, label: t("soc.fear.l"), min: 1 },
    { path: "fame",           icon: "👑", color: C.ink,   label: t("soc.fame.l"), min: 1 },
    { path: "stat_points",    icon: "✦",  color: C.gold,  label: t("char.points"), min: 1 },
    { path: "health",         icon: "❤", color: C.blood, label: t("char.health"), min: 4, onlyDrop: true },
    { path: "nam.comert",     icon: "🤲", color: "#7FA66A", label: t("nam.comert"), min: 1 },
    { path: "nam.zalim",      icon: "🗡", color: "#C0556B", label: t("nam.zalim"), min: 1 },
    { path: "nam.capkin",     icon: "🌹", color: "#C77BA6", label: t("nam.capkin"), min: 1 },
    { path: "nam.dindar",     icon: "📿", color: "#9C7BC4", label: t("nam.dindar"), min: 1 },
    { path: "nam.mert",       icon: "⚔", color: "#E0922E", label: t("nam.mert"), min: 1 },
  ];

  const read = (p: any, path: string): number => {
    const parts = path.split(".");
    let v: any = p;
    for (const k of parts) v = v?.[k];
    return typeof v === "number" ? v : 0;
  };

  useEffect(() => {
    if (!state) return;
    const p = state.player;
    const snap: Record<string, number> = {};
    for (const w of WATCH) snap[w.path] = read(p, w.path);

    // İlk yükleme veya nesil değişimi → sessizce eşitle (büyük sıçramaları gösterme).
    if (prev.current === null || gen.current !== p.generation) {
      prev.current = snap; gen.current = p.generation; return;
    }

    const fresh: Toast[] = [];
    for (const w of WATCH) {
      const d = snap[w.path] - (prev.current[w.path] ?? snap[w.path]);
      if (Math.abs(d) < w.min) continue;
      if (w.onlyDrop && d > 0) continue;
      const sign = d > 0 ? "+" : "−";
      const txt = w.label ? `${sign}${Math.abs(Math.round(d))} ${w.label}` : `${sign}${Math.abs(Math.round(d))}`;
      fresh.push({ id: ++_id, text: txt, color: w.color, icon: w.icon });
    }
    prev.current = snap;
    if (fresh.length === 0) return;

    setToasts((cur) => [...cur, ...fresh].slice(-5));
    const ids = fresh.map((f) => f.id);
    setTimeout(() => setToasts((cur) => cur.filter((tt) => !ids.includes(tt.id))), 1750);
  }, [state?.player]);

  if (toasts.length === 0 && !tierUp) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: insets.top + 8, left: 0, right: 0, alignItems: "center", zIndex: 999 }}>
      {tierUp && (
        <Animated.View key={"tier" + tierUp.tick} entering={ZoomIn.springify().damping(14)} exiting={FadeOut.duration(400)}
          style={{ alignItems: "center", backgroundColor: "rgba(13,10,6,0.96)", borderWidth: 1.5, borderColor: C.gold, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 22, marginBottom: 10, shadowColor: C.gold, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 10 }}>
          <Text style={{ fontSize: 26 }}>👑</Text>
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2.5, color: C.goldDim, marginTop: 4 }}>{t("feel.fameUp").toUpperCase()}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 17, letterSpacing: 1, color: C.gold, marginTop: 2 }}>{t("soc.fame.t" + tierUp.tier)}</Text>
        </Animated.View>
      )}
      {toasts.map((tt) => (
        <Animated.View key={tt.id} entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(260)} layout={Layout.springify().damping(18)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(13,10,6,0.94)", borderWidth: 1, borderColor: tt.color + "88", borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, marginBottom: 6, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}>
          <Text style={{ fontSize: 12 }}>{tt.icon}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 0.3, color: tt.color }}>{tt.text}</Text>
        </Animated.View>
      ))}
    </View>
  );
}
