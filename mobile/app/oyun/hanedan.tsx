import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import {
  playerHousePower, houseAttitude, dynastyPower, houseSeal,
  WILL_STYLES, throneRequirements, throneBacking, canClaimThrone, throneOdds, claimThrone, THRONE_COST,
  canFoundSettlement, foundSettlement, settlementIncome, SETTLE_COST, SETTLE_MAX,
} from "../../lib/game";
import { generateDynasties } from "../../lib/world";
import { professionNameL } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader } from "../../lib/ui";

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
  const doFound = () => { if (!settleChk.ok || !settleName.trim()) return; hap("success"); apply((s) => foundSettlement(s, settleName)); setSettleName(""); };
  const setWill = (id: string) => { hap("tap"); apply((s) => { s.player.will_pref = id; return s; }); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, letterSpacing: 1 }}>{t("scr.hanedan")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("dyn.kicker")} icon={p.crowned ? "👑" : "🛡"} title={houseName} sub={t("dyn.rivalsHint")} />

        {/* ── HANEDAN MÜHRÜ ── */}
        <View style={{ backgroundColor: "rgba(201,168,76,0.07)", borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderRadius: 14, padding: 18, alignItems: "center", marginBottom: 10 }}>
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2.5, color: C.goldDim, textTransform: "uppercase" }}>{t("dyn.seal")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 44, color: C.gold, marginTop: 2 }}>{power}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchment, marginTop: 2 }}>{t("seal." + seal.key)}</Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
            <View style={{ backgroundColor: "rgba(201,168,76,0.16)", borderRadius: 14, paddingVertical: 3, paddingHorizontal: 11 }}>
              <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 0.5, color: C.gold }}>{p.generation}. {t("misc.generation")}</Text>
            </View>
            {p.crowned && (
              <View style={{ backgroundColor: C.gold, borderRadius: 14, paddingVertical: 3, paddingHorizontal: 11 }}>
                <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 0.5, color: "#1a1206" }}>👑 {t("dyn.headWord")}</Text>
              </View>
            )}
          </View>
          {/* Aile özeti */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, alignSelf: "stretch" }}>
            <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentDim }}>👤 {p.name}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentDim }}>💍 {p.married && p.spouse_name ? p.spouse_name : t("dyn.unwed")}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentDim }}>👶 {p.children.length}</Text>
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
            <View style={{ alignItems: "center", paddingVertical: 6 }}>
              <Text style={{ fontSize: 30 }}>👑</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.gold, textAlign: "center", marginTop: 6, lineHeight: 20 }}>{t("thr.crowned")}</Text>
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
                <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: claimable ? "#1a1206" : C.parchmentMuted }}>{claimable ? t("thr.claim") : t("thr.need")}</Text>
              </Pressable>
            </>
          )}
          {throneMsg && (
            <Animated.View key={throneMsg.tick} entering={FadeInDown.duration(260)} style={{ marginTop: 10, padding: 11, borderRadius: 9, borderWidth: 1, borderColor: throneMsg.ok ? "rgba(127,166,106,0.5)" : "rgba(200,64,64,0.5)", backgroundColor: throneMsg.ok ? "rgba(127,166,106,0.12)" : "rgba(200,64,64,0.12)" }}>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: throneMsg.ok ? C.sage : C.blood, lineHeight: 18 }}>{t(throneMsg.ok ? "ev.throne.win" : "ev.throne.lose")}</Text>
            </Animated.View>
          )}
        </View>

        {/* ── YERLEŞİM KUR ── */}
        <SecTitle>{t("dyn.settle")}</SecTitle>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, marginBottom: 9 }}>{t("set.hint")}</Text>
        {settlements.length > 0 && settlements.map((st, i) => (
          <View key={i} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(127,166,106,0.35)", borderRadius: 11, padding: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: F.display, fontSize: 13.5, color: C.parchment }}>🏘 {st.name}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 11, color: C.sage }}>{t("set.dev")} %{st.dev}</Text>
            </View>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", marginTop: 7, overflow: "hidden" }}>
              <View style={{ width: `${st.dev}%`, height: 5, backgroundColor: C.sage, borderRadius: 3 }} />
            </View>
          </View>
        ))}
        {settlements.length > 0 && (
          <Text style={{ fontFamily: F.display, fontSize: 10, color: C.goldDim, marginBottom: 10, textAlign: "right" }}>+{settlementIncome(state)} ⚜ {t("set.tax")}</Text>
        )}
        {/* Kurucu */}
        {settlements.length < SETTLE_MAX && (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 11, padding: 12 }}>
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
              {settleChk.ok ? `${SETTLE_COST} ⚜` : t("set.r." + settleChk.reason)}
            </Text>
          </View>
        )}

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
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.gold, marginTop: 4 }}>{a.note}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── DİYARIN HANEDANLARI ── */}
        {(() => {
          const mine = { id: "mine", name: houseName, power, mine: true, attitude: 0 };
          const rivals = generateDynasties(state.seed).map((h) => ({ id: h.id, name: h.name, power: h.power, mine: false, attitude: houseAttitude(p, h) }));
          const all = [...rivals, mine].sort((a, b) => b.power - a.power);
          return (
            <>
              <SecTitle>{t("dyn.houses")}</SecTitle>
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
                </View>
              ))}
            </>
          );
        })()}
      </ScrollView>
    </View>
  );
}
