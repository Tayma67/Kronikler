import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { SOCIAL_AXES, socialTierIndex, hostFeast, giveAlms, intimidate, factionById, NAM_META } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel } from "../../lib/ui";

function Section({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginTop: 16, marginBottom: 2 }}>{title}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginBottom: 9 }}>{sub}</Text>
    </>
  );
}

function Axis({ icon, label, value, tier, desc }: { icon: string; label: string; value: number; tier: string; desc: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, letterSpacing: 1 }}>{icon} {label}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.gold }}>{tier}</Text>
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>{desc}</Text>
      <View style={{ height: 5, backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 3, marginTop: 8 }}>
        <View style={{ width: `${pct}%`, height: 5, backgroundColor: C.gold, borderRadius: 3 }} />
      </View>
    </View>
  );
}

export default function Sosyal() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const f = factionById(p.faction);
  const canAct = p.age >= 13 && !p.dead;

  const actions = [
    { key: "feast", fn: hostFeast, cost: "40⚜", enabled: canAct && p.money >= 40 },
    { key: "alms", fn: giveAlms, cost: "15⚜", enabled: canAct && p.money >= 15 },
    { key: "intim", fn: intimidate, cost: "—", enabled: canAct },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{t("scr.sosyal")}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: 4 }}>
          {t("soc.intro")} {f ? `${f.name} ${t("soc.memberSuffix")}` : t("soc.noGuild")}
        </Text>

        <Section title={t("soc.mevki.h")} sub={t("soc.mevki.sub")} />
        {SOCIAL_AXES.map((a) => {
          const v = (p as any)[a.key];
          return <Axis key={a.key} icon={a.icon} label={t("soc." + a.key + ".l")} value={v} tier={t("soc." + a.key + ".t" + socialTierIndex(v))} desc={t("soc." + a.key + ".d")} />;
        })}

        <Section title={t("soc.nam.h")} sub={t("soc.nam.sub")} />
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 6 }}>
          {NAM_META.map((nm) => {
            const val = (p.nam?.[nm.key]) || 0;
            return (
              <View key={nm.key} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <GameIcon name={nm.icon} size={14} color={C.goldDim} />
                <Text style={{ width: 72, fontFamily: F.display, fontSize: 11, color: C.parchmentMuted }}>{t("nam." + nm.key)}</Text>
                <View style={{ flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 2 }}>
                  <View style={{ width: `${val}%`, height: 4, backgroundColor: C.gold, borderRadius: 2 }} />
                </View>
                <Text style={{ width: 26, textAlign: "right", fontFamily: F.display, fontSize: 11, color: C.parchment }}>{val}</Text>
              </View>
            );
          })}
        </View>

        <Section title={t("soc.act.h")} sub="" />
        {actions.map((act) => (
          <Pressable key={act.key} disabled={!act.enabled} onPress={() => apply(act.fn)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: act.enabled ? "rgba(201,168,76,0.08)" : C.card, borderWidth: 1, borderColor: act.enabled ? "rgba(201,168,76,0.4)" : C.border, borderRadius: 9, padding: 13, marginBottom: 8 }}>
            <View>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: act.enabled ? C.parchment : C.parchmentMuted, letterSpacing: 0.5 }}>{t("soc." + act.key + ".l")}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.goldDim, marginTop: 2 }}>{t("soc." + act.key + ".n")}</Text>
            </View>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: act.enabled ? C.gold : C.parchmentMuted }}>{act.cost}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
