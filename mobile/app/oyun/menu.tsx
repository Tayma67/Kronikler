import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";

type Item = { to: string; icon: string; label: string };
const SECTIONS: { title: string; items: Item[] }[] = [
  { title: "Geçim", items: [
    { to: "/oyun/meslek", icon: "meslek", label: "Meslek" },
    { to: "/oyun/pazar", icon: "pazar", label: "Pazar" },
    { to: "/oyun/atolye", icon: "meslek", label: "Atölye" },
    { to: "/oyun/mulkler", icon: "mulkler", label: "Mülkler" },
    { to: "/oyun/firsatlar", icon: "firsatlar", label: "Fırsatlar" },
    { to: "/oyun/mektep", icon: "mektep", label: "Mektep" },
    { to: "/oyun/beceriler", icon: "karakter", label: "Beceri Ağacı" },
  ]},
  { title: "Güç & Mevki", items: [
    { to: "/oyun/orgutler", icon: "orgutler", label: "Örgütler / Loncalar" },
    { to: "/oyun/sosyal", icon: "sosyal", label: "Mevki & İtibar" },
    { to: "/oyun/savas", icon: "savas", label: "Çatışma" },
    { to: "/oyun/suc", icon: "suc", label: "Gölge İşleri" },
  ]},
  { title: "Diyar & Soy", items: [
    { to: "/oyun/sehir", icon: "sehir", label: "Şehir / Diyar" },
    { to: "/oyun/haberler", icon: "haberler", label: "Diyardan Haberler" },
    { to: "/oyun/hanedan", icon: "hanedan", label: "Hanedan" },
    { to: "/oyun/nesil", icon: "dogum", label: "Nesil & Vâris" },
  ]},
  { title: "Kayıt & Anı", items: [
    { to: "/oyun/hikayeler", icon: "roman", label: "Hikâyelerim" },
    { to: "/oyun/basarimlar", icon: "zafer", label: "Başarımlar" },
    { to: "/oyun/tarih", icon: "tarih", label: "Kronik" },
    { to: "/oyun/roman", icon: "roman", label: "Hayatın Romanı" },
    { to: "/oyun/ayarlar", icon: "ayarlar", label: "Ayarlar" },
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
              <View style={{ width: 24, alignItems: "center" }}><GameIcon name={m.icon} size={20} /></View>
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
