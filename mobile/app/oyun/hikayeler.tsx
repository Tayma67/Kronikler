import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { beginArc, advanceArc } from "../../lib/game";
import { ARCS, arcById, availableArcs } from "../../lib/arcs";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";

export default function Hikayeler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const st = state.story;
  const active = arcById(st.active?.id || null);
  const stage = active && st.active ? active.stages[st.active.stage] : null;
  const avail = availableArcs(p, st.completed, st.tension, st.active?.id || null);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>Hikâyelerim</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {/* Aktif yay */}
        {active && stage ? (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <GameIcon name={active.icon} size={20} color={C.gold} />
              <Text style={{ fontFamily: F.display, fontSize: 15, color: C.gold, letterSpacing: 0.5 }}>{active.title}</Text>
            </View>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment, lineHeight: 22, marginBottom: 14 }}>{stage.text}</Text>
            {stage.choices.map((c, i) => (
              <Pressable key={i} onPress={() => apply((s) => advanceArc(s, i))} style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", marginBottom: 9 }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment, letterSpacing: 0.5, textAlign: "center" }}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginVertical: 10 }}>
            Şu an açık bir hikâyen yok. Hayatın seni yeni maceralara çağırıyor.
          </Text>
        )}

        {/* Açılabilecek yaylar */}
        {!active && avail.length > 0 && (
          <>
            <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginBottom: 8 }}>Seni Bekleyenler</Text>
            {avail.map((a) => (
              <View key={a.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 9 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <GameIcon name={a.icon} size={18} color={C.gold} />
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{a.title}</Text>
                </View>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginTop: 5 }}>{a.blurb}</Text>
                <Pressable onPress={() => apply((s) => beginArc(s, a.id))} style={{ alignSelf: "flex-start", marginTop: 10, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.1)" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold, letterSpacing: 1 }}>BAŞLA</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}

        {/* Tamamlananlar */}
        {st.completed.length > 0 && (
          <>
            <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginTop: 14, marginBottom: 8 }}>Tamamlanan Hikâyeler</Text>
            {st.completed.map((id) => {
              const a = arcById(id); if (!a) return null;
              return (
                <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border }}>
                  <GameIcon name={a.icon} size={15} color={C.goldDim} />
                  <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted }}>{a.title}</Text>
                  <Text style={{ marginLeft: "auto", color: C.gold }}>✓</Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
