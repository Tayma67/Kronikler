import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../../lib/i18n";
import { useMp } from "../../lib/mp/store";
import { BEYLIKS } from "../../lib/game";
import { C, F } from "../../lib/theme";
import { hap } from "../../lib/haptics";
import { BackLabel } from "../../lib/ui";

const pf = (s: string, ...a: (string | number)[]) => a.reduce<string>((acc, v, i) => acc.replace("%" + (i + 1), String(v)), s);
const toneOf = (id: string) => BEYLIKS.find((b) => b.id === id)?.tone || C.gold;

// Paylaşımlı siyasi harita: 5 beylik renk-kodlu, kim bey, nüfuz/vergi, senin durumun.
export default function Harita() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { snapshot, guestId } = useMp();

  if (!snapshot) {
    return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted }}>{t("mp.connecting")}</Text>
    </View>;
  }

  const myBeylikId = snapshot.players.find((p) => p.id === guestId)?.beylikId ?? null;
  const beyById = (id: string | null) => (id ? snapshot.players.find((p) => p.id === id) : null);
  // Sunucu muster formülünün istemci tahmini (oyun ekranındakiyle aynı; lonca/NPC desteği hariç).
  const musterOf = (b: (typeof snapshot.beyliks)[number]) => Math.round(b.power + ((snapshot.players.find((x) => x.id === b.beyId && !x.dead)?.power || 0) * 0.5) + snapshot.players.filter((x) => x.beylikId === b.id && !x.dead && x.id !== b.beyId).reduce((a2, x) => a2 + x.power * 0.25, 0) + (b.ocak ? 15 : 0));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}>
        <Text style={{ fontFamily: F.display, fontSize: 16, letterSpacing: 1, color: C.gold }}>{t("mp.map.title")}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginTop: 2, marginBottom: 8 }}>
          {snapshot.throne.holderName ? pf(t("mp.throneHolder"), snapshot.throne.holderName) : t("mp.throneEmpty")}
        </Text>

        {snapshot.beyliks.map((b) => {
          const tone = toneOf(b.id);
          const bey = beyById(b.beyId);
          const isMine = b.beyId === guestId;
          const inThis = myBeylikId === b.id;
          const beyLabel = b.beyName || (b.ocak ? pf(t("mp.beylik.ocakLine"), b.ocak) : t("mp.beylik.npcHeld"));
          return (
            <View key={b.id} style={{ flexDirection: "row", marginBottom: 10, borderRadius: 11, overflow: "hidden", borderWidth: 1, borderColor: isMine ? "rgba(201,168,76,0.7)" : C.border, backgroundColor: C.card }}>
              {/* Renk şeridi — beyliğin rengi */}
              <View style={{ width: 8, backgroundColor: tone }} />
              <View style={{ flex: 1, padding: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: tone }} />
                  <Text style={{ flex: 1, fontFamily: F.display, fontSize: 14, color: C.parchment }}>{b.name}{isMine ? " ♔" : ""}</Text>
                  {inThis && <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 1, color: C.gold }}>{t("mp.map.youHere")}</Text>}
                </View>
                <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: bey ? C.gold : C.parchmentMuted, marginTop: 6 }}>
                  {pf(t("mp.beylik.beyLine"), beyLabel)}
                </Text>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 3 }}>
                  {pf(t("mp.beylik.powerLine"), b.power)} · {pf(t("mp.beylik.musterLine"), musterOf(b))} · {pf(t("mp.map.tax"), b.tax)}{b.ocak ? " · " + pf(t("mp.beylik.ocakLine"), b.ocak) : ""}
                </Text>
                {(() => { const members = snapshot.players.filter((x) => x.beylikId === b.id && !x.dead); return members.length > 0 ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    {members.map((m) => (
                      <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: m.online ? C.sage : C.parchmentDim }} />
                        <Text style={{ fontFamily: F.serif, fontSize: 10, color: m.id === guestId ? C.gold : C.parchmentMuted }}>{m.name}</Text>
                      </View>
                    ))}
                  </View>
                ) : null; })()}
              </View>
            </View>
          );
        })}

        <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentDim, marginTop: 4, textAlign: "center" }}>{t("mp.map.hint")}</Text>
      </ScrollView>
    </View>
  );
}
