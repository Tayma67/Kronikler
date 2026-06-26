import { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../../lib/i18n";
import { useMp } from "../../lib/mp/store";
import { PlayerPublic } from "../../lib/mp/protocol";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { BackLabel } from "../../lib/ui";

const REALM_BASE_YEAR = 1247;
const pf = (s: string, ...a: (string | number)[]) => a.reduce<string>((acc, v, i) => acc.replace("%" + (i + 1), String(v)), s);

export default function Diyar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { realmId, name } = useLocalSearchParams<{ realmId: string; name: string }>();
  const { status, guestId, snapshot, chat, error, joinRealm, setReady, sendChat, leave } = useMp();
  const [chatText, setChatText] = useState("");
  const [now, setNow] = useState(Date.now());
  const joined = useRef(false);

  // Katıl (bir kez)
  useEffect(() => {
    if (joined.current || !guestId || !realmId) return;
    joined.current = true;
    const me: PlayerPublic = {
      id: guestId, name: String(name || "Hanedan"), surname: "", gender: "erkek",
      age: 7, generation: 1, profession: "işsiz", fame: 0, power: 10,
      crowned: false, guildId: null, provinceName: null, online: true, ready: false, dead: false,
    };
    joinRealm(String(realmId), String(realmId), me);
  }, [guestId, realmId]);

  // Geri sayım için saat
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  // NOT: bağlantı sağlayıcıda yaşar; diyara girince (oyun ekranı) kopmaması için
  // burada otomatik leave YOK — yalnız "Ayrıl"/geri ile çıkılır.

  const players = snapshot?.players || [];
  const me = players.find((p) => p.id === guestId);
  const liveCount = players.filter((p) => p.online && !p.dead).length;
  const readyCount = players.filter((p) => p.online && !p.dead && p.ready).length;
  const turn = snapshot?.turn ?? 0;
  const year = REALM_BASE_YEAR + Math.floor(turn / 12);
  const month = (turn % 12) + 1;
  const secsLeft = snapshot ? Math.max(0, Math.round((snapshot.tickDeadline - now) / 1000)) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => { leave(); router.back(); }}><BackLabel /></Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: status === "open" ? C.sage : status === "connecting" ? C.gold : status === "idle" ? C.parchmentDim : C.blood }} />
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1, color: C.parchmentMuted }}>
            {status === "open" ? t("mp.connected") : status === "connecting" ? t("mp.connecting") : (status === "closed" || status === "error") ? t("mp.reconnecting") : t("mp.connecting")}
          </Text>
        </View>
      </View>

      {/* Diyar başlığı + saat */}
      <View style={{ alignItems: "center", paddingVertical: 8 }}>
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 3, color: C.goldDim }}>{t("mp.realm")} · {String(realmId)}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 18, color: C.gold, marginTop: 4 }}>{t("mp.year")} {year} · {t("mp.month")} {month}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginTop: 2 }}>
          {snapshot?.throne.holderName ? pf(t("mp.throneHolder"), snapshot.throne.holderName) : t("mp.throneEmpty")}
        </Text>
      </View>

      {!snapshot && status !== "error" && (
        <View style={{ alignItems: "center", marginTop: 30 }}><ActivityIndicator color={C.gold} /><Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, marginTop: 10 }}>{t("mp.connecting")}</Text></View>
      )}
      {error && <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.blood, textAlign: "center", marginTop: 20, paddingHorizontal: 24 }}>{error}</Text>}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }}>
        {/* Oyuncular */}
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 12, marginBottom: 8 }}>{t("mp.players")} · {liveCount}</Text>
        {players.length === 0 ? (
          <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted }}>{t("mp.empty")}</Text>
        ) : players.map((p) => (
          <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.online ? C.sage : C.parchmentDim }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: p.id === guestId ? C.gold : C.parchment }}>{p.name} {p.id === guestId ? t("mp.you") : ""}{p.crowned ? " ♔" : ""}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchmentMuted }}>{t("misc.age")} {p.age} · {p.online ? t("mp.online") : t("mp.offlineTag")}</Text>
            </View>
            {p.ready && <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1, color: C.sage }}>{t("mp.ready").toUpperCase()}</Text>}
          </View>
        ))}

        {/* Diyara gir (paylaşımlı oyun) */}
        {snapshot && (
          <Pressable onPress={() => { hap("advance"); router.push({ pathname: "/cok-oyunculu/oyun", params: { name: String(name || "Hanedan") } }); }}
            style={{ marginTop: 18, paddingVertical: 14, borderRadius: 9, alignItems: "center", borderWidth: 1.5, borderColor: "rgba(201,168,76,0.6)", backgroundColor: C.gold }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 2, color: "#2a1d08" }}>{t("mp.enterWorld")}</Text>
          </Pressable>
        )}

        {/* Sohbet */}
        <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 20, marginBottom: 8 }}>{t("mp.chat")}</Text>
        <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, minHeight: 80, backgroundColor: C.card }}>
          {chat.length === 0 ? <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentDim }}>—</Text> :
            chat.map((c, i) => (
              <Text key={i} style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchment, marginBottom: 3 }}>
                <Text style={{ color: c.from === guestId ? C.gold : "#6FA0C0" }}>{c.fromName}: </Text>{c.text}
              </Text>
            ))}
        </View>
      </ScrollView>

      {/* Alt çubuk: hazır oyu + tick geri sayım + sohbet girişi */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 8, paddingTop: 8, paddingHorizontal: 12, backgroundColor: "rgba(8,5,2,0.92)", borderTopWidth: 1, borderTopColor: C.borderHi }}>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          <TextInput value={chatText} onChangeText={setChatText} placeholder={t("mp.chatPlaceholder")} placeholderTextColor={C.parchmentDim}
            style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchment, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.card }}
            onSubmitEditing={() => { if (chatText.trim()) { sendChat(chatText); setChatText(""); } }} returnKeyType="send" />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ flex: 1, fontFamily: F.display, fontSize: 10, letterSpacing: 1, color: C.parchmentMuted }}>
            {pf(t("mp.readyCount"), readyCount, liveCount)} · {pf(t("mp.tickIn"), secsLeft)}
          </Text>
          <Pressable onPress={() => { hap("tap"); setReady(!me?.ready); }} style={{ paddingVertical: 11, paddingHorizontal: 22, borderRadius: 9, borderWidth: 1, borderColor: me?.ready ? "rgba(127,166,106,0.7)" : "rgba(201,168,76,0.6)", backgroundColor: me?.ready ? "rgba(127,166,106,0.15)" : "rgba(201,168,76,0.12)" }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: me?.ready ? C.sage : C.gold }}>{me?.ready ? t("mp.ready") + " ✓" : t("mp.ready")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
