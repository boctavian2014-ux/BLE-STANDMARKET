import { colors } from "@standmarket/ui";
import { Tabs } from "expo-router";

export default function VendorTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="offers"
        options={{ title: "Oferte", tabBarAccessibilityLabel: "Oferte" }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: "Validare", tabBarAccessibilityLabel: "Validare" }}
      />
      <Tabs.Screen
        name="stand"
        options={{ title: "Stand", tabBarAccessibilityLabel: "Stand" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profil", tabBarAccessibilityLabel: "Profil" }}
      />
    </Tabs>
  );
}
