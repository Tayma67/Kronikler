import { useState } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { useItem, allocateStat, Stats, pendingPerkCount, equipItem, unequipItem, careerTier, professionById, recognition, publicPerception, atHome, combatPower, armorDefense, attireScore, socialPresence, martialLoad, isTwoHanded, equippedQualityMult, QUALITY_LABEL, statXpOf, statXpForNext, statTierKey, spouseMizac, spendWithSpouse, tendChild, visitParents, visitHealer, healerCost, inJail } from "../../lib/game";
import { ITEMS, localFirstName } from "../../lib/world";
import { armaImage } from "../../lib/assets";
import { Portre, ProgressBar, GoldDivider } from "../../lib/ui";
import { GameIcon } from "../../lib/icons";
import { useI18n } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { placeName, professionNameL, careerTitleL } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";

const GB = "rgba(201,168,76,0.22)"; // gold border
const GBG = "rgba(201,168,76,0.07)"; // gold bg

function Card({ children }: { children: React.ReactNode }) {
  return <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: GB, borderRadius: 12, padding: 14, marginBottom: 10 }}>{children}</View>;
}
function SectionHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.gold, textTransform: "uppercase" }}>{title}</Text>
      {right}
    </View>
  );
}

// Yatay istatistik (sağlık/tokluk/akçe/taç) — ikon + değer + bar.
function StatTop({ icon, value, max, color, showBar = true, flex = 1 }: { icon: string; value: number; max?: number; color: string; showBar?: boolean; flex?: number }) {
  return (
    <View style={{ flex }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <GameIcon name={icon} size={12} color={color} />
        <Text style={{ fontFamily: F.display, fontSize: 14, color }}>{value}</Text>
        {max ? <Text style={{ fontSize: 9, color: C.parchmentMuted }}>/ {max}</Text> : null}
      </View>
      {showBar && max ? <ProgressBar value={value} max={max} color={color} h={4} /> : <View style={{ height: 4 }} />}
    </View>
  );
}

// Temel özellik kartı — ikon, ad, değer, bar.
function StatCard({ icon, name, value, color, canAdd, onAdd, xp, xpNext, tier }: { icon: string; name: string; value: number; color: string; canAdd: boolean; onAdd: () => void; xp?: number; xpNext?: number; tier?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingVertical: 10, paddingHorizontal: 6, alignItems: "center", gap: 4 }}>
      <GameIcon name={icon} size={17} color={color} />
      <Text style={{ fontFamily: F.display, fontSize: 7.5, letterSpacing: 0.5, color: C.parchmentMuted }} numberOfLines={1}>{name}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 18, color: C.goldBright }}>{value}</Text>
      {tier ? <Text style={{ fontFamily: F.serifItalic, fontSize: 8.5, color: color }} numberOfLines={1}>{tier}</Text> : null}
      <View style={{ width: "100%" }}><ProgressBar value={value} max={10} color={color} h={3} /></View>
      {xpNext ? <View style={{ width: "100%", marginTop: 1 }}><ProgressBar value={xp || 0} max={xpNext} color={C.goldDim} h={2} /></View> : null}
      {canAdd && (
        <Pressable onPress={onAdd} style={{ marginTop: 2, width: 22, height: 22, borderRadius: 5, borderWidth: 1, borderColor: C.gold, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.gold, fontSize: 14, lineHeight: 16 }}>+</Text>
        </Pressable>
      )}
    </View>
  );
}

// Toplumsal statü kartı — ikon, değer, etiket.
function SocialCard({ icon, name, value, color }: { icon: string; name: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingVertical: 11, paddingHorizontal: 4, alignItems: "center", gap: 4 }}>
      <GameIcon name={icon} size={15} color={color} />
      <Text style={{ fontFamily: F.display, fontSize: 7, letterSpacing: 0.5, color: C.parchmentMuted }} numberOfLines={1}>{name}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 16, color }}>{value}</Text>
    </View>
  );
}

function Badge({ name, text }: { name?: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: GBG, borderWidth: 1, borderColor: GB, borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 }}>
      {name ? <GameIcon name={name} size={9} color={C.gold} /> : null}
      <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 0.5, color: C.gold }}>{text}</Text>
    </View>
  );
}

// Aile bireyi karosu — portre + rol + ad (boşsa kesik çerçeve + amblem).
function RelativeTile({ role, name, age, gender, seed, has }: { role: string; name: string; age: number; gender: "erkek" | "kadın"; seed: string | number; has: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: "center", backgroundColor: C.bg, borderWidth: 1, borderColor: has ? GB : C.border, borderRadius: 11, paddingVertical: 11, paddingHorizontal: 5, gap: 7 }}>
      {has ? (
        <Portre age={age} gender={gender} size={50} ring={false} seed={seed} />
      ) : (
        <View style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", backgroundColor: C.card }}>
          <GameIcon name="iliskiler" size={20} color={C.parchmentMuted} />
        </View>
      )}
      <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 1, color: C.goldDim, textTransform: "uppercase" }}>{role}</Text>
      <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12.5, color: has ? C.parchment : C.parchmentMuted, textAlign: "center" }}>{name}</Text>
    </View>
  );
}

// Donanım yuvası karosu — ızgarada gösterilir. Boşsa kesik çerçeve; çift elli silahta kalkan kilitli.
function GearTile({ icon, label, item, quality, bonus, statColor, tag, locked, lockedText, onRemove, t }: { icon: string; label: string; item?: string | null; quality?: string; bonus?: number; statColor: string; tag?: string; locked?: boolean; lockedText?: string; onRemove?: () => void; t: (k: string) => string }) {
  const equipped = !!item;
  if (locked) {
    return (
      <View style={{ width: "31.5%", backgroundColor: "transparent", borderWidth: 1, borderColor: C.border, borderRadius: 11, paddingVertical: 10, paddingHorizontal: 7, alignItems: "center", gap: 5, opacity: 0.6 }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" }}>
          <GameIcon name={icon} size={20} color={C.parchmentMuted} />
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 7.5, letterSpacing: 0.5, color: C.parchmentMuted, textTransform: "uppercase" }} numberOfLines={1}>{label}</Text>
        <Text numberOfLines={2} style={{ fontFamily: F.serifItalic, fontSize: 9.5, color: C.parchmentMuted, textAlign: "center" }}>{lockedText}</Text>
        <View style={{ height: 14 }} />
      </View>
    );
  }
  return (
    <View style={{ width: "31.5%", backgroundColor: C.bg, borderWidth: 1, borderColor: equipped ? GB : C.border, borderRadius: 11, paddingVertical: 10, paddingHorizontal: 7, alignItems: "center", gap: 5 }}>
      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: equipped ? GBG : "transparent", borderWidth: 1, borderColor: equipped ? GB : C.border, alignItems: "center", justifyContent: "center" }}>
        <GameIcon name={icon} size={20} color={equipped ? C.gold : C.parchmentMuted} />
      </View>
      <Text style={{ fontFamily: F.display, fontSize: 7.5, letterSpacing: 0.5, color: C.parchmentMuted, textTransform: "uppercase" }} numberOfLines={1}>{label}</Text>
      <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 11.5, color: equipped ? C.parchment : C.parchmentMuted, textAlign: "center" }}>{equipped ? t("it." + item) : "—"}</Text>
      {equipped && tag ? <Text style={{ fontFamily: F.display, fontSize: 7, letterSpacing: 0.8, color: C.ember, textTransform: "uppercase" }} numberOfLines={1}>{tag}</Text> : null}
      {equipped ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          {bonus != null && bonus > 0 ? <Text style={{ fontFamily: F.display, fontSize: 11, color: statColor }}>+{bonus}</Text> : null}
          {quality && quality !== "siradan" ? <Text style={{ fontFamily: F.serifItalic, fontSize: 9, color: C.goldDim }}>{QUALITY_LABEL[quality as keyof typeof QUALITY_LABEL]}</Text> : null}
        </View>
      ) : <View style={{ height: 14 }} />}
      {equipped && onRemove ? (
        <Pressable onPress={onRemove} style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 5, borderWidth: 1, borderColor: "rgba(200,64,64,0.4)" }}>
          <Text style={{ fontFamily: F.display, fontSize: 8.5, color: C.blood }}>{t("misc.remove")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Çanta eşya ikonu — eşya türüne göre.
function itemIcon(it: any): string {
  if (!it) return "menu";
  if (it.kind === "silah") return "silah";
  if (it.kind === "zirh") return "shield";
  if (it.kind === "kalkan") return "kite";
  if (it.kind === "baslik") return "hood";
  if (it.kind === "eldiven") return "fist";
  if (it.kind === "ayakkabi") return "boot";
  if (it.kind === "kiyafet") return "wool";
  if (it.heal) return "saglik";
  if (it.feed) return "ye";
  return "menu";
}

// Teçhizat slot meta'sı (savaş slotları + kıyafet).
const GEAR_META: { slot: "silah" | "kalkan" | "zirh" | "baslik" | "eldiven" | "ayakkabi"; icon: string; labelKey: string; field: "power" | "defense" }[] = [
  { slot: "silah", icon: "silah", labelKey: "char.weapon", field: "power" },
  { slot: "kalkan", icon: "kite", labelKey: "char.shield", field: "defense" },
  { slot: "zirh", icon: "shield", labelKey: "char.armor", field: "defense" },
  { slot: "baslik", icon: "hood", labelKey: "char.helmet", field: "defense" },
  { slot: "eldiven", icon: "fist", labelKey: "char.gloves", field: "defense" },
  { slot: "ayakkabi", icon: "boot", labelKey: "char.boots", field: "defense" },
];

export default function Karakter() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  const [tab, setTab] = useState<"ozellikler" | "dunya" | "seruven">("ozellikler");
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const inv = Object.keys(p.inventory).filter((k) => p.inventory[k] > 0);
  const canAdd = p.stat_points > 0;
  const add = (k: keyof Stats) => { hap("tap"); apply((s) => allocateStat(s, k)); };
  const curPr = professionById(p.profession);
  const hasCareer = p.profession !== "işsiz" && !!curPr;
  const careerLevel = Math.floor(p.career_xp / 30) + 1;
  const xpInLevel = p.career_xp % 30;
  const crownLevel = Math.floor((p.fame || 0) / 20);
  const spouseGender: "erkek" | "kadın" = p.gender === "erkek" ? "kadın" : "erkek";
  const weaponTwoHanded = isTwoHanded(p.equipped?.silah);
  const weaponClassId = p.equipped?.silah ? ITEMS[p.equipped.silah]?.wclass : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 18, backgroundColor: C.bg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <View style={{ width: 40 }} />
          <Text style={{ fontFamily: F.display, fontSize: 16, letterSpacing: 4, color: C.gold }}>{t("tab.character").toUpperCase()}</Text>
          <Pressable onPress={() => router.push("/oyun/ayarlar")} style={{ width: 40, alignItems: "flex-end" }}><GameIcon name="ayarlar" size={18} color={C.gold} /></Pressable>
        </View>
        <GoldDivider mt={6} mb={0} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 90 }}>
        {/* ── Karakter kartı ── */}
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: GB, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {/* Portre dikdörtgen + arma */}
            <View style={{ width: 96, height: 120 }}>
              <View style={{ width: 96, height: 120, borderRadius: 8, borderWidth: 2, borderColor: C.gold, overflow: "hidden", backgroundColor: "#1A1208", alignItems: "center", justifyContent: "center" }}>
                <Portre age={p.age} gender={p.gender} size={120} ring={false} />
              </View>
              <View style={{ position: "absolute", top: -4, left: -4, width: 34, height: 34, borderRadius: 6, borderWidth: 1.5, borderColor: C.gold, overflow: "hidden", backgroundColor: "#1A1208" }}>
                <Image source={armaImage(p.surname || p.name)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              </View>
            </View>

            {/* Bilgi */}
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ fontFamily: F.display, fontSize: 7.5, letterSpacing: 2, color: C.parchmentMuted }}>{t("dyn.houseOf").replace("%s", (p.surname || p.name)).toUpperCase()}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 19, color: C.goldBright, letterSpacing: 0.5 }}>{p.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <GameIcon name="ilerle" size={11} color={C.gold} />
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentDim }}>{hasCareer ? careerTitleL(p.profession, p.career_xp, lang) : t("misc.jobless")}</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3, marginTop: 1 }}>
                <Badge text={`${p.age} ${t("misc.age").toUpperCase()}`} />
                <Badge text={(p.gender === "kadın" ? t("misc.female") : t("misc.male")).toUpperCase()} />
                <Badge name="sehir" text={placeName(p.location_name, lang).toUpperCase()} />
                <Badge name="star" text={`${p.generation}. ${t("misc.generation").toUpperCase()}`} />
                {inJail(p) ? <Badge name="prisoner" text={`${t("jail.title")} · ${p.jail!.left} ${t("char.mo").toUpperCase()}`} /> : null}
                {p.childhood ? <Badge name="baby" text={t("childhood." + p.childhood).toUpperCase()} /> : null}
              </View>
              {p.childhood ? <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 4 }} numberOfLines={2}>{t("childhood." + p.childhood + ".d")}</Text> : null}
              {p.child_friend ? (() => {
                const cf = p.child_friend; const nm = localFirstName(cf.seed, cf.gender, lang);
                const rel = state.relationships[cf.id];
                const status = p.age < 13 ? t("child.friend.label") : (rel != null && rel > 0 ? t("child.friend.lifelong") : (rel != null && rel < 0 ? t("child.friend.rivalStatus") : t("child.friend.parted")));
                return (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 }}>
                    <GameIcon name="iliskiler" size={11} color="#C0556B" />
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{t("child.friend.of")}: <Text style={{ color: C.parchment }}>{nm}</Text> · {status}</Text>
                  </View>
                );
              })() : null}
              {p.married && p.spouse_seed != null ? (() => {
                const sg = p.gender === "kadın" ? "erkek" : "kadın";
                const nm = localFirstName(p.spouse_seed, sg, lang);
                const bond = p.spouse_bond ?? 40;
                const spent = p.spouse_time_turn === state.turn;
                return (
                  <View style={{ marginTop: 5 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <GameIcon name="ring" size={11} color={C.gold} />
                      <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{t("misc.spouse")}: <Text style={{ color: C.parchment }}>{nm}</Text> · {t("mizac." + (p.spouse_mizac || spouseMizac(p.spouse_seed)))} · <Text style={{ color: bond >= 60 ? C.sage : bond >= 30 ? C.parchment : C.ember }}>{t("char.bond")} {bond}</Text></Text>
                    </View>
                    <Pressable disabled={spent} onPress={() => { hap("tap"); apply((s) => spendWithSpouse(s)); }} style={{ alignSelf: "flex-start", marginTop: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", opacity: spent ? 0.4 : 1 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold, letterSpacing: 0.5 }}>{t("char.spendTime")}</Text>
                    </Pressable>
                  </View>
                );
              })() : null}
              {p.children.length > 0 ? (() => {
                const tended = p.child_time_turn === state.turn;
                return (
                  <Pressable disabled={tended} onPress={() => { hap("tap"); apply((s) => tendChild(s)); }} style={{ alignSelf: "flex-start", marginTop: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", opacity: tended ? 0.4 : 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold, letterSpacing: 0.5 }}>{t("char.tendChildren")}</Text>
                  </Pressable>
                );
              })() : null}
              {p.horse && p.horse_name ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 }}>
                  <GameIcon name="compass" size={11} color={C.sage} />
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{t("misc.horse")}: <Text style={{ color: C.parchment }}>{p.horse_name}</Text></Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Yatay stat barı */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <StatTop icon="saglik" value={Math.round(p.health)} max={100} color={C.blood} />
            <StatTop icon="tokluk" value={Math.round(p.hunger)} max={100} color={C.sage} />
            <StatTop icon="akce" value={Math.round(p.money)} color={C.gold} showBar={false} flex={0.9} />
            <StatTop icon="orgutler" value={crownLevel} color={C.ink} showBar={false} flex={0.65} />
          </View>
          {/* Hekim ziyareti: sağlık pasif sayı değil — kronik hastalıkta tedavi burada */}
          {p.age >= 13 && !p.dead && (() => {
            const seen = p.healer_turn === state.turn;
            const cost = healerCost(state);
            const dis = seen || p.money < cost;
            return (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                <Pressable disabled={dis} onPress={() => { hap("tap"); apply((s) => visitHealer(s)); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: dis ? C.border : "rgba(127,166,106,0.5)", backgroundColor: dis ? C.bg : "rgba(127,166,106,0.1)", opacity: dis ? 0.45 : 1 }}>
                  <GameIcon name="healing" size={12} color={dis ? C.parchmentMuted : C.sage} />
                  <Text style={{ fontFamily: F.display, fontSize: 10, color: dis ? C.parchmentMuted : C.sage, letterSpacing: 0.5 }}>{seen ? t("char.healerDone") : `${t("char.healer")} · ${cost}⚜`}</Text>
                </Pressable>
                {!!p.chronic && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: "rgba(160,48,42,0.45)", backgroundColor: "rgba(160,48,42,0.08)" }}>
                    <GameIcon name="skull" size={11} color={C.blood} />
                    <Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.blood, letterSpacing: 0.5 }}>{t("chr." + p.chronic.k)}</Text>
                  </View>
                )}
              </View>
            );
          })()}

          {/* Kariyer XP */}
          {hasCareer && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: C.gold, backgroundColor: "#2A1808", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{careerLevel}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 1.5, color: C.parchmentMuted }}>{t("char.careerXp")}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold }}>{xpInLevel} / 30</Text>
                </View>
                <ProgressBar value={xpInLevel} max={30} color={C.gold} h={5} />
              </View>
            </View>
          )}
        </View>

        {/* ── Sekme navigasyonu ── */}
        <View style={{ flexDirection: "row", backgroundColor: C.card, borderWidth: 1, borderColor: GB, borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
          {([["ozellikler", "karakter", t("char.tabAttrs")], ["dunya", "iliskiler", t("char.tabWorld")], ["seruven", "menu", t("char.tabAdventure")]] as const).map(([k, ic, lbl]) => {
            const active = tab === k;
            return (
              <Pressable key={k} onPress={() => setTab(k as any)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 11, backgroundColor: active ? GBG : "transparent", borderBottomWidth: 2, borderBottomColor: active ? C.gold : "transparent" }}>
                <GameIcon name={ic} size={12} color={active ? C.gold : C.parchmentMuted} />
                <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.8, color: active ? C.gold : C.parchmentMuted }}>{lbl}</Text>
              </Pressable>
            );
          })}
        </View>

        <Animated.View key={tab} entering={FadeIn.duration(200)}>
        {/* ── ÖZELLİKLER ── */}
        {tab === "ozellikler" && (
          <>
            <Card>
              <SectionHead title={t("char.attrs")} right={canAdd ? <Text style={{ fontFamily: F.display, fontSize: 9, color: C.gold, letterSpacing: 1 }}>{p.stat_points} {t("char.points").toUpperCase()}</Text> : undefined} />
              <View style={{ flexDirection: "row", gap: 7 }}>
                <StatCard icon="guc" name={t("st.strength").toUpperCase()} value={p.stats.strength} tier={t(statTierKey(p.stats.strength))} color={C.ember} canAdd={canAdd && p.stats.strength < 10} onAdd={() => add("strength")} xp={statXpOf(p, "strength")} xpNext={p.stats.strength < 10 ? statXpForNext(p.stats.strength) : 0} />
                <StatCard icon="zeka" name={t("st.intelligence").toUpperCase()} value={p.stats.intelligence} tier={t(statTierKey(p.stats.intelligence))} color={C.azure} canAdd={canAdd && p.stats.intelligence < 10} onAdd={() => add("intelligence")} xp={statXpOf(p, "intelligence")} xpNext={p.stats.intelligence < 10 ? statXpForNext(p.stats.intelligence) : 0} />
                <StatCard icon="karizma" name={t("st.charisma").toUpperCase()} value={p.stats.charisma} tier={t(statTierKey(p.stats.charisma))} color={C.ember} canAdd={canAdd && p.stats.charisma < 10} onAdd={() => add("charisma")} xp={statXpOf(p, "charisma")} xpNext={p.stats.charisma < 10 ? statXpForNext(p.stats.charisma) : 0} />
                <StatCard icon="dayaniklilik" name={t("st.stamina").toUpperCase()} value={p.stats.stamina} tier={t(statTierKey(p.stats.stamina))} color={C.sage} canAdd={canAdd && p.stats.stamina < 10} onAdd={() => add("stamina")} xp={statXpOf(p, "stamina")} xpNext={p.stats.stamina < 10 ? statXpForNext(p.stats.stamina) : 0} />
              </View>
            </Card>

            <Card>
              <SectionHead title={t("char.status")} />
              <View style={{ flexDirection: "row", gap: 7 }}>
                <SocialCard icon="karakter" name={t("soc.reputation.l").toUpperCase()} value={Math.round(p.reputation)} color={C.sage} />
                <SocialCard icon="zafer" name={t("soc.honor.l").toUpperCase()} value={Math.round(p.honor)} color={C.azure} />
                <SocialCard icon="suc" name={t("soc.fear.l").toUpperCase()} value={Math.round(p.fear)} color={C.blood} />
                <SocialCard icon="orgutler" name={t("soc.fame.l").toUpperCase()} value={Math.round(p.fame)} color={C.ink} />
              </View>
              {/* Bulunduğun yerde halkın algısı (tanınma ile kapılı) */}
              {(() => {
                const pp = publicPerception(state);
                return (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: C.border }}>
                    <GameIcon name={atHome(p) ? "sehir" : "firsatlar"} size={15} color={C.gold} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchment }}>{t("percept." + pp.key)}</Text>
                      <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: C.parchmentMuted, marginTop: 2 }}>
                        {(atHome(p) ? t("soc.home") : t("soc.away"))} · {t("soc.recog")}: %{Math.round(pp.recog * 100)}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </Card>

            <Pressable onPress={() => router.push("/oyun/beceriler")}>
              <Card>
                <SectionHead title={t("char.skills")} right={<Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.gold }}>{pendingPerkCount(p) > 0 ? `${pendingPerkCount(p)} ${t("char.perksAvail")} ›` : "›"}</Text>} />
                {([["combat", "guc"], ["trade", "akce"], ["crafting", "meslek"], ["social", "karizma"]] as const).map(([sk, ic]) => (
                  <View key={sk} style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 7 }}>
                    <GameIcon name={ic} size={13} color={C.goldDim} />
                    <Text style={{ width: 96, fontFamily: F.display, fontSize: 10, letterSpacing: 0.5, color: C.parchmentMuted, textTransform: "uppercase" }}>{t("skill." + sk)}</Text>
                    <View style={{ flex: 1 }}><ProgressBar value={p.skills[sk]} max={10} color={C.gold} h={4} /></View>
                    <Text style={{ width: 22, textAlign: "right", fontFamily: F.display, fontSize: 11, color: C.parchment }}>{p.skills[sk]}</Text>
                  </View>
                ))}
              </Card>
            </Pressable>
          </>
        )}

        {/* ── DÜNYA ── */}
        {tab === "dunya" && (
          <>
            <Card>
              <SectionHead title={t("char.guild")} />
              <Text style={{ fontFamily: F.serif, fontSize: 14, color: p.faction ? C.gold : C.parchmentMuted }}>{p.faction ? t("fac." + p.faction + ".n") : t("char.none")}</Text>
            </Card>
            <Card>
              <SectionHead title={t("char.family")} />
              {/* Ebeveynler + eş — portreli karolar */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <RelativeTile role={t("char.mother")} has={true}
                  name={p.mother_seed != null ? localFirstName(p.mother_seed, "kadın", lang) : (p.mother || t("char.none"))}
                  age={p.age + 26} gender="kadın" seed={p.mother_seed ?? `${p.name}-m`} />
                <RelativeTile role={t("char.father")} has={true}
                  name={p.father_seed != null ? localFirstName(p.father_seed, "erkek", lang) : (p.father || t("char.none"))}
                  age={p.age + 28} gender="erkek" seed={p.father_seed ?? `${p.name}-f`} />
                <RelativeTile role={t("char.spouse")} has={p.spouse_seed != null || !!p.spouse_name}
                  name={p.spouse_seed != null ? localFirstName(p.spouse_seed, spouseGender, lang) : (p.spouse_name || t("char.none"))}
                  age={Math.max(16, p.age - 1)} gender={spouseGender} seed={p.spouse_seed ?? `${p.name}-s`} />
              </View>
              {/* Ebeveyn ziyareti: en az biri hayattaysa (turda tek) */}
              {!(p.mother_dead && p.father_dead) && (() => { const visited = p.parent_visit_turn === state.turn; return (
                <Pressable disabled={visited} onPress={() => { hap("tap"); apply((s) => visitParents(s)); }} style={{ alignSelf: "flex-start", marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", opacity: visited ? 0.4 : 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold, letterSpacing: 0.5 }}>{t("char.visitParents")}{p.parent_bond != null ? ` · ${t("char.bond")} ${p.parent_bond}` : ""}</Text>
                </Pressable>
              ); })()}
              {/* Çocuklar */}
              <View style={{ marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: C.border }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 7 }}>
                  <GameIcon name="dogum" size={12} color={C.goldDim} />
                  <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{t("char.children")}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.gold }}>{p.children.length}</Text>
                </View>
                {p.children.length === 0 ? (
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted }}>{t("char.none")}</Text>
                ) : (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {p.children.map((c, i) => (
                      <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 9 }}>
                        <GameIcon name="dogum" size={11} color={C.goldDim} />
                        <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{c}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <Pressable onPress={() => { hap("tap"); router.push("/oyun/hanedan"); }} style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: C.border }}>
                <GameIcon name="hanedan" size={12} color={C.gold} />
                <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 0.5, color: C.gold }}>{t("scr.hanedan")} ›</Text>
              </Pressable>
            </Card>
            {p.injuries && p.injuries.length > 0 && (
              <Card>
                <SectionHead title={t("char.injuries")} />
                {p.injuries.map((inj, i) => (
                  <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
                    <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.blood }}>{inj.label}</Text>
                    <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted }}>{inj.permanent ? t("char.permanent") : `${inj.weeks_left} ${t("char.mo")}`}</Text>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        {/* ── SERÜVEN (donanım + çanta) ── */}
        {tab === "seruven" && (
          <>
            <Card>
              <SectionHead title={t("char.gear")} right={
                <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="crossed-swords" size={11} color={C.ember} /><Text style={{ fontFamily: F.display, fontSize: 11, color: C.ember }}>{combatPower(p)}</Text></View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="shield" size={11} color={C.azure} /><Text style={{ fontFamily: F.display, fontSize: 11, color: C.azure }}>{armorDefense(p)}</Text></View>
                </View>
              } />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                {GEAR_META.map((g) => {
                  const id = p.equipped?.[g.slot];
                  const it = id ? ITEMS[id] : null;
                  const raw = it ? (g.field === "power" ? (it.power || 0) : (it.defense || 0)) : 0;
                  const bonus = id ? Math.round(raw * equippedQualityMult(p, g.slot)) : undefined;
                  // Silah → arketip etiketi; kalkan → çift elli silah varken kilitli.
                  const tag = g.slot === "silah" && it?.wclass ? t("wc." + it.wclass) : undefined;
                  const locked = g.slot === "kalkan" && weaponTwoHanded;
                  return (
                    <GearTile key={g.slot} icon={g.icon} label={t(g.labelKey)} item={id ?? undefined} quality={p.equipped_q?.[g.slot] ?? undefined}
                      bonus={bonus} statColor={g.field === "power" ? C.ember : C.azure} tag={tag} locked={locked} lockedText={t("char.twoHandTag")}
                      onRemove={id ? () => apply((s) => unequipItem(s, g.slot)) : undefined} t={t} />
                  );
                })}
              </View>
              {weaponClassId ? (
                <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 9, lineHeight: 16 }}>{t("wc." + weaponClassId + ".d")}</Text>
              ) : null}
            </Card>

            {/* Kıyafet — sosyal görünüm (karizma + itibar) */}
            <Card>
              {(() => {
                const at = attireScore(p);
                const cid = p.equipped?.kiyafet;
                const cit = cid ? ITEMS[cid] : null;
                const cq = p.equipped_q?.kiyafet;
                return (
                  <>
                    <SectionHead title={t("char.attire")} right={
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="karizma" size={11} color={C.ember} /><Text style={{ fontFamily: F.display, fontSize: 11, color: C.ember }}>+{at.charisma}</Text></View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="orgutler" size={11} color={C.gold} /><Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>+{at.prestige}</Text></View>
                      </View>
                    } />
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                      <View style={{ width: 46, height: 46, borderRadius: 11, backgroundColor: cid ? GBG : "transparent", borderWidth: 1, borderColor: cid ? GB : C.border, alignItems: "center", justifyContent: "center" }}>
                        <GameIcon name="wool" size={23} color={cid ? C.gold : C.parchmentMuted} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 14, color: cid ? C.parchment : C.parchmentMuted }}>{cid ? t("it." + cid) : t("char.attireNone")}</Text>
                        <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 1 }}>{cid ? (cq && cq !== "siradan" ? QUALITY_LABEL[cq as keyof typeof QUALITY_LABEL] + " · " : "") + t("char.attireHint") : t("char.attireHint")}</Text>
                      </View>
                      {cid ? (
                        <Pressable onPress={() => apply((s) => unequipItem(s, "kiyafet"))} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: "rgba(200,64,64,0.4)" }}>
                          <Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.blood }}>{t("misc.remove")}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    {/* Sosyal varlık dökümü: karizma + kıyafet − cenk yükü */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: C.border }}>
                      <GameIcon name="karizma" size={13} color={C.gold} />
                      <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 0.5, color: C.parchmentMuted, textTransform: "uppercase" }}>{t("char.socialPresence")}</Text>
                      <View style={{ flex: 1 }} />
                      <Text style={{ fontFamily: F.display, fontSize: 14, color: C.goldBright }}>{socialPresence(p)}</Text>
                    </View>
                    {martialLoad(p) > 0 ? (
                      <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.ember, marginTop: 5, lineHeight: 16 }}>{t("char.martialWarn")}</Text>
                    ) : null}
                  </>
                );
              })()}
            </Card>
            <Card>
              <SectionHead title={t("char.bag")} right={inv.length ? <Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.parchmentMuted }}>{inv.length}</Text> : undefined} />
              {inv.length === 0 ? (
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted }}>{t("char.bagEmpty")}</Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {inv.map((k) => {
                    const it = ITEMS[k]; const usable = it && (it.feed || it.heal); const equipable = it && ["silah", "kalkan", "zirh", "baslik", "eldiven", "ayakkabi", "kiyafet"].includes(it.kind);
                    const useHelps = !!it && ((!!it.feed && p.hunger < 100) || (!!it.heal && p.health < 100)); // doluyken kullan butonu pasif
                    return (
                      <View key={k} style={{ width: "48%", backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, gap: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                          <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: GBG, borderWidth: 1, borderColor: GB, alignItems: "center", justifyContent: "center" }}>
                            <GameIcon name={itemIcon(it)} size={17} color={C.gold} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchment }}>{t("it." + k)}</Text>
                            <Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.parchmentMuted }}>×{p.inventory[k]}</Text>
                          </View>
                        </View>
                        {equipable && (
                          <Pressable onPress={() => { hap("tap"); apply((s) => equipItem(s, k)); }} style={{ alignItems: "center", paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: GBG }}>
                            <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>{t("misc.equip")}</Text>
                          </Pressable>
                        )}
                        {usable && (
                          <Pressable disabled={!useHelps} onPress={() => { hap("tap"); apply((s) => useItem(s, k)); }} style={{ alignItems: "center", paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: GBG, opacity: useHelps ? 1 : 0.45 }}>
                            <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>{t("misc.use")}</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>
          </>
        )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
