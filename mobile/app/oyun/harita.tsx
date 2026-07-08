import { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Image, ImageBackground } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { PLACES, BEYLIKS, regionOf } from "../../lib/game";
import { cityInfo } from "../../lib/world";
import { placeName } from "../../lib/locale-data";
import { MAP_HERO } from "../../lib/assets";
import { useI18n } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { BackLabel } from "../../lib/ui";

const KIND_ICON: Record<string, string> = { "şehir": "castle", "kale": "shield", "köy": "house" };
// Beyliğin beyi (atmosfer; özel ad — dile bağlı değil).
const BEY: Record<string, string> = { demirhan: "Alpaslan", yenisehir: "Konur", gumushisar: "Sinaneddin", aksehir: "Demir", karahisar: "Tuğrul" };
// İki beylik arası deterministik ilişki (statik gösterim): 0 gergin · 1 tarafsız · 2 dost.
function relationOf(a: string, b: string): number {
  const k = [a, b].sort().join("|");
  let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 3;
}

export default function Harita() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { lang, t } = useI18n();
  const here = state?.player.location_name || "";
  const [sel, setSel] = useState<string>(regionOf(here) || BEYLIKS[0].id);

  // Tüm beyliklerin toplam istatistikleri (yerleşimlerin cityInfo'sundan — gerçek).
  const stats = useMemo(() => {
    const out: Record<string, any> = {};
    for (const b of BEYLIKS) {
      const places = PLACES.filter((p) => p.region === b.id);
      let pop = 0, ref = 0, sec = 0, sehir = 0, kale = 0, koy = 0, merkez = places[0], merkezPop = -1;
      const rows = places.map((p) => {
        const ci = cityInfo(p.name, p.kind, lang);
        pop += ci.population; ref += ci.prosperity; sec += ci.security;
        if (p.kind === "şehir") sehir++; else if (p.kind === "kale") kale++; else koy++;
        if (ci.population > merkezPop) { merkezPop = ci.population; merkez = p; }
        return { p, ci };
      }).sort((x, y) => y.ci.population - x.ci.population);
      const n = places.length || 1;
      const avgRef = Math.round(ref / n), avgSec = Math.round(sec / n);
      out[b.id] = {
        rows, total: places.length, pop, avgRef, avgSec, sehir, kale, koy,
        ordu: Math.round(kale * 220 + pop * 0.02 + sehir * 120),
        hazine: Math.round(pop * avgRef * 0.012),
        merkez: merkez.name,
      };
    }
    return out;
  }, [lang]);

  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const s = stats[sel]; const selBey = BEYLIKS.find((b) => b.id === sel)!;
  const myRegion = regionOf(here);
  const relLabel = ["gergin", "tarafsiz", "dost"];
  const relColor = ["#D24A4A", "#C9B98C", "#66B070"];
  const relIcon = ["crossed-swords", "scales", "leaf"];

  const Head = ({ title, oneri }: { title: string; oneri?: boolean }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginTop: 16, marginBottom: 10 }}>
      <View style={{ width: 7, height: 7, backgroundColor: C.gold, transform: [{ rotate: "45deg" }] }} />
      <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 2, color: C.gold, textTransform: "uppercase" }}>{title}</Text>
      <View style={{ flex: 1, height: 1.5, backgroundColor: C.goldDim, opacity: 0.6 }} />
      {oneri && <View style={{ borderWidth: 1, borderColor: "rgba(94,134,168,0.55)", backgroundColor: "rgba(94,134,168,0.14)", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 }}><Text style={{ fontFamily: F.display, fontSize: 7, letterSpacing: 1, color: C.azure }}>{t("map.suggest")}</Text></View>}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <GameIcon name="akce" size={12} color={C.gold} />
          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{state.player.money}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 100 }}>

        {/* Hero harita — beylik işaretleri tıklanır; oyuncunun bulunduğu beylik altın halkayla "buradasın" der */}
        <View style={{ borderRadius: 14, overflow: "hidden", borderWidth: 1.5, borderColor: C.borderHi, marginBottom: 8 }}>
          <ImageBackground source={MAP_HERO} resizeMode="cover" style={{ width: "100%", aspectRatio: 1.5, justifyContent: "flex-start" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 9, paddingBottom: 20, backgroundColor: "rgba(13,9,5,0.0)" }}>
              <Text style={{ color: C.goldDim, fontSize: 13 }}>❧</Text>
              <Text style={{ fontFamily: F.display, fontSize: 15, letterSpacing: 3, color: C.parchment, textShadowColor: "#000", textShadowRadius: 8 }}>{t("scr.harita").toUpperCase()}</Text>
              <Text style={{ color: C.goldDim, fontSize: 13 }}>☙</Text>
            </View>
            {BEYLIKS.map((b) => {
              const POS: Record<string, { x: number; y: number }> = { aksehir: { x: 24, y: 30 }, yenisehir: { x: 50, y: 28 }, gumushisar: { x: 73, y: 26 }, demirhan: { x: 30, y: 62 }, karahisar: { x: 63, y: 62 } };
              const pos = POS[b.id]; if (!pos) return null;
              const on = b.id === sel; const home = b.id === myRegion;
              return (
                <Pressable key={b.id} onPress={() => setSel(b.id)} hitSlop={10}
                  style={{ position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`, alignItems: "center", transform: [{ translateX: -9 }] }}>
                  <View style={{ width: home ? 20 : 16, height: home ? 20 : 16, borderRadius: 10, backgroundColor: b.tone, borderWidth: on || home ? 2.5 : 1.5, borderColor: home ? C.goldBright : on ? C.gold : "rgba(13,9,5,0.85)", shadowColor: "#000", shadowOpacity: 0.7, shadowRadius: 4, elevation: 5 }} />
                  <Text style={{ fontFamily: F.display, fontSize: 7.5, letterSpacing: 0.5, color: on || home ? C.goldBright : C.parchment, marginTop: 2, textShadowColor: "#000", textShadowRadius: 6 }}>{b.name.split(" ")[0].toUpperCase()}</Text>
                  {home && <Text style={{ fontFamily: F.display, fontSize: 6.5, letterSpacing: 0.5, color: C.goldBright, textShadowColor: "#000", textShadowRadius: 6 }}>● {t("diyar.hereNow").toUpperCase()}</Text>}
                </Pressable>
              );
            })}
          </ImageBackground>
        </View>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, textAlign: "center", marginBottom: 4 }}>{t("map.hint")}</Text>

        {/* Beylikler */}
        <Head title={t("diyar.beyliks")} />
        {BEYLIKS.map((b) => {
          const st = stats[b.id]; const on = b.id === sel; const home = b.id === myRegion;
          return (
            <Pressable key={b.id} onPress={() => setSel(b.id)} style={{ flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: C.cardHi, borderWidth: 1.5, borderColor: on ? C.gold : C.border, borderRadius: 12, padding: 10, marginBottom: 8 }}>
              <View style={{ width: 14, height: 34, borderRadius: 4, backgroundColor: b.tone }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{b.name}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchmentMuted, marginTop: 2 }}>{st.total} {t("diyar.units")} · {st.sehir} {t("kind.sehir")} · {st.kale} {t("kind.kale")} · {st.koy} {t("kind.koy")}</Text>
              </View>
              {home ? <Text style={{ fontFamily: F.display, fontSize: 7.5, color: C.goldBright, borderWidth: 1, borderColor: "rgba(240,200,74,0.5)", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>{t("diyar.hereNow").toUpperCase()}</Text> : <Text style={{ fontFamily: F.display, fontSize: 14, color: C.goldDim }}>›</Text>}
            </Pressable>
          );
        })}

        {/* Seçili beyliğin yerleşimleri */}
        <Head title={`${selBey.name.split(" ")[0]} · ${t("diyar.settlements")}`} />
        <View style={{ backgroundColor: C.cardHi, borderWidth: 1.5, borderColor: C.borderHi, borderRadius: 13, overflow: "hidden" }}>
          {s.rows.slice(0, 6).map((r: any, i: number) => {
            const isHere = r.p.name === here;
            const pc = r.ci.prosperity >= 70 ? C.sage : r.ci.prosperity >= 45 ? C.gold : C.blood;
            return (
              <Pressable key={r.p.name} onPress={() => router.push(`/oyun/diyar/${encodeURIComponent(r.p.name)}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: isHere ? "rgba(212,180,90,0.07)" : undefined }}>
                <View style={{ width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.borderHi, backgroundColor: "rgba(40,30,16,0.6)" }}>
                  <GameIcon name={KIND_ICON[r.p.kind] || "house"} size={17} color={C.gold} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.parchment }}>{placeName(r.p.name, lang)} <Text style={{ fontSize: 9, color: C.goldDim }}>{t("kind." + (r.p.kind === "şehir" ? "sehir" : r.p.kind === "kale" ? "kale" : "koy"))}</Text></Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 9.5, color: C.parchmentMuted, marginTop: 1 }}>{r.ci.governor}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 10, color: C.parchmentDim }}>{r.ci.population.toLocaleString("tr")} {t("diyar.pop")}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
                    <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.4)", overflow: "hidden", borderWidth: 1, borderColor: "rgba(212,180,90,0.18)" }}><View style={{ width: `${r.ci.prosperity}%`, height: "100%", backgroundColor: pc }} /></View>
                  </View>
                </View>
                {isHere ? <Text style={{ fontFamily: F.display, fontSize: 8, color: C.goldBright }}>●</Text> : <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 0.5, color: C.gold, borderWidth: 1, borderColor: "rgba(212,180,90,0.5)", backgroundColor: "rgba(212,180,90,0.12)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>{t("diyar.go")}</Text>}
              </Pressable>
            );
          })}
          {s.total > 6 && <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1, color: C.gold, textAlign: "center", padding: 11 }}>↓ {s.total} {t("diyar.units")}</Text>}
        </View>

        {/* Beylik Gücü — gerçek toplam + türetilmiş + ilişki */}
        <Head title={t("diyar.power")} oneri />
        <View style={{ backgroundColor: C.cardHi, borderWidth: 1.5, borderColor: C.borderHi, borderRadius: 13, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9, padding: 11, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: selBey.tone + "1A" }}>
            <View style={{ width: 11, height: 30, borderRadius: 3, backgroundColor: selBey.tone }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.parchment }}>{selBey.name}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.parchmentMuted, marginTop: 1 }}>{t("diyar.bey")}: {BEY[sel]} · {t("diyar.center")}: {placeName(s.merkez, lang)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", paddingVertical: 4 }}>
            {[
              { i: "family", l: t("diyar.pop"), v: s.pop.toLocaleString("tr"), c: C.parchment },
              { i: "wheat", l: t("diyar.prosperity"), v: "%" + s.avgRef, c: C.sage },
              { i: "shield", l: t("diyar.security"), v: "%" + s.avgSec, c: C.parchment },
              { i: "crossed-swords", l: t("diyar.army"), v: s.ordu.toLocaleString("tr"), c: C.parchment },
              { i: "coins", l: t("diyar.treasury"), v: s.hazine.toLocaleString("tr"), c: C.gold },
              { i: "banner", l: t("diyar.units"), v: String(s.total), c: C.parchment },
            ].map((cell, i) => (
              <View key={i} style={{ width: "33.33%", alignItems: "center", paddingVertical: 9 }}>
                <GameIcon name={cell.i} size={16} color={cell.c} />
                <Text style={{ fontFamily: F.display, fontSize: 7, letterSpacing: 1, color: C.parchmentMuted, marginTop: 3 }}>{cell.l.toUpperCase()}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 13.5, color: cell.c, marginTop: 2 }}>{cell.v}</Text>
              </View>
            ))}
          </View>
          <View style={{ paddingHorizontal: 13, paddingTop: 4, borderTopWidth: 1, borderTopColor: C.border }}>
            <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 1.5, color: C.goldDim, marginTop: 8, marginBottom: 4 }}>{t("diyar.neighbors").toUpperCase()}</Text>
            {BEYLIKS.filter((b) => b.id !== sel).map((b) => {
              const rel = relationOf(sel, b.id);
              return (
                <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: b.tone }} />
                  <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 11.5, color: C.parchmentDim }}>{b.name}</Text>
                  <GameIcon name={relIcon[rel]} size={10} color={relColor[rel]} />
                  <Text style={{ fontFamily: F.display, fontSize: 9.5, color: relColor[rel] }}>{t("diyar.rel_" + relLabel[rel])}</Text>
                </View>
              );
            })}
          </View>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 9.5, color: C.parchmentMuted, padding: 12, lineHeight: 14 }}>{t("diyar.powerNote")}</Text>
        </View>

      </ScrollView>
    </View>
  );
}
