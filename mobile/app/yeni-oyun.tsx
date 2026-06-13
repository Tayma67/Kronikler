import { useState } from "react";
import { View, Text, TextInput, Pressable, ImageBackground, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useGame } from "../lib/store";
import { C, F } from "../lib/theme";

export default function YeniOyun() {
  const router = useRouter();
  const { startGame } = useGame();
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"erkek" | "kadın" | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setError("");
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || "";
    const surname = parts.slice(1).join(" ");
    if (first.length < 2) { setError("Lütfen adını gir (en az 2 harf)"); return; }
    if (!gender) { setError("Lütfen cinsiyetini seç"); return; }
    setBusy(true);
    try { await startGame(first, surname, gender); router.replace("/oyun"); }
    finally { setBusy(false); }
  };

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
      <View style={{ flex: 1, backgroundColor: "rgba(8,5,2,0.55)", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 70, paddingBottom: 40 }}>
        <View>
          <Text style={{ fontFamily: F.display, fontSize: 34, letterSpacing: 8, color: C.parchment, textAlign: "center" }}>YENİ OYUN</Text>
          <Text style={{ color: C.gold, textAlign: "center", marginTop: 6, fontSize: 12 }}>⚜</Text>

          <View style={{ marginTop: 36 }}>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 3, color: C.goldDim, marginBottom: 8 }}>AD SOYAD</Text>
            <TextInput
              value={fullName} onChangeText={setFullName} placeholder="Adını ve soyadını gir"
              placeholderTextColor={C.parchmentMuted} maxLength={32} editable={!busy}
              style={{ backgroundColor: "rgba(8,5,2,0.7)", borderWidth: 1, borderColor: "rgba(160,130,70,0.3)", borderRadius: 8, color: C.parchment, fontFamily: F.serif, fontSize: 16, paddingHorizontal: 14, paddingVertical: 12 }}
            />
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 3, color: C.goldDim, marginBottom: 8 }}>CİNSİYET</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <GenderBtn val="erkek" sym="♂" label="Erkek" />
              <GenderBtn val="kadın" sym="♀" label="Kız" />
            </View>
          </View>

          {error ? <Text style={{ color: "#ff9b8a", textAlign: "center", marginTop: 16, fontFamily: F.serif }}>{error}</Text> : null}
        </View>

        <Pressable onPress={start} disabled={busy} style={{
          paddingVertical: 16, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.6)",
          backgroundColor: C.gold, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {busy && <ActivityIndicator color="#2a1d08" size="small" />}
          <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 3, color: "#2a1d08" }}>
            {busy ? "DÜNYA YARATILIYOR…" : "DÜNYAYI YARAT"}
          </Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}
