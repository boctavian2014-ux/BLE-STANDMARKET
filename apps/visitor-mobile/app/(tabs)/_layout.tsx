import { colors } from "@standmarket/ui";
import { Tabs } from "expo-router";

export default function TabsLayout() {
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
        name="home"
        options={{ title: "Home", tabBarAccessibilityLabel: "Home" }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: "Scan", tabBarAccessibilityLabel: "Scan" }}
      />
      <Tabs.Screen
        name="stands"
        options={{ title: "Standuri", tabBarAccessibilityLabel: "Standuri" }}
      />
      <Tabs.Screen
        name="interests"
        options={{ title: "Interese", tabBarAccessibilityLabel: "Interese" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profil", tabBarAccessibilityLabel: "Profil" }}
      />
    </Tabs>
  );
}
