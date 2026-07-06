import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ImageBackground, ActivityIndicator, ScrollView, Alert, Image, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInUp, FadeOut, useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import { useGame } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { applyTemperament, TEMPERAMENTS } from "../lib/game";
import { C, F } from "../lib/theme";
import { Ambiance, ParticleBurst, Pulse } from "../lib/fx";
import { SceneArt, Vignette } from "../lib/prolog";
import { isReduceMotion } from "../lib/perf";
import { playTap } from "../lib/sound";

const AnimImage = Animated.createAnimatedComponent(Image);

// ── Sinematik prolog: film dili — başlık kartı, letterbox, sahne başına Ken Burns, kar/köz, otomatik akış ──
// Sahne başına tek yönlü yavaş zoom+pan (yön vuruşa göre değişir; sade modda sabit kadraj).
function CineBackdrop({ beat, reduced }: { beat: number; reduced: boolean }) {
  const sc = useSharedValue(reduced ? 1.06 : 1);
  const tx = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    sc.value = 1; tx.value = beat % 2 === 0 ? 12 : -12;
    sc.value = withTiming(1.15, { duration: 9500, easing: Easing.out(Easing.quad) });
    tx.value = withTiming(beat % 2 === 0 ? -12 : 12, { duration: 9500, easing: Easing.out(Easing.quad) });
  }, [beat, reduced]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }, { translateX: tx.value }] }));
  return <AnimImage source={require("../assets/yeni_oyun_bg.png")} resizeMode="cover" style={[StyleSheet.absoluteFill, st]} />;
}
// Sinema bantları — açılışta üstten/alttan kayarak girer (iç kenarda ince altın hat).
function Letterbox({ reduced }: { reduced: boolean }) {
  const h = useSharedValue(reduced ? 38 : 0);
  useEffect(() => { if (!reduced) h.value = withTiming(38, { duration: 1300, easing: Easing.out(Easing.cubic) }); }, [reduced]);
  const st = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: "rgba(201,168,76,0.22)", zIndex: 5 }, st]} />
      <Animated.View pointerEvents="none" style={[{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: "rgba(201,168,76,0.22)", zIndex: 5 }, st]} />
    </>
  );
}
// Ortadan iki yana büyüyen altın ayraç çizgisi (her sahnede yeniden çizilir).
function GrowLine({ beat }: { beat: number }) {
  const sx = useSharedValue(0);
  useEffect(() => { sx.value = 0; sx.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }); }, [beat]);
  const st = useAnimatedStyle(() => ({ transform: [{ scaleX: sx.value }] }));
  return <Animated.View style={[{ alignSelf: "center", width: 130, height: 1, backgroundColor: "rgba(201,168,76,0.55)", marginTop: 12, marginBottom: 14 }, st]} />;
}
// Prolog gövdesi: 0. vuruş başlık kartı, ardından hikâye vuruşları. Kendiliğinden akar; dokunuş hızlandırır.
function Prolog({ lines, onDone }: { lines: string[]; onDone: () => void }) {
  const { t } = useI18n();
  const reduced = isReduceMotion();
  const [beat, setBeat] = useState(0);
  const total = lines.length + 1; // +1: başlık kartı
  const last = beat === total - 1;
  const SW = Dimensions.get("window").width, SH = Dimensions.get("window").height;
  const next = () => { if (last) { onDone(); return; } playTap(); setBeat(beat + 1); };
  // Film gibi kendiliğinden ilerle: başlık kısa, sahneler uzun; SON sahne dokunuş bekler.
  useEffect(() => {
    if (last) return;
    const id = setTimeout(() => { playTap(); setBeat((b) => Math.min(b + 1, total - 1)); }, beat === 0 ? 3400 : 7500);
    return () => clearTimeout(id);
  }, [beat, last, total]);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <CineBackdrop beat={beat} reduced={reduced} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(6,4,2,0.78)" }]} />
      {/* Sahne tablosu: vuruşa özel silüet + paralaks + ışık (lib/prolog) */}
      <SceneArt beat={beat} reduced={reduced} />
      {/* Sahne atmosferi: doğum gecesine kar, diğerlerine köz; finalde köz gürleşir + tek seferlik patlama */}
      {beat === 2 ? (
        <Ambiance season="Kış" width={SW} height={SH} embers={false} />
      ) : (
        <Ambiance width={SW} height={SH} flakes={false} count={last ? 13 : 6} />
      )}
      {last && !reduced ? <ParticleBurst top="26%" count={14} /> : null}
      <Vignette />
      <Letterbox reduced={reduced} />
      <Pressable onPress={onDone} style={{ position: "absolute", top: 52, right: 18, zIndex: 9, paddingVertical: 6, paddingHorizontal: 13, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", backgroundColor: "rgba(6,4,2,0.55)" }}>
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.parchmentDim }}>{t("new.skip").toUpperCase()}</Text>
      </Pressable>
      <Pressable onPress={next} style={{ flex: 1, justifyContent: "center", paddingHorizontal: 30 }}>
        {beat === 0 ? (
          <Animated.View key="title" entering={FadeIn.duration(1600)} exiting={FadeOut.duration(300)}>
            <Text style={{ fontFamily: F.display, fontSize: 30, letterSpacing: 9, color: C.parchment, textAlign: "center" }}>KRONİKLER</Text>
            <GrowLine beat={beat} />
            <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 5, color: C.goldDim, textAlign: "center" }}>KÜLLERİN MİRASI</Text>
          </Animated.View>
        ) : (
          <Animated.View key={"b" + beat} exiting={FadeOut.duration(300)}>
            <Animated.Text entering={FadeIn.duration(600)} style={{ color: C.gold, textAlign: "center", fontSize: 13, letterSpacing: 4 }}>❧ ⚜ ❧</Animated.Text>
            <GrowLine beat={beat} />
            <Animated.Text entering={reduced ? FadeIn.duration(500) : FadeInUp.delay(350).duration(900)} style={{ fontFamily: F.serif, fontSize: 19, color: C.parchment, textAlign: "center", lineHeight: 30 }}>{lines[beat - 1]}</Animated.Text>
          </Animated.View>
        )}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 7, marginTop: 30 }}>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: i === beat ? C.gold : "rgba(201,168,76,0.3)" }} />
          ))}
        </View>
        <View style={{ marginTop: 28 }}>
          {last ? (
            <Pulse min={0.45} max={1} dur={950}>
              <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.gold, textAlign: "center" }}>{t("new.beginLife")}</Text>
            </Pulse>
          ) : (
            <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.parchmentMuted, textAlign: "center" }}>{t("new.tapNext")}</Text>
          )}
        </View>
      </Pressable>
    </View>
  );
}

export default function YeniOyun() {
  const router = useRouter();
  const { startGame, apply, state } = useGame();
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"erkek" | "kadın" | "">("");
  const [temp, setTemp] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [cinematic, setCinematic] = useState<string[] | null>(null);

  const runStart = async (first: string, surname: string, g: "erkek" | "kadın") => {
    setBusy(true);
    try {
      await startGame(first, surname, g);
      apply((s) => applyTemperament(s, temp));
      const cocuk = gender === "kadın" ? t("ng.childGirl") : t("ng.childBoy");
      setCinematic([
        t("ng.cine1"),
        t("ng.cine2").replace("%c", cocuk).replace("%n", first),
        t("ng.cine3"),
      ]);
    } finally { setBusy(false); }
  };

  const start = () => {
    setError("");
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || "";
    const surname = parts.slice(1).join(" ");
    if (first.length < 2) { setError(t("new.errName")); return; }
    if (!gender) { setError(t("new.errGender")); return; }
    if (!temp) { setError(t("new.errTemp")); return; }
    // Mevcut (yaşayan) kayıt varsa üzerine yazmadan önce onayla — kaza ile silinmesin.
    if (state && !state.player.dead) {
      Alert.alert(t("new.owTitle"), t("new.owBody"), [
        { text: t("new.owCancel"), style: "cancel" },
        { text: t("new.owConfirm"), style: "destructive", onPress: () => runStart(first, surname, gender as "erkek" | "kadın") },
      ]);
      return;
    }
    runStart(first, surname, gender as "erkek" | "kadın");
  };

  if (cinematic) {
    return <Prolog lines={cinematic} onDone={() => router.replace("/oyun")} />;
  }

  const GenderBtn = ({ val, sym, label }: { val: "erkek" | "kadın"; sym: string; label: string }) => {
    const active = gender === val;
    return (
      <Pressable onPress={() => setGender(val)} style={{
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        paddingVertical: 14, borderRadius: 9,
        backgroundColor: active ? "rgba(201,168,76,0.20)" : "rgba(8,5,2,0.62)",
        borderWidth: 1, borderColor: active ? "rgba(201,168,76,0.7)" : "rgba(160,130,70,0.28)",
      }}>
        <Text style={{ fontSize: 17, color: active ? C.gold : C.parchmentMuted }}>{sym}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: active ? C.gold : C.parchmentMuted }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <ImageBackground source={require("../assets/yeni_oyun_bg.png")} resizeMode="cover" style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, backgroundColor: "rgba(8,5,2,0.55)", paddingHorizontal: 24, paddingTop: 54, paddingBottom: 36 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontFamily: F.display, fontSize: 34, letterSpacing: 8, color: C.parchment, textAlign: "center" }}>{t("new.title")}</Text>
          <Text style={{ color: C.gold, textAlign: "center", marginTop: 6, fontSize: 12 }}>⚜</Text>

          <View style={{ marginTop: 36 }}>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 3, color: C.goldDim, marginBottom: 8 }}>{t("new.nameLabel")}</Text>
            <TextInput
              value={fullName} onChangeText={setFullName} placeholder={t("new.namePlaceholder")}
              placeholderTextColor={C.parchmentMuted} maxLength={32} editable={!busy}
              style={{ backgroundColor: "rgba(8,5,2,0.7)", borderWidth: 1, borderColor: "rgba(160,130,70,0.3)", borderRadius: 8, color: C.parchment, fontFamily: F.serif, fontSize: 16, paddingHorizontal: 14, paddingVertical: 12 }}
            />
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 3, color: C.goldDim, marginBottom: 8 }}>{t("new.gender")}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <GenderBtn val="erkek" sym="♂" label={t("new.male")} />
              <GenderBtn val="kadın" sym="♀" label={t("new.female")} />
            </View>
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 3, color: C.goldDim, marginBottom: 8 }}>{t("new.tempLabel")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {TEMPERAMENTS.map((id) => {
                const active = temp === id;
                return (
                  <Pressable key={id} onPress={() => setTemp(id)} style={{
                    width: "48%", paddingVertical: 11, paddingHorizontal: 12, borderRadius: 9,
                    backgroundColor: active ? "rgba(201,168,76,0.20)" : "rgba(8,5,2,0.62)",
                    borderWidth: 1, borderColor: active ? "rgba(201,168,76,0.7)" : "rgba(160,130,70,0.28)",
                  }}>
                    <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: active ? C.gold : C.parchment }}>{t("temp." + id + ".l")}</Text>
                    <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchmentMuted, marginTop: 2 }}>{t("temp." + id + ".d")}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error ? <Text style={{ color: "#ff9b8a", textAlign: "center", marginTop: 16, fontFamily: F.serif }}>{error}</Text> : null}
        </ScrollView>

        <Pressable onPress={start} disabled={busy} style={{
          marginTop: 14, paddingVertical: 16, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.6)",
          backgroundColor: C.gold, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {busy && <ActivityIndicator color={C.inkOnGold} size="small" />}
          <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 3, color: C.inkOnGold }}>
            {busy ? t("new.creating") : t("new.create")}
          </Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}
