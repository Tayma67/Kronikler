import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { LOCATIONS, placeKind } from "../../lib/game";
import { useI18n } from "../../lib/i18n";
import { placeName } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { BackLabel, PageHeader, Panel } from "../../lib/ui";

const KIND_KEY: Record<string, string> = { "şehir": "sehir", "kale": "kale", "köy": "koy" };

export default function Sehir() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const here = state.player.location_name;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.sehir")} icon="🏰" title={placeName(here, lang)} sub={t("city.hint")} />

        <Pressable onPress={() => router.push("/oyun/haberler")} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(201,168,76,0.07)", borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: "rgba(201,168,76,0.1)", borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 19 }}>📜</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{t("scr.haberler")}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{t("city.newsDesc")}</Text>
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>›</Text>
        </Pressable>

        <Panel title={t("scr.harita")} icon="🗺" noPad>
          {LOCATIONS.map((loc, i) => {
            const cur = loc === here;
            return (
              <Pressable key={loc} onPress={() => router.push(`/oyun/diyar/${encodeURIComponent(loc)}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: i === LOCATIONS.length - 1 ? 0 : 1, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : cur ? "rgba(201,168,76,0.06)" : "transparent" })}>
                <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: cur ? "rgba(201,168,76,0.5)" : "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 19 }}>{placeKind(loc) === "şehir" ? "🏙" : placeKind(loc) === "kale" ? "🏰" : "🏡"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 14, color: cur ? C.gold : C.parchment }}>{placeName(loc, lang)}</Text>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{cur ? t("city.here") : t("kind." + KIND_KEY[placeKind(loc)])}</Text>
                </View>
                {!cur && <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldDim }}>›</Text>}
              </Pressable>
            );
          })}
        </Panel>
      </ScrollView>
    </View>
  );
}
