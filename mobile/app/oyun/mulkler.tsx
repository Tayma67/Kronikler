import { useState } from "react";
import { View, Text, ScrollView, Pressable, Image, ImageBackground } from "react-native";
import Svg, { Polyline, Polygon, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { buyProperty, repairProperty, repairCost, upgradeProperty, propUpgradeCost, PROP_MAX_LEVEL, PROPERTY_TYPES, propBuyCost, propWorkerSlots, townNpcsOf, workerProductivity, hireWorker, fireWorker } from "../../lib/game";
import { placeName, professionNameL } from "../../lib/locale-data";
import { mulkImage, MULK_BOS, MULK_HERO } from "../../lib/assets";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { GameIcon } from "../../lib/icons";
import { BackLabel, Panel, Portre } from "../../lib/ui";

// Mülk gelirini seviyeye göre hesapla (Vercel property_system ile aynı: taban × (1 + (seviye-1)*0.5)).
function propIncome(type: string, level: number): number {
  return Math.round((PROPERTY_TYPES[type]?.income || 0) * (1 + (level - 1) * 0.5));
}

// Gelir trend grafiği — mülk defterinden (yıllık net) küçük sparkline.
function Spark({ ledger, color, w = 58, h = 26 }: { ledger?: { y: number; net: number }[]; color: string; w?: number; h?: number }) {
  const data = (ledger || []).slice(-7).map((e) => e.net);
  if (data.length < 2) {
    return <Svg width={w} height={h}><Polyline points={`2,${h / 2} ${w - 2},${h / 2}`} fill="none" stroke={C.parchmentMuted} strokeWidth={1.3} opacity={0.5} /></Svg>;
  }
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1, pad = 3;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / rng) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <Svg width={w} height={h}>
      <Polygon points={`${pad},${h} ${pts.join(" ")} ${w - pad},${h}`} fill={color} fillOpacity={0.16} />
      <Polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

const actBtn = (dis: boolean): any => ({ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 7, borderWidth: 1, borderColor: dis ? C.border : "rgba(201,168,76,0.5)", backgroundColor: dis ? C.bg : "rgba(201,168,76,0.12)" });
const actTxt = (dis: boolean): any => ({ fontFamily: F.display, fontSize: 11, color: dis ? C.parchmentMuted : C.gold });

export default function Mulkler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  const [manageIdx, setManageIdx] = useState<number | null>(null);
  const [hireOpen, setHireOpen] = useState<number | null>(null);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const here = p.location_name;

  const estIncome = Math.round(p.properties.reduce((a, pr) => a + propIncome(pr.type, pr.level || 1) * (pr.cond / 100), 0));
  const netWorth = p.money + p.properties.reduce((a, pr) => a + Math.round((PROPERTY_TYPES[pr.type]?.cost || 0) * (pr.level || 1) * (pr.cond / 100) * 0.7), 0);
  const totalWorkers = p.properties.reduce((a, pr) => a + (pr.workers?.length || 0), 0);
  const condColor = (c: number) => (c >= 75 ? C.sage : c >= 45 ? C.gold : C.blood);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
        {/* ── Hero afişi ── */}
        <ImageBackground source={MULK_HERO} style={{ width: "100%", height: 182 }} resizeMode="cover">
          {/* okunaklık için alt/üst karartma */}
          <Svg width="100%" height="100%" style={{ position: "absolute", left: 0, top: 0 }}>
            <Defs>
              <LinearGradient id="mulkscrim" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#0D0A06" stopOpacity={0.55} />
                <Stop offset="0.45" stopColor="#0D0A06" stopOpacity={0.1} />
                <Stop offset="1" stopColor="#0D0A06" stopOpacity={0.95} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#mulkscrim)" />
          </Svg>
          {/* üst sıra: geri + akçe */}
          <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable onPress={() => router.back()} style={{ backgroundColor: "rgba(13,10,6,0.5)", borderRadius: 13, paddingVertical: 5, paddingHorizontal: 11 }}><BackLabel /></Pressable>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(13,10,6,0.5)", borderRadius: 13, paddingVertical: 5, paddingHorizontal: 11, borderWidth: 1, borderColor: "rgba(201,168,76,0.3)" }}>
              <GameIcon name="akce" size={12} color={C.gold} />
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money}</Text>
            </View>
          </View>
          {/* başlık bloğu */}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 14, alignItems: "center" }}>
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 3, color: C.goldDim, textTransform: "uppercase" }}>{t("scr.mulkler")}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 24, color: C.parchment, letterSpacing: 1.5, marginTop: 3 }}>{t("scr.mulkler")}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
              <View style={{ width: 18, height: 1, backgroundColor: C.goldDim, opacity: 0.7 }} />
              <View style={{ width: 5, height: 5, backgroundColor: C.gold, transform: [{ rotate: "45deg" }] }} />
              <View style={{ width: 18, height: 1, backgroundColor: C.goldDim, opacity: 0.7 }} />
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentDim, marginTop: 6, textAlign: "center" }}>{t("mulk.hint")}</Text>
          </View>
        </ImageBackground>

        <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
        {/* Özet kartı */}
        <View style={{ flexDirection: "row", backgroundColor: C.cardHi, borderWidth: 1, borderColor: C.borderHi, borderRadius: 13, overflow: "hidden", marginBottom: 15 }}>
          {[
            { lab: t("mulk.netWorth"), val: `${netWorth} ⚜`, col: C.gold },
            { lab: t("mulk.income"), val: `+${estIncome} ⚜`, col: C.sage },
            { lab: t("mulk.countLabel"), val: `${p.properties.length} · ${totalWorkers}`, col: C.parchment },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: C.border }}>
              <Text style={{ fontFamily: F.display, fontSize: 7.5, letterSpacing: 1, color: C.parchmentMuted }}>{s.lab.toUpperCase()}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 15, color: s.col, marginTop: 4 }}>{s.val}</Text>
            </View>
          ))}
        </View>

        {/* Mülklerim */}
        <Panel title={t("mulk.owned")} noPad>
          {p.properties.length === 0 ? (
            <View style={{ alignItems: "center", padding: 18 }}>
              <Image source={MULK_BOS} style={{ width: 132, height: 80, borderRadius: 10, borderWidth: 1, borderColor: C.borderHi }} resizeMode="cover" />
              <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment, marginTop: 12 }}>{t("mulk.noneTitle")}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, textAlign: "center", marginTop: 6, lineHeight: 17, paddingHorizontal: 8 }}>{t("mulk.noneBody")}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 1, color: C.gold, marginTop: 12 }}>↓ {t("mulk.noneCta")} ↓</Text>
            </View>
          ) : p.properties.map((pr, i) => {
            const ty = PROPERTY_TYPES[pr.type]; if (!ty) return null;
            const lvl = pr.level || 1;
            const inc = propIncome(pr.type, lvl);
            const slots = propWorkerSlots(pr);
            const cc = condColor(pr.cond);
            const trend = ((pr.ledger || []).slice(-1)[0]?.net ?? 0) >= 0 ? C.sage : C.blood;
            const open = manageIdx === i;
            return (
              <View key={i} style={{ paddingHorizontal: 11, paddingVertical: 11, borderBottomWidth: i === p.properties.length - 1 ? 0 : 1, borderBottomColor: C.border }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                  <Image source={mulkImage(pr.type)} style={{ width: 58, height: 58, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi }} resizeMode="cover" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{t("pt." + pr.type)} <Text style={{ fontSize: 9, color: C.goldDim }}>{t("mulk.level")} {lvl}</Text></Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 11, color: C.sage }}>+{inc} {t("mulk.perMonth")}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <GameIcon name="iliskiler" size={11} color={C.parchmentDim} />
                        <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentDim }}>{(pr.workers?.length || 0)}/{slots}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: cc }}>{pr.cond}%</Text>
                    <Pressable onPress={() => { hap("tap"); setManageIdx(open ? null : i); setHireOpen(null); }} style={{ paddingVertical: 5, paddingHorizontal: 11, borderRadius: 7, borderWidth: 1, borderColor: pr.cond < 45 ? "rgba(200,64,64,0.5)" : "rgba(201,168,76,0.5)", backgroundColor: pr.cond < 45 ? "rgba(200,64,64,0.12)" : "rgba(201,168,76,0.12)" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 0.5, color: pr.cond < 45 ? C.blood : C.gold }}>{open ? "⌄" : t("mulk.manage")}</Text>
                    </Pressable>
                  </View>
                </View>
                {/* kondisyon çubuğu + gelir trendi */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginTop: 8 }}>
                  <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <View style={{ width: `${pr.cond}%`, height: 5, borderRadius: 3, backgroundColor: cc }} />
                  </View>
                  <Spark ledger={pr.ledger} color={trend} />
                </View>

                {/* Yönet paneli — onar / büyüt / işçiler */}
                {open && (() => {
                  const rc = repairCost(pr);
                  const uc = propUpgradeCost(pr);
                  const town = townNpcsOf(state, pr.loc, lang);
                  const hired = (pr.workers || []).map((id) => town.find((nn) => nn.id === id)).filter(Boolean) as NonNullable<ReturnType<typeof town.find>>[];
                  const avail = town.filter((nn) => !(pr.workers || []).includes(nn.id));
                  const ho = hireOpen === i;
                  return (
                    <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, gap: 9 }}>
                      {(pr.cond < 100 || lvl < PROP_MAX_LEVEL) && (
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {pr.cond < 100 && (
                            <Pressable onPress={() => { hap("tap"); apply((s) => repairProperty(s, i)); }} disabled={p.money < rc} style={actBtn(p.money < rc)}>
                              <Text style={actTxt(p.money < rc)}>{t("mulk.repair")} {rc}⚜</Text>
                            </Pressable>
                          )}
                          {lvl < PROP_MAX_LEVEL && (
                            <Pressable onPress={() => { hap("tap"); apply((s) => upgradeProperty(s, i)); }} disabled={p.money < uc} style={actBtn(p.money < uc)}>
                              <Text style={actTxt(p.money < uc)}>{t("mulk.upgrade")} {uc}⚜</Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <GameIcon name="iliskiler" size={11} color={C.parchmentMuted} />
                        <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 0.5, color: C.parchmentMuted }}>{t("mulk.workers").toUpperCase()} {hired.length}/{slots}</Text>
                        <View style={{ flex: 1 }} />
                        {hired.length < slots && (
                          <Pressable onPress={() => { hap("tap"); setHireOpen(ho ? null : i); }} style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 6, borderWidth: 1, borderColor: "rgba(127,166,106,0.5)", backgroundColor: "rgba(127,166,106,0.12)" }}>
                            <Text style={{ fontFamily: F.display, fontSize: 9, color: C.sage }}>{ho ? "⌄" : t("mulk.hire")}</Text>
                          </Pressable>
                        )}
                      </View>
                      {hired.length > 0 && (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                          {hired.map((nn) => (
                            <Pressable key={nn.id} onPress={() => { hap("tap"); apply((s) => fireWorker(s, i, nn.id)); }} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg }}>
                              <Portre age={nn.age} gender={nn.gender} size={18} ring={false} seed={nn.id} />
                              <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchment }}>{nn.name.split(" ")[0]}</Text>
                              <Text style={{ color: C.blood, fontSize: 11 }}>×</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                      {ho && (
                        <View>
                          <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentMuted, marginBottom: 4 }}>{t("mulk.wageNote")}</Text>
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

        {/* Bu şehirde satın al — 5 tip illüstrasyonlu */}
        <Panel title={`${t("mulk.buyHere")} · ${placeName(here, lang)}`}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {Object.entries(PROPERTY_TYPES).map(([id, ty]) => {
              const cost = propBuyCost(state, id);
              const can = p.money >= cost;
              return (
                <View key={id} style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 9, overflow: "hidden" }}>
                  <Image source={mulkImage(id)} style={{ width: "100%", height: 42 }} resizeMode="cover" />
                  <View style={{ paddingHorizontal: 3, paddingTop: 4, paddingBottom: 5, alignItems: "center" }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 8.5, color: C.parchment }}>{t("pt." + id)}</Text>
                    <Text style={{ fontFamily: F.serif, fontSize: 8, color: C.sage, marginTop: 1 }}>+{ty.income}</Text>
                    <Pressable onPress={() => { hap("tap"); apply((s) => buyProperty(s, id)); }} disabled={!can} style={{ marginTop: 4, paddingVertical: 4, borderRadius: 5, borderWidth: 1, borderColor: can ? "rgba(201,168,76,0.5)" : C.border, backgroundColor: can ? "rgba(201,168,76,0.12)" : C.bg, alignSelf: "stretch", alignItems: "center" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 8, color: can ? C.gold : C.parchmentMuted }}>{cost}⚜</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentMuted, marginTop: 10 }}>{t("mulk.priceNote")}</Text>
        </Panel>
        </View>
      </ScrollView>
    </View>
  );
}
