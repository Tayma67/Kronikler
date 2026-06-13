import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { SKILL_META, PERKS, perkById, hasPerk, pendingPerkTier, skillLevel, choosePerk, SkillKey } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";

function Tree({ tree, name, icon, blurb }: { tree: SkillKey; name: string; icon: string; blurb: string }) {
  const { state, apply } = useGame();
  const p = state!.player;
  const lvl = p.skills[tree];
  const xp = p.skill_xp[tree];
  const inLevel = xp % 100;
  const pending = pendingPerkTier(p, tree);
  const tiers = [3, 6, 9];

  return (
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: pending ? "rgba(201,168,76,0.5)" : C.border, borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <GameIcon name={icon} size={22} color={C.gold} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{name} · Sv {lvl}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{blurb}</Text>
        </View>
      </View>
      <View style={{ height: 4, backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 2, marginTop: 10 }}>
        <View style={{ width: `${lvl >= 10 ? 100 : inLevel}%`, height: 4, backgroundColor: C.gold, borderRadius: 2 }} />
      </View>

      {tiers.map((t) => {
        const tierPerks = PERKS.filter((pk) => pk.tree === tree && pk.tier === t);
        const chosen = tierPerks.find((pk) => hasPerk(p, pk.id));
        const unlocked = lvl >= t;
        const choosable = unlocked && !chosen && pending === t;
        return (
          <View key={t} style={{ marginTop: 12, opacity: unlocked ? 1 : 0.5 }}>
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2, color: C.goldDim, marginBottom: 6 }}>SEVİYE {t} HÜNERİ {chosen ? "· seçildi" : unlocked ? "· seç" : "· kilitli"}</Text>
            {tierPerks.map((pk) => {
              const isChosen = chosen?.id === pk.id;
              return (
                <Pressable key={pk.id} disabled={!choosable} onPress={() => apply((st) => choosePerk(st, pk.id))} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 6, borderColor: isChosen ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: isChosen ? "rgba(201,168,76,0.12)" : C.bg }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 12, color: isChosen ? C.gold : C.parchment }}>{pk.name}</Text>
                    <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 1 }}>{pk.desc}</Text>
                  </View>
                  {isChosen && <GameIcon name="medal" size={14} color={C.gold} />}
                  {choosable && !isChosen && <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold, letterSpacing: 1 }}>SEÇ</Text>}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

export default function Beceriler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: C.gold, fontFamily: F.display, fontSize: 12 }}>‹ Geri</Text></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1 }}>Beceri Ağacı</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 8 }}>
        Eyleme geçtikçe beceriler gelişir; 3, 6 ve 9. seviyelerde birer hüner seçersin.
      </Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        {SKILL_META.map((m) => <Tree key={m.key} tree={m.key} name={m.name} icon={m.icon} blurb={m.blurb} />)}
      </ScrollView>
    </View>
  );
}
