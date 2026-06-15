import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { WEEKS_PER_YEAR } from "../../lib/calendar";
import { useI18n, applyParams, renderEvt } from "../../lib/i18n";
import { professionNameL } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { BackLabel } from "../../lib/ui";

const BANDS = [
  { key: "cocukluk", lo: 7, hi: 12 },
  { key: "ergenlik", lo: 13, hi: 17 },
  { key: "genclik", lo: 18, hi: 24 },
  { key: "yetiskinlik", lo: 25, hi: 32 },
  { key: "olgunluk", lo: 33, hi: 45 },
  { key: "yaslilik", lo: 46, hi: 59 },
  { key: "ihtiyarlik", lo: 60, hi: 200 },
];

export default function Roman() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const base = state.player.base_age;
  const ageOf = (day: number) => base + Math.floor(day / WEEKS_PER_YEAR);
  const bandOf = (age: number) => BANDS.find((b) => age >= b.lo && age <= b.hi) || BANDS[BANDS.length - 1];

  // Bölümlere göre grupla (dünya gürültüsü değil; kişisel + dönüm noktaları)
  const chapters = BANDS.map((b) => ({
    band: b,
    events: state.history.filter((e) => { const a = ageOf(e.day); return a >= b.lo && a <= b.hi && e.scope === "kişisel"; }),
  })).filter((c) => c.events.length > 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 60 }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 10 }}><BackLabel /></Pressable>
      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 4, color: C.goldDim, textAlign: "center" }}>{t("rom.eyebrow")}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 24, color: C.gold, textAlign: "center", marginTop: 8 }}>{state.player.name}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", marginBottom: 4 }}>{t("rom.subtitle")}</Text>
      <Text style={{ color: C.gold, textAlign: "center", marginVertical: 14 }}>❧ ⚜ ❧</Text>

      {chapters.length === 0 ? (
        <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, textAlign: "center", marginTop: 20 }}>{t("rom.empty")}</Text>
      ) : chapters.map((c, ci) => (
        <View key={ci} style={{ marginBottom: 24 }}>
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 3, color: C.goldDim, textAlign: "center" }}>{t("rom.chapter")} {ci + 1}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 19, color: C.gold, textAlign: "center", marginTop: 2 }}>{t("rom.band." + c.band.key)}</Text>
          <View style={{ width: "55%", height: 1, backgroundColor: C.borderHi, alignSelf: "center", marginVertical: 14 }} />
          {c.events.map((e, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: e.landmark ? 10 : 6 }}>
              {e.landmark && <Text style={{ color: C.gold }}>⚜</Text>}
              <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 23, color: e.landmark ? C.parchment : C.parchmentDim, fontStyle: e.landmark ? "normal" : "italic" }}>{renderEvt(e.k, e.text, e.p, lang, t)}</Text>
            </View>
          ))}
        </View>
      ))}
      {state.player.dead && (() => {
        const p = state.player;
        const tally = [
          t("rom.t.lived").replace("%n", String(p.age)),
          p.profession !== "işsiz" ? t("rom.t.recalled").replace("%s", professionNameL(p.profession, lang)) : t("rom.t.noTrade"),
          p.children.length ? t("rom.t.children").replace("%n", String(p.children.length)) : t("rom.t.noChildren"),
          p.properties.length ? t("rom.t.properties").replace("%n", String(p.properties.length)) : null,
          p.fame >= 50 ? t("rom.t.famed") : null,
        ].filter(Boolean).join(" · ");
        return (
          <View style={{ borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderRadius: 12, padding: 16, marginBottom: 16, backgroundColor: "rgba(201,168,76,0.06)" }}>
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 3, color: C.goldDim, textAlign: "center" }}>{t("rom.tallyHeader")}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchment, textAlign: "center", lineHeight: 22, marginTop: 8 }}>{tally}.</Text>
          </View>
        );
      })()}

      <Text style={{ color: C.gold, textAlign: "center", marginVertical: 14 }}>❧ ⚜ ❧</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchmentMuted, textAlign: "center", lineHeight: 22 }}>
        {state.player.dead ? t("rom.closeDead") : t("rom.closeAlive")}
      </Text>
    </ScrollView>
  );
}
