import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { npcsOf } from "../../lib/game";
import { useI18n } from "../../lib/i18n";
import { professionNameL } from "../../lib/locale-data";
import { Portre } from "../../lib/ui";
import { C, F } from "../../lib/theme";

// İlişki bantları (Vercel hizası): eşik + ikon + renk + çeviri anahtarı.
const BANDS = [
  { id: "dost", min: 50, icon: "🤝", color: C.sage },
  { id: "arkadas", min: 20, icon: "🍵", color: C.sage },
  { id: "tanis", min: -19, icon: "🕯", color: C.parchmentMuted },
  { id: "rakip", min: -49, icon: "🗡", color: C.ember },
  { id: "dusman", min: -100, icon: "⚔", color: C.blood },
];
function bandOf(score: number) {
  return BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1];
}

// -100..+100 → kırmızı→taş→yeşil; üstünde işaretçi nokta.
function RelBand({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, ((score + 100) / 200) * 100));
  const dot = score >= 20 ? C.sage : score <= -20 ? C.blood : C.parchmentDim;
  return (
    <View style={{ height: 4, borderRadius: 2, marginTop: 5, backgroundColor: "rgba(122,106,79,0.3)", overflow: "visible" }}>
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: 4, borderRadius: 2, backgroundColor: "rgba(122,106,79,0.25)" }} />
      <View style={{ position: "absolute", top: -2.5, left: `${pct}%`, marginLeft: -4.5, width: 9, height: 9, borderRadius: 5, backgroundColor: dot, borderWidth: 1, borderColor: "rgba(0,0,0,0.4)" }} />
    </View>
  );
}

export default function Iliskiler() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const npcs = npcsOf(state, lang);
  const rel = state.relationships;
  // Tüm NPC'ler bantlanır (tanışılmayan = 0 → Tanışlar). Keşif için hepsi görünür.
  const known = npcs.map((n) => ({ n, v: rel[n.id] || 0 }));
  const grouped = BANDS.map((b) => ({
    b,
    list: known.filter(({ v }) => bandOf(v).id === b.id).sort((a, z) => Math.abs(z.v) - Math.abs(a.v)),
  })).filter((g) => g.list.length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontFamily: F.display, fontSize: 18, color: C.parchment, letterSpacing: 1 }}>{t("rel.title")}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted }}>{t("rel.subtitle")}</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {/* Ocak (eş + çocuklar) */}
        {(state.player.married || state.player.children.length > 0) && (
          <View style={{ backgroundColor: "rgba(201,168,76,0.07)", borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", borderRadius: 10, padding: 13, marginBottom: 14 }}>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginBottom: 6 }}>{t("rel.hearth")}</Text>
            {state.player.married && (
              <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment }}>💍 {t("rel.spouse")}: <Text style={{ color: C.gold }}>{state.player.spouse_name}</Text></Text>
            )}
            {state.player.children.length > 0 && (
              <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment, marginTop: 4 }}>👶 {t("rel.children")}: {state.player.children.join(", ")}</Text>
            )}
          </View>
        )}

        {grouped.length === 0 ? (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", marginTop: 30 }}>{t("rel.subtitle")}</Text>
        ) : grouped.map(({ b, list }) => (
          <View key={b.id} style={{ marginBottom: 16 }}>
            {/* Bant başlığı */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 15 }}>{b.icon}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1.5, color: b.color, textTransform: "uppercase" }}>{t("relb." + b.id)}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
              <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentMuted }}>{t("relb." + b.id + ".m")}</Text>
            </View>
            {list.map(({ n, v }) => (
              <Pressable key={n.id} onPress={() => router.push(`/oyun/npc/${n.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftWidth: 2.5, borderLeftColor: b.color, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <Portre age={n.age} gender={n.gender} size={40} ring={false} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{n.name}</Text>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{professionNameL(n.profession, lang)} · {n.age} {t("misc.age")}</Text>
                  <RelBand score={v} />
                </View>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: b.color, width: 32, textAlign: "right" }}>{v > 0 ? "+" + v : v}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
