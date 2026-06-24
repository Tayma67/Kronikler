import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { buyItem, sellItem, launchCaravan, negotiatedBuy, negotiatedSell, bargainBase, bargainSellBase, bargainChance, marketPrice, econKey, goodPriceMult, MARKET_EVENTS, bestQualityTier, QUALITY_LABEL, sellerPersonaOf, factionLocalFavor, goodMarketTag, goodTrend, citySpecialtyIdx, loanCapacity, loanRate, borrow, repay, depositCoin, withdrawCoin, DEPOSIT_ANNUAL_YIELD } from "../../lib/game";
import { marketGoods, locSeed } from "../../lib/world";
import { useI18n } from "../../lib/i18n";
import { placeName } from "../../lib/locale-data";
import { hap } from "../../lib/haptics";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { BackLabel } from "../../lib/ui";

// Pazar malı ikonu — eşya türüne göre (emoji yerine GameIcon).
function marketItemIcon(g: { kind?: string; heal?: number; feed?: number }): string {
  switch (g.kind) {
    case "silah": return "silah";
    case "kalkan": return "kite";
    case "zirh": return "shield";
    case "baslik": return "hood";
    case "eldiven": return "fist";
    case "ayakkabi": return "boot";
    case "kiyafet": return "wool";
  }
  if (g.heal) return "saglik";
  if (g.feed || g.kind === "yiyecek") return "ye";
  return "menu";
}

const CARAVAN_AMOUNTS = [50, 120, 300];
// Pazar tezgâhları — mallar türüne göre dükkânlara ayrılır (pazar hissi).
const STALLS = [
  { kinds: ["yiyecek"], icon: "ye", key: "paz.stall.food", tone: C.sage },
  { kinds: ["esya"], icon: "menu", key: "paz.stall.goods", tone: C.gold },
  { kinds: ["silah"], icon: "silah", key: "paz.stall.arms", tone: C.ember },
  { kinds: ["zirh", "kalkan", "baslik", "eldiven", "ayakkabi"], icon: "shield", key: "paz.stall.armor", tone: C.azure },
  { kinds: ["kiyafet"], icon: "wool", key: "paz.stall.attire", tone: C.ink },
] as const;

// Vercel "Panel" — başlık (ikon + ad + ton) + gövde.
function Panel({ title, icon, tone, children }: { title: string; icon: string; tone: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: tone + "33", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: tone + "12" }}>
        <GameIcon name={icon} size={15} color={tone} />
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5, color: tone, textTransform: "uppercase" }}>{title}</Text>
      </View>
      <View style={{ padding: 12 }}>{children}</View>
    </View>
  );
}
function Coin({ v }: { v: number }) {
  return <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{v} ⚜</Text>;
}

export default function Pazar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  const [barg, setBarg] = useState<null | { id: string; icon: string; name: string; base: number; price: number; patience: number; msg: string; done: boolean; sell?: boolean }>(null);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const econ = state.econ || 1;
  const goods = marketGoods(locSeed(p.location_name)).map((g) => { const m = goodPriceMult(state, g.id); return { ...g, buy: Math.max(1, Math.round(marketPrice(g.buy, econ) * m)), sell: Math.max(1, Math.round(marketPrice(g.sell, econ) * m)), pm: m }; });
  const mev = state.marketEvent && state.marketEvent.until > state.turn ? MARKET_EVENTS.find((e) => e.key === state.marketEvent!.key) : null;
  const econColor = econ >= 1.06 ? C.blood : econ <= 0.94 ? C.sage : C.parchmentMuted;

  // ── Pazarlık müzakeresi (anlık alım/satım yok; sabır ibresiyle tur tur) ──
  // sell=false: fiyatı tabana indir (alım). sell=true: fiyatı tavana çıkar (satım).
  const openBarg = (g: { id: string; kind?: string; heal?: number; feed?: number }, sell = false) => {
    hap("tap");
    const base = sell ? bargainSellBase(state, g.id) : bargainBase(state, g.id);
    setBarg({ id: g.id, icon: marketItemIcon(g), name: t("it." + g.id), base, price: base, patience: 100, msg: t("paz.opening"), done: false, sell });
  };
  const doHaggle = () => {
    if (!barg || barg.done) return;
    const ok = Math.random() < bargainChance(state);
    if (barg.sell) {
      const ceil = Math.round(barg.base * 1.4);
      if (ok && barg.price < ceil) {
        hap("success");
        const newPrice = Math.min(ceil, Math.round(barg.price * 1.1));
        const patience = Math.max(0, barg.patience - 12);
        const atCeil = newPrice >= ceil;
        setBarg({ ...barg, price: newPrice, patience, msg: atCeil ? t("paz.floor") : t("paz.softened"), done: atCeil || patience <= 0 });
      } else { hap("warning"); const patience = Math.max(0, barg.patience - 30); setBarg({ ...barg, patience, msg: patience <= 0 ? t("paz.walkedOff") : t("paz.firm"), done: patience <= 0 }); }
      return;
    }
    const floor = Math.max(1, Math.round(barg.base * 0.6));
    if (ok && barg.price > floor) {
      hap("success");
      const newPrice = Math.max(floor, Math.round(barg.price * 0.9));
      const patience = Math.max(0, barg.patience - 12);
      const atFloor = newPrice <= floor;
      setBarg({ ...barg, price: newPrice, patience, msg: atFloor ? t("paz.floor") : t("paz.softened"), done: atFloor || patience <= 0 });
    } else {
      hap("warning");
      const patience = Math.max(0, barg.patience - 30);
      setBarg({ ...barg, patience, msg: patience <= 0 ? t("paz.walkedOff") : t("paz.firm"), done: patience <= 0 });
    }
  };
  // Blöf: yüksek risk/ödül — tutarsa büyük kazanım, tutmazsa satıcı alınır, fiyat kötüleşir.
  const doBluff = () => {
    if (!barg || barg.done) return;
    const ok = Math.random() < bargainChance(state) * 0.7; // pazarlıktan riskli
    if (barg.sell) {
      const ceil = Math.round(barg.base * 1.4);
      if (ok && barg.price < ceil) {
        hap("success");
        const newPrice = Math.min(ceil, Math.round(barg.price * 1.22));
        const patience = Math.max(0, barg.patience - 18);
        const atCeil = newPrice >= ceil;
        setBarg({ ...barg, price: newPrice, patience, msg: atCeil ? t("paz.floor") : t("paz.bluffWin"), done: atCeil || patience <= 0 });
      } else {
        hap("warning");
        const patience = Math.max(0, barg.patience - 45);
        const newPrice = Math.max(Math.round(barg.base * 0.9), Math.round(barg.price * 0.95)); // satıcı alınır, teklif düşer
        setBarg({ ...barg, price: newPrice, patience, msg: patience <= 0 ? t("paz.walkedOff") : t("paz.bluffFail"), done: patience <= 0 });
      }
      return;
    }
    const floor = Math.max(1, Math.round(barg.base * 0.6));
    if (ok && barg.price > floor) {
      hap("success");
      const newPrice = Math.max(floor, Math.round(barg.price * 0.78));
      const patience = Math.max(0, barg.patience - 18);
      const atFloor = newPrice <= floor;
      setBarg({ ...barg, price: newPrice, patience, msg: atFloor ? t("paz.floor") : t("paz.bluffWin"), done: atFloor || patience <= 0 });
    } else {
      hap("warning");
      const patience = Math.max(0, barg.patience - 45);
      const newPrice = Math.min(Math.round(barg.base * 1.1), Math.round(barg.price * 1.05));
      setBarg({ ...barg, price: newPrice, patience, msg: patience <= 0 ? t("paz.walkedOff") : t("paz.bluffFail"), done: patience <= 0 });
    }
  };
  const confirmBuy = () => {
    if (!barg) return;
    hap("advance");
    if (barg.sell) apply((s) => negotiatedSell(s, barg.id, barg.price));
    else apply((s) => negotiatedBuy(s, barg.id, barg.price));
    setBarg(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Coin v={p.money} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        {/* PageHeader */}
        <View style={{ alignItems: "center", marginBottom: 14 }}>
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 3, color: C.goldDim, textTransform: "uppercase" }}>{t("scr.pazar")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 22, color: C.parchment, letterSpacing: 1, marginTop: 4, textAlign: "center" }}>{placeName(p.location_name, lang)}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}><GameIcon name="pazar" size={12} color={econColor} /><Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: econColor }}>{t("econ." + econKey(econ))}</Text></View>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.sage, marginTop: 2 }}>{t("paz.spec")}: {t("spec." + citySpecialtyIdx(state, p.location_name))}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, alignSelf: "stretch" }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
            <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: "45deg" }], marginHorizontal: 8 }} />
            <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
          </View>
        </View>

        {/* Aktif piyasa olayı */}
        {mev && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: mev.mult > 1 ? "rgba(200,64,64,0.10)" : "rgba(127,166,106,0.10)", borderWidth: 1, borderColor: mev.mult > 1 ? "rgba(200,64,64,0.4)" : "rgba(127,166,106,0.4)", borderRadius: 10, padding: 11, marginBottom: 12 }}>
            <GameIcon name={mev.mult > 1 ? "coins" : "wheat"} size={14} color={mev.mult > 1 ? C.blood : C.sage} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12, color: C.parchment }}>{mev.text}</Text>
          </View>
        )}

        {/* Kervan paneli */}
        <Panel title={t("paz.caravanTitle")} icon="camel" tone={C.ember}>
          {state.caravan ? (
            <>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: state.caravan.route ? 9 : 0 }}>
                {t("paz.caravanActive").replace("%d", placeName(state.caravan.dest, lang)).replace("%c", String(state.caravan.invested))}
              </Text>
              {state.caravan.route && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 3 }}>
                  {state.caravan.route.map((stop, i) => {
                    const cur = i === (state.caravan!.step ?? 0);
                    const done = i < (state.caravan!.step ?? 0);
                    return (
                      <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                        {i > 0 && <Text style={{ color: done ? C.ember : C.border, fontSize: 11, marginHorizontal: 1 }}>→</Text>}
                        {cur && <GameIcon name="camel" size={11} color={C.ember} />}
                        <Text style={{ fontFamily: cur ? F.display : F.serif, fontSize: cur ? 11.5 : 10.5, color: cur ? C.ember : done ? C.parchmentMuted : C.parchmentDim }}>
                          {placeName(stop, lang)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
              {!!state.caravan.lost && state.caravan.lost > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 }}><GameIcon name="crossed-swords" size={10} color={C.blood} /><Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 10.5, color: C.blood }}>{t("paz.caravanLost").replace("%c", String(state.caravan.lost))}</Text></View>
              )}
            </>
          ) : (
            <>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, marginBottom: 9 }}>{t("paz.caravanHint")}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {CARAVAN_AMOUNTS.map((amt) => (
                  <Pressable key={amt} disabled={p.money < amt} onPress={() => { hap('advance'); apply((s) => launchCaravan(s, amt)); }} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: p.money < amt ? C.border : "rgba(224,90,48,0.5)", backgroundColor: p.money < amt ? C.bg : "rgba(224,90,48,0.12)" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 12, color: p.money < amt ? C.parchmentMuted : C.ember }}>{amt}⚜</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </Panel>

        {/* Sarraf (tefeci) paneli — ödünç al / borç öde */}
        {p.age >= 16 && (() => {
          const cap = loanCapacity(state);
          const debt = Math.round(p.debt || 0);
          const dep = Math.round(p.deposit || 0);
          const ratePct = Math.round(loanRate(state) * 1000) / 10;
          const borrowAmts = [250, 1000].filter((a) => a <= cap);
          const repayAmts = [250, 1000].filter((a) => a <= debt && a <= p.money);
          return (
            <Panel title={t("paz.sarrafTitle")} icon="coins" tone={C.gold}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted }}>{t("paz.sarrafRate").replace("%r", String(ratePct))}</Text>
                {debt > 0 ? <Text style={{ fontFamily: F.display, fontSize: 12, color: C.blood }}>{t("paz.debt")}: {debt} ⚜</Text> : null}
              </View>
              <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1, color: C.parchmentDim, textTransform: "uppercase", marginBottom: 6 }}>{t("paz.borrow")} · {t("paz.borrowCap").replace("%c", String(cap))}</Text>
              {cap > 0 ? (
                <View style={{ flexDirection: "row", gap: 8, marginBottom: debt > 0 ? 12 : 0 }}>
                  {borrowAmts.map((amt) => (
                    <Pressable key={amt} onPress={() => { hap("advance"); apply((s) => borrow(s, amt)); }} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.12)" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{amt}⚜</Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => { hap("advance"); apply((s) => borrow(s, cap)); }} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.12)" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>{t("paz.max")}</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentDim, marginBottom: debt > 0 ? 12 : 0 }}>{t("paz.noCredit")}</Text>
              )}
              {debt > 0 ? (
                <>
                  <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1, color: C.parchmentDim, textTransform: "uppercase", marginBottom: 6 }}>{t("paz.repay")}</Text>
                  {p.money > 0 ? (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {repayAmts.map((amt) => (
                        <Pressable key={amt} onPress={() => { hap("tap"); apply((s) => repay(s, amt)); }} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(127,166,106,0.5)", backgroundColor: "rgba(127,166,106,0.12)" }}>
                          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.sage }}>{amt}⚜</Text>
                        </Pressable>
                      ))}
                      <Pressable onPress={() => { hap("tap"); apply((s) => repay(s, Math.min(p.money, debt))); }} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(127,166,106,0.5)", backgroundColor: "rgba(127,166,106,0.12)" }}>
                        <Text style={{ fontFamily: F.display, fontSize: 11, color: C.sage }}>{t("paz.repayAll")}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentDim }}>{t("paz.noCash")}</Text>
                  )}
                </>
              ) : null}
              {/* Emanet (safekeeping): âtıl serveti sarrafta sakla — yağma/hırsızlıktan emin, küçük getiri */}
              <View style={{ height: 1, backgroundColor: C.border, marginVertical: 11 }} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1, color: C.parchmentDim, textTransform: "uppercase" }}>{t("paz.deposit")} · %{Math.round(DEPOSIT_ANNUAL_YIELD * 100)}/{t("paz.perYear")}</Text>
                {dep > 0 ? <Text style={{ fontFamily: F.display, fontSize: 12, color: C.sage }}>{t("paz.depBal")}: {dep} ⚜</Text> : null}
              </View>
              {(p.money > 0 || dep > 0) ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[250, 1000].filter((a) => a <= p.money).map((amt) => (
                    <Pressable key={amt} onPress={() => { hap("tap"); apply((s) => depositCoin(s, amt)); }} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(127,166,106,0.5)", backgroundColor: "rgba(127,166,106,0.12)" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 12, color: C.sage }}>+{amt}⚜</Text>
                    </Pressable>
                  ))}
                  {dep > 0 ? (
                    <Pressable onPress={() => { hap("tap"); apply((s) => withdrawCoin(s, dep)); }} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.12)" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>{t("paz.withdrawAll")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentDim }}>{t("paz.noCash")}</Text>
              )}
            </Panel>
          );
        })()}

        {/* ── Pazar: tezgâh tezgâh ayrılmış dükkânlar ── */}
        {STALLS.map((stall) => {
          const items = goods.filter((g) => (stall.kinds as readonly string[]).includes(g.kind || "esya"));
          if (items.length === 0) return null;
          return (
            <Panel key={stall.key} title={t(stall.key)} icon={stall.icon} tone={stall.tone}>
              {items.map((g, gi) => {
                const have = p.inventory[g.id] || 0;
                return (
                  <View key={g.id} style={{ paddingVertical: 9, borderBottomWidth: gi === items.length - 1 ? 0 : 1, borderBottomColor: C.border }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: stall.tone + "14", borderWidth: 1, borderColor: stall.tone + "33", alignItems: "center", justifyContent: "center" }}>
                        <GameIcon name={marketItemIcon(g)} size={18} color={stall.tone} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchment }}>{t("it." + g.id)}</Text>
                        {(g.power || g.defense || g.charisma || g.prestige) ? (
                          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7, marginTop: 1, marginBottom: 1 }}>
                            {g.power ? <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><GameIcon name="silah" size={9} color={C.ember} /><Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.ember }}>+{g.power}</Text></View> : null}
                            {g.defense ? <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><GameIcon name="shield" size={9} color={C.azure} /><Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.azure }}>+{g.defense}</Text></View> : null}
                            {g.charisma ? <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><GameIcon name="karizma" size={9} color={C.ember} /><Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.ember }}>+{g.charisma}</Text></View> : null}
                            {g.prestige ? <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><GameIcon name="orgutler" size={9} color={C.gold} /><Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.gold }}>+{g.prestige}</Text></View> : null}
                            {g.wclass ? <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 0.5, color: C.parchmentDim, textTransform: "uppercase" }}>{t("wc." + g.wclass)}{g.twoHanded ? " · 2E" : ""}</Text> : null}
                          </View>
                        ) : null}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{t("paz.have")} {have}</Text>
                          {(() => { const bq = have > 0 ? bestQualityTier(p, g.id) : "siradan"; return bq !== "siradan" ? (
                            <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 0.5, color: bq === "kusurlu" ? C.blood : C.gold }}>✦ {QUALITY_LABEL[bq]}</Text>
                          ) : null; })()}
                          {(() => {
                            const tag = goodMarketTag(state, p.location_name, g.id);
                            if (!tag) return null;
                            const tone = tag === "bol" ? C.sage : tag === "kit" ? C.ember : C.parchmentDim;
                            const trend = goodTrend(state, p.location_name, g.id);
                            return (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: tone + "55", backgroundColor: tone + "14" }}>
                                <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 0.5, color: tone }}>{t("paz." + tag)}</Text>
                                {trend !== 0 && <Text style={{ fontSize: 8, color: trend > 0 ? C.blood : C.sage }}>{trend > 0 ? "▲" : "▼"}</Text>}
                              </View>
                            );
                          })()}
                          {(() => {
                            const prev = state.player.priceMem?.[p.location_name + "|" + g.id];
                            return prev != null && prev !== g.buy ? (
                              <Text style={{ fontFamily: F.serifItalic, fontSize: 9.5, color: g.buy > prev ? C.blood : C.sage }}>{t("paz.prev")} {prev}⚜</Text>
                            ) : null;
                          })()}
                        </View>
                      </View>
                      <Coin v={g.buy} />
                    </View>
                    <View style={{ flexDirection: "row", gap: 7, marginTop: 8 }}>
                      <Pressable onPress={() => { hap('tap'); apply((s) => buyItem(s, g.id)); }} disabled={p.money < g.buy} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: p.money < g.buy ? C.bg : "rgba(201,168,76,0.12)" }}>
                        <Text style={{ fontFamily: F.display, fontSize: 11, color: p.money < g.buy ? C.parchmentMuted : C.gold }}>{t("misc.buy")} {g.buy}⚜</Text>
                      </Pressable>
                      <Pressable onPress={() => openBarg(g)} disabled={p.money < g.buy} style={{ alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", backgroundColor: C.bg }}>
                        <Text style={{ fontFamily: F.display, fontSize: 10.5, color: p.money < g.buy ? C.parchmentMuted : C.goldDim }}>{t("misc.bargain")}</Text>
                      </Pressable>
                    </View>
                    {have > 0 && (
                      <View style={{ flexDirection: "row", gap: 7, marginTop: 7 }}>
                        <Pressable onPress={() => { hap('tap'); apply((s) => sellItem(s, g.id)); }} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 7, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
                          <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentDim }}>{t("misc.sell")} {g.sell}⚜</Text>
                        </Pressable>
                        <Pressable onPress={() => openBarg(g, true)} style={{ alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: "rgba(127,166,106,0.4)", backgroundColor: C.bg }}>
                          <Text style={{ fontFamily: F.display, fontSize: 10.5, color: C.sage }}>{t("paz.sellHaggle")}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </Panel>
          );
        })}
      </ScrollView>

      {/* ── PAZARLIK MÜZAKERE MODALI ── */}
      <Modal visible={!!barg} transparent animationType="fade" onRequestClose={() => setBarg(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(8,5,2,0.82)", justifyContent: "center", paddingHorizontal: 24 }}>
          {barg && (() => {
            const saved = barg.sell ? barg.price - barg.base : barg.base - barg.price;
            const pct = Math.max(0, Math.min(100, barg.patience));
            const patCol = pct > 55 ? C.sage : pct > 25 ? C.gold : C.blood;
            const canAfford = barg.sell || p.money >= barg.price;
            return (
              <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderRadius: 16, padding: 18 }}>
                <View style={{ alignItems: "center", marginBottom: 12 }}>
                  <GameIcon name={barg.icon} size={32} color={C.gold} />
                  <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, marginTop: 6, letterSpacing: 0.5 }}>{barg.name}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2, color: C.goldDim, marginTop: 2 }}>{t("paz.bargainWith").toUpperCase()}</Text>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>{t("paz.seller." + sellerPersonaOf(state).id)}</Text>
                  {(() => { const fv = factionLocalFavor(state); return fv !== 0 ? <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: fv > 0 ? C.sage : C.blood, marginTop: 2 }}>{t(fv > 0 ? "fac.terrFriend" : "fac.terrFoe")}</Text> : null; })()}
                </View>

                {/* Fiyat */}
                <View style={{ alignItems: "center", marginBottom: 12 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 30, color: canAfford ? C.gold : C.blood }}>{barg.price} ⚜</Text>
                  {saved > 0 && <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.sage, marginTop: 2 }}>{barg.sell ? "+" : "−"}{saved} ⚜ ({Math.round((saved / barg.base) * 100)}%)</Text>}
                </View>

                {/* Pazarcının sabrı (ibre) */}
                <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.parchmentMuted, marginBottom: 4 }}>{t("paz.patience").toUpperCase()}</Text>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 10 }}>
                  <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: patCol }} />
                </View>

                {/* Pazarcının repliği */}
                <View style={{ minHeight: 38, justifyContent: "center", marginBottom: 12, paddingHorizontal: 4 }}>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.parchment, textAlign: "center", lineHeight: 19 }}>“{barg.msg}”</Text>
                </View>

                {/* Aksiyonlar */}
                {!barg.done && (
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                    <Pressable onPress={doHaggle} style={{ flex: 1, paddingVertical: 12, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.12)", alignItems: "center" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.gold }}>{t("paz.haggle")}</Text>
                    </Pressable>
                    <Pressable onPress={doBluff} style={{ flex: 1, paddingVertical: 12, borderRadius: 9, borderWidth: 1, borderColor: "rgba(123,79,175,0.5)", backgroundColor: "rgba(123,79,175,0.12)", alignItems: "center" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.ink }}>{t("paz.bluff")}</Text>
                    </Pressable>
                  </View>
                )}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable onPress={() => { hap("tap"); setBarg(null); }} style={{ flex: 1, paddingVertical: 12, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.bg, alignItems: "center" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted }}>{t("paz.give")}</Text>
                  </Pressable>
                  <Pressable onPress={confirmBuy} disabled={!canAfford} style={{ flex: 2, paddingVertical: 12, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.6)", backgroundColor: canAfford ? C.gold : C.bg, alignItems: "center" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: canAfford ? "#1a1206" : C.parchmentMuted }}>{barg.sell ? t("paz.sellAt") : t("paz.buyAt")} {barg.price} ⚜</Text>
                  </Pressable>
                </View>
              </View>
            );
          })()}
        </View>
      </Modal>
    </View>
  );
}
