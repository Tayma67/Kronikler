import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { study } from "../../lib/game";
import { C, F } from "../../lib/theme";

export default function Mektep() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>Mektep</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={{ padding: 20 }}>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentDim, marginBottom: 16, lineHeight: 20 }}>
          {p.age < 18 ? "Mektepte çalışmak özellik puanı kazandırır. Çocukluk öğrenme zamanıdır." : "Mektep yılların geride kaldı ama yine de bir şeyler okuyabilirsin."}
        </Text>
        <Pressable onPress={() => apply(study)} disabled={p.dead} style={{ paddingVertical: 16, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.1)", alignItems: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, letterSpacing: 1 }}>📖 DERS ÇALIŞ</Text>
        </Pressable>
      </View>
    </View>
  );
}
