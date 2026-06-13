import { View, Image, Modal, Text, Pressable } from "react-native";
import { portreImage } from "./assets";
import { GameIcon } from "./icons";
import type { Dilemma, Choice } from "./events";
import { C, F } from "./theme";

export function Portre({ age, gender, size = 44, ring = true }: { age: number; gender: "erkek" | "kadın"; size?: number; ring?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", borderWidth: ring ? 2 : 1, borderColor: ring ? C.gold : C.borderHi, backgroundColor: "#2a1c0c" }}>
      <Image source={portreImage(age, gender)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
    </View>
  );
}

// Dönüm noktası anı — sahne perdesi (kül & köz dokusu).
const MILESTONE_LABEL: Record<string, { tag: string; icon: string }> = {
  meslek_edinme: { tag: "Reşit Oldun", icon: "⚒" },
  evlilik: { tag: "Yeni Bir Ocak", icon: "🕯" },
  doğum: { tag: "Soyun Sürüyor", icon: "🍼" },
  mülk_alım: { tag: "Adına Bir Tapu", icon: "🏰" },
  örgüt_katılım: { tag: "Saflara Katıldın", icon: "⚜" },
  savaş_zafer: { tag: "Zafer", icon: "⚔" },
  görev_tamamlandı: { tag: "Görev Tamam", icon: "🎯" },
  meslek_değişimi: { tag: "Yeni Bir Yol", icon: "🧭" },
  ölüm: { tag: "Hayatın Sonu", icon: "🕊" },
  nesil_devri: { tag: "Yeni Nesil", icon: "🏛" },
};

export function MilestoneModal({ visible, type, text, onClose }: { visible: boolean; type: string; text: string; onClose: () => void }) {
  const meta = MILESTONE_LABEL[type] || { tag: "Dönüm Noktası", icon: "✦" };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(6,4,2,0.88)", alignItems: "center", justifyContent: "center", padding: 28 }}>
        <View style={{ width: "100%", maxWidth: 360, backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", borderRadius: 14, padding: 24, alignItems: "center" }}>
          <Text style={{ fontSize: 34 }}>{meta.icon}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
            <View style={{ height: 1, width: 24, backgroundColor: C.goldDim }} />
            <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 3, color: C.gold, textTransform: "uppercase" }}>{meta.tag}</Text>
            <View style={{ height: 1, width: 24, backgroundColor: C.goldDim }} />
          </View>
          <Text style={{ fontFamily: F.serif, fontSize: 16, color: C.parchment, textAlign: "center", lineHeight: 24, marginTop: 14 }}>{text}</Text>
          <Pressable onPress={onClose} style={{ marginTop: 22, paddingVertical: 11, paddingHorizontal: 28, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: "#1a1206", letterSpacing: 1.5 }}>DEVAM</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// Başarım açılış bildirimi (küçük, üstten).
export function AchievementToast({ name, icon, onClose }: { name: string | null; icon: string; onClose: () => void }) {
  return (
    <Modal visible={!!name} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, justifyContent: "flex-start", paddingTop: 90, alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.6)", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, maxWidth: 340 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(201,168,76,0.14)", borderWidth: 1, borderColor: "rgba(201,168,76,0.5)" }}>
            <GameIcon name={icon} size={20} color={C.gold} />
          </View>
          <View>
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2, color: C.goldDim }}>BAŞARIM AÇILDI</Text>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.gold, marginTop: 2 }}>{name}</Text>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// İkilem perdesi — anlatısal seçim. onChoose(choice) çağrılır.
export function DilemmaModal({ dilemma, onChoose }: { dilemma: Dilemma | null; onChoose: (c: Choice) => void }) {
  return (
    <Modal visible={!!dilemma} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: "rgba(6,4,2,0.9)", alignItems: "center", justifyContent: "center", padding: 26 }}>
        {dilemma && (
          <View style={{ width: "100%", maxWidth: 380, backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", borderRadius: 14, padding: 22 }}>
            <View style={{ alignItems: "center", marginBottom: 6 }}>
              <GameIcon name={dilemma.icon} size={30} color={C.gold} />
            </View>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: C.gold, textAlign: "center", letterSpacing: 0.5, marginTop: 6 }}>{dilemma.title}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment, textAlign: "center", lineHeight: 21, marginTop: 10, marginBottom: 16 }}>{dilemma.text}</Text>
            {dilemma.choices.map((c, i) => (
              <Pressable key={i} onPress={() => onChoose(c)} style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", marginBottom: 9 }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment, letterSpacing: 0.5, textAlign: "center" }}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}
