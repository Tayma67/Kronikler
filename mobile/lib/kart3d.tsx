// Kart3D — ikilemleri ve fırsatları elle tutulur, üç boyutlu kartlara çevirir.
// Masaya bırakılan kart girişi, perspektifli eğim, sürükleyerek seçim, yüz değiştiren dönüş,
// eğime göre kayan ışık ve arkada bekleyen kader destesi.
// Yüz değişimi kart kenardan görünürken (90°) yapılır: Android'de güvenilmez olan
// backfaceVisibility'ye yaslanmaz. Işık Skia değil düz katmanlardır: 3D dönüşümle birlikte döner.
// Sade modda (lib/perf) süzülme/ışık kapanır, giriş-çıkış anında olur; kart yine tam çalışır.
import { useEffect, useRef, useState, ReactNode } from "react";
import { View, Text, Pressable, Modal, StyleProp, ViewStyle, useWindowDimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withSequence, Easing, SharedValue } from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { C, F } from "./theme";
import { EASE } from "./motion";
import { isReduceMotion } from "./perf";
import { hap } from "./haptics";
import { playTap } from "./sound";
import { GameIcon } from "./icons";
import { useI18n } from "./i18n";
import type { Dilemma, Choice } from "./events";
import type { Opportunity } from "./game";

const YAY = { damping: 15, stiffness: 170, mass: 0.8 };
const KART_W = 360;

// ── Ortak 3D taşıyıcı: giriş, süzülme, eğim, çıkış ──
interface Kart3D {
  tx: SharedValue<number>; ty: SharedValue<number>; idle: SharedValue<number>;
  style: ReturnType<typeof useAnimatedStyle>;
  exit: (cb: () => void) => void; calm: (on: boolean) => void; reduced: boolean;
}
function useKart3D(): Kart3D {
  const reduced = isReduceMotion();
  const tx = useSharedValue(0), ty = useSharedValue(0);
  const enter = useSharedValue(reduced ? 1 : 0), out = useSharedValue(0);
  const idle = useSharedValue(0.5), amp = useSharedValue(reduced ? 0 : 1);
  useEffect(() => {
    if (reduced) return;
    enter.value = withSpring(1, { damping: 14, stiffness: 110, mass: 0.9 });
    idle.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => {
    const e = enter.value, o = out.value, i = (idle.value - 0.75) * amp.value, x = tx.value;
    const egim = Math.max(-24, Math.min(24, x / 9));
    return {
      opacity: Math.min(1, e * 1.6) * (1 - o),
      transform: [
        { perspective: 1000 },
        { translateX: x },
        { translateY: ty.value * 0.35 + (1 - e) * 160 + i * 14 + o * 420 },
        { rotateX: `${(1 - e) * 58 + i * 6 - o * 30}deg` },
        { rotateY: `${egim + i * 8}deg` },
        { rotateZ: `${x / 24}deg` },
        { scale: 0.88 + 0.12 * e + Math.min(0.04, Math.abs(x) / 3000) },
      ],
    };
  });
  const exit = (cb: () => void) => {
    if (reduced) { cb(); return; }
    out.value = withTiming(1, { duration: 260, easing: EASE.accel }, (fin) => { if (fin) scheduleOnRN(cb); });
  };
  const calm = (on: boolean) => { amp.value = withTiming(on || reduced ? 0 : 1, { duration: 300 }); };
  return { tx, ty, idle, style, exit, calm, reduced };
}

// Yüz değiştiren dönüş: flipKey değişince kart kenarına dek döner, yeni yüz yerleşir, yaylanarak açılır.
// Eski yüz dönüşün ilk yarısında son hâliyle kalır; anahtar eşleşince içerik canlı güncellenir.
function DonenYuz({ flipKey, children, reduced }: { flipKey: string; children: ReactNode; reduced: boolean }) {
  const [shown, setShown] = useState(flipKey);
  const last = useRef<ReactNode>(children);
  if (shown === flipKey) last.current = children;
  const rot = useSharedValue(0);
  const ilk = useRef(true);
  useEffect(() => {
    if (shown === flipKey) return;
    if (reduced) { setShown(flipKey); return; }
    rot.value = withTiming(90, { duration: 170, easing: EASE.accel }, (fin) => { if (fin) scheduleOnRN(setShown, flipKey); });
  }, [flipKey]);
  useEffect(() => {
    if (ilk.current) { ilk.current = false; return; }
    if (reduced) return;
    rot.value = withSequence(withTiming(-90, { duration: 0 }), withSpring(0, { damping: 13, stiffness: 150 }));
  }, [shown]);
  const st = useAnimatedStyle(() => ({ transform: [{ perspective: 1000 }, { rotateY: `${rot.value}deg` }] }));
  return <Animated.View style={st}>{shown === flipKey ? children : last.current}</Animated.View>;
}

// Kayan ışık: eğime ters yönde süzülen yumuşak parıltı (kademeli şeritler — gradyan kütüphanesi gerekmez).
function Isik({ tx, idle, w }: { tx: SharedValue<number>; idle: SharedValue<number>; w: number }) {
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -tx.value * 1.3 + (idle.value - 0.75) * 120 }, { rotate: "18deg" }] }));
  const serit = (gen: number, op: number, renk: string) => <View style={{ width: gen, height: "100%", backgroundColor: renk, opacity: op }} />;
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -80, bottom: -80, left: w / 2 - 101, flexDirection: "row" }, st]}>
      {serit(60, 0.03, C.goldSoft)}{serit(34, 0.05, C.goldSoft)}{serit(14, 0.07, C.parchment)}{serit(34, 0.05, C.goldSoft)}{serit(60, 0.03, C.goldSoft)}
    </Animated.View>
  );
}

// Kart yüzü: çift çerçeve, köşe süsleri, kayan ışık.
function KartYuz({ k, tone = C.gold, children, style }: { k: Kart3D; tone?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [w, setW] = useState(0);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ backgroundColor: C.card, borderWidth: 1.5, borderColor: tone + "99", borderRadius: 16, overflow: "hidden", padding: 22, shadowColor: C.bg, shadowOpacity: 0.9, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 14 }, style]}>
      <View pointerEvents="none" style={{ position: "absolute", top: 6, left: 6, right: 6, bottom: 6, borderWidth: 1, borderColor: tone + "33", borderRadius: 11 }} />
      <Text pointerEvents="none" style={{ position: "absolute", top: 10, left: 13, fontSize: 11, color: tone + "88" }}>⚜</Text>
      <Text pointerEvents="none" style={{ position: "absolute", bottom: 10, right: 13, fontSize: 11, color: tone + "88" }}>⚜</Text>
      {!k.reduced && w > 0 && <Isik tx={k.tx} idle={k.idle} w={w} />}
      {children}
    </View>
  );
}

// Arkada bekleyen deste: masada duran iki kart — "kader destesi".
function Deste() {
  const kart = (dy: number, sc: number, rot: number, bg: string) => (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16, backgroundColor: bg, borderWidth: 1, borderColor: C.borderHi, transform: [{ translateY: dy }, { scale: sc }, { rotate: `${rot}deg` }] }} />
  );
  return <>{kart(20, 0.9, 2.5, C.bg)}{kart(10, 0.95, -2, C.surface)}</>;
}

function Arka({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: C.bg + "EB", alignItems: "center", justifyContent: "center", padding: 24 }}>{children}</View>
    </GestureHandlerRootView>
  );
}

// ── İKİLEM: Kader Kartı ──
// Etkilenen değerler (Reigns ruhu): yön söylemez, yalnız NEYİN kıpırdayacağını ve büyüklüğünü ima eder.
const ETKI: Record<string, { icon: string; color: string; big: number }> = {
  money: { icon: "akce", color: C.gold, big: 50 },
  reputation: { icon: "karakter", color: C.sage, big: 4 },
  honor: { icon: "medal", color: C.azure, big: 4 },
  fear: { icon: "skull", color: C.blood, big: 3 },
  fame: { icon: "crown", color: C.ink, big: 4 },
  health: { icon: "saglik", color: C.blood, big: 5 },
  stat_points: { icon: "star", color: C.gold, big: 1 },
};
function etkiler(c: Choice): { k: string; big: boolean }[] {
  const d = (c.delta || {}) as Record<string, unknown>;
  return Object.keys(ETKI).filter((k) => typeof d[k] === "number" && d[k] !== 0).map((k) => ({ k, big: Math.abs(d[k] as number) >= ETKI[k].big }));
}
function EtkiIzi({ c }: { c: Choice }) {
  const list = etkiler(c);
  if (!list.length) return null;
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 7 }}>
      {list.map(({ k, big }) => (
        <View key={k} style={{ alignItems: "center", marginHorizontal: 5 }}>
          <GameIcon name={ETKI[k].icon} size={14} color={ETKI[k].color} />
          <View style={{ width: big ? 6 : 3.5, height: big ? 6 : 3.5, borderRadius: 3, backgroundColor: ETKI[k].color, marginTop: 3 }} />
        </View>
      ))}
    </View>
  );
}

function KaderKarti({ dilemma, onChoose }: { dilemma: Dilemma; onChoose: (c: Choice, i: number) => void }) {
  const { t } = useI18n();
  const gt = (key: string, fb: string) => { const v = t(key); return v === key ? fb : v; };
  const etiket = (i: number) => gt("dil." + dilemma.id + ".c" + i, dilemma.choices[i].label);
  const k = useKart3D();
  const tx = k.tx, ty = k.ty;
  const { width } = useWindowDimensions();
  const T = Math.min(110, width * 0.26); // seçim eşiği (px)
  const ikili = dilemma.choices.length === 2; // kaydırma yalnız iki seçenekte; diğerleri dokunarak
  const [secim, setSecim] = useState<number | null>(null);
  const secimRef = useRef<number | null>(null);
  const cikiyor = useRef(false);
  const armed = useSharedValue(0);

  const commit = (i: number) => {
    if (secimRef.current !== null) return;
    secimRef.current = i; setSecim(i); hap("selection"); playTap();
    tx.value = withSpring(0, YAY); ty.value = withSpring(0, YAY);
  };
  const esik = () => hap("tap");
  const dokun = (i: number) => {
    if (secimRef.current !== null) return;
    if (!ikili || k.reduced) { commit(i); return; }
    tx.value = withTiming(i === 0 ? -T * 0.8 : T * 0.8, { duration: 160, easing: EASE.decel }, (fin) => { if (fin) scheduleOnRN(commit, i); });
  };
  const devam = () => {
    if (cikiyor.current || secim === null) return;
    cikiyor.current = true;
    const i = secim; k.exit(() => onChoose(dilemma.choices[i], i));
  };

  const pan = Gesture.Pan()
    .enabled(ikili && secim === null)
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      "worklet";
      tx.value = e.translationX; ty.value = e.translationY;
      const side = e.translationX > T ? 1 : e.translationX < -T ? -1 : 0;
      if (side !== armed.value) { armed.value = side; if (side !== 0) scheduleOnRN(esik); }
    })
    .onEnd((e) => {
      "worklet";
      const proj = tx.value + e.velocityX * 0.12;
      if (Math.abs(proj) > T) scheduleOnRN(commit, proj < 0 ? 0 : 1);
      else { tx.value = withSpring(0, YAY); ty.value = withSpring(0, YAY); }
      armed.value = 0;
    });

  // Sola eğilince 0. seçenek, sağa eğilince 1. seçenek belirginleşir.
  const solSt = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, (-tx.value - 12) / (T * 0.7))) }));
  const sagSt = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, (tx.value - 12) / (T * 0.7))) }));
  const serit = { position: "absolute" as const, top: 14, maxWidth: "64%" as const, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: C.bg + "F0", borderWidth: 1, borderColor: C.goldBright + "88", zIndex: 3 };

  return (
    <View style={{ width: "100%", maxWidth: KART_W, alignItems: "stretch" }}>
      <View>
        {!k.reduced && <Deste />}
        <GestureDetector gesture={pan}>
          <Animated.View style={k.style}>
            <DonenYuz flipKey={secim === null ? "on" : "arka"} reduced={k.reduced}>
              {secim === null ? (
                <KartYuz k={k}>
                  {/* Etiket kartın EKRANDA KALAN yanına oturur: sola sürüklenen kartın sol kenarı ekrandan taşar. */}
                  {ikili && (
                    <>
                      <Animated.View pointerEvents="none" style={[serit, { right: 14 }, solSt]}>
                        <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 12.5, color: C.goldBright, letterSpacing: 0.4, textAlign: "right" }}>{etiket(0)}</Text>
                      </Animated.View>
                      <Animated.View pointerEvents="none" style={[serit, { left: 14 }, sagSt]}>
                        <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 12.5, color: C.goldBright, letterSpacing: 0.4 }}>{etiket(1)}</Text>
                      </Animated.View>
                    </>
                  )}
                  <View style={{ alignItems: "center", marginTop: 6 }}>
                    <View style={{ width: 62, height: 62, borderRadius: 31, borderWidth: 1.5, borderColor: C.gold + "88", backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
                      <GameIcon name={dilemma.icon} size={30} color={C.gold} />
                    </View>
                  </View>
                  <Text style={{ fontFamily: F.display, fontSize: 17, color: C.gold, textAlign: "center", letterSpacing: 0.5, marginTop: 12 }}>{gt("dil." + dilemma.id + ".t", dilemma.title)}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment, textAlign: "center", lineHeight: 22, marginTop: 10, marginBottom: ikili ? 12 : 4 }}>{gt("dil." + dilemma.id + ".x", dilemma.text)}</Text>
                  {ikili && <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, textAlign: "center" }}>‹  {t("kart.swipe")}  ›</Text>}
                </KartYuz>
              ) : (
                <KartYuz k={k}>
                  <View style={{ alignItems: "center", marginTop: 4 }}><GameIcon name={dilemma.icon} size={22} color={C.goldDim} /></View>
                  <Text style={{ fontFamily: F.display, fontSize: 12.5, letterSpacing: 1, color: C.goldBright, textAlign: "center", marginTop: 8 }}>{etiket(secim)}</Text>
                  <View style={{ alignSelf: "center", width: "40%", height: 1, backgroundColor: C.gold + "55", marginVertical: 12 }} />
                  <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment, textAlign: "center", lineHeight: 22 }}>{gt("dil." + dilemma.id + ".r" + secim, dilemma.choices[secim].result)}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={t("frs.ok")} onPress={devam} style={{ marginTop: 18, alignSelf: "center", paddingVertical: 12, paddingHorizontal: 44, borderRadius: 9, borderWidth: 1.5, borderColor: C.gold + "99", backgroundColor: C.gold }}>
                    <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.inkOnGold }}>{t("frs.ok")}</Text>
                  </Pressable>
                </KartYuz>
              )}
            </DonenYuz>
          </Animated.View>
        </GestureDetector>
      </View>
      {secim === null && (
        <View style={{ flexDirection: ikili ? "row" : "column", direction: "ltr", gap: 10, marginTop: 30 }}>
          {dilemma.choices.map((c, i) => (
            <Pressable key={i} accessibilityRole="button" accessibilityLabel={etiket(i)} onPress={() => dokun(i)} style={{ flex: ikili ? 1 : undefined, paddingVertical: 11, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: C.gold + "66", backgroundColor: C.card, overflow: "hidden" }}>
              {ikili && <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.gold + "2E" }, i === 0 ? solSt : sagSt]} />}
              <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.parchment, letterSpacing: 0.4, textAlign: "center" }}>{etiket(i)}</Text>
              <EtkiIzi c={c} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function KaderKartiModal({ dilemma, onChoose }: { dilemma: Dilemma | null; onChoose: (c: Choice, i: number) => void }) {
  return (
    <Modal visible={!!dilemma} transparent animationType="fade" onRequestClose={() => {}}>
      <Arka>{dilemma && <KaderKarti key={dilemma.id} dilemma={dilemma} onChoose={onChoose} />}</Arka>
    </Modal>
  );
}

// ── FIRSAT: aynı 3D kart; beceri sınavı (durdur) korunur — şans değil hüner ──
function FirsatKarti({ opp, statVal, onResolve, onPass }: { opp: Opportunity; statVal: number; onResolve: (success: boolean) => void; onPass: () => void }) {
  const { t } = useI18n();
  const gt = (key: string, fb: string) => { const v = t(key); return v === key ? fb : v; };
  const k = useKart3D();
  const rk = opp.risk >= 0.55 ? { k: "high", c: C.blood } : opp.risk >= 0.35 ? { k: "mid", c: C.ember } : { k: "low", c: C.sage };
  const [phase, setPhase] = useState<"intro" | "play" | "result">("intro");
  const [pos, setPos] = useState(0);
  const [success, setSuccess] = useState(false);
  const dir = useRef(1);
  const stopped = useRef(false);
  const cikiyor = useRef(false);
  // Başarı bölgesi: hüner büyütür, risk daraltır (orta noktada). Genişlik %12–%64.
  const zoneW = Math.max(12, Math.min(64, 16 + statVal * 4 - opp.risk * 12));
  const zoneStart = 50 - zoneW / 2, zoneEnd = 50 + zoneW / 2;
  // Sınav sırasında kart süzülmez: hüner anında el titremesin.
  useEffect(() => { k.calm(phase === "play"); }, [phase]);
  // Oyun fazında işaretçiyi 0↔100 gezdir (saf JS — durdurunca değer kesin bilinir).
  useEffect(() => {
    if (phase !== "play") return;
    stopped.current = false; dir.current = 1; setPos(0);
    const id = setInterval(() => setPos((p) => { let n = p + dir.current * 3.4; if (n >= 100) { n = 100; dir.current = -1; } else if (n <= 0) { n = 0; dir.current = 1; } return n; }), 24);
    return () => clearInterval(id);
  }, [phase]);
  const onStop = () => { if (stopped.current) return; stopped.current = true; const ok = pos >= zoneStart && pos <= zoneEnd; setSuccess(ok); setPhase("result"); hap(ok ? "success" : "error"); };
  const kapat = (cb: () => void) => { if (cikiyor.current) return; cikiyor.current = true; k.exit(cb); };
  const pill = (txt: string, color: string, bg: string = C.bg, bd: string = C.border) => (
    <View style={{ backgroundColor: bg, borderWidth: 1, borderColor: bd, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 11 }}>
      <Text style={{ fontFamily: F.display, fontSize: 11, color }}>{txt}</Text>
    </View>
  );
  const tone = phase === "result" ? (success ? C.sage : C.blood) : C.gold;
  return (
    <View style={{ width: "100%", maxWidth: KART_W }}>
      {!k.reduced && <Deste />}
      <Animated.View style={k.style}>
        <DonenYuz flipKey={phase} reduced={k.reduced}>
          <KartYuz k={k} tone={tone}>
            {phase === "intro" && (
              <>
                <View style={{ alignItems: "center", marginBottom: 4, marginTop: 4 }}><GameIcon name="compass" size={28} color={C.gold} /></View>
                <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, textAlign: "center", marginTop: 4 }}>{t("frs.popTitle").toUpperCase()}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 17, color: C.gold, textAlign: "center", letterSpacing: 0.5, marginTop: 4 }}>{gt("opp." + opp.key + ".t", opp.title)}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment, textAlign: "center", lineHeight: 22, marginTop: 10, marginBottom: 14 }}>{gt("opp." + opp.key + ".d", opp.desc)}</Text>
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {pill(`${t("frs.reward")} ${opp.reward} ⚜`, C.gold)}
                  {pill(`${t("frs.risk." + rk.k)} ${t("frs.riskLabel")}`, rk.c, rk.c + "1A", rk.c + "66")}
                  {pill(`${t("frs.needStat")}: ${t("st." + opp.stat)}`, C.parchmentMuted)}
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={t("frs.pass")} onPress={() => kapat(onPass)} style={{ flex: 1, paddingVertical: 13, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.bg, alignItems: "center" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.parchmentMuted, letterSpacing: 1 }}>{t("frs.pass")}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={t("frs.take")} onPress={() => { hap("tap"); setPhase("play"); }} style={{ flex: 2, paddingVertical: 13, borderRadius: 9, borderWidth: 1.5, borderColor: C.gold + "99", backgroundColor: C.gold, alignItems: "center" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.inkOnGold, letterSpacing: 1 }}>{t("frs.take")}</Text>
                  </Pressable>
                </View>
              </>
            )}
            {phase === "play" && (
              <>
                <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.gold, textAlign: "center", marginTop: 4 }}>{t("frs.skillTitle")}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentMuted, textAlign: "center", marginTop: 8, marginBottom: 16, lineHeight: 19 }}>{t("frs.skillHint")}</Text>
                {/* Sınav çubuğu: yeşil başarı bölgesi + gezen işaretçi */}
                <View style={{ height: 28, borderRadius: 8, backgroundColor: C.parchment + "10", borderWidth: 1, borderColor: C.border, overflow: "hidden", justifyContent: "center" }}>
                  <View style={{ position: "absolute", left: `${zoneStart}%`, width: `${zoneW}%`, top: 0, bottom: 0, backgroundColor: C.sage + "52", borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.sage }} />
                  <View style={{ position: "absolute", left: `${pos}%`, width: 3, top: -2, bottom: -2, backgroundColor: C.goldBright, marginLeft: -1.5 }} />
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={t("frs.stop")} onPress={onStop} style={{ marginTop: 18, paddingVertical: 14, borderRadius: 9, borderWidth: 1.5, borderColor: C.gold + "99", backgroundColor: C.gold, alignItems: "center" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 2, color: C.inkOnGold }}>{t("frs.stop")}</Text>
                </Pressable>
              </>
            )}
            {phase === "result" && (
              <View style={{ alignItems: "center" }}>
                <GameIcon name={success ? "medal" : "crossed-swords"} size={30} color={success ? C.sage : C.blood} />
                <Text style={{ fontFamily: F.display, fontSize: 16, letterSpacing: 1, color: success ? C.sage : C.blood, marginTop: 8 }}>{success ? t("frs.win") : t("frs.lose")}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 14.5, color: C.parchment, textAlign: "center", marginTop: 8, lineHeight: 21 }}>{success ? gt("opp." + opp.key + ".t", opp.title) + " — " + t("frs.gain").replace("%1", String(opp.reward)) : t("frs.loseNote")}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={t("frs.ok")} onPress={() => kapat(() => onResolve(success))} style={{ marginTop: 18, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 9, borderWidth: 1, borderColor: C.gold + "99", backgroundColor: C.bg, alignItems: "center" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.gold }}>{t("frs.ok")}</Text>
                </Pressable>
              </View>
            )}
          </KartYuz>
        </DonenYuz>
      </Animated.View>
    </View>
  );
}

export function FirsatKartiModal({ opp, statVal = 5, onResolve, onPass }: { opp: Opportunity | null; statVal?: number; onResolve: (success: boolean) => void; onPass: () => void }) {
  return (
    <Modal visible={!!opp} transparent animationType="fade" onRequestClose={onPass}>
      <Arka>{opp && <FirsatKarti key={opp.id} opp={opp} statVal={statVal} onResolve={onResolve} onPass={onPass} />}</Arka>
    </Modal>
  );
}
