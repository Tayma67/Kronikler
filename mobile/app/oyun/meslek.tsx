import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { changeProfession, ALL_PROFS } from "../../lib/game";
import { C, F } from "../../lib/theme";

const ICON: Record<string, string> = { çiftçi:"🌾", demirci:"⚒", tüccar:"⚖", balıkçı:"🎣", avcı:"🏹", marangoz:"🪚", çoban:"🐑", fırıncı:"🍞", asker:"⚔", müzisyen:"🎶" };

export default function Meslek() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  if (p.age < 13) {
    return <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 16, padding: 20 }}>
      <Pressable onPress={() => router.back()}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
      <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, marginTop: 30, textAlign: "center" }}>Meslek edinmek için reşit olmalısın (13 yaş).</Text>
    </View>;
  }
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>Meslek</Text>
        <View style={{ width: 40 }} />
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 8 }}>
        Şu an: {p.profession === "işsiz" ? "İşsiz" : p.profession}. Bir zanaata geç.
      </Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {ALL_PROFS.map((prof) => {
          const cur = prof === p.profession;
          return (
            <Pressable key={prof} onPress={() => apply((s) => changeProfession(s, prof))} disabled={cur} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: cur ? "rgba(201,168,76,0.5)" : C.border, borderRadius: 10, padding: 14, marginBottom: 8 }}>
              <Text style={{ fontSize: 20 }}>{ICON[prof] || "⚒"}</Text>
              <Text style={{ flex: 1, fontFamily: F.display, fontSize: 14, color: cur ? C.gold : C.parchment, textTransform: "capitalize" }}>{prof}</Text>
              {cur ? <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.gold }}>mevcut</Text> : <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>GEÇ ›</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
