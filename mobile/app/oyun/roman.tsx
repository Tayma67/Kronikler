import { View, Text, ScrollView, Pressable, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { WEEKS_PER_YEAR } from "../../lib/calendar";
import { useI18n, applyParams, renderEvt } from "../../lib/i18n";
import { professionNameL } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { BackLabel } from "../../lib/ui";

const BANDS = [
  { key: "cocukluk", lo: 7, hi: 12 },
  { key: "ergenlik", lo: 13, hi: 17 },
  { key: "genclik", lo: 18, hi: 24 },
  { key: "yetiskinlik", lo: 25, hi: 32 },
  { key: "olgunluk", lo: 33, hi: 45 },
  { key: "yaslilik", lo: 46, hi: 59 },
  { key: "ihtiyarlik", lo: 60, hi: 200 },
];

// Olay türünü bir temaya indirger (yıllık hikâye özeti — Vercel generate_year_story ruhu).
function catOf(type: string): string {
  if (/savas|savaş|ocak|doruk|combat|kan_dav/.test(type)) return "catisma";
  if (/ticaret|mulk|mülk|hasat|kervan|atolye|zanaat/.test(type)) return "kazanc";
  if (/bagis|bağış/.test(type)) return "hayir"; // bağış harcamadır, kazanç değil — hayır/miras teması
  if (/evlilik|dogum|doğum|nesil|aile/.test(type)) return "aile";
  if (/sohbet|orgut|örgüt|fai/.test(type)) return "dostluk";
  if (/mektep|beceri|cirak|çırak|olgunluk|ihtiyarlik/.test(type)) return "ogrenme";
  if (/suc|suç|ceza|golge|gölge/.test(type)) return "karanlik";
  if (/yonetim|yönetim/.test(type)) return "mevki";
  if (/hikaye|hikâye|seyahat|yolculuk|dunya|dünya|fisilti|fısıltı/.test(type)) return "yollar";
  if (/saglik|sağlık|iyilesme|iyileşme/.test(type)) return "saglik";
  return "gunluk";
}
// Bir çağın olaylarından kısa anlatı özeti üretir.
function bandNarrative(events: { type: string; landmark?: boolean }[], t: (k: string) => string): string {
  const counts: Record<string, number> = {};
  let landmarks = 0;
  for (const e of events) { if (e.landmark) landmarks++; const c = catOf(e.type); if (c !== "gunluk") counts[c] = (counts[c] || 0) + 1; }
  const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 2);
  let s = "";
  if (top.length >= 2) s = t("rom.narr.two").replace("%1", t("rom.th." + top[0])).replace("%2", t("rom.th." + top[1]));
  else if (top.length === 1) s = t("rom.narr.one").replace("%1", t("rom.th." + top[0]));
  if (landmarks > 0) s = (s ? s + " " : "") + t("rom.narr.landmarks").replace("%1", String(landmarks));
  return s;
}

export default function Roman() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const base = state.player.base_age;
  const ageOf = (day: number) => base + Math.floor(day / WEEKS_PER_YEAR);
  const bandOf = (age: number) => BANDS.find((b) => age >= b.lo && age <= b.hi) || BANDS[BANDS.length - 1];

  // Bölümlere göre grupla (dünya gürültüsü değil; kişisel + dönüm noktaları)
  const chapters = BANDS.map((b) => ({
    band: b,
    events: state.history.filter((e) => { const a = ageOf(e.day); return a >= b.lo && a <= b.hi && e.scope === "kişisel"; }),
  })).filter((c) => c.events.length > 0);

  // Hayat romanı paylaşım kartı (metin): isim + kısa künye + kapanış + oyun adı. RN yerleşik Share (ek bağımlılık yok).
  const onShare = () => {
    const pl = state.player;
    const tally = [
      t("rom.t.lived").replace("%n", String(pl.age)),
      pl.profession !== "işsiz" ? t("rom.t.recalled").replace("%s", professionNameL(pl.profession, lang)) : null,
      pl.children.length ? t("rom.t.children").replace("%n", String(pl.children.length)) : null,
      pl.fame >= 50 ? t("rom.t.famed") : null,
    ].filter(Boolean).join(" · ");
    const msg = `${pl.name} — ${tally}.\n${pl.dead ? t("rom.closeDead") : t("rom.closeAlive")}\n\nKronikler: Küllerin Mirası`;
    Share.share({ message: msg }).catch(() => {});
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 60 }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 10 }}><BackLabel /></Pressable>
      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 4, color: C.goldDim, textAlign: "center" }}>{t("rom.eyebrow")}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 24, color: C.gold, textAlign: "center", marginTop: 8 }}>{state.player.name}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", marginBottom: 4 }}>{t("rom.subtitle")}</Text>
      <Text style={{ color: C.gold, textAlign: "center", marginVertical: 14 }}>❧ ⚜ ❧</Text>

      <Pressable onPress={onShare} style={{ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.10)", marginBottom: 18 }}>
        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.gold }}>{t("rom.share")}</Text>
      </Pressable>

      {chapters.length === 0 ? (
        <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, textAlign: "center", marginTop: 20 }}>{t("rom.empty")}</Text>
      ) : chapters.map((c, ci) => (
        <View key={ci} style={{ marginBottom: 24 }}>
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 3, color: C.goldDim, textAlign: "center" }}>{t("rom.chapter")} {ci + 1}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 19, color: C.gold, textAlign: "center", marginTop: 2 }}>{t("rom.band." + c.band.key)}</Text>
          {(() => { const narr = bandNarrative(c.events, t); return narr ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", lineHeight: 20, marginTop: 8, paddingHorizontal: 8 }}>{narr}</Text> : null; })()}
          <View style={{ width: "55%", height: 1, backgroundColor: C.borderHi, alignSelf: "center", marginVertical: 14 }} />
          {c.events.map((e, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: e.landmark ? 10 : 6 }}>
              {e.landmark && <Text style={{ color: C.gold }}>⚜</Text>}
              <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 23, color: e.landmark ? C.parchment : C.parchmentDim, fontStyle: e.landmark ? "normal" : "italic" }}>{renderEvt(e.k, e.text, e.p, lang, t, state.player.gender === "kadın")}</Text>
            </View>
          ))}
        </View>
      ))}
      {state.player.dead && (() => {
        const p = state.player;
        const tally = [
          t("rom.t.lived").replace("%n", String(p.age)),
          p.profession !== "işsiz" ? t("rom.t.recalled").replace("%s", professionNameL(p.profession, lang)) : t("rom.t.noTrade"),
          p.children.length ? t("rom.t.children").replace("%n", String(p.children.length)) : t("rom.t.noChildren"),
          p.properties.length ? t("rom.t.properties").replace("%n", String(p.properties.length)) : null,
          p.fame >= 50 ? t("rom.t.famed") : null,
        ].filter(Boolean).join(" · ");
        return (
          <View style={{ borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderRadius: 12, padding: 16, marginBottom: 16, backgroundColor: "rgba(201,168,76,0.06)" }}>
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 3, color: C.goldDim, textAlign: "center" }}>{t("rom.tallyHeader")}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchment, textAlign: "center", lineHeight: 22, marginTop: 8 }}>{tally}.</Text>
          </View>
        );
      })()}

      <Text style={{ color: C.gold, textAlign: "center", marginVertical: 14 }}>❧ ⚜ ❧</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchmentMuted, textAlign: "center", lineHeight: 22 }}>
        {state.player.dead ? t("rom.closeDead") : t("rom.closeAlive")}
      </Text>
    </ScrollView>
  );
}
