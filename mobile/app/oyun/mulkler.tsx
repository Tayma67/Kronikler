import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { buyProperty, repairProperty, repairCost, PROPERTY_TYPES } from "../../lib/game";
import { placeName } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader, Panel } from "../../lib/ui";

export default function Mulkler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const here = p.location_name;
  // Tahmini aylık gelir (kondisyon × ~refah; ekranda yaklaşık).
  const estIncome = Math.round(p.properties.reduce((a, pr) => a + (PROPERTY_TYPES[pr.type]?.income || 0) * (pr.cond / 100), 0));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.mulkler")} icon="🏯" title={t("scr.mulkler")} sub={`${t("mulk.income")}: ~${estIncome} ⚜ · ${t("mulk.locNote")}`} />

        {/* ── Sahip olunan mülkler ── */}
        {p.properties.length > 0 && (
          <Panel title={t("mulk.owned")} icon="🏠" noPad>
            {p.properties.map((pr, i) => {
              const ty = PROPERTY_TYPES[pr.type]; if (!ty) return null;
              const condCol = pr.cond >= 75 ? C.sage : pr.cond >= 45 ? C.gold : C.blood;
              const rc = repairCost(pr);
              return (
                <View key={i} style={{ paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: i === p.properties.length - 1 ? 0 : 1, borderBottomColor: C.border }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 9, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 20 }}>{ty.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{ty.name}</Text>
                      <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>📍 {placeName(pr.loc, lang)} · {ty.income} {t("mulk.perMonth")}</Text>
                    </View>
                    {pr.cond < 100 && (
                      <Pressable onPress={() => { hap("tap"); apply((s) => repairProperty(s, i)); }} disabled={p.money < rc} style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 7, borderWidth: 1, borderColor: p.money < rc ? C.border : "rgba(201,168,76,0.5)", backgroundColor: p.money < rc ? C.bg : "rgba(201,168,76,0.12)" }}>
                        <Text style={{ fontFamily: F.display, fontSize: 10, color: p.money < rc ? C.parchmentMuted : C.gold }}>{t("mulk.repair")} {rc}⚜</Text>
                      </Pressable>
                    )}
                  </View>
                  {/* Kondisyon çubuğu */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 0.5, color: C.parchmentMuted, width: 64 }}>{t("mulk.cond").toUpperCase()}</Text>
                    <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <View style={{ width: `${pr.cond}%`, height: 5, borderRadius: 3, backgroundColor: condCol }} />
                    </View>
                    <Text style={{ fontFamily: F.display, fontSize: 10, color: condCol, width: 32, textAlign: "right" }}>{pr.cond}%</Text>
                  </View>
                </View>
              );
            })}
          </Panel>
        )}

        {/* ── Bu şehirde satın al ── */}
        <Panel title={`${t("mulk.buyHere")} · ${placeName(here, lang)}`} icon="🏗" noPad>
          {Object.entries(PROPERTY_TYPES).map(([id, ty], i, arr) => (
            <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: C.border }}>
              <View style={{ width: 40, height: 40, borderRadius: 9, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 20 }}>{ty.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{ty.name}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{ty.income} {t("mulk.perMonth")}</Text>
              </View>
              <Pressable onPress={() => { hap("tap"); apply((s) => buyProperty(s, id)); }} disabled={p.money < ty.cost} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: p.money < ty.cost ? C.bg : "rgba(201,168,76,0.12)" }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, color: p.money < ty.cost ? C.parchmentMuted : C.gold }}>{t("misc.buy")} {ty.cost}⚜</Text>
              </Pressable>
            </View>
          ))}
        </Panel>
      </ScrollView>
    </View>
  );
}
