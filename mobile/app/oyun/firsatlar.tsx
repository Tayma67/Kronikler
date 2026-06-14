import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { opportunitiesFor, resolveOpportunity } from "../../lib/game";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel, GoldDivider } from "../../lib/ui";

const RISK = (r: number) => r >= 0.55 ? { k: "high", c: C.blood } : r >= 0.35 ? { k: "mid", c: C.ember } : { k: "low", c: C.sage };

export default function Firsatlar() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const opps = opportunitiesFor(state);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{t("scr.firsatlar")}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <GoldDivider mt={4} mb={10} />
        {opps.length === 0 ? <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, textAlign: "center", marginTop: 24 }}>{t("frs.empty")}</Text>
        : opps.map((o) => { const rk = RISK(o.risk); return (
          <View key={o.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{o.title}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 10, color: rk.c }}>{t("frs.risk." + rk.k)} {t("frs.riskLabel")}</Text>
            </View>
            <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, marginVertical: 6 }}>{o.desc}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted }}>{t("frs.reward")} {o.reward} ⚜</Text>
              <Pressable onPress={() => apply((s) => resolveOpportunity(s, o))} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.12)" }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>{t("frs.take")}</Text>
              </Pressable>
            </View>
          </View>
        ); })}
      </ScrollView>
    </View>
  );
}
