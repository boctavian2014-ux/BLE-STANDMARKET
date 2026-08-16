import { colors, useTranslation } from "@standmarket/ui";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mutedAA,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: t("tabs.home"), tabBarAccessibilityLabel: t("tabs.home") }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: t("tabs.scan"), tabBarAccessibilityLabel: t("tabs.scan") }}
      />
      <Tabs.Screen
        name="stands"
        options={{
          title: t("tabs.stands"),
          tabBarAccessibilityLabel: t("tabs.stands"),
        }}
      />
      <Tabs.Screen
        name="interests"
        options={{
          title: t("tabs.interests"),
          tabBarAccessibilityLabel: t("tabs.interests"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarAccessibilityLabel: t("tabs.profile"),
        }}
      />
    </Tabs>
  );
}
