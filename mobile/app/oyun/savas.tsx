import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { ENCOUNTERS, combatPower, applyBattleOutcome, nemesisEncounter, applyNemesisOutcome } from "../../lib/game";
import { startBattle, stepBattle, MOVES, BattleState, Move } from "../../lib/combat";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel, PageHeader } from "../../lib/ui";

function HpBar({ label, hp, max, color }: { label: string; hp: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
        <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchment, letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentMuted }}>{Math.round(hp)}/{max}</Text>
      </View>
      <View style={{ height: 7, backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 4 }}>
        <View style={{ width: `${pct}%`, height: 7, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

export default function Savas() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  const [bs, setBs] = useState<BattleState | null>(null);
  const [encId, setEncId] = useState<string>("");
  const [applied, setApplied] = useState(false);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const pw = combatPower(p);
  const canFight = p.age >= 13 && !p.dead;

  const nemEnc = nemesisEncounter(state);
  const begin = (id: string) => { const e = ENCOUNTERS.find((x) => x.id === id)!; setEncId(id); setBs(startBattle(p, { ...e, title: t("enc." + e.id + ".t") })); setApplied(false); };
  const beginNemesis = () => { if (!nemEnc) return; setEncId("nemesis"); setBs(startBattle(p, nemEnc)); setApplied(false); };
  const play = (mv: Move) => { if (!bs || bs.over) return; setBs(stepBattle(bs, p, mv)); };
  const finish = () => {
    if (bs && !applied) {
      if (encId === "nemesis") apply((s) => applyNemesisOutcome(s, bs.won, bs.playerHp));
      else apply((s) => applyBattleOutcome(s, encId, bs.won, bs.playerHp));
      setApplied(true);
    }
    setBs(null);
  };

  // Savaş ekranı
  if (bs) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1, textAlign: "center" }}>{bs.enemyName}</Text>
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <HpBar label={t("cb.you")} hp={bs.playerHp} max={bs.playerMax} color={C.sage} />
          <HpBar label={t("cb.enemy")} hp={bs.enemyHp} max={bs.enemyMax} color={C.blood} />
        </View>
        <ScrollView style={{ flex: 1, marginTop: 8 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {[...bs.log].reverse().map((l, i) => (
            <Text key={i} style={{ fontFamily: F.serif, fontSize: 13, color: i === 0 ? C.parchment : C.parchmentMuted, lineHeight: 20, marginBottom: 5 }}>{l}</Text>
          ))}
        </ScrollView>
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: insets.bottom + 16 }}>
          {bs.over ? (
            <Pressable onPress={finish} style={{ paddingVertical: 15, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: "#1a1206", letterSpacing: 1.5 }}>{bs.won ? t("cb.claim") : t("cb.retreat")}</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {MOVES.map((m) => (
                <Pressable key={m.id} onPress={() => play(m.id)} style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
                  <GameIcon name={m.icon} size={20} color={C.gold} />
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchment, marginTop: 5, letterSpacing: 0.5 }}>{t("cb." + m.id)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  // Seçim ekranı
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <View style={{ width: 40 }} />
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.blood }}>⚔ {pw}</Text>
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 10 }}>
        {t("cb.subtitle")} {(p.inventory["bicak"] || 0) > 0 ? t("cb.knifeYes") : t("cb.knifeNo")}
      </Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <PageHeader kicker={t("scr.savas")} icon="⚔️" title={t("scr.savas")} />
        {nemEnc && (
          <View style={{ backgroundColor: "rgba(120,20,20,0.15)", borderWidth: 1, borderColor: "rgba(200,60,60,0.6)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 14, color: C.blood }}>☠ {nemEnc.title}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 11, color: C.blood }}>{t("cb.enemyPower")} {nemEnc.power}</Text>
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginTop: 5 }}>{nemEnc.desc} {t("cb.settleTime")}</Text>
            <Pressable disabled={!canFight} onPress={beginNemesis} style={{ alignSelf: "flex-start", marginTop: 10, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 7, borderWidth: 1, borderColor: "rgba(200,60,60,0.7)", backgroundColor: "rgba(200,60,60,0.2)" }}>
              <Text style={{ fontFamily: F.display, fontSize: 11, color: C.blood, letterSpacing: 1 }}>{t("cb.settle")}</Text>
            </Pressable>
          </View>
        )}
        {ENCOUNTERS.map((e) => {
          const tooStrong = e.power > pw + 8;
          return (
            <View key={e.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{t("enc." + e.id + ".t")}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 11, color: tooStrong ? C.blood : C.goldDim }}>{t("cb.enemyPower")} {e.power}</Text>
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginTop: 5, lineHeight: 18 }}>{t("enc." + e.id + ".d")}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.goldDim }}>{t("cb.reward")} +{e.reward}⚜ · {t("cb.fame")} +{e.fame}</Text>
                <Pressable disabled={!canFight} onPress={() => begin(e.id)} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 7, borderWidth: 1, borderColor: "rgba(168,52,52,0.55)", backgroundColor: canFight ? "rgba(168,52,52,0.14)" : C.card }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: canFight ? C.blood : C.parchmentMuted, letterSpacing: 1 }}>{t("cb.fight")}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
