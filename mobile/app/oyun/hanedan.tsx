import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { playerHousePower, houseAttitude } from "../../lib/game";
import { generateDynasties } from "../../lib/world";
import { professionNameL } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader } from "../../lib/ui";

function attKey(a: number) { return a >= 40 ? "dost" : a >= 10 ? "dostane" : a > -10 ? "tarafsiz" : a > -40 ? "soguk" : "hasim"; }
function attTone(a: number) { return a >= 10 ? C.sage : a > -10 ? C.parchmentMuted : a > -40 ? C.ember : C.blood; }

export default function Hanedan() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const past = state.dynasty || [];
  const profL = (id: string) => id === "işsiz" ? t("dyn.noProfession") : professionNameL(id, lang);
  const houseName = (p.surname ? t("dyn.houseOf").replace("%s", p.surname) : t("dyn.houseOf").replace("%s", p.name));
  const power = playerHousePower(p);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, letterSpacing: 1 }}>{t("scr.hanedan")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={`${p.generation}. ${t("misc.generation")}`} icon="🛡" title={houseName} sub={t("dyn.rivalsHint")} />

        {/* ── SENİN HANEDANIN ── */}
        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginBottom: 9 }}>{t("dyn.yourHouse")}</Text>
        <View style={{ backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
          {/* Hane reisi (oyuncu) */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: C.gold }}>{p.name}</Text>
            <View style={{ backgroundColor: "rgba(201,168,76,0.16)", borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 }}>
              <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: C.gold }}>{t("dyn.headWord").toUpperCase()}</Text>
            </View>
          </View>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchment, marginTop: 4 }}>
            {p.dead ? t("dyn.died") : `${t("dyn.living")} · ${p.age} ${t("misc.age")} · ${profL(p.profession)}`}
          </Text>
          {/* Hane gücü + şöhret/itibar */}
          <View style={{ flexDirection: "row", gap: 14, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border }}>
            <View><Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: C.parchmentMuted }}>{t("dyn.power").toUpperCase()}</Text><Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, marginTop: 1 }}>{power}</Text></View>
            <View><Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: C.parchmentMuted }}>{t("soc.fame.l").toUpperCase()}</Text><Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, marginTop: 1 }}>{Math.round(p.fame)}</Text></View>
            <View><Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: C.parchmentMuted }}>{t("soc.reputation.l").toUpperCase()}</Text><Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, marginTop: 1 }}>{Math.round(p.reputation)}</Text></View>
          </View>
        </View>

        {/* Ocağın: eş + evlatlar */}
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.goldDim, marginBottom: 8 }}>{t("dyn.family").toUpperCase()}</Text>
          {/* Eş */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Text style={{ fontSize: 15 }}>💍</Text>
            <Text style={{ width: 64, fontFamily: F.display, fontSize: 10.5, color: C.parchmentMuted }}>{t("dyn.spouse")}</Text>
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13.5, color: p.married ? C.parchment : C.parchmentMuted, fontStyle: p.married ? "normal" : "italic" }}>{p.married && p.spouse_name ? p.spouse_name : t("dyn.unwed")}</Text>
          </View>
          {/* Evlatlar */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Text style={{ fontSize: 15 }}>👶</Text>
            <Text style={{ width: 64, fontFamily: F.display, fontSize: 10.5, color: C.parchmentMuted, paddingTop: 3 }}>{t("dyn.children")}</Text>
            <View style={{ flex: 1 }}>
              {p.children.length === 0 ? (
                <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted }}>{t("dyn.noKids")}</Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {p.children.map((c) => (
                    <View key={c} style={{ backgroundColor: "rgba(201,168,76,0.10)", borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", borderRadius: 16, paddingVertical: 3, paddingHorizontal: 10 }}>
                      <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchment }}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
          <Pressable onPress={() => { hap("tap"); router.push("/oyun/nesil"); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: C.border }}>
            <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 0.5, color: C.gold }}>{t("dyn.manageHeirs")}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>›</Text>
          </Pressable>
        </View>

        {/* Atalar */}
        {past.length > 0 ? (
          <>
            <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginTop: 8, marginBottom: 9 }}>{t("dyn.ancestors")}</Text>
            {[...past].reverse().map((a) => (
              <View key={a.generation} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftColor: C.gold, borderLeftWidth: 2.5, borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{a.name}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 10, color: C.goldDim }}>{a.generation}. {t("misc.generation")}</Text>
                </View>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>
                  {profL(a.profession)} · {t("dyn.passedAt").replace("%n", String(a.diedAge))} · {t("dyn.fameWord")} {a.fame}
                </Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.gold, marginTop: 4 }}>{a.note}</Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, textAlign: "center", marginVertical: 12 }}>{t("dyn.noAncestors")}</Text>
        )}

        {/* ── DİYARIN HANEDANLARI (rakipler) ── */}
        {(() => {
          const mine = { id: "mine", name: houseName, power, mine: true, attitude: 0 };
          const rivals = generateDynasties(state.seed).map((h) => ({ id: h.id, name: h.name, power: h.power, mine: false, attitude: houseAttitude(p, h) }));
          const all = [...rivals, mine].sort((a, b) => b.power - a.power);
          return (
            <>
              <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginTop: 18, marginBottom: 9 }}>{t("dyn.houses")}</Text>
              {all.map((h, i) => (
                <View key={h.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: h.mine ? "rgba(201,168,76,0.1)" : C.card, borderWidth: 1, borderColor: h.mine ? "rgba(201,168,76,0.45)" : C.border, borderRadius: 9, padding: 11, marginBottom: 7 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldDim, width: 24 }}>{i + 1}.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: h.mine ? C.gold : C.parchment }}>{h.name}{h.mine ? t("dyn.you") : ""}</Text>
                    <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{t("dyn.power")} {h.power}</Text>
                  </View>
                  {!h.mine && (
                    <View style={{ backgroundColor: attTone(h.attitude) + "1A", borderWidth: 1, borderColor: attTone(h.attitude) + "55", borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.3, color: attTone(h.attitude) }}>{t("dyn.att." + attKey(h.attitude))}</Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          );
        })()}
      </ScrollView>
    </View>
  );
}
