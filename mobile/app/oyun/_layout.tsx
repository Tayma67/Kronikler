import { Tabs } from "expo-router";
import { View, Pressable } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { useEffect } from "react";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { useI18n } from "../../lib/i18n";
import { useGame } from "../../lib/store";
import { StatDeltaOverlay } from "../../lib/feel";
import { Ambiance } from "../../lib/fx";
import { hap } from "../../lib/haptics";
import { isReduceMotion } from "../../lib/perf";
import { playAdvance } from "../../lib/sound";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return <GameIcon name={name} size={22} color={focused ? C.gold : C.parchmentMuted} />;
}

// Nav ortasında yükseltilmiş yuvarlak "Ayı İlerle" düğmesi (Karakter ↔ İlişkiler arası).
function AdvanceFab({ bottom }: { bottom: number }) {
  const { state, doAdvance, mpMode } = useGame();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (isReduceMotion()) return; // sade mod: düğme nabzı + tozu kapalı
    pulse.value = withRepeat(withSequence(
      withTiming(1.06, { duration: 1050, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 1050, easing: Easing.inOut(Easing.quad) }),
    ), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  if (!state || state.player.dead || mpMode) return null; // MP'de zamanı sunucu ilerletir — sahte tuş gösterme (doAdvance no-op)
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: bottom + 16, alignItems: "center" }}>
      <View style={{ width: 100, height: 92, alignItems: "center", justifyContent: "flex-end" }}>
        {/* Hero'dan taşınan altın toz — düğmeden yükselir */}
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
          <Ambiance width={100} height={92} flakes={false} count={6} />
        </View>
        <Animated.View style={style}>
          <Pressable
            onPress={() => { hap("advance"); playAdvance(); doAdvance(1); }}
            style={{
              width: 60, height: 60, borderRadius: 30, backgroundColor: C.gold,
              alignItems: "center", justifyContent: "center",
              borderWidth: 3, borderColor: "rgba(13,10,6,0.98)",
              shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 9,
            }}
          >
            <GameIcon name="ilerle" size={26} color="#1a1206" />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// Navbar üst kenarına oymalı altın çerçeve (Osmanlı/parşömen motifi).
function NavOrnament({ bottom }: { bottom: number }) {
  const Diamond = ({ s = 6 }: { s?: number }) => (
    <View style={{ width: s, height: s, backgroundColor: C.gold, transform: [{ rotate: "45deg" }], opacity: 0.7 }} />
  );
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: bottom - 7, height: 14, justifyContent: "center" }}>
      {/* çift altın hat */}
      <View style={{ position: "absolute", left: 10, right: 10, bottom: 4, height: 1.5, backgroundColor: C.gold, opacity: 0.5 }} />
      <View style={{ position: "absolute", left: 24, right: 24, bottom: 7, height: 1, backgroundColor: C.goldDim, opacity: 0.3 }} />
      {/* yan elmas motifleri (orta FAB için boşluk) */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 26 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><Diamond s={5} /><Diamond /></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><Diamond /><Diamond s={5} /></View>
      </View>
    </View>
  );
}

// Tüm ekranların üstüne biner: tepede sıcak ışık huzmesi + kenarlarda vinyet.
// Siyah zemine derinlik katar; dokunuşları geçirir (pointerEvents none).
function GlobalBackdrop({ bottom }: { bottom: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom }}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="bgGlow" cx="50%" cy="13%" rx="78%" ry="55%">
            <Stop offset="0" stopColor="#E0922E" stopOpacity={0.10} />
            <Stop offset="0.5" stopColor="#C9A84C" stopOpacity={0.03} />
            <Stop offset="1" stopColor="#0D0A06" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="bgVignette" cx="50%" cy="40%" rx="76%" ry="64%">
            <Stop offset="0.55" stopColor="#000000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.34} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bgGlow)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bgVignette)" />
      </Svg>
    </View>
  );
}

export default function OyunLayout() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <Tabs screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "rgba(9,6,3,0.99)", borderTopWidth: 1.5, borderTopColor: "rgba(201,168,76,0.4)", height: 60 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 10, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: -3 }, elevation: 14 },
        tabBarActiveTintColor: C.gold,
        tabBarInactiveTintColor: C.parchmentMuted,
        tabBarLabelStyle: { fontFamily: F.display, fontSize: 9, letterSpacing: 0.5 },
      }}>
        <Tabs.Screen name="index" options={{ title: t("tab.home"), tabBarIcon: ({ focused }) => <TabIcon name="ana" focused={focused} /> }} />
        <Tabs.Screen name="karakter" options={{ title: t("tab.character"), tabBarIcon: ({ focused }) => <TabIcon name="karakter" focused={focused} /> }} />
        <Tabs.Screen name="iliskiler" options={{ title: t("tab.relations"), tabBarIcon: ({ focused }) => <TabIcon name="iliskiler" focused={focused} /> }} />
        <Tabs.Screen name="menu" options={{ title: t("tab.menu"), tabBarIcon: ({ focused }) => <TabIcon name="menu" focused={focused} /> }} />
        {/* Gizli (sekmede görünmez ama navigasyonla açılır) */}
        <Tabs.Screen name="pazar" options={{ href: null }} />
        <Tabs.Screen name="sss" options={{ href: null }} />
        <Tabs.Screen name="sehir" options={{ href: null }} />
        <Tabs.Screen name="meslek" options={{ href: null }} />
        <Tabs.Screen name="suc" options={{ href: null }} />
        <Tabs.Screen name="mektep" options={{ href: null }} />
        <Tabs.Screen name="mulkler" options={{ href: null }} />
        <Tabs.Screen name="orgutler" options={{ href: null }} />
        <Tabs.Screen name="sosyal" options={{ href: null }} />
        <Tabs.Screen name="savas" options={{ href: null }} />
        <Tabs.Screen name="haberler" options={{ href: null }} />
        <Tabs.Screen name="hanedan" options={{ href: null }} />
        <Tabs.Screen name="basarimlar" options={{ href: null }} />
        <Tabs.Screen name="beceriler" options={{ href: null }} />
        <Tabs.Screen name="hikayeler" options={{ href: null }} />
        <Tabs.Screen name="nesil" options={{ href: null }} />
        <Tabs.Screen name="atolye" options={{ href: null }} />
        <Tabs.Screen name="diyar/[name]" options={{ href: null }} />
        <Tabs.Screen name="harita" options={{ href: null }} />
        <Tabs.Screen name="gorevler" options={{ href: null }} />
        <Tabs.Screen name="tarih" options={{ href: null }} />
        <Tabs.Screen name="ayarlar" options={{ href: null }} />
        <Tabs.Screen name="roman" options={{ href: null }} />
        <Tabs.Screen name="npc/[id]" options={{ href: null }} />
        <Tabs.Screen name="copcatan" options={{ href: null }} />
      </Tabs>
      <GlobalBackdrop bottom={60 + insets.bottom} />
      <NavOrnament bottom={60 + insets.bottom} />
      <AdvanceFab bottom={insets.bottom} />
      <StatDeltaOverlay />
    </View>
  );
}
