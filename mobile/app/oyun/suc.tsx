import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { doCrime } from "../../lib/game";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel } from "../../lib/ui";

export default function Suc() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const Crime = ({ kind, title, desc }: { kind: "yankesicilik" | "soygun"; title: string; desc: string }) => (
    <Pressable onPress={() => apply((s) => doCrime(s, kind))} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(123,63,191,0.35)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <Text style={{ fontFamily: F.display, fontSize: 13, color: C.ink }}>{title}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted, marginTop: 4 }}>{desc}</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{t("scr.suc")}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: 12 }}>{t("suc.hint")}</Text>
        {state.player.age < 13 ? <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted }}>{t("suc.tooYoung")}</Text> : <>
          <Crime kind="yankesicilik" title={t("crime.yankesicilik.l")} desc={t("crime.yankesicilik.d")} />
          <Crime kind="soygun" title={t("crime.soygun.l")} desc={t("crime.soygun.d")} />
        </>}
      </ScrollView>
    </View>
  );
}
