import { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../../lib/i18n";
import { useMp } from "../../lib/mp/store";
import { getServerUrl, setServerUrl, getSavedName, setSavedName } from "../../lib/mp/config";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader } from "../../lib/ui";

// Kısa diyar kodu üret (paylaşılabilir). Kimlik amaçlı; deterministik olması gerekmez.
function newRealmCode(): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = ""; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export default function MpLobby() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { status, error } = useMp();
  const [serverUrl, setUrl] = useState("");
  const [serverDraft, setServerDraft] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => { getServerUrl().then((u) => { setUrl(u); setServerDraft(u); }); getSavedName().then(setName); }, []);

  const saveServer = async () => { hap("tap"); await setServerUrl(serverDraft.trim()); setUrl(serverDraft.trim()); };
  const go = async (realmId: string) => {
    const nm = name.trim() || "Hanedan";
    await setSavedName(nm);
    hap("advance");
    router.push({ pathname: "/cok-oyunculu/diyar", params: { realmId, name: nm } });
  };

  const serverReady = !!serverUrl;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 40 }}>
        <PageHeader kicker={t("mp.title")} title={t("mp.title")} sub={t("mp.subtitle")} />

        {/* Sunucu durumu */}
        {!serverReady && (
          <View style={{ marginTop: 10, borderWidth: 1, borderColor: "rgba(200,120,60,0.5)", backgroundColor: "rgba(200,120,60,0.08)", borderRadius: 10, padding: 14 }}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchment, lineHeight: 19 }}>{t("mp.serverNotSet")}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1, color: C.goldDim, marginTop: 12, marginBottom: 6 }}>{t("mp.serverHint")}</Text>
            <TextInput value={serverDraft} onChangeText={setServerDraft} autoCapitalize="none" autoCorrect={false} placeholder="wss://…" placeholderTextColor={C.parchmentDim}
              style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.card }} />
            <Pressable onPress={saveServer} style={{ marginTop: 10, paddingVertical: 11, borderRadius: 9, alignItems: "center", borderWidth: 1, borderColor: "rgba(201,168,76,0.6)", backgroundColor: "rgba(201,168,76,0.12)" }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.gold }}>{t("mp.serverSave")}</Text>
            </Pressable>
          </View>
        )}
        {serverReady && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, marginBottom: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.sage }} />
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, flex: 1 }} numberOfLines={1}>{t("mp.serverSet")} · {serverUrl}</Text>
            <Pressable onPress={() => setUrl("")} hitSlop={8}><GameIcon name="ayarlar" size={14} color={C.goldDim} /></Pressable>
          </View>
        )}

        {/* Hanedan adı */}
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 20, marginBottom: 8 }}>{t("mp.nameLabel")}</Text>
        <TextInput value={name} onChangeText={setName} maxLength={20} placeholder={t("mp.namePlaceholder")} placeholderTextColor={C.parchmentDim}
          style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderRadius: 9, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.card }} />

        {/* Diyar Kur */}
        <Pressable disabled={!serverReady} onPress={() => go(newRealmCode())} style={{ marginTop: 22, paddingVertical: 15, borderRadius: 9, alignItems: "center", borderWidth: 1.5, borderColor: "rgba(201,168,76,0.6)", backgroundColor: serverReady ? C.gold : C.card, opacity: serverReady ? 1 : 0.5 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 2, color: serverReady ? "#2a1d08" : C.parchmentMuted }}>{t("mp.createRealm")}</Text>
        </Pressable>

        {/* Diyara Katıl */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 2, color: C.goldDim }}>{t("mp.joinRealm").toUpperCase()}</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <TextInput value={joinCode} onChangeText={(v) => setJoinCode(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={5} placeholder={t("mp.realmCodePlaceholder")} placeholderTextColor={C.parchmentDim}
            style={{ flex: 1, fontFamily: F.display, fontSize: 16, letterSpacing: 3, color: C.parchment, borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.card, textAlign: "center" }} />
          <Pressable disabled={!serverReady || joinCode.length < 4} onPress={() => go(joinCode)} style={{ paddingHorizontal: 20, justifyContent: "center", borderRadius: 9, borderWidth: 1, borderColor: "rgba(111,160,192,0.6)", backgroundColor: "rgba(111,160,192,0.12)", opacity: (serverReady && joinCode.length >= 4) ? 1 : 0.5 }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: "#6FA0C0" }}>{t("mp.joinRealm")}</Text>
          </Pressable>
        </View>

        {status === "connecting" && <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18 }}><ActivityIndicator color={C.gold} /><Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted }}>{t("mp.connecting")}</Text></View>}
        {error && <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.blood, marginTop: 16 }}>{error}</Text>}
      </ScrollView>
    </View>
  );
}
