import { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import Animated, { FadeInUp, FadeOutUp, FadeIn, FadeOut, ZoomIn, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "./store";
import { socialTierIndex } from "./game";
import { useI18n } from "./i18n";
import { hap } from "./haptics";
import { playFanfare, playTap, playToll, playChime } from "./sound";
import { C, F } from "./theme";
import { GameIcon } from "./icons";

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
  const [crown, setCrown] = useState<null | { tick: number }>(null);
  const [settle, setSettle] = useState<null | { name: string; tick: number }>(null);
  const [wed, setWed] = useState<null | { name: string; tick: number }>(null);
  const [birth, setBirth] = useState<null | { name: string; tick: number }>(null);
  const [mourn, setMourn] = useState<null | { tick: number }>(null);
  const prev = useRef<Record<string, number> | null>(null);
  const gen = useRef<number>(-1);
  const fameTier = useRef<number>(-1);
  const wasCrowned = useRef<boolean | null>(null);
  const settleCount = useRef<number>(-1);
  const wasMarried = useRef<boolean | null>(null);
  const childCount = useRef<number>(-1);
  const wasDead = useRef<boolean | null>(null);

  // Vefat — en ağır an: kutlama değil, kül tonu ve ağır dokunuş (ölüm sessiz geçmesin).
  useEffect(() => {
    if (!state) return;
    const d = !!state.player.dead;
    if (wasDead.current === null || gen.current !== state.player.generation) { wasDead.current = d; return; }
    if (d && !wasDead.current) { setMourn({ tick: Date.now() }); hap("heavy"); playToll(); setTimeout(() => setMourn(null), 3000); }
    wasDead.current = d;
  }, [state?.player.dead, state?.player.generation]);

  // Tahta çıkış — en büyük an.
  useEffect(() => {
    if (!state) return;
    const c = !!state.player.crowned;
    if (wasCrowned.current === null) { wasCrowned.current = c; return; }
    if (c && !wasCrowned.current) { setCrown({ tick: Date.now() }); hap("success"); playFanfare(); setTimeout(() => setCrown(null), 3200); }
    wasCrowned.current = c;
  }, [state?.player.crowned]);

  // Yeni yerleşim kuruldu.
  useEffect(() => {
    if (!state) return;
    const list = state.settlements || [];
    if (settleCount.current < 0 || gen.current !== state.player.generation) { settleCount.current = list.length; return; }
    if (list.length > settleCount.current) { setSettle({ name: list[list.length - 1]?.name || "", tick: Date.now() }); hap("success"); playTap(); setTimeout(() => setSettle(null), 2600); }
    settleCount.current = list.length;
  }, [state?.settlements?.length]);

  // Evlilik — ömrün duygusal omurgası; yerleşim kadar özel kutlanır.
  useEffect(() => {
    if (!state) return;
    const m = !!state.player.married;
    if (wasMarried.current === null || gen.current !== state.player.generation) { wasMarried.current = m; return; }
    if (m && !wasMarried.current) { setWed({ name: state.player.spouse_name || "", tick: Date.now() }); hap("success"); playFanfare(); setTimeout(() => setWed(null), 2800); }
    wasMarried.current = m;
  }, [state?.player.married, state?.player.generation]);

  // Evlat doğumu.
  useEffect(() => {
    if (!state) return;
    const list = state.player.children || [];
    if (childCount.current < 0 || gen.current !== state.player.generation) { childCount.current = list.length; return; }
    if (list.length > childCount.current) { setBirth({ name: list[list.length - 1] || "", tick: Date.now() }); hap("success"); playChime(); setTimeout(() => setBirth(null), 2600); }
    childCount.current = list.length;
  }, [state?.player.children?.length]);

  // Şöhret kademe atlayınca büyük kutlama anı.
  useEffect(() => {
    if (!state) return;
    const ti = socialTierIndex(state.player.fame);
    if (fameTier.current < 0 || gen.current !== state.player.generation) { fameTier.current = ti; return; }
    if (ti > fameTier.current) {
      setTierUp({ tier: ti, tick: Date.now() });
      hap("success"); playFanfare();
      setTimeout(() => setTierUp(null), 2600);
    }
    fameTier.current = ti;
  }, [state?.player.fame, state?.player.generation]);

  // İzlenenler — survival decay (açlık) gürültüsünü dışta tutar; sistemlerimizin "kimlik" eksenine odaklanır.
  const WATCH: Watch[] = [
    { path: "money",          icon: "akce",  color: C.gold,  label: "", min: 3 },
    { path: "reputation",     icon: "karakter", color: C.sage,  label: t("soc.reputation.l"), min: 1 },
    { path: "honor",          icon: "medal", color: C.azure, label: t("soc.honor.l"), min: 1 },
    { path: "fear",           icon: "skull", color: C.blood, label: t("soc.fear.l"), min: 1 },
    { path: "fame",           icon: "crown", color: C.ink,   label: t("soc.fame.l"), min: 1 },
    { path: "stat_points",    icon: "star",  color: C.gold,  label: t("char.points"), min: 1 },
    { path: "health",         icon: "saglik", color: C.blood, label: t("char.health"), min: 4, onlyDrop: true },
    { path: "nam.comert",     icon: "leaf", color: "#7FA66A", label: t("nam.comert"), min: 1 },
    { path: "nam.zalim",      icon: "skull", color: "#C0556B", label: t("nam.zalim"), min: 1 },
    { path: "nam.capkin",     icon: "lyre", color: "#C77BA6", label: t("nam.capkin"), min: 1 },
    { path: "nam.dindar",     icon: "prayer-beads", color: "#9C7BC4", label: t("nam.dindar"), min: 1 },
    { path: "nam.mert",       icon: "crossed-swords", color: "#E0922E", label: t("nam.mert"), min: 1 },
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

  if (toasts.length === 0 && !tierUp && !crown && !settle && !wed && !birth && !mourn) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: insets.top + 8, left: 0, right: 0, alignItems: "center", zIndex: 999 }}>
      {mourn && (
        <Animated.View key={"mourn" + mourn.tick} entering={ZoomIn.springify().damping(18)} exiting={FadeOut.duration(600)}
          style={{ alignItems: "center", backgroundColor: "rgba(10,9,8,0.97)", borderWidth: 1.5, borderColor: "rgba(150,145,135,0.55)", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 10 }}>
          <GameIcon name="tombstone" size={24} color="#9A948A" />
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2.5, color: "#8A857C", marginTop: 4 }}>{t("feel.vefat").toUpperCase()}</Text>
        </Animated.View>
      )}
      {settle && (
        <Animated.View key={"settle" + settle.tick} entering={ZoomIn.springify().damping(15)} exiting={FadeOut.duration(380)}
          style={{ alignItems: "center", backgroundColor: "rgba(13,10,6,0.96)", borderWidth: 1.5, borderColor: C.sage, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 22, marginBottom: 10, shadowColor: C.sage, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 10 }}>
          <GameIcon name="castle" size={24} color={C.sage} />
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2.5, color: C.goldDim, marginTop: 4 }}>{t("feel.settle").toUpperCase()}</Text>
          {!!settle.name && <Text style={{ fontFamily: F.display, fontSize: 16, letterSpacing: 1, color: C.sage, marginTop: 2 }}>{settle.name}</Text>}
        </Animated.View>
      )}
      {wed && (
        <Animated.View key={"wed" + wed.tick} entering={ZoomIn.springify().damping(15)} exiting={FadeOut.duration(380)}
          style={{ alignItems: "center", backgroundColor: "rgba(13,10,6,0.96)", borderWidth: 1.5, borderColor: C.gold, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 22, marginBottom: 10, shadowColor: C.gold, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 10 }}>
          <GameIcon name="ring" size={24} color={C.gold} />
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2.5, color: C.goldDim, marginTop: 4 }}>{t("feel.wed").toUpperCase()}</Text>
          {!!wed.name && <Text style={{ fontFamily: F.display, fontSize: 16, letterSpacing: 1, color: C.gold, marginTop: 2 }}>{wed.name}</Text>}
        </Animated.View>
      )}
      {birth && (
        <Animated.View key={"birth" + birth.tick} entering={ZoomIn.springify().damping(15)} exiting={FadeOut.duration(380)}
          style={{ alignItems: "center", backgroundColor: "rgba(13,10,6,0.96)", borderWidth: 1.5, borderColor: C.sage, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 22, marginBottom: 10, shadowColor: C.sage, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 10 }}>
          <GameIcon name="baby" size={24} color={C.sage} />
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2.5, color: C.goldDim, marginTop: 4 }}>{t("feel.birth").toUpperCase()}</Text>
          {!!birth.name && <Text style={{ fontFamily: F.display, fontSize: 16, letterSpacing: 1, color: C.sage, marginTop: 2 }}>{birth.name}</Text>}
        </Animated.View>
      )}
      {crown && (
        <Animated.View key={"crown" + crown.tick} entering={ZoomIn.springify().damping(13)} exiting={FadeOut.duration(450)}
          style={{ alignItems: "center", backgroundColor: "rgba(13,10,6,0.97)", borderWidth: 2, borderColor: C.gold, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 26, marginBottom: 10, shadowColor: C.gold, shadowOpacity: 0.7, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 12 }}>
          <GameIcon name="crown" size={38} color={C.gold} />
          <Text style={{ fontFamily: F.display, fontSize: 18, letterSpacing: 1.5, color: C.gold, marginTop: 6 }}>{t("feel.throne")}</Text>
        </Animated.View>
      )}
      {tierUp && (
        <Animated.View key={"tier" + tierUp.tick} entering={ZoomIn.springify().damping(14)} exiting={FadeOut.duration(400)}
          style={{ alignItems: "center", backgroundColor: "rgba(13,10,6,0.96)", borderWidth: 1.5, borderColor: C.gold, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 22, marginBottom: 10, shadowColor: C.gold, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 10 }}>
          <GameIcon name="crown" size={26} color={C.gold} />
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2.5, color: C.goldDim, marginTop: 4 }}>{t("feel.fameUp").toUpperCase()}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 17, letterSpacing: 1, color: C.gold, marginTop: 2 }}>{t("soc.fame.t" + tierUp.tier)}</Text>
        </Animated.View>
      )}
      {toasts.map((tt) => (
        <Animated.View key={tt.id} entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(260)} layout={Layout.springify().damping(18)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(13,10,6,0.94)", borderWidth: 1, borderColor: tt.color + "88", borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, marginBottom: 6, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}>
          <GameIcon name={tt.icon} size={12} color={tt.color} />
          <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 0.3, color: tt.color }}>{tt.text}</Text>
        </Animated.View>
      ))}
    </View>
  );
}
