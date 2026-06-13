import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { ENCOUNTERS, combatPower, fightEncounter } from "../../lib/game";
import { C, F } from "../../lib/theme";

export default function Savas() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const pw = combatPower(p);
  const canFight = p.age >= 13 && !p.dead;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>Çatışma</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.blood }}>⚔ {pw}</Text>
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 10 }}>
        Savaş gücün: {pw}. Kuvvet, dayanıklılık, silahın ve asker bağın gücünü belirler. {(p.inventory["bicak"] || 0) > 0 ? "Bıçağın yanında." : "Bir bıçak işine yarardı."}
      </Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {ENCOUNTERS.map((e) => {
          const odds = Math.max(0.1, Math.min(0.9, 0.5 + (pw - e.power) * 0.05));
          const tooStrong = e.power > pw + 8;
          return (
            <View key={e.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{e.title}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 11, color: tooStrong ? C.blood : C.goldDim }}>düşman gücü {e.power}</Text>
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginTop: 5, lineHeight: 18 }}>{e.desc}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.goldDim }}>Ödül +{e.reward}⚜ · Risk ~{e.danger} sağlık · Şans %{Math.round(odds * 100)}</Text>
                <Pressable disabled={!canFight} onPress={() => apply((s) => fightEncounter(s, e.id))} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 7, borderWidth: 1, borderColor: "rgba(168,52,52,0.55)", backgroundColor: canFight ? "rgba(168,52,52,0.14)" : C.card }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: canFight ? C.blood : C.parchmentMuted, letterSpacing: 1 }}>DÖVÜŞ</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
