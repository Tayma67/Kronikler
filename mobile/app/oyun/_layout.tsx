import { Tabs } from "expo-router";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return <GameIcon name={name} size={22} color={focused ? C.gold : C.parchmentMuted} />;
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
      <Tabs.Screen name="index" options={{ title: "Ana Sayfa", tabBarIcon: ({ focused }) => <TabIcon name="ana" focused={focused} /> }} />
      <Tabs.Screen name="karakter" options={{ title: "Karakter", tabBarIcon: ({ focused }) => <TabIcon name="karakter" focused={focused} /> }} />
      <Tabs.Screen name="iliskiler" options={{ title: "İlişkiler", tabBarIcon: ({ focused }) => <TabIcon name="iliskiler" focused={focused} /> }} />
      <Tabs.Screen name="menu" options={{ title: "Menü", tabBarIcon: ({ focused }) => <TabIcon name="menu" focused={focused} /> }} />
      {/* Gizli (sekmede görünmez ama navigasyonla açılır) */}
      <Tabs.Screen name="pazar" options={{ href: null }} />
      <Tabs.Screen name="sehir" options={{ href: null }} />
      <Tabs.Screen name="meslek" options={{ href: null }} />
      <Tabs.Screen name="firsatlar" options={{ href: null }} />
      <Tabs.Screen name="suc" options={{ href: null }} />
      <Tabs.Screen name="mektep" options={{ href: null }} />
      <Tabs.Screen name="mulkler" options={{ href: null }} />
      <Tabs.Screen name="orgutler" options={{ href: null }} />
      <Tabs.Screen name="sosyal" options={{ href: null }} />
      <Tabs.Screen name="savas" options={{ href: null }} />
      <Tabs.Screen name="haberler" options={{ href: null }} />
      <Tabs.Screen name="hanedan" options={{ href: null }} />
      <Tabs.Screen name="basarimlar" options={{ href: null }} />
      <Tabs.Screen name="tarih" options={{ href: null }} />
      <Tabs.Screen name="ayarlar" options={{ href: null }} />
      <Tabs.Screen name="roman" options={{ href: null }} />
      <Tabs.Screen name="npc/[id]" options={{ href: null }} />
    </Tabs>
  );
}
