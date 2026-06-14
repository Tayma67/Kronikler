import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { playerWar, pendingPerkCount, nemesisEncounter } from "../../lib/game";
import { arcById } from "../../lib/arcs";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel, PageHeader, Panel } from "../../lib/ui";

export default function Gorevler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;

  type Task = { icon: string; title: string; sub: string; to: string; urgent?: boolean };
  const tasks: Task[] = [];
  if (p.dead) {
    if (p.children.length > 0) tasks.push({ icon: "baby", title: t("gv.heir.t"), sub: t("gv.heir.s"), to: "/oyun/nesil", urgent: true });
  } else {
    if (p.stat_points > 0) tasks.push({ icon: "shield", title: t("gv.statpts.t").replace("%n", String(p.stat_points)), sub: t("gv.statpts.s"), to: "/oyun/karakter", urgent: true });
    if (pendingPerkCount(p) > 0) tasks.push({ icon: "medal", title: `${pendingPerkCount(p)} ${t("char.perksAvail")}`, sub: t("gv.perks.s"), to: "/oyun/beceriler", urgent: true });
    const arc = arcById(state.story.active?.id || null);
    if (arc) tasks.push({ icon: arc.icon, title: `${t("gv.story.pre")}${t("arc." + arc.id + ".t")}`, sub: t("gv.story.s"), to: "/oyun/hikayeler", urgent: true });
    const war = playerWar(state);
    if (war) tasks.push({ icon: "crossed-swords", title: t("gv.war.t"), sub: t("gv.war.s"), to: "/oyun/orgutler" });
    if (nemesisEncounter(state)) tasks.push({ icon: "skull", title: t("gv.nemesis.t"), sub: t("gv.nemesis.s"), to: "/oyun/savas", urgent: true });
    if (state.caravan) tasks.push({ icon: "scales", title: t("gv.caravan.t"), sub: t("gv.caravan.s").replace("%s", state.caravan.dest), to: "/oyun/pazar" });
    if (!p.faction && p.age >= 13) tasks.push({ icon: "crown", title: t("gv.guild.t"), sub: t("gv.guild.s"), to: "/oyun/orgutler" });
    if (!p.married && p.age >= 18) tasks.push({ icon: "ring", title: t("gv.marry.t"), sub: t("gv.marry.s"), to: "/oyun/iliskiler" });
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.gorevler")} icon="📋" title={t("scr.gorevler")} sub={t("gv.hint")} />
        {tasks.length === 0 ? (
          <Panel><Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", paddingVertical: 14 }}>{t("gv.empty")}</Text></Panel>
        ) : (
          <Panel title={t("scr.gorevler")} icon="⚜" noPad>
            {tasks.map((tk, i) => (
              <Pressable key={i} onPress={() => router.push(tk.to as any)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: i === tasks.length - 1 ? 0 : 1, borderBottomColor: C.border, borderLeftWidth: tk.urgent ? 2.5 : 0, borderLeftColor: C.gold, backgroundColor: pressed ? C.cardHi : "transparent" })}>
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: tk.urgent ? "rgba(201,168,76,0.45)" : "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                  <GameIcon name={tk.icon} size={18} color={tk.urgent ? C.gold : C.goldDim} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{tk.title}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }} numberOfLines={1}>{tk.sub}</Text>
                </View>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>›</Text>
              </Pressable>
            ))}
          </Panel>
        )}
      </ScrollView>
    </View>
  );
}
