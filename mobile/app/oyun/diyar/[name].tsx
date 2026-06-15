import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGame } from "../../../lib/store";
import { travelBy, placeKind, TRAVEL_ROUTES, beylikOf, GOV_TITLE, isGovernor, canRunForGovernor, runForGovernor, govReqRep } from "../../../lib/game";
import { cityInfo, marketGoods, locSeed, localSpecialtyName } from "../../../lib/world";
import { useI18n, applyParams } from "../../../lib/i18n";
import { placeName } from "../../../lib/locale-data";
import { C, F } from "../../../lib/theme";
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
        <Stat label={t("diyar.livelihood")} value={localSpecialtyName(locSeed(name), lang)} />
      </View>

      {/* ── Şehir Yönetimi (Vercel city_governance.py portu) ── */}
      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 8 }}>{t("gov.title").toUpperCase()}</Text>
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{GOV_TITLE[kind] || t("diyar.governor")}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 14, color: isGovernor(state.player, name) ? C.gold : C.parchment }}>{isGovernor(state.player, name) ? `★ ${state.player.name}` : info.governor}</Text>
        </View>
        {isGovernor(state.player, name) ? (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.sage, marginTop: 10 }}>★ {t("gov.youGovern")} · +{Math.max(1, Math.round(info.prosperity / 4))} {t("gov.taxShare")}</Text>
        ) : here ? (
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
            <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{g.icon} {t("it."+g.id)}</Text>
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
          {TRAVEL_ROUTES.map((r) => (
            <Pressable key={r.id} onPress={() => { apply((s) => travelBy(s, name, r.id)); router.back(); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: C.card, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{t("route." + r.id + ".l")}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{t("route." + r.id + ".d")}</Text>
              </View>
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{t("diyar.go")}</Text>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}
