import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { SOCIAL_AXES, socialTier, hostFeast, giveAlms, intimidate, factionById } from "../../lib/game";
import { C, F } from "../../lib/theme";

function Axis({ icon, label, value, tier, desc }: { icon: string; label: string; value: number; tier: string; desc: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, letterSpacing: 1 }}>{icon} {label}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.gold }}>{tier}</Text>
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>{desc}</Text>
      <View style={{ height: 5, backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 3, marginTop: 8 }}>
        <View style={{ width: `${pct}%`, height: 5, backgroundColor: C.gold, borderRadius: 3 }} />
      </View>
    </View>
  );
}

export default function Sosyal() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const f = factionById(p.faction);
  const canAct = p.age >= 13 && !p.dead;

  const actions = [
    { label: "Ziyafet Ver", cost: "40⚜", note: "+şöhret +itibar", fn: hostFeast, enabled: canAct && p.money >= 40 },
    { label: "Sadaka Dağıt", cost: "15⚜", note: "+şeref +itibar", fn: giveAlms, enabled: canAct && p.money >= 15 },
    { label: "Gözdağı Ver", cost: "—", note: "+korku −itibar", fn: intimidate, enabled: canAct },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>Mevki & İtibar</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: 10 }}>
          Adın diyarda nasıl anılıyor? {f ? `${f.name} üyesi olarak tanınıyorsun.` : "Henüz bir loncaya bağlı değilsin."}
        </Text>

        {SOCIAL_AXES.map((a) => (
          <Axis key={a.key} icon={a.icon} label={a.label} value={(p as any)[a.key]} tier={socialTier(a, (p as any)[a.key])} desc={a.desc} />
        ))}

        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginTop: 14, marginBottom: 8 }}>Mevkini İşle</Text>
        {actions.map((act) => (
          <Pressable key={act.label} disabled={!act.enabled} onPress={() => apply(act.fn)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: act.enabled ? "rgba(201,168,76,0.08)" : C.card, borderWidth: 1, borderColor: act.enabled ? "rgba(201,168,76,0.4)" : C.border, borderRadius: 9, padding: 13, marginBottom: 8 }}>
            <View>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: act.enabled ? C.parchment : C.parchmentMuted, letterSpacing: 0.5 }}>{act.label}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.goldDim, marginTop: 2 }}>{act.note}</Text>
            </View>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: act.enabled ? C.gold : C.parchmentMuted }}>{act.cost}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
