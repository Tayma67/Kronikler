import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { doCrime } from "../../lib/game";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader } from "../../lib/ui";

export default function Suc() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const Crime = ({ kind, title, desc }: { kind: "yankesicilik" | "soygun"; title: string; desc: string }) => (
    <Pressable onPress={() => { hap("advance"); apply((s) => doCrime(s, kind)); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(123,79,175,0.4)", borderLeftWidth: 2.5, borderLeftColor: C.ink, borderRadius: 11, padding: 14, marginBottom: 10 }}>
      <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: "rgba(123,79,175,0.12)", borderWidth: 1, borderColor: "rgba(123,79,175,0.35)", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 18 }}>🗡</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.ink }}>{title}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentMuted, marginTop: 3 }}>{desc}</Text>
      </View>
      <Text style={{ color: C.ink, fontSize: 15 }}>›</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.suc")} icon="🥷" title={t("scr.suc")} sub={t("suc.hint")} />
        {state.player.age < 13 ? (
          <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, textAlign: "center", marginTop: 10 }}>{t("suc.tooYoung")}</Text>
        ) : (
          <>
            <Crime kind="yankesicilik" title={t("crime.yankesicilik.l")} desc={t("crime.yankesicilik.d")} />
            <Crime kind="soygun" title={t("crime.soygun.l")} desc={t("crime.soygun.d")} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
