import { useFonts, Cinzel_400Regular, Cinzel_700Bold } from "@expo-google-fonts/cinzel";
import { CrimsonText_400Regular, CrimsonText_400Regular_Italic } from "@expo-google-fonts/crimson-text";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { GameProvider } from "../lib/store";
import { C } from "../lib/theme";

export default function RootLayout() {
  const [loaded] = useFonts({
    Cinzel_400Regular, Cinzel_700Bold, CrimsonText_400Regular, CrimsonText_400Regular_Italic,
  });
  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={C.gold} />
    </View>;
  }
  return (
    <SafeAreaProvider>
      <GameProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
      </GameProvider>
    </SafeAreaProvider>
  );
}
