import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { pendingPerkCount, playerWar } from "../../lib/game";
import { useI18n } from "../../lib/i18n";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";

const SEC_KEY: Record<string, string> = { "Geçim": "sec.livelihood", "Güç & Mevki": "sec.power", "Diyar & Soy": "sec.realm", "Kayıt & Anı": "sec.records" };
const SEC_ICON: Record<string, string> = { "Geçim": "meslek", "Güç & Mevki": "orgutler", "Diyar & Soy": "sehir", "Kayıt & Anı": "tarih" };

type Item = { to: string; icon: string };
const SECTIONS: { title: string; items: Item[] }[] = [
  { title: "Geçim", items: [
    { to: "/oyun/meslek", icon: "meslek" },
    { to: "/oyun/pazar", icon: "pazar" },
    { to: "/oyun/atolye", icon: "meslek" },
    { to: "/oyun/mulkler", icon: "mulkler" },
    { to: "/oyun/gorevler", icon: "scroll-open" },
    { to: "/oyun/mektep", icon: "mektep" },
    { to: "/oyun/beceriler", icon: "karakter" },
  ]},
  { title: "Güç & Mevki", items: [
    { to: "/oyun/orgutler", icon: "orgutler" },
    { to: "/oyun/sosyal", icon: "sosyal" },
    { to: "/oyun/savas", icon: "savas" },
    { to: "/oyun/suc", icon: "suc" },
  ]},
  { title: "Diyar & Soy", items: [
    { to: "/oyun/sehir", icon: "sehir" },
    { to: "/oyun/harita", icon: "map" },
    { to: "/oyun/haberler", icon: "haberler" },
    { to: "/oyun/hanedan", icon: "hanedan" },
    { to: "/oyun/nesil", icon: "dogum" },
  ]},
  { title: "Kayıt & Anı", items: [
    { to: "/oyun/hikayeler", icon: "roman" },
    { to: "/oyun/basarimlar", icon: "zafer" },
    { to: "/oyun/tarih", icon: "tarih" },
    { to: "/oyun/roman", icon: "roman" },
    { to: "/oyun/ayarlar", icon: "ayarlar" },
  ]},
];

export default function Menu() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, resetGame, mpMode } = useGame();
  const { t } = useI18n();
  const p = state?.player;
  // Ekran başına eylem-bekleyen durum rozeti: {n: sayı, urgent: kırmızı mı}.
  const badgeFor = (key: string): { n: number; urgent: boolean } => {
    if (!state || !p) return { n: 0, urgent: false };
    switch (key) {
      case "beceriler": return { n: pendingPerkCount(p), urgent: false };
      case "hikayeler": return { n: state.story?.active ? 1 : 0, urgent: false };
      case "orgutler": return { n: playerWar(state) ? 1 : 0, urgent: true };
      case "pazar": return { n: state.caravan ? 1 : 0, urgent: false };
      case "haberler": return { n: Math.min(9, Math.max(0, state.turn - (state.newsSeenTurn ?? state.turn))), urgent: false }; // son ziyaretten beri geçen aylar (ilk açılışa dek sessiz)
      case "nesil": return { n: p.dead && p.children.length > 0 ? 1 : 0, urgent: true };
      default: return { n: 0, urgent: false };
    }
  };
  const confirmReset = () => {
    Alert.alert(t("settings.newLife"), t("settings.reset"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: "✓", style: "destructive", onPress: async () => { await resetGame(); router.replace("/yeni-oyun"); } },
    ]);
  };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 18, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 }}>
      {/* Başlık */}
      <Text style={{ fontFamily: F.display, fontSize: 22, color: C.parchment, letterSpacing: 1.5, textAlign: "center" }}>{t("menu.title")}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted, textAlign: "center", marginTop: 2 }}>{t("app.subtitle")}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 4 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
        <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: "45deg" }], marginHorizontal: 8 }} />
        <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
      </View>

      {SECTIONS.map((sec) => (
        <View key={sec.title} style={{ marginTop: 14 }}>
          {/* Bölüm başlığı: ikon + etiket + altın çizgi */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9, paddingHorizontal: 2 }}>
            <GameIcon name={SEC_ICON[sec.title]} size={14} color={C.gold} />
            <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.gold, textTransform: "uppercase" }}>{t(SEC_KEY[sec.title] || "")}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          </View>
          {/* Gruplu panel */}
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 11, overflow: "hidden" }}>
            {sec.items.map((m, i) => {
              const key = m.to.split("/").pop() || "";
              return (
                <Pressable key={m.to} onPress={() => router.push(m.to as any)}
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 12,
                    borderBottomWidth: i === sec.items.length - 1 ? 0 : 1, borderBottomColor: C.border,
                    backgroundColor: pressed ? C.cardHi : "transparent",
                  })}>
                  {/* İkon kutusu */}
                  <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                    <GameIcon name={m.icon} size={18} color={C.gold} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, letterSpacing: 0.8, color: C.parchment }}>{t("scr." + key)}</Text>
                  {(() => { const b = badgeFor(key); return b.n > 0 ? (
                    <View style={{ minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", backgroundColor: b.urgent ? "rgba(200,64,64,0.9)" : "rgba(201,168,76,0.9)" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 10, color: C.inkOnGold }}>{b.n}</Text>
                    </View>
                  ) : null; })()}
                  <Text style={{ color: C.goldDim, fontSize: 16, fontFamily: F.display }}>›</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <View style={{ height: 18 }} />
      {/* MP'de "Yeni Hayat" gizli: resetGame no-op ama navigasyon yeni-oyun ekranına düşürüp SP kaydını ezdirebilirdi. */}
      {!mpMode && (
      <Pressable onPress={confirmReset} style={{ paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(200,64,64,0.4)", backgroundColor: "rgba(200,64,64,0.08)", alignItems: "center" }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.blood }}>{t("settings.newLife")}</Text>
      </Pressable>
      )}
    </ScrollView>
  );
}
