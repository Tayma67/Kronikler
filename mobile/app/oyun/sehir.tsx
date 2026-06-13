import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { travelTo, LOCATIONS } from "../../lib/game";
import { C, F } from "../../lib/theme";

export default function Sehir() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const here = state.player.location_name;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>Diyar</Text>
        <View style={{ width: 40 }} />
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 8 }}>Küllerin diyarındaki yerleşimler. Gitmek dokun.</Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {LOCATIONS.map((loc) => {
          const cur = loc === here;
          return (
            <Pressable key={loc} onPress={() => apply((s) => travelTo(s, loc))} disabled={cur} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: cur ? "rgba(201,168,76,0.5)" : C.border, borderRadius: 10, padding: 14, marginBottom: 8 }}>
              <Text style={{ fontSize: 20 }}>🏰</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 14, color: cur ? C.gold : C.parchment }}>{loc}</Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{cur ? "Şu an buradasın" : "Yerleşim"}</Text>
              </View>
              {!cur && <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>GİT ›</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
