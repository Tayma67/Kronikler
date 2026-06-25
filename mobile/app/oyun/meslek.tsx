import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { changeProfession, PROFESSIONS, professionById, careerTier, hasProfAction, canProfAction, professionAction, profActionCooldownLeft } from "../../lib/game";
import { professionNameL, careerTitleL, PROF_L10N } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader, Panel, Pill } from "../../lib/ui";

export default function Meslek() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  if (p.age < 13) {
    return <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 16, padding: 20 }}>
      <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, marginTop: 30, textAlign: "center" }}>{t("mes.tooYoung")}</Text>
    </View>;
  }
  const curPr = professionById(p.profession);
  const tierIdx = curPr ? careerTier(curPr, p.career_xp) : 0;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.meslek")} title={t("scr.meslek")} sub={t("mes.switchWarn")} />

        {curPr && (
          <Panel title={professionNameL(p.profession, lang)} right={<Pill text={`${tierIdx + 1}/${curPr.tiers.length}`} />}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.gold, marginBottom: 8 }}>{careerTitleL(p.profession, p.career_xp, lang)}</Text>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {((PROF_L10N[lang] || PROF_L10N.tr)[p.profession]?.tiers || curPr.tiers).map((tt, i) => (
                <Text key={i} style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: i <= tierIdx ? C.gold : C.parchmentMuted, borderWidth: 1, borderColor: i <= tierIdx ? "rgba(201,168,76,0.5)" : C.border, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 }}>{tt.toUpperCase()}</Text>
              ))}
            </View>
          </Panel>
        )}

        {hasProfAction(p) && (() => {
          const can = canProfAction(state);
          const cd = profActionCooldownLeft(p, state.turn);
          return (
            <Panel title={t("prof.actTitle")}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: can ? C.gold : C.parchmentMuted }}>{t("prof.act." + p.profession + ".n")}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted, marginTop: 4, lineHeight: 18 }}>{t("prof.act." + p.profession + ".d")}</Text>
              <Pressable onPress={() => { if (!can) return; hap("success"); apply((s) => professionAction(s)); }} disabled={!can} style={{ marginTop: 10, paddingVertical: 11, borderRadius: 9, alignItems: "center", borderWidth: 1, borderColor: can ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: can ? "rgba(201,168,76,0.12)" : C.bg }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 0.5, color: can ? C.gold : C.parchmentMuted }}>{cd > 0 ? t("prof.actWait").replace("%1", String(cd)) : t("prof.act." + p.profession + ".n")}</Text>
              </Pressable>
            </Panel>
          );
        })()}

        <Panel title={t("scr.meslek")} noPad>
          {PROFESSIONS.map((pr, i) => {
            const cur = pr.id === p.profession;
            return (
              <Pressable key={pr.id} onPress={() => { hap("tap"); apply((s) => changeProfession(s, pr.id)); }} disabled={cur} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: i === PROFESSIONS.length - 1 ? 0 : 1, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : cur ? "rgba(201,168,76,0.06)" : "transparent" })}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 14, color: cur ? C.gold : C.parchment }}>{professionNameL(pr.id, lang)}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{t("st." + pr.stat)} · {pr.tiers.length} {t("mes.tier")}</Text>
                </View>
                {cur ? <Pill text={t("mes.current")} /> : <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold, letterSpacing: 1 }}>{t("mes.switch")} ›</Text>}
              </Pressable>
            );
          })}
        </Panel>
      </ScrollView>
    </View>
  );
}
