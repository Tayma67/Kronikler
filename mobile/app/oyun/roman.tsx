import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { WEEKS_PER_YEAR } from "../../lib/calendar";
import { C, F } from "../../lib/theme";

const BANDS = [
  { name: "Çocukluk", lo: 7, hi: 12 },
  { name: "Ergenlik", lo: 13, hi: 17 },
  { name: "Gençlik", lo: 18, hi: 24 },
  { name: "Yetişkinlik", lo: 25, hi: 32 },
  { name: "Olgunluk", lo: 33, hi: 45 },
  { name: "Yaşlılık", lo: 46, hi: 59 },
  { name: "İhtiyarlık", lo: 60, hi: 200 },
];

export default function Roman() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const base = state.player.base_age;
  const ageOf = (day: number) => base + Math.floor(day / WEEKS_PER_YEAR);
  const bandOf = (age: number) => BANDS.find((b) => age >= b.lo && age <= b.hi) || BANDS[BANDS.length - 1];

  // Bölümlere göre grupla (dünya gürültüsü değil; kişisel + dönüm noktaları)
  const chapters = BANDS.map((b) => ({
    band: b,
    events: state.history.filter((e) => { const a = ageOf(e.day); return a >= b.lo && a <= b.hi && e.scope === "kişisel"; }),
  })).filter((c) => c.events.length > 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 60 }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 10 }}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 4, color: C.goldDim, textAlign: "center" }}>HAYATIN ROMANI</Text>
      <Text style={{ fontFamily: F.display, fontSize: 24, color: C.gold, textAlign: "center", marginTop: 8 }}>{state.player.name}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", marginBottom: 4 }}>— bir ömrün hikâyesi, küllerin diyarında —</Text>
      <Text style={{ color: C.gold, textAlign: "center", marginVertical: 14 }}>❧ ⚜ ❧</Text>

      {chapters.length === 0 ? (
        <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, textAlign: "center", marginTop: 20 }}>Romanın ilk satırları henüz yazılıyor… Ayı ilerlet.</Text>
      ) : chapters.map((c, ci) => (
        <View key={ci} style={{ marginBottom: 24 }}>
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 3, color: C.goldDim, textAlign: "center" }}>BÖLÜM {ci + 1}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 19, color: C.gold, textAlign: "center", marginTop: 2 }}>{c.band.name}</Text>
          <View style={{ width: "55%", height: 1, backgroundColor: C.borderHi, alignSelf: "center", marginVertical: 14 }} />
          {c.events.map((e, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: e.landmark ? 10 : 6 }}>
              {e.landmark && <Text style={{ color: C.gold }}>⚜</Text>}
              <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 23, color: e.landmark ? C.parchment : C.parchmentDim, fontStyle: e.landmark ? "normal" : "italic" }}>{e.text}</Text>
            </View>
          ))}
        </View>
      ))}
      <Text style={{ color: C.gold, textAlign: "center", marginVertical: 14 }}>❧ ⚜ ❧</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchmentMuted, textAlign: "center", lineHeight: 22 }}>
        {state.player.dead ? "Son. Ama küllerin altında bir tohum, yeni bir hikâyeyi bekliyor." : "…ve hikâye devam ediyor. Bir sonraki sayfayı sen yazacaksın."}
      </Text>
    </ScrollView>
  );
}
