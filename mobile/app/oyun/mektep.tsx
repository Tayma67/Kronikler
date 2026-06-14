import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { SUBJECTS, studySubject } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { BackLabel } from "../../lib/ui";

export default function Mektep() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>Mektep</Text>
        <View style={{ width: 40 }} />
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentDim, paddingHorizontal: 16, marginBottom: 12, lineHeight: 20 }}>
        {p.age < 18 ? "Bir ders seç ve çalış. Çocukluk, öğrenmenin en bereketli çağıdır." : "Mektep yılları geçti ama ilim her yaşta makbuldür."}
      </Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {SUBJECTS.map((sub) => (
          <Pressable key={sub.id} onPress={() => apply((s) => studySubject(s, sub.id))} disabled={p.dead} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 9 }}>
            <GameIcon name={sub.icon} size={20} color={C.gold} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{sub.name}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{sub.desc}</Text>
            </View>
            <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>ÇALIŞ ›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
