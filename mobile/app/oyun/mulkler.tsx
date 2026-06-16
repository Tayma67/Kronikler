import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { buyProperty, repairProperty, repairCost, upgradeProperty, propUpgradeCost, PROP_MAX_LEVEL, PROPERTY_TYPES, propBuyCost, propWorkerSlots, townNpcsOf, workerProductivity, hireWorker, fireWorker, propWorkerStats } from "../../lib/game";
import { placeName, professionNameL } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader, Panel, Portre } from "../../lib/ui";

export default function Mulkler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  const [hireOpen, setHireOpen] = useState<number | null>(null);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const here = p.location_name;
  // Tahmini aylık gelir (kondisyon × ~refah; ekranda yaklaşık).
  const estIncome = Math.round(p.properties.reduce((a, pr) => a + (PROPERTY_TYPES[pr.type]?.income || 0) * (pr.cond / 100) * (1 + ((pr.level || 1) - 1) * 0.5), 0));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.mulkler")} icon="🏯" title={t("scr.mulkler")} sub={`${t("mulk.income")}: ~${estIncome} ⚜ · ${t("mulk.locNote")}`} />

        {/* ── Sahip olunan mülkler ── */}
        {p.properties.length > 0 && (
          <Panel title={t("mulk.owned")} icon="🏠" noPad>
            {p.properties.map((pr, i) => {
              const ty = PROPERTY_TYPES[pr.type]; if (!ty) return null;
              const condCol = pr.cond >= 75 ? C.sage : pr.cond >= 45 ? C.gold : C.blood;
              const rc = repairCost(pr);
              return (
                <View key={i} style={{ paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: i === p.properties.length - 1 ? 0 : 1, borderBottomColor: C.border }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 9, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 20 }}>{ty.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{t("pt." + pr.type)} <Text style={{ fontSize: 10, color: C.goldDim }}>{t("mulk.level")} {pr.level || 1}</Text></Text>
                      <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>📍 {placeName(pr.loc, lang)} · {Math.round(ty.income * (1 + ((pr.level || 1) - 1) * 0.5))} {t("mulk.perMonth")}</Text>
                    </View>
                    <View style={{ gap: 5 }}>
                      {pr.cond < 100 && (
                        <Pressable onPress={() => { hap("tap"); apply((s) => repairProperty(s, i)); }} disabled={p.money < rc} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: p.money < rc ? C.border : "rgba(201,168,76,0.5)", backgroundColor: p.money < rc ? C.bg : "rgba(201,168,76,0.12)" }}>
                          <Text style={{ fontFamily: F.display, fontSize: 9.5, color: p.money < rc ? C.parchmentMuted : C.gold }}>{t("mulk.repair")} {rc}⚜</Text>
                        </Pressable>
                      )}
                      {(pr.level || 1) < PROP_MAX_LEVEL && (() => { const uc = propUpgradeCost(pr); return (
                        <Pressable onPress={() => { hap("tap"); apply((s) => upgradeProperty(s, i)); }} disabled={p.money < uc} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: p.money < uc ? C.border : "rgba(201,168,76,0.5)", backgroundColor: p.money < uc ? C.bg : "rgba(201,168,76,0.12)" }}>
                          <Text style={{ fontFamily: F.display, fontSize: 9.5, color: p.money < uc ? C.parchmentMuted : C.gold }}>{t("mulk.upgrade")} {uc}⚜</Text>
                        </Pressable>
                      ); })()}
                    </View>
                  </View>
                  {/* Kondisyon çubuğu */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 0.5, color: C.parchmentMuted, width: 64 }}>{t("mulk.cond").toUpperCase()}</Text>
                    <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <View style={{ width: `${pr.cond}%`, height: 5, borderRadius: 3, backgroundColor: condCol }} />
                    </View>
                    <Text style={{ fontFamily: F.display, fontSize: 10, color: condCol, width: 32, textAlign: "right" }}>{pr.cond}%</Text>
                  </View>
                  {/* ── Mülk defteri (yıllık net geçmişi) ── */}
                  {(pr.ledger?.length || 0) > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 0.5, color: C.parchmentMuted }}>{t("mulk.ledger").toUpperCase()}</Text>
                      {pr.ledger!.slice(-5).map((e, li) => (
                        <Text key={li} style={{ fontFamily: F.serif, fontSize: 10, color: e.net >= 0 ? C.sage : C.blood }}>{e.net >= 0 ? "+" : ""}{e.net}</Text>
                      ))}
                    </View>
                  )}
                  {/* ── İşçiler (NPC istihdamı) ── */}
                  {(() => {
                    const slots = propWorkerSlots(pr);
                    const town = townNpcsOf(state, pr.loc, lang);
                    const hired = (pr.workers || []).map((id) => town.find((nn) => nn.id === id)).filter(Boolean) as NonNullable<ReturnType<typeof town.find>>[];
                    const open = hireOpen === i;
                    const avail = town.filter((nn) => !(pr.workers || []).includes(nn.id));
                    return (
                      <View style={{ marginTop: 9 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                          <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 0.5, color: C.parchmentMuted, width: 64 }}>👷 {t("mulk.workers").toUpperCase()}</Text>
                          <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentDim }}>{hired.length}/{slots}</Text>
                          {hired.length > 0 && (() => {
                            const base = PROPERTY_TYPES[pr.type]?.income || 0;
                            const cpl = (pr.cond / 100) * (1 + ((pr.level || 1) - 1) * 0.5);
                            const w = propWorkerStats(state, pr, base, cpl, lang);
                            const net = Math.round(w.gross - w.wage);
                            return <Text style={{ flex: 1, fontFamily: F.display, fontSize: 9.5, color: net >= 0 ? C.sage : C.blood }}>{net >= 0 ? "+" : ""}{net} ⚜/{t("mulk.perMonth").replace("⚜/", "")}</Text>;
                          })()}
                          {hired.length === 0 && <View style={{ flex: 1 }} />}
                          {hired.length < slots && (
                            <Pressable onPress={() => { hap("tap"); setHireOpen(open ? null : i); }} style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 6, borderWidth: 1, borderColor: "rgba(127,166,106,0.5)", backgroundColor: "rgba(127,166,106,0.12)" }}>
                              <Text style={{ fontFamily: F.display, fontSize: 9, color: C.sage }}>{open ? "⌄" : t("mulk.hire")}</Text>
                            </Pressable>
                          )}
                        </View>
                        {hired.length > 0 && (
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                            {hired.map((nn) => (
                              <Pressable key={nn.id} onPress={() => { hap("tap"); apply((s) => fireWorker(s, i, nn.id)); }} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg }}>
                                <Portre age={nn.age} gender={nn.gender} size={18} ring={false} seed={nn.id} />
                                <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchment }}>{nn.name.split(" ")[0]}</Text>
                                <Text style={{ fontFamily: F.display, fontSize: 8.5, color: C.goldDim }}>×{workerProductivity(nn, pr.type).toFixed(1)}</Text>
                                <Text style={{ color: C.blood, fontSize: 11 }}>×</Text>
                              </Pressable>
                            ))}
                          </View>
                        )}
                        {open && (
                          <View style={{ marginTop: 7, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 7 }}>
                            <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentMuted, marginBottom: 5 }}>{t("mulk.wageNote")}</Text>
                            {avail.slice(0, 8).map((nn) => (
                              <Pressable key={nn.id} onPress={() => { hap("success"); apply((s) => hireWorker(s, i, nn.id)); setHireOpen(null); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 }}>
                                <Portre age={nn.age} gender={nn.gender} size={26} ring={false} seed={nn.id} />
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12, color: C.parchment }}>{nn.name}</Text>
                                  <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 9.5, color: C.parchmentMuted }}>{professionNameL(nn.profession, lang)} · {nn.age}</Text>
                                </View>
                                <Text style={{ fontFamily: F.display, fontSize: 10, color: C.sage }}>{t("mulk.prod")} ×{workerProductivity(nn, pr.type).toFixed(1)}</Text>
                              </Pressable>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })()}
                </View>
              );
            })}
          </Panel>
        )}

        {/* ── Bu şehirde satın al ── */}
        <Panel title={`${t("mulk.buyHere")} · ${placeName(here, lang)}`} icon="🏗" noPad>
          {Object.entries(PROPERTY_TYPES).map(([id, ty], i, arr) => {
            const cost = propBuyCost(state, id);
            return (
            <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: C.border }}>
              <View style={{ width: 40, height: 40, borderRadius: 9, backgroundColor: "rgba(201,168,76,0.08)", borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 20 }}>{ty.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{t("pt." + id)}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{ty.income} {t("mulk.perMonth")}</Text>
              </View>
              <Pressable onPress={() => { hap("tap"); apply((s) => buyProperty(s, id)); }} disabled={p.money < cost} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: p.money < cost ? C.bg : "rgba(201,168,76,0.12)" }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, color: p.money < cost ? C.parchmentMuted : C.gold }}>{t("misc.buy")} {cost}⚜</Text>
              </Pressable>
            </View>
            );
          })}
          <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentMuted, paddingHorizontal: 12, paddingVertical: 8 }}>{t("mulk.priceNote")}</Text>
        </Panel>
      </ScrollView>
    </View>
  );
}
