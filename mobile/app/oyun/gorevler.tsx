import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { playerWar, pendingPerkCount, nemesisEncounter, familyQuestsOf } from "../../lib/game";
import { arcById } from "../../lib/arcs";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel, PageHeader, Panel, ScreenFresk } from "../../lib/ui";

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
    if (state.pendingScene?.kind === "trial") tasks.push({ icon: "scroll", title: t("gv.trial.t"), sub: t("gv.trial.s"), to: "/oyun/suc", urgent: true });
    if (state.bloodline?.scene) tasks.push({ icon: "skull", title: t("gv.blood.t"), sub: t("gv.blood.s"), to: "/oyun/", urgent: true });
    if (state.saga?.scene) tasks.push({ icon: "scroll-open", title: t("gv.saga.t"), sub: t("gv.saga.s"), to: "/oyun/" });
    if (state.crownCampaign) tasks.push({ icon: "crossed-swords", title: t("gv.cmp.t"), sub: t("gv.cmp.s"), to: "/oyun/hanedan" });
    if (state.divan) tasks.push({ icon: "scales", title: t("gv.divan.t"), sub: t("gv.divan.s"), to: "/oyun/", urgent: true });
    if (state.micro) tasks.push({ icon: "hourglass", title: t("gv.micro.t"), sub: t("gv.micro.s"), to: "/oyun/" });
    if (state.caravan) tasks.push({ icon: "scales", title: t("gv.caravan.t"), sub: t("gv.caravan.s").replace("%s", state.caravan.dest), to: "/oyun/pazar" });
    if (!p.faction && p.age >= 13) tasks.push({ icon: "crown", title: t("gv.guild.t"), sub: t("gv.guild.s"), to: "/oyun/orgutler" });
    if (!p.married && p.age >= 18) tasks.push({ icon: "ring", title: t("gv.marry.t"), sub: t("gv.marry.s"), to: "/oyun/iliskiler" });
  }

  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.gorevler")} title={t("scr.gorevler")} sub={t("gv.hint")} />
        {tasks.length === 0 ? (
          <Panel><Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", paddingVertical: 14 }}>{t("gv.empty")}</Text></Panel>
        ) : (
          <Panel title={t("scr.gorevler")} noPad>
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

        {/* ── Aile / yaşam görevleri (family_quests portu) ── */}
        <Panel title={t("fq.panelTitle")} noPad>
          {familyQuestsOf(state).map(({ q, done, claimed, locked }, i, arr) => {
            const tone = claimed ? C.sage : done ? C.gold : locked ? C.parchmentMuted : C.parchmentDim;
            const status = claimed ? "✓" : done ? "★" : locked ? `${q.minAge}+` : "…";
            return (
              <View key={q.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: C.border, opacity: locked ? 0.55 : 1 }}>
                <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: claimed ? "rgba(127,166,106,0.5)" : "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                  <GameIcon name={q.icon} size={16} color={claimed ? C.sage : C.gold} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 12.5, color: claimed ? C.sage : C.parchment }}>{t("fq." + q.id + ".t")}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchmentMuted }}>{t("fq." + q.id + ".d")}</Text>
                </View>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: tone, width: 28, textAlign: "right" }}>{status}</Text>
              </View>
            );
          })}
        </Panel>
      </ScrollView>
    </ScreenFresk>
  );
}
