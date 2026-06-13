import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { buyItem, sellItem } from "../../lib/game";
import { marketGoods, locSeed } from "../../lib/world";
import { C, F } from "../../lib/theme";

export default function Pazar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const goods = marketGoods(locSeed(p.location_name));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{p.location_name} Pazarı</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {goods.map((g) => {
          const have = p.inventory[g.id] || 0;
          return (
            <View key={g.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 20 }}>{g.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{g.name}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>Elinde: {have}</Text>
                </View>
                <Pressable onPress={() => apply((s) => buyItem(s, g.id))} disabled={p.money < g.buy} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: p.money < g.buy ? C.card : "rgba(201,168,76,0.12)", marginRight: 6 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: p.money < g.buy ? C.parchmentMuted : C.gold }}>AL {g.buy}⚜</Text>
                </Pressable>
                <Pressable onPress={() => apply((s) => sellItem(s, g.id))} disabled={have <= 0} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: have <= 0 ? C.parchmentMuted : C.parchmentDim }}>SAT {g.sell}⚜</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
