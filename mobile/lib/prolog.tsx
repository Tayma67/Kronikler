// Sinematik prolog sahne resimleri — dış görsel yok: SVG silüet + paralaks + ışık katmanları.
// Her sahne kendi tablosunu çizer; sade modda paralaks durur, tablo sabit kalır (pil dostu).
import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect, Path, Circle } from "react-native-svg";
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import { Pulse } from "./fx";

const VB = "0 0 360 780"; // tüm sahneler aynı tuvalde; alt kenara çapalı kırpma
const AR = "xMidYMax slice";

// Paralaks katmanı: sahne süresince tek yönlü yavaş kayma (kenar açığı görünmesin diye taşırılmış kadraj).
function Drift({ children, from, to, dur, reduced }: { children: React.ReactNode; from: number; to: number; dur: number; reduced: boolean }) {
  const tx = useSharedValue(reduced ? 0 : from);
  useEffect(() => {
    if (reduced) return;
    tx.value = from;
    tx.value = withTiming(to, { duration: dur, easing: Easing.out(Easing.quad) });
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -18, right: -18, top: 0, bottom: 0 }, st]}>{children}</Animated.View>;
}

// Başlık kartı: karanlıkta yavaş açan altın ışık çiçeği.
function TitleGlow() {
  return (
    <Animated.View pointerEvents="none" entering={FadeIn.duration(2200)} style={StyleSheet.absoluteFill}>
      <Svg viewBox={VB} preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <Defs>
          <RadialGradient id="tg" cx="50%" cy="46%" rx="46%" ry="30%">
            <Stop offset="0" stopColor="#C9A84C" stopOpacity="0.22" />
            <Stop offset="0.65" stopColor="#C9A84C" stopOpacity="0.07" />
            <Stop offset="1" stopColor="#C9A84C" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="360" height="780" fill="url(#tg)" />
      </Svg>
    </Animated.View>
  );
}

// Sahne 1 — Bozkır şafağı: gün doğumu ışıması, iki katman tepe, surlu şehir silüeti (kule + kubbe + minare).
function DawnScene({ reduced }: { reduced: boolean }) {
  return (
    <>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox={VB} preserveAspectRatio={AR} width="100%" height="100%">
        <Defs>
          <RadialGradient id="dawn" cx="50%" cy="76%" rx="58%" ry="34%">
            <Stop offset="0" stopColor="#E0922E" stopOpacity="0.30" />
            <Stop offset="0.55" stopColor="#C9A84C" stopOpacity="0.12" />
            <Stop offset="1" stopColor="#C9A84C" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="360" height="780" fill="url(#dawn)" />
      </Svg>
      <Drift from={0} to={9} dur={9500} reduced={reduced}>
        <Svg viewBox={VB} preserveAspectRatio={AR} width="100%" height="100%">
          <Path d="M0 596 Q 55 556 120 584 Q 175 606 235 574 Q 295 548 360 588 L360 780 L0 780 Z" fill="rgba(18,13,7,0.88)" />
        </Svg>
      </Drift>
      <Drift from={0} to={-14} dur={9500} reduced={reduced}>
        <Svg viewBox={VB} preserveAspectRatio={AR} width="100%" height="100%">
          <Path d="M0 668 Q 90 640 180 660 Q 270 678 360 656 L360 780 L0 780 Z" fill="rgba(8,5,3,0.97)" />
          <Path d="M222 664 L222 614 L234 614 L234 602 L241 602 L241 614 L253 614 L253 664 Z" fill="rgba(8,5,3,0.97)" />
          <Path d="M259 664 L259 634 Q 274 616 289 634 L289 664 Z" fill="rgba(8,5,3,0.97)" />
          <Path d="M298 664 L298 588 L304 588 L304 664 Z" fill="rgba(8,5,3,0.97)" />
          <Path d="M295 588 L307 588 L301 574 Z" fill="rgba(8,5,3,0.97)" />
          <Path d="M160 664 L160 640 L214 640 L214 664 Z" fill="rgba(8,5,3,0.97)" />
        </Svg>
      </Drift>
    </>
  );
}

// Sahne 2 — Kış gecesi: ay ve halesi, köy damları, nabız gibi titreyen tek sıcak pencere.
function VillageNight({ reduced }: { reduced: boolean }) {
  return (
    <>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox={VB} preserveAspectRatio={AR} width="100%" height="100%">
        <Defs>
          <RadialGradient id="moon" cx="74%" cy="20%" rx="26%" ry="14%">
            <Stop offset="0" stopColor="#E6EBF5" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#E6EBF5" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="360" height="780" fill="url(#moon)" />
        <Circle cx="266" cy="156" r="22" fill="rgba(230,235,245,0.82)" />
        <Circle cx="258" cy="150" r="20" fill="rgba(10,7,4,0.55)" />
      </Svg>
      <Drift from={0} to={-8} dur={9500} reduced={reduced}>
        <Svg viewBox={VB} preserveAspectRatio={AR} width="100%" height="100%">
          <Path d="M0 780 L0 664 L34 664 L48 644 L62 664 L96 664 L96 640 L124 622 L152 640 L152 664 L196 664 L208 648 L220 664 L262 664 L262 644 L286 628 L310 644 L310 664 L360 664 L360 780 Z" fill="rgba(8,5,3,0.97)" />
        </Svg>
      </Drift>
      <Pulse min={0.65} max={1} dur={1500}>
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox={VB} preserveAspectRatio={AR} width="100%" height="100%">
          <Defs>
            <RadialGradient id="win" cx="37%" cy="83%" rx="14%" ry="8%">
              <Stop offset="0" stopColor="#E0BC5A" stopOpacity="0.30" />
              <Stop offset="1" stopColor="#E0BC5A" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="360" height="780" fill="url(#win)" />
          <Rect x="129" y="638" width="10" height="13" rx="1.5" fill="#E0BC5A" />
        </Svg>
      </Pulse>
    </>
  );
}

// Sahne 3 — Kader yolu: ufka kavuşan yol, üstünde taş kapı kemeri, ufukta köz ışıması.
function DestinyRoad({ reduced }: { reduced: boolean }) {
  return (
    <>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox={VB} preserveAspectRatio={AR} width="100%" height="100%">
        <Defs>
          <RadialGradient id="hor" cx="50%" cy="76%" rx="40%" ry="20%">
            <Stop offset="0" stopColor="#E05A30" stopOpacity="0.26" />
            <Stop offset="0.6" stopColor="#C9A84C" stopOpacity="0.10" />
            <Stop offset="1" stopColor="#C9A84C" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="360" height="780" fill="url(#hor)" />
        <Path d="M0 618 Q 90 594 180 606 Q 270 618 360 600 L360 780 L0 780 Z" fill="rgba(12,8,5,0.92)" />
      </Svg>
      <Drift from={0} to={-6} dur={9500} reduced={reduced}>
        <Svg viewBox={VB} preserveAspectRatio={AR} width="100%" height="100%">
          <Path d="M150 780 L176 604 L184 604 L210 780 Z" fill="rgba(201,168,76,0.10)" />
          <Path d="M150 780 L176 604" stroke="rgba(201,168,76,0.30)" strokeWidth="2" fill="none" />
          <Path d="M210 780 L184 604" stroke="rgba(201,168,76,0.30)" strokeWidth="2" fill="none" />
          <Path d="M142 692 L142 602 Q 180 556 218 602 L218 692" stroke="rgba(201,168,76,0.55)" strokeWidth="3" fill="none" />
          <Path d="M136 692 L148 692 M212 692 L224 692" stroke="rgba(201,168,76,0.45)" strokeWidth="4" fill="none" />
        </Svg>
      </Drift>
    </>
  );
}

// Sahne seçici: vuruşa göre tablo; sahneler arası erime geçişi.
export function SceneArt({ beat, reduced }: { beat: number; reduced: boolean }) {
  return (
    <Animated.View key={"scene" + beat} pointerEvents="none" entering={FadeIn.duration(850)} exiting={FadeOut.duration(350)} style={StyleSheet.absoluteFill}>
      {beat === 0 ? <TitleGlow /> : beat === 1 ? <DawnScene reduced={reduced} /> : beat === 2 ? <VillageNight reduced={reduced} /> : <DestinyRoad reduced={reduced} />}
    </Animated.View>
  );
}

// Sinema vinyeti: kenarları karartan sabit mercek etkisi (tüm sahnelerin üstünde).
export function Vignette() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg viewBox={VB} preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <Defs>
          <RadialGradient id="vig" cx="50%" cy="46%" rx="72%" ry="54%">
            <Stop offset="0.55" stopColor="#060402" stopOpacity="0" />
            <Stop offset="1" stopColor="#060402" stopOpacity="0.62" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="360" height="780" fill="url(#vig)" />
      </Svg>
    </View>
  );
}
