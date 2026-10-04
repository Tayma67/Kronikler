// Hesap anı: yenilen gerçek hasım yerde — bağışla ya da canını al. Savaş ekranında ve ana ekranda aynı pencere.
import { View, Text, Pressable, Modal } from "react-native";
import { useGame } from "./store";
import { useI18n, applyParams } from "./i18n";
import { hesapBilgi, hesapKarari, kisiProfil } from "./game";
import { traitL } from "./locale-data";
import { Portre } from "./ui";
import { GameIcon } from "./icons";
import { hap } from "./haptics";
import { C, F } from "./theme";

export function HesapModal() {
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const b = !state || state.player.dead ? null : hesapBilgi(state);
  const pr = b && state ? kisiProfil(state, b.id, lang) : null;
  if (!b || !pr) return null;
  const sec = (oldur: boolean) => { hap(oldur ? "heavy" : "selection"); apply((s) => hesapKarari(s, oldur)); };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => sec(false)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center", padding: 22 }}>
        <View style={{ width: "100%", maxWidth: 380, backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(200,60,60,0.55)", borderRadius: 14, padding: 18, alignItems: "center" }}>
          <GameIcon name="crossed-swords" size={18} color={C.blood} />
          <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2.5, color: C.goldDim, marginTop: 6 }}>{t("hesap.baslik").toUpperCase()}</Text>
          <View style={{ marginTop: 10 }}><Portre age={pr.npc.age} gender={pr.npc.gender} size={64} ring={false} seed={pr.npc.id} /></View>
          <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, marginTop: 8, textAlign: "center" }}>{pr.npc.name}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchmentDim, lineHeight: 21, marginTop: 10, textAlign: "center" }}>{applyParams(t("hesap.metin"), [pr.npc.name.split(" ")[0]])}</Text>
          <View style={{ flexDirection: "row", gap: 14, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><GameIcon name="star" size={11} color={C.parchmentDim} /><Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentDim }}>{traitL(pr.npc.trait, lang)}</Text></View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><GameIcon name="iliskiler" size={11} color={C.parchmentDim} /><Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentDim }}>{b.yakin ? applyParams(t("hesap.yakin"), [b.yakin]) : t("hesap.yakinYok")}</Text></View>
          </View>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.goldDim, lineHeight: 17, marginTop: 10, textAlign: "center" }}>{t("hesap.uyari")}</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16, alignSelf: "stretch" }}>
            <Pressable onPress={() => sec(false)} style={{ flex: 1, paddingVertical: 11, borderRadius: 9, borderWidth: 1, borderColor: "rgba(127,166,106,0.6)", backgroundColor: "rgba(127,166,106,0.12)", alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.sage, letterSpacing: 0.5 }}>{t("hesap.bagisla")}</Text>
            </Pressable>
            <Pressable onPress={() => sec(true)} style={{ flex: 1, paddingVertical: 11, borderRadius: 9, borderWidth: 1, borderColor: "rgba(200,60,60,0.7)", backgroundColor: "rgba(200,60,60,0.16)", alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.blood, letterSpacing: 0.5 }}>{t("hesap.oldur")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
