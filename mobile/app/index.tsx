import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ImageBackground, ScrollView, Modal, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { LANGS } from "../lib/locale-data";
import { isSoundEnabled, setSoundEnabled, playTap } from "../lib/sound";
import { isHapticsEnabled, setHapticsEnabled, hap } from "../lib/haptics";
import { GameIcon } from "../lib/icons";
import { LoadingScreen } from "../lib/fx";
import { C, F } from "../lib/theme";

export default function MainMenu() {
  const { state, loading } = useGame();
  const { lang, setLang, t, rtl } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [sound, setSound] = useState(isSoundEnabled());
  const [haptics, setHaptics] = useState(isHapticsEnabled());
  const toggleSound = async (v: boolean) => { setSound(v); await setSoundEnabled(v); if (v) playTap(); };
  const toggleHaptics = async (v: boolean) => { setHaptics(v); await setHapticsEnabled(v); if (v) hap("selection"); };
  const activeLang = LANGS.find((l) => l.code === lang) || LANGS[0];

  if (loading) {
    return <LoadingScreen />;
  }

  const hasSave = !!state;

  return (
    <ImageBackground source={require("../assets/yeni_oyun_bg.png")} resizeMode="cover" style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, backgroundColor: "rgba(8,5,2,0.6)", paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}>
        {/* Ayarlar düğmesi — sağ üst (dil seçici artık ayarların içinde) */}
        <View style={{ alignSelf: rtl ? "flex-start" : "flex-end" }}>
          <Pressable onPress={() => { hap("tap"); setSettingsOpen(true); }} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: "rgba(160,130,70,0.35)", backgroundColor: "rgba(8,5,2,0.5)" }}>
            <GameIcon name="ayarlar" size={16} color={C.gold} />
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1, color: C.parchmentMuted }}>{t("settings.title")}</Text>
          </Pressable>
        </View>

        {/* Başlık */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 6, color: C.gold, textAlign: "center" }}>KRONİKLER</Text>
          <Text style={{ fontFamily: F.display, fontSize: 30, letterSpacing: 3, color: C.parchment, textAlign: "center", marginTop: 8, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 10 }}>KÜLLERİN MİRASI</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", marginTop: 10 }}>{t("app.subtitle")}</Text>
          <Text style={{ color: C.gold, textAlign: "center", marginTop: 14, fontSize: 13, letterSpacing: 4 }}>❧ ⚜ ❧</Text>
        </View>

        {/* Aksiyonlar */}
        <View style={{ gap: 12 }}>
          {/* Tek Oyuncu (çevrimdışı) */}
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2, color: C.goldDim, textAlign: "center", marginBottom: -2 }}>{t("menu.single").toUpperCase()} · {t("menu.singleHint")}</Text>
          {hasSave && (
            <Pressable onPress={() => router.push("/oyun")} style={{ paddingVertical: 16, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.6)", backgroundColor: C.gold, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 2, color: "#2a1d08" }}>{t("menu.continue")}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.push("/yeni-oyun")} style={{ paddingVertical: 16, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.6)", backgroundColor: hasSave ? "rgba(8,5,2,0.55)" : C.gold, alignItems: "center" }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 2, color: hasSave ? C.gold : "#2a1d08" }}>{t("menu.newGame")}</Text>
          </Pressable>

          {/* Çok Oyuncu (çevrimiçi paylaşımlı diyar) */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 2, color: C.goldDim }}>{t("menu.multiHint").toUpperCase()}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          </View>
          <Pressable onPress={() => { hap("tap"); router.push("/cok-oyunculu"); }} style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 15, borderRadius: 9, borderWidth: 1, borderColor: "rgba(111,160,192,0.6)", backgroundColor: "rgba(8,5,2,0.55)" }}>
            <GameIcon name="iliskiler" size={16} color="#6FA0C0" />
            <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 2, color: "#6FA0C0" }}>{t("menu.multi")}</Text>
            <View style={{ borderWidth: 1, borderColor: "rgba(111,160,192,0.5)", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 1, color: "#6FA0C0" }}>BETA</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Ayarlar penceresi */}
      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <Pressable onPress={() => setSettingsOpen(false)} style={{ flex: 1, backgroundColor: "rgba(4,3,1,0.78)", justifyContent: "center", paddingHorizontal: 22 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderHi, borderRadius: 14, padding: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{t("settings.title")}</Text>
              <Pressable onPress={() => setSettingsOpen(false)} hitSlop={10}><Text style={{ color: C.gold, fontSize: 18 }}>✕</Text></Pressable>
            </View>

            {/* Dil — açılır liste */}
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 8 }}>{t("menu.language")}</Text>
            <Pressable onPress={() => { hap("tap"); setLangOpen((o) => !o); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: C.card }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 15 }}>{activeLang.flag}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, letterSpacing: 0.5 }}>{activeLang.label}</Text>
              </View>
              <Text style={{ color: C.gold, fontSize: 12 }}>{langOpen ? "▲" : "▼"}</Text>
            </Pressable>
            {langOpen && (
              <View style={{ marginTop: 6, borderWidth: 1, borderColor: C.border, borderRadius: 9, overflow: "hidden" }}>
                {LANGS.map((l, i) => {
                  const active = l.code === lang;
                  return (
                    <Pressable key={l.code} onPress={() => { hap("selection"); setLang(l.code); setLangOpen(false); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 11, paddingHorizontal: 14, backgroundColor: active ? "rgba(201,168,76,0.16)" : C.bg, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.border }}>
                      <Text style={{ fontSize: 15 }}>{l.flag}</Text>
                      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: active ? C.gold : C.parchment, letterSpacing: 0.5 }}>{l.label}</Text>
                      {active && <Text style={{ color: C.gold, fontSize: 13 }}>✓</Text>}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Ses */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginTop: 16 }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.parchment }}>{t("settings.sound")}</Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>{t("settings.soundDesc")}</Text>
              </View>
              <Switch value={sound} onValueChange={toggleSound} trackColor={{ false: "#3a2f1c", true: "rgba(201,168,76,0.6)" }} thumbColor={sound ? C.gold : "#8a7a55"} />
            </View>
            {/* Titreşim */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginTop: 12 }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.parchment }}>{t("settings.haptics")}</Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>{t("settings.hapticsDesc")}</Text>
              </View>
              <Switch value={haptics} onValueChange={toggleHaptics} trackColor={{ false: "#3a2f1c", true: "rgba(201,168,76,0.6)" }} thumbColor={haptics ? C.gold : "#8a7a55"} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ImageBackground>
  );
}
