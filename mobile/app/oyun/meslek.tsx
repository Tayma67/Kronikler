import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { changeProfession, PROFESSIONS, professionById, careerTier } from "../../lib/game";
import { professionNameL, careerTitleL, PROF_L10N } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel } from "../../lib/ui";

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
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{t("scr.meslek")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {curPr && (
        <View style={{ marginHorizontal: 16, marginBottom: 10, padding: 13, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,168,76,0.45)", backgroundColor: "rgba(201,168,76,0.08)" }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{careerTitleL(p.profession, p.career_xp, lang)} · {professionNameL(p.profession, lang)}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>
            {t("mes.careerStep").replace("%a", String(careerTier(curPr, p.career_xp) + 1)).replace("%b", String(curPr.tiers.length))}
          </Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {((PROF_L10N[lang]||PROF_L10N.tr)[p.profession]?.tiers||curPr.tiers).map((t, i) => (
              <Text key={i} style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: i <= careerTier(curPr, p.career_xp) ? C.gold : C.parchmentMuted, borderWidth: 1, borderColor: i <= careerTier(curPr, p.career_xp) ? "rgba(201,168,76,0.5)" : C.border, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 }}>{t.toUpperCase()}</Text>
            ))}
          </View>
        </View>
      )}

      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 8 }}>
        {t("mes.switchWarn")}
      </Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {PROFESSIONS.map((pr) => {
          const cur = pr.id === p.profession;
          return (
            <Pressable key={pr.id} onPress={() => apply((s) => changeProfession(s, pr.id))} disabled={cur} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: cur ? "rgba(201,168,76,0.5)" : C.border, borderRadius: 10, padding: 14, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 14, color: cur ? C.gold : C.parchment }}>{professionNameL(pr.id, lang)}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{t("st." + pr.stat)} · {pr.tiers.length} {t("mes.tier")}</Text>
              </View>
              {cur ? <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.gold }}>{t("mes.current")}</Text> : <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>{t("mes.switch")}</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
