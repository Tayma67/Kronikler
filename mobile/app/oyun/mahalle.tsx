// Mahalle ve gün (NUFUS.md Aşama 5): bu ay kim hangi mekânda — gerçek kişilerden. Ayda bir mekâna uğranır,
// ocağındakilerle ayda bir akşam sofrası kurulur. Kilitler motorda (mahalle_turn / sofra_turn); burada yalnız gösterim.
import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { mahalle, mekanaGit, MEKANLAR, MEKAN_YAS, Mekan, sofraKatilimcilari, aksamSofrasi, kisiProfil, kasabaGozu } from "../../lib/game";
import { useI18n, renderEvt } from "../../lib/i18n";
import { placeName } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader, ScreenFresk, Portre } from "../../lib/ui";

const MEKAN_ICON: Record<Mekan, string> = { carsi: "pazar", cami: "prayer-beads", kahve: "amphora", meydan: "banner", han: "camel" };

export default function Mahalle() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  const [sonuc, setSonuc] = useState<string>("");
  const yerler = useMemo(() => (state ? mahalle(state, lang) : null), [state?.pop, state?.turn, state?.player.location_name, lang]);
  const goz = useMemo(() => (state ? kasabaGozu(state) : null), [state]); // kasabanın gözünde: huy gruplarına göre bakış ve sebep
  if (!state || !yerler) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const gidildi = p.mahalle_turn === state.turn;
  const sofraKurulu = p.sofra_turn === state.turn;
  const sofra = sofraKatilimcilari(state);
  const female = p.gender === "kadın";
  // Eylemden sonra motorun yazdığı son olayı aynı dilde göster (gösterilen = olan).
  const git = (m: Mekan) => {
    hap("tap");
    const r = mekanaGit(state, m); if (r === state) return; // saf motor: sonuç burada okunur, durum tek seferde uygulanır
    const e = r.history[r.history.length - 1];
    apply(() => r); setSonuc(e ? renderEvt(e.k, e.text, e.p, lang, t, female) : "");
  };

  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("mh.kicker")} title={`${t("scr.mahalle")} · ${placeName(p.location_name, lang)}`} sub={t("mh.sub")} />

        {sonuc ? (
          <View style={{ backgroundColor: C.card, borderLeftColor: C.gold, borderLeftWidth: 2.5, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchment, lineHeight: 20 }}>{sonuc}</Text>
          </View>
        ) : null}

        {/* Kasabanın gözünde — aynı nâm her huyda aynı yankıyı bulmaz; grup grup ortalama bakış ve en ağır sebep */}
        {goz && goz.toplam > 0 ? (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 13, marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <GameIcon name="iliskiler" size={15} color={C.gold} />
              <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: C.parchment, letterSpacing: 0.5 }}>{t("mh.goz.title")}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 10.5, color: C.goldDim }}>{renderEvt("mh.goz.dost", "", [goz.dost, goz.hasim], lang, t, female)}</Text>
            </View>
            {goz.gruplar.map((g) => (
              <View key={g.grup} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, borderTopWidth: 1, borderTopColor: C.border }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchment }}>{t("huy.grup." + g.grup)} <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>· {g.n}</Text></Text>
                  {g.sebep ? <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{t("mh.goz.sebep")}: {g.sebep === "gorus.ani" && g.sebepTur ? "«" + t("mem.remember." + g.sebepTur) + "»" : t(g.sebep)}</Text> : null}
                </View>
                <Text style={{ fontFamily: F.display, fontSize: 14, width: 44, textAlign: "right", color: g.ort >= 20 ? C.sage : g.ort <= -20 ? C.blood : C.parchmentDim }}>{g.ort > 0 ? "+" + g.ort : g.ort}</Text>
              </View>
            ))}
            {goz.soylenti ? <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.goldDim, marginTop: 6 }}>{renderEvt("mh.goz.soylenti", "", [goz.soylenti], lang, t, female)}</Text> : null}
          </View>
        ) : null}

        {/* Akşam sofrası — ocağındaki gerçek aile aynı yerdeyse */}
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", borderRadius: 12, padding: 13, marginBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <GameIcon name="bread" size={16} color={C.gold} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, letterSpacing: 0.5 }}>{t("sofra.title")}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 1 }}>{sofra.length ? t("sofra.sub") : t("sofra.yok")}</Text>
            </View>
          </View>
          {sofra.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {sofra.map((k) => { const pr = kisiProfil(state, k.id, lang); if (!pr) return null; return (
                <Pressable key={k.id} onPress={() => { hap("tap"); router.push(`/oyun/npc/${k.id}`); }} style={{ alignItems: "center", width: 58 }}>
                  <Portre age={pr.npc.age} gender={pr.npc.gender} size={40} ring={false} seed={k.id} />
                  <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchmentDim, marginTop: 3 }}>{pr.npc.name.split(" ")[0]}</Text>
                </Pressable>
              ); })}
            </View>
          ) : null}
          {sofra.length ? (
            <Pressable disabled={sofraKurulu || p.dead} onPress={() => { hap("success"); const r = aksamSofrasi(state); if (r === state) return; const e = r.history[r.history.length - 1]; apply(() => r); setSonuc(e ? renderEvt(e.k, e.text, e.p, lang, t, female) : ""); }}
              style={{ marginTop: 11, paddingVertical: 10, borderRadius: 9, borderWidth: 1, borderColor: sofraKurulu ? C.border : "rgba(201,168,76,0.55)", backgroundColor: sofraKurulu ? "transparent" : "rgba(201,168,76,0.12)", alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 0.5, color: sofraKurulu ? C.parchmentMuted : C.gold }}>{sofraKurulu ? t("sofra.done") : t("sofra.btn")}</Text>
            </Pressable>
          ) : null}
        </View>

        {gidildi ? <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.goldDim, textAlign: "center", marginBottom: 10 }}>{t("mh.gidildi")}</Text> : null}

        {MEKANLAR.map((m) => {
          const kisiler = yerler[m];
          const kucuk = p.age < MEKAN_YAS[m];
          const acik = !gidildi && !kucuk && !p.dead;
          return (
            <View key={m} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                  <GameIcon name={MEKAN_ICON[m]} size={18} color={C.gold} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, letterSpacing: 0.5 }}>{t("mh." + m + ".n")} <Text style={{ fontFamily: F.display, fontSize: 10.5, color: C.goldDim }}>· {kisiler.length}</Text></Text>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 1 }}>{kucuk ? t("mh.yas") : t("mh." + m + ".d")}</Text>
                </View>
                <Pressable disabled={!acik} onPress={() => git(m)} style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: acik ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: acik ? "rgba(201,168,76,0.12)" : "transparent" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: acik ? C.gold : C.parchmentMuted }}>{t("mh.git")}</Text>
                </Pressable>
              </View>
              {kisiler.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
                  {kisiler.map((n) => (
                    <Pressable key={n.id} onPress={() => { hap("tap"); router.push(`/oyun/npc/${n.id}`); }} style={{ alignItems: "center", width: 56 }}>
                      <Portre age={n.age} gender={n.gender} size={38} ring={false} seed={n.id} />
                      <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 10, color: state.relationships[n.id] !== undefined ? C.parchment : C.parchmentMuted, marginTop: 3 }}>{n.name.split(" ")[0]}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 8 }}>{t("mh.bos")}</Text>}
            </View>
          );
        })}
      </ScrollView>
    </ScreenFresk>
  );
}
