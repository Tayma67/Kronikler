import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { RECIPES, canCraft, craft } from "../../lib/game";
import { ITEMS } from "../../lib/world";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader, Panel, Pill } from "../../lib/ui";

export default function Atolye() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Pill text={`${t("skill.crafting")} ${p.skills.crafting}`} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.atolye")} icon="🛠" title={t("scr.atolye")} sub={t("wsp.hint")} />
        <Panel title={t("scr.atolye")} icon="⚒" noPad>
          {RECIPES.map((r, i) => {
            const able = canCraft(p, r);
            const locked = p.skills.crafting < r.minSkill;
            const inputs = Object.entries(r.inputs).map(([id, q]) => `${t("it." + id)} ×${q} (${p.inventory[id] || 0})`).join(" + ");
            return (
              <View key={r.id} style={{ paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: i === RECIPES.length - 1 ? 0 : 1, borderBottomColor: C.border }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 7, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 16 }}>{ITEMS[r.out]?.icon}</Text>
                    </View>
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{t("it." + r.out)}{r.outQty > 1 ? ` ×${r.outQty}` : ""}</Text>
                  </View>
                  <Pressable disabled={!able} onPress={() => { hap('tap'); apply((s) => craft(s, r.id)); }} style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 7, borderWidth: 1, borderColor: able ? "rgba(201,168,76,0.5)" : C.border, backgroundColor: able ? "rgba(201,168,76,0.12)" : C.bg }}>
                    <Text style={{ fontFamily: F.display, fontSize: 11, color: able ? C.gold : C.parchmentMuted, letterSpacing: 1 }}>{locked ? `${t("wsp.skillAbbr")} ${r.minSkill}` : t("misc.craft")}</Text>
                  </Pressable>
                </View>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 6 }}>{inputs}</Text>
              </View>
            );
          })}
        </Panel>
      </ScrollView>
    </View>
  );
}
