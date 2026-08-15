import { StyleSheet, Text, View } from "react-native";
import { APP_BRAND } from "@standmarket/shared";
import { colors, spacing, typography } from "@standmarket/ui";

export default function App() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{APP_BRAND} Vendor</Text>
      <Text style={styles.subtitle}>Vendor app bootstrap</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "600",
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: typography.subtitle,
  },
});
