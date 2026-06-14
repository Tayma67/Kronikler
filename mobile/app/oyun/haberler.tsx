import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { worldNews, rumors } from "../../lib/lore";
import { useI18n } from "../../lib/i18n";
import { currentCalendar } from "../../lib/calendar";
import { C, F } from "../../lib/theme";
import { BackLabel } from "../../lib/ui";

export default function Haberler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const cal = currentCalendar(state.turn);
  const news = worldNews(state.turn, state.seed);
  const gossip = rumors(state.turn, state.seed, lang);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{t("scr.haberler")}</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 6 }}>
        {cal.month_name} {cal.year} · diyarın diline düşenler
      </Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginTop: 10, marginBottom: 8 }}>📜 Diyar Haberleri</Text>
        {news.map((n) => (
          <View key={n.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftColor: C.gold, borderLeftWidth: 2.5, borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold, letterSpacing: 0.5 }}>{n.title}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment, lineHeight: 19, marginTop: 4 }}>{n.body}</Text>
          </View>
        ))}

        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginTop: 14, marginBottom: 8 }}>🗣 Dedikodular</Text>
        {gossip.map((g) => (
          <View key={g.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchment, lineHeight: 19 }}>“{g.body}”</Text>
          </View>
        ))}
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, textAlign: "center", marginTop: 14 }}>
          Ay ilerledikçe diyarın hâli değişir.
        </Text>
      </ScrollView>
    </View>
  );
}
