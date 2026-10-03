import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { changeProfession, PROFESSIONS, professionById, careerTier, hasProfAction, canProfAction, professionAction, profActionCooldownLeft, meslekSarti, meslekEksik, meslekSermaye, meslegeUygun, effStat, kariyerXp, sinavDurumu, ustalikSinavi, rakipAktif, rakipPuan, rakipYollari, rakipMeydan, rakipMeydanHazir, rakipMeydanKalan, rakipYarisi, rakipOrtaklik, rakipOrtaklikHazir, RAKIP_HEDEF, RAKIP_MEYDAN_BEDEL, cirakAlabilir, cirakAdaylari, cirakAl, cirakDers, cirakDersHazir, cirakDersKalan, cirakBekleAy, CIRAK_BEDEL, CIRAK_KOST, kademeOf } from "../../lib/game";
import { localFirstName } from "../../lib/world";
import { rakipAdi, rakipKartVerisi } from "../../lib/rakip-ui";
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
  const [yaris, setYaris] = useState<SinavKartiVeri | null>(null); // lonca bayrağı yarışı — aynı dondurma kuralı
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

        {/* Rakip Usta: çarşıda adın bir başkasınınkiyle anılır — lonca bayrağı yarışı */}
        {(() => {
          if (p.profession === "işsiz") return null;
          const r = p.rakip && p.rakip.prof === p.profession ? p.rakip : undefined;
          if (!r) return (
            <Panel title={t("rk.title")}>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentDim, lineHeight: 19 }}>{t("rk.hint")}</Text>
            </Panel>
          );
          const aktif = rakipAktif(p);
          const ben = rakipPuan(p, rakipYollari(p)[0]);
          const o = Math.round(r.huner);
          const olcek = Math.max(100, ben, o); // çubuklar ortak ölçekte
          const bar = (ad: string, v: number, renk: string) => (
            <View style={{ marginTop: 7 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchment }}>{ad}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: renk }}>{v}</Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: C.border, marginTop: 3, overflow: "hidden" }}>
                <View style={{ width: `${Math.round((v / olcek) * 100)}%`, height: 6, borderRadius: 3, backgroundColor: renk }} />
              </View>
            </View>
          );
          const kalan = r.yaris != null ? Math.max(1, 3 - (state.turn - r.yaris)) : 0;
          const meydanOk = rakipMeydanHazir(state);
          const btn = (label: string, onPress: () => void, dolu: boolean, disabled = false) => (
            <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={{ marginTop: 11, paddingVertical: 12, borderRadius: 9, borderWidth: 1.5, borderColor: disabled ? C.border : C.gold + "99", backgroundColor: dolu && !disabled ? C.gold : C.bg, alignItems: "center", opacity: disabled ? 0.55 : 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.2, color: dolu && !disabled ? C.inkOnGold : C.gold }}>{label}</Text>
            </Pressable>
          );
          return (
            <Panel title={t("rk.title")} right={<GameIcon name="banner" size={18} color={C.gold} />}>
              <Text style={{ fontFamily: F.display, fontSize: 15, color: C.gold }}>{rakipAdi(p, lang)}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentDim, marginTop: 2 }}>{applyParams(t("rk.huy"), [r.bilinen ? t("rk.m." + r.mizac) : t("rk.m.unknown")], lang)}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.goldDim, marginTop: 10 }}>{t("rk.skill").toUpperCase()}</Text>
              {bar(t("rk.you"), ben, ben >= o ? C.sage : C.ember)}
              {bar(rakipAdi(p, lang), o, C.blood)}
              <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchment, marginTop: 10 }}>{applyParams(t("rk.flags"), [r.galip, r.maglup, RAKIP_HEDEF], lang)}</Text>
              {r.bitti ? (
                <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: r.bitti === "yenik" ? C.ember : C.goldBright, marginTop: 6, lineHeight: 19 }}>{t("rk.end." + r.bitti)}</Text>
              ) : aktif && r.yaris != null ? (
                <>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.goldBright, marginTop: 6 }}>{applyParams(t("rk.pending"), [kalan], lang)}</Text>
                  {btn(t("rk.btnRace"), () => { hap("tap"); setYaris(rakipKartVerisi(state, t, lang)); }, true)}
                </>
              ) : aktif ? (
                <>
                  <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchmentDim, marginTop: 6 }}>{applyParams(t("rk.next"), [Math.max(1, r.next - state.turn)], lang)}</Text>
                  {btn(applyParams(t("rk.btnChallenge"), [RAKIP_MEYDAN_BEDEL], lang), () => { hap("tap"); const ns = rakipMeydan(state); apply(() => ns); setYaris(rakipKartVerisi(ns, t, lang)); }, false, !meydanOk)}
                  {rakipMeydanKalan(state) > 0 && <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginTop: 5, textAlign: "center" }}>{applyParams(t("rk.wait"), [rakipMeydanKalan(state)], lang)}</Text>}
                  {rakipOrtaklikHazir(p) ? btn(t("rk.btnPartner"), () => { hap("success"); apply((s) => rakipOrtaklik(s)); }, false)
                    : r.bilinen && r.mizac === "durust" ? <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginTop: 8, lineHeight: 17 }}>{t("rk.partnerHint")}</Text> : null}
                </>
              ) : null}
            </Panel>
          );
        })()}
        <SinavKartiModal v={yaris} onSec={(yol) => { const r = rakipYarisi(state, yol); if (r.basari != null) apply(() => r.state); return r.basari; }} onKapat={() => setYaris(null)} />

        {/* Çırak: ustalık yetiştirmektir — ders ver, kostunu öde, peştamalını kuşat */}
        {(() => {
          if (p.profession === "işsiz") return null;
          const c = p.cirak && p.cirak.prof === p.profession ? p.cirak : undefined;
          const sayac = (p.cirak_yetisen || p.cirak_kacan) ? <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted, marginTop: 8 }}>{applyParams(t("ck.raised"), [p.cirak_yetisen || 0, p.cirak_kacan || 0], lang)}</Text> : null;
          if (!c && kademeOf(p) < 2) return (
            <Panel title={t("ck.title")}>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentDim, lineHeight: 19 }}>{t("ck.hint")}</Text>
              {sayac}
            </Panel>
          );
          if (!c) {
            const adaylar = cirakAdaylari(state); const alabilir = cirakAlabilir(p, state.turn) && p.money >= CIRAK_BEDEL; const bekle = cirakBekleAy(state);
            return (
              <Panel title={t("ck.title")} right={<GameIcon name="graduate-cap" size={18} color={C.gold} />}>
                <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.goldDim }}>{t("ck.pick").toUpperCase()}</Text>
                {bekle > 0 && <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.ember, marginTop: 5 }}>{applyParams(t("ck.wait"), [bekle], lang)}</Text>}
                {adaylar.map((a, i) => (
                  <View key={i} style={{ marginTop: 9, padding: 10, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{localFirstName(a.seed, a.g, lang)}</Text>
                      <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold, letterSpacing: 0.5 }}>{t("ck.h." + a.huy)}</Text>
                    </View>
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentDim, marginTop: 3, lineHeight: 17 }}>{t("ck.hd." + a.huy)}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel={applyParams(t("ck.btnTake"), [CIRAK_BEDEL], lang)} disabled={!alabilir} onPress={() => { hap("success"); apply((st) => cirakAl(st, i)); }} style={{ marginTop: 8, paddingVertical: 9, borderRadius: 8, borderWidth: 1.2, borderColor: alabilir ? C.gold + "99" : C.border, alignItems: "center", opacity: alabilir ? 1 : 0.55 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.gold }}>{applyParams(t("ck.btnTake"), [CIRAK_BEDEL], lang)}</Text>
                    </Pressable>
                  </View>
                ))}
                <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted, marginTop: 8, lineHeight: 17 }}>{applyParams(t("ck.cost"), [CIRAK_KOST], lang)}</Text>
                {sayac}
              </Panel>
            );
          }
          const hazir = cirakDersHazir(state);
          return (
            <Panel title={t("ck.title")} right={<GameIcon name="graduate-cap" size={18} color={C.gold} />}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: F.display, fontSize: 15, color: C.gold }}>{localFirstName(c.seed, c.g, lang)}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentDim }}>{t("ck.h." + c.huy)}</Text>
              </View>
              <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchment, marginTop: 8 }}>{applyParams(t("ck.progress"), [Math.floor(c.ilerleme)], lang)}</Text>
              <View style={{ height: 7, borderRadius: 4, backgroundColor: C.border, marginTop: 4, overflow: "hidden" }}>
                <View style={{ width: `${Math.min(100, c.ilerleme)}%`, height: 7, borderRadius: 4, backgroundColor: C.gold }} />
              </View>
              {c.ihmal >= 2 && <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.ember, marginTop: 7 }}>{t("ck.neglect")}</Text>}
              <Pressable accessibilityRole="button" accessibilityLabel={t("ck.btnLesson")} disabled={!hazir} onPress={() => { hap("tap"); apply((st) => cirakDers(st)); }} style={{ marginTop: 11, paddingVertical: 12, borderRadius: 9, borderWidth: 1.5, borderColor: hazir ? C.gold + "99" : C.border, backgroundColor: hazir ? C.gold : C.bg, alignItems: "center", opacity: hazir ? 1 : 0.6 }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.2, color: hazir ? C.inkOnGold : C.parchmentMuted }}>{hazir ? t("ck.btnLesson") : cirakDersKalan(state) > 0 ? applyParams(t("ck.lessonWait"), [cirakDersKalan(state)], lang) : t("ck.lessonDone")}</Text>
              </Pressable>
              <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted, marginTop: 8, lineHeight: 17 }}>{applyParams(t("ck.cost"), [CIRAK_KOST], lang)}</Text>
              {sayac}
            </Panel>
          );
        })()}

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
