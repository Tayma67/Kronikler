import { View, Text, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { C, F } from "../../lib/theme";

export default function Menu() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { resetGame } = useGame();
  const confirmReset = () => {
    Alert.alert("Yeni Hayat", "Mevcut oyun silinsin mi?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil ve Başla", style: "destructive", onPress: async () => { await resetGame(); router.replace("/yeni-oyun"); } },
    ]);
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 20, paddingTop: insets.top + 16 }}>
      <Text style={{ fontFamily: F.display, fontSize: 22, color: C.parchment, letterSpacing: 1, marginBottom: 4 }}>Menü</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, marginBottom: 20 }}>Kül & Köz · çevrimdışı sürüm</Text>

      {[
        { to: "/oyun/sehir", icon: "🏰", label: "Şehir / Diyar" },
        { to: "/oyun/pazar", icon: "⚖️", label: "Pazar" },
        { to: "/oyun/meslek", icon: "⚒", label: "Meslek" },
        { to: "/oyun/firsatlar", icon: "🧭", label: "Fırsatlar" },
        { to: "/oyun/mektep", icon: "🎓", label: "Mektep" },
        { to: "/oyun/suc", icon: "🌒", label: "Gölge İşleri" },
        { to: "/oyun/roman", icon: "📖", label: "Hayatın Romanı" },
      ].map((m) => (
        <Pressable key={m.to} onPress={() => router.push(m.to as any)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, marginBottom: 10 }}>
          <Text style={{ fontSize: 18 }}>{m.icon}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.parchment }}>{m.label}</Text>
        </Pressable>
      ))}

      <View style={{ height: 16 }} />
      <Pressable onPress={confirmReset} style={{ paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(200,64,64,0.4)", backgroundColor: "rgba(200,64,64,0.08)", alignItems: "center" }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.blood }}>YENİ HAYAT BAŞLAT</Text>
      </Pressable>
    </View>
  );
}
