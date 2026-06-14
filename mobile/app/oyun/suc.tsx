import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { doCrime } from "../../lib/game";
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

  const Crime = ({ kind, title, desc }: { kind: "yankesicilik" | "soygun"; title: string; desc: string }) => (
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

        {state.player.age < 13 ? (
          <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, textAlign: "center", marginTop: 10 }}>{t("suc.tooYoung")}</Text>
        ) : (
          <>
            <Crime kind="yankesicilik" title={t("crime.yankesicilik.l")} desc={t("crime.yankesicilik.d")} />
            <Crime kind="soygun" title={t("crime.soygun.l")} desc={t("crime.soygun.d")} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
