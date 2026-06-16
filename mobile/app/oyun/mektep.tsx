import { View, Text, Pressable, ScrollView } from "react-native";
import { useState } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { SUBJECTS, studySubject, studiedThisTurn, lessonsToExam, CLUBS, joinClub } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { playTap } from "../../lib/sound";
import { BackLabel, PageHeader } from "../../lib/ui";

// Her ders hangi yönü geliştirir → ilerleme kaynağı + ton.
const META: Record<string, { kind: "skill" | "nam"; key: string; tone: string }> = {
  din:       { kind: "nam",   key: "dindar", tone: "#9C7BC4" },
  matematik: { kind: "skill", key: "trade",  tone: "#C9A84C" },
  edebiyat:  { kind: "skill", key: "social", tone: "#6FA0C0" },
  beden:     { kind: "skill", key: "combat", tone: "#E0922E" },
};

export default function Mektep() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  const [last, setLast] = useState<null | { key: string; chips: { label: string; col: string }[]; tick: number }>(null);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const done = studiedThisTurn(state);          // bu ay ders işlendi mi
  const toExam = lessonsToExam(p);              // sınava kaç ders

  const onStudy = (id: string) => {
    if (p.dead || done) return;
    hap("success"); playTap();
    const res = studySubject(state, id);
    if (res.blocked) return;
    apply(() => res.state);
    setLast({ key: res.key, chips: res.chips, tick: Date.now() });
  };

  // Bir dersin geliştirdiği yönün ilerleme durumu.
  const progressOf = (id: string) => {
    const m = META[id];
    if (m.kind === "nam") {
      const v = p.nam?.[m.key as keyof typeof p.nam] || 0;
      return { label: t("nam." + m.key), sub: `${v}/100`, pct: v };
    }
    const lvl = (p.skills as any)[m.key] as number;
    const xp = (p.skill_xp as any)[m.key] as number;
    const pct = lvl >= 10 ? 100 : xp % 100;
    return { label: `${t("skill." + m.key)} · ${t("mek.lv")}${lvl}`, sub: lvl >= 10 ? "MAX" : `${xp % 100}/100`, pct };
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 100 }}>
        <PageHeader kicker={t("scr.mektep")} icon="🎓" title={t("scr.mektep")} sub={p.age < 18 ? t("mek.young") : t("mek.old")} />

        {/* Sınav ilerlemesi / bu ay ders durumu */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: done ? "rgba(127,166,106,0.10)" : "rgba(201,168,76,0.07)", borderWidth: 1, borderColor: done ? "rgba(127,166,106,0.4)" : C.border, borderRadius: 10, padding: 11, marginBottom: 12 }}>
          <Text style={{ fontSize: 14 }}>{done ? "✓" : toExam === 1 ? "📜" : "📖"}</Text>
          <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12, color: done ? C.sage : toExam === 1 ? C.gold : C.parchment }}>
            {done ? t("mek.doneMonth") : (toExam === 1 ? t("mek.examNow") : applyParams(t("mek.exam"), [toExam]))}
          </Text>
        </View>

        {/* Dağıtılmamış özellik puanı uyarısı */}
        {p.stat_points > 0 && (
          <Pressable onPress={() => { hap("tap"); router.push("/oyun/karakter"); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(224,188,90,0.10)", borderWidth: 1, borderColor: "rgba(224,188,90,0.45)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 14, color: "#1a1206" }}>{p.stat_points}</Text>
            </View>
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchment }}>{t("mek.pointsCta")}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1, color: C.gold }}>{t("mek.spend")} ›</Text>
          </Pressable>
        )}

        {/* Mektep kulübü (okul çağı) */}
        {p.age < 18 && (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.goldDim, marginBottom: 7 }}>{t("club.head").toUpperCase()}</Text>
            <View style={{ flexDirection: "row", gap: 7 }}>
              {CLUBS.map((cl) => {
                const on = p.club === cl.id;
                return (
                  <Pressable key={cl.id} onPress={() => { hap("tap"); apply((s) => joinClub(s, on ? null : cl.id)); }} style={{ flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1, alignItems: "center", borderColor: on ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: on ? "rgba(201,168,76,0.12)" : C.bg }}>
                    <GameIcon name={cl.id === "koro" ? "lyre" : cl.id === "gures" ? "crossed-swords" : "anvil"} size={16} color={on ? C.gold : C.goldDim} />
                    <Text style={{ fontFamily: F.display, fontSize: 10.5, color: on ? C.gold : C.parchment, marginTop: 4 }}>{t("club." + cl.id)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 7 }}>{t("club.hint")}</Text>
          </View>
        )}

        {/* Anlık sonuç bandı */}
        {last && last.key !== "" && (
          <Animated.View key={last.tick} entering={FadeInDown.duration(260)} style={{ backgroundColor: "rgba(201,168,76,0.10)", borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderLeftWidth: 3, borderLeftColor: C.gold, borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.parchment, lineHeight: 19 }}>{t(last.key)}</Text>
            {last.chips.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {last.chips.map((c, i) => (
                  <View key={i} style={{ backgroundColor: c.col + "22", borderWidth: 1, borderColor: c.col + "66", borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 0.5, color: c.col }}>{c.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* Ders kartları */}
        <View style={{ gap: 12 }}>
          {SUBJECTS.map((sub) => {
            const m = META[sub.id];
            const pr = progressOf(sub.id);
            return (
              <View key={sub.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: m.tone + "44", borderRadius: 14, overflow: "hidden" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 13 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 11, backgroundColor: m.tone + "18", borderWidth: 1, borderColor: m.tone + "55", alignItems: "center", justifyContent: "center" }}>
                    <GameIcon name={sub.icon} size={24} color={m.tone} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, letterSpacing: 0.5 }}>{t("subj." + sub.id + ".l")}</Text>
                    <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentMuted, marginTop: 1 }}>{t("subj." + sub.id + ".d")}</Text>
                  </View>
                </View>

                {/* Geliştirir + ilerleme çubuğu */}
                <View style={{ paddingHorizontal: 13, paddingBottom: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1, color: C.parchmentMuted }}>{t("mek.develops").toUpperCase()}: {pr.label}</Text>
                    <Text style={{ fontFamily: F.display, fontSize: 9, color: m.tone }}>{pr.sub}</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <View style={{ width: `${Math.max(0, Math.min(100, pr.pct))}%`, height: 6, borderRadius: 3, backgroundColor: m.tone }} />
                  </View>
                </View>

                {/* Kazanım + Çalış */}
                <View style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: C.border }}>
                  <View style={{ flex: 1, paddingHorizontal: 13, paddingVertical: 10 }}>
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{t("mek.chancePoint")}</Text>
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentDim, marginTop: 1 }}>🍎 {t("mek.cost")}</Text>
                  </View>
                  <Pressable onPress={() => onStudy(sub.id)} disabled={p.dead || done} style={({ pressed }) => ({ alignSelf: "stretch", justifyContent: "center", paddingHorizontal: 18, backgroundColor: done ? C.bg : pressed ? m.tone + "33" : m.tone + "1A", borderLeftWidth: 1, borderLeftColor: done ? C.border : m.tone + "44", opacity: done ? 0.5 : 1 })}>
                    <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: done ? C.parchmentMuted : m.tone }}>{t("mek.study")}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
