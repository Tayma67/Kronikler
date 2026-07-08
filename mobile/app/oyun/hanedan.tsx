import { useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Image } from "react-native";
import { armaImage } from "../../lib/assets";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { playVictory, playChime } from "../../lib/sound";
import {
  playerHousePower, houseAttitude, dynastyPower, houseSeal,
  WILL_STYLES, throneRequirements, throneBacking, canClaimThrone, throneOdds, claimThrone, THRONE_COST,
  canFoundSettlement, foundSettlement, settlementIncome, settleFee, SETTLE_MAX, SETTLE_TIER, developSettlement, developSettlementCost,
  nextSettleTier, canUpgradeSettleTier, upgradeSettleTier, propsInLoc,
  PRESTIGE, prestigeCost, fundPrestige, MARKET_LEVER_MIN, marketLeverCost, canManipulateMarket, manipulateMarket,
  acceptDynastyOffer, declineDynastyOffer,
  feudPeaceCost, feudSuePeace, feudStrike, proposeToHouse, sendEnvoy, ENVOY_COST, demandTribute, inflationFactor,
  startPlot, hirePlotHelper, plotCost, plotHelperCost,
  listenWhispers, cutThread, listenCost, cutThreadCost,
  appointOfficer, dismissOfficer, courtAppointCost, courtWage, COURT_OFFICES, CourtOffice,
  crownAuthorityOf, CROWN_DECREES, canIssueDecree, issueDecree, decreeCooldownLeft,
  campaignTargets, canLaunchCampaign, campaignOdds, launchCampaign, CAMPAIGN_COST,
  appointableCities, canAppointGovernor, appointGovernor, dismissGovernor, APPOINT_FEE, crownTribute,
  inCourt, courtRankId,
  suppressPretender, reconcilePretender, PRETENDER_SUPPRESS_COST, PRETENDER_RECONCILE_COST,
  ESTATE_TIERS, estateCost, upgradeEstate, VAKIF_DONATE_AMOUNTS, VAKIF_TIERS, donateVakif } from "../../lib/game";
import { generateDynasties, houseName as rivalHouseName, localFirstName } from "../../lib/world";
import { professionNameL, placeName } from "../../lib/locale-data";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams, renderEvt } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader, ScreenFresk } from "../../lib/ui";

function attKey(a: number) { return a >= 40 ? "dost" : a >= 10 ? "dostane" : a > -10 ? "tarafsiz" : a > -40 ? "soguk" : "hasim"; }
function attTone(a: number) { return a >= 10 ? C.sage : a > -10 ? C.parchmentMuted : a > -40 ? C.ember : C.blood; }

function SecTitle({ children }: { children: string }) {
  return <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginTop: 18, marginBottom: 9 }}>{children}</Text>;
}

export default function Hanedan() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  const [settleName, setSettleName] = useState("");
  const [throneMsg, setThroneMsg] = useState<null | { ok: boolean; tick: number }>(null);
  const [campMsg, setCampMsg] = useState<null | { ok: boolean; tick: number; key?: string }>(null);
  const baseRivals = useMemo(() => (state ? (state.rivals ?? generateDynasties(state.seed)) : []), [state?.seed, state?.rivals]);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const past = state.dynasty || [];
  const settlements = state.settlements || [];
  const profL = (id: string) => id === "işsiz" ? t("dyn.noProfession") : professionNameL(id, lang);
  const houseName = t("dyn.houseOf").replace("%s", p.surname || p.name);
  const power = dynastyPower(state);
  const seal = houseSeal(power);
  const reqs = throneRequirements(state);
  const backing = throneBacking(p);
  const claimable = canClaimThrone(state);
  const settleChk = canFoundSettlement(state);

  const doClaim = () => { hap("success"); const r = claimThrone(state); apply(() => r.state); setThroneMsg({ ok: r.success, tick: Date.now() }); };
  const doCampaign = (id: string) => { hap("success"); const r = launchCampaign(state, id); apply(() => r.state); setCampMsg({ ok: r.success, tick: Date.now(), key: r.success ? "crown.campaignStartedShort" : undefined }); };
  const doFound = () => { if (!settleChk.ok || !settleName.trim()) return; hap("success"); apply((s) => foundSettlement(s, settleName)); setSettleName(""); };
  const setWill = (id: string) => { hap("tap"); apply((s) => { s.player.will_pref = id; return s; }); };

  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, letterSpacing: 1 }}>{t("scr.hanedan")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("dyn.kicker")} title={houseName} sub={t("dyn.rivalsHint")} />

        {/* ── KAN DAVASI ── aktif dava: aşama, ısı ve oyuncu hamleleri (sulh / karşılık / meydan savaşı) */}
        {state.feud && (() => {
          const f = state.feud!;
          const fname = rivalHouseName(f.nameIdx, lang);
          const acted = f.act_turn === state.turn;
          const cost = feudPeaceCost(state);
          return (
            <View style={{ backgroundColor: "rgba(160,48,42,0.08)", borderWidth: 1, borderColor: "rgba(160,48,42,0.5)", borderRadius: 14, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <GameIcon name="crossed-swords" size={16} color={C.blood} />
                <Text style={{ flex: 1, fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.blood }}>{t("feud.title").toUpperCase()}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 10, color: C.parchmentDim }}>{t("feud.stage" + f.stage)}</Text>
              </View>
              <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment, marginTop: 8 }}>{applyParams(t("feud.body"), [fname])}</Text>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: "rgba(160,48,42,0.18)", marginTop: 10, overflow: "hidden" }}>
                <View style={{ width: `${Math.min(100, f.heat)}%`, height: "100%", backgroundColor: C.blood }} />
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentMuted, marginTop: 3 }}>{t("feud.heat")}: {f.heat}/100</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <Pressable disabled={acted || p.money < cost} onPress={() => { hap("tap"); apply((s) => feudSuePeace(s)); }} style={{ flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.45)", backgroundColor: "rgba(201,168,76,0.08)", alignItems: "center", opacity: acted || p.money < cost ? 0.4 : 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>{t("feud.sue")}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.parchmentMuted, marginTop: 1 }}>{cost} ⚜</Text>
                </Pressable>
                <Pressable disabled={acted || p.age < 16} onPress={() => { hap("advance"); apply((s) => feudStrike(s)); }} style={{ flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: "rgba(160,48,42,0.55)", backgroundColor: "rgba(160,48,42,0.14)", alignItems: "center", opacity: acted || p.age < 16 ? 0.4 : 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: C.blood }}>{f.stage >= 3 ? t("feud.battle") : t("feud.strike")}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.parchmentMuted, marginTop: 1 }}>{f.stage >= 3 ? t("feud.battleSub") : t("feud.strikeSub")}</Text>
                </Pressable>
              </View>
              {acted && <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentMuted, marginTop: 7, textAlign: "center" }}>{t("feud.acted")}</Text>}
            </View>
          );
        })()}

        {/* ── HANEDAN MÜHRÜ ── */}
        <View style={{ backgroundColor: "rgba(201,168,76,0.07)", borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderRadius: 14, padding: 18, alignItems: "center", marginBottom: 10 }}>
          <Image source={armaImage(p.surname || p.name)} style={{ width: 72, height: 72, borderRadius: 10, borderWidth: 1.5, borderColor: C.gold, marginBottom: 8 }} resizeMode="cover" />
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2.5, color: C.goldDim, textTransform: "uppercase" }}>{t("dyn.seal")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 44, color: C.gold, marginTop: 2 }}>{power}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchment, marginTop: 2 }}>{t("seal." + seal.key)}</Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
            <View style={{ backgroundColor: "rgba(201,168,76,0.16)", borderRadius: 14, paddingVertical: 3, paddingHorizontal: 11 }}>
              <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 0.5, color: C.gold }}>{p.generation}. {t("misc.generation")}</Text>
            </View>
            {p.crowned && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.gold, borderRadius: 14, paddingVertical: 3, paddingHorizontal: 11 }}>
                <GameIcon name="crown" size={11} color={C.inkOnGold} />
                <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 0.5, color: C.inkOnGold }}>{t("dyn.headWord")}</Text>
              </View>
            )}
            {!p.crowned && inCourt(p) && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(201,168,76,0.16)", borderRadius: 14, paddingVertical: 3, paddingHorizontal: 11 }}>
                <GameIcon name="scroll" size={11} color={C.gold} />
                <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 0.5, color: C.gold }}>{t("court.rank." + courtRankId(p))}</Text>
              </View>
            )}
          </View>
          {/* Aile özeti */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, alignSelf: "stretch" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><GameIcon name="karakter" size={12} color={C.goldDim} /><Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentDim }}>{p.name}</Text></View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><GameIcon name="ring" size={12} color={C.goldDim} /><Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentDim }}>{p.married ? (p.spouse_seed != null ? localFirstName(p.spouse_seed, p.gender === "erkek" ? "kadın" : "erkek", lang) : (p.spouse_name || t("dyn.unwed"))) : t("dyn.unwed")}</Text></View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><GameIcon name="baby" size={12} color={C.goldDim} /><Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentDim }}>{p.children.length}</Text></View>
            {(p.grandchildren?.length || 0) > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><GameIcon name="family" size={12} color={C.goldDim} /><Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentDim }}>{p.grandchildren!.length}</Text></View>
            )}
          </View>
          <Pressable onPress={() => { hap("tap"); router.push("/oyun/nesil"); }} style={{ marginTop: 10 }}>
            <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 0.5, color: C.gold }}>{t("dyn.manageHeirs")} ›</Text>
          </Pressable>
        </View>

        {/* ── VASİYET ── */}
        <SecTitle>{t("dyn.will")}</SecTitle>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, marginBottom: 9 }}>{t("dyn.willHint")}</Text>
        {WILL_STYLES.map((w) => {
          const sel = (p.will_pref || "esit") === w.id;
          return (
            <Pressable key={w.id} onPress={() => setWill(w.id)} style={{ padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 7, borderColor: sel ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: sel ? "rgba(201,168,76,0.12)" : C.card }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: F.display, fontSize: 12.5, color: sel ? C.gold : C.parchment }}>{t("will." + w.id + ".l")}</Text>
                {sel && <Text style={{ color: C.gold, fontSize: 13 }}>✓</Text>}
              </View>
              <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 2 }}>{t("will." + w.id + ".d")}</Text>
            </Pressable>
          );
        })}

        {/* ── TAHT YOLU ── */}
        <SecTitle>{t("dyn.throne")}</SecTitle>
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: claimable ? "rgba(201,168,76,0.5)" : C.border, borderRadius: 12, padding: 14 }}>
          {p.crowned ? (
            <View>
            <View style={{ alignItems: "center", paddingVertical: 6 }}>
              <GameIcon name="crown" size={30} color={C.gold} />
              <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.gold, textAlign: "center", marginTop: 6, lineHeight: 20 }}>{t("thr.crowned")}</Text>
            </View>
            {/* Taht İddiacısı — taç rahat durmaz: bastır (sert) ya da uzlaş (onurlu), yoksa iç savaş kapıda */}
            {state.pretender && (() => {
              const ph = (state.rivals || []).find((h) => h.id === state.pretender!.houseId);
              if (!ph) return null;
              const str = state.pretender!.strength;
              const acted = p.crown_action_turn === state.turn;
              return (
                <View style={{ marginTop: 10, borderWidth: 1.5, borderColor: "rgba(200,64,64,0.55)", backgroundColor: "rgba(200,64,64,0.07)", borderRadius: 11, padding: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                    <GameIcon name="crossed-swords" size={14} color={C.blood} />
                    <Text style={{ flex: 1, fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.blood, textTransform: "uppercase" }}>{t("dyn.pret.title")}</Text>
                    <Text style={{ fontFamily: F.display, fontSize: 11, color: C.blood }}>{str}/100</Text>
                  </View>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchment, marginTop: 6, lineHeight: 17 }}>
                    {applyParams(t("dyn.pret.body"), [ph.nameIdx != null ? rivalHouseName(ph.nameIdx, lang) : ph.name])}
                  </Text>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.4)", overflow: "hidden", marginTop: 8 }}>
                    <View style={{ width: `${str}%`, height: "100%", backgroundColor: C.blood }} />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <Pressable disabled={acted || p.money < PRETENDER_SUPPRESS_COST} onPress={() => { hap("advance"); apply((x) => suppressPretender(x)); }} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(200,64,64,0.6)", backgroundColor: "rgba(200,64,64,0.14)", opacity: (acted || p.money < PRETENDER_SUPPRESS_COST) ? 0.45 : 1 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 0.5, color: C.blood }}>{t("dyn.pret.suppress")} · {PRETENDER_SUPPRESS_COST}⚜</Text>
                    </Pressable>
                    <Pressable disabled={acted || p.money < PRETENDER_RECONCILE_COST} onPress={() => { hap("success"); apply((x) => reconcilePretender(x)); }} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.55)", backgroundColor: "rgba(201,168,76,0.12)", opacity: (acted || p.money < PRETENDER_RECONCILE_COST) ? 0.45 : 1 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 0.5, color: C.gold }}>{t("dyn.pret.reconcile")} · {PRETENDER_RECONCILE_COST}⚜</Text>
                    </Pressable>
                  </View>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentMuted, marginTop: 7, lineHeight: 14 }}>{acted ? t("dyn.pret.acted") : t("dyn.pret.hint")}</Text>
                </View>
              );
            })()}
            </View>
          ) : (
            <>
              {reqs.map((r) => (
                <View key={r.key} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 0.5, color: r.ok ? C.sage : C.parchmentMuted }}>{r.ok ? "✓ " : "• "}{t("thr." + r.key)}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 12, color: r.ok ? C.sage : C.parchment }}>{r.cur} / {r.need}</Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 0.5, color: backing ? C.sage : C.blood }}>{backing ? "✓ " : "✕ "}{t("thr.backing")}</Text>
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.ember, lineHeight: 16, marginTop: 9 }}>⚠ {t("thr.risk")}</Text>
              {claimable && <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold, marginTop: 8 }}>{t("thr.odds")}: %{Math.round(throneOdds(state) * 100)} · {t("thr.cost")} {THRONE_COST} ⚜</Text>}
              <Pressable onPress={doClaim} disabled={!claimable} style={{ marginTop: 10, paddingVertical: 13, borderRadius: 9, alignItems: "center", borderWidth: 1.5, borderColor: claimable ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: claimable ? C.gold : C.bg }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: claimable ? C.inkOnGold : C.parchmentMuted }}>{claimable ? t("thr.claim") : t("thr.need")}</Text>
              </Pressable>
            </>
          )}
          {throneMsg && (
            <Animated.View key={throneMsg.tick} entering={FadeInDown.duration(260)} style={{ marginTop: 10, padding: 11, borderRadius: 9, borderWidth: 1, borderColor: throneMsg.ok ? "rgba(127,166,106,0.5)" : "rgba(200,64,64,0.5)", backgroundColor: throneMsg.ok ? "rgba(127,166,106,0.12)" : "rgba(200,64,64,0.12)" }}>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: throneMsg.ok ? C.sage : C.blood, lineHeight: 18 }}>{t(throneMsg.ok ? "ev.throne.win" : "ev.throne.lose")}</Text>
            </Animated.View>
          )}
        </View>

        {/* ── HÜKÜMDARLIK · DÎVÂN (yalnız tahttaysan) ── */}
        {p.crowned && (() => {
          const auth = crownAuthorityOf(p);
          const authCol = auth > 55 ? C.sage : auth > 30 ? C.gold : C.blood;
          const targets = campaignTargets(state);
          const appointable = appointableCities(state).slice(0, 8);
          const appointed = Object.entries(p.appointedGov || {});
          const conquests = p.crownConquests || [];
          const cd = decreeCooldownLeft(p, state.turn);
          const sub = { fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.parchmentMuted, marginTop: 14, marginBottom: 6 } as const;
          return (
            <>
              <SecTitle>{t("crown.title")}</SecTitle>
              <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14 }}>
                {/* Otorite + haraç */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.parchmentMuted }}>{t("crown.authority").toUpperCase()}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 9, color: authCol }}>{auth}/100 · +{crownTribute(state)} {t("crown.tribute")}</Text>
                </View>
                <View style={{ height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <View style={{ width: `${auth}%`, height: 7, borderRadius: 4, backgroundColor: authCol }} />
                </View>
                {/* Saray heyeti */}
                <Text style={sub}>{t("heyet.title").toUpperCase()}{courtWage(state) > 0 ? ` · ${applyParams(t("heyet.wage"), [courtWage(state)])}` : ""}</Text>
                <View style={{ gap: 6 }}>
                  {COURT_OFFICES.map((o) => {
                    const holder = state.court ? state.court[o] : null;
                    const acost = courtAppointCost(state);
                    const can = !holder && p.money >= acost;
                    return (
                      <View key={o} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: F.display, fontSize: 10.5, color: holder ? C.gold : C.parchmentMuted }}>{t("heyet." + o)}{holder ? ` — ${holder}` : ""}</Text>
                          <Text style={{ fontFamily: F.serifItalic, fontSize: 9.5, color: C.parchmentMuted }}>{t("heyet.fx." + o)}</Text>
                        </View>
                        {holder ? (
                          <Pressable onPress={() => { hap("tap"); apply((s) => dismissOfficer(s, o)); }} style={{ paddingVertical: 5, paddingHorizontal: 9, borderRadius: 6, borderWidth: 1, borderColor: C.border }}>
                            <Text style={{ fontFamily: F.display, fontSize: 9, color: C.parchmentMuted }}>{t("heyet.dismiss")}</Text>
                          </Pressable>
                        ) : (
                          <Pressable disabled={!can} onPress={() => { hap("tap"); apply((s) => appointOfficer(s, o)); }} style={{ paddingVertical: 5, paddingHorizontal: 9, borderRadius: 6, borderWidth: 1, borderColor: can ? "rgba(201,168,76,0.5)" : C.border, opacity: can ? 1 : 0.4 }}>
                            <Text style={{ fontFamily: F.display, fontSize: 9, color: can ? C.gold : C.parchmentMuted }}>{applyParams(t("heyet.appoint"), [acost])}</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
                {/* Dîvân fermanları */}
                <Text style={sub}>{t("crown.decrees").toUpperCase()}{cd > 0 ? ` · ${t("crown.decreeWait").replace("%1", String(cd))}` : ""}</Text>
                <View style={{ gap: 6 }}>
                  {CROWN_DECREES.map((d) => {
                    const can = canIssueDecree(state, d.id);
                    const cost = d.gold < 0 ? `−${-d.gold} ⚜` : `+${d.gold} ⚜`;
                    return (
                      <Pressable key={d.id} disabled={!can} onPress={() => { hap("tap"); apply((s) => issueDecree(s, d.id)); }} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: can ? "rgba(201,168,76,0.5)" : C.border, backgroundColor: can ? "rgba(201,168,76,0.10)" : C.bg, opacity: can ? 1 : 0.5 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontFamily: F.display, fontSize: 11, color: can ? C.gold : C.parchmentMuted }}>{t("crown.dn." + d.id)}</Text>
                          <Text style={{ fontFamily: F.serif, fontSize: 10, color: d.gold < 0 ? C.parchmentMuted : C.sage }}>{cost}</Text>
                        </View>
                        <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchmentMuted, marginTop: 2 }}>{t("crown.dd." + d.id)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {/* Sefer */}
                <Text style={sub}>{t("crown.campaign").toUpperCase()}{targets.length ? ` · ${t("crown.odds")} %${Math.round(campaignOdds(state) * 100)} · ${CAMPAIGN_COST} ⚜` : ""}</Text>
                {state.crownCampaign && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: "rgba(200,64,64,0.5)", backgroundColor: "rgba(200,64,64,0.08)", borderRadius: 9, padding: 10, marginBottom: 8 }}>
                    <GameIcon name="crossed-swords" size={13} color={C.ember} />
                    <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchment, lineHeight: 17 }}>
                      {applyParams(t("crown.cmp.band"), [t("beylik." + state.crownCampaign.beylikId), t(state.crownCampaign.month < 2 ? "crown.cmp.stage1" : "crown.cmp.stage2"), state.crownCampaign.edge])}
                    </Text>
                  </View>
                )}
                {targets.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {targets.map((tg) => {
                      const can = canLaunchCampaign(state);
                      return (
                        <View key={tg.id} style={{ gap: 4 }}>
                        <Pressable disabled={!can} onPress={() => doCampaign(tg.id)} style={{ paddingVertical: 8, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1, borderColor: can ? "rgba(200,64,64,0.5)" : C.border, backgroundColor: can ? "rgba(200,64,64,0.10)" : C.bg, opacity: can ? 1 : 0.5 }}>
                          <Text style={{ fontFamily: F.display, fontSize: 11, color: can ? C.ember : C.parchmentMuted }}>{t("crown.campaignBtn")}: {t("beylik." + tg.id)}</Text>
                        </Pressable>
                        {(() => { const tcan = p.crown_action_turn !== state.turn; return (
                        <Pressable disabled={!tcan} onPress={() => { const r = demandTribute(state, tg.id); hap(r.success ? "success" : "warning"); if (r.success) playVictory(); apply(() => r.state); setCampMsg({ ok: r.success, tick: Date.now() }); }} style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1, borderColor: tcan ? "rgba(201,168,76,0.45)" : C.border, backgroundColor: tcan ? "rgba(201,168,76,0.08)" : C.bg, opacity: tcan ? 1 : 0.5 }}>
                          <Text style={{ fontFamily: F.display, fontSize: 10, color: tcan ? C.gold : C.parchmentMuted }}>{t("crown.tributeBtn")}: {t("beylik." + tg.id)}</Text>
                        </Pressable>
                        ); })()}
                        </View>
                      );
                    })}
                  </View>
                ) : <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{t("crown.noTargets")}</Text>}
                {campMsg && (
                  <Animated.View key={campMsg.tick} entering={FadeInDown.duration(260)} style={{ marginTop: 8, padding: 10, borderRadius: 9, borderWidth: 1, borderColor: campMsg.ok ? "rgba(127,166,106,0.5)" : "rgba(200,64,64,0.5)", backgroundColor: campMsg.ok ? "rgba(127,166,106,0.12)" : "rgba(200,64,64,0.12)" }}>
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: campMsg.ok ? C.sage : C.blood, lineHeight: 18 }}>{t(campMsg.key || (campMsg.ok ? "crown.campaignWonShort" : "crown.campaignLostShort"))}</Text>
                  </Animated.View>
                )}
                {conquests.length > 0 && <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.sage, marginTop: 8 }}>{t("crown.conquests")}: {conquests.map((b) => t("beylik." + b)).join(", ")}</Text>}
                {/* Vali atama/azil */}
                <Text style={sub}>{t("crown.appointTitle").toUpperCase()} · {APPOINT_FEE} ⚜</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {appointable.map((loc) => {
                    const can = canAppointGovernor(state, loc);
                    return (
                      <Pressable key={loc} disabled={!can} onPress={() => { hap("tap"); apply((s) => appointGovernor(s, loc)); }} style={{ paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: can ? "rgba(201,168,76,0.4)" : C.border, backgroundColor: can ? "rgba(201,168,76,0.08)" : C.bg, opacity: can ? 1 : 0.5 }}>
                        <Text style={{ fontFamily: F.serif, fontSize: 11, color: can ? C.gold : C.parchmentMuted }}>{t("crown.appointBtn")}: {placeName(loc, lang)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {appointed.length > 0 && (
                  <>
                    <Text style={sub}>{t("crown.appointed").toUpperCase()}</Text>
                    {appointed.map(([loc, g]) => (
                      <View key={loc} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
                        <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchment }}>{localFirstName(g.seed, g.gender, lang)} · {placeName(loc, lang)}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={{ fontFamily: F.display, fontSize: 9, color: g.loyalty > 50 ? C.sage : g.loyalty > 28 ? C.gold : C.blood }}>{t("crown.loyalty")} {Math.round(g.loyalty)}</Text>
                          <Pressable onPress={() => { hap("tap"); apply((s) => dismissGovernor(s, loc)); }} style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: "rgba(200,64,64,0.4)" }}>
                            <Text style={{ fontFamily: F.display, fontSize: 9, color: C.blood }}>{t("crown.dismissBtn")}</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </View>
            </>
          );
        })()}

        {/* ── KARAR DEFTERİ: divan arzuhalleri + fermanlar — hükümdarın izi ── */}
        {p.crowned && (() => {
          const kayitlar = state.history.filter((e) => e.type === "taht" && e.k && (String(e.k).startsWith("divan.") || String(e.k).startsWith("crown."))).slice(-8).reverse();
          if (!kayitlar.length) return null;
          return (
            <>
              <SecTitle>{t("divan.ledger")}</SecTitle>
              <View style={{ backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 11, marginBottom: 4 }}>
                {kayitlar.map((e, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 7, marginBottom: i === kayitlar.length - 1 ? 0 : 8 }}>
                    <Text style={{ fontFamily: F.serif, fontSize: 9.5, color: C.goldDim, width: 34 }}>{Math.floor(e.day / 12) + 1247}</Text>
                    <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentDim, lineHeight: 15 }} numberOfLines={2}>{renderEvt(e.k, e.text, e.p, lang, t, p.gender === "kadın")}</Text>
                  </View>
                ))}
              </View>
            </>
          );
        })()}

        {/* ── KADEMELİ YERLEŞİM ── */}
        <SecTitle>{t("dyn.settle")}</SecTitle>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, marginBottom: 9 }}>{t("set.hint")}</Text>
        {settlements.length > 0 && settlements.map((st, i) => {
          const tier = st.tier || "mezra";
          const up = canUpgradeSettleTier(state, i);
          const here = st.loc ? placeName(st.loc, lang) : "";
          return (
          <View key={i} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(127,166,106,0.35)", borderRadius: 11, padding: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1, minWidth: 0 }}>
                <GameIcon name="house" size={13} color={C.sage} />
                <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 13.5, color: C.parchment }}>{st.name} <Text style={{ fontSize: 10, color: C.goldDim }}>· {t("stt." + tier)}{here ? ` · ${here}` : ""}</Text></Text>
              </View>
              <Text style={{ fontFamily: F.display, fontSize: 11, color: C.sage }}>{t("set.dev")} %{st.dev}</Text>
            </View>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", marginTop: 7, overflow: "hidden" }}>
              <View style={{ width: `${st.dev}%`, height: 5, backgroundColor: C.sage, borderRadius: 3 }} />
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 9 }}>
              {st.dev < 100 && (() => { const dc = developSettlementCost(st); return (
                <Pressable onPress={() => { hap("tap"); apply((s) => developSettlement(s, i)); }} disabled={p.money < dc} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: p.money < dc ? C.border : "rgba(127,166,106,0.5)", backgroundColor: p.money < dc ? C.bg : "rgba(127,166,106,0.12)" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 10, color: p.money < dc ? C.parchmentMuted : C.sage }}>{t("set.develop")} {dc}⚜</Text>
                </Pressable>
              ); })()}
              {up.next && (
                <Pressable onPress={() => { if (!up.ok) return; hap("success"); apply((s) => upgradeSettleTier(s, i)); }} disabled={!up.ok} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: up.ok ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: up.ok ? "rgba(201,168,76,0.14)" : C.bg }}>
                  <Text style={{ fontFamily: F.display, fontSize: 10, color: up.ok ? C.gold : C.parchmentMuted }}>{t("set.toTier").replace("%1", t("stt." + up.next))} · {settleFee(state, up.next)}⚜</Text>
                </Pressable>
              )}
            </View>
            {up.next && (
              <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: up.ok ? C.goldDim : C.ember, marginTop: 7 }}>
                {up.ok
                  ? t("set.req").replace("%1", String(SETTLE_TIER[up.next].props)).replace("%2", `%${SETTLE_TIER[up.next].dev}`)
                  : up.reason === "dev" ? t("set.up.dev") : up.reason === "prop" ? `${t("set.up.prop")} (${propsInLoc(state, st.loc || "")}/${SETTLE_TIER[up.next].props})` : t("set.up.gold")}
              </Text>
            )}
            {!up.next && <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.goldDim, marginTop: 7 }}>{t("set.up.top")}</Text>}
          </View>
          );
        })}
        {settlements.length > 0 && (
          <Text style={{ fontFamily: F.display, fontSize: 10, color: C.goldDim, marginBottom: 10, textAlign: "right" }}>+{settlementIncome(state)} ⚜ {t("set.tax")}</Text>
        )}
        {/* Kurucu — bulunduğun bölgede yeterli mülkün varsa mezra kur */}
        {settlements.length < SETTLE_MAX && (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 11, padding: 12 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginBottom: 8 }}>{t("set.regionProps").replace("%1", String(propsInLoc(state, p.location_name)))} · {placeName(p.location_name, lang)}</Text>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput
                value={settleName} onChangeText={setSettleName} placeholder={t("set.name")} placeholderTextColor={C.parchmentMuted} maxLength={24}
                style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchment, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 }}
              />
              <Pressable onPress={doFound} disabled={!settleChk.ok || !settleName.trim()} style={{ paddingVertical: 11, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: settleChk.ok && settleName.trim() ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: settleChk.ok && settleName.trim() ? "rgba(201,168,76,0.16)" : C.bg }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 0.5, color: settleChk.ok && settleName.trim() ? C.gold : C.parchmentMuted }}>{t("set.found")}</Text>
              </Pressable>
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: settleChk.ok ? C.goldDim : C.ember, marginTop: 8 }}>
              {settleChk.ok ? `${t("set.fee")}: ${settleFee(state, "mezra")} ⚜` : t("set.r." + settleChk.reason)}
            </Text>
          </View>
        )}

        {/* ── GÖRKEM & BAĞIŞ (servet muslukları) ── */}
        <SecTitle>{t("prx.title")}</SecTitle>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, marginBottom: 9 }}>{t("prx.hint")}</Text>
        {Object.keys(PRESTIGE).map((id) => {
          const def = PRESTIGE[id]; const cost = prestigeCost(state, id); const done = !!def.once && !!p.legacy?.[id];
          const afford = p.money >= cost && !done;
          return (
            <View key={id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 11, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.parchment }}>{t("prx." + id + ".n")}</Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 2 }}>{t("prx." + id + ".d")}</Text>
              </View>
              {done ? (
                <Text style={{ fontFamily: F.display, fontSize: 10, color: C.sage }}>✓ {t("prx.done")}</Text>
              ) : (
                <Pressable onPress={() => { if (!afford) return; hap("success"); apply((s) => fundPrestige(s, id)); }} disabled={!afford} style={{ paddingVertical: 8, paddingHorizontal: 13, borderRadius: 7, borderWidth: 1, borderColor: afford ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: afford ? "rgba(201,168,76,0.14)" : C.bg }}>
                  <Text style={{ fontFamily: F.display, fontSize: 10.5, color: afford ? C.gold : C.parchmentMuted }}>{cost}⚜</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {/* ── AİLE KONAĞI: nesillere kalan görkem merdiveni ── */}
        {(() => {
          const tier = p.estate || 0; const full = tier >= ESTATE_TIERS.length;
          const cost = estateCost(state); const afford = !full && p.money >= cost;
          return (
            <View style={{ backgroundColor: C.card, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.4)", borderRadius: 12, padding: 13, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <GameIcon name="castle" size={15} color={C.gold} />
                <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.gold, textTransform: "uppercase" }}>{t("est.title")}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentMuted }}>{tier}/{ESTATE_TIERS.length}</Text>
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchment, marginTop: 5 }}>
                {tier === 0 ? t("est.none") : t("est.t." + ESTATE_TIERS[tier - 1].id)}
              </Text>
              <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }}>
                {ESTATE_TIERS.map((et, i) => (
                  <View key={et.id} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < tier ? C.gold : "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: i < tier ? C.gold : C.border }} />
                ))}
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentMuted, marginTop: 7, lineHeight: 14 }}>{t("est.hint")}</Text>
              {!full && (
                <Pressable disabled={!afford} onPress={() => { hap("success"); apply((x) => upgradeEstate(x)); }} style={{ marginTop: 9, paddingVertical: 10, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: afford ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: afford ? "rgba(201,168,76,0.14)" : C.bg }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: afford ? C.gold : C.parchmentMuted }}>{t("est.t." + ESTATE_TIERS[tier].id)} · {cost}⚜</Text>
                </Pressable>
              )}
              {full && <Text style={{ fontFamily: F.display, fontSize: 10, color: C.sage, marginTop: 8, textAlign: "center" }}>✓ {t("est.full")}</Text>}
            </View>
          );
        })()}

        {/* ── VAKIF KAZANI: sınırsız hayrat — servet anlama dönüşür ── */}
        {p.legacy?.vakif && (() => {
          const donated = p.vakif_turn === state.turn;
          return (
            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(127,166,106,0.4)", borderRadius: 12, padding: 13, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <GameIcon name="prayer-beads" size={14} color={C.sage} />
                <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.sage, textTransform: "uppercase" }}>{t("est.vakif.title")}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 11, color: C.sage }}>{(p.vakif_fon || 0).toLocaleString()} ⚜</Text>
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 5, lineHeight: 15 }}>{t("est.vakif.hint")}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 9 }}>
                {VAKIF_DONATE_AMOUNTS.map((amt) => (
                  <Pressable key={amt} disabled={donated || p.money < amt} onPress={() => { hap("success"); apply((x) => donateVakif(x, amt)); }} style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: (donated || p.money < amt) ? C.border : "rgba(127,166,106,0.55)", backgroundColor: (donated || p.money < amt) ? C.bg : "rgba(127,166,106,0.12)", opacity: (donated || p.money < amt) ? 0.5 : 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 10.5, color: (donated || p.money < amt) ? C.parchmentMuted : C.sage }}>{amt.toLocaleString()}⚜</Text>
                  </Pressable>
                ))}
              </View>
              {donated && <Text style={{ fontFamily: F.serifItalic, fontSize: 9.5, color: C.parchmentMuted, marginTop: 6, textAlign: "center" }}>{t("est.vakif.done")}</Text>}
              {(() => {
                const fon = p.vakif_fon || 0;
                const next = VAKIF_TIERS.find((x) => fon < x);
                return (
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 9.5, color: C.goldDim, marginTop: 5, textAlign: "center" }}>
                    {next ? t("est.vakif.next").replace("%1", next.toLocaleString()) : t("est.vakif.max")}
                  </Text>
                );
              })()}
            </View>
          );
        })()}

        {/* ── PİYASAYI OYNAT (yalnızca çok zengin) ── */}
        {p.money >= MARKET_LEVER_MIN && (() => {
          const chk = canManipulateMarket(state); const cost = marketLeverCost(state);
          return (
            <>
              <SecTitle>{t("mlev.title")}</SecTitle>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, marginBottom: 9 }}>{t("mlev.hint")}</Text>
              <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", borderRadius: 11, padding: 12 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable onPress={() => { if (!chk.ok) return; hap("success"); apply((s) => manipulateMarket(s, "pump")); }} disabled={!chk.ok} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: chk.ok ? "rgba(200,64,64,0.5)" : C.border, backgroundColor: chk.ok ? "rgba(200,64,64,0.12)" : C.bg, alignItems: "center" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 10.5, color: chk.ok ? C.ember : C.parchmentMuted }}>{t("mlev.pump")}</Text>
                  </Pressable>
                  <Pressable onPress={() => { if (!chk.ok) return; hap("success"); apply((s) => manipulateMarket(s, "dump")); }} disabled={!chk.ok} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: chk.ok ? "rgba(127,166,106,0.5)" : C.border, backgroundColor: chk.ok ? "rgba(127,166,106,0.12)" : C.bg, alignItems: "center" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 10.5, color: chk.ok ? C.sage : C.parchmentMuted }}>{t("mlev.dump")}</Text>
                  </Pressable>
                </View>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: chk.ok ? C.goldDim : C.ember, marginTop: 8 }}>
                  {chk.ok ? `${t("mlev.cost")}: ${cost} ⚜` : chk.reason === "cool" ? t("mlev.cool") : t("mlev.poor")}
                </Text>
              </View>
            </>
          );
        })()}

        {/* ── ATALAR ── */}
        {past.length > 0 && (
          <>
            <SecTitle>{t("dyn.ancestors")}</SecTitle>
            {[...past].reverse().map((a) => (
              <View key={a.generation} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftColor: C.gold, borderLeftWidth: 2.5, borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{a.name}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 10, color: C.goldDim }}>{a.generation}. {t("misc.generation")}</Text>
                </View>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>
                  {profL(a.profession)} · {t("dyn.passedAt").replace("%n", String(a.diedAge))} · {t("dyn.fameWord")} {a.fame}
                </Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.gold, marginTop: 4 }}>{a.noteK ? t("dynnote." + a.noteK) : a.note}</Text>
                {!!a.causeK && <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchmentMuted, marginTop: 3 }}>{t("eul.cause." + a.causeK)}</Text>}
              </View>
            ))}
          </>
        )}

        {/* ── DİYARIN HANEDANLARI ── */}
        {(state.dynastyOffers || []).length > 0 && (
          <>
            <SecTitle>{t("dyn.offers")}</SecTitle>
            {(state.dynastyOffers || []).map((o) => (
              <View key={o.id} style={{ backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.45)", borderRadius: 9, padding: 12, marginBottom: 8 }}>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchment }}>{rivalHouseName(o.nameIdx, lang)} {o.type === "evlilik" ? t("dyn.offerMarry") : t("dyn.offerAlly")}.</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 9 }}>
                  <Pressable onPress={() => apply((s) => acceptDynastyOffer(s, o.id))} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 7, borderWidth: 1, borderColor: "rgba(124,160,90,0.5)", backgroundColor: "rgba(124,160,90,0.12)" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 11, color: C.sage }}>{t("dyn.accept")}</Text>
                  </Pressable>
                  <Pressable onPress={() => apply((s) => declineDynastyOffer(s, o.id))} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 7, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg }}>
                    <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentMuted }}>{t("dyn.decline")}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
        {(() => {
          const mine = { id: "mine", name: houseName, power, mine: true, attitude: 0 };
          const rivals = baseRivals.map((h) => ({ id: h.id, name: h.nameIdx != null ? rivalHouseName(h.nameIdx, lang) : h.name, power: h.power, mine: false, attitude: h.tutum ?? houseAttitude(p, h) }));
          const all = [...rivals, mine].sort((a, b) => b.power - a.power);
          return (
            <>
              <SecTitle>{t("dyn.houses")}</SecTitle>
              {state.bloodline && (() => {
                const b = state.bloodline!;
                const hh = rivals.find((x) => x.id === b.houseId);
                const tone = b.path.includes("sulh") || b.path.includes("bedel_kadi") || b.path.includes("golge_sofra") ? C.sage : C.blood;
                return (
                  <View style={{ backgroundColor: "rgba(168,52,52,0.06)", borderWidth: 1, borderColor: "rgba(168,52,52,0.45)", borderLeftWidth: 3, borderLeftColor: tone, borderRadius: 9, padding: 11, marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <GameIcon name="skull" size={12} color={C.blood} />
                      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.blood }}>{t("bl.title").toUpperCase()}</Text>
                      <Text style={{ fontFamily: F.display, fontSize: 10, color: C.goldDim }}>{applyParams(t("bl.genLine"), [b.gen])}</Text>
                    </View>
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchment, marginTop: 5, lineHeight: 17 }}>
                      {applyParams(t("bl.panelLine"), [hh?.name || "?"])}{b.scene ? " " + t("bl.sceneWaiting") : ""}
                    </Text>
                  </View>
                );
              })()}
              {p.age >= 16 && (() => {
                const ep = state.enemyPlot;
                const listened = p.listen_turn === state.turn;
                const lcost = listenCost(state); const ccost = cutThreadCost(state);
                if (ep && ep.known) {
                  return (
                    <View style={{ backgroundColor: "rgba(200,64,64,0.08)", borderWidth: 1, borderColor: "rgba(200,64,64,0.5)", borderLeftWidth: 3, borderLeftColor: C.blood, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.blood }}>{t("spy.threat").toUpperCase()}</Text>
                      <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchment, marginTop: 4 }}>{applyParams(t("spy.known"), [rivalHouseName(ep.nameIdx, lang)])}</Text>
                      <Pressable disabled={p.money < ccost} onPress={() => { hap("advance"); apply((s) => cutThread(s)); }} style={{ marginTop: 8, paddingVertical: 9, borderRadius: 7, borderWidth: 1, borderColor: "rgba(200,64,64,0.6)", backgroundColor: "rgba(200,64,64,0.12)", alignItems: "center", opacity: p.money < ccost ? 0.4 : 1 }}>
                        <Text style={{ fontFamily: F.display, fontSize: 10.5, color: C.blood }}>{applyParams(t("spy.cut"), [ccost])}</Text>
                      </Pressable>
                    </View>
                  );
                }
                return (
                  <Pressable disabled={listened || p.money < lcost} onPress={() => { hap("tap"); apply((s) => listenWhispers(s)); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 10, marginBottom: 10, opacity: listened || p.money < lcost ? 0.45 : 1 }}>
                    <GameIcon name="hood" size={15} color={C.parchmentMuted} />
                    <Text style={{ fontFamily: F.display, fontSize: 10.5, color: C.parchmentMuted, flex: 1 }}>{applyParams(t(listened ? "spy.listened" : "spy.listen"), [lcost])}</Text>
                  </Pressable>
                );
              })()}
              {state.plot && (() => {
                const pl = state.plot!;
                const hname = rivalHouseName(pl.nameIdx, lang);
                const hcost = plotHelperCost(state);
                const canHelp = pl.helpers < 2 && p.money >= hcost;
                return (
                  <View style={{ backgroundColor: "rgba(123,79,175,0.08)", borderWidth: 1, borderColor: "rgba(123,79,175,0.45)", borderLeftWidth: 3, borderLeftColor: C.ink, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.goldDim }}>{t("plot.panel").toUpperCase()}</Text>
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchment, marginTop: 4 }}>{t("plot.kind." + pl.kind)} — {hname}</Text>
                    <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>{applyParams(t("plot.stage"), [pl.stage])} · {applyParams(t("plot.heat"), [pl.heat])} · {applyParams(t("plot.helpers"), [pl.helpers])}</Text>
                    <Pressable disabled={!canHelp} onPress={() => { hap("tap"); apply((s) => hirePlotHelper(s)); }} style={{ marginTop: 8, paddingVertical: 8, borderRadius: 7, borderWidth: 1, borderColor: canHelp ? "rgba(201,168,76,0.5)" : C.border, backgroundColor: "rgba(201,168,76,0.08)", alignItems: "center", opacity: canHelp ? 1 : 0.4 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 10.5, color: canHelp ? C.gold : C.parchmentMuted }}>{applyParams(t("plot.helper"), [hcost])}</Text>
                    </Pressable>
                  </View>
                );
              })()}
              {all.map((h, i) => (
                <View key={h.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: h.mine ? "rgba(201,168,76,0.1)" : C.card, borderWidth: 1, borderColor: h.mine ? "rgba(201,168,76,0.45)" : C.border, borderRadius: 9, padding: 11, marginBottom: 7 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldDim, width: 24 }}>{i + 1}.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: h.mine ? C.gold : C.parchment }}>{h.name}{h.mine ? t("dyn.you") : ""}</Text>
                    <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{t("dyn.power")} {h.power}</Text>
                  </View>
                  {!h.mine && (
                    <View style={{ backgroundColor: attTone(h.attitude) + "1A", borderWidth: 1, borderColor: attTone(h.attitude) + "55", borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.3, color: attTone(h.attitude) }}>{t("dyn.att." + attKey(h.attitude))}</Text>
                    </View>
                  )}
                  {/* Proaktif diplomasi: soğuk olmayan hanelere teklif götür (ayda tek; ret tutumu düşürür) */}
                  {!h.mine && !(state.allied_houses || []).includes(h.id) && p.age >= 16 && (() => {
                    const acted = p.propose_turn === state.turn;
                    const envoyFee = Math.round(ENVOY_COST * inflationFactor(state));
                    const envoyOff = acted || p.money < envoyFee; // ücret yoksa kapalı — başarısız gönderime çıngırak çalınmaz
                    return (
                      <View style={{ gap: 4 }}>
                        <Pressable disabled={envoyOff} onPress={() => { hap("selection"); playChime(); apply((s) => sendEnvoy(s, h.id)); }} style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: envoyOff ? C.border : "rgba(127,166,106,0.5)", opacity: envoyOff ? 0.4 : 1 }}>
                          <Text style={{ fontFamily: F.display, fontSize: 8.5, color: envoyOff ? C.parchmentMuted : C.sage }}>{applyParams(t("dyn.envoy"), [envoyFee])}</Text>
                        </Pressable>
                        {h.attitude > -10 && (
                        <Pressable disabled={acted} onPress={() => { hap("tap"); apply((s) => proposeToHouse(s, h.id, "ittifak")); }} style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: acted ? C.border : "rgba(111,160,192,0.5)", opacity: acted ? 0.4 : 1 }}>
                          <Text style={{ fontFamily: F.display, fontSize: 8.5, color: acted ? C.parchmentMuted : C.frost }}>{t("dyn.propose.ally")}</Text>
                        </Pressable>
                        )}
                        {!p.married && h.attitude > -10 && (
                          <Pressable disabled={acted} onPress={() => { hap("tap"); apply((s) => proposeToHouse(s, h.id, "evlilik")); }} style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: acted ? C.border : "rgba(201,168,76,0.5)", opacity: acted ? 0.4 : 1 }}>
                            <Text style={{ fontFamily: F.display, fontSize: 8.5, color: acted ? C.parchmentMuted : C.gold }}>{t("dyn.propose.marry")}</Text>
                          </Pressable>
                        )}
                        {!state.plot && p.money >= plotCost(state) && (
                          <View style={{ flexDirection: "row", gap: 3 }}>
                            {(["leke", "sabotaj", "nifak"] as const).map((k) => (
                              <Pressable key={k} onPress={() => { hap("tap"); apply((s) => startPlot(s, h.id, k)); }} style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 6, borderWidth: 1, borderColor: "rgba(123,79,175,0.5)", alignItems: "center" }}>
                                <Text style={{ fontFamily: F.display, fontSize: 8, color: C.parchmentMuted }}>{t("plot.kind." + k)}</Text>
                              </Pressable>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })()}
                  {!h.mine && (state.allied_houses || []).includes(h.id) && (
                    <Text style={{ fontFamily: F.display, fontSize: 9, color: C.sage }}>{t("dyn.allied")}</Text>
                  )}
                </View>
              ))}
            </>
          );
        })()}
      </ScrollView>
    </ScreenFresk>
  );
}
