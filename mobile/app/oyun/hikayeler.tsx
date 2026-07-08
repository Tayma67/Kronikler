import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { beginArc, advanceArc } from "../../lib/game";
import { arcById, availableArcs, ARCS } from "../../lib/arcs";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams } from "../../lib/i18n";
import { BackLabel, PageHeader, Panel, SectionHead, ScreenFresk } from "../../lib/ui";

export default function Hikayeler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t } = useI18n();
  // i18n anahtarı varsa onu, yoksa arc'ın kendi (TR) verisini kullan.
  const gt = (key: string, fb: string) => { const v = t(key); return v === key ? fb : v; };
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const st = state.story;
  const active = arcById(st.active?.id || null);
  const stage = active && st.active ? active.stages[st.active.stage] : null;
  const avail = availableArcs(p, st.completed, st.tension, st.active?.id || null);

  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.hikayeler")} title={t("scr.hikayeler")} sub={applyParams(t("hik.progress"), [st.completed.length, ARCS.length])} />

        {active && stage ? (
          <Panel title={gt("arc." + active.id + ".t", active.title)} tone={C.gold}>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment, lineHeight: 22, marginBottom: 14 }}>{gt("arc." + active.id + "." + st.active!.stage + ".x", stage.text)}</Text>
            {stage.choices.map((c, i) => (
              <Pressable key={i} onPress={() => apply((s) => advanceArc(s, i, { result: gt("arc." + active.id + "." + st.active!.stage + ".r" + i, c.result), endLabel: t("hik.ended").replace("%s", gt("arc." + active.id + ".t", active.title)) }))} style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", marginBottom: 9 }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment, letterSpacing: 0.5, textAlign: "center" }}>{gt("arc." + active.id + "." + st.active!.stage + ".c" + i, c.label)}</Text>
              </Pressable>
            ))}
          </Panel>
        ) : (
          <Panel><Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", paddingVertical: 10 }}>{t("hik.none")}</Text></Panel>
        )}

        {!active && avail.length > 0 && (
          <>
            <SectionHead title={t("hik.awaiting")} />
            {avail.map((a) => (
              <Panel key={a.id} title={gt("arc." + a.id + ".t", a.title)}>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: 10 }}>{gt("arc." + a.id + ".b", a.blurb)}</Text>
                <Pressable onPress={() => apply((s) => beginArc(s, a.id))} style={{ alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.1)" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold, letterSpacing: 1 }}>{t("hik.begin")}</Text>
                </Pressable>
              </Panel>
            ))}
          </>
        )}

        {(() => {
          const availIds = new Set(avail.map((x) => x.id));
          const waiting = ARCS.filter((x) => !st.completed.includes(x.id) && !availIds.has(x.id) && x.id !== (st.active?.id || "")).length;
          if (!waiting) return null;
          return (
            <View style={{ borderWidth: 1, borderColor: C.border, borderStyle: "dashed" as const, borderRadius: 10, padding: 12, marginBottom: 12, opacity: 0.85 }}>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, lineHeight: 17 }}>{applyParams(t("hik.waiting"), [waiting])}</Text>
            </View>
          );
        })()}

        {st.completed.length > 0 && (
          <Panel title={t("hik.completed")} tone={C.sage} noPad>
            {st.completed.map((id, i) => {
              const a = arcById(id); if (!a) return null;
              return (
                <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: i === st.completed.length - 1 ? 0 : 1, borderBottomColor: C.border }}>
                  <GameIcon name={a.icon} size={15} color={C.goldDim} />
                  <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted }}>{gt("arc." + a.id + ".t", a.title)}</Text>
                  <Text style={{ color: C.sage }}>✓</Text>
                </View>
              );
            })}
          </Panel>
        )}
      </ScrollView>
    </ScreenFresk>
  );
}
