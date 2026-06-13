import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useGame } from "../lib/store";
import { C } from "../lib/theme";

export default function Index() {
  const { state, loading } = useGame();
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={C.gold} />
    </View>;
  }
  return <Redirect href={state ? "/oyun" : "/yeni-oyun"} />;
}
