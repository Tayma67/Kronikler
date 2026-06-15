import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { SOCIAL_AXES, socialTierIndex, hostFeast, giveAlms, intimidate, factionById, NAM_META, rumorAction, playerDominantNam } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { playTap } from "../../lib/sound";
import { BackLabel, PageHeader } from "../../lib/ui";

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
  const [res, setRes] = useState<null | { text: string; tick: number }>(null);
  const seen = useRef<number>(state?.history.length ?? 0);

  // Sosyal eylem sonucunu anlık şerit olarak yansıt.
  useEffect(() => {
    if (!state) return;
    const h = state.history;
    if (h.length > seen.current) {
      const fresh = h.slice(seen.current);
      const ev = [...fresh].reverse().find((e) => e.type === "sosyal");
      if (ev) setRes({ text: ev.text, tick: Date.now() });
    }
    seen.current = h.length;
  }, [state?.history.length]);

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
        <View style={{ width: 40 }} />
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <PageHeader kicker={t("scr.sosyal")} icon="👑" title={t("scr.sosyal")} />
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: 4 }}>
          {t("soc.intro")} {f ? `${f.name} ${t("soc.memberSuffix")}` : t("soc.noGuild")}
        </Text>

        {res && (
          <Animated.View key={res.tick} entering={FadeInDown.duration(240)} style={{ backgroundColor: "rgba(201,168,76,0.10)", borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderLeftWidth: 3, borderLeftColor: C.gold, borderRadius: 10, padding: 12, marginTop: 8 }}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchment, lineHeight: 19 }}>{res.text}</Text>
          </Animated.View>
        )}

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
        {(() => {
          const dom = playerDominantNam(p);
          return (
            <View style={{ backgroundColor: dom ? "rgba(201,168,76,0.1)" : C.card, borderWidth: 1, borderColor: dom ? "rgba(201,168,76,0.4)" : C.border, borderLeftWidth: 3, borderLeftColor: dom ? C.gold : C.border, borderRadius: 10, padding: 12, marginBottom: 6 }}>
              <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 1.5, color: C.goldDim, textTransform: "uppercase" }}>{t("nam.dominant")}{dom ? `: ${t("nam." + dom)}` : ""}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentDim, lineHeight: 18, marginTop: 4 }}>{t(dom ? "nam.dom." + dom : "nam.dom.none")}</Text>
            </View>
          );
        })()}

        <Section title={t("rum.title")} sub="" />
        {(() => {
          const rumors = state.player_rumors || [];
          if (!rumors.length) return <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: 6 }}>{t("rum.none")}</Text>;
          return [...rumors].reverse().map((r) => {
            const txt = applyParams(t("rumor." + r.tur + "." + r.vi), [p.name, r.kaynak]);
            const cost = 15 * Math.round(r.siddet);
            return (
              <View key={r.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: r.yon > 0 ? "rgba(124,160,90,0.35)" : "rgba(160,60,60,0.35)", borderLeftWidth: 3, borderLeftColor: r.yon > 0 ? C.sage : C.blood, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentDim, lineHeight: 18 }}>{txt}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 1, color: C.goldDim, marginTop: 4 }}>{t("rum.intensity").toUpperCase()}: {"●".repeat(Math.round(r.siddet))}</Text>
                <View style={{ flexDirection: "row", gap: 7, marginTop: 8 }}>
                  <Pressable disabled={!canAct} onPress={() => { hap("tap"); playTap(); apply((s) => rumorAction(s, r.id, "yuzles")); }} style={{ flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 7, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.bg }}>
                    <Text style={{ fontFamily: F.display, fontSize: 10.5, color: C.parchment }}>{t("rum.confront")}</Text>
                  </Pressable>
                  {r.yon > 0 && (
                    <Pressable disabled={!canAct} onPress={() => { hap("tap"); playTap(); apply((s) => rumorAction(s, r.id, "yay")); }} style={{ flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 7, borderWidth: 1, borderColor: "rgba(124,160,90,0.5)", backgroundColor: "rgba(124,160,90,0.1)" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 10.5, color: C.sage }}>{t("rum.spread")}</Text>
                    </Pressable>
                  )}
                  <Pressable disabled={!canAct || p.money < cost} onPress={() => { hap("tap"); playTap(); apply((s) => rumorAction(s, r.id, "sustur")); }} style={{ flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 7, borderWidth: 1, borderColor: (canAct && p.money >= cost) ? "rgba(201,168,76,0.5)" : C.border, backgroundColor: C.bg }}>
                    <Text style={{ fontFamily: F.display, fontSize: 10.5, color: (canAct && p.money >= cost) ? C.gold : C.parchmentMuted }}>{t("rum.silence")} {cost}⚜</Text>
                  </Pressable>
                </View>
              </View>
            );
          });
        })()}

        <Section title={t("soc.act.h")} sub="" />
        {actions.map((act) => (
          <Pressable key={act.key} disabled={!act.enabled} onPress={() => { hap("tap"); playTap(); apply(act.fn); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: act.enabled ? "rgba(201,168,76,0.08)" : C.card, borderWidth: 1, borderColor: act.enabled ? "rgba(201,168,76,0.4)" : C.border, borderRadius: 9, padding: 13, marginBottom: 8 }}>
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
