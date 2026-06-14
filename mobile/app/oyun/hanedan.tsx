import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { factionById, playerHousePower, houseAttitude } from "../../lib/game";
import { generateDynasties } from "../../lib/world";
import { professionNameL } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel } from "../../lib/ui";

function attKey(a: number) { return a >= 40 ? "dost" : a >= 10 ? "dostane" : a > -10 ? "tarafsiz" : a > -40 ? "soguk" : "hasim"; }

export default function Hanedan() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const past = state.dynasty || [];
  const profL = (id: string) => id === "işsiz" ? t("dyn.noProfession") : professionNameL(id, lang);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{t("scr.hanedan")}</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 8 }}>
        {p.surname ? t("dyn.line").replace("%s", p.surname) : t("dyn.lineOwn")} · {p.generation}. {t("misc.generation")}
      </Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {/* Şimdiki nesil */}
        <View style={{ backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.gold }}>{p.name}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 11, color: C.goldDim }}>{p.generation}. {t("misc.generation")}</Text>
          </View>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchment, marginTop: 4 }}>
            {p.dead ? t("dyn.died") : `${t("dyn.living")} · ${p.age} ${t("misc.age")} · ${profL(p.profession)}`}
          </Text>
          <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>
            {t("soc.fame.l")} {Math.round(p.fame)} · {t("soc.reputation.l")} {Math.round(p.reputation)} · {p.faction ? t("fac."+p.faction+".n") : t("dyn.independent")}
          </Text>
        </View>

        {past.length === 0 ? (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, textAlign: "center", marginTop: 20 }}>
            {t("dyn.noAncestors")}
          </Text>
        ) : (
          <>
            <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginTop: 8, marginBottom: 8 }}>{t("dyn.ancestors")}</Text>
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
        )}

        {/* Diyarın hanedanları — güç sıralaması ve tavır */}
        {(() => {
          const mine = { id: "mine", name: t("dyn.houseOf").replace("%s", p.surname || p.name), power: playerHousePower(p), mine: true, attitude: 0 };
          const rivals = generateDynasties(state.seed).map((h) => ({ id: h.id, name: h.name, power: h.power, mine: false, attitude: houseAttitude(p, h) }));
          const all = [...rivals, mine].sort((a, b) => b.power - a.power);
          return (
            <>
              <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginTop: 18, marginBottom: 8 }}>{t("dyn.houses")}</Text>
              {all.map((h, i) => (
                <View key={h.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: h.mine ? "rgba(201,168,76,0.1)" : C.card, borderWidth: 1, borderColor: h.mine ? "rgba(201,168,76,0.45)" : C.border, borderRadius: 9, padding: 11, marginBottom: 7 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldDim, width: 24 }}>{i + 1}.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: h.mine ? C.gold : C.parchment }}>{h.name}{h.mine ? t("dyn.you") : ""}</Text>
                    <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{t("dyn.power")} {h.power}{!h.mine ? ` · ${t("dyn.att." + attKey(h.attitude))}` : ""}</Text>
                  </View>
                </View>
              ))}
            </>
          );
        })()}
      </ScrollView>
    </View>
  );
}
