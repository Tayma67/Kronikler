import { View, Text, ScrollView, Pressable } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { useItem, allocateStat, Stats, pendingPerkCount, equipItem, unequipItem } from "../../lib/game";
import { ITEMS } from "../../lib/world";
import { Portre } from "../../lib/ui";
import { GameIcon } from "../../lib/icons";
import { useI18n } from "../../lib/i18n";
import { placeName, professionNameL } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";

// Altın çizgi + elmas ayraç (Vercel motifi).
function GoldDivider({ mt = 16, mb = 12 }: { mt?: number; mb?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: mt, marginBottom: mb }}>
      <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
      <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: "45deg" }], marginHorizontal: 8 }} />
      <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
    </View>
  );
}

function SectionHead({ t }: { t: string }) {
  return <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2.5, color: C.gold, textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>{t}</Text>;
}

// Elmas stat rozeti.
function DiamondBadge({ value, size = 46 }: { value: number; size?: number }) {
  const half = size / 2, pad = size * 0.09, pad2 = size * 0.2;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Polygon points={`${half},${pad} ${size - pad},${half} ${half},${size - pad} ${pad},${half}`} fill={C.cardHi} stroke={C.gold} strokeWidth={1.5} />
        <Polygon points={`${half},${pad2} ${size - pad2},${half} ${half},${size - pad2} ${pad2},${half}`} fill="none" stroke="rgba(201,168,76,0.28)" strokeWidth={0.7} />
      </Svg>
      <Text style={{ fontFamily: F.display, fontSize: size * 0.36, color: C.goldBright }}>{value}</Text>
    </View>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <View style={{ height: 5, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
      <View style={{ width: `${pct}%`, height: 5, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

function VitalBar({ icon, label, value, max, color, suffix }: { icon: string; label: string; value: number; max: number; color: string; suffix?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <GameIcon name={icon} size={13} color={color} />
          <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{label}</Text>
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment }}>{value}{suffix || ""}</Text>
      </View>
      <Bar value={value} max={max} color={color} />
    </View>
  );
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

export default function Karakter() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const inv = Object.keys(p.inventory).filter((k) => p.inventory[k] > 0);
  const canAdd = p.stat_points > 0;
  const STAT_KEYS: { k: keyof Stats; label: string }[] = [
    { k: "strength", label: t("st.strength") }, { k: "intelligence", label: t("st.intelligence") },
    { k: "charisma", label: t("st.charisma") }, { k: "stamina", label: t("st.stamina") },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 18, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 }}>
      {/* ── Hero başlık ── */}
      <View style={{ alignItems: "center" }}>
        <View style={{ borderWidth: 2, borderColor: C.gold, borderRadius: 44, padding: 2, shadowColor: C.gold, shadowOpacity: 0.4, shadowRadius: 12 }}>
          <Portre age={p.age} gender={p.gender} size={76} ring={false} />
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 21, color: C.parchment, letterSpacing: 1.5, marginTop: 10, textAlign: "center" }}>{p.name}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.gold, marginTop: 2, textAlign: "center" }}>
          {p.profession === "işsiz" ? t("misc.jobless") : professionNameL(p.profession, lang)}
        </Text>
        <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.parchmentMuted, marginTop: 4, textTransform: "uppercase" }}>
          {p.gender === "kadın" ? t("misc.female") : t("misc.male")} · {p.age} {t("misc.age")} · {placeName(p.location_name, lang)}
        </Text>
      </View>

      <GoldDivider mt={18} />

      {/* ── Hayati değerler ── */}
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14 }}>
        <VitalBar icon="saglik" label={t("char.health")} value={Math.round(p.health)} max={100} color={C.blood} />
        <VitalBar icon="tokluk" label={t("char.hunger")} value={Math.round(p.hunger)} max={100} color={C.sage} />
        <VitalBar icon="akce" label={t("char.money")} value={Math.round(p.money)} max={500} color={C.gold} suffix=" ⚜" />
      </View>

      {/* ── Özellikler (elmas rozetler) ── */}
      <GoldDivider />
      <SectionHead t={canAdd ? `${t("char.attrs")} · ${p.stat_points} ${t("char.points")}` : t("char.attrs")} />
      <View style={{ flexDirection: "row", justifyContent: "space-around", backgroundColor: C.card, borderWidth: 1, borderColor: canAdd ? "rgba(201,168,76,0.45)" : C.border, borderRadius: 10, paddingVertical: 16 }}>
        {STAT_KEYS.map(({ k, label }) => (
          <View key={k} style={{ alignItems: "center", gap: 7 }}>
            <DiamondBadge value={p.stats[k]} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <GameIcon name={STAT_ICON[k]} size={11} color={C.goldDim} />
              <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 0.5, color: C.parchmentMuted, textTransform: "uppercase" }}>{label}</Text>
            </View>
            {canAdd && (
              <Pressable onPress={() => apply((s) => allocateStat(s, k))} style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: "rgba(201,168,76,0.6)", backgroundColor: "rgba(201,168,76,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: C.gold, fontSize: 15, lineHeight: 17 }}>+</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {/* ── Beceriler ── */}
      <GoldDivider />
      <Pressable onPress={() => router.push("/oyun/beceriler")}>
        <SectionHead t={pendingPerkCount(p) > 0 ? `${t("char.skills")} · ${pendingPerkCount(p)} ${t("char.perksAvail")}` : t("char.skills")} />
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: pendingPerkCount(p) > 0 ? "rgba(201,168,76,0.45)" : C.border, borderRadius: 10, paddingHorizontal: 14 }}>
          <Row k={t("skill.combat")} v={p.skills.combat} />
          <Row k={t("skill.trade")} v={p.skills.trade} />
          <Row k={t("skill.crafting")} v={p.skills.crafting} />
          <Row k={t("skill.social")} v={p.skills.social} />
        </View>
      </Pressable>

      {/* ── Toplumsal statü ── */}
      <GoldDivider />
      <SectionHead t={t("char.status")} />
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14 }}>
        <Row k={t("char.guild")} v={p.faction ? t("fac." + p.faction + ".n") : "—"} />
        <Row k={t("soc.reputation.l")} v={Math.round(p.reputation)} />
        <Row k={t("soc.honor.l")} v={Math.round(p.honor)} />
        <Row k={t("soc.fame.l")} v={Math.round(p.fame)} />
        <Row k={t("soc.fear.l")} v={Math.round(p.fear)} />
        <Row k={t("char.gen")} v={`${p.generation}. ${t("misc.generation")}`} />
      </View>

      {p.injuries && p.injuries.length > 0 && (
        <>
          <GoldDivider />
          <SectionHead t={t("char.injuries")} />
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(168,52,52,0.35)", borderRadius: 10, paddingHorizontal: 14 }}>
            {p.injuries.map((inj, i) => (
              <Row key={i} k={inj.label} v={inj.permanent ? t("char.permanent") : `${inj.weeks_left} ${t("char.mo")}`} />
            ))}
          </View>
        </>
      )}

      {/* ── Aile ── */}
      <GoldDivider />
      <SectionHead t={t("char.family")} />
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14 }}>
        <Row k={t("char.spouse")} v={p.spouse_name || "—"} />
        <Row k={t("char.children")} v={p.children.length ? p.children.join(", ") : "—"} />
      </View>

      {/* ── Donanım ── */}
      <GoldDivider />
      <SectionHead t={t("char.gear")} />
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{t("char.weapon")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{p.equipped?.silah ? `${t("it." + p.equipped.silah)} (+${ITEMS[p.equipped.silah]?.power})` : "—"}</Text>
            {p.equipped?.silah && <Pressable onPress={() => apply((s) => unequipItem(s, "silah"))}><Text style={{ color: C.blood, fontFamily: F.display, fontSize: 10 }}>{t("misc.remove")}</Text></Pressable>}
          </View>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 }}>
          <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{t("char.armor")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{p.equipped?.zirh ? `${t("it." + p.equipped.zirh)} (+${ITEMS[p.equipped.zirh]?.defense})` : "—"}</Text>
            {p.equipped?.zirh && <Pressable onPress={() => apply((s) => unequipItem(s, "zirh"))}><Text style={{ color: C.blood, fontFamily: F.display, fontSize: 10 }}>{t("misc.remove")}</Text></Pressable>}
          </View>
        </View>
      </View>

      {/* ── Çanta ── */}
      <GoldDivider />
      <SectionHead t={t("char.bag")} />
      {inv.length === 0 ? (
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, textAlign: "center" }}>{t("char.bagEmpty")}</Text>
      ) : inv.map((k) => {
        const it = ITEMS[k]; const usable = it && (it.feed || it.heal); const equipable = it && (it.kind === "silah" || it.kind === "zirh");
        return (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 11, marginBottom: 7 }}>
            <Text style={{ fontSize: 16 }}>{it?.icon || "📦"}</Text>
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{t("it." + k)} ×{p.inventory[k]}</Text>
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
