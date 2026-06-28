import { useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { arrangedSuitors, npcWealthTier, proposeArranged, canArrange, MATCHMAKER_FEE } from "../../lib/game";
import { professionNameL } from "../../lib/locale-data";
import { useI18n, applyParams } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader, Portre } from "../../lib/ui";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";

// Görücü usulü / çöpçatan: yaş ve servet filtreli talip listesi (yakınlık şartı yok).
export default function Copcatan() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  const [ageF, setAgeF] = useState<"all" | "young" | "mid" | "old">("all");
  const [wealthF, setWealthF] = useState<number>(-1); // -1 hepsi, 0/1/2 servet
  const suitors = useMemo(() => (state ? arrangedSuitors(state, lang) : []), [state?.seed, lang, state?.player.location_name, state?.turn, state?.player.married]);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const able = canArrange(state);
  const inAge = (a: number) => ageF === "all" || (ageF === "young" && a < 30) || (ageF === "mid" && a >= 30 && a < 45) || (ageF === "old" && a >= 45);
  const list = suitors.filter((n) => inAge(n.age) && (wealthF < 0 || npcWealthTier(n) === wealthF));
  const ageChips: { k: typeof ageF; label: string }[] = [
    { k: "all", label: t("cc.age.all") }, { k: "young", label: t("cc.age.young") }, { k: "mid", label: t("cc.age.mid") }, { k: "old", label: t("cc.age.old") },
  ];
  const wealthChips: { v: number; label: string }[] = [
    { v: -1, label: t("cc.age.all") }, { v: 2, label: t("cc.wealth.2") }, { v: 1, label: t("cc.wealth.1") }, { v: 0, label: t("cc.wealth.0") },
  ];
  const Chip = ({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) => (
    <Pressable onPress={() => { hap("tap"); onPress(); }} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: active ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: active ? "rgba(201,168,76,0.14)" : C.bg }}>
      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 0.5, color: active ? C.gold : C.parchmentMuted }}>{label}</Text>
    </Pressable>
  );
  const wealthLabel = (tier: number) => t("cc.wealth." + tier);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <GameIcon name="akce" size={12} color={C.gold} /><Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <PageHeader kicker={t("cc.kicker")} title={t("cc.title")} sub={applyParams(t("cc.fee"), [MATCHMAKER_FEE])} />

        {p.married ? (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 22, alignItems: "center", marginTop: 8 }}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center" }}>{t("cc.married")}</Text>
          </View>
        ) : (
          <>
            {/* Filtreler */}
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.goldDim, marginBottom: 6, marginTop: 4 }}>{t("cc.byAge").toUpperCase()}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
              {ageChips.map((c) => <Chip key={c.k} active={ageF === c.k} label={c.label} onPress={() => setAgeF(c.k)} />)}
            </View>
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.goldDim, marginBottom: 6 }}>{t("cc.byWealth").toUpperCase()}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
              {wealthChips.map((c) => <Chip key={c.v} active={wealthF === c.v} label={c.label} onPress={() => setWealthF(c.v)} />)}
            </View>

            {list.length === 0 ? (
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted, textAlign: "center", marginTop: 16 }}>{t("cc.none")}</Text>
            ) : list.map((n) => {
              const tier = npcWealthTier(n);
              const tcol = tier === 2 ? C.sage : tier === 0 ? C.parchmentMuted : C.gold;
              return (
                <View key={n.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 11, padding: 12, marginBottom: 9, flexDirection: "row", alignItems: "center", gap: 11 }}>
                  <Portre age={n.age} gender={n.gender} size={40} ring={false} seed={n.id} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{n.name}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{professionNameL(n.profession, lang)} · {n.age}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                      <GameIcon name="akce" size={9} color={tcol} /><Text style={{ fontFamily: F.display, fontSize: 9, color: tcol }}>{wealthLabel(tier)}</Text>
                    </View>
                  </View>
                  <Pressable disabled={!able} onPress={() => { hap("success"); apply((s) => proposeArranged(s, n)); }} style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1.5, borderColor: able ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: able ? C.gold : C.bg, opacity: able ? 1 : 0.5 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 0.5, color: able ? "#1a1206" : C.parchmentMuted }}>{t("cc.propose")}</Text>
                  </Pressable>
                </View>
              );
            })}
            {!able && !p.married && <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.blood, textAlign: "center", marginTop: 10 }}>{applyParams(t("cc.needFee"), [MATCHMAKER_FEE])}</Text>}
          </>
        )}
      </ScrollView>
    </View>
  );
}
