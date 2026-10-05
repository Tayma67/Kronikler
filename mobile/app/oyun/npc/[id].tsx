import { useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGame } from "../../../lib/store";
import { kisiProfil, kisiCevresi, gorus, teklifSansi, helalUygun, helalBedeli, helalSansi, helallikIste, talkWith, giftTo, proposeMarriage, canCourt, helpNpcGoal, exploitNpcGoal, GOAL_HELP_COST, relWith, insultNpc, flirtWith, gossipAbout, giveMoneyTo, canFlirt, flirtIsForbidden, npcSeededMarried, GIVE_MONEY_AMT, martialLoad, canTakeApprentice, takeApprentice, mentorApprentice, APPRENTICE_MONTHS } from "../../../lib/game";
import { useI18n, yuzdeL, kucukHarf } from "../../../lib/i18n";
import { hap } from "../../../lib/haptics";
import { INTENTS, moodKey } from "../../../lib/dialogue";
import { topMemories } from "../../../lib/npc-mind";
import { professionNameL, traitL, quirkL, goalL, placeName } from "../../../lib/locale-data";
import { ITEMS, TieKind } from "../../../lib/world";
import { Portre, BackLabel, ScreenFresk } from "../../../lib/ui";
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

// Teklif şansı rozeti (dokununca döküm açılır) — yüzde ve kalemler motorun zar attığı değerle birebir.
function SansRozet({ yuzde, acik, onPress }: { yuzde: number; acik: boolean; onPress: () => void }) {
  const { lang } = useI18n();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1, borderColor: (acik ? C.gold : C.goldDim) + "88", backgroundColor: acik ? "rgba(201,168,76,0.14)" : "transparent" }}>
      <Text style={{ fontFamily: F.display, fontSize: 11, color: yuzde >= 60 ? C.sage : yuzde <= 25 ? C.blood : C.gold }}>{yuzdeL(yuzde, lang)}</Text>
    </Pressable>
  );
}
function SansDokum({ kalemler, yuzde, t }: { kalemler: { k: string; v: number }[]; yuzde: number; t: (k: string) => string }) {
  const { lang } = useI18n();
  return (
    <View style={{ paddingHorizontal: 14, paddingBottom: 10, paddingTop: 2 }}>
      <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 1.5, color: C.goldDim, marginBottom: 4 }}>{t("sans.title")}</Text>
      {kalemler.map((x, i) => (
        <View key={i} style={{ flexDirection: "row", paddingVertical: 2 }}>
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 11.5, color: C.parchmentDim }}>{t(x.k)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 11, color: x.v > 0 ? C.sage : C.blood }}>{x.v > 0 ? "+" + x.v : x.v}</Text>
        </View>
      ))}
      <View style={{ flexDirection: "row", paddingTop: 4, marginTop: 3, borderTopWidth: 1, borderTopColor: C.border }}>
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 11, color: C.parchment }}>{t("sans.toplam")}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 11.5, color: C.gold }}>{yuzdeL(yuzde, lang)}</Text>
      </View>
    </View>
  );
}

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
  const { lang, t, tg } = useI18n();
  const [line, setLine] = useState<string>("");
  const [lineDelta, setLineDelta] = useState<number>(0);
  const [giftOpen, setGiftOpen] = useState(false);
  const [gorusAcik, setGorusAcik] = useState(false); // görüş dökümü (neden böyle bakıyor)
  const [sansAcik, setSansAcik] = useState<string | null>(null); // hangi teklifin şans dökümü açık
  // Kişi nüfus kaydından okunur (her yerden; yaşayan ya da rahmetli) — nüfus her eylemde yenilendiği için pop'a bağlı.
  const prof = useMemo(() => (state ? kisiProfil(state, id, lang) : null), [state?.pop, state?.seed, state?.turn, state?.player.location_name, lang, id]);
  const cevre = useMemo(() => (state ? kisiCevresi(state, id, lang) : []), [state?.pop, state?.seed, state?.turn, state?.player.location_name, lang, id]);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const npc = prof?.npc;
  if (!prof || !npc) return <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 40 }}><Text style={{ color: C.parchmentMuted, textAlign: "center" }}>{t("npc.notFound")}</Text></View>;
  const v = relWith(state, npc.id);
  const band = bandOf(v);
  const ns = state.npc_state?.[npc.id] || { mood: 0, memories: [] };
  const giftables = Object.keys(state.player.inventory).filter((k) => state.player.inventory[k] > 0);
  const courtable = canCourt(state.player, npc, v);
  const ties = cevre
    .map((tt) => ({ kind: tt.tur as TieKind, otherId: tt.npc.id, who: tt.npc, olu: tt.olu, uzak: tt.uzak }))
    .sort((a, z) => TIE_ORDER.indexOf(a.kind) - TIE_ORDER.indexOf(z.kind) || Number(a.olu) - Number(z.olu));
  const couldMarry = prof.burada && !state.player.dead && !state.player.married && state.player.age >= 18 && npc.age >= 18 && npc.gender !== state.player.gender;
  const canGoal = prof.burada && !state.player.dead && state.player.age >= 13 && !!npc.goal; // muradına ermiş NPC'nin hedefi kalmaz — yardım/istismar kapanır
  // Kanal-bazlı kilit: her etkileşim (her sohbet niyeti + hediye/flört/dedikodu/hakaret/sadaka) ayrı ayrı ayda bir.
  // "dert dinle" deyince "iltifat" kapanmaz — hepsi bağımsız, hepsi bir kez okunur; farm motor tarafında kapalı.
  const acts = state.npc_state?.[npc.id]?.act_turns;
  const usedAct = (key: string) => acts?.[key] === state.turn;

  const speak = (intent: string) => {
    if (usedAct("t:" + intent)) return;
    const r = talkWith(state, npc, intent, lang); // saf motor: söz burada okunur, durum tek seferde uygulanır
    apply(() => r.state); setLine(r.line); setLineDelta(r.delta);
  };

  return (
    <ScreenFresk><ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}><BackLabel /></Pressable>

      {/* ── Profil kartı ── */}
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ borderWidth: 2, borderColor: band.tone, borderRadius: 28, padding: 1 }}>
            <Portre age={npc.age} gender={npc.gender} size={48} ring={false} seed={npc.id} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, letterSpacing: 0.5 }}>{npc.name}</Text>
            <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, marginTop: 1 }}>{prof.olu ? t("npc.late") : professionNameL(npc.profession, lang)} · {npc.age} {t("misc.age")}</Text>
            {!prof.olu && !prof.burada ? <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.goldDim, marginTop: 2 }}>{t("npc.livesIn").replace("%1", placeName(npc.loc || "", lang))}</Text> : null}
            <RelBand score={v} />
          </View>
          {/* Bant etiketi */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 5, borderWidth: 1, borderColor: band.tone + "66", backgroundColor: band.tone + "14" }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: band.tone }} />
            <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 0.5, color: band.tone }}>{(prof.aileRolu ? t({ anne: "char.mother", baba: "char.father", es: "char.spouse", evlat: "tie.evlat", kardes: "tie.kardes" }[prof.aileRolu]) : t("relb." + band.id)).toUpperCase()}</Text>
          </View>
        </View>

        {/* Hızlı bilgi */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
          {!prof.olu ? <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><GameIcon name="prayer-beads" size={11} color={C.parchmentDim} /><Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentDim }}>{t("dlg.mood." + moodKey(ns.mood))}</Text></View> : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><GameIcon name="star" size={11} color={C.parchmentDim} /><Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentDim }}>{traitL(npc.trait, lang)}</Text></View>
          <Pressable onPress={() => { hap("tap"); setGorusAcik((x) => !x); }} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={{ fontFamily: F.display, fontSize: 11, color: v >= 20 ? C.sage : v <= -20 ? C.blood : C.parchmentMuted }}>{t("npc.rel")} {v > 0 ? "+" + v : v}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.goldDim, textDecorationLine: "underline" }}>{t("gorus.ipucu")}</Text>
          </Pressable>
        </View>
        {/* Görüş dökümü: motorun kullandığı değerle birebir aynı kalemler (relWith = gorus().toplam) */}
        {gorusAcik ? (() => {
          const g = gorus(state, npc.id);
          return (
            <View style={{ marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: C.border }}>
              <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.goldDim, marginBottom: 6 }}>{t("gorus.title")}</Text>
              {g.kalemler.map((it, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 3 }}>
                  <Text style={{ flex: 1, fontFamily: it.k === "gorus.ani" ? F.serifItalic : F.serif, fontSize: 12, color: C.parchmentDim, lineHeight: 17 }}>{it.k === "gorus.ani" ? "«" + tg("mem.remember." + it.tur, state?.player.gender === "kadın") + "»" : t(it.k)}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 11.5, color: it.v > 0 ? C.sage : C.blood, minWidth: 34, textAlign: "right" }}>{it.v > 0 ? "+" + it.v : it.v}</Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: C.border }}>
                <Text style={{ flex: 1, fontFamily: F.display, fontSize: 11, color: C.parchment }}>{t("gorus.toplam")}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: g.toplam >= 20 ? C.sage : g.toplam <= -20 ? C.blood : C.parchment, minWidth: 34, textAlign: "right" }}>{g.toplam > 0 ? "+" + g.toplam : g.toplam}</Text>
              </View>
            </View>
          );
        })() : null}
        <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentMuted, marginTop: 6, lineHeight: 17 }}>{(() => { const q = quirkL(npc.quirk, lang); return q[0].toUpperCase() + q.slice(1); })()}.</Text>
        {prof.karar ? <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, marginTop: 2 }}>{(() => { const k = prof.karar!; const mal = kucukHarf(t("it." + k.mal), lang); const eski = kucukHarf(professionNameL(k.eski, lang), lang); return k.eski === "işsiz" ? (k.yilOnce === 0 ? t("npc.jobFoundNow").replace("%1", mal) : t("npc.jobFoundAgo").replace("%1", String(k.yilOnce)).replace("%2", mal)) : k.yilOnce === 0 ? t("npc.jobSwitchNow").replace("%1", eski).replace("%2", mal) : t("npc.jobSwitchAgo").replace("%1", String(k.yilOnce)).replace("%2", eski).replace("%3", mal); })()}</Text> : null}
        {npc.goal && !prof.olu ? <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.goldDim, marginTop: 2 }}>{t("npc.dream")} {goalL(npc.goal, lang)}.</Text> : null}
        {/* Gizli ilişki: bu kişi aktif yasak sevgilinse ateş çubuğuyla göster */}
        {state.player.affair?.id === npc.id ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1, borderColor: C.ember + "55", backgroundColor: C.ember + "14" }}>
            <GameIcon name="lyre" size={11} color={C.ember} />
            <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 0.5, color: C.ember }}>{t("affair.badge").toUpperCase()}</Text>
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: C.ember + "22", overflow: "hidden" }}>
              <View style={{ width: `${Math.max(0, Math.min(100, state.player.affair.heat))}%`, height: "100%", backgroundColor: C.ember }} />
            </View>
          </View>
        ) : null}
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
              <Pressable key={tt.kind + tt.otherId} onPress={() => { hap("tap"); router.push(`/oyun/npc/${tt.otherId}`); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}>
                <View style={{ opacity: tt.olu ? 0.45 : 1 }}><Portre age={tt.who!.age} gender={tt.who!.gender} size={32} ring={false} seed={tt.who!.id} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13, color: tt.olu ? C.parchmentMuted : C.parchment }}>{tt.who!.name}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{tt.olu ? t("npc.late") : professionNameL(tt.who!.profession, lang)} · {tt.who!.age}{!tt.olu && tt.uzak ? " · " + placeName(tt.who!.loc || "", lang) : ""}</Text>
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

      {prof.burada && (<>
      {/* Söylenen söz — yanında ilişki etkisi (kişinin mizacına/ruh haline göre artı ya da eksi gelir) */}
      {line ? (
        <View style={{ backgroundColor: C.card, borderLeftColor: lineDelta < 0 ? C.blood : C.gold, borderLeftWidth: 2.5, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchment, lineHeight: 20 }}>{line}</Text>
            {lineDelta !== 0 ? (
              <View style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: 9, borderWidth: 1, borderColor: (lineDelta > 0 ? C.sage : C.blood) + "66", backgroundColor: (lineDelta > 0 ? C.sage : C.blood) + "1A" }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, color: lineDelta > 0 ? C.sage : C.blood }}>{lineDelta > 0 ? "+" + lineDelta : lineDelta}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* ── Etkileşim menüsü ── */}
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
        <View style={{ paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 2.5, color: C.parchmentMuted }}>{t("npc.interaction")}</Text>
        </View>
        {martialLoad(state.player) > 0 && (couldMarry || canFlirt(state.player, npc, v)) ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: "rgba(224,90,48,0.07)" }}>
            <GameIcon name="crossed-swords" size={12} color={C.ember} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 11, color: C.ember, lineHeight: 15 }}>{t("npca.martialWarn")}</Text>
          </View>
        ) : null}
        {/* 14 yaş altı NPC'ye iş/hayal sorma — çocuğun mesleği/hedefi yok (boş tırnak saçmalığı önlenir). */}
        {INTENTS.filter((it) => (npc.age >= 14 || it.id !== "is") && (it.id !== "hedef" || !!npc.goal)).map((it) => { const done = usedAct("t:" + it.id); return (
          <Pressable key={it.id} disabled={done} onPress={() => { hap("tap"); speak(it.id); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent", opacity: done ? 0.4 : 1 })}>
            <GameIcon name={it.icon} size={17} color={C.gold} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{t("dlg.intent." + it.id)}</Text>
            {done ? <Text style={{ fontFamily: F.display, fontSize: 9, color: C.goldDim }}>{t("soc.lock.done")}</Text> : <Text style={{ color: C.goldDim, fontSize: 15 }}>›</Text>}
          </Pressable>
        ); })}
        {/* Hediye — kendi kanalı: sohbetten bağımsız, ayda bir */}
        <Pressable disabled={usedAct("gift")} onPress={() => setGiftOpen((o) => !o)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent", opacity: usedAct("gift") ? 0.4 : 1 })}>
          <GameIcon name="gems" size={16} color={C.gold} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{t("npc.gift")}</Text>
          <Text style={{ color: C.goldDim, fontSize: 15 }}>{giftOpen ? "⌄" : "›"}</Text>
        </Pressable>
        {/* Amacına yardım et / istismar et (npc_mind goal_action) */}
        {canGoal && (
          <Pressable onPress={() => { if (state.player.money >= GOAL_HELP_COST && !usedAct("help")) { hap("success"); apply((s) => helpNpcGoal(s, npc)); } }} disabled={state.player.money < GOAL_HELP_COST || usedAct("help")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent", opacity: usedAct("help") ? 0.4 : 1 })}>
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
        {/* Çırak al (usta çağı: 45+, en iyi beceri ≥6, genç NPC) */}
        {canTakeApprentice(state, npc) && (
          <Pressable onPress={() => { hap("success"); apply((s) => takeApprentice(s, npc)); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent" })}>
            <GameIcon name="anvil" size={16} color={C.gold} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.gold }}>{t("npc.aprTake")}</Text>
              <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 1 }}>{t("npc.aprTakeSub")}</Text>
            </View>
            <Text style={{ color: C.goldDim, fontSize: 15 }}>›</Text>
          </Pressable>
        )}
        {/* Çırakla çalış (ayda bir ders) */}
        {state.player.apprentice?.id === npc.id && (() => { const taught = state.player.apprentice_turn === state.turn; return (
          <Pressable disabled={taught} onPress={() => { hap("tap"); apply((s) => mentorApprentice(s)); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: pressed ? C.cardHi : "rgba(201,168,76,0.06)", opacity: taught ? 0.4 : 1 })}>
            <GameIcon name="graduate-cap" size={16} color={C.gold} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.gold }}>{t("npc.aprMentor")}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 1 }}>{(state.player.apprentice?.months || 0)}/{APPRENTICE_MONTHS} {t("npc.aprMonths")}</Text>
            </View>
            <Text style={{ color: C.goldDim, fontSize: 15 }}>›</Text>
          </Pressable>
        ); })()}
        {/* Söz kesilmiş: bu kişiyle nişanlısın, boşanmasını bekliyorsun */}
        {state.player.betrothed?.id === npc.id ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: "rgba(192,85,107,0.08)" }}>
            <GameIcon name="ring" size={17} color={C.roseDim} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.roseDim }}>{t("npc.betrothed")}</Text>
          </View>
        ) : couldMarry && (() => {
          const wed = npcSeededMarried(npc); // evli birine teklif: kabul ederse önce boşanması gerekir
          return (
            <Pressable onPress={() => { if (courtable) { hap("success"); apply((s) => proposeMarriage(s, npc)); } }} disabled={!courtable} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: courtable ? "rgba(201,168,76,0.08)" : "transparent" }}>
              <GameIcon name="evlilik" size={17} color={courtable ? C.gold : C.parchmentMuted} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.serif, fontSize: 14, color: courtable ? C.gold : C.parchmentMuted }}>{t("npc.propose")}</Text>
                {!courtable ? <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 1 }}>{t("npc.proposeReq")}</Text>
                  : wed ? <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.roseDim, marginTop: 1 }}>{t("affair.warnTheirs")}</Text> : null}
              </View>
              {courtable ? <SansRozet yuzde={teklifSansi(state, npc, "kur").yuzde} acik={sansAcik === "kur"} onPress={() => setSansAcik(sansAcik === "kur" ? null : "kur")} /> : null}
            </Pressable>
          );
        })()}
        {sansAcik === "kur" && courtable ? (() => { const x = teklifSansi(state, npc, "kur"); return <SansDokum kalemler={x.kalemler} yuzde={x.yuzde} t={t} />; })() : null}
        {/* Ek etkileşimler (Vercel npc_interactions): para / flört / dedikodu / hakaret */}
        <Pressable onPress={() => { if (state.player.money >= GIVE_MONEY_AMT) { hap("tap"); apply((s) => giveMoneyTo(s, npc)); } }} disabled={state.player.money < GIVE_MONEY_AMT} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent" })}>
          <GameIcon name="akce" size={16} color={state.player.money >= GIVE_MONEY_AMT ? C.gold : C.parchmentMuted} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: state.player.money >= GIVE_MONEY_AMT ? C.parchment : C.parchmentMuted }}>{t("npca.moneyBtn")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 11, color: C.goldDim }}>{GIVE_MONEY_AMT} ⚜</Text>
        </Pressable>
        {canFlirt(state.player, npc, v) && (() => {
          const forbidden = flirtIsForbidden(state.player, npc);
          const tone = forbidden ? C.ember : C.gold;
          return (
            <Pressable disabled={usedAct("flirt")} onPress={() => { hap("success"); apply((s) => flirtWith(s, npc)); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: pressed ? C.cardHi : (forbidden ? "rgba(224,90,48,0.06)" : "transparent"), opacity: usedAct("flirt") ? 0.4 : 1 })}>
              <GameIcon name="lyre" size={16} color={tone} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.serif, fontSize: 14, color: tone }}>{forbidden ? t("affair.flirtBtn") : t("npca.flirtBtn")}</Text>
                {forbidden ? <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.ember, marginTop: 1 }}>{state.player.married ? tg("affair.warnMarried", state.player.gender === "kadın") : t("affair.warnTheirs")}</Text> : null}
              </View>
              <SansRozet yuzde={teklifSansi(state, npc, "flort").yuzde} acik={sansAcik === "flort"} onPress={() => setSansAcik(sansAcik === "flort" ? null : "flort")} />
            </Pressable>
          );
        })()}
        {sansAcik === "flort" && canFlirt(state.player, npc, v) ? (() => { const x = teklifSansi(state, npc, "flort"); return <SansDokum kalemler={x.kalemler} yuzde={x.yuzde} t={t} />; })() : null}
        <Pressable disabled={state.player.dead || state.player.age < 13 || usedAct("gossip")} onPress={() => { hap("tap"); apply((s) => gossipAbout(s, npc)); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent", opacity: (state.player.age < 13 || usedAct("gossip")) ? 0.45 : 1 })}>
          <GameIcon name="speaker" size={16} color={C.parchment} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{t("npca.gossipBtn")}</Text>
          <SansRozet yuzde={teklifSansi(state, npc, "dedikodu").yuzde} acik={sansAcik === "dedikodu"} onPress={() => setSansAcik(sansAcik === "dedikodu" ? null : "dedikodu")} />
        </Pressable>
        {sansAcik === "dedikodu" ? (() => { const x = teklifSansi(state, npc, "dedikodu"); return <SansDokum kalemler={x.kalemler} yuzde={x.yuzde} t={t} />; })() : null}
        {/* Helallik: aranızda kırgınlık varsa — içtenlikle ya da gönlünü alarak (bedelli) */}
        {helalUygun(state, npc.id) && (() => { const cost = helalBedeli(state, npc.id); const kul = usedAct("helal") || state.player.dead || state.player.age < 13; return (<>
          <Pressable disabled={kul} onPress={() => { hap("tap"); apply((s) => helallikIste(s, npc, false)); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent", opacity: kul ? 0.45 : 1 })}>
            <GameIcon name="prayer-beads" size={16} color={C.sage} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{t("npca.helalBtn")}</Text>
            <SansRozet yuzde={helalSansi(state, npc, false).yuzde} acik={sansAcik === "helal"} onPress={() => setSansAcik(sansAcik === "helal" ? null : "helal")} />
          </Pressable>
          {sansAcik === "helal" ? (() => { const x = helalSansi(state, npc, false); return <SansDokum kalemler={x.kalemler} yuzde={x.yuzde} t={t} />; })() : null}
          <Pressable disabled={kul || state.player.money < cost} onPress={() => { hap("tap"); apply((s) => helallikIste(s, npc, true)); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent", opacity: kul || state.player.money < cost ? 0.45 : 1 })}>
            <GameIcon name="akce" size={16} color={C.gold} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{t("npca.helalBedelBtn")} <Text style={{ fontFamily: F.display, fontSize: 11, color: C.goldDim }}>· {cost} ⚜</Text></Text>
            <SansRozet yuzde={helalSansi(state, npc, true).yuzde} acik={sansAcik === "helalb"} onPress={() => setSansAcik(sansAcik === "helalb" ? null : "helalb")} />
          </Pressable>
          {sansAcik === "helalb" ? (() => { const x = helalSansi(state, npc, true); return <SansDokum kalemler={x.kalemler} yuzde={x.yuzde} t={t} />; })() : null}
        </>); })()}
        <Pressable disabled={state.player.dead || state.player.age < 13 || usedAct("insult")} onPress={() => { hap("tap"); apply((s) => insultNpc(s, npc)); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: pressed ? C.cardHi : "transparent", opacity: (state.player.age < 13 || usedAct("insult")) ? 0.45 : 1 })}>
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
            <Pressable key={k} disabled={usedAct("gift")} onPress={() => { hap("tap"); apply((s) => giftTo(s, npc, k)); setGiftOpen(false); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 11, marginBottom: 7, opacity: usedAct("gift") ? 0.4 : 1 }}>
              <View style={{ width: 32, height: 32, borderRadius: 7, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                <GameIcon name={giftIcon(ITEMS[k])} size={16} color={C.gold} />
              </View>
              <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{t("it." + k)}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentMuted }}>×{state.player.inventory[k]}</Text>
            </Pressable>
          ))}
        </View>
      )}

      </>)}

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
                <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12.5, color: m.travma ? C.blood : C.parchmentDim, lineHeight: 17 }}>{tg("mem.remember." + m.tur, state?.player.gender === "kadın")}{m.travma ? ` — ${t("npc.trauma")}` : ""}</Text>
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
    </ScrollView></ScreenFresk>
  );
}
