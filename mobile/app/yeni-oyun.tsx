import { useState } from "react";
import { View, Text, TextInput, Pressable, ImageBackground, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useGame } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { applyTemperament, TEMPERAMENTS } from "../lib/game";
import { C, F } from "../lib/theme";

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
  const [beat, setBeat] = useState(0);

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
      setBeat(0);
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

  const nextBeat = () => {
    if (!cinematic) return;
    if (beat < cinematic.length - 1) setBeat(beat + 1);
    else router.replace("/oyun");
  };

  if (cinematic) {
    const last = beat === cinematic.length - 1;
    return (
      <ImageBackground source={require("../assets/yeni_oyun_bg.png")} resizeMode="cover" style={{ flex: 1, backgroundColor: C.bg }}>
        <Pressable onPress={nextBeat} style={{ flex: 1, backgroundColor: "rgba(6,4,2,0.74)", justifyContent: "center", paddingHorizontal: 30 }}>
          <Text style={{ color: C.gold, textAlign: "center", fontSize: 13, letterSpacing: 4, marginBottom: 22 }}>❧ ⚜ ❧</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 19, color: C.parchment, textAlign: "center", lineHeight: 30 }}>{cinematic[beat]}</Text>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 7, marginTop: 30 }}>
            {cinematic.map((_, i) => (
              <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: i === beat ? C.gold : "rgba(201,168,76,0.3)" }} />
            ))}
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.parchmentMuted, textAlign: "center", marginTop: 28 }}>
            {last ? t("new.beginLife") : t("new.tapNext")}
          </Text>
        </Pressable>
      </ImageBackground>
    );
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
          {busy && <ActivityIndicator color="#2a1d08" size="small" />}
          <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 3, color: "#2a1d08" }}>
            {busy ? t("new.creating") : t("new.create")}
          </Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}
