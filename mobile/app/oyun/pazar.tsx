import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { buyItem, sellItem, launchCaravan, bargainBuy, marketPrice, econKey } from "../../lib/game";
import { marketGoods, locSeed } from "../../lib/world";
import { useI18n } from "../../lib/i18n";
import { placeName } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { BackLabel } from "../../lib/ui";

const CARAVAN_AMOUNTS = [50, 120, 300];

// Vercel "Panel" — başlık (ikon + ad + ton) + gövde.
function Panel({ title, icon, tone, children }: { title: string; icon: string; tone: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: tone + "33", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: tone + "12" }}>
        <Text style={{ fontSize: 15 }}>{icon}</Text>
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5, color: tone, textTransform: "uppercase" }}>{title}</Text>
      </View>
      <View style={{ padding: 12 }}>{children}</View>
    </View>
  );
}
function Coin({ v }: { v: number }) {
  return <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{v} ⚜</Text>;
}

export default function Pazar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const econ = state.econ || 1;
  const goods = marketGoods(locSeed(p.location_name)).map((g) => ({ ...g, buy: marketPrice(g.buy, econ), sell: marketPrice(g.sell, econ) }));
  const econColor = econ >= 1.06 ? C.blood : econ <= 0.94 ? C.sage : C.parchmentMuted;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Coin v={p.money} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        {/* PageHeader */}
        <View style={{ alignItems: "center", marginBottom: 14 }}>
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 3, color: C.goldDim, textTransform: "uppercase" }}>{t("scr.pazar")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 22, color: C.parchment, letterSpacing: 1, marginTop: 4, textAlign: "center" }}>🛒 {placeName(p.location_name, lang)}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: econColor, marginTop: 4 }}>⚖ {t("econ." + econKey(econ))}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, alignSelf: "stretch" }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
            <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: "45deg" }], marginHorizontal: 8 }} />
            <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
          </View>
        </View>

        {/* Kervan paneli */}
        <Panel title={t("paz.caravanTitle")} icon="🐫" tone={C.ember}>
          {state.caravan ? (
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted }}>
              {t("paz.caravanActive").replace("%d", placeName(state.caravan.dest, lang)).replace("%c", String(state.caravan.invested))}
            </Text>
          ) : (
            <>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, marginBottom: 9 }}>{t("paz.caravanHint")}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {CARAVAN_AMOUNTS.map((amt) => (
                  <Pressable key={amt} disabled={p.money < amt} onPress={() => apply((s) => launchCaravan(s, amt))} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: p.money < amt ? C.border : "rgba(224,90,48,0.5)", backgroundColor: p.money < amt ? C.bg : "rgba(224,90,48,0.12)" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 12, color: p.money < amt ? C.parchmentMuted : C.ember }}>{amt}⚜</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </Panel>

        {/* Pazar paneli */}
        <Panel title={`${placeName(p.location_name, lang)} ${t("paz.marketSuffix")}`} icon="🛒" tone={C.gold}>
          {goods.map((g, gi) => {
            const have = p.inventory[g.id] || 0;
            return (
              <View key={g.id} style={{ paddingVertical: 9, borderBottomWidth: gi === goods.length - 1 ? 0 : 1, borderBottomColor: C.border }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 18 }}>{g.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchment }}>{t("it." + g.id)}</Text>
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{t("paz.have")} {have}</Text>
                  </View>
                  <Coin v={g.buy} />
                </View>
                <View style={{ flexDirection: "row", gap: 7, marginTop: 8 }}>
                  <Pressable onPress={() => apply((s) => buyItem(s, g.id))} disabled={p.money < g.buy} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: p.money < g.buy ? C.bg : "rgba(201,168,76,0.12)" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 11, color: p.money < g.buy ? C.parchmentMuted : C.gold }}>{t("misc.buy")} {g.buy}⚜</Text>
                  </Pressable>
                  <Pressable onPress={() => apply((s) => bargainBuy(s, g.id))} disabled={p.money < g.buy} style={{ alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", backgroundColor: C.bg }}>
                    <Text style={{ fontFamily: F.display, fontSize: 10.5, color: p.money < g.buy ? C.parchmentMuted : C.goldDim }}>{t("misc.bargain")}</Text>
                  </Pressable>
                  <Pressable onPress={() => apply((s) => sellItem(s, g.id))} disabled={have <= 0} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 7, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
                    <Text style={{ fontFamily: F.display, fontSize: 11, color: have <= 0 ? C.parchmentMuted : C.parchmentDim }}>{t("misc.sell")} {g.sell}⚜</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </Panel>
      </ScrollView>
    </View>
  );
}
