import { View, Text, Pressable, Alert, Switch } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { isSoundEnabled, setSoundEnabled, playTap } from "../../lib/sound";
import { C, F } from "../../lib/theme";

export default function Ayarlar() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, resetGame } = useGame();
  const [sound, setSound] = useState(isSoundEnabled());
  const toggleSound = async (v: boolean) => { setSound(v); await setSoundEnabled(v); if (v) playTap(); };
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
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.parchment }}>SESLER</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>İnce dokunma ve ay sesleri</Text>
          </View>
          <Switch value={sound} onValueChange={toggleSound} trackColor={{ false: "#3a2f1c", true: "rgba(201,168,76,0.6)" }} thumbColor={sound ? C.gold : "#8a7a55"} />
        </View>
        <Pressable onPress={reset} style={{ paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(200,64,64,0.4)", backgroundColor: "rgba(200,64,64,0.08)", alignItems: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.blood }}>YENİ HAYAT BAŞLAT</Text>
        </Pressable>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, textAlign: "center", marginTop: 24 }}>Kronikler: Küllerin Mirası · çevrimdışı sürüm</Text>
      </View>
    </View>
  );
}
