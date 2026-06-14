import { View, Text, ScrollView, Pressable } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { INVESTMENTS, WILL_STYLES, investInChild, continueAsHeir } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel } from "../../lib/ui";

export default function Nesil() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply, resetGame } = useGame();
  const { t } = useI18n();
  const [heir, setHeir] = useState<string | null>(null);
  const [will, setWill] = useState<string>("esit");
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const chosenHeir = heir || p.children[0];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{t("scr.nesil")}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {p.children.length === 0 ? (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", marginTop: 30 }}>
            {t("nes.noChildren")}
          </Text>
        ) : p.dead ? (
          <>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchment, marginBottom: 12 }}>
              {t("nes.deadPrompt")}
            </Text>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 8 }}>{t("nes.chooseHeir")}</Text>
            {p.children.map((c) => (
              <Pressable key={c} onPress={() => setHeir(c)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 9, borderWidth: 1, marginBottom: 7, borderColor: chosenHeir === c ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: chosenHeir === c ? "rgba(201,168,76,0.12)" : C.card }}>
                <GameIcon name="baby" size={16} color={C.gold} />
                <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: C.parchment }}>{c}</Text>
                {(p.child_invests?.[c]?.length || 0) > 0 && <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.goldDim }}>{p.child_invests[c].length} {t("nes.invests")}</Text>}
                {chosenHeir === c && <Text style={{ color: C.gold }}>✓</Text>}
              </Pressable>
            ))}
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 12, marginBottom: 8 }}>{t("nes.will")}</Text>
            {WILL_STYLES.map((w) => (
              <Pressable key={w.id} onPress={() => setWill(w.id)} style={{ padding: 12, borderRadius: 9, borderWidth: 1, marginBottom: 7, borderColor: will === w.id ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: will === w.id ? "rgba(201,168,76,0.12)" : C.card }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: will === w.id ? C.gold : C.parchment }}>{t("will." + w.id + ".l")}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 2 }}>{t("will." + w.id + ".d")}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => { apply((s) => continueAsHeir(s, will, chosenHeir)); router.replace("/oyun"); }} style={{ marginTop: 12, paddingVertical: 15, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: "#1a1206", letterSpacing: 1.5 }}>{t("dash.continueHeir")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: 12 }}>
              {t("nes.investPrompt")}
            </Text>
            {p.children.map((c) => {
              const invs = p.child_invests?.[c] || [];
              return (
                <View key={c} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 14, color: C.gold, marginBottom: 8 }}>{c}</Text>
                  {INVESTMENTS.map((inv) => {
                    const done = invs.includes(inv.id);
                    const afford = p.money >= inv.cost;
                    return (
                      <Pressable key={inv.id} disabled={done || !afford} onPress={() => apply((s) => investInChild(s, c, inv.id))} style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, opacity: done ? 0.6 : afford ? 1 : 0.5 }}>
                        <GameIcon name={inv.icon} size={15} color={done ? C.gold : C.goldDim} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment }}>{t("inv." + inv.id + ".l")}</Text>
                          <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.parchmentMuted }}>{t("inv." + inv.id + ".d")}</Text>
                        </View>
                        <Text style={{ fontFamily: F.display, fontSize: 11, color: done ? C.gold : C.parchmentMuted }}>{done ? "✓" : `${inv.cost}⚜`}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
