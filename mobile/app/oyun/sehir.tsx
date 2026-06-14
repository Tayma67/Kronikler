import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { LOCATIONS, placeKind } from "../../lib/game";
import { useI18n } from "../../lib/i18n";
import { placeName } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { BackLabel } from "../../lib/ui";

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
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{t("scr.sehir")}</Text>
        <View style={{ width: 40 }} />
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 8 }}>{t("city.hint")}</Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <Pressable onPress={() => router.push("/oyun/haberler")} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(201,168,76,0.07)", borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <Text style={{ fontSize: 20 }}>📜</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{t("scr.haberler")}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{t("city.newsDesc")}</Text>
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>›</Text>
        </Pressable>

        {LOCATIONS.map((loc) => {
          const cur = loc === here;
          return (
            <Pressable key={loc} onPress={() => router.push(`/oyun/diyar/${encodeURIComponent(loc)}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: cur ? "rgba(201,168,76,0.5)" : C.border, borderRadius: 10, padding: 14, marginBottom: 8 }}>
              <Text style={{ fontSize: 20 }}>{placeKind(loc) === "şehir" ? "🏙" : placeKind(loc) === "kale" ? "🏰" : "🏡"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 14, color: cur ? C.gold : C.parchment }}>{placeName(loc, lang)}</Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{cur ? t("city.here") : t("kind." + KIND_KEY[placeKind(loc)])}</Text>
              </View>
              <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>{cur ? "" : "›"}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
