import { View, Text, ScrollView, Pressable } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { INVESTMENTS, WILL_STYLES, LAST_WORDS, investInChild, continueAsHeir, heirPreview, EDU_TRACKS, eduLevel, setChildEducation, childNature } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader } from "../../lib/ui";

export default function Nesil() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  const [heir, setHeir] = useState<string | null>(null);
  const [will, setWill] = useState<string>(state?.player.will_pref || "esit"); // hanedanda önceden seçilen vasiyet burada varsayılan olur
  const [lw, setLw] = useState<string>("helalles"); // son söz — devir anında bir kez seçilir, vârise temalı iz bırakır
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const chosenHeir = heir || p.children[0];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <View style={{ width: 40 }} />
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <PageHeader kicker={t("scr.nesil")} title={t("scr.nesil")} />
        {p.children.length === 0 ? (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", marginTop: 30 }}>
            {t("nes.noChildren")}
          </Text>
        ) : p.dead ? (
          <>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchment, marginBottom: 12 }}>
              {t("nes.deadPrompt")}
            </Text>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 8 }}>{t("nes.chooseHeir")}</Text>
            {p.children.map((c) => { const pv = heirPreview(state, c, will); return (
              <Pressable key={c} onPress={() => setHeir(c)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 9, borderWidth: 1, marginBottom: 7, borderColor: chosenHeir === c ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: chosenHeir === c ? "rgba(201,168,76,0.12)" : C.card }}>
                <GameIcon name="baby" size={16} color={C.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{c}</Text>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.sage, marginTop: 1 }}>{t("nat." + childNature(c, p.generation))}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.goldDim, marginTop: 2 }}>{t("nes.preview").replace("%1", String(pv.points)).replace("%2", String(pv.money)).replace("%3", String(pv.rep))}</Text>
                </View>
                {(p.child_invests?.[c]?.length || 0) > 0 && <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.goldDim }}>{p.child_invests[c].length} {t("nes.invests")}</Text>}
                {p.child_edu?.[c] && eduLevel(p.child_edu[c].weeks) > 0 && <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.gold }}>{t("edu.track." + p.child_edu[c].track)} {eduLevel(p.child_edu[c].weeks)}</Text>}
                {chosenHeir === c && <Text style={{ color: C.gold }}>✓</Text>}
              </Pressable>
            ); })}
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 12, marginBottom: 8 }}>{t("nes.will")}</Text>
            {WILL_STYLES.map((w) => (
              <Pressable key={w.id} onPress={() => setWill(w.id)} style={{ padding: 12, borderRadius: 9, borderWidth: 1, marginBottom: 7, borderColor: will === w.id ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: will === w.id ? "rgba(201,168,76,0.12)" : C.card }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: will === w.id ? C.gold : C.parchment }}>{t("will." + w.id + ".l")}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 2 }}>{t("will." + w.id + ".d")}</Text>
              </Pressable>
            ))}
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 12, marginBottom: 8 }}>{t("nes.lastWords")}</Text>
            {LAST_WORDS.map((w) => (
              <Pressable key={w.id} onPress={() => setLw(w.id)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 9, borderWidth: 1, marginBottom: 7, borderColor: lw === w.id ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: lw === w.id ? "rgba(201,168,76,0.12)" : C.card }}>
                <GameIcon name={w.icon} size={16} color={lw === w.id ? C.gold : C.parchmentDim} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 12, color: lw === w.id ? C.gold : C.parchment }}>{t("lw." + w.id + ".l")}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 2 }}>{t("lw." + w.id + ".d")}</Text>
                </View>
              </Pressable>
            ))}
            <Pressable onPress={() => { hap("heavy"); apply((s) => continueAsHeir(s, will, chosenHeir, lw)); router.replace("/oyun"); }} style={{ marginTop: 12, paddingVertical: 15, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: "#1a1206", letterSpacing: 1.5 }}>{t("dash.continueHeir")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: 12 }}>
              {t("nes.investPrompt")}
            </Text>
            {p.children.map((c) => {
              const invs = p.child_invests?.[c] || [];
              return (
                <View key={c} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 14, color: C.gold, marginBottom: 8 }}>{c}</Text>
                  {INVESTMENTS.map((inv) => {
                    const done = invs.includes(inv.id);
                    const afford = p.money >= inv.cost;
                    return (
                      <Pressable key={inv.id} disabled={done || !afford} onPress={() => { hap("tap"); apply((s) => investInChild(s, c, inv.id)); }} style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, opacity: done ? 0.6 : afford ? 1 : 0.5 }}>
                        <GameIcon name={inv.icon} size={15} color={done ? C.gold : C.goldDim} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment }}>{t("inv." + inv.id + ".l")}</Text>
                          <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.parchmentMuted }}>{t("inv." + inv.id + ".d")}</Text>
                        </View>
                        <Text style={{ fontFamily: F.display, fontSize: 11, color: done ? C.gold : C.parchmentMuted }}>{done ? "✓" : `${inv.cost}⚜`}</Text>
                      </Pressable>
                    );
                  })}
                  {/* Süregelen eğitim yolu — haftalık emek/akçe biriktirir, vâris olunca ölçekli bonus verir */}
                  <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.goldDim, marginTop: 12, marginBottom: 3 }}>{t("edu.head")}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.parchmentMuted, marginBottom: 7 }}>{t("edu.hint")}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {EDU_TRACKS.map((tr) => {
                      const on = p.child_edu?.[c]?.track === tr.id;
                      const afford = p.money >= tr.weekly;
                      return (
                        <Pressable key={tr.id} disabled={!on && !afford} onPress={() => { hap("tap"); apply((s) => setChildEducation(s, c, on ? null : tr.id)); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: on ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: on ? "rgba(201,168,76,0.12)" : C.card, opacity: !on && !afford ? 0.5 : 1 }}>
                          <GameIcon name={tr.icon} size={13} color={on ? C.gold : C.goldDim} />
                          <Text style={{ fontFamily: F.display, fontSize: 11, color: on ? C.gold : C.parchment }}>{t("edu.track." + tr.id)}</Text>
                          <Text style={{ fontFamily: F.serif, fontSize: 9, color: C.parchmentMuted }}>{t("edu.cost").replace("%1", String(tr.weekly))}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {p.child_edu?.[c] && (
                    <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.goldDim, marginTop: 6 }}>
                      {t("edu.months").replace("%1", String(p.child_edu[c].weeks))} · {eduLevel(p.child_edu[c].weeks) > 0 ? t("edu.proj").replace("%1", String(eduLevel(p.child_edu[c].weeks))) : t("edu.notyet")}
                    </Text>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
