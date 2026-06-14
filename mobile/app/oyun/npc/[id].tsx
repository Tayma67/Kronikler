import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGame } from "../../../lib/store";
import { npcsOf, talkWith, giftTo, proposeMarriage, canCourt } from "../../../lib/game";
import { useI18n } from "../../../lib/i18n";
import { INTENTS, moodKey } from "../../../lib/dialogue";
import { professionNameL, traitL, quirkL, goalL } from "../../../lib/locale-data";
import { ITEMS } from "../../../lib/world";
import { Portre, BackLabel } from "../../../lib/ui";
import { GameIcon } from "../../../lib/icons";
import { C, F } from "../../../lib/theme";

function GoldDivider({ mt = 16, mb = 12 }: { mt?: number; mb?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: mt, marginBottom: mb }}>
      <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
      <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: "45deg" }], marginHorizontal: 8 }} />
      <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
    </View>
  );
}
function SectionHead({ t }: { t: string }) {
  return <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginBottom: 8 }}>{t}</Text>;
}
// -100..+100 ilişki çubuğu + işaretçi.
function RelBand({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, ((score + 100) / 200) * 100));
  const dot = score >= 20 ? C.sage : score <= -20 ? C.blood : C.parchmentDim;
  return (
    <View style={{ width: "70%", height: 4, borderRadius: 2, marginTop: 10, backgroundColor: "rgba(122,106,79,0.3)" }}>
      <View style={{ position: "absolute", top: -2.5, left: `${pct}%`, marginLeft: -4.5, width: 9, height: 9, borderRadius: 5, backgroundColor: dot, borderWidth: 1, borderColor: "rgba(0,0,0,0.4)" }} />
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
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const npc = npcsOf(state, lang).find((n) => n.id === id);
  if (!npc) return <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 40 }}><Text style={{ color: C.parchmentMuted, textAlign: "center" }}>{t("npc.notFound")}</Text></View>;
  const v = state.relationships[npc.id] || 0;
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
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
        <BackLabel />
      </Pressable>

      {/* Hero */}
      <View style={{ alignItems: "center" }}>
        <View style={{ borderWidth: 2, borderColor: C.gold, borderRadius: 44, padding: 2 }}>
          <Portre age={npc.age} gender={npc.gender} size={76} ring={false} />
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 19, color: C.parchment, marginTop: 10, letterSpacing: 1, textAlign: "center" }}>{npc.name}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.gold, marginTop: 2, textAlign: "center" }}>{professionNameL(npc.profession, lang)} · {npc.age} {t("misc.age")} · {traitL(npc.trait, lang)}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 5, textAlign: "center" }}>{(() => { const q = quirkL(npc.quirk, lang); return q[0].toUpperCase() + q.slice(1); })()}.</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.goldDim, marginTop: 3, textAlign: "center" }}>{t("npc.dream")} {goalL(npc.goal, lang)}.</Text>
        <RelBand score={v} />
        <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: v >= 20 ? C.sage : v <= -20 ? C.blood : C.parchmentDim }}>{t("npc.rel")} {v > 0 ? "+" + v : v}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentDim }}>{t("npc.mood")} {t("dlg.mood." + moodKey(ns.mood))}</Text>
        </View>
      </View>

      {line ? (
        <View style={{ backgroundColor: C.card, borderLeftColor: C.gold, borderLeftWidth: 2.5, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginTop: 14 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment, lineHeight: 20 }}>{line}</Text>
        </View>
      ) : null}

      <GoldDivider />
      <SectionHead t={t("npc.chat")} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {INTENTS.map((it) => (
          <Pressable key={it.id} onPress={() => speak(it.id)} style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card, minWidth: "47%", flexGrow: 1 }}>
            <GameIcon name={it.icon} size={15} color={C.gold} />
            <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment }}>{t("dlg.intent." + it.id)}</Text>
          </Pressable>
        ))}
      </View>

      {couldMarry && (
        <Pressable onPress={() => courtable && apply((s) => proposeMarriage(s, npc))} disabled={!courtable} style={{ backgroundColor: courtable ? "rgba(201,168,76,0.12)" : C.card, borderWidth: 1, borderColor: courtable ? "rgba(201,168,76,0.5)" : C.border, borderRadius: 10, padding: 14, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <GameIcon name="evlilik" size={18} color={courtable ? C.gold : C.parchmentMuted} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: courtable ? C.gold : C.parchmentMuted, letterSpacing: 0.5 }}>{t("npc.propose")}</Text>
            {!courtable && <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 2 }}>{t("npc.proposeReq")}</Text>}
          </View>
        </Pressable>
      )}

      {ns.memories.length > 0 && (
        <>
          <GoldDivider />
          <SectionHead t={t("npc.memories")} />
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 12 }}>
            {[...ns.memories].reverse().map((m, i) => (
              <Text key={i} style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: 3 }}>• {m}</Text>
            ))}
          </View>
        </>
      )}

      <GoldDivider />
      <SectionHead t={t("npc.gift")} />
      {giftables.length === 0 ? (
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted }}>{t("npc.noGift")}</Text>
      ) : giftables.map((k) => (
        <Pressable key={k} onPress={() => apply((s) => giftTo(s, npc, k))} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 11, marginBottom: 7 }}>
          <Text style={{ fontSize: 16 }}>{ITEMS[k]?.icon || "📦"}</Text>
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{t("it." + k)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentMuted }}>×{state.player.inventory[k]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
