import { StyleSheet } from "react-native";
import { colors, spacing, typography } from "@standmarket/ui";

export const screenStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  body: {
    color: colors.text,
    fontSize: typography.body,
  },
  muted: {
    color: colors.muted,
    fontSize: typography.subtitle,
  },
  error: {
    color: "#F97066",
    fontSize: typography.body,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonLabel: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
});
