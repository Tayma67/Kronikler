import { View, Text, ScrollView, Pressable, ImageBackground, StyleSheet, Dimensions, Modal } from "react-native";
import { Ambiance, LoadingScreen, KenBurns, ParticleBurst } from "../../lib/fx";
import { CoinShower } from "../../lib/skia";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useState, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { useMp } from "../../lib/mp/store";
import { realmYearMonth } from "../../lib/mp/world";
import { applyDilemma, careerTitle, achievementsOf, GameEvent, opportunitiesFor, resolveOpportunity, resolveMicro, resolveSaga, resolveBloodline, BL_CHOICES, BL_COST, SAGA_CHOICES, SAGA_COST, resolveDivan, inJail, jailBribeCost, bribeJailer, Opportunity, publicPerception, atHome, eulogy, WorkStyle, familyQuestsOf, playerWar, beylikName, childAction, ChildAct, elderAction, ElderAct, adultAction, AdultAct, ADULT_TRAINER_COST, studyEnergy, maxStudyEnergy, STUDY_COST, playEnergy, maxPlayEnergy, PLAY_COST, canWork } from "../../lib/game";
import { pickDilemma, pickFestival, Dilemma, Choice } from "../../lib/events";
import { careerTitleL, placeName } from "../../lib/locale-data";
import { currentCalendar } from "../../lib/calendar";
import { heroImage } from "../../lib/assets";
import { MilestoneModal, DilemmaModal, OpportunityModal, AchievementToast, EulogyModal, PressableScale, Portre, TutorialModal } from "../../lib/ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameIcon } from "../../lib/icons";
import { useI18n, applyParams, renderEvt } from "../../lib/i18n";
import { playTap, playChime, playSaz, playNey } from "../../lib/sound";
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
  // Sonradan eklenen sistemlerin olay türleri (önceden varsayılan yıldıza düşüyordu)
  aile_gorevi: { c: "aile", col: C.rose, gi: "family" }, hanedan_haber: { c: "dunya", col: C.gold, gi: "banner" },
  ocak_savasi: { c: "savas", col: C.ember, gi: "crossed-swords" }, kervan: { c: "ticaret", col: C.sage, gi: "scales" },
  görev_tamamlandı: { c: "gorev", col: C.sage, gi: "scroll-open" }, görev_başarısız: { c: "gorev", col: C.blood, gi: "scroll-open" },
  hikaye_basladi: { c: "hikaye", col: C.ink, gi: "book" }, hikaye_bitti: { c: "hikaye", col: C.gold, gi: "book" },
  kusanma: { c: "beceri", col: C.gold, gi: "shield" }, meslek_edinme: { c: "kariyer", col: C.gold, gi: "crown" },
  mülk_alım: { c: "mulk", col: C.gold, gi: "house" }, mülk_hasat: { c: "mulk", col: C.sage, gi: "coins" }, mülk_yagma: { c: "mulk", col: C.blood, gi: "house" },
  nesil_yatirim: { c: "nesil", col: C.rose, gi: "family" }, piyasa: { c: "ticaret", col: C.gold, gi: "scales" },
  savaş_zafer: { c: "savas", col: C.ember, gi: "crossed-swords" }, savaş_yenilgi: { c: "savas", col: C.blood, gi: "shield" },
  suç_yakalandı: { c: "ceza", col: C.blood, gi: "prisoner" }, taht: { c: "kariyer", col: C.gold, gi: "crown" }, taht_basarisiz: { c: "kariyer", col: C.blood, gi: "crown" },
  terfi: { c: "kariyer", col: C.gold, gi: "crown" }, yerlesim: { c: "mulk", col: C.gold, gi: "castle" }, yonetim: { c: "kariyer", col: C.gold, gi: "crown" },
  fisilti: { c: "sohbet", col: C.parchmentMuted, gi: "family" }, hastalik: { c: "saglik", col: C.blood, gi: "healing" }, yaralanma: { c: "saglik", col: C.blood, gi: "healing" },
  kader: { c: "dunya", col: C.gold, gi: "star" }, nemesis: { c: "savas", col: C.ink, gi: "skull" }, hüner: { c: "beceri", col: C.gold, gi: "medal" },
  örgüt_katılım: { c: "kariyer", col: C.gold, gi: "crown" }, örgüt_ayrılma: { c: "kariyer", col: C.parchmentMuted, gi: "crown" }, örgüt_görev: { c: "gorev", col: C.sage, gi: "scroll-open" },
  söylenti: { c: "dunya", col: C.rose, gi: "speaker" }, tohum: { c: "olay", col: C.gold, gi: "star" },
  doruk: { c: "olay", col: C.goldBright, gi: "crossed-swords" }, huzur: { c: "dunya", col: C.sage, gi: "prayer-beads" },
  cag: { c: "dunya", col: C.goldBright, gi: "crown" },
};
const DEFAULT_EVT = { c: "olay", col: C.gold, gi: "star" };
// Panoda gösterilecek en yeni olay sayısı (tam geçmiş Tarih ekranında). Geç-oyun render kasması önlenir.
const DASH_EVENTS = 40;

function fameRepKey(fame: number) {
  if (fame >= 80) return "rep.legendary"; if (fame >= 60) return "rep.renowned";
  if (fame >= 40) return "rep.heard"; if (fame >= 20) return "rep.known"; return "rep.unknown";
}

// Mini istatistik barı (hero içi).
function MiniStat({ icon, value, max, color }: { icon: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 14, alignItems: "center" }}><GameIcon name={icon} size={11} color={color} /></View>
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
  const { state, doWork, doEat, resetGame, apply, mpMode } = useGame();
  const { snapshot: mpSnapshot } = useMp();
  const { t, lang } = useI18n();
  const [milestone, setMilestone] = useState<GameEvent | null>(null);
  const [freshMark, setFreshMark] = useState<null | { from: number; n: number }>(null); // "bu ay" özeti: son ilerlemede düşen olay sayısı + tarihçe indeksi eşiği
  const [yearReport, setYearReport] = useState<GameEvent | null>(null); // yıl dönümü karnesi (yaş günü ritüeli)
  const [dilemma, setDilemma] = useState<Dilemma | null>(null);
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [ach, setAch] = useState<{ name: string; icon: string } | null>(null);
  const [tab, setTab] = useState<"gunluk" | "dunya">("gunluk");
  const [guideHidden, setGuideHidden] = useState(false);
  useEffect(() => { AsyncStorage.getItem("kronikler_fs_hidden").then((v) => { if (v === "1") setGuideHidden(true); }).catch(() => {}); }, []);
  const hideGuide = () => { setGuideHidden(true); AsyncStorage.setItem("kronikler_fs_hidden", "1").catch(() => {}); };
  const [showTut, setShowTut] = useState(false);
  const [shoot, setShoot] = useState(0);
  const [coinsOn, setCoinsOn] = useState(false);
  const coinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMoney = useRef<number>(state?.player.money ?? 0);
  const seenLen = useRef<number>(state?.history.length ?? 0);
  const [showEulogy, setShowEulogy] = useState(false);
  const [workStyle, setWorkStyle] = useState<WorkStyle>("normal");
  const wasDead = useRef<boolean>(state?.player.dead ?? false);

  // Ölüm anı → sinematik mersiye (yalnızca yeni ölümde).
  useEffect(() => {
    if (!state) return;
    const d = state.player.dead;
    if (d && !wasDead.current) setShowEulogy(true);
    if (!d) setShowEulogy(false);
    wasDead.current = d;
  }, [state?.player.dead]);

  // Akçe anlamlı arttığında altın sikke yağmuru — oynayınca sökülür (sürekli GPU yükü bırakmaz).
  useEffect(() => {
    if (!state) return;
    const m = state.player.money;
    if (m > prevMoney.current + 8) {
      setShoot((k) => k + 1);
      setCoinsOn(true);
      if (coinTimer.current) clearTimeout(coinTimer.current);
      coinTimer.current = setTimeout(() => setCoinsOn(false), 1700);
    }
    prevMoney.current = m;
  }, [state?.player.money]);
  useEffect(() => () => { if (coinTimer.current) clearTimeout(coinTimer.current); }, []);
  const seenAch = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!state) return;
    const done = achievementsOf(state).filter((x) => x.done);
    if (seenAch.current === null) { seenAch.current = new Set(done.map((x) => x.a.id)); return; }
    for (const x of done) {
      if (!seenAch.current.has(x.a.id)) { seenAch.current.add(x.a.id); setAch({ name: t("ach." + x.a.id + ".l"), icon: x.a.icon }); hap("success"); }
    }
  }, [state]);

  // İlk oyunda bir kez bilgilendirici tutorial (kalıcı bayrak ile tekrar açılmaz).
  useEffect(() => {
    let on = true;
    AsyncStorage.getItem("kronikler_sp_tut").then((v) => { if (on && v !== "1") setShowTut(true); }).catch(() => {});
    return () => { on = false; };
  }, []);
  const closeTut = () => { setShowTut(false); AsyncStorage.setItem("kronikler_sp_tut", "1").catch(() => {}); };

  const lastRolledTurn = useRef<number>(state?.turn ?? 0);
  const onChoose = (c: Choice, i: number) => { hap("selection"); let res = c.result; const sk = dilemma ? dilemma.id + ":" + i : undefined; const isFest = !!dilemma && dilemma.id.startsWith("fest_"); if (dilemma) { const k = "dil." + dilemma.id + ".r" + i; const v = t(k); res = v === k ? c.result : v; } apply((s) => applyDilemma(s, c.delta, res, sk, isFest, dilemma ? "dil." + dilemma.id + ".r" + i : undefined)); setDilemma(null); };
  const onResolveOpp = (success: boolean) => { if (!opp) return; hap("advance"); apply((s) => resolveOpportunity(s, opp, success)); setOpp(null); };

  useEffect(() => {
    if (!state) return;
    if (state.turn > lastRolledTurn.current) {
      lastRolledTurn.current = state.turn;
      if (!state.player.dead && !inJail(state.player) && !dilemma && !opp) { // hücrede sokak sahnesi/fırsat çalınmaz
        const fest = pickFestival(state); // şenlik ayı: yılın nabzı rastgele olaydan önce gelir (yılda bir; ay geçerse gelecek yıla)
        if (fest) { setDilemma(fest); playChime(); }
        else {
          const roll = Math.random();
          if (roll < 0.28) { const d = pickDilemma(state); if (d) { setDilemma(d); playSaz(); } }
          else if (roll < 0.50) { const list = opportunitiesFor(state); if (list.length) setOpp(list[Math.floor(Math.random() * list.length)]); }
        }
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
      const land = [...fresh].reverse().find((e) => e.landmark && e.type !== "ölüm" && e.type !== "nesil_devri" && e.type !== "yıl_dönümü");
      const yr = [...fresh].reverse().find((e) => e.type === "yıl_dönümü");
      if (land) setMilestone(land);
      if (yr) setYearReport(yr); // bağımsız: aynı ayda büyük an varsa karne onun kapanışını bekler (render guard'ı !milestone)
      // 2+ gelişme varsa "bu ay" şeridi: çok olaylı aylarda hiçbir şey sessizce kaybolmasın.
      setFreshMark(fresh.length >= 2 ? { from: seenLen.current, n: fresh.length } : null);
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
  // Pano bir "bakış" görünümü: yalnız en yeni DASH_EVENTS olay çizilir (geç-oyunda
  // geçmiş 250'ye dayanırken her aksiyonda 250 kartı yeniden çizip pano kasmasını önler;
  // tam geçmiş "Tümünü gör" → Tarih ekranında). Render maliyeti geçmiş büyüse de sabit kalır.
  const reversed = state.history.map((e, hIdx) => ({ e, hIdx })).reverse();
  const events = reversed.filter(({ e }) => (tab === "dunya" ? e.scope === "makro" : e.scope !== "makro")).slice(0, DASH_EVENTS);

  const EventCard = ({ e, hIdx, last }: { e: GameEvent; hIdx: number; last: boolean }) => {
    const cfg = EVT[e.type] || DEFAULT_EVT;
    const land = !!e.landmark;
    const col = land ? C.goldBright : cfg.col;
    const txt = renderEvt(e.k, e.text, e.p, lang, t, state?.player.gender === "kadın");
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
              {land && <GameIcon name="castle" size={9} color={C.goldBright} />}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              {freshMark && hIdx >= freshMark.from && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.goldBright }} />}
              <Text style={{ fontFamily: F.serifItalic, fontSize: 9.5, color: C.parchmentMuted }}>{timeAgo(e.day)}</Text>
            </View>
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
        {coinsOn && <CoinShower shoot={shoot} width={Dimensions.get("window").width} height={Dimensions.get("window").height} />}
      </View>
      {milestone ? (
        <MilestoneModal visible={true} type={milestone.type} text={milestone.text} onClose={() => setMilestone(null)} />
      ) : dilemma ? (
        <DilemmaModal dilemma={dilemma} onChoose={onChoose} />
      ) : opp ? (
        <OpportunityModal opp={opp} statVal={opp ? state.player.stats[opp.stat] : 5} onResolve={onResolveOpp} onPass={() => { hap("tap"); setOpp(null); }} />
      ) : ach ? (
        <AchievementToast name={ach.name} icon={ach.icon} onClose={() => setAch(null)} />
      ) : null}
      {/* Yıl karnesi: yaş günü ritüeli — yılın izleri + mevcut durum */}
      {yearReport && !milestone && (() => {
        const yrEvents = state.history.filter((ev) => ev.day > turn - 12 && ev.day <= turn && ev.landmark && ev.type !== "yıl_dönümü").slice(-3);
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setYearReport(null)}>
            <View style={{ flex: 1, backgroundColor: "rgba(4,3,2,0.94)", alignItems: "center", justifyContent: "center", padding: 26 }}>
              <Animated.View entering={FadeInDown.duration(400)} style={{ width: "100%", maxWidth: 400, backgroundColor: C.card, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.5)", borderRadius: 16, padding: 20 }}>
                <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 3, color: C.goldDim, textAlign: "center" }}>{t("yr.title").toUpperCase()}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 22, color: C.gold, textAlign: "center", marginTop: 6 }}>{applyParams(t("yr.age"), [p.age])}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchment, textAlign: "center", lineHeight: 20, marginTop: 10 }}>{renderEvt(yearReport.k, yearReport.text, yearReport.p, lang, t, p.gender === "kadın")}</Text>
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 14, marginTop: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="akce" size={12} color={C.gold} /><Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{p.money}</Text></View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="karakter" size={12} color={C.sage} /><Text style={{ fontFamily: F.display, fontSize: 12, color: C.sage }}>{Math.round(p.reputation)}</Text></View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="crown" size={12} color={C.goldDim} /><Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment }}>{fame}</Text></View>
                </View>
                <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2, color: C.goldDim, marginTop: 14, marginBottom: 6 }}>{t("yr.highlights").toUpperCase()}</Text>
                {yrEvents.length === 0 ? (
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted }}>{t("yr.none")}</Text>
                ) : yrEvents.map((ev, i) => (
                  <Text key={i} style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentDim, lineHeight: 17, marginBottom: 4 }}>· {renderEvt(ev.k, ev.text, ev.p, lang, t, p.gender === "kadın")}</Text>
                ))}
                <Pressable onPress={() => { hap("tap"); setYearReport(null); }} style={{ marginTop: 16, paddingVertical: 12, borderRadius: 9, backgroundColor: C.gold, alignItems: "center" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 12, color: C.inkOnGold, letterSpacing: 1 }}>{t("yr.close")}</Text>
                </Pressable>
              </Animated.View>
            </View>
          </Modal>
        );
      })()}
      <TutorialModal visible={showTut} title={t("sp.tut.title")} bullets={[t("sp.tut.b1"), t("sp.tut.b2"), t("sp.tut.b3"), t("sp.tut.b4"), t("sp.tut.b5"), t("sp.tut.b6")]} gotLabel={t("sp.tut.got")} onClose={closeTut} />

      {/* Mersiye — hayatın duygusal kapanışı */}
      {p.dead && (() => {
        const eul = eulogy(state);
        const diedYear = cal.year;
        const profLine = p.profession !== "işsiz" ? applyParams(t("eul.lived"), [careerTitleL(p.profession, p.career_xp, lang)]) : "";
        // Lakap: ep.<id>, kadınsa dişil varyant (ep.<id>.f) varsa onu kullan.
        const epLabel = eul.epithet ? (() => { const fk = "ep." + eul.epithet + ".f"; const fv = t(fk); return p.gender === "kadın" && fv !== fk ? fv : t("ep." + eul.epithet); })() : "";
        return (
          <EulogyModal visible={showEulogy} name={p.name} epithet={epLabel} bornYear={diedYear - p.age} diedYear={diedYear} age={p.age}
            professionLine={profLine} lines={eul.lines.map((l) => applyParams(t(l.k), l.p))} close={t("dynnote." + eul.close)} hasHeir={p.children.length > 0}
            onReel={() => { setShowEulogy(false); router.push("/oyun/tarih?cine=1"); }}
            onChronicle={() => { setShowEulogy(false); router.push("/oyun/roman"); }}
            onContinue={() => { setShowEulogy(false); if (p.children.length > 0) router.push("/oyun/nesil"); else { resetGame(); router.replace("/yeni-oyun"); } }} />
        );
      })()}

      {/* ── HERO (yaşayan sahne: Ken Burns + ambiyans) ── */}
      <KenBurns source={heroImage(p.age, cal.season)} style={{ paddingTop: insets.top }}>
        <View style={{ backgroundColor: "rgba(8,5,2,0.5)", paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.borderHi }}>
          <Ambiance season={cal.season} width={Dimensions.get("window").width} height={180} embers={false} />
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {/* Sol: avatar + mini istatistikler */}
            <View style={{ alignItems: "center", gap: 6, width: 92 }}>
              <View style={{ borderWidth: 2, borderColor: C.gold, borderRadius: 30, padding: 1 }}>
                <Portre age={p.age} gender={p.gender} size={48} ring={false} />
              </View>
              <View style={{ width: 90, backgroundColor: "rgba(8,5,2,0.6)", borderWidth: 1, borderColor: "rgba(201,168,76,0.2)", borderRadius: 9, padding: 7, gap: 6 }}>
                <MiniStat icon="saglik" value={Math.round(p.health)} max={100} color={C.blood} />
                <MiniStat icon="tokluk" value={Math.round(p.hunger)} max={100} color={C.sage} />
                <MiniStat icon="akce" value={Math.round(p.money)} max={500} color={C.gold} />
                <MiniStat icon="orgutler" value={fame} max={100} color={C.ink} />
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
                <GameIcon name="crown" size={18} color={C.gold} />
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
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(8,5,2,0.5)", borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(201,168,76,0.14)" }}>
              <GameIcon name="karakter" size={9} color={C.parchmentDim} />
              <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 1, color: C.parchmentDim }}>{p.age} {t("misc.age").toUpperCase()}</Text>
              <Text style={{ color: C.borderHi }}>·</Text>
              <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 1, color: C.parchmentDim }}>{t("cal.season." + SEASON_KEY[cal.season]).toUpperCase()}</Text>
              <Text style={{ color: C.borderHi }}>·</Text>
              <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 1, color: C.parchmentDim }}>{t("cal.month." + cal.month_no).toUpperCase()} {cal.year}</Text>
            </View>
          </View>
          {p.dead && <Text style={{ color: C.blood, textAlign: "center", marginTop: 8, fontFamily: F.serifItalic }}>{t("dyn.died")}</Text>}
        </View>
      </KenBurns>

      {/* Halk seni nasıl görüyor — kimlik her an görünür */}
      {!p.dead && (() => {
        const pp = publicPerception(state);
        const home = atHome(p);
        return (
          <Pressable onPress={() => router.push("/oyun/karakter")} style={{ marginHorizontal: 12, marginTop: 8, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1, borderColor: home ? "rgba(127,166,106,0.3)" : "rgba(111,160,192,0.3)", backgroundColor: "rgba(8,5,2,0.4)", flexDirection: "row", alignItems: "center", gap: 8 }}>
            <GameIcon name={home ? "sehir" : "firsatlar"} size={13} color={home ? C.sage : C.frost} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentDim }} numberOfLines={1}>{t("percept." + pp.key)}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 9, color: home ? C.sage : C.frost }}>%{Math.round(pp.recog * 100)}</Text>
          </Pressable>
        );
      })()}

      {/* Diyar presence (çok oyuncu): paylaşımlı diyarda olduğunu her an hisset — saat, taht, kaç kişi ayakta (İlişkiler'e köprü) */}
      {mpMode && mpSnapshot && (() => {
        const ym = realmYearMonth(mpSnapshot.turn);
        const live = mpSnapshot.players.filter((x) => x.online && !x.dead).length;
        return (
          <Pressable onPress={() => { hap("tap"); router.push("/cok-oyunculu/oyun"); }} style={{ marginHorizontal: 12, marginTop: 8, padding: 11, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.07)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <GameIcon name="crown" size={13} color={C.gold} />
              <Text style={{ flex: 1, fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.gold, textTransform: "uppercase" }}>{t("mp.realm")}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: C.parchmentMuted }}>{t("mp.year")} {ym.year} · {t("mp.month")} {ym.month}</Text>
            </View>
            <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentDim, marginTop: 4 }}>
              {mpSnapshot.throne.holderName ? applyParams(t("mp.throneHolder"), [mpSnapshot.throne.holderName]) : t("mp.throneEmpty")} · {applyParams(t("mp.pulse.here"), [live])}
            </Text>
          </Pressable>
        );
      })()}
      {/* İLK ADIMLAR yol haritası kartı kullanıcı isteğiyle kaldırıldı (ana sayfada yer kaplamasın). */}

      {/* Zindan: ağır suçun bedeli — süre dolana ya da gardiyan sussuzlanana dek çoğu kapı kilitli */}
      {!p.dead && inJail(p) && (() => {
        const cost = jailBribeCost(state);
        const able = p.money >= cost;
        return (
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(168,52,52,0.5)", backgroundColor: "rgba(168,52,52,0.10)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <GameIcon name="hood" size={15} color={C.blood} />
              <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.blood, textTransform: "uppercase" }}>{t("jail.title")}</Text>
              <Text style={{ marginLeft: "auto", fontFamily: F.serif, fontSize: 11, color: C.parchmentDim }}>{applyParams(t("jail.left"), [p.jail!.left])}</Text>
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, marginTop: 6, lineHeight: 16 }}>{t("jail.hint")}</Text>
            <Pressable disabled={!able} onPress={() => { hap("heavy"); apply((s) => bribeJailer(s)); }} style={{ alignSelf: "flex-start", marginTop: 8, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: able ? "rgba(201,168,76,0.5)" : C.border, opacity: able ? 1 : 0.45 }}>
              <Text style={{ fontFamily: F.display, fontSize: 10, color: able ? C.gold : C.parchmentMuted }}>{applyParams(t("jail.bribeBtn"), [cost])}</Text>
            </Pressable>
          </View>
        );
      })()}

      {/* Ay-içi mikro an — atlanabilir küçük seçim (yok sayılırsa ertesi ay kaybolur) */}
      {!p.dead && state.micro && (() => {
        const m = state.micro!;
        return (
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(126,138,106,0.45)", backgroundColor: "rgba(126,138,106,0.08)" }}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchment }}>{t("micro." + m.id + ".x")}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {([0, 1] as const).map((c) => {
                const dis = m.id === "cirak_tabla" && c === 1 && p.money < 2;
                return (
                <Pressable key={c} disabled={dis} onPress={() => { hap("tap"); apply((s) => resolveMicro(s, c)); }} style={{ flex: 1, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", opacity: dis ? 0.4 : 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold, letterSpacing: 0.5, textAlign: "center" }}>{t("micro." + m.id + ".c" + c)}</Text>
                </Pressable>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* Kan Defteri — nesiller aşan dava destanı sahnesi (panoda bekler) */}
      {!p.dead && state.bloodline?.scene && (() => {
        const sc = state.bloodline!.scene!;
        const n = BL_CHOICES[sc] || 2;
        return (
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 8, borderWidth: 1.5, borderColor: "rgba(168,52,52,0.6)", backgroundColor: "rgba(168,52,52,0.08)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <GameIcon name="skull" size={13} color={C.blood} />
              <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.blood, textTransform: "uppercase" }}>{t("bl.title")}</Text>
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchment, lineHeight: 19 }}>{t("bl." + sc + ".x")}</Text>
            <View style={{ gap: 7, marginTop: 10 }}>
              {Array.from({ length: n }, (_, c) => {
                const need = BL_COST[sc]?.[c] || 0;
                const dis = need > 0 && p.money < need;
                return (
                  <Pressable key={c} disabled={dis} onPress={() => { hap("tap"); apply((s) => resolveBloodline(s, c as 0 | 1 | 2)); }} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: "rgba(168,52,52,0.4)", backgroundColor: "rgba(168,52,52,0.06)", opacity: dis ? 0.4 : 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 10, color: C.blood, letterSpacing: 0.5 }}>{t("bl." + sc + ".c" + c)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* Kül Yemini — nesiller aşan destan sahnesi (panoda bekler; acele ettirmez) */}
      {!p.dead && state.saga?.scene && (() => {
        const sc = state.saga!.scene!;
        const n = SAGA_CHOICES[sc] || 3;
        return (
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 8, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.65)", backgroundColor: "rgba(201,168,76,0.10)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <GameIcon name="scroll" size={13} color={C.gold} />
              <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.gold, textTransform: "uppercase" }}>{t("saga.title")}</Text>
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchment, lineHeight: 19 }}>{t("saga." + sc + ".x")}</Text>
            <View style={{ gap: 7, marginTop: 10 }}>
              {Array.from({ length: n }, (_, c) => {
                const need = SAGA_COST[sc]?.[c] || 0;
                const dis = need > 0 && p.money < need;
                return (
                  <Pressable key={c} disabled={dis} onPress={() => { hap("tap"); apply((s) => resolveSaga(s, c as 0 | 1 | 2)); }} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.07)", opacity: dis ? 0.4 : 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold, letterSpacing: 0.5 }}>{t("saga." + sc + ".c" + c)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* Sefer şeridi — ordu yoldayken her ay göz önünde (hanedan ekranına köprü) */}
      {!p.dead && state.crownCampaign && (() => {
        const cc = state.crownCampaign!;
        return (
          <Pressable onPress={() => { hap("tap"); router.push("/oyun/hanedan"); }} style={{ marginHorizontal: 12, marginTop: 8, padding: 11, borderRadius: 8, borderWidth: 1, borderColor: "rgba(200,64,64,0.55)", borderLeftWidth: 3, borderLeftColor: C.ember, backgroundColor: "rgba(200,64,64,0.08)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <GameIcon name="crossed-swords" size={13} color={C.ember} />
              <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12, color: C.parchment, lineHeight: 17 }}>
                {applyParams(t("crown.cmp.band"), [t("beylik." + cc.beylikId), t(cc.month < 2 ? "crown.cmp.stage1" : "crown.cmp.stage2"), cc.edge])}
              </Text>
            </View>
          </Pressable>
        );
      })()}

      {/* Divan arzuhali — taç sahibine huzura çıkan dilekçeci (yok sayılırsa ertesi ay düşer) */}
      {!p.dead && p.crowned && state.divan && (() => {
        const d = state.divan!;
        const NEED: Record<string, number> = { su_kavgasi: 100, sinir_haraci: 120, genc_mucit: 150, iki_imam: 200, kayip_kervan: 130, sel_bendi: 140, sahte_tanik: 110, kuru_kuyu: 120, mukerrer_bac: 100, yanik_koy: 160, hekim_ucreti: 120, degirmen_kavgasi: 90, veba_soylenti: 130, koprucu_borcu: 110, gece_bekcisi: 100 };
        return (
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 11, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.55)", backgroundColor: "rgba(201,168,76,0.10)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <GameIcon name="crown" size={13} color={C.gold} />
              <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.gold, textTransform: "uppercase" }}>{t("divan.title")}</Text>
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchment }}>{t("divan." + d.id + ".x")}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {([0, 1] as const).map((c) => {
                const dis = c === 0 && NEED[d.id] != null && p.money < NEED[d.id];
                return (
                <Pressable key={c} disabled={dis} onPress={() => { hap(c === 0 ? "success" : "tap"); if (c === 0) playChime(); apply((s) => resolveDivan(s, c)); }} style={{ flex: 1, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.12)", opacity: dis ? 0.4 : 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold, letterSpacing: 0.5, textAlign: "center" }}>{t("divan." + d.id + ".c" + c)}</Text>
                </Pressable>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* Diyar durumu (bağlam) — loncan savaşı / sancak için savaş */}
      {!p.dead && (() => {
        const war = playerWar(state);
        const prizeWar = (state.wars || []).find((w) => w.prize);
        if (!war && !prizeWar) return null;
        const text = war ? t("dash.warMine") : `${beylikName(prizeWar!.prize!)} ${t("dash.warFor")}`;
        return (
          <Pressable onPress={() => { hap("tap"); router.push("/oyun/orgutler"); }} style={{ marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(168,52,52,0.4)", backgroundColor: "rgba(168,52,52,0.08)", flexDirection: "row", alignItems: "center", gap: 9 }}>
            <GameIcon name="crossed-swords" size={15} color={C.blood} />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12, color: C.parchment }}>{text}</Text>
            <Text style={{ color: C.blood, fontFamily: F.display, fontSize: 12 }}>›</Text>
          </Pressable>
        );
      })()}

      {/* Aktif işler şeridi — süreli sistemlerin kalan ayları (tezgâh, iltizam, kiler, rehin, nadas) */}
      {!p.dead && (() => {
        const chips: { icon: string; label: string }[] = [];
        if ((p.stall_until ?? 0) > state.turn) chips.push({ icon: "banner", label: applyParams(t("dash.fx.stall"), [(p.stall_until ?? 0) - state.turn]) });
        if ((p.iltizam_until ?? 0) > state.turn) chips.push({ icon: "scales", label: applyParams(t("dash.fx.iltizam"), [(p.iltizam_until ?? 0) - state.turn]) });
        if ((p.winter_stock_until ?? 0) >= state.turn) chips.push({ icon: "wheat", label: applyParams(t("dash.fx.kiler"), [(p.winter_stock_until ?? 0) - state.turn]) });
        if (p.horse_pawn) chips.push({ icon: "hourglass", label: applyParams(t("dash.fx.rehin"), [Math.max(0, p.horse_pawn.until - state.turn)]) });
        const fal = (p.properties || []).find((pr) => pr.fallow_until !== undefined);
        if (fal) chips.push({ icon: "leaf", label: applyParams(t("dash.fx.nadas"), [Math.max(0, (fal.fallow_until ?? 0) - state.turn)]) });
        // Yoldaşların akşamı: yaşlanan kedi/köpek sessizce hatırlatılır — veda sürpriz olmasın
        if (p.pet?.old) chips.push({ icon: "wool", label: applyParams(t("dash.fx.petOld"), [p.pet.n]) });
        if (p.dog?.old) chips.push({ icon: "sheep", label: applyParams(t("dash.fx.dogOld"), [p.dog.n]) });
        // Ufukta: yaklaşan güzel şeyler — beklenti oyuncuyu yarınki aya çağırır
        if ((p.dowry_chest || 0) > 0 && p.child_meta?.length) {
          const yakin = p.child_meta.map((cm) => 216 - (state.turn - cm.born)).filter((k) => k > 0).sort((a, b) => a - b)[0];
          if (yakin !== undefined) chips.push({ icon: "gems", label: yakin >= 12 ? applyParams(t("dash.fx.ceyizYil"), [Math.ceil(yakin / 12)]) : applyParams(t("dash.fx.ceyizAy"), [yakin]) });
        }
        if ((p.properties || []).some((pr) => pr.type === "bag") && (p.sira_gunu_year ?? -1) !== Math.floor(state.turn / 12)) {
          const kalanBag = cal.month_no <= 8 ? 9 - cal.month_no : cal.month_no === 12 ? 9 : 0;
          if (kalanBag > 0) chips.push({ icon: "amphora", label: applyParams(t("dash.fx.bagbozumu"), [kalanBag]) });
        }
        if (cal.season === "Sonbahar" && (p.winter_stock_until ?? 0) < state.turn) chips.push({ icon: "wheat", label: t("dash.fx.kisBos") });
        if (!chips.length) return null;
        return (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginHorizontal: 12, marginTop: 8 }}>
            {chips.map((c, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 12, borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", backgroundColor: "rgba(201,168,76,0.06)" }}>
                <GameIcon name={c.icon} size={11} color={C.goldDim} />
                <Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.parchmentMuted }}>{c.label}</Text>
              </View>
            ))}
          </View>
        );
      })()}

      {/* Kervan yolculuğu (bağlam) — çok-adımlı rota ilerlemesi */}
      {!p.dead && state.caravan?.route && (
        <Pressable onPress={() => { hap("tap"); router.push("/oyun/pazar"); }} style={{ marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(224,90,48,0.4)", backgroundColor: "rgba(224,90,48,0.08)" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <GameIcon name="camel" size={14} color={C.ember} />
            <Text style={{ flex: 1, fontFamily: F.display, fontSize: 9, letterSpacing: 1.5, color: C.ember, textTransform: "uppercase" }}>{t("dash.caravan")}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchmentMuted }}>{(state.caravan.step ?? 0)}/{state.caravan.route.length - 1}</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 2, marginTop: 5 }}>
            {state.caravan.route.map((stop, i) => {
              const cur = i === (state.caravan!.step ?? 0); const done = i < (state.caravan!.step ?? 0);
              return (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  {i > 0 && <Text style={{ color: done ? C.ember : C.border, fontSize: 10, marginHorizontal: 1 }}>→</Text>}
                  {cur && <GameIcon name="camel" size={10} color={C.ember} />}
                  <Text style={{ fontFamily: cur ? F.display : F.serif, fontSize: cur ? 10.5 : 9.5, color: cur ? C.ember : done ? C.parchmentMuted : C.parchmentDim }}>{placeName(stop, lang)}</Text>
                </View>
              );
            })}
          </View>
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
            {([["gunluk", "roman", t("dash.tabJournal")], ["dunya", "haberler", t("dash.tabWorld")]] as const).map(([k, ic, lbl]) => {
              const active = tab === k;
              return (
                <Pressable key={k} onPress={() => { hap("tap"); setTab(k as "gunluk" | "dunya"); }} style={{
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 7, borderRadius: 7,
                  borderWidth: 1, borderColor: active ? "rgba(201,168,76,0.45)" : C.border,
                  backgroundColor: active ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.02)",
                }}>
                  <GameIcon name={ic} size={13} color={active ? C.gold : C.parchmentMuted} />
                  <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1, color: active ? C.gold : C.parchmentMuted }}>{lbl}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Olay listesi */}
        <ScrollView style={{ flex: 1, backgroundColor: "#221808" }} contentContainerStyle={{ padding: 12 }}>
          {/* "Bu ay" özeti: son ilerlemede 2+ gelişme düştüyse sayısı + işaret açıklaması (çok olaylı aylar sessizce kaybolmasın) */}
          {freshMark && (
            <Animated.View entering={FadeInDown.duration(240)} style={{ backgroundColor: "rgba(224,188,90,0.08)", borderWidth: 1, borderColor: "rgba(224,188,90,0.4)", borderRadius: 9, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <GameIcon name="hourglass" size={13} color={C.goldBright} />
                <Text style={{ flex: 1, fontFamily: F.display, fontSize: 10.5, letterSpacing: 0.5, color: C.goldBright }}>{applyParams(t("dash.monthDigest"), [freshMark.n])}</Text>
              </View>
              {/* Ay parşömeni: sayı değil hikâye — bu ayın son 3 gelişmesi tek satırlık özetlerle (kaybolan aylar bitti) */}
              {state.history.slice(freshMark.from).slice(-3).map((e, i) => (
                <Text key={i} numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchment, marginTop: i === 0 ? 6 : 3 }}>
                  • {renderEvt(e.k, e.text, e.p, lang, t, state.player.gender === "kadın")}
                </Text>
              ))}
            </Animated.View>
          )}
          <Animated.View key={tab} entering={FadeIn.duration(220)}>
          {events.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 30 }}>
              <View style={{ width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.borderHi, backgroundColor: "rgba(201,168,76,0.06)" }}>
                <GameIcon name={tab === "gunluk" ? "roman" : "haberler"} size={26} color={C.goldDim} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, alignSelf: "stretch", paddingHorizontal: 34 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.4 }} />
                <View style={{ width: 5, height: 5, backgroundColor: C.gold, transform: [{ rotate: "45deg" }] }} />
                <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.4 }} />
              </View>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, letterSpacing: 0.5, marginTop: 12 }}>{tab === "gunluk" ? t("dash.emptyTitle") : t("dash.worldEmptyTitle")}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted, textAlign: "center", lineHeight: 19, marginTop: 6, paddingHorizontal: 18 }}>
                {tab === "gunluk" ? t("dash.empty") : t("dash.worldEmpty")}
              </Text>
              <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1, color: C.goldDim, marginTop: 12, textAlign: "center" }}>{t("dash.emptyHint")}</Text>
            </View>
          ) : events.map(({ e, hIdx }, i) => (
            <Animated.View key={i} entering={FadeInDown.duration(220).delay(Math.min(i, 8) * 30)}>
              <EventCard e={e} hIdx={hIdx} last={i === events.length - 1} />
            </Animated.View>
          ))}
          </Animated.View>
        </ScrollView>
      </View>

      {/* Çocukluk uğraşları (7-12) — çocuğa hareket alanı; çalışma gücünden harcar */}
      {!p.dead && !inJail(p) && p.age >= 7 && p.age < 13 && (() => {
        const en = playEnergy(state); const can = en >= PLAY_COST;
        const acts: { k: ChildAct; icon: string; label: string }[] = [
          { k: "oyun", icon: "party", label: t("child.act.oyun") },
          { k: "yardim", icon: "iliskiler", label: t("child.act.yardim") },
          { k: "yaramazlik", icon: "hood", label: t("child.act.yaramazlik") },
          { k: "kesif", icon: "firsatlar", label: t("child.act.kesif") },
        ];
        const onChild = (k: ChildAct) => { if (!can) return; hap("tap"); const r = childAction(state, k); if (!r.blocked) apply(() => r.state); };
        return (
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", backgroundColor: "rgba(201,168,76,0.06)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.gold, textTransform: "uppercase" }}>{t("child.title")}</Text>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {Array.from({ length: maxPlayEnergy(p.age) }).map((_, i) => (
                  <View key={i} style={{ width: 9, height: 9, borderRadius: 2, transform: [{ rotate: "45deg" }], backgroundColor: i < en ? C.gold : "transparent", borderWidth: 1, borderColor: i < en ? C.gold : C.border }} />
                ))}
              </View>
            </View>
            {/* Çocukluk yoldaşı ("can dostu") artık İlişkiler ekranında gösteriliyor (pano kalabalığı azaldı). */}
            {p.child_dream ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 9 }}>
                <GameIcon name="star" size={11} color={C.gold} />
                <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{t("child.dream.label")}: <Text style={{ fontFamily: F.serif, color: C.gold }}>{t("dream." + p.child_dream)}</Text></Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {acts.map((a) => (
                <Pressable key={a.k} onPress={() => onChild(a.k)} disabled={!can} style={{ width: "48%", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: can ? "rgba(201,168,76,0.4)" : C.border, backgroundColor: can ? C.card : C.bg, opacity: can ? 1 : 0.5 }}>
                  <GameIcon name={a.icon} size={16} color={can ? C.gold : C.parchmentMuted} />
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: can ? C.parchment : C.parchmentMuted }}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
            {!can && <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 8 }}>{t("child.spent")}</Text>}
          </View>
        );
      })()}

      {/* Olgunluk uğraşları (18-54) — atıl aylık çalışma gücü işlesin: dört uğraş dört statı besler */}
      {!p.dead && !inJail(p) && p.age >= 18 && p.age < 55 && (() => {
        const en = studyEnergy(state); const can = en >= STUDY_COST;
        const acts: { k: AdultAct; icon: string; label: string; cost?: number }[] = [
          { k: "talim", icon: "crossed-swords", label: t("adult.act.talim"), cost: ADULT_TRAINER_COST },
          { k: "meclis", icon: "iliskiler", label: t("adult.act.meclis") },
          { k: "tefekkur", icon: "scroll", label: t("adult.act.tefekkur") },
          { k: "yuruyus", icon: "firsatlar", label: t("adult.act.yuruyus") },
          { k: "ibadet", icon: "prayer-beads", label: t("adult.act.ibadet") },
        ];
        const onAdult = (k: AdultAct) => { if (!can) return; hap("tap"); const r = adultAction(state, k); if (!r.blocked) { if (k === "ibadet") playNey(); apply(() => r.state); } };
        return (
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(111,160,192,0.3)", backgroundColor: "rgba(111,160,192,0.05)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.frost, textTransform: "uppercase" }}>{t("adult.title")}</Text>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {Array.from({ length: maxStudyEnergy(p.age) }).map((_, i) => (
                  <View key={i} style={{ width: 9, height: 9, borderRadius: 2, transform: [{ rotate: "45deg" }], backgroundColor: i < en ? C.frost : "transparent", borderWidth: 1, borderColor: i < en ? C.frost : C.border }} />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {acts.map((a) => {
                const dis = !can || (a.cost != null && p.money < a.cost);
                return (
                  <Pressable key={a.k} onPress={() => { if (!dis) onAdult(a.k); }} disabled={dis} style={{ width: acts.length % 2 === 1 && a.k === acts[acts.length - 1].k ? "100%" : "48%", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: dis ? C.border : "rgba(111,160,192,0.4)", backgroundColor: dis ? C.bg : C.card, opacity: dis ? 0.5 : 1 }}>
                    <GameIcon name={a.icon} size={16} color={dis ? C.parchmentMuted : C.frost} />
                    <Text style={{ flex: 1, fontFamily: F.display, fontSize: 10.5, color: dis ? C.parchmentMuted : C.parchment }} numberOfLines={1}>{a.label}{a.cost != null ? ` · ${a.cost}⚜` : ""}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* İhtiyarlık uğraşları (55+) — hayatın akşamına anlam; çalışma gücünden harcar */}
      {!p.dead && !inJail(p) && p.age >= 55 && (() => {
        const en = studyEnergy(state); const can = en >= STUDY_COST;
        const acts: { k: ElderAct; icon: string; label: string }[] = [
          { k: "nasihat", icon: "speaker", label: t("elder.act.nasihat") },
          { k: "hayir", icon: "akce", label: t("elder.act.hayir") },
          { k: "dinlen", icon: "saglik", label: t("elder.act.dinlen") },
          { k: "ani", icon: "roman", label: t("elder.act.ani") },
          { k: "tekke", icon: "prayer-beads", label: t("elder.act.tekke") },
        ];
        const onElder = (k: ElderAct) => { if (!can) return; hap("tap"); const r = elderAction(state, k); if (!r.blocked) { if (k === "tekke") playNey(); apply(() => r.state); } };
        return (
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(123,79,175,0.3)", backgroundColor: "rgba(123,79,175,0.06)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.ink, textTransform: "uppercase" }}>{t("elder.title")}</Text>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {Array.from({ length: maxStudyEnergy(p.age) }).map((_, i) => (
                  <View key={i} style={{ width: 9, height: 9, borderRadius: 2, transform: [{ rotate: "45deg" }], backgroundColor: i < en ? C.ink : "transparent", borderWidth: 1, borderColor: i < en ? C.ink : C.border }} />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {acts.map((a) => (
                <Pressable key={a.k} onPress={() => onElder(a.k)} disabled={!can} style={{ width: acts.length % 2 === 1 && a.k === acts[acts.length - 1].k ? "100%" : "48%", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: can ? "rgba(123,79,175,0.4)" : C.border, backgroundColor: can ? C.card : C.bg, opacity: can ? 1 : 0.5 }}>
                  <GameIcon name={a.icon} size={16} color={can ? C.ink : C.parchmentMuted} />
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.display, fontSize: 11, color: can ? C.parchment : C.parchmentMuted }}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
            {!can && <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 8 }}>{t("child.spent")}</Text>}
          </View>
        );
      })()}

      {/* Aktif hikâye çağrısı */}
      {!p.dead && state.story?.active && (
        <Pressable onPress={() => router.push("/oyun/hikayeler")} style={{ marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", flexDirection: "row", alignItems: "center", gap: 8 }}>
          <GameIcon name="roman" size={16} color={C.gold} />
          <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12, color: C.parchment }}>{t("dash.storyCta")}</Text>
          <Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>›</Text>
        </Pressable>
      )}

      {/* ── AKSİYONLAR ── */}
      {p.dead ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 8, gap: 10 }}>
          {p.children.length > 0 && (
            <Pressable onPress={() => router.push("/oyun/nesil")} style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, paddingVertical: 14, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold }}>
              <GameIcon name="hanedan" size={14} color={C.inkOnGold} />
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.inkOnGold, letterSpacing: 1 }}>{t("dash.continueHeir")} ({p.children.length} {t("dash.heirs")})</Text>
            </Pressable>
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={() => router.push("/oyun/roman")} style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
              <GameIcon name="roman" size={13} color={C.gold} />
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold, letterSpacing: 1 }}>{t("dash.readLife")}</Text>
            </Pressable>
            <Pressable onPress={async () => { await resetGame(); router.replace("/yeni-oyun"); }} style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
              <GameIcon name="leaf" size={13} color={C.parchmentDim} />
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentDim, letterSpacing: 1 }}>{t("dash.newLife")}</Text>
            </Pressable>
          </View>
        </View>
      ) : (p.age >= 13 && p.profession !== "işsiz") ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
          {/* Çalışma stili seçici (Vercel work_rework.py) */}
          <View style={{ flexDirection: "row", gap: 5, marginBottom: 7 }}>
            {(["garantici", "normal", "hirsli", "kaytarici"] as const).map((ws) => {
              const on = workStyle === ws;
              return (
                <Pressable key={ws} onPress={() => { hap("tap"); setWorkStyle(ws); }} style={{ flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: on ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: on ? "rgba(201,168,76,0.14)" : "transparent" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 8.5, letterSpacing: 0.3, color: on ? C.gold : C.parchmentMuted }}>{t("work.style." + ws)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.parchmentMuted, marginBottom: 7, textAlign: "center" }}>{t("work.hint." + workStyle)}</Text>
          {(() => { const worked = !canWork(state); return (
          <PressableScale onPress={() => { if (worked) return; hap("tap"); playTap(); doWork(workStyle); }} disabled={worked} style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card, opacity: worked ? 0.45 : 1 }}>
            <GameIcon name="calis" size={15} color={C.gold} />
            <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, letterSpacing: 1.5 }}>{worked ? t("act.workedThisTurn") : t("act.work")}</Text>
          </PressableScale>); })()}
        </View>
      ) : null}
    </View>
  );
}
