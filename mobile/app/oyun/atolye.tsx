import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { RECIPES, canCraft, craft, Recipe } from "../../lib/game";
import { ITEMS } from "../../lib/world";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { playTap } from "../../lib/sound";
import { BackLabel, PageHeader, Pill } from "../../lib/ui";

// Tarifleri kategoriye ayır (görsel düzen için).
const CAT: Record<string, "food" | "arms" | "heal"> = {
  un: "food", ekmek: "food", corba: "food",
  bicak: "arms", kilic: "arms", celik_kilic: "arms", kalkan: "arms", deri_zirh: "arms",
  yay: "arms", savas_balta: "arms", zincir_zirh: "arms",
  iksir: "heal",
};
const CAT_ORDER: ("food" | "arms" | "heal")[] = ["food", "arms", "heal"];
const CAT_TONE = { food: "#7FA66A", arms: "#E0922E", heal: "#6FA0C0" };
const CAT_ICON = { food: "🥖", arms: "⚔️", heal: "🧪" };

export default function Atolye() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const skill = p.skills.crafting;

  const RecipeCard = ({ r }: { r: Recipe }) => {
    const tone = CAT_TONE[CAT[r.id]];
    const locked = skill < r.minSkill;
    const able = canCraft(p, r);
    const inputs = Object.entries(r.inputs);
    return (
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: able ? tone + "55" : C.border, borderRadius: 13, padding: 13, marginBottom: 10 }}>
        {/* Üst: çıktı + zanaat şartı */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
          <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: tone + "18", borderWidth: 1, borderColor: tone + "55", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 22 }}>{ITEMS[r.out]?.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{t("it." + r.out)}{r.outQty > 1 ? ` ×${r.outQty}` : ""}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
              <Text style={{ fontSize: 10 }}>{locked ? "🔒" : "🔨"}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 0.5, color: locked ? C.blood : C.parchmentMuted }}>
                {t("wsp.needSkill")}: {t("wsp.skillAbbr")}{r.minSkill} · {t("wsp.your")} {t("wsp.skillAbbr")}{skill}
              </Text>
            </View>
          </View>
        </View>

        {/* Malzemeler: var/gerek */}
        <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 1.5, color: C.goldDim, marginTop: 11, marginBottom: 6 }}>{t("wsp.materials").toUpperCase()}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {inputs.map(([id, q]) => {
            const have = p.inventory[id] || 0;
            const ok = have >= q;
            return (
              <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: ok ? "rgba(127,166,106,0.12)" : "rgba(201,168,76,0.06)", borderWidth: 1, borderColor: ok ? "rgba(127,166,106,0.5)" : C.border, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 9 }}>
                <Text style={{ fontSize: 12 }}>{ITEMS[id]?.icon}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchment }}>{t("it." + id)}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 10, color: ok ? C.sage : C.blood }}>{have}/{q}</Text>
              </View>
            );
          })}
        </View>

        {/* Üret butonu + durum */}
        <Pressable disabled={!able} onPress={() => { hap("success"); playTap(); apply((s) => craft(s, r.id)); }}
          style={{ marginTop: 12, paddingVertical: 11, borderRadius: 9, borderWidth: 1, alignItems: "center",
            borderColor: able ? tone + "88" : C.border, backgroundColor: able ? tone + "1F" : C.bg }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: able ? tone : C.parchmentMuted }}>
            {able ? `⚒ ${t("misc.craft")}` : locked ? applyParams(t("wsp.locked"), [r.minSkill]) : t("wsp.noMat")}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Pill text={`${t("skill.crafting")} ${skill}`} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 100 }}>
        <PageHeader kicker={t("scr.atolye")} icon="🛠" title={t("scr.atolye")} sub={t("wsp.hint")} />

        {/* Bilgi: üretim zanaatı geliştirir */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(201,168,76,0.07)", borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 11, marginBottom: 14 }}>
          <Text style={{ fontSize: 14 }}>💡</Text>
          <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted }}>{t("wsp.gain")}.</Text>
        </View>

        {CAT_ORDER.map((cat) => {
          const list = RECIPES.filter((r) => CAT[r.id] === cat);
          if (list.length === 0) return null;
          return (
            <View key={cat} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 14 }}>{CAT_ICON[cat]}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1.5, color: CAT_TONE[cat] }}>{t("wsp.cat." + cat).toUpperCase()}</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: CAT_TONE[cat] + "33" }} />
              </View>
              {list.map((r) => <RecipeCard key={r.id} r={r} />)}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
