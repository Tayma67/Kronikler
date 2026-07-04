// Atmosfer efektleri — UI thread'de döngüsel partiküller (köz, kar, yaprak).
import { useEffect, useMemo } from "react";
import { View, Text, Image, StyleSheet, ImageSourcePropType } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withDelay, withTiming, withSequence, Easing } from "react-native-reanimated";
import { C, F } from "./theme";
import { isReduceMotion } from "./perf";

const AnimImage = Animated.createAnimatedComponent(Image);

// Yaşayan hero — arka görsel yavaşça zoom + pan (Ken Burns). İçerik üstte akar.
export function KenBurns({ source, children, style }: { source: ImageSourcePropType; children?: React.ReactNode; style?: any }) {
  const sc = useSharedValue(1); const tx = useSharedValue(0); const ty = useSharedValue(0);
  useEffect(() => {
    if (isReduceMotion()) return; // sade mod: hero sabit kalır (sürekli GPU yok)
    sc.value = withRepeat(withTiming(1.12, { duration: 15000, easing: Easing.inOut(Easing.sin) }), -1, true);
    tx.value = withRepeat(withTiming(-16, { duration: 19000, easing: Easing.inOut(Easing.sin) }), -1, true);
    ty.value = withRepeat(withTiming(-10, { duration: 17000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }, { translateX: tx.value }, { translateY: ty.value }] }));
  return (
    <View style={[{ overflow: "hidden" }, style]}>
      <AnimImage source={source} style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }, st]} resizeMode="cover" />
      {children}
    </View>
  );
}

// Tek partikül — merkezden dışa savrulup söner.
// Soyut konfeti tanesi — emoji yerine sıcak tonlu küçük eşkenar dörtgen.
function Particle({ color, dx, dy, rot, dur, size }: { color: string; dx: number; dy: number; rot: number; dur: number; size: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: dur, easing: Easing.out(Easing.quad) }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ translateX: dx * p.value }, { translateY: dy * p.value }, { rotate: `${45 + rot * p.value}deg` }, { scale: 0.6 + p.value * 0.6 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size, height: size, borderRadius: Math.max(1, size * 0.18), backgroundColor: color }, st]} />;
}

// Partikül patlaması — kutlama konfetisi (sıcak tonlu). mount'ta bir kez oynar.
const BURST_PALETTE = ["#C9A84C", "#E8D5B0", "#E0C060", "#E05A30"];
export function ParticleBurst({ colors = BURST_PALETTE, count = 16, top = "40%", up = true }: { colors?: string[]; count?: number; top?: number | string; up?: boolean }) {
  const parts = useMemo(() => Array.from({ length: count }, () => {
    const ang = rnd(0, Math.PI * 2); const dist = rnd(70, 180);
    return { color: colors[Math.floor(Math.random() * colors.length)], dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist - (up ? rnd(40, 110) : 0), rot: rnd(-220, 220), dur: rnd(800, 1500), size: rnd(7, 13) };
  }), []);
  return <View pointerEvents="none" style={{ position: "absolute", left: "50%", top: top as any }}>{parts.map((p, i) => <Particle key={i} {...p} />)}</View>;
}

// Kılıç savurma — beyaz çizgi ekrandan geçer (savaş darbesi).
export function Slash({ color = "rgba(255,255,255,0.9)" }: { color?: string }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: p.value < 0.25 ? p.value / 0.25 : (1 - p.value) / 0.75, transform: [{ translateX: -160 + p.value * 320 }, { rotate: "-22deg" }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: "42%", height: 3, backgroundColor: color, shadowColor: "#fff", shadowOpacity: 0.9, shadowRadius: 8 }, st]} />;
}

// Nabız atan sarmalayıcı (opaklık).
export function Pulse({ children, min = 0.35, max = 1, dur = 850 }: { children: React.ReactNode; min?: number; max?: number; dur?: number }) {
  const o = useSharedValue(min);
  useEffect(() => { o.value = withRepeat(withSequence(withTiming(max, { duration: dur }), withTiming(min, { duration: dur })), -1, false); }, []);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

// İskelet blok (yükleme yer tutucusu) — hafif nabızlı.
export function SkeletonBlock({ w = "100%", h = 14, r = 7, mb = 8 }: { w?: number | string; h?: number; r?: number; mb?: number }) {
  return <Pulse min={0.25} max={0.5} dur={750}><View style={{ width: w as any, height: h, borderRadius: r, backgroundColor: "rgba(201,168,76,0.18)", marginBottom: mb }} /></Pulse>;
}

// Temalı yükleme ekranı — nabız atan arma.
export function LoadingScreen() {
  // Fontlar bu ekran görünürken HENÜZ yüklü değil — bilerek sistem fontu (fontFamily yok) ve emoji yerine düz metin.
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 15, letterSpacing: 6, color: C.gold, textAlign: "center", fontWeight: "600" }}>KRONİKLER</Text>
      <Pulse min={0.35} max={1} dur={900}>
        <Text style={{ fontSize: 12, letterSpacing: 2, color: C.goldDim, marginTop: 16, textAlign: "center" }}>Yükleniyor…  ·  Loading…</Text>
      </Pulse>
    </View>
  );
}

// Havaya uçup sönen hasar/değer sayısı (savaş, kazanç vb.).
export function FloatingNumber({ value, color, left, top }: { value: string; color: string; left: number; top: number }) {
  const ty = useSharedValue(0); const op = useSharedValue(1); const sc = useSharedValue(0.6);
  useEffect(() => {
    ty.value = withTiming(-52, { duration: 900, easing: Easing.out(Easing.quad) });
    op.value = withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 780 }));
    sc.value = withSequence(withTiming(1.15, { duration: 160 }), withTiming(1, { duration: 740 }));
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }, { scale: sc.value }], opacity: op.value }));
  return (
    <Animated.Text pointerEvents="none" style={[{ position: "absolute", left, top, fontFamily: F.display, fontSize: 22, color, textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 6 }, st]}>{value}</Animated.Text>
  );
}

function rnd(a: number, b: number) { return a + Math.random() * (b - a); }

// Yukarı süzülen köz (ocak/şömine hissi).
function Ember({ x, size, dur, delay, color, rise }: { x: number; size: number; dur: number; delay: number; color: string; rise: number }) {
  const ty = useSharedValue(0); const op = useSharedValue(0); const tx = useSharedValue(0);
  useEffect(() => {
    ty.value = withDelay(delay, withRepeat(withTiming(-rise, { duration: dur, easing: Easing.out(Easing.quad) }), -1, false));
    tx.value = withDelay(delay, withRepeat(withSequence(withTiming(rnd(-6, 6), { duration: dur / 2 }), withTiming(rnd(-6, 6), { duration: dur / 2 })), -1, true));
    op.value = withDelay(delay, withRepeat(withSequence(withTiming(0.85, { duration: dur * 0.25 }), withTiming(0, { duration: dur * 0.75 })), -1, false));
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }, { translateX: tx.value }], opacity: op.value }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", bottom: 0, left: x, width: size, height: size, borderRadius: size / 2, backgroundColor: color, shadowColor: color, shadowOpacity: 0.8, shadowRadius: 4 }, st]} />;
}

// Aşağı düşen tanecik (kar / yaprak).
function Flake({ x, size, dur, delay, color, fall, sway, radius }: { x: number; size: number; dur: number; delay: number; color: string; fall: number; sway: number; radius: number }) {
  const ty = useSharedValue(-10); const tx = useSharedValue(0); const op = useSharedValue(0);
  useEffect(() => {
    ty.value = withDelay(delay, withRepeat(withTiming(fall, { duration: dur, easing: Easing.linear }), -1, false));
    tx.value = withDelay(delay, withRepeat(withSequence(withTiming(sway, { duration: dur / 2, easing: Easing.inOut(Easing.sin) }), withTiming(-sway, { duration: dur / 2, easing: Easing.inOut(Easing.sin) })), -1, true));
    op.value = withDelay(delay, withRepeat(withSequence(withTiming(0.7, { duration: dur * 0.2 }), withTiming(0.7, { duration: dur * 0.6 }), withTiming(0, { duration: dur * 0.2 })), -1, false));
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }, { translateX: tx.value }], opacity: op.value }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: x, width: size, height: size, borderRadius: radius, backgroundColor: color }, st]} />;
}

// Hero ambiyansı — daima birkaç köz; mevsime göre kar/yaprak.
export function Ambiance({ season, width = 360, height = 150, embers: showEmbers = true, flakes: showFlakes = true, count = 7 }: { season?: string; width?: number; height?: number; embers?: boolean; flakes?: boolean; count?: number }) {
  const reduced = isReduceMotion(); // sade mod: parçacıklar kapalı (sürekli GPU yok)
  const embers = useMemo(() => (showEmbers && !reduced ? Array.from({ length: count }, () => ({ x: rnd(8, width - 8), size: rnd(2, 4), dur: rnd(2600, 4200), delay: rnd(0, 3000), rise: rnd(height * 0.6, height), color: Math.random() < 0.5 ? "#E0922E" : "#C9A84C" })) : []), [width, height, showEmbers, count, reduced]);
  const isWinter = showFlakes && season === "Kış"; const isAutumn = showFlakes && season === "Sonbahar";
  const flakes = useMemo(() => {
    if (reduced || (!isWinter && !isAutumn)) return [];
    return Array.from({ length: isWinter ? 14 : 9 }, () => ({
      x: rnd(0, width), size: isWinter ? rnd(2, 4) : rnd(4, 7), dur: rnd(4000, 7000), delay: rnd(0, 5000),
      fall: height + 10, sway: rnd(8, 20), radius: isWinter ? 3 : 1.5, color: isWinter ? "rgba(230,235,245,0.9)" : "#B5742A",
    }));
  }, [isWinter, isAutumn, width, height, reduced]);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height, overflow: "hidden" }}>
      {embers.map((e, i) => <Ember key={"e" + i} {...e} />)}
      {flakes.map((f, i) => <Flake key={"f" + i} {...f} />)}
    </View>
  );
}
