import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { FACTIONS, factionById, doFactionTask, joinFaction, leaveFaction, joinThreshold, playerWar, supportWar, FACTION_RANKS, factionRankIndex, BEYLIKS, beylikName, defaultRealm, factionHoldsHere, regionOf, factionBanLeft, canUseFactionPower, useFactionPower, FAC_POWER_COST } from "../../lib/game";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader } from "../../lib/ui";


function Bar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <View style={{ height: 4, backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 2, marginTop: 6 }}>
      <View style={{ width: `${pct}%`, height: 4, backgroundColor: C.gold, borderRadius: 2 }} />
    </View>
  );
}

export default function Orgutler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const current = factionById(p.faction);
  const wars = state.wars || [];
  const myWar = playerWar(state);
  const realm = state.realm ?? defaultRealm();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <View style={{ width: 40 }} />
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 8 }}>
        {t("org.subtitle")}
      </Text>

      {current && (
        <View style={{ marginHorizontal: 16, marginBottom: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,168,76,0.45)", backgroundColor: "rgba(201,168,76,0.08)" }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold, letterSpacing: 1 }}>{current.icon} {t("fac."+current.id+".n")} {t("org.youMember")}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchment, marginTop: 3 }}>{t("fac."+current.id+".p")}</Text>
          {factionHoldsHere(state, p.faction) && (
            <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.sage, marginTop: 5 }}>🏰 {t("realm.domHere")}</Text>
          )}
          {/* Örgütün gücünü kullan (Güvenilir rütbe+) */}
          <View style={{ marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: "rgba(201,168,76,0.25)" }}>
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.goldDim, marginBottom: 6 }}>{t("fac.power").toUpperCase()}</Text>
            {canUseFactionPower(p) ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => { hap("success"); apply((s) => useFactionPower(s, "himaye")); }} style={{ flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.12)", alignItems: "center" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 10.5, color: C.gold }}>{t("fac.himaye")}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 9, color: C.parchmentMuted }}>−{FAC_POWER_COST} {t("fac.repute").toLowerCase()}</Text>
                </Pressable>
                <Pressable onPress={() => { hap("tap"); apply((s) => useFactionPower(s, "kese")); }} style={{ flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.12)", alignItems: "center" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 10.5, color: C.gold }}>{t("fac.kese")}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 9, color: C.parchmentMuted }}>−{FAC_POWER_COST} {t("fac.repute").toLowerCase()}</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{applyParams(t("fac.powHint"), [FAC_POWER_COST])}</Text>
            )}
          </View>
          <Pressable onPress={() => { hap("tap"); apply(leaveFaction); }} style={{ alignSelf: "flex-start", marginTop: 8 }}>
            <Text style={{ fontFamily: F.display, fontSize: 10, color: C.blood, letterSpacing: 1 }}>{t("fac.leave")}</Text>
          </Pressable>
        </View>
      )}

      {wars.length > 0 && (
        <View style={{ marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(168,52,52,0.4)", backgroundColor: "rgba(168,52,52,0.08)" }}>
          {wars.map((w, i) => (
            <Text key={i} style={{ fontFamily: F.serif, fontSize: 12, color: C.parchment, marginBottom: 4 }}>
              ⚔ {t("fac."+w.a+".n")} ⚔ {t("fac."+w.b+".n")}{w.prize ? ` · ${beylikName(w.prize)} ${t("realm.forControl")}` : ""} · {w.turnsLeft} {t("realm.month")}
            </Text>
          ))}
          {myWar && (
            <Pressable onPress={() => { hap("advance"); apply(supportWar); }} style={{ marginTop: 6, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 7, borderWidth: 1, borderColor: "rgba(168,52,52,0.55)", backgroundColor: "rgba(168,52,52,0.16)" }}>
              <Text style={{ fontFamily: F.display, fontSize: 11, color: C.blood, letterSpacing: 1 }}>{t("fac.front")}</Text>
            </Pressable>
          )}
        </View>
      )}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <PageHeader kicker={t("scr.orgutler")} icon="🏛" title={t("scr.orgutler")} />

        {/* ── Sancak hakimiyeti (emergent fraksiyon şehir-kontrolü) ── */}
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Text style={{ fontSize: 13 }}>🏰</Text>
            <Text style={{ flex: 1, fontFamily: F.display, fontSize: 9.5, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase" }}>{t("realm.title")}</Text>
            {!!p.faction && (() => { const n = realm.filter((sn) => sn.holder === p.faction).length; return (
              <Text style={{ fontFamily: F.display, fontSize: 9.5, color: n > 0 ? C.sage : C.parchmentMuted }}>{current?.icon} {n}/{realm.length}</Text>
            ); })()}
          </View>
          {realm.map((sn) => {
            const b = BEYLIKS.find((x) => x.id === sn.id);
            const holder = factionById(sn.holder);
            const contender = sn.contender ? factionById(sn.contender) : null;
            const here = regionOf(p.location_name) === sn.id;
            const mine = sn.holder === p.faction;
            return (
              <View key={sn.id} style={{ paddingVertical: 7, borderTopWidth: 1, borderTopColor: C.border }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: b?.tone || C.gold }} />
                  <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: here ? C.gold : C.parchment }}>{here ? "📍 " : ""}{beylikName(sn.id)}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: mine ? C.sage : C.gold }}>{holder?.icon} {holder ? t("fac."+holder.id+".n") : sn.holder}</Text>
                </View>
                {contender && (
                  <View style={{ marginTop: 5, marginLeft: 16 }}>
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.ember }}>{contender.icon} {t("fac."+contender.id+".n")} {t("realm.contests")}</Text>
                    <View style={{ height: 3, backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 2, marginTop: 4 }}>
                      <View style={{ width: `${Math.min(100, sn.tension)}%`, height: 3, backgroundColor: C.blood, borderRadius: 2 }} />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {FACTIONS.map((f) => {
          const standing = p.faction_standing[f.id] || 0;
          const isMember = p.faction === f.id;
          const need = joinThreshold(p, f);
          const banLeft = factionBanLeft(p, f.id, state.turn);
          const canJoin = !isMember && standing >= need && banLeft <= 0;
          const canAct = p.age >= 13 && !p.dead;
          return (
            <View key={f.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: isMember ? "rgba(201,168,76,0.45)" : C.border, borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 9, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 20 }}>{f.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{t("fac."+f.id+".n")}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.goldDim }}>{t("fac.suitStat")}: {t("st."+f.stat)}</Text>
                </View>
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginTop: 6, lineHeight: 18 }}>{t("fac."+f.id+".b")}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.goldDim, marginTop: 4 }}>⚔ {t("ftrait." + f.id)}</Text>

              <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                <Text style={{ fontFamily: F.display, fontSize: 10, color: C.parchmentMuted, letterSpacing: 1 }}>{t("fac.repute")} {standing}/{need}</Text>
                {isMember && <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold, letterSpacing: 1 }}>{t("misc.member")} ✓</Text>}
              </View>
              <Bar value={standing} max={need} />
              {isMember && (() => {
                const ri = factionRankIndex(standing); const rank = FACTION_RANKS[ri]; const next = FACTION_RANKS[ri + 1];
                return (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
                    <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 0.5, color: C.gold }}>🎖 {t("frank." + f.id + "." + ri)} <Text style={{ color: C.parchmentMuted, fontSize: 9 }}>({t("fac.reward")} ×{rank.mult})</Text></Text>
                    {next ? <Text style={{ fontFamily: F.display, fontSize: 9, color: C.parchmentMuted }}>{t("frank." + f.id + "." + (ri + 1))}: {standing}/{next.min}</Text> : <Text style={{ fontFamily: F.display, fontSize: 9, color: C.sage }}>{t("fac.maxRank")}</Text>}
                  </View>
                );
              })()}

              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Pressable disabled={!canAct} onPress={() => { hap("tap"); apply((s) => doFactionTask(s, f.id)); }} style={{ flex: 1, paddingVertical: 10, borderRadius: 7, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.bg, alignItems: "center" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: canAct ? C.parchment : C.parchmentMuted }}>{t("fac."+f.id+".tl").toUpperCase()}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 9, color: C.goldDim, marginTop: 2 }}>+{f.task.reward}⚜ · +{f.task.standing} {t("fac.repute").toLowerCase()}</Text>
                </Pressable>
                {!isMember && banLeft > 0 ? (
                  <View style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 7, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.blood, letterSpacing: 0.5 }}>{applyParams(t("fac.banLeft"), [banLeft])}</Text>
                  </View>
                ) : !isMember && (
                  <Pressable disabled={!canJoin || !canAct} onPress={() => { hap("success"); apply((s) => joinFaction(s, f.id)); }} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 7, borderWidth: 1, borderColor: canJoin ? "rgba(201,168,76,0.5)" : C.border, backgroundColor: canJoin ? "rgba(201,168,76,0.12)" : C.bg, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 11, color: canJoin ? C.gold : C.parchmentMuted, letterSpacing: 1 }}>{t("misc.join")}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
