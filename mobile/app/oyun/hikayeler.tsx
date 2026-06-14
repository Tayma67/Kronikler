import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { beginArc, advanceArc } from "../../lib/game";
import { arcById, availableArcs } from "../../lib/arcs";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel, PageHeader, Panel, SectionHead } from "../../lib/ui";

export default function Hikayeler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const st = state.story;
  const active = arcById(st.active?.id || null);
  const stage = active && st.active ? active.stages[st.active.stage] : null;
  const avail = availableArcs(p, st.completed, st.tension, st.active?.id || null);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.hikayeler")} icon="📖" title={t("scr.hikayeler")} />

        {active && stage ? (
          <Panel title={t("arc." + active.id + ".t")} icon="✦" tone={C.gold}>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment, lineHeight: 22, marginBottom: 14 }}>{t("arc." + active.id + "." + st.active!.stage + ".x")}</Text>
            {stage.choices.map((c, i) => (
              <Pressable key={i} onPress={() => apply((s) => advanceArc(s, i, { result: t("arc." + active.id + "." + st.active!.stage + ".r" + i), endLabel: t("hik.ended").replace("%s", t("arc." + active.id + ".t")) }))} style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", marginBottom: 9 }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment, letterSpacing: 0.5, textAlign: "center" }}>{t("arc." + active.id + "." + st.active!.stage + ".c" + i)}</Text>
              </Pressable>
            ))}
          </Panel>
        ) : (
          <Panel><Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", paddingVertical: 10 }}>{t("hik.none")}</Text></Panel>
        )}

        {!active && avail.length > 0 && (
          <>
            <SectionHead title={t("hik.awaiting")} />
            {avail.map((a) => (
              <Panel key={a.id} title={t("arc." + a.id + ".t")} icon="✦">
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: 10 }}>{t("arc." + a.id + ".b")}</Text>
                <Pressable onPress={() => apply((s) => beginArc(s, a.id))} style={{ alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.1)" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold, letterSpacing: 1 }}>{t("hik.begin")}</Text>
                </Pressable>
              </Panel>
            ))}
          </>
        )}

        {st.completed.length > 0 && (
          <Panel title={t("hik.completed")} icon="✓" tone={C.sage} noPad>
            {st.completed.map((id, i) => {
              const a = arcById(id); if (!a) return null;
              return (
                <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: i === st.completed.length - 1 ? 0 : 1, borderBottomColor: C.border }}>
                  <GameIcon name={a.icon} size={15} color={C.goldDim} />
                  <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted }}>{t("arc." + a.id + ".t")}</Text>
                  <Text style={{ color: C.sage }}>✓</Text>
                </View>
              );
            })}
          </Panel>
        )}
      </ScrollView>
    </View>
  );
}
