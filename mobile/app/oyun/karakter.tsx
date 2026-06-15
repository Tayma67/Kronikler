import { useState } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { useItem, allocateStat, Stats, pendingPerkCount, equipItem, unequipItem, careerTier, professionById, recognition, publicPerception, atHome, combatPower, equippedQualityMult, QUALITY_LABEL, statXpOf, statXpForNext } from "../../lib/game";
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

// Yatay istatistik (sağlık/enerji/altın/taç) — ikon + değer + bar.
function StatTop({ emoji, value, max, color, showBar = true, flex = 1 }: { emoji: string; value: number; max?: number; color: string; showBar?: boolean; flex?: number }) {
  return (
    <View style={{ flex }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3, marginBottom: 3 }}>
        <Text style={{ fontSize: 12 }}>{emoji}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 14, color }}>{value}</Text>
        {max ? <Text style={{ fontSize: 9, color: C.parchmentMuted }}>/ {max}</Text> : null}
      </View>
      {showBar && max ? <ProgressBar value={value} max={max} color={color} h={4} /> : <View style={{ height: 4 }} />}
    </View>
  );
}

// Temel özellik kartı — emoji, ad, değer, bar.
function StatCard({ emoji, name, value, color, canAdd, onAdd, xp, xpNext }: { emoji: string; name: string; value: number; color: string; canAdd: boolean; onAdd: () => void; xp?: number; xpNext?: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingVertical: 10, paddingHorizontal: 6, alignItems: "center", gap: 4 }}>
      <Text style={{ fontSize: 16 }}>{emoji}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 7.5, letterSpacing: 0.5, color: C.parchmentMuted }} numberOfLines={1}>{name}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 18, color: C.goldBright }}>{value}</Text>
      <View style={{ width: "100%" }}><ProgressBar value={value} max={20} color={color} h={3} /></View>
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
    <View style={{ flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingVertical: 11, paddingHorizontal: 4, alignItems: "center", gap: 3 }}>
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 7, letterSpacing: 0.5, color: C.parchmentMuted }} numberOfLines={1}>{name}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 16, color }}>{value}</Text>
    </View>
  );
}

function Badge({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: GBG, borderWidth: 1, borderColor: GB, borderRadius: 4, paddingVertical: 2, paddingHorizontal: 5 }}>
      <Text style={{ fontSize: 9 }}>{icon}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 0.5, color: C.gold }}>{text}</Text>
    </View>
  );
}

const STAT_ICON: Record<string, string> = { strength: "guc", intelligence: "zeka", charisma: "karizma", stamina: "dayaniklilik" };

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
                <Badge icon="🛡" text={`${p.age} ${t("misc.age").toUpperCase()}`} />
                <Badge icon={p.gender === "kadın" ? "♀" : "♂"} text={(p.gender === "kadın" ? t("misc.female") : t("misc.male")).toUpperCase()} />
                <Badge icon="📍" text={placeName(p.location_name, lang).toUpperCase()} />
                <Badge icon="⭐" text={`${p.generation}. ${t("misc.generation").toUpperCase()}`} />
              </View>
            </View>
          </View>

          {/* Yatay stat barı */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <StatTop emoji="❤️" value={Math.round(p.health)} max={100} color={C.blood} />
            <StatTop emoji="🍎" value={Math.round(p.hunger)} max={100} color={C.sage} />
            <StatTop emoji="⚜️" value={Math.round(p.money)} color={C.gold} showBar={false} flex={0.9} />
            <StatTop emoji="👑" value={crownLevel} color={C.ink} showBar={false} flex={0.65} />
          </View>

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
          {([["ozellikler", "👤", t("char.tabAttrs")], ["dunya", "👥", t("char.tabWorld")], ["seruven", "🎒", t("char.tabAdventure")]] as const).map(([k, e, lbl]) => {
            const active = tab === k;
            return (
              <Pressable key={k} onPress={() => setTab(k as any)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 11, backgroundColor: active ? GBG : "transparent", borderBottomWidth: 2, borderBottomColor: active ? C.gold : "transparent" }}>
                <Text style={{ fontSize: 11 }}>{e}</Text>
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
                <StatCard emoji="💪" name={t("st.strength").toUpperCase()} value={p.stats.strength} color={C.ember} canAdd={canAdd} onAdd={() => add("strength")} xp={statXpOf(p, "strength")} xpNext={p.stats.strength < 10 ? statXpForNext(p.stats.strength) : 0} />
                <StatCard emoji="📚" name={t("st.intelligence").toUpperCase()} value={p.stats.intelligence} color={C.azure} canAdd={canAdd} onAdd={() => add("intelligence")} xp={statXpOf(p, "intelligence")} xpNext={p.stats.intelligence < 10 ? statXpForNext(p.stats.intelligence) : 0} />
                <StatCard emoji="🎭" name={t("st.charisma").toUpperCase()} value={p.stats.charisma} color={C.ember} canAdd={canAdd} onAdd={() => add("charisma")} xp={statXpOf(p, "charisma")} xpNext={p.stats.charisma < 10 ? statXpForNext(p.stats.charisma) : 0} />
                <StatCard emoji="🛡️" name={t("st.stamina").toUpperCase()} value={p.stats.stamina} color={C.sage} canAdd={canAdd} onAdd={() => add("stamina")} xp={statXpOf(p, "stamina")} xpNext={p.stats.stamina < 10 ? statXpForNext(p.stats.stamina) : 0} />
              </View>
            </Card>

            <Card>
              <SectionHead title={t("char.status")} />
              <View style={{ flexDirection: "row", gap: 7 }}>
                <SocialCard icon="🛡" name={t("soc.reputation.l").toUpperCase()} value={Math.round(p.reputation)} color={C.sage} />
                <SocialCard icon="⚜️" name={t("soc.honor.l").toUpperCase()} value={Math.round(p.honor)} color={C.azure} />
                <SocialCard icon="⛑️" name={t("soc.fear.l").toUpperCase()} value={Math.round(p.fear)} color={C.blood} />
                <SocialCard icon="👑" name={t("soc.fame.l").toUpperCase()} value={Math.round(p.fame)} color={C.ink} />
              </View>
              {/* Bulunduğun yerde halkın algısı (tanınma ile kapılı) */}
              {(() => {
                const pp = publicPerception(state);
                return (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: C.border }}>
                    <Text style={{ fontSize: 14 }}>{atHome(p) ? "🏠" : "🧭"}</Text>
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
              {/* Ebeveynler */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>👵 {t("char.mother")}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{p.mother_seed != null ? localFirstName(p.mother_seed, "kadın", lang) : (p.mother || t("char.none"))}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>👴 {t("char.father")}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{p.father_seed != null ? localFirstName(p.father_seed, "erkek", lang) : (p.father || t("char.none"))}</Text>
              </View>
              {/* Eş */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>💍 {t("char.spouse")}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 14, color: p.spouse_name ? C.parchment : C.parchmentMuted }}>{p.spouse_seed != null ? localFirstName(p.spouse_seed, p.gender === "erkek" ? "kadın" : "erkek", lang) : (p.spouse_name || t("char.none"))}</Text>
              </View>
              {/* Çocuklar */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>👶 {t("char.children")}</Text>
                <Text style={{ flex: 1, textAlign: "right", fontFamily: F.serif, fontSize: 13, color: p.children.length ? C.parchment : C.parchmentMuted }}>{p.children.length ? p.children.join(", ") : t("char.none")}</Text>
              </View>
              <Pressable onPress={() => { hap("tap"); router.push("/oyun/hanedan"); }} style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border }}>
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
              <SectionHead title={t("char.gear")} right={<View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><GameIcon name="crossed-swords" size={12} color={C.ember} /><Text style={{ fontFamily: F.display, fontSize: 11, color: C.ember }}>{t("char.combatReady")}: {combatPower(p)}</Text></View>} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{t("char.weapon")}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{p.equipped?.silah ? `${t("it." + p.equipped.silah)}${p.equipped_q?.silah && p.equipped_q.silah !== "siradan" ? ` ·${QUALITY_LABEL[p.equipped_q.silah]}` : ""} (+${Math.round((ITEMS[p.equipped.silah]?.power || 0) * equippedQualityMult(p, "silah"))})` : "—"}</Text>
                  {p.equipped?.silah && <Pressable onPress={() => apply((s) => unequipItem(s, "silah"))}><Text style={{ color: C.blood, fontFamily: F.display, fontSize: 10 }}>{t("misc.remove")}</Text></Pressable>}
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{t("char.armor")}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{p.equipped?.zirh ? `${t("it." + p.equipped.zirh)}${p.equipped_q?.zirh && p.equipped_q.zirh !== "siradan" ? ` ·${QUALITY_LABEL[p.equipped_q.zirh]}` : ""} (+${Math.round((ITEMS[p.equipped.zirh]?.defense || 0) * equippedQualityMult(p, "zirh"))})` : "—"}</Text>
                  {p.equipped?.zirh && <Pressable onPress={() => apply((s) => unequipItem(s, "zirh"))}><Text style={{ color: C.blood, fontFamily: F.display, fontSize: 10 }}>{t("misc.remove")}</Text></Pressable>}
                </View>
              </View>
            </Card>
            <Card>
              <SectionHead title={t("char.bag")} />
              {inv.length === 0 ? (
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted }}>{t("char.bagEmpty")}</Text>
              ) : inv.map((k) => {
                const it = ITEMS[k]; const usable = it && (it.feed || it.heal); const equipable = it && (it.kind === "silah" || it.kind === "zirh");
                return (
                  <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
                    <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: GBG, borderWidth: 1, borderColor: GB, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 17 }}>{it?.icon || "📦"}</Text>
                    </View>
                    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{t("it." + k)} ×{p.inventory[k]}</Text>
                    {equipable && (
                      <Pressable onPress={() => { hap("tap"); apply((s) => equipItem(s, k)); }} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: GBG }}>
                        <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>{t("misc.equip")}</Text>
                      </Pressable>
                    )}
                    {usable && (
                      <Pressable onPress={() => { hap("tap"); apply((s) => useItem(s, k)); }} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: GBG }}>
                        <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>{t("misc.use")}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </Card>
          </>
        )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
