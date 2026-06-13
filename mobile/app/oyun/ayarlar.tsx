import { View, Text, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { C, F } from "../../lib/theme";

export default function Ayarlar() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, resetGame } = useGame();
  const reset = () => Alert.alert("Yeni Hayat", "Mevcut oyun silinsin mi?", [
    { text: "Vazgeç", style: "cancel" },
    { text: "Sil", style: "destructive", onPress: async () => { await resetGame(); router.replace("/yeni-oyun"); } },
  ]);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>Ayarlar</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={{ padding: 20 }}>
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted }}>NESİL</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment, marginTop: 4 }}>{state?.player.generation || 1}. nesil</Text>
        </View>
        <Pressable onPress={reset} style={{ paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(200,64,64,0.4)", backgroundColor: "rgba(200,64,64,0.08)", alignItems: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.blood }}>YENİ HAYAT BAŞLAT</Text>
        </Pressable>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, textAlign: "center", marginTop: 24 }}>Kronikler: Küllerin Mirası · çevrimdışı sürüm</Text>
      </View>
    </View>
  );
}
