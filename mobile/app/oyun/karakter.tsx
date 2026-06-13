import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "../../lib/store";
import { useItem, allocateStat, Stats, factionById } from "../../lib/game";
import { ITEMS } from "../../lib/world";
import { Portre } from "../../lib/ui";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";

function Head({ t }: { t: string }) {
  return <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginTop: 18, marginBottom: 8 }}>{t}</Text>;
}

function Row({ k, v }: { k: string; v: string | number }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{k}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{v}</Text>
    </View>
  );
}

const STAT_ICON: Record<string, string> = { strength: "guc", intelligence: "zeka", charisma: "karizma", stamina: "dayaniklilik" };
function StatRow({ label, value, k, canAdd, onAdd }: { label: string; value: number; k: keyof Stats; canAdd: boolean; onAdd: (k: keyof Stats) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <GameIcon name={STAT_ICON[k]} size={15} color={C.goldDim} />
        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{label}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{value}</Text>
        {canAdd && (
          <Pressable onPress={() => onAdd(k)} style={{ width: 26, height: 26, borderRadius: 6, borderWidth: 1, borderColor: "rgba(201,168,76,0.6)", backgroundColor: "rgba(201,168,76,0.12)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: C.gold, fontSize: 16, lineHeight: 18 }}>+</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function Karakter() {
  const insets = useSafeAreaInsets();
  const { state, apply } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const inv = Object.keys(p.inventory).filter((k) => p.inventory[k] > 0);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 }}>
        <Portre age={p.age} gender={p.gender} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 20, color: C.parchment, letterSpacing: 1 }}>{p.name}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.gold }}>{p.gender === "kadın" ? "Kadın" : "Erkek"} · {p.age} yaş · {p.location_name}</Text>
        </View>
      </View>

      <Head t={p.stat_points > 0 ? `Özellikler · ${p.stat_points} puan` : "Özellikler"} />
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14 }}>
        <StatRow label="Güç" value={p.stats.strength} k="strength" canAdd={p.stat_points > 0} onAdd={(k) => apply((s) => allocateStat(s, k))} />
        <StatRow label="Zekâ" value={p.stats.intelligence} k="intelligence" canAdd={p.stat_points > 0} onAdd={(k) => apply((s) => allocateStat(s, k))} />
        <StatRow label="Karizma" value={p.stats.charisma} k="charisma" canAdd={p.stat_points > 0} onAdd={(k) => apply((s) => allocateStat(s, k))} />
        <StatRow label="Dayanıklılık" value={p.stats.stamina} k="stamina" canAdd={p.stat_points > 0} onAdd={(k) => apply((s) => allocateStat(s, k))} />
        <Row k="Meslek" v={p.profession === "işsiz" ? "İşsiz" : p.profession} />
        <Row k="Sağlık" v={Math.round(p.health)} />
        <Row k="Tokluk" v={Math.round(p.hunger)} />
        <Row k="Akçe" v={`${p.money} ⚜`} />
      </View>

      <Head t="Mevki & Bağlılık" />
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14 }}>
        <Row k="Lonca" v={factionById(p.faction)?.name || "Bağımsız"} />
        <Row k="İtibar" v={Math.round(p.reputation)} />
        <Row k="Şeref" v={Math.round(p.honor)} />
        <Row k="Şöhret" v={Math.round(p.fame)} />
        <Row k="Korku" v={Math.round(p.fear)} />
        <Row k="Nesil" v={`${p.generation}. nesil`} />
      </View>

      <Head t="Aile" />
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14 }}>
        <Row k="Eş" v={p.spouse_name || "—"} />
        <Row k="Çocuklar" v={p.children.length ? p.children.join(", ") : "—"} />
      </View>

      <Head t="Heybe" />
      {inv.length === 0 ? (
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted }}>Heyben boş. Pazardan bir şeyler al.</Text>
      ) : inv.map((k) => {
        const it = ITEMS[k]; const usable = it && (it.feed || it.heal);
        return (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 11, marginBottom: 7 }}>
            <Text style={{ fontSize: 16 }}>{it?.icon || "📦"}</Text>
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{it?.name || k} ×{p.inventory[k]}</Text>
            {usable && (
              <Pressable onPress={() => apply((s) => useItem(s, k))} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.1)" }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold }}>KULLAN</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
