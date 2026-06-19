import { View, Image, Modal, Text, Pressable, TextInput, ViewStyle, StyleProp, TextStyle, Share } from "react-native";
import { useEffect } from "react";
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedProps, useDerivedValue, withTiming, withSpring, withRepeat, withSequence, ZoomIn, FadeIn, FadeInUp, FadeInDown } from "react-native-reanimated";
import { portreImage } from "./assets";
import { GameIcon } from "./icons";
import { useI18n } from "./i18n";
import { hap, Hap } from "./haptics";
import { DUR, EASE } from "./motion";
import type { Dilemma, Choice } from "./events";
import type { Opportunity } from "./game";
import { ParticleBurst } from "./fx";
import { GlowPulse } from "./skia";
import { C, F } from "./theme";

// Değişince yumuşakça sayan (count-up/down) sayı — UI thread'de, re-render yok.
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
export function AnimatedNumber({ value, style }: { value: number; style?: StyleProp<TextStyle> }) {
  const sv = useSharedValue(value);
  useEffect(() => { sv.value = withTiming(value, { duration: 450, easing: EASE.decel }); }, [value]);
  const rounded = useDerivedValue(() => String(Math.round(sv.value)));
  const props = useAnimatedProps(() => ({ text: rounded.value, defaultValue: String(Math.round(value)) } as any));
  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      animatedProps={props}
      style={[{ padding: 0, margin: 0 }, style]}
    />
  );
}

// Lokalize geri-butonu etiketi (tüm ekranlarda ortak).
export function BackLabel() {
  const { t } = useI18n();
  return <Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>{t("common.back")}</Text>;
}

// Basınca hafifçe küçülen, yaylanarak dönen buton — ortak "his" bileşeni.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function PressableScale({ children, onPress, style, disabled, haptic }: {
  children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean; haptic?: Hap;
}) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={() => { s.value = withTiming(0.96, { duration: DUR.fast, easing: EASE.standard }); }}
      onPressOut={() => { s.value = withSpring(1, { damping: 14, stiffness: 220 }); }}
      onPress={() => { if (disabled) return; if (haptic) hap(haptic); onPress?.(); }}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}

const AnimatedImage = Animated.createAnimatedComponent(Image);
// NPC portrelerine prosedürel çeşitlilik (ton+çevirme+zoom) — sabit görsel havuzunu ~48 kat çoğaltır.
const PORTRE_TINTS = ["rgba(0,0,0,0)", "rgba(125,80,40,0.17)", "rgba(55,90,120,0.17)", "rgba(120,55,65,0.15)", "rgba(80,110,70,0.16)", "rgba(145,120,45,0.15)", "rgba(90,70,120,0.16)", "rgba(35,35,40,0.20)"];
function portreHash(s: string | number): number { const str = String(s); let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; return h; }

export function Portre({ age, gender, size = 44, ring = true, seed }: { age: number; gender: "erkek" | "kadın"; size?: number; ring?: boolean; seed?: string | number }) {
  // Büyük portreler hafifçe "nefes alır" (canlı his); küçük liste portreleri sabit (perf).
  const breathe = size >= 56;
  const sc = useSharedValue(1);
  useEffect(() => {
    if (!breathe) return;
    sc.value = withRepeat(withSequence(
      withTiming(1.04, { duration: 2200, easing: EASE.standard }),
      withTiming(1, { duration: 2200, easing: EASE.standard }),
    ), -1, false);
  }, [breathe]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: breathe ? sc.value : 1 }] }));
  // Prosedürel varyant — yalnızca seed verilen (NPC) ve nefes almayan küçük portrelerde.
  const useVariant = seed != null && !breathe;
  const h = useVariant ? portreHash(seed!) : 0;
  const flip = useVariant && (h & 1) ? -1 : 1;
  const zoom = useVariant ? 1 + (Math.floor(h / 2) % 3) * 0.07 : 1;
  const tint = useVariant ? PORTRE_TINTS[h % PORTRE_TINTS.length] : null;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", borderWidth: ring ? 2 : 1, borderColor: ring ? C.gold : C.borderHi, backgroundColor: "#2a1c0c" }}>
      <AnimatedImage source={portreImage(age, gender)} style={useVariant ? { width: "100%", height: "100%", transform: [{ scaleX: flip }, { scale: zoom }] } : [{ width: "100%", height: "100%" }, st]} resizeMode="cover" />
      {tint ? <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: tint }} /> : null}
    </View>
  );
}

// Dönüm noktası anı — sahne perdesi (kül & köz dokusu).
const MILESTONE_LABEL: Record<string, { tag: string; icon: string }> = {
  meslek_edinme: { tag: "Reşit Oldun", icon: "anvil" },
  evlilik: { tag: "Yeni Bir Ocak", icon: "ring" },
  doğum: { tag: "Soyun Sürüyor", icon: "baby" },
  mülk_alım: { tag: "Adına Bir Tapu", icon: "castle" },
  örgüt_katılım: { tag: "Saflara Katıldın", icon: "crown" },
  savaş_zafer: { tag: "Zafer", icon: "crossed-swords" },
  görev_tamamlandı: { tag: "Görev Tamam", icon: "medal" },
  meslek_değişimi: { tag: "Yeni Bir Yol", icon: "compass" },
  ölüm: { tag: "Hayatın Sonu", icon: "tombstone" },
  nesil_devri: { tag: "Yeni Nesil", icon: "banner" },
};

const MS_ACCENT: Record<string, string> = {
  doğum: C.ink, dogum: C.ink, evlilik: C.rose, kariyer_terfi: C.gold, başarım: C.gold,
  tahta_çıkış: C.gold, şehir_kuruluşu: C.gold, savaş_zaferi: C.ember, komutan_savaşı: C.ember,
  ölüm: C.parchmentMuted, nesil_devri: C.ink,
};
const MS_BURST: Record<string, string[]> = {
  evlilik: ["💍", "🌹", "✨"], doğum: ["✨", "🤍", "🌟"], dogum: ["✨", "🤍", "🌟"],
  kariyer_terfi: ["👑", "✨", "⚜"], tahta_çıkış: ["👑", "✨", "⚜"], şehir_kuruluşu: ["🏰", "✨", "⚜"],
  başarım: ["🏆", "✨", "⚜"], savaş_zaferi: ["⚔", "✨", "🛡"], komutan_savaşı: ["⚔", "✨"], nesil_devri: ["🕊", "✨", "⚜"],
};

// Yayılan parlama halkası (kutlama hissi).
function Burst({ color }: { color: string }) {
  const s = useSharedValue(0.4); const o = useSharedValue(0);
  useEffect(() => {
    s.value = withRepeat(withTiming(2.0, { duration: 1500, easing: EASE.decel }), 2, false);
    o.value = withRepeat(withSequence(withTiming(0.55, { duration: 140 }), withTiming(0, { duration: 1360 })), 2, false);
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: color }, st]} />;
}

// İkonun nazikçe nabız atması.
function IconPulse({ icon, color }: { icon: string; color: string }) {
  const s = useSharedValue(0.4);
  useEffect(() => { s.value = withSequence(withSpring(1.15, { damping: 6, stiffness: 140 }), withSpring(1, { damping: 10 })); }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={st}><GameIcon name={icon} size={42} color={color} /></Animated.View>;
}

export function MilestoneModal({ visible, type, text, onClose }: { visible: boolean; type: string; text: string; onClose: () => void }) {
  const meta = MILESTONE_LABEL[type] || { tag: "Dönüm Noktası", icon: "star" };
  const accent = MS_ACCENT[type] || C.gold;
  const celebratory = type !== "ölüm";
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(6,4,2,0.9)", alignItems: "center", justifyContent: "center", padding: 28 }}>
        <Animated.View entering={ZoomIn.springify().damping(15).stiffness(180)} style={{ width: "100%", maxWidth: 360, backgroundColor: C.card, borderWidth: 1, borderColor: accent + "88", borderRadius: 14, padding: 24, alignItems: "center", overflow: "hidden" }}>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: accent }} />
          {celebratory && <ParticleBurst emojis={MS_BURST[type] || ["✨", "⚜"]} count={18} top={40} />}
          <View style={{ width: 80, height: 80, alignItems: "center", justifyContent: "center", marginTop: 6 }}>
            {celebratory && <GlowPulse size={80} color={accent} />}
            {celebratory && <Burst color={accent} />}
            <IconPulse icon={meta.icon} color={accent} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
            <View style={{ height: 1, width: 24, backgroundColor: accent + "88" }} />
            <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 3, color: accent, textTransform: "uppercase" }}>{meta.tag}</Text>
            <View style={{ height: 1, width: 24, backgroundColor: accent + "88" }} />
          </View>
          <Text style={{ fontFamily: F.serif, fontSize: 16, color: C.parchment, textAlign: "center", lineHeight: 24, marginTop: 14 }}>{text}</Text>
          <Pressable onPress={onClose} style={{ marginTop: 22, paddingVertical: 11, paddingHorizontal: 28, borderRadius: 9, borderWidth: 1.5, borderColor: accent + "99", backgroundColor: accent }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: "#1a1206", letterSpacing: 1.5 }}>DEVAM</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// Başarım açılış bildirimi (küçük, üstten).
export function AchievementToast({ name, icon, onClose }: { name: string | null; icon: string; onClose: () => void }) {
  return (
    <Modal visible={!!name} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, justifyContent: "flex-start", paddingTop: 90, alignItems: "center" }}>
        <Animated.View entering={FadeInDown.springify().damping(16)} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.6)", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, maxWidth: 340 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(201,168,76,0.14)", borderWidth: 1, borderColor: "rgba(201,168,76,0.5)" }}>
            <GameIcon name={icon} size={20} color={C.gold} />
          </View>
          <View>
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2, color: C.goldDim }}>BAŞARIM AÇILDI</Text>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.gold, marginTop: 2 }}>{name}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// İkilem perdesi — anlatısal seçim. onChoose(choice) çağrılır.
export function DilemmaModal({ dilemma, onChoose }: { dilemma: Dilemma | null; onChoose: (c: Choice, i: number) => void }) {
  const { t } = useI18n();
  // i18n anahtarı varsa onu, yoksa ikilemin kendi (TR) metnini kullan.
  const gt = (key: string, fb: string) => { const v = t(key); return v === key ? fb : v; };
  return (
    <Modal visible={!!dilemma} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: "rgba(6,4,2,0.9)", alignItems: "center", justifyContent: "center", padding: 26 }}>
        {dilemma && (
          <Animated.View entering={FadeInUp.springify().damping(16)} style={{ width: "100%", maxWidth: 380, backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", borderRadius: 14, padding: 22 }}>
            <View style={{ alignItems: "center", marginBottom: 6 }}>
              <GameIcon name={dilemma.icon} size={30} color={C.gold} />
            </View>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: C.gold, textAlign: "center", letterSpacing: 0.5, marginTop: 6 }}>{gt("dil." + dilemma.id + ".t", dilemma.title)}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment, textAlign: "center", lineHeight: 21, marginTop: 10, marginBottom: 16 }}>{gt("dil." + dilemma.id + ".x", dilemma.text)}</Text>
            {dilemma.choices.map((c, i) => (
              <Pressable key={i} onPress={() => onChoose(c, i)} style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", marginBottom: 9 }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment, letterSpacing: 0.5, textAlign: "center" }}>{gt("dil." + dilemma.id + ".c" + i, c.label)}</Text>
              </Pressable>
            ))}
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

// Sinematik mersiye / vefat ekranı — bir hayatın duygusal kapanışı.
export function EulogyModal({ visible, name, epithet, bornYear, diedYear, age, professionLine, lines, close, hasHeir, onChronicle, onContinue }: {
  visible: boolean; name: string; epithet: string; bornYear: number; diedYear: number; age: number;
  professionLine: string; lines: string[]; close: string; hasHeir: boolean; onChronicle: () => void; onContinue: () => void;
}) {
  const { t } = useI18n();
  const body = [professionLine, ...lines].filter(Boolean);
  // Paylaşılabilir final kartı (RN yerleşik Share — ekstra paket yok).
  const shareCard = () => {
    const card = `⚜ ${name} ⚜\n${epithet ? `"${epithet}"\n` : ""}${bornYear} – ${diedYear} · ${age} ${t("eul.years")}\n\n${body.join(" ")}\n${close}\n\n— Kronikler`;
    Share.share({ message: card }).catch(() => {});
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: "rgba(4,3,2,0.975)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40 }}>
        <Animated.View entering={FadeIn.duration(700)} style={{ alignItems: "center", width: "100%", maxWidth: 400 }}>
          <Animated.Text entering={FadeInDown.duration(600).delay(150)} style={{ fontSize: 30 }}>🕊</Animated.Text>
          <Animated.Text entering={FadeInDown.duration(600).delay(300)} style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 5, color: C.goldDim, marginTop: 12 }}>{t("eul.eyebrow")}</Animated.Text>
          {!!epithet && <Animated.Text entering={FadeInDown.duration(600).delay(450)} style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.gold, marginTop: 10 }}>“{epithet}”</Animated.Text>}
          <Animated.Text entering={FadeInDown.duration(700).delay(600)} style={{ fontFamily: F.display, fontSize: 26, letterSpacing: 1, color: C.parchment, textAlign: "center", marginTop: 4 }}>{name}</Animated.Text>
          <Animated.Text entering={FadeInDown.duration(600).delay(800)} style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1.5, color: C.parchmentMuted, marginTop: 8 }}>{bornYear} – {diedYear} · {age} {t("eul.years")}</Animated.Text>

          <Animated.Text entering={FadeIn.duration(800).delay(1000)} style={{ color: C.gold, marginVertical: 16 }}>❧ ⚜ ❧</Animated.Text>

          <Animated.Text entering={FadeIn.duration(900).delay(1150)} style={{ fontFamily: F.serif, fontSize: 14.5, color: C.parchmentDim, textAlign: "center", lineHeight: 23 }}>{body.join(" ")}</Animated.Text>
          <Animated.Text entering={FadeIn.duration(900).delay(1500)} style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.gold, textAlign: "center", lineHeight: 23, marginTop: 14 }}>{close}</Animated.Text>

          <Animated.View entering={FadeIn.duration(700).delay(1800)} style={{ marginTop: 18 }}>
            <Pressable onPress={shareCard} style={{ paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.45)", alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 1, color: C.gold }}>↗ {t("eul.share")}</Text>
            </Pressable>
          </Animated.View>
          <Animated.View entering={FadeInUp.duration(700).delay(1900)} style={{ flexDirection: "row", gap: 10, marginTop: 14, alignSelf: "stretch" }}>
            <Pressable onPress={onChronicle} style={{ flex: 1, paddingVertical: 13, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchment }}>{t("eul.chronicle")}</Text>
            </Pressable>
            <Pressable onPress={onContinue} style={{ flex: 1.3, paddingVertical: 13, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.6)", backgroundColor: C.gold, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: "#1a1206" }}>{hasHeir ? t("eul.continue") : t("eul.newLife")}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Anlık fırsat pop-up'ı (eski Fırsatlar sayfasının yerine).
export function OpportunityModal({ opp, onTake, onPass }: { opp: Opportunity | null; onTake: () => void; onPass: () => void }) {
  const { t } = useI18n();
  const gt = (key: string, fb: string) => { const v = t(key); return v === key ? fb : v; };
  const rk = opp ? (opp.risk >= 0.55 ? { k: "high", c: C.blood } : opp.risk >= 0.35 ? { k: "mid", c: C.ember } : { k: "low", c: C.sage }) : { k: "low", c: C.sage };
  return (
    <Modal visible={!!opp} transparent animationType="fade" onRequestClose={onPass}>
      <View style={{ flex: 1, backgroundColor: "rgba(6,4,2,0.9)", alignItems: "center", justifyContent: "center", padding: 26 }}>
        {opp && (
          <Animated.View entering={FadeInUp.springify().damping(16)} style={{ width: "100%", maxWidth: 380, backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", borderRadius: 14, padding: 22 }}>
            <View style={{ alignItems: "center", marginBottom: 4 }}><Text style={{ fontSize: 28 }}>🎲</Text></View>
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2, color: C.goldDim, textAlign: "center", marginTop: 4 }}>{t("frs.popTitle").toUpperCase()}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 17, color: C.gold, textAlign: "center", letterSpacing: 0.5, marginTop: 4 }}>{gt("opp." + opp.key + ".t", opp.title)}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment, textAlign: "center", lineHeight: 21, marginTop: 10, marginBottom: 14 }}>{gt("opp." + opp.key + ".d", opp.desc)}</Text>

            <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <View style={{ backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 11 }}>
                <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold }}>{t("frs.reward")} {opp.reward} ⚜</Text>
              </View>
              <View style={{ backgroundColor: rk.c + "1A", borderWidth: 1, borderColor: rk.c + "66", borderRadius: 20, paddingVertical: 4, paddingHorizontal: 11 }}>
                <Text style={{ fontFamily: F.display, fontSize: 10, color: rk.c }}>{t("frs.risk." + rk.k)} {t("frs.riskLabel")}</Text>
              </View>
              <View style={{ backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 11 }}>
                <Text style={{ fontFamily: F.display, fontSize: 10, color: C.parchmentMuted }}>{t("frs.needStat")}: {t("st." + opp.stat)}</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={onPass} style={{ flex: 1, paddingVertical: 13, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.bg, alignItems: "center" }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentMuted, letterSpacing: 1 }}>{t("frs.pass")}</Text>
              </Pressable>
              <Pressable onPress={onTake} style={{ flex: 2, paddingVertical: 13, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.6)", backgroundColor: C.gold, alignItems: "center" }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: "#1a1206", letterSpacing: 1 }}>{t("frs.take")}</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

// ── Ortak tasarım bileşenleri (Vercel hizası) ──
// Altın çizgi + elmas ayraç.
export function GoldDivider({ mt = 16, mb = 12 }: { mt?: number; mb?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: mt, marginBottom: mb }}>
      <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
      <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: "45deg" }], marginHorizontal: 8 }} />
      <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
    </View>
  );
}

// Bölüm başlığı — altın, harf aralıklı, opsiyonel ikon + sağ çizgi.
export function SectionHead({ title, icon, center }: { title: string; icon?: string; center?: boolean }) {
  if (center) return <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2.5, color: C.gold, textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>{title}</Text>;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 }}>
      {icon ? <GameIcon name={icon} size={14} color={C.gold} /> : null}
      <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.gold, textTransform: "uppercase" }}>{title}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
    </View>
  );
}

// Ekran başlığı (ortalı): başlık + opsiyonel alt başlık + elmas ayraç.
export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text style={{ fontFamily: F.display, fontSize: 21, color: C.parchment, letterSpacing: 1.5, textAlign: "center" }}>{title}</Text>
      {subtitle ? <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted, textAlign: "center", marginTop: 2 }}>{subtitle}</Text> : null}
      <GoldDivider mt={12} mb={8} />
    </View>
  );
}

// İlerleme çubuğu — değer değişince akıcı dolar (UI thread).
export function ProgressBar({ value, max, color, h = 5 }: { value: number; max: number; color: string; h?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const w = useSharedValue(pct);
  useEffect(() => { w.value = withTiming(pct, { duration: 600, easing: EASE.decel }); }, [pct]);
  const style = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ height: h, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: h, overflow: "hidden" }}>
      <Animated.View style={[{ height: h, backgroundColor: color, borderRadius: h }, style]} />
    </View>
  );
}

// ── Vercel Kit bileşenleri (PageHeader / Panel / Pill) ──
export function PageHeader({ kicker, icon, title, sub }: { kicker?: string; icon?: string; title: string; sub?: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(320).easing(EASE.decel)} style={{ alignItems: "center", marginBottom: 14 }}>
      {kicker ? <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 3, color: C.goldDim, textTransform: "uppercase" }}>{kicker}</Text> : null}
      <Text style={{ fontFamily: F.display, fontSize: 22, color: C.parchment, letterSpacing: 1, marginTop: 4, textAlign: "center" }}>{icon ? icon + " " : ""}{title}</Text>
      {sub ? <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted, marginTop: 4, textAlign: "center" }}>{sub}</Text> : null}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, alignSelf: "stretch" }}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
        <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: "45deg" }], marginHorizontal: 8 }} />
        <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
      </View>
    </Animated.View>
  );
}
export function Pill({ text, tone = C.gold }: { text: string; tone?: string }) {
  return (
    <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: tone + "66", backgroundColor: tone + "1A" }}>
      <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: tone }}>{text}</Text>
    </View>
  );
}
export function Panel({ title, icon, tone = C.gold, right, children, noPad, delay = 0 }: { title?: string; icon?: string; tone?: string; right?: React.ReactNode; children: React.ReactNode; noPad?: boolean; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.duration(300).delay(delay).easing(EASE.decel)} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: tone + "33", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
      {title ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: tone + "12" }}>
          {icon ? <Text style={{ fontSize: 15 }}>{icon}</Text> : null}
          <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12, letterSpacing: 1.5, color: tone, textTransform: "uppercase" }}>{title}</Text>
          {right}
        </View>
      ) : null}
      <View style={noPad ? undefined : { padding: 12 }}>{children}</View>
    </Animated.View>
  );
}
