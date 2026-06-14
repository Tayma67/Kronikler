// Skia tabanlı görsel efektler — gerçek grafik motoru (asset'siz, kod-üretimi).
import { useEffect, useMemo } from "react";
import { Canvas, Group, Circle, Blur } from "@shopify/react-native-skia";
import { useSharedValue, useDerivedValue, withRepeat, withTiming, Easing, SharedValue } from "react-native-reanimated";

function rnd(a: number, b: number) { return a + Math.random() * (b - a); }

// Sıcak ateş ışığı — hero altında titreşen altın/turuncu parıltı.
export function Firelight({ width, height }: { width: number; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2300, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const cy = useDerivedValue(() => height * 0.78 - t.value * 16);
  const r1 = useDerivedValue(() => 70 + t.value * 22);
  const r2 = useDerivedValue(() => 64 + (1 - t.value) * 22);
  const op = useDerivedValue(() => 0.16 + t.value * 0.14);
  return (
    <Canvas style={{ position: "absolute", left: 0, top: 0, width, height }} pointerEvents="none">
      <Group opacity={op}>
        <Circle cx={width * 0.22} cy={cy} r={r1} color="#E0922E"><Blur blur={32} /></Circle>
        <Circle cx={width * 0.78} cy={cy} r={r2} color="#C9A84C"><Blur blur={36} /></Circle>
        <Circle cx={width * 0.5} cy={cy} r={r1} color="#E05A30"><Blur blur={40} /></Circle>
      </Group>
    </Canvas>
  );
}

// Parlayan amblem — dönüm noktası ikonu arkasında nabız atan ışıma.
export function GlowPulse({ size = 90, color = "#C9A84C" }: { size?: number; color?: string }) {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }), -1, true); }, []);
  const r = useDerivedValue(() => size * 0.26 + t.value * size * 0.16);
  const op = useDerivedValue(() => 0.3 + t.value * 0.4);
  return (
    <Canvas style={{ position: "absolute", width: size, height: size }} pointerEvents="none">
      <Group opacity={op}>
        <Circle cx={size / 2} cy={size / 2} r={r} color={color}><Blur blur={16} /></Circle>
      </Group>
    </Canvas>
  );
}

function Coin({ x, drift, size, delay, p, h }: { x: number; drift: number; size: number; delay: number; p: SharedValue<number>; h: number }) {
  const prog = useDerivedValue(() => Math.max(0, Math.min(1, (p.value - delay) / (1 - delay))));
  const cy = useDerivedValue(() => -20 + prog.value * (h + 40));
  const cx = useDerivedValue(() => x + Math.sin(prog.value * 7 + delay * 12) * drift);
  const op = useDerivedValue(() => (p.value <= 0 || p.value >= 1) ? 0 : (prog.value < 0.85 ? 0.95 : (1 - prog.value) / 0.15 * 0.95));
  return (
    <Group opacity={op}>
      <Circle cx={cx} cy={cy} r={size} color="#F0C040"><Blur blur={1.5} /></Circle>
      <Circle cx={cx} cy={cy} r={size * 0.5} color="#FFF1B8" />
    </Group>
  );
}

// Altın sikke yağmuru — kazanç/ödül anında ekrana akar. `shoot` artınca bir kez oynar.
export function CoinShower({ shoot, width, height }: { shoot: number; width: number; height: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (shoot > 0) { p.value = 0; p.value = withTiming(1, { duration: 1500, easing: Easing.in(Easing.quad) }); }
  }, [shoot]);
  const coins = useMemo(() => Array.from({ length: 20 }, () => ({ x: rnd(10, width - 10), drift: rnd(-26, 26), size: rnd(6, 11), delay: rnd(0, 0.45) })), [width]);
  if (shoot <= 0) return null;
  return (
    <Canvas style={{ position: "absolute", left: 0, top: 0, width, height }} pointerEvents="none">
      {coins.map((c, i) => <Coin key={i} {...c} p={p} h={height} />)}
    </Canvas>
  );
}
