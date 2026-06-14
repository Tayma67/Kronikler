import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { SUBJECTS, studySubject } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader, Panel } from "../../lib/ui";

export default function Mektep() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.mektep")} icon="🎓" title={t("scr.mektep")} sub={p.age < 18 ? t("mek.young") : t("mek.old")} />
        <Panel title={t("scr.mektep")} icon="📖" noPad>
          {SUBJECTS.map((sub, i) => (
            <Pressable key={sub.id} onPress={() => { hap('tap'); apply((s) => studySubject(s, sub.id)); }} disabled={p.dead} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderBottomWidth: i === SUBJECTS.length - 1 ? 0 : 1, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent" })}>
              <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                <GameIcon name={sub.icon} size={19} color={C.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{t("subj." + sub.id + ".l")}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{t("subj." + sub.id + ".d")}</Text>
              </View>
              <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold, letterSpacing: 1 }}>{t("mek.study")}</Text>
            </Pressable>
          ))}
        </Panel>
      </ScrollView>
    </View>
  );
}
