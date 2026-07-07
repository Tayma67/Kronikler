import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../../lib/i18n";
import { useGame } from "../../lib/store";
import { useMp } from "../../lib/mp/store";
import { GameState } from "../../lib/game";
import { SharedIntent, Bond, PlayerPublic, SPY_COST, SABOTAGE_COST, ASSASSINATE_COST, BRIBE_COST, SLANDER_COST, LOAN_DEFAULT, ASSASSINATE_MIN_AGE, COURT_NPC_COST, TURN_NPC_COST, MEDIATE_NPC_COST } from "../../lib/mp/protocol";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { BackLabel } from "../../lib/ui";

const pf = (s: string, ...a: (string | number)[]) => a.reduce<string>((acc, v, i) => acc.replace("%" + (i + 1), String(v)), s);

// İki oyuncu arasındaki bağı snapshot'tan oku (kanonik a<b sırası).
function bondOf(bonds: Bond[], x: string, y: string): Bond | undefined {
  const [a, b] = x < y ? [x, y] : [y, x];
  return bonds.find((d) => d.a === a && d.b === b);
}

export default function Diplomasi() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { state: s, apply, mpMode } = useGame();
  const { guestId, snapshot, sendIntent } = useMp();
  const [sel, setSel] = useState<string | null>(null);
  const [selNpc, setSelNpc] = useState<string | null>(null);
  const [npcTarget, setNpcTarget] = useState<string | null>(null);

  if (!mpMode || !s || !snapshot || !guestId) {
    return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted }}>{t("mp.connecting")}</Text>
    </View>;
  }

  const p = s.player;
  const money = p.money;
  const others = snapshot.players.filter((x) => x.id !== guestId && !x.dead).sort((a, b) => b.power - a.power);
  const myOffers = snapshot.offers.filter((o) => o.to === guestId);
  const iAmBey = snapshot.beyliks.some((b) => b.beyId === guestId);
  const myBeylikId = snapshot.players.find((x) => x.id === guestId)?.beylikId ?? null;

  // Paylaşımlı eylemin altın bedelini yerelde kes (sunucu riski/çekişmeyi çözer).
  const spend = (cost: number) => apply((prev) => { const ns: GameState = JSON.parse(JSON.stringify(prev)); ns.player.money = Math.max(0, ns.player.money - cost); return ns; });
  const act = (i: SharedIntent, cost = 0) => { if (p.dead) return; if (cost > money) return; if (cost) spend(cost); hap("tap"); sendIntent(i); };

  const honorTag = (h: number) => h <= -25 ? t("mp.soc.traitor") : h >= 40 ? t("mp.soc.honored") : null;
  const pactTag = (pact: Bond["pact"]) => pact === "alliance" ? t("mp.soc.pactAlly") : pact === "marriage" ? t("mp.soc.pactKin") : pact === "war" ? t("mp.soc.pactWar") : null;

  const target = sel ? others.find((x) => x.id === sel) : null;
  const bond = target ? bondOf(snapshot.bonds, guestId, target.id) : undefined;
  const hasPact = !!bond?.pact;
  // Sunucu, müttefik/eşe düşmanca eylemi reddeder (pactProtected) ama altın istemcide peşin kesildiği için
  // iade yok — aynı kuralı tuşta uygula ki oyuncu boşuna para yakmasın. (savaş paktı korumaz.)
  const pactShield = bond?.pact === "alliance" || bond?.pact === "marriage";
  // Sunucudaki MP onuru (adjustHonor) yereldeki tek-oyunculu onurdan ayrıdır — başlıkta herkesle aynı gerçeği göster.
  const myHonor = snapshot.players.find((x) => x.id === guestId)?.honor ?? p.honor ?? 0;
  const targetInOtherBeylik = target && target.beylikId && target.beylikId !== myBeylikId && !snapshot.beyliks.some((b) => b.beyId === target.id);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1, color: C.parchmentMuted }}>{pf(t("mp.soc.myHonor"), Math.round(myHonor))} · {money} {t("mp.soc.coin")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}>
        <Text style={{ fontFamily: F.display, fontSize: 16, letterSpacing: 1, color: C.gold, marginBottom: 2 }}>{t("mp.soc.title")}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: 12 }}>{t("mp.soc.subtitle")}</Text>

        {(() => { const h = (snapshot.hostages || []).find((x) => x.captive === guestId); if (!h) return null; const cap = snapshot.players.find((x) => x.id === h.captor); return (
          <View style={{ borderWidth: 1, borderColor: "rgba(168,52,52,0.6)", backgroundColor: "rgba(168,52,52,0.10)", borderRadius: 9, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchment, lineHeight: 18 }}>{pf(t("mp.hostage.banner"), cap?.name || "?", h.ask)}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Btn label={pf(t("mp.hostage.payBtn"), h.ask)} disabled={money < h.ask} onPress={() => act({ k: "payRansom" }, h.ask)} />
            </View>
          </View>
        ); })()}

        {(() => { const until = snapshot.watches?.[guestId || ""] || 0; const left = until - snapshot.turn; return (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            {left > 0 ? (
              <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 11, color: C.sage }}>{pf(t("mp.watch.active"), left)}</Text>
            ) : (
              <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{t("mp.watch.pitch")}</Text>
            )}
            <Btn label={pf(t("mp.watch.hireBtn"), 250)} disabled={money < 250} onPress={() => act({ k: "hireWatch" }, 250)} />
          </View>
        ); })()}

        {/* Bana gelen teklifler */}
        {myOffers.length > 0 && (
          <>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 8 }}>{t("mp.soc.offersIn")}</Text>
            {myOffers.map((o) => (
              <View key={o.id} style={{ borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", borderRadius: 9, padding: 10, marginBottom: 8, backgroundColor: C.card }}>
                <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchment, marginBottom: 8 }}>
                  {pf(t("mp.soc.offer." + o.kind), o.fromName, o.amount ?? 0)}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable onPress={() => act({ k: "respondOffer", offerId: o.id, accept: true })} style={[mb, { borderColor: "rgba(127,166,106,0.6)", backgroundColor: "rgba(127,166,106,0.12)" }]}>
                    <Text style={[mt, { color: C.sage }]}>{t("mp.soc.accept")}</Text></Pressable>
                  <Pressable onPress={() => act({ k: "respondOffer", offerId: o.id, accept: false })} style={[mb, { borderColor: "rgba(200,64,64,0.5)" }]}>
                    <Text style={[mt, { color: C.blood }]}>{t("mp.soc.decline")}</Text></Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Gönderdiğim teklifler — kör gönderim olmasın: bekleyenler görünür (salt bilgi, tuş yok) */}
        {(() => { const sent = snapshot.offers.filter((o) => o.from === guestId); return sent.length > 0 ? (
          <>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 8 }}>{t("mp.soc.offersOut")}</Text>
            {sent.map((o) => (
              <View key={o.id} style={{ borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 10, marginBottom: 8, backgroundColor: C.card, opacity: 0.85 }}>
                <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted }}>
                  {pf(t("mp.soc.offerOut." + o.kind), snapshot.players.find((x) => x.id === o.to)?.name || "?", o.amount ?? 0)} · {t("mp.soc.pending")}
                </Text>
              </View>
            ))}
          </>
        ) : null; })()}

        {/* Sıralama / haneler */}
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 6, marginBottom: 8 }}>{t("mp.soc.standings")}</Text>
        {others.length === 0 && <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted }}>{t("mp.empty")}</Text>}
        {others.map((x, i) => {
          const bd = bondOf(snapshot.bonds, guestId, x.id);
          const ht = honorTag(x.honor ?? 0); const pt = pactTag(bd?.pact ?? null);
          const open = sel === x.id;
          return (
            <View key={x.id} style={{ borderWidth: 1, borderColor: open ? "rgba(201,168,76,0.6)" : C.border, borderRadius: 9, marginBottom: 8, backgroundColor: C.card, overflow: "hidden" }}>
              <Pressable onPress={() => { hap("tap"); setSel(open ? null : x.id); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 11 }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: C.goldDim, width: 18 }}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: open ? C.gold : C.parchment }}>{x.name}{x.crowned ? " ♔" : ""}</Text>
                  {(snapshot.reis?.id === x.id || !!x.laurel) && (
                    <Text style={{ fontFamily: F.display, fontSize: 8.5, color: C.goldBright }}>
                      {snapshot.reis?.id === x.id ? "⚜ " + t("mp.reis.badge") : ""}{snapshot.reis?.id === x.id && x.laurel ? " · " : ""}{x.laurel ? "❧ " + t("mp.laurel." + x.laurel) : ""}
                    </Text>
                  )}
                  <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchmentMuted }}>
                    {pf(t("mp.soc.metrics"), x.power, x.fame, x.age)}{pt ? " · " + pt : ""}{ht ? " · " + ht : ""}
                  </Text>
                </View>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: x.online ? C.sage : C.parchmentDim }} />
              </Pressable>

              {open && (
                <View style={{ paddingHorizontal: 11, paddingBottom: 11, borderTopWidth: 1, borderTopColor: C.border }}>
                  {/* Destek & dostluk */}
                  <Text style={cap}>{t("mp.soc.capSupport")}</Text>
                  <View style={rowWrap}>
                    <Btn label={pf(t("mp.soc.giftBtn"), 500)} disabled={!x.online || money < 500} onPress={() => act({ k: "gift", to: x.id, amount: 500 }, 500)} />
                    <Btn label={pf(t("mp.soc.giftBtn"), 2000)} disabled={!x.online || money < 2000} onPress={() => act({ k: "gift", to: x.id, amount: 2000 }, 2000)} />
                    <Btn label={t("mp.soc.vouchBtn")} onPress={() => act({ k: "vouch", to: x.id })} />
                    {!hasPact && <Btn label={t("mp.soc.allyBtn")} onPress={() => act({ k: "proposeAlliance", to: x.id })} />}
                    {!hasPact && x.gender !== p.gender && !x.married && !p.married && <Btn label={t("mp.soc.kinBtn")} onPress={() => act({ k: "proposeMarriage", to: x.id })} />}
                    {iAmBey && <Btn label={t("mp.soc.asylumBtn")} onPress={() => act({ k: "offerAsylum", to: x.id })} />}
                    {hasPact && <Btn label={t("mp.soc.breakBtn")} tone="blood" onPress={() => act({ k: "breakPact", with: x.id })} />}
                  </View>

                  {/* Rekabet */}
                  <Text style={cap}>{t("mp.soc.capRivalry")}</Text>
                  <View style={rowWrap}>
                    <Btn label={t("mp.soc.duelBtn")} disabled={x.traveling || !x.online || pactShield} onPress={() => act({ k: "duel", to: x.id })} />
                    <Btn label={t("mp.reis.voteBtn")} onPress={() => act({ k: "voteReis", target: x.id })} />
                    <Btn label={t("mp.sefer.backBtn")} onPress={() => act({ k: "joinCampaign", bey: x.id })} />
                    <Btn label={t("mp.hostage.captureBtn")} tone="blood" disabled={x.traveling || !x.online || pactShield} onPress={() => act({ k: "captureDuel", to: x.id })} />
                    {(snapshot.hostages || []).some((h) => h.captor === guestId && h.captive === x.id) && <Btn label={t("mp.hostage.releaseBtn")} onPress={() => act({ k: "releaseHostage" })} />}
                  </View>

                  {/* Yardım */}
                  <Text style={cap}>{t("mp.soc.capAid")}</Text>
                  <View style={rowWrap}>
                    <Btn label={pf(t("mp.soc.loanBtn"), LOAN_DEFAULT)} disabled={money < LOAN_DEFAULT} onPress={() => act({ k: "proposeLoan", to: x.id, amount: LOAN_DEFAULT })} />
                  </View>

                  {/* Entrika & ihanet */}
                  <Text style={[cap, { color: C.blood }]}>{t("mp.soc.capIntrigue")}</Text>
                  <View style={rowWrap}>
                    <Btn label={pf(t("mp.soc.spyBtn"), SPY_COST)} tone="dim" disabled={x.traveling || !x.online || pactShield || money < SPY_COST} onPress={() => act({ k: "spy", on: x.id }, SPY_COST)} />
                    <Btn label={pf(t("mp.soc.sabotageBtn"), SABOTAGE_COST)} tone="dim" disabled={x.traveling || !x.online || pactShield || money < SABOTAGE_COST} onPress={() => act({ k: "sabotage", on: x.id }, SABOTAGE_COST)} />
                    <Btn label={pf(t("mp.soc.slanderBtn"), SLANDER_COST)} tone="dim" disabled={x.traveling || !x.online || pactShield || money < SLANDER_COST} onPress={() => act({ k: "slander", on: x.id }, SLANDER_COST)} />
                    {iAmBey && targetInOtherBeylik && <Btn label={pf(t("mp.soc.bribeBtn"), BRIBE_COST)} tone="dim" disabled={x.traveling || pactShield || money < BRIBE_COST} onPress={() => act({ k: "bribe", on: x.id }, BRIBE_COST)} />}
                    <Btn label={pf(t("mp.soc.assassinBtn"), ASSASSINATE_COST)} tone="blood" disabled={x.traveling || pactShield || money < ASSASSINATE_COST || x.age < ASSASSINATE_MIN_AGE} onPress={() => act({ k: "assassinate", on: x.id }, ASSASSINATE_COST)} />
                  </View>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 9.5, color: C.parchmentDim, marginTop: 6 }}>{x.traveling ? t("mp.soc.travelingNote") : t("mp.soc.intrigueWarn")}</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Diyar İleri Gelenleri — paylaşımlı NPC'ler (herkes aynısını görür) */}
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 18, marginBottom: 8 }}>{t("mp.npc.title")}</Text>
        {(snapshot.npcs || []).map((n) => {
          const open = selNpc === n.id;
          const myStand = (snapshot.npcBonds || []).find((b) => b.npc === n.id && b.player === guestId)?.standing ?? 0;
          const standCol = myStand >= 25 ? C.sage : myStand <= -25 ? C.blood : C.parchmentMuted;
          return (
            <View key={n.id} style={{ borderWidth: 1, borderColor: open ? "rgba(201,168,76,0.6)" : C.border, borderRadius: 9, marginBottom: 8, backgroundColor: C.card, overflow: "hidden" }}>
              <Pressable onPress={() => { hap("tap"); setSelNpc(open ? null : n.id); setNpcTarget(null); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 11 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: open ? C.gold : C.parchment }}>{n.name}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchmentMuted }}>{t("mp.npc.role." + n.role)} · {n.beylikId} · {pf(t("mp.npc.influence"), n.influence)}</Text>
                </View>
                <Text style={{ fontFamily: F.display, fontSize: 10, color: standCol }}>{pf(t("mp.npc.standing"), myStand)}</Text>
              </Pressable>
              {open && (
                <View style={{ paddingHorizontal: 11, paddingBottom: 11, borderTopWidth: 1, borderTopColor: C.border }}>
                  <View style={[rowWrap, { marginTop: 8 }]}>
                    <Btn label={pf(t("mp.npc.courtBtn"), COURT_NPC_COST)} disabled={money < COURT_NPC_COST} onPress={() => act({ k: "courtNpc", npcId: n.id }, COURT_NPC_COST)} />
                  </View>
                  {others.length > 0 && (
                    <>
                      <Text style={cap}>{t("mp.npc.pickTarget")}</Text>
                      <View style={rowWrap}>
                        {others.map((o) => (
                          <Pressable key={o.id} onPress={() => { hap("tap"); setNpcTarget(o.id); }} style={[mb, { borderColor: npcTarget === o.id ? "rgba(111,160,192,0.7)" : C.border, backgroundColor: npcTarget === o.id ? "rgba(111,160,192,0.14)" : "transparent" }]}>
                            <Text style={[mt, { color: npcTarget === o.id ? C.frost : C.parchmentMuted }]}>{o.name}</Text></Pressable>
                        ))}
                      </View>
                      {npcTarget && (
                        <View style={[rowWrap, { marginTop: 6 }]}>
                          {/* Sunucu, hatır < 10 iken tooDistant ile reddeder ve altın iade edilmez — aynı eşiği tuşta uygula. */}
                          <Btn label={pf(t("mp.npc.turnBtn"), TURN_NPC_COST)} tone="blood" disabled={myStand < 10 || money < TURN_NPC_COST} onPress={() => act({ k: "turnNpc", npcId: n.id, against: npcTarget! }, TURN_NPC_COST)} />
                          <Btn label={pf(t("mp.npc.mediateBtn"), MEDIATE_NPC_COST)} disabled={myStand < 10 || money < MEDIATE_NPC_COST} onPress={() => act({ k: "mediateNpc", npcId: n.id, player: npcTarget! }, MEDIATE_NPC_COST)} />
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Btn({ label, onPress, disabled, tone }: { label: string; onPress: () => void; disabled?: boolean; tone?: "blood" | "dim" }) {
  const border = tone === "blood" ? "rgba(200,64,64,0.5)" : tone === "dim" ? C.border : "rgba(201,168,76,0.5)";
  const bg = tone === "blood" ? "rgba(200,64,64,0.08)" : tone === "dim" ? "rgba(255,255,255,0.03)" : "rgba(201,168,76,0.1)";
  const col = tone === "blood" ? C.blood : tone === "dim" ? C.parchment : C.gold;
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[mb, { borderColor: border, backgroundColor: bg }, disabled && { opacity: 0.35 }]}>
      <Text style={[mt, { color: col }]}>{label}</Text>
    </Pressable>
  );
}

const cap = { fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.goldDim, marginTop: 12, marginBottom: 6 };
const rowWrap = { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 6 };
const mb = { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1 };
const mt = { fontFamily: F.display, fontSize: 10.5, letterSpacing: 0.3 };
