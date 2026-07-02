import { useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGame } from "../../../lib/store";
import { npcsOf, talkWith, giftTo, proposeMarriage, canCourt, helpNpcGoal, exploitNpcGoal, GOAL_HELP_COST, relWith, insultNpc, flirtWith, gossipAbout, giveMoneyTo, canFlirt, GIVE_MONEY_AMT, martialLoad } from "../../../lib/game";
import { useI18n } from "../../../lib/i18n";
import { hap } from "../../../lib/haptics";
import { INTENTS, moodKey } from "../../../lib/dialogue";
import { topMemories } from "../../../lib/npc-mind";
import { professionNameL, traitL, quirkL, goalL } from "../../../lib/locale-data";
import { ITEMS, npcSocialGraph, TieKind } from "../../../lib/world";
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

// Bağ türü → ikon + ton (aile altın, dost adaçayı, rakip kan).
const TIE_META: Record<TieKind, { icon: string; tone: string }> = {
  es: { icon: "ring", tone: C.gold },
  ebeveyn: { icon: "family", tone: C.gold },
  evlat: { icon: "baby", tone: C.gold },
  kardes: { icon: "family", tone: C.gold },
  dost: { icon: "prayer-beads", tone: C.sage },
  rakip: { icon: "crossed-swords", tone: C.blood },
};
const TIE_ORDER: TieKind[] = ["es", "ebeveyn", "evlat", "kardes", "dost", "rakip"];

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

// Hediye eşya ikonu — türüne göre (emoji yerine GameIcon).
function giftIcon(it: any): string {
  if (!it) return "menu";
  switch (it.kind) {
    case "silah": return "silah";
    case "kalkan": return "kite";
    case "zirh": return "shield";
    case "baslik": return "hood";
    case "eldiven": return "fist";
    case "ayakkabi": return "boot";
    case "kiyafet": return "wool";
  }
  if (it.heal) return "saglik";
  if (it.feed || it.kind === "yiyecek") return "ye";
  return "menu";
}

export default function NpcDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  const [line, setLine] = useState<string>("");
  const [giftOpen, setGiftOpen] = useState(false);
  const allNpcs = useMemo(() => (state ? npcsOf(state, lang) : []), [state?.seed, lang, state?.player.location_name]);
  const graph = useMemo(() => (state ? npcSocialGraph(state.player.location_name, allNpcs) : {}), [state?.player.location_name, allNpcs]);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const npc = allNpcs.find((n) => n.id === id);
  if (!npc) return <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 40 }}><Text style={{ color: C.parchmentMuted, textAlign: "center" }}>{t("npc.notFound")}</Text></View>;
  const v = relWith(state, npc.id);
  const band = bandOf(v);
  const ns = state.npc_state?.[npc.id] || { mood: 0, memories: [] };
  const giftables = Object.keys(state.player.inventory).filter((k) => state.player.inventory[k] > 0);
  const courtable = canCourt(state.player, npc, v);
  const ties = (graph[npc.id] || [])
    .map((tt) => ({ ...tt, who: allNpcs.find((n) => n.id === tt.otherId) }))
    .filter((tt) => tt.who)
    .sort((a, z) => TIE_ORDER.indexOf(a.kind) - TIE_ORDER.indexOf(z.kind));
  const couldMarry = !state.player.dead && !state.player.married && state.player.age >= 18 && npc.age >= 18 && npc.gender !== state.player.gender;
  const canGoal = !state.player.dead && state.player.age >= 13;
  // Bu ay bu kişiyle anlamlı bir etkileşim (sohbet/flört/hediye/dedikodu/hakaret) yapıldı mı — tur başına tek (farm önlenir).
  const mingled = state.npc_state?.[npc.id]?.int_turn === state.turn;

  const speak = (intent: string) => {
    if (mingled) return;
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
            <Portre age={npc.age} gender={npc.gender} size={48} ring={false} seed={npc.id} />
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><GameIcon name="prayer-beads" size={11} color={C.parchmentDim} /><Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentDim }}>{t("dlg.mood." + moodKey(ns.mood))}</Text></View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><GameIcon name="star" size={11} color={C.parchmentDim} /><Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentDim }}>{traitL(npc.trait, lang)}</Text></View>
          <Text style={{ fontFamily: F.display, fontSize: 11, color: v >= 20 ? C.sage : v <= -20 ? C.blood : C.parchmentMuted }}>{t("npc.rel")} {v > 0 ? "+" + v : v}</Text>
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentMuted, marginTop: 6, lineHeight: 17 }}>{(() => { const q = quirkL(npc.quirk, lang); return q[0].toUpperCase() + q.slice(1); })()}.</Text>
        {npc.goal ? <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.goldDim, marginTop: 2 }}>{t("npc.dream")} {goalL(npc.goal, lang)}.</Text> : null}
      </View>

      {/* ── Çevresi (NPC↔NPC ilişki ağı) ── */}
      {ties.length > 0 && (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <GameIcon name="iliskiler" size={13} color={C.goldDim} />
            <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase" }}>{t("npc.ties")}</Text>
          </View>
          {ties.map((tt) => {
            const meta = TIE_META[tt.kind];
            return (
              <Pressable key={tt.otherId} onPress={() => { hap("tap"); router.push(`/oyun/npc/${tt.otherId}`); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}>
                <Portre age={tt.who!.age} gender={tt.who!.gender} size={32} ring={false} seed={tt.who!.id} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{tt.who!.name}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{professionNameL(tt.who!.profession, lang)} · {tt.who!.age}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 5, borderWidth: 1, borderColor: meta.tone + "55", backgroundColor: meta.tone + "14" }}>
                  <GameIcon name={meta.icon} size={11} color={meta.tone} />
                  <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 0.5, color: meta.tone }}>{t("tie." + tt.kind).toUpperCase()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

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
        {mingled && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: "rgba(201,168,76,0.06)" }}>
            <GameIcon name="prayer-beads" size={12} color={C.goldDim} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, lineHeight: 15 }}>{t("npc.mingled")}</Text>
          </View>
        )}
        {martialLoad(state.player) > 0 && (couldMarry || canFlirt(state.player, npc, v)) ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: "rgba(224,90,48,0.07)" }}>
            <GameIcon name="crossed-swords" size={12} color={C.ember} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 11, color: C.ember, lineHeight: 15 }}>{t("npca.martialWarn")}</Text>
          </View>
        ) : null}
        {/* 14 yaş altı NPC'ye iş/hayal sorma — çocuğun mesleği/hedefi yok (boş tırnak saçmalığı önlenir). */}
        {INTENTS.filter((it) => npc.age >= 14 || (it.id !== "is" && it.id !== "hedef")).map((it) => (
          <Pressable key={it.id} disabled={mingled} onPress={() => { hap("tap"); speak(it.id); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent", opacity: mingled ? 0.4 : 1 })}>
            <GameIcon name={it.icon} size={17} color={C.gold} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{t("dlg.intent." + it.id)}</Text>
            <Text style={{ color: C.goldDim, fontSize: 15 }}>›</Text>
          </Pressable>
        ))}
        {/* Hediye */}
        <Pressable disabled={mingled} onPress={() => setGiftOpen((o) => !o)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent", opacity: mingled ? 0.4 : 1 })}>
          <GameIcon name="gems" size={16} color={C.gold} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{t("npc.gift")}</Text>
          <Text style={{ color: C.goldDim, fontSize: 15 }}>{giftOpen ? "⌄" : "›"}</Text>
        </Pressable>
        {/* Amacına yardım et / istismar et (npc_mind goal_action) */}
        {canGoal && (
          <Pressable onPress={() => { if (state.player.money >= GOAL_HELP_COST) { hap("success"); apply((s) => helpNpcGoal(s, npc)); } }} disabled={state.player.money < GOAL_HELP_COST} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent" })}>
            <GameIcon name="leaf" size={16} color={state.player.money >= GOAL_HELP_COST ? C.sage : C.parchmentMuted} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 14, color: state.player.money >= GOAL_HELP_COST ? C.sage : C.parchmentMuted }}>{t("npc.helpGoal")}</Text>
              <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 1 }}>{goalL(npc.goal, lang)}</Text>
            </View>
            <Text style={{ fontFamily: F.display, fontSize: 11, color: C.goldDim }}>{GOAL_HELP_COST}⚜</Text>
          </Pressable>
        )}
        {canGoal && v > -25 && (() => { const exploited = state.player.exploit_turn === state.turn; return (
          <Pressable disabled={exploited} onPress={() => { hap("tap"); apply((s) => exploitNpcGoal(s, npc)); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: couldMarry ? 1 : 0, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent", opacity: exploited ? 0.4 : 1 })}>
            <GameIcon name="hood" size={16} color={C.ember} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.ember }}>{t("npc.exploitGoal")}</Text>
            <Text style={{ color: C.goldDim, fontSize: 15 }}>›</Text>
          </Pressable>
        ); })()}
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
        {/* Ek etkileşimler (Vercel npc_interactions): para / flört / dedikodu / hakaret */}
        <Pressable onPress={() => { if (state.player.money >= GIVE_MONEY_AMT) { hap("tap"); apply((s) => giveMoneyTo(s, npc)); } }} disabled={state.player.money < GIVE_MONEY_AMT} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent" })}>
          <GameIcon name="akce" size={16} color={state.player.money >= GIVE_MONEY_AMT ? C.gold : C.parchmentMuted} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: state.player.money >= GIVE_MONEY_AMT ? C.parchment : C.parchmentMuted }}>{t("npca.moneyBtn")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 11, color: C.goldDim }}>{GIVE_MONEY_AMT} ⚜</Text>
        </Pressable>
        {canFlirt(state.player, npc, v) && (
          <Pressable disabled={mingled} onPress={() => { hap("success"); apply((s) => flirtWith(s, npc)); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent", opacity: mingled ? 0.4 : 1 })}>
            <GameIcon name="lyre" size={16} color={C.gold} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.gold }}>{t("npca.flirtBtn")}</Text>
          </Pressable>
        )}
        <Pressable disabled={state.player.dead || state.player.age < 13 || mingled} onPress={() => { hap("tap"); apply((s) => gossipAbout(s, npc)); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent", opacity: (state.player.age < 13 || mingled) ? 0.45 : 1 })}>
          <GameIcon name="speaker" size={16} color={C.parchment} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{t("npca.gossipBtn")}</Text>
        </Pressable>
        <Pressable disabled={state.player.dead || state.player.age < 13 || mingled} onPress={() => { hap("tap"); apply((s) => insultNpc(s, npc)); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent", opacity: (state.player.age < 13 || mingled) ? 0.45 : 1 })}>
          <GameIcon name="skull" size={16} color={C.blood} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.blood }}>{t("npca.insultBtn")}</Text>
        </Pressable>
      </View>

      {/* Hediye listesi (açılır) */}
      {giftOpen && (
        <View style={{ marginBottom: 10 }}>
          {giftables.length === 0 ? (
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, textAlign: "center", paddingVertical: 8 }}>{t("npc.noGift")}</Text>
          ) : giftables.map((k) => (
            <Pressable key={k} disabled={mingled} onPress={() => { hap("tap"); apply((s) => giftTo(s, npc, k)); setGiftOpen(false); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 11, marginBottom: 7, opacity: mingled ? 0.4 : 1 }}>
              <View style={{ width: 32, height: 32, borderRadius: 7, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                <GameIcon name={giftIcon(ITEMS[k])} size={16} color={C.gold} />
              </View>
              <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{t("it." + k)}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentMuted }}>×{state.player.inventory[k]}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Seni hatırlıyor (yapısal anılar, en ağır) ── */}
      {(() => {
        const tops = topMemories(ns.anilar, 3);
        if (!tops.length) return null;
        return (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <GameIcon name="scroll" size={13} color={C.goldDim} />
              <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase" }}>{t("npc.remembers")}</Text>
            </View>
            {tops.map((m, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 7, marginBottom: 5, alignItems: "flex-start" }}>
                <GameIcon name={m.travma ? "skull" : m.yon > 0 ? "prayer-beads" : "crossed-swords"} size={11} color={m.travma ? C.blood : m.yon > 0 ? C.sage : C.blood} />
                <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12.5, color: m.travma ? C.blood : C.parchmentDim, lineHeight: 17 }}>{t("mem.remember." + m.tur)}{m.travma ? ` — ${t("npc.trauma")}` : ""}</Text>
              </View>
            ))}
          </View>
        );
      })()}

      {/* ── Onun Zihninde (anılar) ── */}
      {ns.memories.length > 0 && (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", borderRadius: 12, padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <GameIcon name="book" size={13} color={C.goldDim} />
            <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase" }}>{t("npc.mind")}</Text>
          </View>
          {[...ns.memories].reverse().map((m, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 7, marginBottom: 5 }}>
              <GameIcon name="prayer-beads" size={11} color={C.gold} />
              <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentDim, lineHeight: 17 }}>{m}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
