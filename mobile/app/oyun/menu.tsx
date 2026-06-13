import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { C, F } from "../../lib/theme";

type Item = { to: string; icon: string; label: string };
const SECTIONS: { title: string; items: Item[] }[] = [
  { title: "Geçim", items: [
    { to: "/oyun/meslek", icon: "⚒", label: "Meslek" },
    { to: "/oyun/pazar", icon: "⚖️", label: "Pazar" },
    { to: "/oyun/mulkler", icon: "🏰", label: "Mülkler" },
    { to: "/oyun/firsatlar", icon: "🧭", label: "Fırsatlar" },
    { to: "/oyun/mektep", icon: "🎓", label: "Mektep" },
  ]},
  { title: "Güç & Mevki", items: [
    { to: "/oyun/orgutler", icon: "⚜", label: "Örgütler / Loncalar" },
    { to: "/oyun/sosyal", icon: "🕊", label: "Mevki & İtibar" },
    { to: "/oyun/savas", icon: "⚔", label: "Çatışma" },
    { to: "/oyun/suc", icon: "🌒", label: "Gölge İşleri" },
  ]},
  { title: "Diyar & Soy", items: [
    { to: "/oyun/sehir", icon: "🏯", label: "Şehir / Diyar" },
    { to: "/oyun/haberler", icon: "📜", label: "Diyardan Haberler" },
    { to: "/oyun/hanedan", icon: "🏛", label: "Hanedan" },
  ]},
  { title: "Kayıt & Anı", items: [
    { to: "/oyun/tarih", icon: "🗞", label: "Kronik" },
    { to: "/oyun/roman", icon: "📖", label: "Hayatın Romanı" },
    { to: "/oyun/ayarlar", icon: "⚙️", label: "Ayarlar" },
  ]},
];

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
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 }}>
      <Text style={{ fontFamily: F.display, fontSize: 22, color: C.parchment, letterSpacing: 1, marginBottom: 4 }}>Menü</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, marginBottom: 14 }}>Kül & Köz · çevrimdışı sürüm</Text>

      {SECTIONS.map((sec) => (
        <View key={sec.title} style={{ marginBottom: 6 }}>
          <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginTop: 12, marginBottom: 8 }}>{sec.title}</Text>
          {sec.items.map((m) => (
            <Pressable key={m.to} onPress={() => router.push(m.to as any)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, marginBottom: 8 }}>
              <Text style={{ fontSize: 17, width: 22, textAlign: "center" }}>{m.icon}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.parchment }}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
      ))}

      <View style={{ height: 12 }} />
      <Pressable onPress={confirmReset} style={{ paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(200,64,64,0.4)", backgroundColor: "rgba(200,64,64,0.08)", alignItems: "center" }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.blood }}>YENİ HAYAT BAŞLAT</Text>
      </Pressable>
    </ScrollView>
  );
}
