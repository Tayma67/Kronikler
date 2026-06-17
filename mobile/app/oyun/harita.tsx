import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { PLACES, BEYLIKS, beylikOf, regionOf } from "../../lib/game";
import { useI18n } from "../../lib/i18n";
import { placeName } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { BackLabel } from "../../lib/ui";

// Beylik bazlı otomatik konumlandırma (42 yerleşim): her beylik bir yatay bant, içinde 2 sıraya yayılır.
const POS: Record<string, { x: number; y: number }> = (() => {
  const out: Record<string, { x: number; y: number }> = {};
  BEYLIKS.forEach((b, bi) => {
    const inB = PLACES.filter((p) => p.region === b.id);
    const yTop = 5 + bi * 18.6;
    const perRow = Math.ceil(inB.length / 2); // ilk sıra dolu, ikinci sıra kalanı
    inB.forEach((p, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const rowN = row === 0 ? perRow : inB.length - perRow;
      out[p.name] = { x: rowN <= 1 ? 50 : 11 + (col / (rowN - 1)) * 78, y: yTop + row * 8.2 };
    });
  });
  return out;
})();
const KIND_ICON: Record<string, string> = { "şehir": "🏙", "kale": "🏰", "köy": "🏡" };

export default function Harita() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const here = state.player.location_name;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{t("scr.harita")}</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 6 }}>
        {t("map.hint")}
      </Text>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        <View style={{ marginHorizontal: 14, marginTop: 6, aspectRatio: 0.6, borderRadius: 14, borderWidth: 1, borderColor: C.borderHi, backgroundColor: "#15100a", overflow: "hidden" }}>
          {/* dekoratif çizgiler */}
          <View style={{ position: "absolute", left: "8%", right: "8%", top: "30%", height: 1, backgroundColor: "rgba(201,168,76,0.08)" }} />
          <View style={{ position: "absolute", left: "8%", right: "8%", top: "62%", height: 1, backgroundColor: "rgba(201,168,76,0.08)" }} />
          {PLACES.map((pl) => {
            const pos = POS[pl.name] || { x: 50, y: 50 };
            const cur = pl.name === here;
            const bey = beylikOf(pl.name);
            const homeBeylik = regionOf(here) === pl.region; // oyuncunun beyliğindeki yerler vurgulu
            return (
              <Pressable key={pl.name} onPress={() => router.push(`/oyun/diyar/${encodeURIComponent(pl.name)}`)} style={{ position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`, alignItems: "center", width: 60, marginLeft: -30 }}>
                <View style={{ width: 27, height: 27, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: cur ? C.gold + "33" : bey.tone + (homeBeylik ? "26" : "14"), borderWidth: cur ? 2.5 : 1.5, borderColor: cur ? C.gold : bey.tone + (homeBeylik ? "" : "88") }}>
                  <Text style={{ fontSize: 13 }}>{KIND_ICON[pl.kind]}</Text>
                </View>
                <Text style={{ fontFamily: F.display, fontSize: 8, color: cur ? C.gold : C.parchmentMuted, marginTop: 2, letterSpacing: 0.3 }} numberOfLines={1}>{placeName(pl.name, lang)}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Beylik lejantı */}
        <View style={{ marginHorizontal: 14, marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {BEYLIKS.map((b) => (
            <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: b.tone, borderWidth: 1, borderColor: b.tone }} />
              <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 0.3, color: regionOf(here) === b.id ? C.gold : C.parchmentMuted }}>{b.name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
