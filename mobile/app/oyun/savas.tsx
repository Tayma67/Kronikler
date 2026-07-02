import { useState, useRef } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { ENCOUNTERS, combatPower, armorDefense, weaponClass, hasShield, shieldBlockChance, applyBattleOutcome, nemesisEncounter, applyNemesisOutcome } from "../../lib/game";
import { startBattle, stepBattle, MOVES, STANCES, BattleState, Move, Stance, CbLogEntry } from "../../lib/combat";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { FloatingNumber, Slash } from "../../lib/fx";
import { BackLabel, PageHeader, ProgressBar } from "../../lib/ui";

function HpBar({ label, hp, max, color }: { label: string; hp: number; max: number; color: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
        <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchment, letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentMuted }}>{Math.round(hp)}/{max}</Text>
      </View>
      <ProgressBar value={hp} max={max} color={color} h={7} />
    </View>
  );
}

export default function Savas() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  // i18n anahtarı yoksa encounter'ın kendi (TR) verisini kullan.
  const gt = (key: string, fb: string) => { const v = t(key); return v === key ? fb : v; };
  // Savaş log'u (combat.ts'ten dile bağımsız {k,p}) render anında çevrilir: { mv } → hamle adı, { lk } → alt-anahtar.
  const renderCb = (e: CbLogEntry): string =>
    applyParams(t(e.k), (e.p || []).map((x): string | number => {
      if (x && typeof x === "object") return "mv" in x ? t("cb." + x.mv) : t(x.lk);
      return x;
    }));
  const [bs, setBs] = useState<BattleState | null>(null);
  const [stance, setStance] = useState<Stance>("dengeli");
  const [encId, setEncId] = useState<string>("");
  const [applied, setApplied] = useState(false);
  const [floats, setFloats] = useState<{ id: number; value: string; color: string; left: number; top: number }[]>([]);
  const [slashKey, setSlashKey] = useState(0);
  const fid = useRef(0);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const pw = combatPower(p);
  const tooWeak = p.health < 15; // ağır yaralıyken dövüşe girilemez (1 canla 20 canlıymış gibi savaşma tutarsızlığı)
  const foughtThisMonth = p.battle_turn === state.turn; // bu ay bir kez dövüşüldü — para/beceri/itibar farmı önlenir (work/war ile aynı kapı)
  const canFight = p.age >= 13 && !p.dead && !tooWeak && !foughtThisMonth;

  const nemEnc = nemesisEncounter(state);
  const begin = (id: string) => { const e = ENCOUNTERS.find((x) => x.id === id)!; setEncId(id); setBs(startBattle(p, { ...e, title: gt("enc." + e.id + ".t", e.title) })); setApplied(false); setFloats([]); };
  const beginNemesis = () => { if (!nemEnc) return; setEncId("nemesis"); setBs(startBattle(p, nemEnc)); setApplied(false); setFloats([]); };
  const play = (mv: Move) => {
    if (!bs || bs.over) return;
    const next = stepBattle(bs, p, mv, stance);
    const dE = Math.round(bs.enemyHp - next.enemyHp);
    const dY = Math.round(bs.playerHp - next.playerHp);
    const adds: { id: number; value: string; color: string; left: number; top: number }[] = [];
    if (dE > 0) adds.push({ id: fid.current++, value: `-${dE}`, color: C.ember, left: 235, top: 44 });
    if (dY > 0) adds.push({ id: fid.current++, value: `-${dY}`, color: C.blood, left: 30, top: 2 });
    if (dE > 0) setSlashKey((k) => k + 1);
    if (adds.length) {
      setFloats((f) => [...f.slice(-3), ...adds]);
      hap(dY > 0 ? "advance" : "tap");
      shake.value = withSequence(withTiming(-7, { duration: 45 }), withTiming(7, { duration: 45 }), withTiming(-4, { duration: 40 }), withTiming(0, { duration: 40 }));
    }
    setBs(next);
  };
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
        {slashKey > 0 && <Slash key={slashKey} />}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
          <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1, textAlign: "center" }}>{bs.enemyName}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.blood, textAlign: "center", marginTop: 3 }}>
            <Text style={{ fontFamily: F.display, letterSpacing: 0.5, textTransform: "uppercase" }}>{t("cb.arch." + bs.arch)}</Text> · {t("cb.archd." + bs.arch)}
          </Text>
        </View>
        {/* Kuşam şeridi — silah arketipi · güç · zırh · kalkan bloğu */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 8 }}>
          {weaponClass(p) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <GameIcon name="silah" size={11} color={C.ember} />
              <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 0.5, color: C.ember, textTransform: "uppercase" }}>{t("wc." + weaponClass(p))}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="crossed-swords" size={11} color={C.parchmentDim} /><Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.parchmentDim }}>{pw}</Text></View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="shield" size={11} color={C.azure} /><Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.azure }}>{armorDefense(p)}</Text></View>
          {hasShield(p) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="kite" size={11} color={C.sage} /><Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.sage }}>{t("cb.block")} %{Math.round(shieldBlockChance(p, stance === "savunmaci") * 100)}</Text></View>
          ) : null}
        </View>
        <Animated.View style={[{ paddingHorizontal: 20, position: "relative" }, shakeStyle]}>
          <HpBar label={t("cb.you")} hp={bs.playerHp} max={bs.playerMax} color={C.sage} />
          <HpBar label={t("cb.enemy")} hp={bs.enemyHp} max={bs.enemyMax} color={C.blood} />
          {floats.map((f) => <FloatingNumber key={f.id} value={f.value} color={f.color} left={f.left} top={f.top} />)}
        </Animated.View>
        <ScrollView style={{ flex: 1, marginTop: 8 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {[...bs.log].reverse().map((l, i) => (
            <Text key={i} style={{ fontFamily: F.serif, fontSize: 13, color: i === 0 ? C.parchment : C.parchmentMuted, lineHeight: 20, marginBottom: 5 }}>{renderCb(l)}</Text>
          ))}
        </ScrollView>
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: insets.bottom + 16 }}>
          {bs.over ? (
            <Pressable onPress={finish} style={{ paddingVertical: 15, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: "#1a1206", letterSpacing: 1.5 }}>{bs.won ? t("cb.claim") : t("cb.retreat")}</Text>
            </Pressable>
          ) : (
            <>
              {/* Niyet telegraf'ı: düşmanın sezdiğin bir sonraki hamlesi (kurnaz düşman fent atabilir) */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1, borderColor: "rgba(200,64,64,0.3)", backgroundColor: "rgba(200,64,64,0.07)" }}>
                <GameIcon name="compass" size={13} color={C.blood} />
                <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted }}>{t("cb.intent")}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <GameIcon name={MOVES.find((m) => m.id === bs.enemyIntent)?.icon || "fist"} size={14} color={C.blood} />
                  <Text style={{ fontFamily: F.display, fontSize: 12, color: C.blood }}>{t("cb." + bs.enemyIntent)}</Text>
                </View>
                {bs.desperate ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginLeft: "auto", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: "rgba(200,64,64,0.22)" }}>
                    <GameIcon name="flame" size={11} color={C.ember} />
                    <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 0.5, color: C.ember, textTransform: "uppercase" }}>{t("cb.desperate")}</Text>
                  </View>
                ) : null}
              </View>
              {/* Duruş seçimi (Vercel portu): saldırı/savunma dengesi */}
              <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 1.5, color: C.parchmentMuted, marginBottom: 5 }}>{t("cb.stanceLabel")}</Text>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
                {STANCES.map((s) => {
                  const on = stance === s.id;
                  return (
                    <Pressable key={s.id} onPress={() => { hap("tap"); setStance(s.id); }} style={{ flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: on ? "rgba(201,168,76,0.7)" : C.border, backgroundColor: on ? "rgba(201,168,76,0.15)" : C.bg }}>
                      <Text style={{ fontFamily: F.display, fontSize: 10, color: on ? C.gold : C.parchmentMuted }}>{t("cb.stance." + s.id)}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <GameIcon name="crossed-swords" size={8} color={C.parchmentDim} />
                        <Text style={{ fontFamily: F.serif, fontSize: 8.5, color: C.parchmentDim }}>{Math.round(s.atk * 100)}%</Text>
                        <GameIcon name="shield" size={8} color={C.parchmentDim} />
                        <Text style={{ fontFamily: F.serif, fontSize: 8.5, color: C.parchmentDim }}>{Math.round(s.def * 100)}%</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {MOVES.map((m) => (
                  <Pressable key={m.id} onPress={() => play(m.id)} style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
                    <GameIcon name={m.icon} size={20} color={C.gold} />
                    <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchment, marginTop: 5, letterSpacing: 0.5 }}>{t("cb." + m.id)}</Text>
                  </Pressable>
                ))}
              </View>
            </>
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          {weaponClass(p) ? <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: C.ember, textTransform: "uppercase" }}>{t("wc." + weaponClass(p))}</Text> : null}
          <GameIcon name="crossed-swords" size={12} color={C.blood} />
          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.blood }}>{pw}</Text>
        </View>
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 10 }}>
        {t("cb.subtitle")} {(p.inventory["bicak"] || 0) > 0 ? t("cb.knifeYes") : t("cb.knifeNo")}
      </Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <PageHeader kicker={t("scr.savas")} title={t("scr.savas")} />
        {tooWeak && !p.dead && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(168,52,52,0.1)", borderWidth: 1, borderColor: "rgba(168,52,52,0.45)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <GameIcon name="saglik" size={15} color={C.blood} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12, color: C.parchment, lineHeight: 17 }}>{t("cb.tooWeak")}</Text>
          </View>
        )}
        {p.age < 13 && !p.dead && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(168,52,52,0.1)", borderWidth: 1, borderColor: "rgba(168,52,52,0.45)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <GameIcon name="savas" size={15} color={C.blood} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12, color: C.parchment, lineHeight: 17 }}>{t("cb.tooYoung")}</Text>
          </View>
        )}
        {foughtThisMonth && !tooWeak && !p.dead && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(168,52,52,0.1)", borderWidth: 1, borderColor: "rgba(168,52,52,0.45)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <GameIcon name="savas" size={15} color={C.blood} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12, color: C.parchment, lineHeight: 17 }}>{t("cb.foughtMonth")}</Text>
          </View>
        )}
        {nemEnc && (
          <View style={{ backgroundColor: "rgba(120,20,20,0.15)", borderWidth: 1, borderColor: "rgba(200,60,60,0.6)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><GameIcon name="suc" size={13} color={C.blood} /><Text style={{ fontFamily: F.display, fontSize: 14, color: C.blood }}>{nemEnc.title}</Text></View>
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
                <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{gt("enc." + e.id + ".t", e.title)}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 11, color: tooStrong ? C.blood : C.goldDim }}>{t("cb.enemyPower")} {e.power}</Text>
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginTop: 5, lineHeight: 18 }}>{gt("enc." + e.id + ".d", e.desc)}</Text>
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
