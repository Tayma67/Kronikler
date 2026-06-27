import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../../lib/i18n";
import { useGame } from "../../lib/store";
import { useMp } from "../../lib/mp/store";
import { mePublic, applyTickEvents, realmYearMonth } from "../../lib/mp/world";
import { SharedIntent, BEY_MIN_POWER, BEY_MIN_AGE, BEY_COST, MP_CAMPAIGN_COST, THRONE_MIN_AGE, THRONE_MIN_POWER, THRONE_MIN_FAME, THRONE_COST } from "../../lib/mp/protocol";
import { newGame, advance, continueAsHeir, GameState } from "../../lib/game";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { BackLabel } from "../../lib/ui";

const pf = (s: string, ...a: (string | number)[]) => a.reduce<string>((acc, v, i) => acc.replace("%" + (i + 1), String(v)), s);

// MP'de oynanabilen kişisel ekranlar (hepsi useGame() = MP karakteri üstünde çalışır)
const LIFE_SCREENS: { path: string; icon: string; key: string }[] = [
  { path: "/oyun/meslek", icon: "anvil", key: "scr.meslek" },
  { path: "/oyun/mektep", icon: "scroll", key: "scr.mektep" },
  { path: "/oyun/beceriler", icon: "star", key: "scr.beceriler" },
  { path: "/oyun/iliskiler", icon: "iliskiler", key: "tab.relations" },
  { path: "/oyun/pazar", icon: "pazar", key: "scr.pazar" },
  { path: "/oyun/mulkler", icon: "sehir", key: "scr.mulkler" },
  { path: "/oyun/savas", icon: "crossed-swords", key: "scr.savas" },
  { path: "/oyun/orgutler", icon: "hood", key: "scr.orgutler" },
];

export default function MpOyun() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { name } = useLocalSearchParams<{ name: string }>();
  const { state: s, apply, mpMode, enterMp, exitMp } = useGame();
  const { guestId, snapshot, lastTick, setReady, sendIntent, syncPlayer } = useMp();

  const [ready, setReadyLocal] = useState(false);
  const [evLines, setEvLines] = useState<string[]>([]);
  const processedTurn = useRef(-1);
  const synced = useRef(false);
  const sRef = useRef<GameState | null>(s);
  useEffect(() => { sRef.current = s; }, [s]);

  // MP karakterini ortak depoya koy (tüm /oyun alt-ekranları bunun üstünde çalışır)
  useEffect(() => {
    if (!mpMode && guestId) enterMp({ ...newGame(String(name || "Hanedan"), String(name || "Han"), "erkek"), mpRealm: true });
  }, [guestId, mpMode]);

  // İlk kamu senkronu
  useEffect(() => {
    if (mpMode && s && guestId && snapshot && !synced.current) { synced.current = true; syncPlayer(mePublic(guestId, s, ready)); }
  }, [mpMode, s, guestId, snapshot]);

  // Sunucu tick'i → dünya ayı ilerledi: yerel karakteri 1 ay ilerlet + çapraz etkiler + senkron
  useEffect(() => {
    if (!lastTick || !guestId || !sRef.current) return;
    if (lastTick.turn === processedTurn.current) return;
    processedTurn.current = lastTick.turn;
    let ns = advance(sRef.current, 1);
    const mine = lastTick.results.find((r) => r.playerId === guestId);
    if (mine && mine.events.length) { ns = applyTickEvents(ns, mine.events); setEvLines(mine.events.map((e) => pf(t(e.k), ...(e.p || [])))); }
    else setEvLines([]);
    apply(() => ns);
    setReadyLocal(false);
    syncPlayer(mePublic(guestId, ns, false));
  }, [lastTick]);

  // Çıkışta MP modundan çık (SP kaydı geri yüklenir)
  useEffect(() => () => { exitMp(); }, []);

  if (!mpMode || !s || !snapshot) {
    return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color={C.gold} /><Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, marginTop: 12 }}>{t("mp.connecting")}</Text>
    </View>;
  }

  const p = s.player;
  const { year, month } = realmYearMonth(snapshot.turn);
  const players = snapshot.players;
  const liveCount = players.filter((x) => x.online && !x.dead).length;
  const readyCount = players.filter((x) => x.online && !x.dead && x.ready).length;
  const kingIsMe = snapshot.throne.holderId === guestId;
  const myGuild = snapshot.guilds.find((g) => g.id === p.faction);
  // Beylik (Mount & Blade) durumu
  const me = players.find((x) => x.id === guestId);
  const myPower = me?.power ?? 0;
  const myBeylikId = me?.beylikId ?? null;
  // Gerçekçi meşruiyet: bey = reşit + güç + hazine; taht = SP eşikleri; sefer = hazine.
  const beyEligible = p.age >= BEY_MIN_AGE && myPower >= BEY_MIN_POWER && p.money >= BEY_COST;
  const throneEligible = p.age >= THRONE_MIN_AGE && myPower >= THRONE_MIN_POWER && p.fame >= THRONE_MIN_FAME && p.money >= THRONE_COST;
  const canCampaign = p.money >= MP_CAMPAIGN_COST;
  const iAmBey = snapshot.beyliks.some((b) => b.beyId === guestId);
  const intent = (i: SharedIntent) => { hap("tap"); sendIntent(i); };
  // Paylaşımlı siyasi eylemin kişisel maliyetini (altın) yerelde kes — sunucu çekişmeyi çözer.
  const spend = (cost: number) => apply((prev) => { const ns: GameState = JSON.parse(JSON.stringify(prev)); ns.player.money = Math.max(0, ns.player.money - cost); return ns; });
  const doReady = () => { hap("tap"); const v = !ready; setReadyLocal(v); setReady(v); if (guestId) syncPlayer(mePublic(guestId, s, v)); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 110 }}>
        {/* Ölüm → vâris (hayat döngüsü diyarda sürer) */}
        {p.dead && (
          <View style={{ marginBottom: 12, borderWidth: 1, borderColor: "rgba(200,64,64,0.5)", backgroundColor: "rgba(200,64,64,0.08)", borderRadius: 10, padding: 14 }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.blood, textAlign: "center" }}>{p.name} †</Text>
            {p.children && p.children.length > 0 ? (
              <Pressable onPress={() => { hap("advance"); const ns = { ...continueAsHeir(s, "esit"), mpRealm: true }; apply(() => ns); if (guestId) syncPlayer(mePublic(guestId, ns, false)); }}
                style={{ marginTop: 12, paddingVertical: 13, borderRadius: 9, alignItems: "center", borderWidth: 1.5, borderColor: "rgba(201,168,76,0.6)", backgroundColor: C.gold }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: "#2a1d08" }}>{t("dash.continueHeir")}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => { hap("advance"); const ns = { ...newGame(String(name || "Hanedan"), String(name || "Han"), "erkek"), mpRealm: true }; apply(() => ns); if (guestId) syncPlayer(mePublic(guestId, ns, false)); }}
                style={{ marginTop: 12, paddingVertical: 13, borderRadius: 9, alignItems: "center", borderWidth: 1, borderColor: "rgba(201,168,76,0.6)", backgroundColor: "rgba(201,168,76,0.12)" }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.gold }}>{t("menu.newGame")}</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Dünya saati */}
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 3, color: C.goldDim }}>{t("mp.realm")} · {snapshot.realmId}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 17, color: C.gold, marginTop: 3 }}>{t("mp.year")} {year} · {t("mp.month")} {month}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginTop: 2 }}>
            {snapshot.throne.holderName ? pf(t("mp.throneHolder"), snapshot.throne.holderName) : t("mp.throneEmpty")}
          </Text>
        </View>

        {/* Karakter özeti */}
        <View style={{ borderWidth: 1, borderColor: C.borderHi, borderRadius: 10, padding: 12, backgroundColor: C.card }}>
          <Text style={{ fontFamily: F.display, fontSize: 15, color: C.gold }}>{p.name} {p.crowned ? "♔" : ""}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted, marginTop: 3 }}>{pf(t("mp.stat"), p.age, p.health, p.money, p.fame)}</Text>
        </View>

        {/* Çapraz-etki olayları */}
        {evLines.length > 0 && (
          <View style={{ marginTop: 10, borderWidth: 1, borderColor: "rgba(111,160,192,0.4)", backgroundColor: "rgba(111,160,192,0.08)", borderRadius: 9, padding: 10 }}>
            {evLines.map((l, i) => <Text key={i} style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchment, lineHeight: 18 }}>• {l}</Text>)}
          </View>
        )}

        {/* Diplomasi — oyuncular arası destek/rekabet/entrika/yardım */}
        <Pressable onPress={() => { hap("tap"); router.push("/cok-oyunculu/diplomasi"); }}
          style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(111,160,192,0.55)", backgroundColor: "rgba(111,160,192,0.1)" }}>
          <GameIcon name="iliskiler" size={16} color="#6FA0C0" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: "#6FA0C0" }}>{t("mp.soc.title")}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{t("mp.soc.subtitle")}</Text>
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 16, color: C.goldDim }}>›</Text>
        </Pressable>

        {/* Hayatını yönet — tüm kişisel ekranlar MP karakteri üstünde */}
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 18, marginBottom: 8 }}>{t("mp.subtitle")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {LIFE_SCREENS.map((sc) => (
            <Pressable key={sc.path} onPress={() => { hap("tap"); router.push(sc.path as never); }} style={{ width: "31%", alignItems: "center", paddingVertical: 12, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: C.card }}>
              <GameIcon name={sc.icon} size={18} color={C.gold} />
              <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 0.5, color: C.parchment, marginTop: 5, textAlign: "center" }}>{t(sc.key)}</Text>
            </Pressable>
          ))}
        </View>

        {/* Paylaşımlı eylemler */}
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 18, marginBottom: 8 }}>{t("mp.realm").toUpperCase()}</Text>
        <View style={{ gap: 8 }}>
          {!kingIsMe && (
            <Pressable disabled={!throneEligible} onPress={() => { spend(THRONE_COST); intent({ k: "claimThrone" }); }} style={[shareBtn, !throneEligible && { opacity: 0.45 }]}>
              <GameIcon name="crown" size={14} color={C.gold} />
              <View style={{ flex: 1 }}>
                <Text style={shareTxt}>{t("mp.claimThroneBtn")}</Text>
                {!throneEligible && <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentMuted }}>{pf(t("mp.throneReq"), THRONE_MIN_AGE, THRONE_MIN_POWER, THRONE_MIN_FAME, THRONE_COST)}</Text>}
              </View>
            </Pressable>
          )}
          {myGuild && myGuild.leaderId === guestId && (
            <Pressable onPress={() => intent({ k: "setGuildTax", guildId: myGuild.id, tax: Math.min(80, myGuild.tax + 10) })} style={shareBtn}>
              <GameIcon name="pazar" size={14} color={C.gold} /><Text style={shareTxt}>{pf(t("mp.guild.taxSet"), myGuild.tax + 10)}</Text>
            </Pressable>
          )}
          {p.faction && myGuild && myGuild.leaderId == null && (
            <Pressable onPress={() => intent({ k: "claimGuildLead", guildId: p.faction! })} style={shareBtn}>
              <GameIcon name="iliskiler" size={14} color={C.gold} /><Text style={shareTxt}>{pf(t("mp.guild.youLead"), p.faction)}</Text>
            </Pressable>
          )}
        </View>

        {/* BEYLİKLER — Mount & Blade toprak/grup katmanı */}
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 18, marginBottom: 4 }}>{t("mp.beylik.title")}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginBottom: 8 }}>
          {beyEligible ? pf(t("mp.beylik.canBeyHint"), BEY_COST) : pf(t("mp.beylik.needPowerHint"), myPower, BEY_MIN_POWER, BEY_MIN_AGE, BEY_COST)}
        </Text>
        {snapshot.beyliks.map((b) => {
          const isBey = b.beyId === guestId;
          const inThis = myBeylikId === b.id;
          const beyLabel = b.beyName || t("mp.beylik.npcHeld");
          return (
            <View key={b.id} style={{ borderWidth: 1, borderColor: isBey ? "rgba(201,168,76,0.6)" : C.border, borderRadius: 9, padding: 10, marginBottom: 8, backgroundColor: C.card }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: isBey ? C.gold : C.parchment }}>{b.name}{isBey ? " ♔" : ""}{inThis && !isBey ? " ·" : ""}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchmentMuted }}>{pf(t("mp.beylik.powerLine"), b.power)}</Text>
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 2 }}>
                {pf(t("mp.beylik.beyLine"), beyLabel)}{b.ocak ? " · " + pf(t("mp.beylik.ocakLine"), b.ocak) : ""}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {!inThis && !isBey && (
                  <Pressable onPress={() => intent({ k: "joinBeylik", beylikId: b.id })} style={miniBtn}>
                    <Text style={miniTxt}>{t("mp.beylik.joinBtn")}</Text></Pressable>
                )}
                {inThis && !isBey && (
                  <Pressable onPress={() => intent({ k: "leaveBeylik" })} style={miniBtn}>
                    <Text style={miniTxt}>{t("mp.beylik.leaveBtn")}</Text></Pressable>
                )}
                {!isBey && (
                  <Pressable disabled={!beyEligible} onPress={() => { spend(BEY_COST); intent({ k: "claimBey", beylikId: b.id }); }} style={[miniBtnGold, !beyEligible && { opacity: 0.4 }]}>
                    <Text style={miniTxtGold}>{b.beyId ? t("mp.beylik.seizeBtn") : t("mp.beylik.foundBtn")}</Text></Pressable>
                )}
                {isBey && (
                  <Pressable onPress={() => intent({ k: "setBeylikTax", beylikId: b.id, tax: Math.min(70, b.tax + 10) })} style={miniBtnGold}>
                    <Text style={miniTxtGold}>{pf(t("mp.beylik.taxBtn"), Math.min(70, b.tax + 10))}</Text></Pressable>
                )}
                {iAmBey && !isBey && (
                  <Pressable disabled={!canCampaign} onPress={() => { spend(MP_CAMPAIGN_COST); intent({ k: "beylikCampaign", target: b.id }); }} style={[miniBtnBlood, !canCampaign && { opacity: 0.4 }]}>
                    <GameIcon name="crossed-swords" size={12} color={C.blood} /><Text style={miniTxtBlood}>{pf(t("mp.beylik.campaignBtn"), MP_CAMPAIGN_COST)}</Text></Pressable>
                )}
              </View>
            </View>
          );
        })}

        {/* Diyardaki haneler */}
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 18, marginBottom: 8 }}>{t("mp.players")} · {liveCount}</Text>
        {players.map((x) => (
          <View key={x.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: x.online ? C.sage : C.parchmentDim }} />
            <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12, color: x.id === guestId ? C.gold : C.parchment }}>{x.name}{x.crowned ? " ♔" : ""}{x.id === guestId ? " " + t("mp.you") : ""}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{t("misc.age")} {x.age}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Alt: hazır oyu + senkron tick (Yaşa = ay-atla oyu) */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 10, paddingTop: 10, paddingHorizontal: 14, backgroundColor: "rgba(8,5,2,0.94)", borderTopWidth: 1, borderTopColor: C.borderHi, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 10, letterSpacing: 1, color: C.parchmentMuted }}>
          {snapshot.phase === "ticking" ? t("mp.ticking") : pf(t("mp.readyCount"), readyCount, liveCount)}
        </Text>
        <Pressable onPress={doReady} style={{ paddingVertical: 13, paddingHorizontal: 26, borderRadius: 9, borderWidth: 1, borderColor: ready ? "rgba(127,166,106,0.7)" : "rgba(201,168,76,0.6)", backgroundColor: ready ? "rgba(127,166,106,0.16)" : C.gold }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: ready ? C.sage : "#2a1d08" }}>{ready ? t("mp.ready") + " ✓" : t("mp.ready")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const shareBtn = { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.08)" };
const shareTxt = { fontFamily: F.display, fontSize: 12, color: C.gold, letterSpacing: 0.5 };
// Beylik kart butonları
const miniBtn = { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: "rgba(255,255,255,0.03)" };
const miniTxt = { fontFamily: F.display, fontSize: 10.5, color: C.parchment, letterSpacing: 0.5 };
const miniBtnGold = { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.55)", backgroundColor: "rgba(201,168,76,0.1)" };
const miniTxtGold = { fontFamily: F.display, fontSize: 10.5, color: C.gold, letterSpacing: 0.5 };
const miniBtnBlood = { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "rgba(200,64,64,0.5)", backgroundColor: "rgba(200,64,64,0.08)" };
const miniTxtBlood = { fontFamily: F.display, fontSize: 10.5, color: C.blood, letterSpacing: 0.5 };
