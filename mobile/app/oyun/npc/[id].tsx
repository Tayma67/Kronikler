import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGame } from "../../../lib/store";
import { npcsOf, talkWith, giftTo, proposeMarriage, canCourt } from "../../../lib/game";
import { useI18n } from "../../../lib/i18n";
import { hap } from "../../../lib/haptics";
import { INTENTS, moodKey } from "../../../lib/dialogue";
import { professionNameL, traitL, quirkL, goalL } from "../../../lib/locale-data";
import { ITEMS } from "../../../lib/world";
import { Portre, BackLabel } from "../../../lib/ui";
import { GameIcon } from "../../../lib/icons";
import { C, F } from "../../../lib/theme";

const BANDS = [
  { id: "dost", min: 50, tone: C.sage },
  { id: "arkadas", min: 20, tone: C.sage },
  { id: "tanis", min: -19, tone: C.parchmentDim },
  { id: "rakip", min: -49, tone: C.ember },
  { id: "dusman", min: -100, tone: C.blood },
];
function bandOf(score: number) { return BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1]; }

function RelBand({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, ((score + 100) / 200) * 100));
  const dot = score >= 20 ? C.sage : score <= -20 ? C.blood : C.parchmentDim;
  return (
    <View style={{ height: 9, marginTop: 4, justifyContent: "center" }}>
      <Svg width="100%" height={9}>
        <Defs>
          <LinearGradient id="ng" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#C84040" stopOpacity={0.5} />
            <Stop offset="0.5" stopColor="#7A6A4F" stopOpacity={0.45} />
            <Stop offset="1" stopColor="#4A9A5A" stopOpacity={0.5} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="3" width="100%" height="3" rx="1.5" fill="url(#ng)" />
        <Circle cx={`${pct}%`} cy="4.5" r="4" fill={dot} stroke="rgba(0,0,0,0.45)" strokeWidth="1" />
      </Svg>
    </View>
  );
}

export default function NpcDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  const [line, setLine] = useState<string>("");
  const [giftOpen, setGiftOpen] = useState(false);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const npc = npcsOf(state, lang).find((n) => n.id === id);
  if (!npc) return <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 40 }}><Text style={{ color: C.parchmentMuted, textAlign: "center" }}>{t("npc.notFound")}</Text></View>;
  const v = state.relationships[npc.id] || 0;
  const band = bandOf(v);
  const ns = state.npc_state?.[npc.id] || { mood: 0, memories: [] };
  const giftables = Object.keys(state.player.inventory).filter((k) => state.player.inventory[k] > 0);
  const courtable = canCourt(state.player, npc, v);
  const couldMarry = !state.player.dead && !state.player.married && state.player.age >= 18 && npc.age >= 18 && npc.gender !== state.player.gender;

  const speak = (intent: string) => {
    let said = "";
    apply((s) => { const r = talkWith(s, npc, intent, lang); said = r.line; return r.state; });
    setLine(said);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 14, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}><BackLabel /></Pressable>

      {/* ── Profil kartı ── */}
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ borderWidth: 2, borderColor: band.tone, borderRadius: 28, padding: 1 }}>
            <Portre age={npc.age} gender={npc.gender} size={48} ring={false} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, letterSpacing: 0.5 }}>{npc.name}</Text>
            <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, marginTop: 1 }}>{professionNameL(npc.profession, lang)} · {npc.age} {t("misc.age")}</Text>
            <RelBand score={v} />
          </View>
          {/* Bant etiketi */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 5, borderWidth: 1, borderColor: band.tone + "66", backgroundColor: band.tone + "14" }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: band.tone }} />
            <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 0.5, color: band.tone }}>{t("relb." + band.id).toUpperCase()}</Text>
          </View>
        </View>

        {/* Hızlı bilgi */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentDim }}>😶 {t("dlg.mood." + moodKey(ns.mood))}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentDim }}>✦ {traitL(npc.trait, lang)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 11, color: v >= 20 ? C.sage : v <= -20 ? C.blood : C.parchmentMuted }}>{t("npc.rel")} {v > 0 ? "+" + v : v}</Text>
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentMuted, marginTop: 6, lineHeight: 17 }}>{(() => { const q = quirkL(npc.quirk, lang); return q[0].toUpperCase() + q.slice(1); })()}.</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.goldDim, marginTop: 2 }}>{t("npc.dream")} {goalL(npc.goal, lang)}.</Text>
      </View>

      {/* Söylenen söz */}
      {line ? (
        <View style={{ backgroundColor: C.card, borderLeftColor: C.gold, borderLeftWidth: 2.5, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment, lineHeight: 20 }}>{line}</Text>
        </View>
      ) : null}

      {/* ── Etkileşim menüsü ── */}
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
        <View style={{ paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 2.5, color: C.parchmentMuted }}>{t("npc.interaction")}</Text>
        </View>
        {INTENTS.map((it) => (
          <Pressable key={it.id} onPress={() => { hap("tap"); speak(it.id); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent" })}>
            <GameIcon name={it.icon} size={17} color={C.gold} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{t("dlg.intent." + it.id)}</Text>
            <Text style={{ color: C.goldDim, fontSize: 15 }}>›</Text>
          </Pressable>
        ))}
        {/* Hediye */}
        <Pressable onPress={() => setGiftOpen((o) => !o)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: couldMarry ? 1 : 0, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent" })}>
          <Text style={{ fontSize: 16 }}>🎁</Text>
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{t("npc.gift")}</Text>
          <Text style={{ color: C.goldDim, fontSize: 15 }}>{giftOpen ? "⌄" : "›"}</Text>
        </Pressable>
        {/* Evlenme teklifi */}
        {couldMarry && (
          <Pressable onPress={() => { if (courtable) { hap("success"); apply((s) => proposeMarriage(s, npc)); } }} disabled={!courtable} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: courtable ? "rgba(201,168,76,0.08)" : "transparent" }}>
            <GameIcon name="evlilik" size={17} color={courtable ? C.gold : C.parchmentMuted} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 14, color: courtable ? C.gold : C.parchmentMuted }}>{t("npc.propose")}</Text>
              {!courtable && <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 1 }}>{t("npc.proposeReq")}</Text>}
            </View>
          </Pressable>
        )}
      </View>

      {/* Hediye listesi (açılır) */}
      {giftOpen && (
        <View style={{ marginBottom: 10 }}>
          {giftables.length === 0 ? (
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, textAlign: "center", paddingVertical: 8 }}>{t("npc.noGift")}</Text>
          ) : giftables.map((k) => (
            <Pressable key={k} onPress={() => { hap("tap"); apply((s) => giftTo(s, npc, k)); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 11, marginBottom: 7 }}>
              <View style={{ width: 32, height: 32, borderRadius: 7, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16 }}>{ITEMS[k]?.icon || "📦"}</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{t("it." + k)}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentMuted }}>×{state.player.inventory[k]}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Onun Zihninde (anılar) ── */}
      {ns.memories.length > 0 && (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", borderRadius: 12, padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Text style={{ fontSize: 13 }}>🧠</Text>
            <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase" }}>{t("npc.mind")}</Text>
          </View>
          {[...ns.memories].reverse().map((m, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 7, marginBottom: 5 }}>
              <Text style={{ color: C.gold }}>🤍</Text>
              <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentDim, lineHeight: 17 }}>{m}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
