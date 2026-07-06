import { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../../lib/i18n";
import { useMp } from "../../lib/mp/store";
import { getServerUrl, setServerUrl, getSavedName, setSavedName, getHttpBase, getTutorialSeen, setTutorialSeen } from "../../lib/mp/config";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader } from "../../lib/ui";

const pf = (s: string, ...a: (string | number)[]) => a.reduce<string>((acc, v, i) => acc.replace("%" + (i + 1), String(v)), s);

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
  const [rooms, setRooms] = useState<{ realmId: string; name: string; count: number }[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [showTut, setShowTut] = useState(false);

  useEffect(() => { getServerUrl().then((u) => { setUrl(u); setServerDraft(u); }); getSavedName().then(setName); getTutorialSeen().then((seen) => { if (!seen) setShowTut(true); }); }, []);
  const dismissTut = () => { setShowTut(false); setTutorialSeen(); };

  // Açık diyarları çek (kod paylaşmadan tıkla-katıl).
  const refreshRooms = async () => {
    setLoadingRooms(true);
    try { const b = await getHttpBase(); const r = await fetch(b + "/realms"); const j = await r.json(); setRooms(Array.isArray(j?.realms) ? j.realms : []); }
    catch { setRooms([]); }
    finally { setLoadingRooms(false); }
  };
  useEffect(() => { if (serverUrl) refreshRooms(); }, [serverUrl]);

  const [gender, setGender] = useState<"erkek" | "kadın">("erkek"); // MP karakteri de SP gibi cinsiyet seçer (dişil dil desteği dahil)
  const saveServer = async () => { hap("tap"); await setServerUrl(serverDraft.trim()); setUrl(serverDraft.trim()); };
  const go = async (realmId: string) => {
    const nm = name.trim() || "Hanedan";
    await setSavedName(nm);
    hap("advance");
    router.push({ pathname: "/cok-oyunculu/diyar", params: { realmId, name: nm, gender } });
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
            <Pressable accessibilityRole="button" accessibilityLabel={t("a11y.clearField")} onPress={() => setUrl("")} hitSlop={8}><GameIcon name="ayarlar" size={14} color={C.goldDim} /></Pressable>
          </View>
        )}

        {/* Hanedan adı */}
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 20, marginBottom: 8 }}>{t("mp.nameLabel")}</Text>
        <TextInput value={name} onChangeText={setName} maxLength={20} placeholder={t("mp.namePlaceholder")} placeholderTextColor={C.parchmentDim}
          style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderRadius: 9, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.card }} />
        {/* Cinsiyet: SP'deki yeni-oyun akışıyla parite */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          {(["erkek", "kadın"] as const).map((gnd) => (
            <Pressable key={gnd} onPress={() => { hap("tap"); setGender(gnd); }} style={{ flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center", borderWidth: 1, borderColor: gender === gnd ? "rgba(201,168,76,0.7)" : C.border, backgroundColor: gender === gnd ? "rgba(201,168,76,0.14)" : C.card }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: gender === gnd ? C.gold : C.parchmentMuted }}>{gnd === "erkek" ? t("misc.male").toUpperCase() : t("misc.female").toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {/* Diyar Kur */}
        <Pressable disabled={!serverReady} onPress={() => go(newRealmCode())} style={{ marginTop: 22, paddingVertical: 15, borderRadius: 9, alignItems: "center", borderWidth: 1.5, borderColor: "rgba(201,168,76,0.6)", backgroundColor: serverReady ? C.gold : C.card, opacity: serverReady ? 1 : 0.5 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 2, color: serverReady ? C.inkOnGold : C.parchmentMuted }}>{t("mp.createRealm")}</Text>
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
            <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.frost }}>{t("mp.joinRealm")}</Text>
          </Pressable>
        </View>

        {/* Açık Diyarlar — kod paylaşmadan tıkla-katıl */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 22 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 2, color: C.goldDim }}>{t("mp.openRealms").toUpperCase()}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t("a11y.refresh")} onPress={() => { hap("tap"); refreshRooms(); }} hitSlop={8}><GameIcon name="ilerle" size={13} color={C.goldDim} /></Pressable>
          <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        </View>
        {loadingRooms ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}><ActivityIndicator color={C.goldDim} /><Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted }}>{t("mp.connecting")}</Text></View>
        ) : rooms.length === 0 ? (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentDim, marginTop: 12, textAlign: "center" }}>{t("mp.noOpenRealms")}</Text>
        ) : rooms.map((r) => (
          <Pressable key={r.realmId} disabled={!serverReady} onPress={() => go(r.realmId)} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, paddingVertical: 11, paddingHorizontal: 13, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: C.card }}>
            <GameIcon name="iliskiler" size={15} color={C.frost} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.parchment }}>{r.name}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted }}>{r.realmId} · {pf(t("mp.realmPlayers"), r.count)}</Text>
            </View>
            <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.frost }}>{t("mp.joinRealm")}</Text>
          </Pressable>
        ))}

        {status === "connecting" && <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18 }}><ActivityIndicator color={C.gold} /><Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted }}>{t("mp.connecting")}</Text></View>}
        {error && <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.blood, marginTop: 16 }}>{error}</Text>}
      </ScrollView>

      {/* İlk-giriş tanıtımı (bir kez) */}
      <Modal visible={showTut} transparent animationType="fade" onRequestClose={dismissTut}>
        <Pressable onPress={dismissTut} style={{ flex: 1, backgroundColor: "rgba(4,3,1,0.82)", justifyContent: "center", paddingHorizontal: 22 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderHi, borderRadius: 14, padding: 20 }}>
            <Text style={{ fontFamily: F.display, fontSize: 15, letterSpacing: 1, color: C.gold, textAlign: "center", marginBottom: 14 }}>{t("mp.tut.title")}</Text>
            {["mp.tut.b1", "mp.tut.b2", "mp.tut.b3", "mp.tut.b4", "mp.tut.b5"].map((k) => (
              <View key={k} style={{ flexDirection: "row", gap: 8, marginBottom: 9 }}>
                <Text style={{ color: C.goldDim, fontFamily: F.display, fontSize: 12 }}>❧</Text>
                <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchment, lineHeight: 19 }}>{t(k)}</Text>
              </View>
            ))}
            <Pressable onPress={dismissTut} style={{ marginTop: 8, paddingVertical: 13, borderRadius: 9, alignItems: "center", borderWidth: 1.5, borderColor: "rgba(201,168,76,0.6)", backgroundColor: C.gold }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.inkOnGold }}>{t("mp.tut.got")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
