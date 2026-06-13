import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGame } from "../../../lib/store";
import { npcsOf, talkTo, giftTo } from "../../../lib/game";
import { ITEMS } from "../../../lib/world";
import { C, F } from "../../../lib/theme";

export default function NpcDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, apply } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const npc = npcsOf(state).find((n) => n.id === id);
  if (!npc) return <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 40 }}><Text style={{ color: C.parchmentMuted, textAlign: "center" }}>Kişi bulunamadı.</Text></View>;
  const v = state.relationships[npc.id] || 0;
  const giftables = Object.keys(state.player.inventory).filter((k) => state.player.inventory[k] > 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12 }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
        <Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text>
      </Pressable>
      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#2a1c0c", borderWidth: 2, borderColor: C.gold, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 34 }}>{npc.gender === "kadın" ? "👩" : "🧔"}</Text>
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 18, color: C.parchment, marginTop: 10 }}>{npc.name}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.gold }}>{npc.profession} · {npc.age} yaş</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentDim, marginTop: 6 }}>İlişki: {v}/100</Text>
      </View>

      <Pressable onPress={() => apply((s) => talkTo(s, npc))} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.borderHi, borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ fontSize: 18 }}>💬</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, letterSpacing: 0.5 }}>Sohbet Et</Text>
      </Pressable>

      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 6, marginBottom: 6 }}>HEDİYE VER</Text>
      {giftables.length === 0 ? (
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted }}>Verecek bir şeyin yok. Pazardan al.</Text>
      ) : giftables.map((k) => (
        <Pressable key={k} onPress={() => apply((s) => giftTo(s, npc, k))} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 11, marginBottom: 7 }}>
          <Text style={{ fontSize: 16 }}>{ITEMS[k]?.icon || "📦"}</Text>
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{ITEMS[k]?.name || k}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentMuted }}>×{state.player.inventory[k]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
