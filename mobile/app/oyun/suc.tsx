import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { doCrime, resolveCrimeScene, CrimeKind, fenceHotGoods } from "../../lib/game";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader } from "../../lib/ui";

export default function Suc() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  const [res, setRes] = useState<null | { text: string; ok: boolean; tick: number }>(null);
  const seen = useRef<number>(state?.history.length ?? 0);

  // Suç sonucunu (en yeni suç olayı) anlık şerit olarak yansıt.
  useEffect(() => {
    if (!state) return;
    const h = state.history;
    if (h.length > seen.current) {
      const fresh = h.slice(seen.current);
      const ev = [...fresh].reverse().find((e) => e.type === "suç" || e.type === "suç_yakalandı");
      if (ev) setRes({ text: ev.text, ok: ev.type === "suç", tick: Date.now() });
    }
    seen.current = h.length;
  }, [state?.history.length]);

  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const Crime = ({ kind, title, desc }: { kind: CrimeKind; title: string; desc: string }) => (
    <Pressable onPress={() => { hap("advance"); apply((s) => doCrime(s, kind)); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(123,79,175,0.4)", borderLeftWidth: 2.5, borderLeftColor: C.ink, borderRadius: 11, padding: 14, marginBottom: 10 }}>
      <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: "rgba(123,79,175,0.12)", borderWidth: 1, borderColor: "rgba(123,79,175,0.35)", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 18 }}>🗡</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.ink }}>{title}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentMuted, marginTop: 3 }}>{desc}</Text>
      </View>
      <Text style={{ color: C.ink, fontSize: 15 }}>›</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.suc")} icon="🥷" title={t("scr.suc")} sub={t("suc.hint")} />

        {res && (
          <Animated.View key={res.tick} entering={FadeInDown.duration(240)} style={{ backgroundColor: res.ok ? "rgba(127,166,106,0.10)" : "rgba(200,64,64,0.10)", borderWidth: 1, borderColor: res.ok ? "rgba(127,166,106,0.5)" : "rgba(200,64,64,0.5)", borderLeftWidth: 3, borderLeftColor: res.ok ? C.sage : C.blood, borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchment, lineHeight: 19 }}>{res.text}</Text>
          </Animated.View>
        )}

        {(state.player.hotGoods || 0) > 0 && (
          <View style={{ backgroundColor: "rgba(123,79,175,0.08)", borderWidth: 1, borderColor: "rgba(123,79,175,0.4)", borderRadius: 11, padding: 13, marginBottom: 12 }}>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.goldDim }}>{t("crime.hotPanel").toUpperCase()}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment, marginTop: 4 }}>{state.player.hotGoods} ⚜ {t("crime.hotValue")}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 2 }}>{t(state.player.faction === "golge" ? "crime.fenceGolge" : "crime.fenceRisk")}</Text>
            <Pressable onPress={() => { hap("advance"); apply((s) => fenceHotGoods(s)); }} style={{ marginTop: 9, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.12)", alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: 0.5, color: C.gold }}>{t("crime.fence")}</Text>
            </Pressable>
          </View>
        )}

        {state.player.age < 13 ? (
          <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, textAlign: "center", marginTop: 10 }}>{t("suc.tooYoung")}</Text>
        ) : (
          <>
            <Crime kind="yankesicilik" title={t("crime.yankesicilik.l")} desc={t("crime.yankesicilik.d")} />
            <Crime kind="dukkan_soyma" title={t("crime.dukkan_soyma.l")} desc={t("crime.dukkan_soyma.d")} />
            <Crime kind="soygun" title={t("crime.soygun.l")} desc={t("crime.soygun.d")} />
            <Crime kind="konak_soygunu" title={t("crime.konak_soygunu.l")} desc={t("crime.konak_soygunu.d")} />
          </>
        )}
      </ScrollView>

      {/* Kesinti sahnesi — yakalanmak üzeresin: Saklan / Rüşvet / Kaç (Vercel interrupt) */}
      {state.pendingScene?.kind === "crime" && (
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.72)", alignItems: "center", justifyContent: "center", padding: 22 }}>
          <Animated.View entering={FadeInDown.duration(220)} style={{ width: "100%", maxWidth: 420, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.ink, borderRadius: 14, padding: 18 }}>
            <Text style={{ fontFamily: F.display, fontSize: 17, color: C.ink, textAlign: "center", letterSpacing: 0.5 }}>{t("crimesc.title")}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchment, textAlign: "center", lineHeight: 20, marginTop: 10, marginBottom: 16 }}>{t("crimesc.text")}</Text>
            {([["saklan", "crimesc.hide"], ["rusvet", "crimesc.bribe"], ["kac", "crimesc.run"]] as const).map(([ch, key]) => (
              <Pressable key={ch} onPress={() => { hap("selection"); apply((s) => resolveCrimeScene(s, ch)); }} style={{ borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.bg, borderRadius: 9, paddingVertical: 12, marginTop: 8, alignItems: "center" }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, letterSpacing: 0.5 }}>{t(key)}</Text>
              </Pressable>
            ))}
          </Animated.View>
        </View>
      )}
    </View>
  );
}
