import { View, Text, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { currentCalendar } from "../../lib/calendar";
import { C, F } from "../../lib/theme";
import { useI18n, renderEvt } from "../../lib/i18n";
import { BackLabel, PageHeader } from "../../lib/ui";

export default function Tarih() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { t, lang } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  // FlatList (sanallaştırma): 250 kartı tek seferde değil görünür pencere kadar çizer — düşük-uç cihazda takılma biter.
  // Anahtar en yeni uçtan sayılır ki yeni girdi eklenince eski kartların anahtarı kaymasın.
  const events = [...state.history].reverse();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <FlatList
        data={events}
        keyExtractor={(_, i) => String(events.length - i)}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}
        ListHeaderComponent={<PageHeader kicker={t("scr.tarih")} title={t("scr.tarih")} />}
        initialNumToRender={16}
        windowSize={7}
        removeClippedSubviews
        renderItem={({ item: e }) => {
          const cal = currentCalendar(e.day);
          return (
            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftColor: e.landmark ? C.gold : C.border, borderLeftWidth: e.landmark ? 2.5 : 1, borderRadius: 8, padding: 11, marginBottom: 7 }}>
              <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1, color: C.parchmentMuted }}>{t("cal.month." + cal.month_no).toUpperCase()} {cal.year}{e.landmark ? "  ⚜" : ""}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 13, color: e.landmark ? C.parchment : C.parchmentDim, marginTop: 2 }}>{renderEvt(e.k, e.text, e.p, lang, t, state.player.gender === "kadın")}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}
