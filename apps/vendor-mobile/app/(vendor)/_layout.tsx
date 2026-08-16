import { colors, useTranslation } from "@standmarket/ui";
import { Tabs } from "expo-router";

export default function VendorTabsLayout() {
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
        name="offers"
        options={{
          title: t("tabs.offers"),
          tabBarAccessibilityLabel: t("tabs.offers"),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: t("tabs.validation"),
          tabBarAccessibilityLabel: t("tabs.validation"),
        }}
      />
      <Tabs.Screen
        name="stand"
        options={{ title: t("tabs.stand"), tabBarAccessibilityLabel: t("tabs.stand") }}
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
