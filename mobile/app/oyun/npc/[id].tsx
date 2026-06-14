import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGame } from "../../../lib/store";
import { npcsOf, talkWith, giftTo, proposeMarriage, canCourt, npcStateOf } from "../../../lib/game";
import { useI18n } from "../../../lib/i18n";
import { INTENTS, moodKey } from "../../../lib/dialogue";
import { professionNameL, traitL, quirkL, goalL } from "../../../lib/locale-data";
import { ITEMS } from "../../../lib/world";
import { Portre, BackLabel } from "../../../lib/ui";
import { GameIcon } from "../../../lib/icons";
import { C, F } from "../../../lib/theme";

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
      <View style={{ alignItems: "center", marginBottom: 14 }}>
        <Portre age={npc.age} gender={npc.gender} size={76} />
        <Text style={{ fontFamily: F.display, fontSize: 18, color: C.parchment, marginTop: 10 }}>{npc.name}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.gold }}>{professionNameL(npc.profession, lang)} · {npc.age} {t("misc.age")} · {traitL(npc.trait, lang)}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 4, textAlign: "center" }}>{(() => { const q = quirkL(npc.quirk, lang); return q[0].toUpperCase() + q.slice(1); })()}.</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.goldDim, marginTop: 4, textAlign: "center" }}>{t("npc.dream")} {goalL(npc.goal, lang)}.</Text>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentDim }}>{t("npc.rel")} {v}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentDim }}>{t("npc.mood")} {t("dlg.mood." + moodKey(ns.mood))}</Text>
        </View>
      </View>

      {line ? (
        <View style={{ backgroundColor: C.card, borderLeftColor: C.gold, borderLeftWidth: 2.5, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment, lineHeight: 20 }}>{line}</Text>
        </View>
      ) : null}

      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 8 }}>{t("npc.chat")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {INTENTS.map((it) => (
          <Pressable key={it.id} onPress={() => speak(it.id)} style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card, minWidth: "47%", flexGrow: 1 }}>
            <GameIcon name={it.icon} size={15} color={C.gold} />
            <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment }}>{t("dlg.intent." + it.id)}</Text>
          </Pressable>
        ))}
      </View>

      {couldMarry && (
        <Pressable onPress={() => courtable && apply((s) => proposeMarriage(s, npc))} disabled={!courtable} style={{ backgroundColor: courtable ? "rgba(201,168,76,0.12)" : C.card, borderWidth: 1, borderColor: courtable ? "rgba(201,168,76,0.5)" : C.border, borderRadius: 10, padding: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <GameIcon name="evlilik" size={18} color={courtable ? C.gold : C.parchmentMuted} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: courtable ? C.gold : C.parchmentMuted, letterSpacing: 0.5 }}>{t("npc.propose")}</Text>
            {!courtable && <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 2 }}>{t("npc.proposeReq")}</Text>}
          </View>
        </Pressable>
      )}

      {ns.memories.length > 0 && (
        <>
          <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 6 }}>{t("npc.memories")}</Text>
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 12, marginBottom: 12 }}>
            {[...ns.memories].reverse().map((m, i) => (
              <Text key={i} style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: 3 }}>• {m}</Text>
            ))}
          </View>
        </>
      )}

      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 6 }}>{t("npc.gift")}</Text>
      {giftables.length === 0 ? (
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted }}>{t("npc.noGift")}</Text>
      ) : giftables.map((k) => (
        <Pressable key={k} onPress={() => apply((s) => giftTo(s, npc, k))} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 11, marginBottom: 7 }}>
          <Text style={{ fontSize: 16 }}>{ITEMS[k]?.icon || "📦"}</Text>
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{t("it."+k)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentMuted }}>×{state.player.inventory[k]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
