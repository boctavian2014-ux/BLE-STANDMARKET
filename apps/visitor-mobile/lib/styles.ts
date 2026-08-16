import { StyleSheet } from "react-native";
import { colors, radius, spacing, typography } from "@standmarket/ui";

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
    color: colors.mutedAA,
    fontSize: typography.subtitle,
  },
  error: {
    color: colors.error,
    fontSize: typography.body,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonLabel: {
    color: colors.buttonLabelOnAccent,
    fontSize: typography.subtitle,
    fontWeight: "600",
  },
  buttonLabelOnSurface: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
