import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { SKILL_META, PERKS, hasPerk, pendingPerkTier, choosePerk, SkillKey } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader } from "../../lib/ui";

const TIERS = [3, 6, 9];
// Her beceri dalının ilgili özelliği (stat) + tonu.
const LINK: Record<SkillKey, { stat: "strength" | "intelligence" | "charisma" | "stamina"; tone: string }> = {
  combat:   { stat: "strength",     tone: "#E0922E" },
  trade:    { stat: "intelligence", tone: "#C9A84C" },
  crafting: { stat: "stamina",      tone: "#7FA66A" },
  social:   { stat: "charisma",     tone: "#6FA0C0" },
};

function Tree({ tree, icon }: { tree: SkillKey; icon: string }) {
  const { state, apply } = useGame();
  const { t } = useI18n();
  const p = state!.player;
  const lvl = p.skills[tree];
  const xp = p.skill_xp[tree];
  const inLevel = lvl >= 10 ? 100 : xp % 100;
  const pending = pendingPerkTier(p, tree);
  const link = LINK[tree];
  const nextTier = TIERS.find((tn) => lvl < tn);

  return (
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: pending ? link.tone + "AA" : link.tone + "33", borderRadius: 14, padding: 14, marginBottom: 14, overflow: "hidden" }}>
      {/* Başlık */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <View style={{ width: 46, height: 46, borderRadius: 11, backgroundColor: link.tone + "1A", borderWidth: 1.5, borderColor: link.tone + "66", alignItems: "center", justifyContent: "center" }}>
          <GameIcon name={icon} size={24} color={link.tone} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment }}>{t("skill." + tree)} · {t("bec.lv")} {lvl}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{t("skill." + tree + ".b")}</Text>
        </View>
        {pending != null && (
          <View style={{ backgroundColor: link.tone, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9 }}>
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: "#1a1206" }}>{t("bec.pick")}!</Text>
          </View>
        )}
      </View>

      {/* Seviye çubuğu */}
      <View style={{ marginTop: 11 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: C.parchmentMuted }}>{t("bec.grows").toUpperCase()}: {t("bec.how." + tree)}</Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <View style={{ width: `${inLevel}%`, height: 6, borderRadius: 3, backgroundColor: link.tone }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentDim }}>{t("bec.stat")}: {t("st." + link.stat)} {p.stats[link.stat]}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 9, color: link.tone }}>{nextTier ? applyParams(t("bec.next"), [nextTier]) : t("bec.maxed")}</Text>
        </View>
      </View>

      {/* ── Ağaç: omurga + kademe düğümleri ── */}
      <View style={{ marginTop: 14 }}>
        {TIERS.map((tn, ti) => {
          const tierPerks = PERKS.filter((pk) => pk.tree === tree && pk.tier === tn);
          const chosen = tierPerks.find((pk) => hasPerk(p, pk.id));
          const unlocked = lvl >= tn;
          const choosable = unlocked && !chosen && pending === tn;
          const nodeFill = chosen ? link.tone : choosable ? link.tone : "rgba(255,255,255,0.06)";
          const nodeBorder = unlocked ? link.tone : "rgba(255,255,255,0.18)";
          return (
            <View key={tn} style={{ flexDirection: "row" }}>
              {/* Sol ray: bağ çizgisi + düğüm */}
              <View style={{ width: 34, alignItems: "center" }}>
                {ti > 0 && <View style={{ position: "absolute", top: 0, height: 22, width: 2, backgroundColor: unlocked ? link.tone + "88" : "rgba(255,255,255,0.12)" }} />}
                <View style={{ marginTop: 14, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: nodeBorder, backgroundColor: nodeFill, alignItems: "center", justifyContent: "center" }}>
                  {chosen ? <GameIcon name="medal" size={12} color="#1a1206" /> : <Text style={{ fontFamily: F.display, fontSize: 10, color: unlocked ? (choosable ? "#1a1206" : link.tone) : C.parchmentMuted }}>{tn}</Text>}
                </View>
                {ti < TIERS.length - 1 && <View style={{ flex: 1, marginTop: 2, width: 2, backgroundColor: lvl >= TIERS[ti + 1] ? link.tone + "88" : "rgba(255,255,255,0.12)" }} />}
              </View>

              {/* Sağ: kademe içeriği */}
              <View style={{ flex: 1, paddingBottom: 14, paddingTop: 12, opacity: unlocked ? 1 : 0.55 }}>
                <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: link.tone, marginBottom: 6 }}>
                  {t("bec.tierPerk").replace("%t", String(tn))} {chosen ? t("bec.chosen") : unlocked ? t("bec.choose") : t("bec.locked")}
                </Text>
                {tierPerks.map((pk) => {
                  const isChosen = chosen?.id === pk.id;
                  const dimmed = !!chosen && !isChosen;
                  return (
                    <Pressable key={pk.id} disabled={!choosable} onPress={() => { hap("success"); apply((st) => choosePerk(st, pk.id)); }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 9, borderWidth: 1, marginBottom: 6,
                        borderColor: isChosen ? link.tone + "99" : choosable ? link.tone + "55" : C.border,
                        backgroundColor: isChosen ? link.tone + "1F" : C.bg, opacity: dimmed ? 0.4 : 1 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: F.display, fontSize: 12, color: isChosen ? link.tone : C.parchment }}>{t("perk." + pk.id + ".l")}</Text>
                        <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 1 }}>{t("perk." + pk.id + ".d")}</Text>
                      </View>
                      {isChosen && <GameIcon name="medal" size={14} color={link.tone} />}
                      {choosable && !isChosen && <Text style={{ fontFamily: F.display, fontSize: 10, color: link.tone, letterSpacing: 1 }}>{t("bec.pick")}</Text>}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 100 }}>
        <PageHeader kicker={t("scr.beceriler")} title={t("scr.beceriler")} sub={t("bec.intro")} />
        {SKILL_META.map((m) => <Tree key={m.key} tree={m.key} icon={m.icon} />)}
      </ScrollView>
    </View>
  );
}
