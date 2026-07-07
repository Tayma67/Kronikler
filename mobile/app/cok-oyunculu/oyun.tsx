import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n, applyParams } from "../../lib/i18n";
import { useGame, migrate } from "../../lib/store";
import { useMp } from "../../lib/mp/store";
import { mePublic, applyTickEvents, realmYearMonth } from "../../lib/mp/world";
import { CountdownSecs } from "../../lib/mp/countdown";
import { SharedIntent, BEY_MIN_POWER, BEY_MIN_AGE, BEY_COST, MP_CAMPAIGN_COST, THRONE_MIN_AGE, THRONE_MIN_POWER, THRONE_MIN_FAME, THRONE_COST, VENTURE_MAX_STAKE } from "../../lib/mp/protocol";
import { newGame, advance, continueAsHeir, GameState, beylikName } from "../../lib/game";
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
  const { name, gender } = useLocalSearchParams<{ name: string; gender?: string }>();
  const mpGender: "erkek" | "kadın" = gender === "kadın" ? "kadın" : "erkek";
  const { state: s, apply, mpMode, enterMp, exitMp } = useGame();
  const { guestId, snapshot, lastTick, missed, clearMissed, setReady, sendIntent, syncPlayer, saved, saveState, setTravel, chat, sendChat } = useMp();

  const [ready, setReadyLocal] = useState(false);
  const [evLines, setEvLines] = useState<string[]>([]);
  const processedTurn = useRef(-1);
  const synced = useRef(false);
  const sRef = useRef<GameState | null>(s);
  useEffect(() => { sRef.current = s; }, [s]);

  // MP karakterini ortak depoya koy (tüm /oyun alt-ekranları bunun üstünde çalışır).
  // Sunucuda yedek varsa AYNI KARAKTERE DEVAM (çıkıp girince kaldığın yer); yoksa yeni hayat.
  useEffect(() => {
    if (mpMode || !guestId) return;
    let init: GameState | null = null;
    if (saved) { try { const r = JSON.parse(saved); if (r && r.player) init = { ...migrate(r), mpRealm: true }; } catch {} } // sunucu yedeği eski şemadan olabilir — SP ile aynı göç yolundan geçir
    if (!init) init = { ...newGame(String(name || "Hanedan"), String(name || "Han"), mpGender), mpRealm: true };
    // Yoklukta NPC-vekil yaşlandıysa/öldüyse dönüşte karaktere yansıt (sunucu otoritesi).
    const meP = snapshot?.players.find((x) => x.id === guestId);
    if (meP) { if (meP.dead) init.player.dead = true; if (typeof meP.age === "number" && meP.age > init.player.age) init.player.age = meP.age; }
    enterMp(init);
  }, [guestId, mpMode, saved]);

  // İlk kamu senkronu + ilk yedek
  useEffect(() => {
    if (mpMode && s && guestId && snapshot && !synced.current) { synced.current = true; syncPlayer(mePublic(guestId, s, ready)); saveState(JSON.stringify(s)); }
  }, [mpMode, s, guestId, snapshot]);

  // Sunucu tick'i → dünya ayı ilerledi: yerel karakteri 1 ay ilerlet + çapraz etkiler + senkron
  useEffect(() => {
    if (!lastTick || !guestId || !sRef.current) return;
    if (lastTick.turn === processedTurn.current) return;
    processedTurn.current = lastTick.turn;
    let ns = advance(sRef.current, 1);
    const mine = lastTick.results.find((r) => r.playerId === guestId);
    if (mine && mine.events.length) {
      ns = applyTickEvents(ns, mine.events);
      const ym = realmYearMonth(lastTick.turn); // kişisel sonuçlar buharlaşmasın: ay damgalı kalıcı günlük (son 12)
      setEvLines((prev) => [...mine.events.map((e) => `${ym.year}/${ym.month} · ` + pf(t(e.k), ...(e.p || []))), ...prev].slice(0, 12));
    }
    apply(() => ns);
    setReadyLocal(false);
    syncPlayer(mePublic(guestId, ns, false));
    saveState(JSON.stringify(ns)); // her ay sonunda sunucuya yedekle → çıkıp girince aynı karaktere devam
  }, [lastTick]);

  // Yokluğunda biriken kişisel olaylar (hediye altını, borç düşümü, düğün...) — katılımda sunucudan gelir, bir kez işlenir.
  useEffect(() => {
    if (!missed || !missed.length || !guestId || !sRef.current) return;
    const ns = applyTickEvents(sRef.current, missed);
    setEvLines((prev) => [...missed.map((e) => t("mp.whileAway") + " · " + pf(t(e.k), ...(e.p || []))), ...prev].slice(0, 12));
    apply(() => ns);
    clearMissed();
    syncPlayer(mePublic(guestId, ns, false));
    saveState(JSON.stringify(ns));
  }, [missed, guestId]);

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
  // Ölü oyuncu eylem yapamaz/harcayamaz (önce vârisle devam etmeli) — "ceset gibi oynama" tutarsızlığı önlenir.
  const beyEligible = !p.dead && p.age >= BEY_MIN_AGE && myPower >= BEY_MIN_POWER && p.money >= BEY_COST;
  const throneEligible = !p.dead && p.age >= THRONE_MIN_AGE && myPower >= THRONE_MIN_POWER && p.fame >= THRONE_MIN_FAME && p.money >= THRONE_COST;
  const canCampaign = !p.dead && p.money >= MP_CAMPAIGN_COST;
  const iAmBey = snapshot.beyliks.some((b) => b.beyId === guestId);
  // Hedef beyle ittifak/dünürlük paktı varsa sunucu seferi reddeder (pactProtected) ve peşin kesilen altın yanar — tuşu baştan kapat.
  const pactWith = (otherId: string | null) => {
    if (!otherId || !guestId) return null;
    const [a, b] = guestId < otherId ? [guestId, otherId] : [otherId, guestId];
    return snapshot.bonds.find((d) => d.a === a && d.b === b)?.pact ?? null;
  };
  const intent = (i: SharedIntent) => { hap("tap"); sendIntent(i); };
  // Paylaşımlı siyasi eylemin kişisel maliyetini (altın) yerelde kes — sunucu çekişmeyi çözer.
  const spend = (cost: number) => apply((prev) => { const ns: GameState = JSON.parse(JSON.stringify(prev)); ns.player.money = Math.max(0, ns.player.money - cost); return ns; });
  const doReady = () => { if (p.dead) return; hap("tap"); const v = !ready; setReadyLocal(v); setReady(v); if (guestId) syncPlayer(mePublic(guestId, s, v)); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 110 }}>
        {/* Canlı yoldaş şeridi: diyar bir liste değil, bir meclis — kim burada, kim ay bekliyor, son söz kimin */}
        {(() => {
          const humans = players.filter((x) => !x.dead);
          const lastChat = chat.length ? chat[chat.length - 1] : null;
          const NARAS: [string, string][] = [["selam", t("mp.nara.selam")], ["helal", t("mp.nara.helal")], ["meydan", t("mp.nara.meydan")], ["yardim", t("mp.nara.yardim")]];
          return (
            <View style={{ marginBottom: 12, borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", backgroundColor: "rgba(201,168,76,0.05)", borderRadius: 10, padding: 10 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.sage }} />
                <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 0.5, color: C.parchmentMuted }}>{applyParams(t("mp.pulse.here"), [liveCount])}</Text>
                {humans.slice(0, 6).map((x) => (
                  <View key={x.id} style={{ flexDirection: "row", alignItems: "center", gap: 3, borderWidth: 1, borderColor: x.online ? "rgba(127,166,106,0.5)" : C.border, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6, opacity: x.online ? 1 : 0.55 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 9, color: x.id === guestId ? C.gold : x.online ? C.parchment : C.parchmentMuted }}>{x.name}{x.id === guestId ? t("mp.you") : ""}</Text>
                    {x.online && x.ready && <Text style={{ fontFamily: F.display, fontSize: 8, color: C.sage }}>{t("mp.pulse.ready")}</Text>}
                  </View>
                ))}
              </View>
              {lastChat && (
                <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 7 }}>
                  <Text style={{ color: C.gold }}>{lastChat.fromName}: </Text>{lastChat.text}
                </Text>
              )}
              {!p.dead && (
                <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                  {NARAS.map(([k, label]) => (
                    <Pressable key={k} onPress={() => { hap("tap"); sendChat(label); }} style={{ flex: 1, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", alignItems: "center" }}>
                      <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 8.5, color: C.gold }}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          );
        })()}
        {/* Ölüm → vâris (hayat döngüsü diyarda sürer) */}
        {p.dead && (
          <View style={{ marginBottom: 12, borderWidth: 1, borderColor: "rgba(200,64,64,0.5)", backgroundColor: "rgba(200,64,64,0.08)", borderRadius: 10, padding: 14 }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.blood, textAlign: "center" }}>{p.name} †</Text>
            {p.children && p.children.length > 0 ? (
              <Pressable onPress={() => { hap("advance"); const ns = { ...continueAsHeir(s, "esit"), mpRealm: true }; apply(() => ns); if (guestId) { syncPlayer(mePublic(guestId, ns, false)); saveState(JSON.stringify(ns)); } }}
                style={{ marginTop: 12, paddingVertical: 13, borderRadius: 9, alignItems: "center", borderWidth: 1.5, borderColor: "rgba(201,168,76,0.6)", backgroundColor: C.gold }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.inkOnGold }}>{t("dash.continueHeir")}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => { hap("advance"); const ns = { ...newGame(String(name || "Hanedan"), String(name || "Han"), mpGender), mpRealm: true }; apply(() => ns); if (guestId) { syncPlayer(mePublic(guestId, ns, false)); saveState(JSON.stringify(ns)); } }}
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
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2, color: "rgba(111,160,192,0.9)", marginBottom: 5 }}>{t("mp.log").toUpperCase()}</Text>
            {evLines.map((l, i) => <Text key={i} style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: i < 3 ? C.parchment : C.parchmentMuted, lineHeight: 18 }}>• {l}</Text>)}
          </View>
        )}

        {/* Diplomasi — oyuncular arası destek/rekabet/entrika/yardım */}
        <Pressable onPress={() => { hap("tap"); router.push("/cok-oyunculu/diplomasi"); }}
          style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(111,160,192,0.55)", backgroundColor: "rgba(111,160,192,0.1)" }}>
          <GameIcon name="iliskiler" size={16} color={C.frost} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.frost }}>{t("mp.soc.title")}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{t("mp.soc.subtitle")}</Text>
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 16, color: C.goldDim }}>›</Text>
        </Pressable>

        {/* Seyahate Çık — güvenli yokluk: kişin dokunulmaz, diyarın etkileşime açık kalır */}
        {(() => { const traveling = !!me?.traveling; return (
          <Pressable onPress={() => { hap("tap"); setTravel(!traveling); }}
            style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: traveling ? "rgba(127,166,106,0.6)" : C.border, backgroundColor: traveling ? "rgba(127,166,106,0.12)" : C.card }}>
            <GameIcon name="firsatlar" size={15} color={traveling ? C.sage : C.parchmentMuted} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: traveling ? C.sage : C.parchment }}>{traveling ? t("mp.travel.on") : t("mp.travel.off")}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted }}>{traveling ? t("mp.travel.onHint") : t("mp.travel.offHint")}</Text>
            </View>
          </Pressable>); })()}

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
            <Pressable disabled={!throneEligible} onPress={() => { if (guestId) syncPlayer(mePublic(guestId, s, ready)); spend(THRONE_COST); intent({ k: "claimThrone" }); }} style={[shareBtn, !throneEligible && { opacity: 0.45 }]}>
              <GameIcon name="crown" size={14} color={C.gold} />
              <View style={{ flex: 1 }}>
                <Text style={shareTxt}>{t("mp.claimThroneBtn")}</Text>
                {!throneEligible && <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentMuted }}>{pf(t("mp.throneReq"), THRONE_MIN_AGE, THRONE_MIN_POWER, THRONE_MIN_FAME, THRONE_COST)}</Text>}
              </View>
            </Pressable>
          )}
        </View>

        {/* LONCAN — bey-olmayan güç yolu: mesleğinde yüksel, loncanı yönet, diyar siyasetinde söz sahibi ol */}
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 18, marginBottom: 8 }}>{t("mp.guild.panelTitle")}</Text>
        {myGuild ? (() => {
          const isLead = myGuild.leaderId === guestId;
          const inf = Math.round(players.filter((x) => x.guildId === myGuild.id && x.online && !x.dead).reduce((sum, x) => sum + (x.fame + x.power) * 0.15, 0));
          return (
            <View style={{ borderWidth: 1, borderColor: isLead ? "rgba(201,168,76,0.6)" : C.border, borderRadius: 9, padding: 11, backgroundColor: C.card }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: isLead ? C.gold : C.parchment }}>{myGuild.id}{isLead ? " ♔" : ""}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 2 }}>
                {pf(t("mp.guild.leaderLine"), myGuild.leaderName || t("mp.guild.npcLed"))} · {pf(t("mp.guild.influenceLine"), inf)}{myGuild.backing ? " · " + pf(t("mp.guild.backingLine"), beylikName(myGuild.backing)) : ""}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {!isLead && <Pressable onPress={() => intent({ k: "claimGuildLead", guildId: myGuild.id })} style={miniBtnGold}><Text style={miniTxtGold}>{t("mp.guild.leadBtn")}</Text></Pressable>}
                {isLead && <Pressable onPress={() => intent({ k: "setGuildTax", guildId: myGuild.id, tax: Math.min(80, myGuild.tax + 10) })} style={miniBtnGold}><Text style={miniTxtGold}>{pf(t("mp.guild.duesBtn"), Math.min(80, myGuild.tax + 10))}</Text></Pressable>}
              </View>
              {isLead && (
                <>
                  <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 1, color: C.goldDim, marginTop: 10, marginBottom: 5 }}>{t("mp.guild.backBtn")}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                    {snapshot.beyliks.map((b) => (
                      <Pressable key={b.id} onPress={() => intent({ k: "setGuildBacking", guildId: myGuild.id, beylikId: myGuild.backing === b.id ? null : b.id })}
                        style={[miniBtn, myGuild.backing === b.id && { borderColor: "rgba(201,168,76,0.6)", backgroundColor: "rgba(201,168,76,0.12)" }]}>
                        <Text style={[miniTxt, myGuild.backing === b.id && { color: C.gold }]}>{b.name}</Text></Pressable>
                    ))}
                  </View>
                </>
              )}
            </View>
          );
        })() : (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted }}>{t("mp.guild.noneLine")}</Text>
        )}

        {/* BEYLİKLER — Mount & Blade toprak/grup katmanı */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 4 }}>
          <Text style={{ flex: 1, fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim }}>{t("mp.beylik.title")}</Text>
          <Pressable onPress={() => { hap("tap"); router.push("/cok-oyunculu/harita"); }} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 7, borderWidth: 1, borderColor: C.border }}>
            <GameIcon name="sehir" size={12} color={C.goldDim} />
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: C.parchmentMuted }}>{t("mp.map.title")}</Text>
          </Pressable>
        </View>
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
                  <Pressable disabled={!beyEligible} onPress={() => { if (guestId) syncPlayer(mePublic(guestId, s, ready)); spend(BEY_COST); intent({ k: "claimBey", beylikId: b.id }); }} style={[miniBtnGold, !beyEligible && { opacity: 0.4 }]}>
                    <Text style={miniTxtGold}>{b.beyId ? t("mp.beylik.seizeBtn") : t("mp.beylik.foundBtn")}</Text></Pressable>
                )}
                {isBey && (
                  <Pressable onPress={() => intent({ k: "setBeylikTax", beylikId: b.id, tax: Math.min(70, b.tax + 10) })} style={miniBtnGold}>
                    <Text style={miniTxtGold}>{pf(t("mp.beylik.taxBtn"), Math.min(70, b.tax + 10))}</Text></Pressable>
                )}
                {iAmBey && !isBey && (() => { const pc = pactWith(b.beyId); const shielded = pc === "alliance" || pc === "marriage"; const ok = canCampaign && !shielded; return (
                  <Pressable disabled={!ok} onPress={() => { spend(MP_CAMPAIGN_COST); intent({ k: "beylikCampaign", target: b.id }); }} style={[miniBtnBlood, !ok && { opacity: 0.4 }]}>
                    <GameIcon name="crossed-swords" size={12} color={C.blood} /><Text style={miniTxtBlood}>{pf(t("mp.beylik.campaignBtn"), MP_CAMPAIGN_COST)}</Text></Pressable>
                ); })()}
              </View>
            </View>
          );
        })}

        {/* ORTAK GİRİŞİM — kervan ortaklığı (v3+ sunucu; eski sunucuda gizli kalır, altın yanmaz) */}
        {(snapshot.v || 0) >= 3 && (() => {
          const v = snapshot.venture;
          const mine = v?.backers.find((b) => b.id === guestId)?.amount || 0;
          const pool = v ? v.backers.reduce((sum, b) => sum + b.amount, 0) : 0;
          const left = v ? Math.max(0, v.resolveTurn - snapshot.turn) : 0;
          return (
            <View style={{ borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", borderRadius: 9, padding: 10, marginTop: 18, backgroundColor: C.card }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <GameIcon name="camel" size={14} color={C.gold} />
                <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim }}>{t("mp.venture.title").toUpperCase()}</Text>
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 5, lineHeight: 16 }}>
                {v ? pf(t("mp.venture.pool"), pool, v.backers.length, left) : t("mp.venture.none")}
              </Text>
              {mine > 0 && <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.gold, marginTop: 3 }}>{pf(t("mp.venture.mine"), mine)}</Text>}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {[100, 250, 500].map((amt) => { const ok = !p.dead && p.money >= amt && mine + amt <= VENTURE_MAX_STAKE; return (
                  <Pressable key={amt} disabled={!ok} onPress={() => { spend(amt); intent({ k: "ventureBack", amount: amt }); }} style={[miniBtnGold, !ok && { opacity: 0.4 }]}>
                    <Text style={miniTxtGold}>{pf(t("mp.venture.backBtn"), amt)}</Text></Pressable>
                ); })}
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentMuted, marginTop: 6, lineHeight: 14 }}>{t("mp.venture.hint")}</Text>
            </View>
          );
        })()}

        {/* Diyardaki haneler — liderlik tablosu: güç+ün sıralı, rütbeli (salt istemci; snapshot mutasyonsuz, protokol değişmez) */}
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 18, marginBottom: 8 }}>{t("mp.players")} · {liveCount}</Text>
        {[...players].sort((a, b) => ((b.power || 0) + (b.fame || 0)) - ((a.power || 0) + (a.fame || 0))).map((x, ri) => (
          <View key={x.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: x.id === guestId ? "rgba(201,168,76,0.07)" : "transparent" }}>
            <Text style={{ width: 20, fontFamily: F.display, fontSize: 11, textAlign: "center", color: ri === 0 ? C.gold : ri === 1 ? "#B8B4AC" : ri === 2 ? "#A8794A" : C.parchmentMuted }}>{ri + 1}</Text>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: x.online ? C.sage : C.parchmentDim }} />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.display, fontSize: 12, color: x.id === guestId ? C.gold : x.dead ? C.parchmentMuted : C.parchment }}>{x.name}{x.crowned ? " ♔" : ""}{x.id === guestId ? " " + t("mp.you") : ""}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <GameIcon name="crossed-swords" size={10} color={C.parchmentDim} />
              <Text style={{ fontFamily: F.display, fontSize: 10.5, color: C.parchmentDim }}>{x.power || 0}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <GameIcon name="star" size={10} color={C.parchmentDim} />
              <Text style={{ fontFamily: F.display, fontSize: 10.5, color: C.parchmentDim }}>{x.fame || 0}</Text>
            </View>
            <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{t("misc.age")} {x.age}</Text>
          </View>
        ))}

        {/* Diyar Haberleri — paylaşımlı NPC'lerden kozmetik akış */}
        {snapshot.news && snapshot.news.length > 0 && (
          <>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 18, marginBottom: 8 }}>{t("mp.news.title")}</Text>
            {snapshot.news.slice(-6).reverse().map((nw, i) => (
              <Text key={i} style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: 5, lineHeight: 17 }}>
                • {pf(t(nw.k), String(nw.p?.[0] ?? ""), beylikName(String(nw.p?.[1] ?? "")))}
              </Text>
            ))}
          </>
        )}
      </ScrollView>

      {/* Alt: hazır oyu + senkron tick (Yaşa = ay-atla oyu) */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 10, paddingTop: 10, paddingHorizontal: 14, backgroundColor: "rgba(8,5,2,0.94)", borderTopWidth: 1, borderTopColor: C.borderHi, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1, color: C.parchmentMuted }}>
            {snapshot.phase === "ticking" ? t("mp.ticking") : pf(t("mp.readyCount"), readyCount, liveCount)}
          </Text>
          {snapshot.phase !== "ticking" && !!snapshot.tickDeadline && (
            <CountdownSecs deadline={snapshot.tickDeadline} fmt={(sc) => pf(t("mp.tickIn"), sc)} style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1, color: C.goldDim, marginTop: 2 }} />
          )}
        </View>
        <Pressable disabled={p.dead} onPress={doReady} style={{ paddingVertical: 13, paddingHorizontal: 26, borderRadius: 9, borderWidth: 1, borderColor: ready ? "rgba(127,166,106,0.7)" : "rgba(201,168,76,0.6)", backgroundColor: ready ? "rgba(127,166,106,0.16)" : C.gold, opacity: p.dead ? 0.4 : 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: ready ? C.sage : C.inkOnGold }}>{ready ? t("mp.ready") + " ✓" : t("mp.ready")}</Text>
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
