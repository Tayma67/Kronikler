import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { opportunitiesFor, resolveOpportunity } from "../../lib/game";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel, PageHeader, Panel, Pill } from "../../lib/ui";

const RISK = (r: number) => r >= 0.55 ? { k: "high", c: C.blood } : r >= 0.35 ? { k: "mid", c: C.ember } : { k: "low", c: C.sage };

export default function Firsatlar() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const opps = opportunitiesFor(state);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.firsatlar")} icon="🎲" title={t("scr.firsatlar")} />
        {opps.length === 0 ? (
          <Panel><Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", paddingVertical: 14 }}>{t("frs.empty")}</Text></Panel>
        ) : opps.map((o) => {
          const rk = RISK(o.risk);
          return (
            <Panel key={o.id} title={o.title} icon="✦" tone={rk.c} right={<Pill text={`${t("frs.risk." + rk.k)} ${t("frs.riskLabel")}`} tone={rk.c} />}>
              <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, marginBottom: 10, lineHeight: 19 }}>{o.desc}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted }}>{t("frs.reward")} <Text style={{ color: C.gold }}>{o.reward} ⚜</Text></Text>
                <Pressable onPress={() => apply((s) => resolveOpportunity(s, o))} style={{ paddingVertical: 8, paddingHorizontal: 18, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.12)" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold, letterSpacing: 1 }}>{t("frs.take")}</Text>
                </Pressable>
              </View>
            </Panel>
          );
        })}
      </ScrollView>
    </View>
  );
}
