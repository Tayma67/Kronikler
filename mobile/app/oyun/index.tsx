import { View, Text, ScrollView, Pressable, ImageBackground, StyleSheet, Dimensions } from "react-native";
import { Ambiance, LoadingScreen, KenBurns, ParticleBurst } from "../../lib/fx";
import { CoinShower } from "../../lib/skia";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useState, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { applyDilemma, careerTitle, achievementsOf, GameEvent } from "../../lib/game";
import { pickDilemma, Dilemma, Choice } from "../../lib/events";
import { careerTitleL } from "../../lib/locale-data";
import { currentCalendar } from "../../lib/calendar";
import { heroImage } from "../../lib/assets";
import { MilestoneModal, DilemmaModal, AchievementToast, PressableScale, Portre } from "../../lib/ui";
import { GameIcon } from "../../lib/icons";
import { useI18n, applyParams } from "../../lib/i18n";
import { playTap } from "../../lib/sound";
import { hap } from "../../lib/haptics";
import { C, F } from "../../lib/theme";

const SEASON_KEY: Record<string, string> = { "Kış": "kis", "İlkbahar": "ilkbahar", "Yaz": "yaz", "Sonbahar": "sonbahar" };

// Meslek → ikon (mevcut game-icons setinden).
const PROF_GI: Record<string, string> = {
  çiftçi: "wheat", demirci: "anvil", tüccar: "scales", balıkçı: "fishing", avcı: "bow",
  çoban: "sheep", fırıncı: "bread", müzisyen: "lyre", şifacı: "herbs", asker: "crossed-swords", işsiz: "leaf",
};

// Olay tipi → { kategori anahtarı (evc.*), renk, ikon }. Bulunmazsa DEFAULT.
const EVT: Record<string, { c: string; col: string; gi: string }> = {
  çalışma: { c: "ticaret", col: C.sage, gi: "coins" }, ticaret: { c: "ticaret", col: C.sage, gi: "coins" },
  pazar: { c: "ticaret", col: C.sage, gi: "scales" }, kariyer: { c: "kariyer", col: C.gold, gi: "crown" },
  kariyer_terfi: { c: "kariyer", col: C.gold, gi: "crown" }, meslek: { c: "egitim", col: C.azure, gi: "book" },
  meslek_değişimi: { c: "egitim", col: C.azure, gi: "book" }, mektep: { c: "egitim", col: C.azure, gi: "graduate-cap" },
  cocukluk: { c: "egitim", col: C.azure, gi: "kite" }, yolculuk: { c: "seyahat", col: C.azure, gi: "walk" },
  savaş: { c: "savas", col: C.ember, gi: "crossed-swords" }, savas: { c: "savas", col: C.ember, gi: "crossed-swords" },
  savaş_zaferi: { c: "savas", col: C.ember, gi: "crossed-swords" }, savaş_kaybı: { c: "savas", col: C.blood, gi: "shield" },
  evlilik: { c: "aile", col: C.rose, gi: "ring" }, doğum: { c: "aile", col: C.ink, gi: "baby" }, dogum: { c: "aile", col: C.ink, gi: "baby" },
  aile_krizi: { c: "aile", col: C.rose, gi: "family" }, suç: { c: "golge", col: C.ink, gi: "hood" }, suc: { c: "golge", col: C.ink, gi: "hood" },
  ceza: { c: "ceza", col: C.blood, gi: "prisoner" }, hapis: { c: "ceza", col: C.blood, gi: "prisoner" },
  görev: { c: "gorev", col: C.sage, gi: "scroll-open" }, gorev: { c: "gorev", col: C.sage, gi: "scroll-open" },
  beceri: { c: "beceri", col: C.gold, gi: "medal" }, başarım: { c: "basarim", col: C.gold, gi: "trophy" }, basarim: { c: "basarim", col: C.gold, gi: "trophy" },
  mülk: { c: "mulk", col: C.gold, gi: "house" }, mulkler: { c: "mulk", col: C.gold, gi: "house" },
  hikâye: { c: "hikaye", col: C.ink, gi: "book" }, hikaye: { c: "hikaye", col: C.ink, gi: "book" },
  iyileşme: { c: "saglik", col: C.sage, gi: "healing" }, sağlık: { c: "saglik", col: C.sage, gi: "healing" },
  nesil_devri: { c: "nesil", col: C.ink, gi: "hourglass" }, sohbet: { c: "sohbet", col: C.parchmentMuted, gi: "family" },
  hediye: { c: "sohbet", col: C.rose, gi: "ring" }, ölüm: { c: "dunya", col: C.parchmentMuted, gi: "tombstone" }, olum: { c: "dunya", col: C.parchmentMuted, gi: "tombstone" },
  kıtlık: { c: "dunya", col: "#D4820A", gi: "bucket" }, festival: { c: "dunya", col: C.gold, gi: "party" }, şenlik: { c: "dunya", col: C.gold, gi: "party" },
  isyan: { c: "dunya", col: "#D4820A", gi: "fist" }, gunluk: { c: "olay", col: C.gold, gi: "star" },
};
const DEFAULT_EVT = { c: "olay", col: C.gold, gi: "star" };

function fameRepKey(fame: number) {
  if (fame >= 80) return "rep.legendary"; if (fame >= 60) return "rep.renowned";
  if (fame >= 40) return "rep.heard"; if (fame >= 20) return "rep.known"; return "rep.unknown";
}

// Mini istatistik barı (hero içi).
function MiniStat({ icon, value, max, color }: { icon: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Text style={{ fontSize: 11, width: 14 }}>{icon}</Text>
      <View style={{ flex: 1, height: 3, backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 2 }}>
        <View style={{ width: `${pct}%`, height: 3, backgroundColor: color, borderRadius: 2 }} />
      </View>
      <Text style={{ fontFamily: F.display, fontSize: 9, color: C.parchment, width: 26, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, doWork, resetGame, apply } = useGame();
  const { t, lang } = useI18n();
  const [milestone, setMilestone] = useState<GameEvent | null>(null);
  const [dilemma, setDilemma] = useState<Dilemma | null>(null);
  const [ach, setAch] = useState<{ name: string; icon: string } | null>(null);
  const [tab, setTab] = useState<"gunluk" | "dunya">("gunluk");
  const [shoot, setShoot] = useState(0);
  const prevMoney = useRef<number>(state?.player.money ?? 0);
  const seenLen = useRef<number>(state?.history.length ?? 0);

  // Akçe arttığında altın sikke yağmuru.
  useEffect(() => {
    if (!state) return;
    const m = state.player.money;
    if (m > prevMoney.current + 0) setShoot((k) => k + 1);
    prevMoney.current = m;
  }, [state?.player.money]);
  const seenAch = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!state) return;
    const done = achievementsOf(state).filter((x) => x.done);
    if (seenAch.current === null) { seenAch.current = new Set(done.map((x) => x.a.id)); return; }
    for (const x of done) {
      if (!seenAch.current.has(x.a.id)) { seenAch.current.add(x.a.id); setAch({ name: t("ach." + x.a.id + ".l"), icon: x.a.icon }); hap("success"); }
    }
  }, [state]);

  const lastRolledTurn = useRef<number>(state?.turn ?? 0);
  const onChoose = (c: Choice, i: number) => { hap("selection"); const res = dilemma ? t("dil." + dilemma.id + ".r" + i) : c.result; apply((s) => applyDilemma(s, c.delta, res)); setDilemma(null); };

  useEffect(() => {
    if (!state) return;
    if (state.turn > lastRolledTurn.current) {
      lastRolledTurn.current = state.turn;
      if (!state.player.dead && !dilemma && Math.random() < 0.28) {
        const d = pickDilemma(state);
        if (d) setDilemma(d);
      }
    } else if (state.turn < lastRolledTurn.current) {
      lastRolledTurn.current = state.turn;
    }
  }, [state?.turn]);

  useEffect(() => {
    if (!state) return;
    const h = state.history;
    if (h.length > seenLen.current) {
      const fresh = h.slice(seenLen.current);
      const land = [...fresh].reverse().find((e) => e.landmark && e.type !== "ölüm" && e.type !== "nesil_devri");
      if (land) setMilestone(land);
    }
    seenLen.current = h.length;
  }, [state?.history.length]);

  if (!state) return <LoadingScreen />;
  const p = state.player;
  const cal = currentCalendar(state.turn);
  const turn = state.turn;
  const fame = Math.round(p.fame || 0);
  const profGi = PROF_GI[p.profession];

  // Zaman etiketi (1 tur = 1 ay).
  const timeAgo = (day: number) => {
    const diff = turn - (day || 0);
    if (diff <= 0) return t("ago.this");
    if (diff === 1) return t("ago.last");
    if (diff < 12) return applyParams(t("ago.months"), [diff]);
    return applyParams(t("ago.years"), [Math.floor(diff / 12)]);
  };

  // Günlük: makro olmayanlar; Dünya: makro olanlar.
  const reversed = [...state.history].reverse();
  const events = reversed.filter((e) => (tab === "dunya" ? e.scope === "makro" : e.scope !== "makro"));

  const EventCard = ({ e, last }: { e: GameEvent; last: boolean }) => {
    const cfg = EVT[e.type] || DEFAULT_EVT;
    const land = !!e.landmark;
    const col = land ? C.goldBright : cfg.col;
    const txt = e.k ? applyParams(t(e.k), e.p) : e.text;
    return (
      <View style={{ flexDirection: "row", paddingBottom: last ? 0 : 8 }}>
        {/* İkon sütunu + zaman çizgisi */}
        <View style={{ width: 42, alignItems: "center", paddingTop: 8 }}>
          {!last && <View style={{ position: "absolute", top: 40, bottom: -8, width: 2, backgroundColor: "rgba(184,148,64,0.30)" }} />}
          <View style={{
            width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", zIndex: 1,
            backgroundColor: land ? "rgba(46,32,10,0.95)" : C.card,
            borderWidth: 1.5, borderColor: land ? "rgba(224,188,90,0.8)" : "rgba(184,148,64,0.35)",
          }}>
            <GameIcon name={cfg.gi} size={14} color={col} />
          </View>
        </View>
        {/* Kart */}
        <View style={{
          flex: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9,
          backgroundColor: land ? "rgba(224,188,90,0.08)" : C.card,
          borderWidth: 1, borderColor: land ? "rgba(224,188,90,0.45)" : C.border,
          borderLeftWidth: 2.5, borderLeftColor: land ? "rgba(224,188,90,0.9)" : col,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: cfg.col }} />
              <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 1.4, color: land ? C.goldBright : cfg.col }}>
                {t("evc." + cfg.c).toUpperCase()}
              </Text>
              {land && <Text style={{ fontSize: 9, color: C.goldBright }}>⚜</Text>}
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 9.5, color: C.parchmentMuted }}>{timeAgo(e.day)}</Text>
          </View>
          <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchment, lineHeight: 19 }}>{txt}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Akçe kazanınca sikke yağmuru */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 60 }]}>
        <CoinShower shoot={shoot} width={Dimensions.get("window").width} height={Dimensions.get("window").height} />
      </View>
      {milestone ? (
        <MilestoneModal visible={true} type={milestone.type} text={milestone.text} onClose={() => setMilestone(null)} />
      ) : dilemma ? (
        <DilemmaModal dilemma={dilemma} onChoose={onChoose} />
      ) : ach ? (
        <AchievementToast name={ach.name} icon={ach.icon} onClose={() => setAch(null)} />
      ) : null}

      {/* ── HERO (yaşayan sahne: Ken Burns + ambiyans) ── */}
      <KenBurns source={heroImage(p.age, cal.season)} style={{ paddingTop: insets.top }}>
        <View style={{ backgroundColor: "rgba(8,5,2,0.5)", paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.borderHi }}>
          <Ambiance season={cal.season} width={Dimensions.get("window").width} height={180} />
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {/* Sol: avatar + mini istatistikler */}
            <View style={{ alignItems: "center", gap: 6, width: 92 }}>
              <View style={{ borderWidth: 2, borderColor: C.gold, borderRadius: 30, padding: 1 }}>
                <Portre age={p.age} gender={p.gender} size={48} ring={false} />
              </View>
              <View style={{ width: 90, backgroundColor: "rgba(8,5,2,0.6)", borderWidth: 1, borderColor: "rgba(201,168,76,0.2)", borderRadius: 9, padding: 7, gap: 6 }}>
                <MiniStat icon="❤️" value={Math.round(p.health)} max={100} color={C.blood} />
                <MiniStat icon="🍎" value={Math.round(p.hunger)} max={100} color={C.sage} />
                <MiniStat icon="⚜️" value={Math.round(p.money)} max={500} color={C.gold} />
                <MiniStat icon="👑" value={fame} max={100} color={C.ink} />
              </View>
            </View>

            {/* Orta: isim + ünvan */}
            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 6 }}>
              <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, letterSpacing: 1.5, textAlign: "center", textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 10 }}>
                {p.name.toUpperCase()}
              </Text>
              <View style={{ width: "55%", height: 1, marginVertical: 4, backgroundColor: "rgba(201,168,76,0.5)" }} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                {profGi && <GameIcon name={profGi} size={13} color={C.gold} />}
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.gold, textAlign: "center" }}>
                  {p.profession === "işsiz" ? t("misc.jobless") : careerTitleL(p.profession, p.career_xp, lang)}
                </Text>
              </View>
            </View>

            {/* Sağ: itibar rozeti */}
            <View style={{ alignItems: "center", gap: 3, width: 52 }}>
              <View style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: "rgba(8,5,2,0.72)", borderWidth: 1.5, borderColor: "rgba(201,168,76,0.45)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 17 }}>🦁</Text>
              </View>
              <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 6.5, letterSpacing: 0.6, color: C.parchmentMuted, textAlign: "center" }}>
                {t(fameRepKey(fame))}
              </Text>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(8,5,2,0.8)", borderWidth: 1.5, borderColor: "rgba(201,168,76,0.4)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: F.display, fontSize: 10, color: C.parchment }}>{fame}</Text>
              </View>
            </View>
          </View>

          {/* Tarih hapı */}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(8,5,2,0.5)", borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(201,168,76,0.14)" }}>
              <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 1, color: C.parchmentDim }}>🛡 {p.age} {t("misc.age").toUpperCase()}</Text>
              <Text style={{ color: C.borderHi }}>·</Text>
              <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 1, color: C.parchmentDim }}>{t("cal.season." + SEASON_KEY[cal.season]).toUpperCase()}</Text>
              <Text style={{ color: C.borderHi }}>·</Text>
              <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 1, color: C.parchmentDim }}>{t("cal.month." + cal.month_no).toUpperCase()} {cal.year}</Text>
            </View>
          </View>
          {p.dead && <Text style={{ color: C.blood, textAlign: "center", marginTop: 8, fontFamily: F.serifItalic }}>{t("dyn.died")}</Text>}
        </View>
      </KenBurns>

      {/* Aktif hikâye çağrısı */}
      {!p.dead && state.story?.active && (
        <Pressable onPress={() => router.push("/oyun/hikayeler")} style={{ marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", flexDirection: "row", alignItems: "center", gap: 8 }}>
          <GameIcon name="roman" size={16} color={C.gold} />
          <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12, color: C.parchment }}>{t("dash.storyCta")}</Text>
          <Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>›</Text>
        </Pressable>
      )}

      {/* ── GÜNLÜK KART PANELİ ── */}
      <View style={{ flex: 1, margin: 12, borderWidth: 1, borderColor: C.borderHi, borderRadius: 10, backgroundColor: C.card, overflow: "hidden" }}>
        {/* Başlık */}
        <View style={{ paddingHorizontal: 12, paddingTop: 11, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: C.gold }} />
              <View>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, letterSpacing: 1.5 }}>{t("dash.journal")}</Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 1 }}>{t("dash.subtitle")}</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push("/oyun/tarih")} style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingTop: 2 }}>
              <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 1, color: C.goldDim }}>{t("dash.seeAll")}</Text>
              <Text style={{ color: C.goldDim, fontSize: 11 }}>›</Text>
            </Pressable>
          </View>
          {/* Sekmeler */}
          <View style={{ flexDirection: "row", gap: 6, paddingVertical: 9 }}>
            {([["gunluk", "📋", t("dash.tabJournal")], ["dunya", "🌍", t("dash.tabWorld")]] as const).map(([k, ic, lbl]) => {
              const active = tab === k;
              return (
                <Pressable key={k} onPress={() => { hap("tap"); setTab(k as "gunluk" | "dunya"); }} style={{
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 7, borderRadius: 7,
                  borderWidth: 1, borderColor: active ? "rgba(201,168,76,0.45)" : C.border,
                  backgroundColor: active ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.02)",
                }}>
                  <Text style={{ fontSize: 11 }}>{ic}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1, color: active ? C.gold : C.parchmentMuted }}>{lbl}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Olay listesi */}
        <ScrollView style={{ flex: 1, backgroundColor: "#221808" }} contentContainerStyle={{ padding: 12 }}>
          <Animated.View key={tab} entering={FadeIn.duration(220)}>
          {events.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 28 }}>
              <Text style={{ fontSize: 24, opacity: 0.4, marginBottom: 8 }}>{tab === "gunluk" ? "📜" : "🌍"}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", lineHeight: 20 }}>
                {tab === "gunluk" ? t("dash.empty") : t("dash.worldEmpty")}
              </Text>
            </View>
          ) : events.map((e, i) => (
            <Animated.View key={i} entering={FadeInDown.duration(220).delay(Math.min(i, 8) * 30)}>
              <EventCard e={e} last={i === events.length - 1} />
            </Animated.View>
          ))}
          </Animated.View>
        </ScrollView>
      </View>

      {/* ── AKSİYONLAR ── */}
      {p.dead ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 8, gap: 10 }}>
          {p.children.length > 0 && (
            <Pressable onPress={() => router.push("/oyun/nesil")} style={{ paddingVertical: 14, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: "#1a1206", letterSpacing: 1 }}>🕊 {t("dash.continueHeir")} ({p.children.length} {t("dash.heirs")})</Text>
            </Pressable>
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={() => router.push("/oyun/roman")} style={{ flex: 1, paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold, letterSpacing: 1 }}>📖 {t("dash.readLife")}</Text>
            </Pressable>
            <Pressable onPress={async () => { await resetGame(); router.replace("/yeni-oyun"); }} style={{ flex: 1, paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentDim, letterSpacing: 1 }}>🌱 {t("dash.newLife")}</Text>
            </Pressable>
          </View>
        </View>
      ) : (p.age >= 13 && p.profession !== "işsiz") ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
          <PressableScale onPress={() => { hap("tap"); playTap(); doWork(); }} style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
            <GameIcon name="calis" size={15} color={C.gold} />
            <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, letterSpacing: 1.5 }}>{t("act.work")}</Text>
          </PressableScale>
        </View>
      ) : null}
    </View>
  );
}
