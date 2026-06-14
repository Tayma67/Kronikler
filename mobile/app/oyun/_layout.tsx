import { Tabs } from "expo-router";
import { View, Pressable } from "react-native";
import { useEffect } from "react";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { useI18n } from "../../lib/i18n";
import { useGame } from "../../lib/store";
import { hap } from "../../lib/haptics";
import { playAdvance } from "../../lib/sound";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return <GameIcon name={name} size={22} color={focused ? C.gold : C.parchmentMuted} />;
}

// Nav ortasında yükseltilmiş yuvarlak "Ayı İlerle" düğmesi (Karakter ↔ İlişkiler arası).
function AdvanceFab({ bottom }: { bottom: number }) {
  const { state, doAdvance } = useGame();
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(
      withTiming(1.06, { duration: 1050, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 1050, easing: Easing.inOut(Easing.quad) }),
    ), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  if (!state || state.player.dead) return null;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: bottom + 16, alignItems: "center" }}>
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
  );
}

export default function OyunLayout() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <Tabs screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "rgba(13,10,6,0.98)", borderTopColor: C.borderHi, height: 60 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 6 },
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
      </Tabs>
      <AdvanceFab bottom={insets.bottom} />
    </View>
  );
}
