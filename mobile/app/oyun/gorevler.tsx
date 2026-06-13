import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { opportunitiesFor, playerWar, pendingPerkCount, nemesisEncounter } from "../../lib/game";
import { arcById } from "../../lib/arcs";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";

export default function Gorevler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;

  type Task = { icon: string; title: string; sub: string; to: string; urgent?: boolean };
  const tasks: Task[] = [];

  if (p.dead) {
    if (p.children.length > 0) tasks.push({ icon: "baby", title: "Nesli devam ettir", sub: "Vâris ve vasiyet seç", to: "/oyun/nesil", urgent: true });
  } else {
    if (p.stat_points > 0) tasks.push({ icon: "shield", title: `${p.stat_points} özellik puanı bekliyor`, sub: "Karakter ekranında dağıt", to: "/oyun/karakter", urgent: true });
    if (pendingPerkCount(p) > 0) tasks.push({ icon: "medal", title: `${pendingPerkCount(p)} hüner seçilebilir`, sub: "Beceri ağacından seç", to: "/oyun/beceriler", urgent: true });
    const arc = arcById(state.story.active?.id || null);
    if (arc) tasks.push({ icon: arc.icon, title: `Hikâye: ${arc.title}`, sub: "Devam eden bir hikâyen var", to: "/oyun/hikayeler", urgent: true });
    const war = playerWar(state);
    if (war) tasks.push({ icon: "crossed-swords", title: "Loncan savaşta", sub: "Cepheye gidebilirsin", to: "/oyun/orgutler" });
    if (nemesisEncounter(state)) tasks.push({ icon: "skull", title: "Nemesis seni arıyor", sub: "Hesaplaşma vakti", to: "/oyun/savas", urgent: true });
    if (state.caravan) tasks.push({ icon: "scales", title: "Kervanın yolda", sub: `${state.caravan.dest} · dönüşü yakında`, to: "/oyun/pazar" });
    const opps = opportunitiesFor(state);
    if (opps.length) tasks.push({ icon: "compass", title: `${opps.length} fırsat açık`, sub: opps.map((o) => o.title).join(", "), to: "/oyun/firsatlar" });
    if (!p.faction && p.age >= 13) tasks.push({ icon: "crown", title: "Bir loncaya katılabilirsin", sub: "Görev görüp itibar topla", to: "/oyun/orgutler" });
    if (!p.married && p.age >= 18) tasks.push({ icon: "ring", title: "Henüz evlenmedin", sub: "İlişkilerden birine dünür gönder", to: "/oyun/iliskiler" });
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>Açık İşler</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 8 }}>
        Seni bekleyen işler ve fırsatlar — tek bakışta.
      </Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {tasks.length === 0 ? (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", marginTop: 30 }}>
            Şimdilik acil bir iş yok. Ayı ilerlet, hayat akışına devam etsin.
          </Text>
        ) : tasks.map((t, i) => (
          <Pressable key={i} onPress={() => router.push(t.to as any)} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: t.urgent ? "rgba(201,168,76,0.5)" : C.border, borderRadius: 10, padding: 13, marginBottom: 8 }}>
            <GameIcon name={t.icon} size={19} color={t.urgent ? C.gold : C.goldDim} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{t.title}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }} numberOfLines={1}>{t.sub}</Text>
            </View>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
