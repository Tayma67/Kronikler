import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { npcsOf } from "../../lib/game";
import { C, F } from "../../lib/theme";

function relLabel(v: number) {
  if (v >= 70) return { t: "Can dostu", c: C.sage };
  if (v >= 40) return { t: "Dost", c: C.sage };
  if (v >= 15) return { t: "Arkadaş", c: C.gold };
  if (v > 0) return { t: "Tanıdık", c: C.parchmentMuted };
  return { t: "Yabancı", c: C.parchmentMuted };
}

export default function Iliskiler() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const npcs = npcsOf(state);
  const rel = state.relationships;
  const sorted = [...npcs].sort((a, b) => (rel[b.id] || 0) - (rel[a.id] || 0));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontFamily: F.display, fontSize: 18, color: C.parchment, letterSpacing: 1 }}>Bağlar & Tanıdıklar</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted }}>Diyarda tanıdığın canlar.</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {sorted.map((n) => {
          const v = rel[n.id] || 0; const lab = relLabel(v);
          return (
            <Pressable key={n.id} onPress={() => router.push(`/oyun/npc/${n.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#2a1c0c", borderWidth: 1.5, borderColor: C.borderHi, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18 }}>{n.gender === "kadın" ? "👩" : "🧔"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{n.name}</Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{n.profession} · {n.age} yaş</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: lab.c }}>{v}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 9, color: lab.c }}>{lab.t}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
