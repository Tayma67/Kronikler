import { View, Image } from "react-native";
import { portreImage } from "./assets";
import { C } from "./theme";

export function Portre({ age, gender, size = 44, ring = true }: { age: number; gender: "erkek" | "kadın"; size?: number; ring?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", borderWidth: ring ? 2 : 1, borderColor: ring ? C.gold : C.borderHi, backgroundColor: "#2a1c0c" }}>
      <Image source={portreImage(age, gender)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
    </View>
  );
}
