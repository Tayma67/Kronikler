import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { FACTIONS, factionById, doFactionTask, joinFaction, leaveFaction } from "../../lib/game";
import { C, F } from "../../lib/theme";

const STAT_TR: Record<string, string> = { strength: "Güç", intelligence: "Zekâ", charisma: "Karizma", stamina: "Dayanıklılık" };

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
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const current = factionById(p.faction);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>Örgütler</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 8 }}>
        Loncalara görev gör, itibar kazan; yeterince güvenildiğinde saflarına katıl.
      </Text>

      {current && (
        <View style={{ marginHorizontal: 16, marginBottom: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,168,76,0.45)", backgroundColor: "rgba(201,168,76,0.08)" }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold, letterSpacing: 1 }}>{current.icon} {current.name} üyesisin</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchment, marginTop: 3 }}>{current.perk}</Text>
          <Pressable onPress={() => apply(leaveFaction)} style={{ alignSelf: "flex-start", marginTop: 8 }}>
            <Text style={{ fontFamily: F.display, fontSize: 10, color: C.blood, letterSpacing: 1 }}>SAFLARINDAN AYRIL</Text>
          </Pressable>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {FACTIONS.map((f) => {
          const standing = p.faction_standing[f.id] || 0;
          const isMember = p.faction === f.id;
          const canJoin = !isMember && standing >= f.joinRep;
          const canAct = p.age >= 13 && !p.dead;
          return (
            <View key={f.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: isMember ? "rgba(201,168,76,0.45)" : C.border, borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 22 }}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{f.name}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.goldDim }}>Uygun özellik: {STAT_TR[f.stat]}</Text>
                </View>
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginTop: 6, lineHeight: 18 }}>{f.blurb}</Text>

              <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                <Text style={{ fontFamily: F.display, fontSize: 10, color: C.parchmentMuted, letterSpacing: 1 }}>İTİBAR {standing}/{f.joinRep}</Text>
                {isMember && <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold, letterSpacing: 1 }}>ÜYE ✓</Text>}
              </View>
              <Bar value={standing} max={f.joinRep} />

              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Pressable disabled={!canAct} onPress={() => apply((s) => doFactionTask(s, f.id))} style={{ flex: 1, paddingVertical: 10, borderRadius: 7, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.bg, alignItems: "center" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: canAct ? C.parchment : C.parchmentMuted }}>{f.task.label.toUpperCase()}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 9, color: C.goldDim, marginTop: 2 }}>+{f.task.reward}⚜ · +{f.task.standing} itibar</Text>
                </Pressable>
                {!isMember && (
                  <Pressable disabled={!canJoin || !canAct} onPress={() => apply((s) => joinFaction(s, f.id))} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 7, borderWidth: 1, borderColor: canJoin ? "rgba(201,168,76,0.5)" : C.border, backgroundColor: canJoin ? "rgba(201,168,76,0.12)" : C.bg, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 11, color: canJoin ? C.gold : C.parchmentMuted, letterSpacing: 1 }}>KATIL</Text>
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
