import { View, Text, Pressable, ScrollView, Image, ImageBackground } from "react-native";
import { useState } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { SUBJECTS, studySubject, studiedThisTurn, lessonsToExam, CLUBS, joinClub } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { subjImage, MEKTEP_HERO } from "../../lib/assets";
import { localFirstName, locSeed } from "../../lib/world";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { playTap } from "../../lib/sound";
import { BackLabel } from "../../lib/ui";

// Her ders hangi yönü geliştirir → ilerleme kaynağı + ton.
const META: Record<string, { kind: "skill" | "nam"; key: string; tone: string }> = {
  din:       { kind: "nam",   key: "dindar", tone: "#A988D0" },
  matematik: { kind: "skill", key: "trade",  tone: "#D4B45A" },
  edebiyat:  { kind: "skill", key: "social", tone: "#74A8CC" },
  beden:     { kind: "skill", key: "combat", tone: "#E96A38" },
};

export default function Mektep() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const [last, setLast] = useState<null | { key: string; chips: { label: string; col: string }[]; tick: number }>(null);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const done = studiedThisTurn(state);
  const toExam = lessonsToExam(p);
  const bond = p.teacherBond || 0;
  const bondCycle = bond % 8;
  // Mektebin hocası — bulunduğun yere göre deterministik (isimli gerçek hoca).
  const teacherName = `${t("mek.teacherTitle")} ${localFirstName(locSeed(p.location_name) + 7, "erkek", lang)}`;

  const onStudy = (id: string) => {
    if (p.dead || done) return;
    hap("success"); playTap();
    const res = studySubject(state, id);
    if (res.blocked) return;
    apply(() => res.state);
    setLast({ key: res.key, chips: res.chips, tick: Date.now() });
  };

  const progressOf = (id: string) => {
    const m = META[id];
    if (m.kind === "nam") {
      const v = p.nam?.[m.key as keyof typeof p.nam] || 0;
      return { pct: v };
    }
    const lvl = (p.skills as any)[m.key] as number;
    const xp = (p.skill_xp as any)[m.key] as number;
    return { pct: lvl >= 10 ? 100 : xp % 100 };
  };
  const develops = (id: string) => {
    const m = META[id];
    return m.kind === "nam" ? t("nam." + m.key) : t("skill." + m.key);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 100 }}>

        {/* Başlık kartı — atmosfer + sınav rozeti */}
        <View style={{ borderRadius: 14, overflow: "hidden", borderWidth: 1.5, borderColor: C.borderHi, marginBottom: 14 }}>
          <ImageBackground source={MEKTEP_HERO} resizeMode="cover" style={{ width: "100%" }} imageStyle={{ opacity: 0.5 }}>
            <View style={{ backgroundColor: "rgba(20,13,7,0.62)", padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Image source={MEKTEP_HERO} style={{ width: 48, height: 48, borderRadius: 11, borderWidth: 2, borderColor: C.gold }} resizeMode="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 18, letterSpacing: 1.5, color: C.parchment }}>{t("scr.mektep").toUpperCase()}</Text>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentDim, marginTop: 1 }}>{p.age < 18 ? t("mek.young") : t("mek.old")}</Text>
                </View>
                <View style={{ alignItems: "center", gap: 3, borderWidth: 1, borderColor: "rgba(201,168,76,0.55)", backgroundColor: "rgba(201,168,76,0.16)", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 9 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="mektep" size={9} color={C.gold} /><Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 0.5, color: C.gold }}>SINAV</Text></View>
                  <Text style={{ fontFamily: F.display, fontSize: 10, color: done ? C.sage : toExam === 1 ? C.ember : C.parchment }}>{done ? "✓" : toExam === 1 ? t("mek.examNow").replace("!", "") : applyParams(t("mek.exam"), [toExam])}</Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Dağıtılmamış puan CTA */}
        {p.stat_points > 0 && (
          <Pressable onPress={() => { hap("tap"); router.push("/oyun/karakter"); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(212,180,90,0.12)", borderWidth: 1.5, borderColor: "rgba(212,180,90,0.55)", borderRadius: 12, padding: 12, marginBottom: 13 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: "#1a1206" }}>{p.stat_points}</Text>
            </View>
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchment }}>{t("mek.pointsCta")}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1, color: C.gold }}>{t("mek.spend")} ›</Text>
          </Pressable>
        )}

        {/* Anlık sonuç bandı */}
        {last && last.key !== "" && (
          <Animated.View key={last.tick} entering={FadeInDown.duration(260)} style={{ backgroundColor: "rgba(212,180,90,0.10)", borderWidth: 1, borderColor: "rgba(212,180,90,0.4)", borderLeftWidth: 3, borderLeftColor: C.gold, borderRadius: 10, padding: 12, marginBottom: 13 }}>
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

        {/* Bu Ay Dersleri — dairesel amblemler */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 11 }}>
          <View style={{ width: 7, height: 7, backgroundColor: C.gold, transform: [{ rotate: "45deg" }] }} />
          <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 2, color: C.gold, textTransform: "uppercase" }}>{t("mek.lessonsHead")}</Text>
          <View style={{ flex: 1, height: 1.5, backgroundColor: C.goldDim, opacity: 0.6 }} />
          <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 0.8, color: C.parchmentMuted }}>{t("mek.cost")}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 9, marginBottom: 6 }}>
          {SUBJECTS.map((sub) => {
            const m = META[sub.id]; const pr = progressOf(sub.id);
            return (
              <Pressable key={sub.id} onPress={() => onStudy(sub.id)} disabled={p.dead || done} style={{ flex: 1, alignItems: "center", opacity: done ? 0.5 : 1 }}>
                <Image source={subjImage(sub.id)} style={{ width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: m.tone }} resizeMode="cover" />
                <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchment, marginTop: 7 }}>{t("subj." + sub.id + ".l")}</Text>
                <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 8.5, color: C.parchmentMuted, marginTop: 1 }}>{develops(sub.id)}</Text>
                <View style={{ width: 52, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.4)", overflow: "hidden", marginTop: 6, borderWidth: 1, borderColor: m.tone + "33" }}>
                  <View style={{ width: `${Math.max(0, Math.min(100, pr.pct))}%`, height: "100%", backgroundColor: m.tone }} />
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 8, marginBottom: 4 }}>
          {done ? t("mek.doneMonth") : applyParams(t("mek.exam"), [toExam])}
        </Text>

        {/* Öğrenci toplulukları (okul çağı) */}
        {p.age < 18 && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginTop: 12, marginBottom: 11 }}>
              <View style={{ width: 7, height: 7, backgroundColor: C.gold, transform: [{ rotate: "45deg" }] }} />
              <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 2, color: C.gold, textTransform: "uppercase" }}>{t("club.head")}</Text>
              <View style={{ flex: 1, height: 1.5, backgroundColor: C.goldDim, opacity: 0.6 }} />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {CLUBS.map((cl) => {
                const on = p.club === cl.id;
                return (
                  <Pressable key={cl.id} onPress={() => { hap("tap"); apply((s) => joinClub(s, on ? null : cl.id)); }} style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 13, borderWidth: 1.5, borderColor: on ? C.gold : C.border, backgroundColor: on ? "rgba(212,180,90,0.12)" : C.card }}>
                    {on && <View style={{ position: "absolute", top: 7, right: 7, borderWidth: 1, borderColor: "rgba(102,176,112,0.6)", backgroundColor: "rgba(102,176,112,0.18)", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}><Text style={{ fontFamily: F.display, fontSize: 7, color: C.sage }}>ÜYE</Text></View>}
                    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: on ? C.gold : C.borderHi, backgroundColor: "rgba(40,30,16,0.6)" }}>
                      <GameIcon name={cl.id === "koro" ? "lyre" : cl.id === "gures" ? "crossed-swords" : "anvil"} size={18} color={on ? C.gold : C.goldDim} />
                    </View>
                    <Text style={{ fontFamily: F.display, fontSize: 10.5, color: on ? C.gold : C.parchment, marginTop: 7 }}>{t("club." + cl.id)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 8 }}>{t("club.hint")}</Text>
          </>
        )}

        {/* Hocan — bağ */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginTop: 13, marginBottom: 11 }}>
          <View style={{ width: 7, height: 7, backgroundColor: C.gold, transform: [{ rotate: "45deg" }] }} />
          <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 2, color: C.gold, textTransform: "uppercase" }}>{t("mek.teacher")}</Text>
          <View style={{ flex: 1, height: 1.5, backgroundColor: C.goldDim, opacity: 0.6 }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 13, padding: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.borderHi, backgroundColor: "rgba(67,52,94,0.5)" }}>
            <GameIcon name="prayer-beads" size={20} color={C.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{teacherName}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentMuted, marginTop: 1 }}>{t("mek.bondNote")}</Text>
            <View style={{ flexDirection: "row", gap: 3, marginTop: 7 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <View key={i} style={{ width: 15, height: 6, borderRadius: 2, backgroundColor: i < bondCycle ? C.gold : "rgba(255,255,255,0.10)" }} />
              ))}
            </View>
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{bondCycle}/8</Text>
        </View>

      </ScrollView>
    </View>
  );
}
