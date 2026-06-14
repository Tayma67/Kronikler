import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { buyProperty, PROPERTY_TYPES } from "../../lib/game";
import { C, F } from "../../lib/theme";
import { BackLabel } from "../../lib/ui";

export default function Mulkler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const income = p.properties.reduce((a, t) => a + (PROPERTY_TYPES[t]?.income || 0), 0);
  const counts: Record<string, number> = {}; p.properties.forEach((t) => counts[t] = (counts[t] || 0) + 1);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>Mülkler</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 8 }}>
        Aylık gelir: {income} ⚜ · Adına yazılı her tapu, çocuklarına kalır.
      </Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {Object.entries(PROPERTY_TYPES).map(([id, t]) => (
          <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 8 }}>
            <Text style={{ fontSize: 22 }}>{t.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{t.name} {counts[id] ? `×${counts[id]}` : ""}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>Gelir: {t.income} ⚜/ay</Text>
            </View>
            <Pressable onPress={() => apply((s) => buyProperty(s, id))} disabled={p.money < t.cost} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: p.money < t.cost ? C.card : "rgba(201,168,76,0.12)" }}>
              <Text style={{ fontFamily: F.display, fontSize: 11, color: p.money < t.cost ? C.parchmentMuted : C.gold }}>AL {t.cost}⚜</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
