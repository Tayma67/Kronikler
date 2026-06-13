import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "../../lib/store";
import { currentCalendar } from "../../lib/calendar";
import { C, F } from "../../lib/theme";

function StatBar({ icon, value, max, color }: { icon: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <Text style={{ fontSize: 12, width: 16 }}>{icon}</Text>
      <View style={{ flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 2 }}>
        <View style={{ width: `${pct}%`, height: 4, backgroundColor: color, borderRadius: 2 }} />
      </View>
      <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchment, width: 34, textAlign: "right" }}>{Math.round(value)}</Text>
    </View>
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { state, doAdvance, doEat } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const cal = currentCalendar(state.turn);
  const events = [...state.history].reverse();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Hero */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Text style={{ fontFamily: F.display, fontSize: 20, color: C.parchment, letterSpacing: 1, textAlign: "center" }}>{p.name}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.gold, textAlign: "center", marginTop: 2 }}>
          {p.profession === "işsiz" ? "İşsiz" : p.profession} · {p.age} yaş
        </Text>
        <Text style={{ fontFamily: F.display, fontSize: 9, color: C.parchmentMuted, letterSpacing: 1, textAlign: "center", marginTop: 4 }}>
          {cal.season.toUpperCase()} · {cal.month_name.toUpperCase()} {cal.year}
        </Text>
        <View style={{ marginTop: 12, paddingHorizontal: 20 }}>
          <StatBar icon="❤" value={p.health} max={100} color={C.blood} />
          <StatBar icon="🍎" value={p.hunger} max={100} color={C.sage} />
          <StatBar icon="⚜" value={p.money} max={200} color={C.gold} />
        </View>
        {p.dead && <Text style={{ color: C.blood, textAlign: "center", marginTop: 8, fontFamily: F.serifItalic }}>Hayatını tamamladı.</Text>}
      </View>

      {/* Günlük */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
        <View style={{ width: 3, height: 18, backgroundColor: C.gold, borderRadius: 2 }} />
        <Text style={{ fontFamily: F.display, fontSize: 14, color: C.gold, letterSpacing: 1.5 }}>HAYAT GÜNLÜĞÜ</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {events.length === 0 ? (
          <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, textAlign: "center", marginTop: 30 }}>
            Günlüğün henüz boş. Ayı ilerlet, hikayen başlasın.
          </Text>
        ) : events.map((e, i) => (
          <View key={i} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftColor: C.gold, borderLeftWidth: 2.5, borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment, lineHeight: 20 }}>{e.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Aksiyonlar */}
      <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border }}>
        <Pressable onPress={() => doEat()} disabled={p.dead} style={{ paddingVertical: 14, paddingHorizontal: 18, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentDim, letterSpacing: 1 }}>🍞 YE</Text>
        </Pressable>
        <Pressable onPress={() => doAdvance(1)} disabled={p.dead} style={{ flex: 1, paddingVertical: 14, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold, alignItems: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 14, color: "#1a1206", letterSpacing: 2 }}>⏳ AYI İLERLE</Text>
        </Pressable>
      </View>
    </View>
  );
}
