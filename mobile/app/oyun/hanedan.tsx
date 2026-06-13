import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { factionById } from "../../lib/game";
import { C, F } from "../../lib/theme";

export default function Hanedan() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const past = state.dynasty || [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>Hanedan</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 8 }}>
        {p.surname ? `${p.surname} soyu` : "Soyun"} · {p.generation}. nesil
      </Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {/* Şimdiki nesil */}
        <View style={{ backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.gold }}>{p.name}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 11, color: C.goldDim }}>{p.generation}. nesil</Text>
          </View>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchment, marginTop: 4 }}>
            {p.dead ? "Hayatını tamamladı." : `Yaşıyor · ${p.age} yaş · ${p.profession === "işsiz" ? "henüz mesleksiz" : p.profession}`}
          </Text>
          <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>
            Şöhret {Math.round(p.fame)} · İtibar {Math.round(p.reputation)} · {factionById(p.faction)?.name || "Bağımsız"}
          </Text>
        </View>

        {past.length === 0 ? (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, textAlign: "center", marginTop: 20 }}>
            Henüz geçmiş bir nesil yok. Soyun seninle başlıyor.
          </Text>
        ) : (
          <>
            <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginTop: 8, marginBottom: 8 }}>Atalar</Text>
            {[...past].reverse().map((a) => (
              <View key={a.generation} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftColor: C.gold, borderLeftWidth: 2.5, borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{a.name}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 10, color: C.goldDim }}>{a.generation}. nesil</Text>
                </View>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>
                  {a.profession} · {a.diedAge} yaşında göçtü · şöhret {a.fame}
                </Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.gold, marginTop: 4 }}>{a.note}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
