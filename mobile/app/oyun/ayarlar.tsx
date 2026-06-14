import { View, Text, Pressable, Alert, Switch, ScrollView } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { useI18n } from "../../lib/i18n";
import { LANGS } from "../../lib/locale-data";
import { isSoundEnabled, setSoundEnabled, playTap } from "../../lib/sound";
import { isHapticsEnabled, setHapticsEnabled, hap } from "../../lib/haptics";
import { C, F } from "../../lib/theme";

export default function Ayarlar() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, resetGame } = useGame();
  const { t, lang, setLang } = useI18n();
  const [sound, setSound] = useState(isSoundEnabled());
  const toggleSound = async (v: boolean) => { setSound(v); await setSoundEnabled(v); if (v) playTap(); };
  const [haptics, setHaptics] = useState(isHapticsEnabled());
  const toggleHaptics = async (v: boolean) => { setHaptics(v); await setHapticsEnabled(v); if (v) hap("selection"); };
  const reset = () => Alert.alert(t("settings.newLife"), t("settings.reset"), [
    { text: t("common.cancel"), style: "cancel" },
    { text: "✓", style: "destructive", onPress: async () => { await resetGame(); router.replace("/yeni-oyun"); } },
  ]);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>{t("common.back")}</Text></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{t("settings.title")}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
          <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: "45deg" }], marginHorizontal: 8 }} />
          <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
        </View>
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{t("settings.generation")}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment, marginTop: 4 }}>{state?.player.generation || 1}.</Text>
        </View>

        {/* Dil */}
        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.gold, marginBottom: 8, textTransform: "uppercase" }}>{t("menu.language")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {LANGS.map((l) => {
            const active = l.code === lang;
            return (
              <Pressable key={l.code} onPress={() => setLang(l.code)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: active ? "rgba(201,168,76,0.7)" : C.border, backgroundColor: active ? "rgba(201,168,76,0.18)" : C.card }}>
                <Text style={{ fontSize: 14 }}>{l.flag}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: active ? C.gold : C.parchment }}>{l.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.parchment }}>{t("settings.sound")}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>{t("settings.soundDesc")}</Text>
          </View>
          <Switch value={sound} onValueChange={toggleSound} trackColor={{ false: "#3a2f1c", true: "rgba(201,168,76,0.6)" }} thumbColor={sound ? C.gold : "#8a7a55"} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.parchment }}>{t("settings.haptics")}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>{t("settings.hapticsDesc")}</Text>
          </View>
          <Switch value={haptics} onValueChange={toggleHaptics} trackColor={{ false: "#3a2f1c", true: "rgba(201,168,76,0.6)" }} thumbColor={haptics ? C.gold : "#8a7a55"} />
        </View>
        <Pressable onPress={reset} style={{ paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(200,64,64,0.4)", backgroundColor: "rgba(200,64,64,0.08)", alignItems: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.blood }}>{t("settings.newLife")}</Text>
        </Pressable>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, textAlign: "center", marginTop: 24 }}>Kronikler: Küllerin Mirası</Text>
      </ScrollView>
    </View>
  );
}
