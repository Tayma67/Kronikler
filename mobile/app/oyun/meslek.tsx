import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { changeProfession, PROFESSIONS, professionById, careerTier, careerTitle } from "../../lib/game";
import { C, F } from "../../lib/theme";
import { BackLabel } from "../../lib/ui";

const STAT_TR: Record<string, string> = { strength: "Güç", intelligence: "Zekâ", charisma: "Karizma", stamina: "Dayanıklılık" };

export default function Meslek() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  if (p.age < 13) {
    return <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 16, padding: 20 }}>
      <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, marginTop: 30, textAlign: "center" }}>Meslek edinmek için reşit olmalısın (13 yaş).</Text>
    </View>;
  }
  const curPr = professionById(p.profession);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>Meslek</Text>
        <View style={{ width: 40 }} />
      </View>

      {curPr && (
        <View style={{ marginHorizontal: 16, marginBottom: 10, padding: 13, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,168,76,0.45)", backgroundColor: "rgba(201,168,76,0.08)" }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{careerTitle(p.profession, p.career_xp)} · {curPr.name}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>
            Kariyer basamağı {careerTier(curPr, p.career_xp) + 1}/{curPr.tiers.length} · çalıştıkça yükselirsin
          </Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {curPr.tiers.map((t, i) => (
              <Text key={i} style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: i <= careerTier(curPr, p.career_xp) ? C.gold : C.parchmentMuted, borderWidth: 1, borderColor: i <= careerTier(curPr, p.career_xp) ? "rgba(201,168,76,0.5)" : C.border, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 }}>{t.toUpperCase()}</Text>
            ))}
          </View>
        </View>
      )}

      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 8 }}>
        Başka bir zanaata geçersen kariyerin en alttan başlar.
      </Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {PROFESSIONS.map((pr) => {
          const cur = pr.id === p.profession;
          return (
            <Pressable key={pr.id} onPress={() => apply((s) => changeProfession(s, pr.id))} disabled={cur} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: cur ? "rgba(201,168,76,0.5)" : C.border, borderRadius: 10, padding: 14, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 14, color: cur ? C.gold : C.parchment }}>{pr.name}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{STAT_TR[pr.stat]} · {pr.tiers.length} kademe</Text>
              </View>
              {cur ? <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.gold }}>mevcut</Text> : <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>GEÇ ›</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
