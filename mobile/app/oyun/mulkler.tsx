import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { buyProperty, PROPERTY_TYPES } from "../../lib/game";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel, PageHeader, Panel, Pill } from "../../lib/ui";

export default function Mulkler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const income = p.properties.reduce((a, ty) => a + (PROPERTY_TYPES[ty]?.income || 0), 0);
  const counts: Record<string, number> = {}; p.properties.forEach((ty) => counts[ty] = (counts[ty] || 0) + 1);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.mulkler")} icon="🏯" title={t("scr.mulkler")} sub={`${t("mulk.income")}: ${income} ⚜ · ${t("mulk.hint")}`} />
        <Panel title={t("scr.mulkler")} icon="🏠" noPad>
          {Object.entries(PROPERTY_TYPES).map(([id, ty], i, arr) => (
            <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: C.border }}>
              <View style={{ width: 40, height: 40, borderRadius: 9, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 20 }}>{ty.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{ty.name}</Text>
                  {counts[id] ? <Pill text={`×${counts[id]}`} /> : null}
                </View>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{ty.income} {t("mulk.perMonth")}</Text>
              </View>
              <Pressable onPress={() => apply((s) => buyProperty(s, id))} disabled={p.money < ty.cost} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: p.money < ty.cost ? C.bg : "rgba(201,168,76,0.12)" }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, color: p.money < ty.cost ? C.parchmentMuted : C.gold }}>{t("misc.buy")} {ty.cost}⚜</Text>
              </Pressable>
            </View>
          ))}
        </Panel>
      </ScrollView>
    </View>
  );
}
