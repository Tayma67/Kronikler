import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { RECIPES, canCraft, craft } from "../../lib/game";
import { ITEMS } from "../../lib/world";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel } from "../../lib/ui";

export default function Atolye() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{t("scr.atolye")}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{t("skill.crafting")} {p.skills.crafting}</Text>
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 8 }}>
        {t("wsp.hint")}
      </Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {RECIPES.map((r) => {
          const able = canCraft(p, r);
          const locked = p.skills.crafting < r.minSkill;
          const inputs = Object.entries(r.inputs).map(([id, q]) => `${t("it."+id)} ×${q} (${p.inventory[id] || 0})`).join(" + ");
          return (
            <View key={r.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 13, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{ITEMS[r.out]?.icon} {t("it."+r.out)}{r.outQty > 1 ? ` ×${r.outQty}` : ""}</Text>
                <Pressable disabled={!able} onPress={() => apply((s) => craft(s, r.id))} style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 7, borderWidth: 1, borderColor: able ? "rgba(201,168,76,0.5)" : C.border, backgroundColor: able ? "rgba(201,168,76,0.12)" : C.bg }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: able ? C.gold : C.parchmentMuted, letterSpacing: 1 }}>{locked ? `${t("wsp.skillAbbr")} ${r.minSkill}` : t("misc.craft")}</Text>
                </Pressable>
              </View>
              <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 5 }}>{inputs}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
