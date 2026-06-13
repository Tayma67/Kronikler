import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGame } from "../../../lib/store";
import { travelTo, placeKind } from "../../../lib/game";
import { cityInfo, marketGoods, locSeed } from "../../../lib/world";
import { C, F } from "../../../lib/theme";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{value}</Text>
    </View>
  );
}

export default function DiyarDetay() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const { state, apply } = useGame();
  if (!state || !name) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const kind = placeKind(name);
  const info = cityInfo(name, kind);
  const here = state.player.location_name === name;
  const goods = marketGoods(locSeed(name)).slice(0, 4);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
      <Text style={{ fontFamily: F.display, fontSize: 24, color: C.parchment, letterSpacing: 1 }}>{name}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.gold, marginBottom: 4 }}>{kind} · {info.population.toLocaleString("tr")} nüfus</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted, lineHeight: 20, marginBottom: 14 }}>{info.blurb}</Text>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, marginBottom: 16 }}>
        <Stat label="Vali" value={info.governor} />
        <Stat label="Güvenlik" value={`${info.security}/100`} />
        <Stat label="Refah" value={`${info.prosperity}/100`} />
      </View>

      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 8 }}>PAZARDAN</Text>
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, marginBottom: 16 }}>
        {goods.map((g) => (
          <View key={g.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{g.icon} {g.name}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: C.goldDim }}>al {g.buy} · sat {g.sell}</Text>
          </View>
        ))}
      </View>

      {here ? (
        <View style={{ paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", alignItems: "center", backgroundColor: "rgba(201,168,76,0.08)" }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold, letterSpacing: 1 }}>ŞU AN BURADASIN</Text>
        </View>
      ) : (
        <Pressable onPress={() => { apply((s) => travelTo(s, name)); router.back(); }} style={{ paddingVertical: 15, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold, alignItems: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: "#1a1206", letterSpacing: 1.5 }}>BURAYA GİT</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
