import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { buyItem, sellItem, launchCaravan, bargainBuy, marketPrice, econLabel } from "../../lib/game";
import { marketGoods, locSeed } from "../../lib/world";
import { useI18n } from "../../lib/i18n";
import { placeName } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { BackLabel } from "../../lib/ui";

const CARAVAN_AMOUNTS = [50, 120, 300];

export default function Pazar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const econ = state.econ || 1;
  const goods = marketGoods(locSeed(p.location_name)).map((g) => ({ ...g, buy: marketPrice(g.buy, econ), sell: marketPrice(g.sell, econ) }));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{placeName(p.location_name, lang)}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: econ >= 1.06 ? C.blood : econ <= 0.94 ? C.sage : C.parchmentMuted, paddingHorizontal: 16, marginBottom: 6 }}>
        ⚖ {econLabel(econ)}
      </Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {/* Kervan seferi */}
        <View style={{ backgroundColor: "rgba(201,168,76,0.07)", borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold, letterSpacing: 0.5 }}>🐪 Kervan Seferi</Text>
          {state.caravan ? (
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginTop: 5 }}>
              {state.caravan.dest} yolunda bir kervanın var ({state.caravan.invested}⚜). Dönüşü yakında.
            </Text>
          ) : (
            <>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 4, marginBottom: 8 }}>Akçe yatır; birkaç ay sonra kârla döner — ya da baskına uğrar. Ticaret becerin riski azaltır.</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {CARAVAN_AMOUNTS.map((amt) => (
                  <Pressable key={amt} disabled={p.money < amt} onPress={() => apply((s) => launchCaravan(s, amt))} style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 7, borderWidth: 1, borderColor: p.money < amt ? C.border : "rgba(201,168,76,0.5)", backgroundColor: p.money < amt ? C.bg : "rgba(201,168,76,0.12)" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 11, color: p.money < amt ? C.parchmentMuted : C.gold }}>{amt}⚜</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
        {goods.map((g) => {
          const have = p.inventory[g.id] || 0;
          return (
            <View key={g.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 20 }}>{g.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{t("it." + g.id)}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>Elinde: {have}</Text>
                </View>
                <Pressable onPress={() => apply((s) => buyItem(s, g.id))} disabled={p.money < g.buy} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: p.money < g.buy ? C.card : "rgba(201,168,76,0.12)", marginRight: 5 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: p.money < g.buy ? C.parchmentMuted : C.gold }}>AL {g.buy}⚜</Text>
                </Pressable>
                <Pressable onPress={() => apply((s) => bargainBuy(s, g.id))} disabled={p.money < g.buy} style={{ paddingVertical: 8, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", backgroundColor: C.bg, marginRight: 5 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 10, color: p.money < g.buy ? C.parchmentMuted : C.goldDim }}>PAZARLIK</Text>
                </Pressable>
                <Pressable onPress={() => apply((s) => sellItem(s, g.id))} disabled={have <= 0} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
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
