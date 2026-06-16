import { useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { npcsOf, relWith } from "../../lib/game";
import { useI18n, applyParams } from "../../lib/i18n";
import { professionNameL, placeName } from "../../lib/locale-data";
import { Portre } from "../../lib/ui";
import { C, F } from "../../lib/theme";

// İlişki bantları (Vercel): eşik + ikon + ton rengi + motto.
const BANDS = [
  { id: "dost", min: 50, icon: "🤝", tone: C.sage },
  { id: "arkadas", min: 20, icon: "🍵", tone: C.sage },
  { id: "tanis", min: -19, icon: "🕯", tone: C.parchmentDim },
  { id: "rakip", min: -49, icon: "🗡", tone: C.ember },
  { id: "dusman", min: -100, icon: "⚔", tone: C.blood },
];
function bandOf(score: number) { return BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1]; }

// -100..+100 → kırmızı→taş→yeşil gradyan + işaretçi (SVG).
function RelBand({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, ((score + 100) / 200) * 100));
  const dot = score >= 20 ? C.sage : score <= -20 ? C.blood : C.parchmentDim;
  return (
    <View style={{ height: 9, marginTop: 5, justifyContent: "center" }}>
      <Svg width="100%" height={9}>
        <Defs>
          <LinearGradient id="relgrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#C84040" stopOpacity={0.5} />
            <Stop offset="0.5" stopColor="#7A6A4F" stopOpacity={0.45} />
            <Stop offset="1" stopColor="#4A9A5A" stopOpacity={0.5} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="3" width="100%" height="3" rx="1.5" fill="url(#relgrad)" />
        <Circle cx={`${pct}%`} cy="4.5" r="4" fill={dot} stroke="rgba(0,0,0,0.45)" strokeWidth="1" />
      </Svg>
    </View>
  );
}

function Pill({ text, tone }: { text: string; tone: string }) {
  return (
    <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: tone + "66", backgroundColor: tone + "1A" }}>
      <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: tone }}>{text}</Text>
    </View>
  );
}

export default function Iliskiler() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useGame();
  const { lang, t } = useI18n();
  const npcs = useMemo(() => (state ? npcsOf(state, lang) : []), [state?.seed, lang, state?.player.location_name]);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const all = npcs.map((n) => ({ n, v: relWith(state, n.id) }));
  const grouped = BANDS.map((b) => ({
    b,
    list: all.filter(({ v }) => bandOf(v).id === b.id).sort((a, z) => Math.abs(z.v) - Math.abs(a.v)),
  }));
  const total = all.length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: insets.bottom + 90 }}>
        {/* PageHeader */}
        <View style={{ alignItems: "center", marginBottom: 14 }}>
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 3, color: C.goldDim, textTransform: "uppercase" }}>{t("rel.kicker")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 22, color: C.parchment, letterSpacing: 1, marginTop: 4, textAlign: "center" }}>🫂 {t("rel.headTitle")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 0.5, color: C.gold, marginTop: 3 }}>📍 {placeName(state.player.location_name, lang)}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted, marginTop: 4, textAlign: "center" }}>{applyParams(t("rel.subSome"), [total])}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, alignSelf: "stretch" }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
            <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: "45deg" }], marginHorizontal: 8 }} />
            <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
          </View>
        </View>

        {grouped.map(({ b, list }) => (
          <View key={b.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: b.tone + "30", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
            {/* Panel başlığı */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, paddingVertical: 10, borderBottomWidth: list.length ? 1 : 0, borderBottomColor: C.border, backgroundColor: b.tone + "10" }}>
              <Text style={{ fontSize: 15 }}>{b.icon}</Text>
              <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5, color: b.tone, textTransform: "uppercase" }}>{t("relb." + b.id)}</Text>
              <Pill text={`${list.length} ${t("rel.people")}`} tone={b.tone} />
            </View>
            {/* Gövde */}
            <View style={{ padding: list.length ? 10 : 12 }}>
              {list.length === 0 ? (
                <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, textAlign: "center", opacity: 0.75 }}>{applyParams(t("rel.bandNone"), [t("relb." + b.id + ".m")])}</Text>
              ) : list.map(({ n, v }) => (
                <Pressable key={n.id} onPress={() => router.push(`/oyun/npc/${n.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 }}>
                  <Portre age={n.age} gender={n.gender} size={37} ring={false} seed={n.id} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{n.name}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{professionNameL(n.profession, lang)} · {n.age}</Text>
                    <RelBand score={v} />
                  </View>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: v >= 20 ? C.sage : v <= -20 ? C.blood : C.parchmentMuted, width: 34, textAlign: "right" }}>{v > 0 ? "+" + v : v}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
