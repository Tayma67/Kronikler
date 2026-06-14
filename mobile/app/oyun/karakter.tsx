import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { useItem, allocateStat, Stats, factionById, pendingPerkCount, equipItem, unequipItem } from "../../lib/game";
import { ITEMS } from "../../lib/world";
import { Portre } from "../../lib/ui";
import { GameIcon } from "../../lib/icons";
import { useI18n } from "../../lib/i18n";
import { placeName, professionNameL } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";

function Head({ t }: { t: string }) {
  return <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginTop: 18, marginBottom: 8 }}>{t}</Text>;
}

function Row({ k, v }: { k: string; v: string | number }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{k}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{v}</Text>
    </View>
  );
}

const STAT_ICON: Record<string, string> = { strength: "guc", intelligence: "zeka", charisma: "karizma", stamina: "dayaniklilik" };
function StatRow({ label, value, k, canAdd, onAdd }: { label: string; value: number; k: keyof Stats; canAdd: boolean; onAdd: (k: keyof Stats) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <GameIcon name={STAT_ICON[k]} size={15} color={C.goldDim} />
        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{label}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{value}</Text>
        {canAdd && (
          <Pressable onPress={() => onAdd(k)} style={{ width: 26, height: 26, borderRadius: 6, borderWidth: 1, borderColor: "rgba(201,168,76,0.6)", backgroundColor: "rgba(201,168,76,0.12)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: C.gold, fontSize: 16, lineHeight: 18 }}>+</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function Karakter() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const inv = Object.keys(p.inventory).filter((k) => p.inventory[k] > 0);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 }}>
        <Portre age={p.age} gender={p.gender} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 20, color: C.parchment, letterSpacing: 1 }}>{p.name}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.gold }}>{p.gender === "kadın" ? t("misc.female") : t("misc.male")} · {p.age} {t("misc.age")} · {placeName(p.location_name, lang)}</Text>
        </View>
      </View>

      <Head t={p.stat_points > 0 ? `${t("char.attrs")} · ${p.stat_points} ${t("char.points")}` : t("char.attrs")} />
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14 }}>
        <StatRow label={t("st.strength")} value={p.stats.strength} k="strength" canAdd={p.stat_points > 0} onAdd={(k) => apply((s) => allocateStat(s, k))} />
        <StatRow label={t("st.intelligence")} value={p.stats.intelligence} k="intelligence" canAdd={p.stat_points > 0} onAdd={(k) => apply((s) => allocateStat(s, k))} />
        <StatRow label={t("st.charisma")} value={p.stats.charisma} k="charisma" canAdd={p.stat_points > 0} onAdd={(k) => apply((s) => allocateStat(s, k))} />
        <StatRow label={t("st.stamina")} value={p.stats.stamina} k="stamina" canAdd={p.stat_points > 0} onAdd={(k) => apply((s) => allocateStat(s, k))} />
        <Row k={t("char.profession")} v={p.profession === "işsiz" ? t("misc.jobless") : professionNameL(p.profession, lang)} />
        <Row k={t("char.health")} v={Math.round(p.health)} />
        <Row k={t("char.hunger")} v={Math.round(p.hunger)} />
        <Row k={t("char.money")} v={`${p.money} ⚜`} />
      </View>

      <Pressable onPress={() => router.push("/oyun/beceriler")}>
        <Head t={pendingPerkCount(p) > 0 ? `${t("char.skills")} · ${pendingPerkCount(p)} ${t("char.perksAvail")}` : t("char.skills")} />
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: pendingPerkCount(p) > 0 ? "rgba(201,168,76,0.45)" : C.border, borderRadius: 10, paddingHorizontal: 14 }}>
          <Row k={t("skill.combat")} v={p.skills.combat} />
          <Row k={t("skill.trade")} v={p.skills.trade} />
          <Row k={t("skill.crafting")} v={p.skills.crafting} />
          <Row k={t("skill.social")} v={p.skills.social} />
        </View>
      </Pressable>

      <Head t={t("char.status")} />
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14 }}>
        <Row k={t("char.guild")} v={p.faction ? t("fac."+p.faction+".n") : "—"} />
        <Row k={t("soc.reputation.l")} v={Math.round(p.reputation)} />
        <Row k={t("soc.honor.l")} v={Math.round(p.honor)} />
        <Row k={t("soc.fame.l")} v={Math.round(p.fame)} />
        <Row k={t("soc.fear.l")} v={Math.round(p.fear)} />
        <Row k={t("char.gen")} v={`${p.generation}. ${t("misc.generation")}`} />
      </View>

      {p.injuries && p.injuries.length > 0 && (
        <>
          <Head t={t("char.injuries")} />
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(168,52,52,0.35)", borderRadius: 10, paddingHorizontal: 14 }}>
            {p.injuries.map((inj, i) => (
              <Row key={i} k={inj.label} v={inj.permanent ? t("char.permanent") : `${inj.weeks_left} ${t("char.mo")}`} />
            ))}
          </View>
        </>
      )}

      <Head t={t("char.family")} />
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14 }}>
        <Row k={t("char.spouse")} v={p.spouse_name || "—"} />
        <Row k={t("char.children")} v={p.children.length ? p.children.join(", ") : "—"} />
      </View>

      <Head t={t("char.gear")} />
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{t("char.weapon")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{p.equipped?.silah ? `${t("it."+p.equipped.silah)} (+${ITEMS[p.equipped.silah]?.power})` : "—"}</Text>
            {p.equipped?.silah && <Pressable onPress={() => apply((s) => unequipItem(s, "silah"))}><Text style={{ color: C.blood, fontFamily: F.display, fontSize: 10 }}>{t("misc.remove")}</Text></Pressable>}
          </View>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 }}>
          <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{t("char.armor")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{p.equipped?.zirh ? `${t("it."+p.equipped.zirh)} (+${ITEMS[p.equipped.zirh]?.defense})` : "—"}</Text>
            {p.equipped?.zirh && <Pressable onPress={() => apply((s) => unequipItem(s, "zirh"))}><Text style={{ color: C.blood, fontFamily: F.display, fontSize: 10 }}>{t("misc.remove")}</Text></Pressable>}
          </View>
        </View>
      </View>

      <Head t={t("char.bag")} />
      {inv.length === 0 ? (
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted }}>{t("char.bagEmpty")}</Text>
      ) : inv.map((k) => {
        const it = ITEMS[k]; const usable = it && (it.feed || it.heal); const equipable = it && (it.kind === "silah" || it.kind === "zirh");
        return (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 11, marginBottom: 7 }}>
            <Text style={{ fontSize: 16 }}>{it?.icon || "📦"}</Text>
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{t("it."+k)} ×{p.inventory[k]}</Text>
            {equipable && (
              <Pressable onPress={() => apply((s) => equipItem(s, k))} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.1)" }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>{t("misc.equip")}</Text>
              </Pressable>
            )}
            {usable && (
              <Pressable onPress={() => apply((s) => useItem(s, k))} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.1)" }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>{t("misc.use")}</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
