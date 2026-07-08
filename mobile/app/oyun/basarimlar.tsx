import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { achievementsOf } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { BackLabel, PageHeader, Pill, ScreenFresk } from "../../lib/ui";

// Sayısal eşikli başarımlar için istemci-yanı ilerleme oranı (0-1) — "az kaldı" hissi.
// Yalnız görsel: başarım tanımına dokunmaz; listede olmayanlar bar göstermez.
const PROG: Record<string, (s: any) => number> = {
  ilkakce: (s) => s.player.money / 100, zengin: (s) => s.player.money / 1000, "tüccar2": (s) => s.player.money / 5000,
  mulk: (s) => s.player.properties.length / 1, toprak: (s) => s.player.properties.length / 5,
  baba: (s) => s.player.children.length / 1, kalabalik: (s) => s.player.children.length / 4,
  sohret: (s) => s.player.fame / 80, seref: (s) => s.player.honor / 80, korku: (s) => s.player.fear / 80, itibar: (s) => s.player.reputation / 80,
  uzunomur: (s) => s.player.age / 60, hanedan: (s) => s.player.generation / 2, kokluhan: (s) => s.player.generation / 4,
  savas_sv: (s) => s.player.skills.combat / 6, tic_sv: (s) => s.player.skills.trade / 6, zan_sv: (s) => s.player.skills.crafting / 6, sos_sv: (s) => s.player.skills.social / 6,
  hunerli: (s) => s.player.perks.length / 6,
  onsehir: (s) => new Set([...(s.player.cities_visited || []), s.player.location_name]).size / 10,
  seyyah: (s) => new Set([...(s.player.cities_visited || []), s.player.location_name]).size / 25,
  ebedisoy: (s) => s.player.generation / 10,
  cihangir: (s) => (s.player.crownConquests?.length || 0) / 3,
  besmeslek: (s) => new Set([...(s.player.professions_tried || []), s.player.profession].filter((x: string) => x !== "işsiz")).size / 5,
};

export default function Basarimlar() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  // Bir kez kazanılan rozet kazanılmış kalır: koşul sonradan bozulsa da (kervan vardı, mülk satıldı,
  // eşik yükseldi) claimed listesindeki başarım kilitli görünmez.
  const withProg = achievementsOf(state).map((x) => {
    const dn = x.done || (state.player.claimed || []).includes(x.a.id);
    const prog = !dn && PROG[x.a.id] ? Math.max(0, Math.min(0.99, PROG[x.a.id](state))) : dn ? 1 : undefined;
    return { ...x, done: dn, prog };
  });
  // Sıralama: tamamlananlar üstte (koleksiyon gururu), sonra en yakın hedefler (gerilim), sonra kalanlar.
  const list = [...withProg].sort((a, b) => ((b.done ? 1 : 0) - (a.done ? 1 : 0)) || ((b.prog ?? -1) - (a.prog ?? -1)));
  const done = list.filter((x) => x.done).length;
  const nearest = withProg.filter((x) => !x.done && (x.prog ?? 0) > 0.25).sort((a, b) => (b.prog ?? 0) - (a.prog ?? 0)).slice(0, 2);

  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Pill text={`${done}/${list.length}`} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.basarimlar")} title={t("scr.basarimlar")} sub={t("ach.subtitle")} />
        {/* En yakın hedefler: "az kaldı" şeridi */}
        {nearest.length > 0 && (
          <View style={{ backgroundColor: "rgba(201,168,76,0.07)", borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", borderRadius: 11, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2, color: C.goldDim, marginBottom: 8 }}>{t("ach.nearest").toUpperCase()}</Text>
            {nearest.map(({ a, prog }) => (
              <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <GameIcon name={a.icon} size={15} color={C.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11.5, color: C.parchment }}>{t("ach." + a.id + ".l")}</Text>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: "rgba(201,168,76,0.15)", marginTop: 4, overflow: "hidden" }}>
                    <View style={{ width: `${Math.round((prog ?? 0) * 100)}%`, height: "100%", backgroundColor: C.gold }} />
                  </View>
                </View>
                <Text style={{ fontFamily: F.display, fontSize: 10, color: C.goldDim }}>%{Math.round((prog ?? 0) * 100)}</Text>
              </View>
            ))}
          </View>
        )}
        {list.map(({ a, done, prog }) => (
          <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: done ? "rgba(201,168,76,0.45)" : C.border, borderRadius: 11, padding: 13, marginBottom: 8, opacity: done ? 1 : 0.55 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: done ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: done ? "rgba(201,168,76,0.4)" : C.border }}>
              <GameIcon name={a.icon} size={19} color={done ? C.gold : C.parchmentMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: done ? C.parchment : C.parchmentMuted, letterSpacing: 0.5 }}>{t("ach." + a.id + ".l")}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 2 }}>{t("ach." + a.id + ".d")}</Text>
              {!done && prog !== undefined && prog > 0 && (
                <View style={{ height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.07)", marginTop: 5, overflow: "hidden" }}>
                  <View style={{ width: `${Math.round(prog * 100)}%`, height: "100%", backgroundColor: "rgba(201,168,76,0.55)" }} />
                </View>
              )}
            </View>
            <View style={{ alignItems: "flex-end", gap: 3 }}>
              <View style={{ backgroundColor: done ? "rgba(201,168,76,0.16)" : "rgba(255,255,255,0.05)", borderRadius: 10, paddingVertical: 2, paddingHorizontal: 7 }}>
                <Text style={{ fontFamily: F.display, fontSize: 9, color: done ? C.gold : C.parchmentMuted }}>+1 ✦</Text>
              </View>
              {done && <GameIcon name="medal" size={15} color={C.gold} />}
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenFresk>
  );
}
