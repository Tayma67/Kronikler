import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { achievementsOf } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel } from "../../lib/ui";

export default function Basarimlar() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const list = achievementsOf(state);
  const done = list.filter((x) => x.done).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{t("scr.basarimlar")}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{done}/{list.length}</Text>
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 8 }}>
        Bir ömrün ve soyun nişaneleri.
      </Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {list.map(({ a, done }) => (
          <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: done ? "rgba(201,168,76,0.45)" : C.border, borderRadius: 10, padding: 13, marginBottom: 8, opacity: done ? 1 : 0.55 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: done ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: done ? "rgba(201,168,76,0.4)" : C.border }}>
              <GameIcon name={a.icon} size={18} color={done ? C.gold : C.parchmentMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: done ? C.parchment : C.parchmentMuted, letterSpacing: 0.5 }}>{a.name}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 2 }}>{a.desc}</Text>
            </View>
            {done && <GameIcon name="medal" size={16} color={C.gold} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
