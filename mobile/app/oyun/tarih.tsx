import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { currentCalendar } from "../../lib/calendar";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams, renderEvt } from "../../lib/i18n";
import { BackLabel, PageHeader } from "../../lib/ui";

export default function Tarih() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { t, lang } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const events = [...state.history].reverse();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.tarih")} title={t("scr.tarih")} />
        {events.map((e, i) => {
          const cal = currentCalendar(e.day);
          return (
            <View key={i} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftColor: e.landmark ? C.gold : C.border, borderLeftWidth: e.landmark ? 2.5 : 1, borderRadius: 8, padding: 11, marginBottom: 7 }}>
              <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1, color: C.parchmentMuted }}>{t("cal.month." + cal.month_no).toUpperCase()} {cal.year}{e.landmark ? "  ⚜" : ""}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 13, color: e.landmark ? C.parchment : C.parchmentDim, marginTop: 2 }}>{renderEvt(e.k, e.text, e.p, lang, t, state.player.gender === "kadın")}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
