import { View, Text, ScrollView, Pressable, ImageBackground } from "react-native";
import { useState, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { continueAsHeir, applyDilemma, careerTitle, GameEvent } from "../../lib/game";
import { pickDilemma, Dilemma, Choice } from "../../lib/events";
import { currentCalendar } from "../../lib/calendar";
import { heroImage } from "../../lib/assets";
import { MilestoneModal, DilemmaModal } from "../../lib/ui";
import { GameIcon } from "../../lib/icons";
import { playTap, playAdvance } from "../../lib/sound";
import { C, F } from "../../lib/theme";

function StatBar({ icon, value, max, color }: { icon: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <View style={{ width: 16, alignItems: "center" }}><GameIcon name={icon} size={13} color={color} /></View>
      <View style={{ flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 2 }}>
        <View style={{ width: `${pct}%`, height: 4, backgroundColor: color, borderRadius: 2 }} />
      </View>
      <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchment, width: 34, textAlign: "right" }}>{Math.round(value)}</Text>
    </View>
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, doAdvance, doEat, doWork, resetGame, apply } = useGame();
  const [milestone, setMilestone] = useState<GameEvent | null>(null);
  const [dilemma, setDilemma] = useState<Dilemma | null>(null);
  const seenLen = useRef<number>(state?.history.length ?? 0);

  const lastRolledTurn = useRef<number>(state?.turn ?? 0);
  const onAdvance = () => { playAdvance(); doAdvance(1); };
  const onChoose = (c: Choice) => { apply((s) => applyDilemma(s, c.delta, c.result)); setDilemma(null); };

  // Tur değişiminde taze state üzerinden ara sıra (%28) ikilem çıkar (ölüyse çıkmaz).
  useEffect(() => {
    if (!state) return;
    if (state.turn > lastRolledTurn.current) {
      lastRolledTurn.current = state.turn;
      if (!state.player.dead && !dilemma && Math.random() < 0.28) {
        const d = pickDilemma(state);
        if (d) setDilemma(d);
      }
    } else if (state.turn < lastRolledTurn.current) {
      lastRolledTurn.current = state.turn; // yeni nesil / sıfırlama
    }
  }, [state?.turn]);

  // Yeni eklenen landmark olayını perdede göster (ölüm hariç — ölüm ekranı ayrı).
  useEffect(() => {
    if (!state) return;
    const h = state.history;
    if (h.length > seenLen.current) {
      const fresh = h.slice(seenLen.current);
      const land = [...fresh].reverse().find((e) => e.landmark && e.type !== "ölüm" && e.type !== "nesil_devri");
      if (land) setMilestone(land);
    }
    seenLen.current = h.length;
  }, [state?.history.length]);

  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const cal = currentCalendar(state.turn);
  const events = [...state.history].reverse();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MilestoneModal visible={!!milestone} type={milestone?.type || ""} text={milestone?.text || ""} onClose={() => setMilestone(null)} />
      <DilemmaModal dilemma={dilemma} onChoose={onChoose} />
      {/* Hero — mevsim görseli + koyu örtü */}
      <ImageBackground source={heroImage(p.age, cal.season)} resizeMode="cover" style={{ paddingTop: insets.top }}>
        <View style={{ backgroundColor: "rgba(8,5,2,0.55)", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.borderHi }}>
          <Text style={{ fontFamily: F.display, fontSize: 20, color: C.parchment, letterSpacing: 1, textAlign: "center", textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 8 }}>{p.name}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.gold, textAlign: "center", marginTop: 2 }}>
            {p.profession === "işsiz" ? "İşsiz" : careerTitle(p.profession, p.career_xp)} · {p.age} yaş
          </Text>
          <Text style={{ fontFamily: F.display, fontSize: 9, color: C.parchmentDim, letterSpacing: 1, textAlign: "center", marginTop: 4 }}>
            {cal.season.toUpperCase()} · {cal.month_name.toUpperCase()} {cal.year}
          </Text>
          <View style={{ marginTop: 12, paddingHorizontal: 20 }}>
            <StatBar icon="saglik" value={p.health} max={100} color={C.blood} />
            <StatBar icon="tokluk" value={p.hunger} max={100} color={C.sage} />
            <StatBar icon="akce" value={p.money} max={200} color={C.gold} />
          </View>
          {p.dead && <Text style={{ color: C.blood, textAlign: "center", marginTop: 8, fontFamily: F.serifItalic }}>Hayatını tamamladı.</Text>}
        </View>
      </ImageBackground>

      {/* Aktif hikâye çağrısı */}
      {!p.dead && state.story?.active && (
        <Pressable onPress={() => router.push("/oyun/hikayeler")} style={{ marginHorizontal: 16, marginTop: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", flexDirection: "row", alignItems: "center", gap: 8 }}>
          <GameIcon name="roman" size={16} color={C.gold} />
          <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 12, color: C.parchment }}>Bir hikâyenin ortasındasın — devam etmek için dokun.</Text>
          <Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>›</Text>
        </Pressable>
      )}

      {/* Günlük */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
        <View style={{ width: 3, height: 18, backgroundColor: C.gold, borderRadius: 2 }} />
        <Text style={{ fontFamily: F.display, fontSize: 14, color: C.gold, letterSpacing: 1.5 }}>HAYAT GÜNLÜĞÜ</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {events.length === 0 ? (
          <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, textAlign: "center", marginTop: 30 }}>
            Günlüğün henüz boş. Ayı ilerlet, hikayen başlasın.
          </Text>
        ) : events.map((e, i) => (
          <View key={i} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftColor: C.gold, borderLeftWidth: 2.5, borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment, lineHeight: 20 }}>{e.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Aksiyonlar */}
      {p.dead ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border, gap: 10 }}>
          {p.children.length > 0 && (
            <Pressable onPress={() => apply(continueAsHeir)} style={{ paddingVertical: 14, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: "#1a1206", letterSpacing: 1 }}>🕊 NESLİ DEVAM ETTİR ({p.children[0]})</Text>
            </Pressable>
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={() => router.push("/oyun/roman")} style={{ flex: 1, paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold, letterSpacing: 1 }}>📖 HAYATINI OKU</Text>
            </Pressable>
            <Pressable onPress={async () => { await resetGame(); router.replace("/yeni-oyun"); }} style={{ flex: 1, paddingVertical: 14, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentDim, letterSpacing: 1 }}>🌱 YENİ HAYAT</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border }}>
          <Pressable onPress={() => { playTap(); doEat(); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
            <GameIcon name="ye" size={14} color={C.parchmentDim} />
            <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentDim, letterSpacing: 1 }}>YE</Text>
          </Pressable>
          {p.age >= 13 && p.profession !== "işsiz" && (
            <Pressable onPress={() => { playTap(); doWork(); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
              <GameIcon name="calis" size={14} color={C.parchmentDim} />
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentDim, letterSpacing: 1 }}>ÇALIŞ</Text>
            </Pressable>
          )}
          <Pressable onPress={onAdvance} style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 14, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold }}>
            <GameIcon name="ilerle" size={16} color="#1a1206" />
            <Text style={{ fontFamily: F.display, fontSize: 14, color: "#1a1206", letterSpacing: 2 }}>AYI İLERLE</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
