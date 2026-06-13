import { Tabs } from "expo-router";
import { Text } from "react-native";
import { C, F } from "../../lib/theme";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{label}</Text>;
}

export default function OyunLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: "rgba(13,10,6,0.98)", borderTopColor: C.borderHi, height: 64, paddingBottom: 8, paddingTop: 6 },
      tabBarActiveTintColor: C.gold,
      tabBarInactiveTintColor: C.parchmentMuted,
      tabBarLabelStyle: { fontFamily: F.display, fontSize: 9, letterSpacing: 0.5 },
    }}>
      <Tabs.Screen name="index" options={{ title: "Ana Sayfa", tabBarIcon: ({ focused }) => <TabIcon label="🔥" focused={focused} /> }} />
      <Tabs.Screen name="karakter" options={{ title: "Karakter", tabBarIcon: ({ focused }) => <TabIcon label="🛡" focused={focused} /> }} />
      <Tabs.Screen name="iliskiler" options={{ title: "İlişkiler", tabBarIcon: ({ focused }) => <TabIcon label="🫂" focused={focused} /> }} />
      <Tabs.Screen name="menu" options={{ title: "Menü", tabBarIcon: ({ focused }) => <TabIcon label="📜" focused={focused} /> }} />
      {/* Gizli (sekmede görünmez ama navigasyonla açılır) */}
      <Tabs.Screen name="pazar" options={{ href: null }} />
      <Tabs.Screen name="npc/[id]" options={{ href: null }} />
    </Tabs>
  );
}
