import { useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { npcsOf } from "../../lib/game";
import { worldNews, rumors } from "../../lib/lore";
import { useI18n, applyParams, renderEvt } from "../../lib/i18n";
import { placeName } from "../../lib/locale-data";
import { currentCalendar } from "../../lib/calendar";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { BackLabel } from "../../lib/ui";

export default function Haberler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  useEffect(() => { apply((s) => (s.newsSeenTurn === s.turn ? s : { ...s, newsSeenTurn: s.turn })); }, [state?.turn]); // görüldü: rozet sıfırlanır (aynı tursa yazma yok)
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const cal = currentCalendar(state.turn);
  const news = worldNews(state.turn, state.seed, lang, placeName(state.player.location_name, lang));
  const gossip = rumors(state.turn, state.seed, lang, npcsOf(state, lang)); // dedikodu, bulunduğun yerin gerçek (yaşayan) ahalisini anar
  const tips = state.tips || [];
  // Diyarın gerçek ahvali: history'de biriken makro olaylar (savaş, sancak el değiştirme, kıtlık) — hepsi zaten 6 dilde.
  const realm = (state.history || []).filter((e) => e.scope === "makro" && (e.type === "dunya" || e.type === "ocak_savasi" || e.type === "piyasa" || e.type === "dunya_olayi")).slice(-5).reverse(); // dunya_olayi: şehir hâlleri (düğün/göç/maden/kuraklık...) da diyarın ahvalidir
  const CAT_ICON: Record<string, string> = { hasat: "wheat", kuraklik: "sun", kervan: "camel", vergi: "coins", sinir: "crossed-swords", salgin: "healing", han: "house", kitlik: "bread" };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>{t("scr.haberler")}</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 6 }}>
        {t("cal.month." + cal.month_no)} {cal.year} · {t("hab.dropped")}
      </Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, marginBottom: 8 }}><GameIcon name="haberler" size={12} color={C.goldDim} /><Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase" }}>{t("hab.news")}</Text></View>
        {news.map((n) => (
          <View key={n.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: n.local ? "rgba(201,168,76,0.45)" : C.border, borderLeftColor: C.gold, borderLeftWidth: n.local ? 4 : 2.5, borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {n.cat && CAT_ICON[n.cat] ? <GameIcon name={CAT_ICON[n.cat]} size={12} color={C.gold} /> : null}
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold, letterSpacing: 0.5 }}>{n.title}</Text>
              {n.local ? <View style={{ marginLeft: "auto", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: "rgba(201,168,76,0.14)", borderWidth: 1, borderColor: "rgba(201,168,76,0.4)" }}><Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 1, color: C.gold }}>{t("hab.local").toUpperCase()}</Text></View> : null}
            </View>
            <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment, lineHeight: 19, marginTop: 4 }}>{n.body}</Text>
          </View>
        ))}

        {realm.length > 0 && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, marginBottom: 8 }}><GameIcon name="banner" size={12} color={C.goldDim} /><Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase" }}>{t("hab.realm")}</Text></View>
            {realm.map((e, i) => {
              const evLoc = e.type === "dunya_olayi" ? (e.p || []).map((x: any) => x && typeof x === "object" && "pl" in x ? x.pl : null).find(Boolean) : null;
              const dest = e.type === "ocak_savasi" ? "/oyun/orgutler" : e.type === "piyasa" ? "/oyun/pazar" : evLoc ? "/oyun/diyar/" + evLoc : "/oyun/hanedan"; // haberden ilgili ekrana köprü (salt gezinme; şehir olayı kendi şehrine)
              return (
              <Pressable key={"realm" + i} onPress={() => { router.push(dest as any); }} style={({ pressed }) => ({ backgroundColor: pressed ? C.cardHi : C.card, borderWidth: 1, borderColor: C.border, borderLeftColor: e.type === "ocak_savasi" ? C.blood : C.sage, borderLeftWidth: 2.5, borderRadius: 8, padding: 12, marginBottom: 8 })}>
                <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment, lineHeight: 19 }}>{renderEvt(e.k, e.text, e.p, lang, t, state.player.gender === "kadın")}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 3, marginTop: 6 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1, color: C.goldDim }}>{t("hab.go").toUpperCase()}</Text>
                  <Text style={{ color: C.goldDim, fontSize: 11, fontFamily: F.display }}>›</Text>
                </View>
              </Pressable>
              );
            })}
          </>
        )}

        {tips.length > 0 && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, marginBottom: 8 }}><GameIcon name="star" size={12} color={C.goldDim} /><Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase" }}>{t("tip.head")}</Text></View>
            {tips.map((tp) => (
              <View key={tp.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftColor: C.sage, borderLeftWidth: 2.5, borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment, lineHeight: 19 }}>
                  {tp.kind === "market"
                    ? applyParams(t("tip.market"), [t("it." + tp.good), placeName(tp.cheap || "", lang), placeName(tp.expensive || "", lang)], lang)
                    : applyParams(t("tip.intel"), [t("fac." + tp.fac + ".n"), t("fac." + tp.vsFac + ".n")], lang)}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, marginBottom: 8 }}><GameIcon name="speaker" size={12} color={C.goldDim} /><Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase" }}>{t("hab.gossip")}</Text></View>
        {gossip.map((g) => (
          <View key={g.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchment, lineHeight: 19 }}>“{g.body}”</Text>
          </View>
        ))}
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, textAlign: "center", marginTop: 14 }}>
          {t("hab.footer")}
        </Text>
      </ScrollView>
    </View>
  );
}
