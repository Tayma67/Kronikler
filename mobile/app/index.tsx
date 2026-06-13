import { View, Text, Pressable, ActivityIndicator, ImageBackground, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { LANGS } from "../lib/locale-data";
import { C, F } from "../lib/theme";

export default function MainMenu() {
  const { state, loading } = useGame();
  const { lang, setLang, t, rtl } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={C.gold} />
    </View>;
  }

  const hasSave = !!state;

  return (
    <ImageBackground source={require("../assets/yeni_oyun_bg.png")} resizeMode="cover" style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, backgroundColor: "rgba(8,5,2,0.6)", paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}>
        {/* Dil seçici — sağ üst */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, alignSelf: rtl ? "flex-start" : "flex-end" }} contentContainerStyle={{ flexDirection: "row", gap: 6 }}>
          {LANGS.map((l) => {
            const active = l.code === lang;
            return (
              <Pressable key={l.code} onPress={() => setLang(l.code)} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: active ? "rgba(201,168,76,0.7)" : "rgba(160,130,70,0.3)", backgroundColor: active ? "rgba(201,168,76,0.2)" : "rgba(8,5,2,0.5)" }}>
                <Text style={{ fontSize: 13 }}>{l.flag}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 0.5, color: active ? C.gold : C.parchmentMuted }}>{l.code.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Başlık */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 6, color: C.gold, textAlign: "center" }}>KRONİKLER</Text>
          <Text style={{ fontFamily: F.display, fontSize: 30, letterSpacing: 3, color: C.parchment, textAlign: "center", marginTop: 8, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 10 }}>KÜLLERİN MİRASI</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", marginTop: 10 }}>{t("app.subtitle")}</Text>
          <Text style={{ color: C.gold, textAlign: "center", marginTop: 14, fontSize: 13, letterSpacing: 4 }}>❧ ⚜ ❧</Text>
        </View>

        {/* Aksiyonlar */}
        <View style={{ gap: 12 }}>
          {hasSave && (
            <Pressable onPress={() => router.push("/oyun")} style={{ paddingVertical: 16, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.6)", backgroundColor: C.gold, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 2, color: "#2a1d08" }}>{t("menu.continue")}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.push("/yeni-oyun")} style={{ paddingVertical: 16, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.6)", backgroundColor: hasSave ? "rgba(8,5,2,0.55)" : C.gold, alignItems: "center" }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 2, color: hasSave ? C.gold : "#2a1d08" }}>{t("menu.newGame")}</Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}
