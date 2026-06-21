import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGame } from "../../../lib/store";
import { travelBy, buyHorse, HORSE_COST, placeKind, TRAVEL_ROUTES, beylikOf, GOV_TITLE, isGovernor, canRunForGovernor, runForGovernor, govReqRep, govLegOf, shoreUpLegitimacy, GOV_SHORE_COST, govTaxOf, govHappyOf, govTreasuryOf, GOV_TAX_PRESETS, setGovTax, investTreasury, GOV_INVEST_COST, locEventsAt, LOC_EVENT_TYPES, citySpecialtyIdx } from "../../../lib/game";
import { cityInfo, marketGoods, locSeed } from "../../../lib/world";
import { useI18n, applyParams } from "../../../lib/i18n";
import { placeName } from "../../../lib/locale-data";
import { C, F } from "../../../lib/theme";
import { GameIcon } from "../../../lib/icons";

// Mal ikonu — türüne göre (emoji yerine GameIcon).
function goodIcon(g: any): string {
  switch (g?.kind) {
    case "silah": return "silah"; case "kalkan": return "kite"; case "zirh": return "shield";
    case "baslik": return "hood"; case "eldiven": return "fist"; case "ayakkabi": return "boot"; case "kiyafet": return "wool";
  }
  if (g?.heal) return "saglik"; if (g?.feed || g?.kind === "yiyecek") return "ye"; return "menu";
}
import { BackLabel } from "../../../lib/ui";

const KIND_KEY: Record<string, string> = { "şehir": "sehir", "kale": "kale", "köy": "koy" };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{value}</Text>
    </View>
  );
}

export default function DiyarDetay() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  if (!state || !name) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const kind = placeKind(name);
  const info = cityInfo(name, kind, lang);
  const here = state.player.location_name === name;
  const goods = marketGoods(locSeed(name)).slice(0, 4);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}><BackLabel /></Pressable>
      <Text style={{ fontFamily: F.display, fontSize: 24, color: C.parchment, letterSpacing: 1 }}>{placeName(name, lang)}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.gold, marginBottom: 1 }}>{t("kind." + KIND_KEY[kind])} · {info.population.toLocaleString("tr")} {t("diyar.pop")}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 0.5, color: beylikOf(name).tone, marginBottom: 4 }}>⚑ {beylikOf(name).name}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted, lineHeight: 20, marginBottom: 14 }}>{info.blurb}</Text>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, marginBottom: 16 }}>
        <Stat label={t("diyar.governor")} value={info.governor} />
        <Stat label={t("diyar.security")} value={`${info.security}/100`} />
        <Stat label={t("diyar.prosperity")} value={`${info.prosperity}/100`} />
        <Stat label={t("diyar.livelihood")} value={t("spec." + citySpecialtyIdx(state, name))} />
      </View>

      {/* Şehirde olan tipli dünya olayları (Vercel world_events.py) */}
      {locEventsAt(state, name).length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 8 }}>{t("lev.head").toUpperCase()}</Text>
          {locEventsAt(state, name).map((ty, idx) => (
            <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftColor: ty === "panayir" || ty === "bereket" ? C.sage : C.blood, borderLeftWidth: 2.5, borderRadius: 8, padding: 11, marginBottom: 6 }}>
              <GameIcon name={LOC_EVENT_TYPES[ty]?.icon || "scroll"} size={15} color={ty === "panayir" || ty === "bereket" ? C.sage : C.blood} />
              <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{t("lev." + ty + ".l")}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Şehir Yönetimi (Vercel city_governance.py portu) ── */}
      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 8 }}>{t("gov.title").toUpperCase()}</Text>
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{GOV_TITLE[kind] || t("diyar.governor")}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 14, color: isGovernor(state.player, name) ? C.gold : C.parchment }}>{isGovernor(state.player, name) ? `★ ${state.player.name}` : info.governor}</Text>
        </View>
        {isGovernor(state.player, name) ? (() => {
          const leg = govLegOf(state.player, name);
          const legCol = leg > 55 ? C.sage : leg > 30 ? C.gold : C.blood;
          return (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.sage }}>★ {t("gov.youGovern")} · +{Math.max(1, Math.round(info.prosperity / 4 * (0.4 + leg / 100 * 0.8)))} {t("gov.taxShare")}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10, marginBottom: 4 }}>
                <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.parchmentMuted }}>{t("gov.legitimacy").toUpperCase()}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 9, color: legCol }}>{leg}/100</Text>
              </View>
              <View style={{ height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <View style={{ width: `${leg}%`, height: 7, borderRadius: 4, backgroundColor: legCol }} />
              </View>
              {here && (
                <Pressable disabled={state.player.money < GOV_SHORE_COST} onPress={() => apply((s) => shoreUpLegitimacy(s, name))} style={{ marginTop: 10, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: state.player.money < GOV_SHORE_COST ? C.bg : "rgba(201,168,76,0.12)", alignItems: "center" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 0.5, color: state.player.money < GOV_SHORE_COST ? C.parchmentMuted : C.gold }}>{t("gov.shoreUp")} (−{GOV_SHORE_COST} ⚜)</Text>
                </Pressable>
              )}
              {/* Vergi oranı (tradeoff: gelir/hazine ↔ memnuniyet) */}
              <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.parchmentMuted, marginTop: 14, marginBottom: 5 }}>{t("gov.tax").toUpperCase()} · %{govTaxOf(state.player, name)}</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {GOV_TAX_PRESETS.map((tp) => {
                  const on = govTaxOf(state.player, name) === tp.rate;
                  const lbl = tp.id === "dusuk" ? t("gov.taxLow") : tp.id === "orta" ? t("gov.taxMid") : t("gov.taxHigh");
                  return (
                    <Pressable key={tp.id} disabled={!here} onPress={() => apply((s) => setGovTax(s, name, tp.rate))} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: "center", borderColor: on ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: on ? "rgba(201,168,76,0.12)" : C.card, opacity: here ? 1 : 0.6 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 10, color: on ? C.gold : C.parchment }}>{lbl}</Text>
                      <Text style={{ fontFamily: F.serif, fontSize: 9, color: C.parchmentMuted }}>%{tp.rate}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {/* Halk memnuniyeti */}
              {(() => {
                const hp = govHappyOf(state.player, name);
                const hpCol = hp > 55 ? C.sage : hp > 30 ? C.gold : C.blood;
                return (
                  <>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, marginBottom: 4 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.parchmentMuted }}>{t("gov.happy").toUpperCase()}</Text>
                      <Text style={{ fontFamily: F.display, fontSize: 9, color: hpCol }}>{hp}/100</Text>
                    </View>
                    <View style={{ height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <View style={{ width: `${hp}%`, height: 7, borderRadius: 4, backgroundColor: hpCol }} />
                    </View>
                  </>
                );
              })()}
              {/* Şehir hazinesi + projeler */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.parchmentMuted }}>{t("gov.treasury").toUpperCase()}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.gold }}>{govTreasuryOf(state.player, name)} ⚜</Text>
              </View>
              {here && (
                <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                  {(["hizmet", "asayis"] as const).map((kind) => {
                    const can = govTreasuryOf(state.player, name) >= GOV_INVEST_COST;
                    return (
                      <Pressable key={kind} disabled={!can} onPress={() => apply((s) => investTreasury(s, name, kind))} style={{ flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, alignItems: "center", borderColor: "rgba(201,168,76,0.5)", backgroundColor: can ? "rgba(201,168,76,0.12)" : C.bg, opacity: can ? 1 : 0.5 }}>
                        <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold }}>{t(kind === "hizmet" ? "gov.invService" : "gov.invSecurity")}</Text>
                        <Text style={{ fontFamily: F.serif, fontSize: 9, color: C.parchmentMuted }}>−{GOV_INVEST_COST} ⚜</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })() : here ? (
          canRunForGovernor(state, name) ? (
            <Pressable onPress={() => apply((s) => runForGovernor(s, name))} style={{ marginTop: 12, paddingVertical: 11, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.6)", backgroundColor: "rgba(201,168,76,0.14)", alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.gold }}>{t("gov.run")}</Text>
            </Pressable>
          ) : (
            <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, marginTop: 10 }}>{applyParams(t("gov.needRep"), [govReqRep(kind)])}</Text>
          )
        ) : null}
      </View>

      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 8 }}>{t("diyar.fromMarket")}</Text>
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, marginBottom: 16 }}>
        {goods.map((g) => (
          <View key={g.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}><GameIcon name={goodIcon(g)} size={13} color={C.goldDim} /><Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{t("it."+g.id)}</Text></View>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: C.goldDim }}>{t("diyar.buyAbbr")} {g.buy} · {t("diyar.sellAbbr")} {g.sell}</Text>
          </View>
        ))}
      </View>

      {here ? (
        <View style={{ paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", alignItems: "center", backgroundColor: "rgba(201,168,76,0.08)" }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold, letterSpacing: 1 }}>{t("diyar.hereNow")}</Text>
        </View>
      ) : (
        <>
          <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 8 }}>{t("diyar.setOut")}</Text>
          {TRAVEL_ROUTES.filter((r) => r.id !== "at" || state.player.horse).map((r) => (
            <Pressable key={r.id} onPress={() => { apply((s) => travelBy(s, name, r.id)); router.back(); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: r.id === "at" ? "rgba(127,166,106,0.5)" : "rgba(201,168,76,0.4)", backgroundColor: C.card, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                {r.id === "at" ? <GameIcon name="camel" size={18} color={C.sage} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{t("route." + r.id + ".l")}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{t("route." + r.id + ".d")}</Text>
                </View>
              </View>
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{t("diyar.go")}</Text>
            </Pressable>
          ))}
          {!state.player.horse && (
            <Pressable onPress={() => { if (state.player.money >= HORSE_COST) apply((s) => buyHorse(s)); }} disabled={state.player.money < HORSE_COST}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderStyle: "dashed", borderColor: state.player.money >= HORSE_COST ? "rgba(127,166,106,0.6)" : C.border, backgroundColor: "transparent", marginTop: 2 }}>
              <GameIcon name="camel" size={18} color={state.player.money >= HORSE_COST ? C.sage : C.parchmentMuted} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: state.player.money >= HORSE_COST ? C.parchment : C.parchmentMuted }}>{t("horse.buy")}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchmentMuted }}>{t("horse.buyHint")}</Text>
              </View>
              <Text style={{ fontFamily: F.display, fontSize: 12, color: state.player.money >= HORSE_COST ? C.gold : C.parchmentMuted }}>{HORSE_COST} ⚜</Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}
