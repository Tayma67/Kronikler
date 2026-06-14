import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { achievementsOf } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel, PageHeader, Pill } from "../../lib/ui";

export default function Basarimlar() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const list = achievementsOf(state);
  const done = list.filter((x) => x.done).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Pill text={`${done}/${list.length}`} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.basarimlar")} icon="🏆" title={t("scr.basarimlar")} sub={t("ach.subtitle")} />
        {list.map(({ a, done }) => (
          <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: done ? "rgba(201,168,76,0.45)" : C.border, borderRadius: 11, padding: 13, marginBottom: 8, opacity: done ? 1 : 0.55 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: done ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: done ? "rgba(201,168,76,0.4)" : C.border }}>
              <GameIcon name={a.icon} size={19} color={done ? C.gold : C.parchmentMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: done ? C.parchment : C.parchmentMuted, letterSpacing: 0.5 }}>{t("ach." + a.id + ".l")}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 2 }}>{t("ach." + a.id + ".d")}</Text>
            </View>
            {done && <GameIcon name="medal" size={16} color={C.gold} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
