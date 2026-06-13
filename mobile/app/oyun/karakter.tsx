import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "../../lib/store";
import { C, F } from "../../lib/theme";

function Row({ k, v }: { k: string; v: string | number }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{k}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{v}</Text>
    </View>
  );
}

export default function Karakter() {
  const insets = useSafeAreaInsets();
  const { state } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16 }}>
      <Text style={{ fontFamily: F.display, fontSize: 22, color: C.parchment, letterSpacing: 1 }}>{p.name}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.gold, marginBottom: 16 }}>{p.gender === "kadın" ? "Kadın" : "Erkek"} · {p.age} yaş · {p.location_name}</Text>
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14 }}>
        <Row k="Güç" v={p.stats.strength} />
        <Row k="Zekâ" v={p.stats.intelligence} />
        <Row k="Karizma" v={p.stats.charisma} />
        <Row k="Dayanıklılık" v={p.stats.stamina} />
        <Row k="Meslek" v={p.profession === "işsiz" ? "İşsiz" : p.profession} />
        <Row k="Sağlık" v={Math.round(p.health)} />
        <Row k="Tokluk" v={Math.round(p.hunger)} />
        <Row k="Akçe" v={p.money} />
      </View>
    </ScrollView>
  );
}
