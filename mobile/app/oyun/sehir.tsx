import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { placeKind, recognition, publicPerception, atHome, regionOf, defaultRealm, factionById, beylikName, citySpecialtyIdx } from "../../lib/game";
import { cityInfo } from "../../lib/world";
import { useI18n } from "../../lib/i18n";
import { placeName } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader } from "../../lib/ui";

const KIND_KEY: Record<string, string> = { "şehir": "sehir", "kale": "kale", "köy": "koy" };
const KIND_ICON: Record<string, string> = { "şehir": "🏙", "kale": "🏰", "köy": "🏡" };

// Bu diyarda erişebileceğin yerler.
const VENUES = [
  { to: "/oyun/pazar", icon: "🪙", key: "scr.pazar" },
  { to: "/oyun/atolye", icon: "⚒", key: "scr.atolye" },
  { to: "/oyun/mektep", icon: "🎓", key: "scr.mektep" },
  { to: "/oyun/orgutler", icon: "⚜", key: "scr.orgutler" },
  { to: "/oyun/iliskiler", icon: "🫂", key: "rel.headTitle" },
  { to: "/oyun/haberler", icon: "📜", key: "scr.haberler" },
];

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.border }}>
      <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchment }}>{value}</Text>
    </View>
  );
}

export default function Sehir() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const here = p.location_name;
  const kind = placeKind(here);
  const info = cityInfo(here, kind, lang);
  const home = atHome(p);
  const pp = publicPerception(state);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={`${t("kind." + KIND_KEY[kind])} · ${info.population.toLocaleString("tr")} ${t("diyar.pop")}`} icon={KIND_ICON[kind]} title={placeName(here, lang)} sub={t("city.hubSub")} />

        <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted, lineHeight: 20, marginBottom: 14 }}>{info.blurb}</Text>

        {/* Memleket / gurbet + halkın algısı (tanınma sistemi) */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: home ? "rgba(127,166,106,0.10)" : "rgba(111,160,192,0.10)", borderWidth: 1, borderColor: home ? "rgba(127,166,106,0.4)" : "rgba(111,160,192,0.4)", borderRadius: 12, padding: 13, marginBottom: 14 }}>
          <Text style={{ fontSize: 22 }}>{home ? "🏠" : "🧭"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 0.5, color: home ? C.sage : "#6FA0C0" }}>{home ? t("soc.home") : t("soc.away")}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchment, marginTop: 2 }}>{t("percept." + pp.key)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: home ? C.sage : "#6FA0C0" }}>%{Math.round(pp.recog * 100)}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 0.5, color: C.parchmentMuted }}>{t("soc.recog").toUpperCase()}</Text>
          </View>
        </View>

        {/* Buralarda — yerel imkânlar */}
        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginBottom: 9 }}>{t("city.venues")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 16 }}>
          {VENUES.map((v) => (
            <Pressable key={v.to} onPress={() => { hap("tap"); router.push(v.to as any); }} style={({ pressed }) => ({ width: "31.5%", aspectRatio: 1.02, borderRadius: 12, borderWidth: 1, borderColor: "rgba(201,168,76,0.28)", backgroundColor: pressed ? C.cardHi : C.card, alignItems: "center", justifyContent: "center", gap: 6 })}>
              <Text style={{ fontSize: 24 }}>{v.icon}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 0.3, color: C.parchment, textAlign: "center", paddingHorizontal: 4 }} numberOfLines={2}>{t(v.key)}</Text>
            </Pressable>
          ))}
        </View>

        {/* Diyar künyesi */}
        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginBottom: 9 }}>{t("city.localInfo")}</Text>
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, marginBottom: 16 }}>
          <InfoRow label={t("diyar.governor")} value={info.governor} />
          <InfoRow label={t("diyar.security")} value={`${info.security}/100`} />
          <InfoRow label={t("diyar.prosperity")} value={`${info.prosperity}/100`} />
          <InfoRow label={t("diyar.livelihood")} value={t("spec." + citySpecialtyIdx(state, here))} />
          {(() => {
            const sn = (state.realm ?? defaultRealm()).find((r) => r.id === regionOf(here));
            const f = sn ? factionById(sn.holder) : null;
            return <InfoRow label={t("realm.holder")} value={`${beylikName(regionOf(here))} · ${f ? f.icon + " " + t("fac." + f.id + ".n") : "—"}`} last />;
          })()}
        </View>

        {/* Diyarı gez */}
        <Pressable onPress={() => { hap("tap"); router.push("/oyun/harita"); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(201,168,76,0.07)", borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", borderRadius: 12, padding: 14 }}>
          <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: "rgba(201,168,76,0.1)", borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 19 }}>🗺</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{t("city.allRealm")}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{t("city.hint")}</Text>
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>›</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
