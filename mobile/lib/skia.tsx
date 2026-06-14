// Skia tabanlı görsel efektler — gerçek grafik motoru (asset'siz, kod-üretimi).
import { useEffect } from "react";
import { Canvas, Group, Circle, Blur } from "@shopify/react-native-skia";
import { useSharedValue, useDerivedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";

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
