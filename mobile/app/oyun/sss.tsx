import { useState } from "react";
import { View, Text, ScrollView, Pressable, LayoutAnimation, Platform, UIManager } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useI18n } from "../../lib/i18n";
import { faqFor } from "../../lib/faq";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader } from "../../lib/ui";
import { C, F } from "../../lib/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SSS() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { t, lang } = useI18n();
  const sections = faqFor(lang);
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(180, "easeInEaseOut", "opacity"));
    hap("tap");
    setOpen((cur) => (cur === key ? null : key));
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.sss")} icon="📜" title={t("scr.sss")} sub={t("sss.intro")} />

        {sections.map((sec) => (
          <View key={sec.title} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 }}>
              <Text style={{ fontSize: 15 }}>{sec.icon}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1.5, color: C.gold }}>{sec.title.toUpperCase()}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(201,168,76,0.25)" }} />
            </View>

            {sec.items.map((item, i) => {
              const key = sec.title + i;
              const isOpen = open === key;
              return (
                <Pressable key={key} onPress={() => toggle(key)} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: isOpen ? "rgba(201,168,76,0.45)" : C.border, borderRadius: 11, padding: 13, marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: isOpen ? C.gold : C.parchment, lineHeight: 19 }}>{item.q}</Text>
                    <Text style={{ fontFamily: F.display, fontSize: 16, color: C.goldDim }}>{isOpen ? "−" : "+"}</Text>
                  </View>
                  {isOpen && (
                    <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted, lineHeight: 20, marginTop: 9 }}>{item.a}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
