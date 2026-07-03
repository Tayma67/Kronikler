import { View, Text, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { currentCalendar } from "../../lib/calendar";
import { C, F } from "../../lib/theme";
import { useI18n, renderEvt, applyParams } from "../../lib/i18n";
import { BackLabel, PageHeader } from "../../lib/ui";
import { GameIcon } from "../../lib/icons";

// Büyük an tipleri → ikon (kroniğin gözle taranabilir kilometre taşları).
const BIG_ICON: Record<string, string> = { taht: "crown", kan_davası: "crossed-swords", nesil_devri: "banner", "savaş_zafer": "trophy", "mülk_yangın": "flame", evlilik: "ring", "doğum": "baby", "ölüm": "tombstone" };

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
          const bigIcon = e.landmark ? BIG_ICON[e.type] : undefined;
          // Nesil devri: kronikte bölüm başlığı gibi durur — hanedanın perde arası.
          // Yalnız GERÇEK devir kaydı (evj.genHandover; p[0]=nesil no) — son-söz yankısı da aynı tipi taşır ama başlık değildir.
          if (e.type === "nesil_devri" && (!e.k || e.k === "evj.genHandover")) {
            return (
              <View style={{ marginTop: 14, marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: "rgba(201,168,76,0.35)" }} />
                  <GameIcon name="banner" size={14} color={C.gold} />
                  <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2.5, color: C.gold }}>{applyParams(t("hist.genHeader"), [String((e.p && e.p[0]) || "")]).toUpperCase()}</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: "rgba(201,168,76,0.35)" }} />
                </View>
                <View style={{ backgroundColor: "rgba(201,168,76,0.06)", borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderRadius: 10, padding: 12 }}>
                  <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{renderEvt(e.k, e.text, e.p, lang, t, state.player.gender === "kadın")}</Text>
                </View>
              </View>
            );
          }
          return (
            <View style={{ backgroundColor: e.landmark ? "rgba(201,168,76,0.05)" : C.card, borderWidth: 1, borderColor: e.landmark ? "rgba(201,168,76,0.35)" : C.border, borderLeftColor: e.landmark ? C.gold : C.border, borderLeftWidth: e.landmark ? 2.5 : 1, borderRadius: 8, padding: e.landmark ? 13 : 11, marginBottom: 7 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {bigIcon ? <GameIcon name={bigIcon} size={12} color={C.gold} /> : null}
                <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1, color: e.landmark ? C.goldDim : C.parchmentMuted }}>{t("cal.month." + cal.month_no).toUpperCase()} {cal.year}{e.landmark ? "  ⚜" : ""}</Text>
              </View>
              <Text style={{ fontFamily: F.serif, fontSize: e.landmark ? 13.5 : 13, color: e.landmark ? C.parchment : C.parchmentDim, marginTop: 2 }}>{renderEvt(e.k, e.text, e.p, lang, t, state.player.gender === "kadın")}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}
