import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { SKILL_META, PERKS, hasPerk, pendingPerkTier, choosePerk, SkillKey } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader, ProgressBar } from "../../lib/ui";

function Tree({ tree, icon }: { tree: SkillKey; icon: string }) {
  const { state, apply } = useGame();
  const { t } = useI18n();
  const p = state!.player;
  const lvl = p.skills[tree];
  const xp = p.skill_xp[tree];
  const inLevel = xp % 100;
  const pending = pendingPerkTier(p, tree);
  const tiers = [3, 6, 9];

  return (
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: pending ? "rgba(201,168,76,0.5)" : "rgba(201,168,76,0.22)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 9, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
          <GameIcon name={icon} size={20} color={C.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{t("skill." + tree)} · {t("bec.lv")} {lvl}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{t("skill." + tree + ".b")}</Text>
        </View>
      </View>
      <View style={{ marginTop: 10 }}><ProgressBar value={lvl >= 10 ? 100 : inLevel} max={100} color={C.gold} h={4} /></View>

      {tiers.map((tn) => {
        const tierPerks = PERKS.filter((pk) => pk.tree === tree && pk.tier === tn);
        const chosen = tierPerks.find((pk) => hasPerk(p, pk.id));
        const unlocked = lvl >= tn;
        const choosable = unlocked && !chosen && pending === tn;
        return (
          <View key={tn} style={{ marginTop: 12, opacity: unlocked ? 1 : 0.5 }}>
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2, color: C.goldDim, marginBottom: 6 }}>{t("bec.tierPerk").replace("%t", String(tn))} · {chosen ? t("bec.chosen") : unlocked ? t("bec.choose") : t("bec.locked")}</Text>
            {tierPerks.map((pk) => {
              const isChosen = chosen?.id === pk.id;
              return (
                <Pressable key={pk.id} disabled={!choosable} onPress={() => { hap("success"); apply((st) => choosePerk(st, pk.id)); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 6, borderColor: isChosen ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: isChosen ? "rgba(201,168,76,0.12)" : C.bg }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 12, color: isChosen ? C.gold : C.parchment }}>{t("perk." + pk.id + ".l")}</Text>
                    <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 1 }}>{t("perk." + pk.id + ".d")}</Text>
                  </View>
                  {isChosen && <GameIcon name="medal" size={14} color={C.gold} />}
                  {choosable && !isChosen && <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold, letterSpacing: 1 }}>{t("bec.pick")}</Text>}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

export default function Beceriler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.beceriler")} icon="🌿" title={t("scr.beceriler")} sub={t("bec.hint")} />
        {SKILL_META.map((m) => <Tree key={m.key} tree={m.key} icon={m.icon} />)}
      </ScrollView>
    </View>
  );
}
