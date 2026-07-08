import { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, Pressable, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useGame } from "../../lib/store";
import { currentCalendar } from "../../lib/calendar";
import { C, F } from "../../lib/theme";
import { useI18n, renderEvt, applyParams } from "../../lib/i18n";
import { BackLabel, PageHeader, ScreenFresk } from "../../lib/ui";
import { GameIcon } from "../../lib/icons";
import { isReduceMotion } from "../../lib/perf";
import { hap } from "../../lib/haptics";

// Büyük an tipleri → ikon (kroniğin gözle taranabilir kilometre taşları).
const BIG_ICON: Record<string, string> = { taht: "crown", kan_davası: "crossed-swords", nesil_devri: "banner", "savaş_zafer": "trophy", "mülk_yangın": "flame", evlilik: "ring", "doğum": "baby", "ölüm": "tombstone" };

export default function Tarih() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { t, lang } = useI18n();
  // Hayat Şeridi: dönüm noktalarını kare kare oynatan sinema perdesi (-1 kapalı).
  const [cine, setCine] = useState(-1);
  const { cine: cineParam } = useLocalSearchParams<{ cine?: string }>();
  const fade = useRef(new Animated.Value(0)).current;
  const marks = state ? state.history.filter((e) => e.landmark) : [];
  useEffect(() => {
    if (cine < 0) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: isReduceMotion() ? 0 : 700, useNativeDriver: true }).start();
    if (isReduceMotion()) return; // sade mod: otomatik akış yok, dokunarak ilerlenir
    const tm = setTimeout(() => setCine((i) => (i >= 0 && i < marks.length - 1 ? i + 1 : -1)), 3800);
    return () => clearTimeout(tm);
  }, [cine]);
  // Mersiyeden gelen davet: ?cine=1 perdeyi kendiliğinden açar (bir kez).
  useEffect(() => { if (cineParam === "1" && marks.length) setCine(0); }, [cineParam]);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  // FlatList (sanallaştırma): 250 kartı tek seferde değil görünür pencere kadar çizer — düşük-uç cihazda takılma biter.
  // Anahtar en yeni uçtan sayılır ki yeni girdi eklenince eski kartların anahtarı kaymasın.
  const events = [...state.history].reverse();
  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <FlatList
        data={events}
        keyExtractor={(_, i) => String(events.length - i)}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}
        ListHeaderComponent={<View>
          <PageHeader kicker={t("scr.tarih")} title={t("scr.tarih")} />
          {marks.length >= 3 && (
            <Pressable onPress={() => { hap("selection"); setCine(0); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingVertical: 9, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.55)", backgroundColor: "rgba(201,168,76,0.08)", marginBottom: 12 }}>
              <GameIcon name="hourglass" size={14} color={C.gold} />
              <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.gold }}>{t("cine.btn")}</Text>
            </Pressable>
          )}
        </View>}
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
      {/* Sinema perdesi: dokunuş sonraki kare; son kare veya Kapat perdeyi indirir */}
      {cine >= 0 && cine < marks.length && (() => {
        const e = marks[cine];
        const cal = currentCalendar(e.day);
        const icon = BIG_ICON[e.type] || "scroll";
        return (
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(5,3,1,0.97)" }}>
            <Pressable onPress={() => { hap("selection"); setCine((i) => (i < marks.length - 1 ? i + 1 : -1)); }} style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 30 }}>
              <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 3, color: C.goldDim, marginBottom: 26 }}>{t("cine.title").toUpperCase()}</Text>
              <Animated.View style={{ opacity: fade, alignItems: "center", gap: 18, maxWidth: 460 }}>
                <GameIcon name={icon} size={46} color={C.gold} />
                <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.goldDim }}>{t("cal.month." + cal.month_no).toUpperCase()} {cal.year}</Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 17, lineHeight: 27, color: C.parchment, textAlign: "center" }}>{renderEvt(e.k, e.text, e.p, lang, t, state.player.gender === "kadın")}</Text>
              </Animated.View>
              <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1, color: C.goldDim, marginTop: 30 }}>{applyParams(t("cine.progress"), [cine + 1, marks.length])}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 5 }}>{t("cine.tapHint")}</Text>
            </Pressable>
            <Pressable onPress={() => setCine(-1)} style={{ position: "absolute", top: insets.top + 10, right: 16, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: "rgba(255,255,255,0.04)" }}>
              <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 1, color: C.parchmentMuted }}>{t("cine.close")}</Text>
            </Pressable>
          </View>
        );
      })()}
    </ScreenFresk>
  );
}
