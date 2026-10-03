import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { changeProfession, PROFESSIONS, professionById, careerTier, hasProfAction, canProfAction, professionAction, profActionCooldownLeft, meslekSarti, meslekEksik, meslekSermaye, meslegeUygun, effStat, kariyerXp, sinavDurumu, ustalikSinavi } from "../../lib/game";
import { SinavKartiModal, SinavKartiVeri } from "../../lib/kart3d";
import { professionNameL, careerTitleL, PROF_L10N } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams } from "../../lib/i18n";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader, Panel, Pill, ScreenFresk } from "../../lib/ui";

export default function Meslek() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const [sinav, setSinav] = useState<SinavKartiVeri | null>(null); // açılışta dondurulur: sonuç gelince kademe değişse de kart kapanana dek aynı kalır
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  if (p.age < 13) {
    return <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 16, padding: 20 }}>
      <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, marginTop: 30, textAlign: "center" }}>{t("mes.tooYoung")}</Text>
    </View>;
  }
  const curPr = professionById(p.profession);
  const tierIdx = curPr ? careerTier(curPr, kariyerXp(p)) : 0;
  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.meslek")} title={t("scr.meslek")} sub={t("mes.switchWarn")} />

        {/* Ahilik: kademe hizmetle değil peştamal sınavıyla kazanılır */}
        {(() => {
          const d = sinavDurumu(state);
          if (!d || p.profession === "işsiz") return null;
          const hedefUnvan = careerTitleL(p.profession, d.hedef * 30, lang);
          const durum = d.zirve ? t("ahi.top") : d.hazir ? t("ahi.ready") : d.bekleAy > 0 ? applyParams(t("ahi.cool"), [d.bekleAy], lang) : applyParams(t("ahi.wait"), [d.hizmetAy], lang);
          return (
            <Panel title={t("ahi.title")}>
              <Text style={{ fontFamily: F.display, fontSize: 14, color: C.gold }}>{careerTitleL(p.profession, kariyerXp(p), lang)}{!d.zirve ? `  →  ${hedefUnvan}` : ""}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: d.hazir ? C.goldBright : C.parchmentDim, marginTop: 4, lineHeight: 19 }}>{durum}</Text>
              {(p.sinav_gecme || p.sinav_kalma) ? <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted, marginTop: 4 }}>{applyParams(t("ahi.record"), [p.sinav_gecme || 0, p.sinav_kalma || 0], lang)}</Text> : null}
              {d.hazir && (
                <Pressable accessibilityRole="button" accessibilityLabel={t("ahi.btn")} onPress={() => { hap("tap"); setSinav({ prof: p.profession, hedefUnvan, yollar: d.yollar, oranlar: d.oranlar }); }} style={{ marginTop: 11, paddingVertical: 12, borderRadius: 9, borderWidth: 1.5, borderColor: C.gold + "99", backgroundColor: C.gold, alignItems: "center" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.inkOnGold }}>{t("ahi.btn")}</Text>
                </Pressable>
              )}
            </Panel>
          );
        })()}
        <SinavKartiModal v={sinav} onSec={(yol) => { const r = ustalikSinavi(state, yol); if (r.basari != null) apply(() => r.state); return r.basari; }} onKapat={() => setSinav(null)} />

        {curPr && (
          <Panel title={professionNameL(p.profession, lang)} right={<Pill text={`${tierIdx + 1}/${curPr.tiers.length}`} />}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.gold, marginBottom: 8 }}>{careerTitleL(p.profession, kariyerXp(p), lang)}</Text>
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
                <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 0.5, color: can ? C.gold : C.parchmentMuted }}>{cd > 0 ? t("prof.actWait").replace("%1", String(cd)) : (!can && p.hunger < 18) ? t("mek.hungry") : t("prof.act." + p.profession + ".n")}</Text>
              </Pressable>
            </Panel>
          );
        })()}

        <Panel title={t("scr.meslek")} noPad>
          {PROFESSIONS.map((pr, i) => {
            const cur = pr.id === p.profession;
            // Meslek hak edilir: yetenek (özellik) + emek (beceri tecrübesi) + gerekirse sermaye. Eksik şart kırmızı, yanında sendeki değer.
            const m = meslekSarti(pr.id); const ek = meslekEksik(state, pr.id); const ser = meslekSermaye(state, pr.id);
            const kilit = !cur && !meslegeUygun(state, pr.id);
            const acik = !!m && m.statMin === 0 && m.xpMin === 0 && !m.sermaye;
            const sart = (txt: string, eksik: boolean, sende: string) => (
              <Text key={txt} style={{ fontFamily: F.serif, fontSize: 12, color: eksik ? C.blood : C.sage, lineHeight: 17 }}>{txt}{eksik ? `  ·  ${t("mes.youHave").replace("%1", sende)}` : ""}</Text>
            );
            return (
              <Pressable key={pr.id} accessibilityRole="button" accessibilityState={{ disabled: cur || p.dead || kilit }} accessibilityLabel={professionNameL(pr.id, lang)} onPress={() => { if (p.dead || kilit) return; hap("tap"); apply((s) => changeProfession(s, pr.id)); }} disabled={cur || p.dead || kilit} style={({ pressed }) => ({ opacity: kilit ? 0.8 : 1, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: i === PROFESSIONS.length - 1 ? 0 : 1, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : cur ? "rgba(201,168,76,0.06)" : "transparent" })}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 14, color: cur ? C.gold : C.parchment }}>{professionNameL(pr.id, lang)}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted }}>{t("st." + pr.stat)} · {pr.tiers.length} {t("mes.tier")}</Text>
                  {!cur && m && (acik ? (
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.sage, marginTop: 3 }}>{t("mes.open")}</Text>
                  ) : (
                    <View style={{ marginTop: 4 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1, color: C.parchmentMuted, marginBottom: 1 }}>{t("mes.need").toUpperCase()}</Text>
                      {m.statMin > 0 && sart(`${t("st." + m.stat)} ${m.statMin}`, ek.stat, String(Math.floor(effStat(p, m.stat))))}
                      {m.xpMin > 0 && sart(applyParams(t("mes.xp"), [t("skill." + m.skill), m.xpMin], lang), ek.xp, String(p.skill_xp?.[m.skill] || 0))}
                      {ser > 0 && sart(t("mes.capital").replace("%1", String(ser)), ek.sermaye, String(Math.floor(p.money)))}
                    </View>
                  ))}
                </View>
                {cur ? <Pill text={t("mes.current")} /> : kilit ? <GameIcon name="hourglass" size={16} color={C.parchmentMuted} /> : <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold, letterSpacing: 1 }}>{t("mes.switch")}</Text>}
              </Pressable>
            );
          })}
        </Panel>
      </ScrollView>
    </ScreenFresk>
  );
}
