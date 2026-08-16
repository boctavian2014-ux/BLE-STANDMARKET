import {
  colors,
  radius,
  spacing,
  typography,
} from "../../ui/src/index";
import { memo, type ReactNode } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { A11yButton, LazyImage } from "./hardening-ui";
import {
  composeOfferCardLabel,
  isHotDiscount,
  placeholderInitial,
} from "./marketplace";

export const EmptyState = memo(function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  actionHint,
  onAction,
}: {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  actionHint?: string;
  onAction?: () => void;
}) {
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${title}. ${message}`}
      style={{
        alignItems: "center",
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.md,
      }}
    >
      <Text
        accessibilityElementsHidden
        style={{ fontSize: 40, marginBottom: spacing.sm }}
      >
        {icon}
      </Text>
      <Text
        accessibilityRole="header"
        style={{
          color: colors.text,
          fontSize: typography.subtitle,
          fontWeight: "600",
          marginBottom: spacing.xs,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.mutedAA,
          fontSize: typography.body,
          textAlign: "center",
          marginBottom: onAction ? spacing.md : 0,
        }}
      >
        {message}
      </Text>
      {onAction && actionLabel ? (
        <A11yButton
          label={actionLabel}
          hint={actionHint}
          onPress={onAction}
          style={{
            backgroundColor: colors.accent,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: colors.buttonLabelOnAccent,
              fontSize: typography.subtitle,
              fontWeight: "600",
            }}
          >
            {actionLabel}
          </Text>
        </A11yButton>
      ) : null}
    </View>
  );
});

export const SectionHeader = memo(function SectionHeader({
  title,
  actionLabel,
  actionHint,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  actionHint?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: spacing.md,
        marginBottom: spacing.sm,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          color: colors.text,
          fontSize: typography.subtitle,
          fontWeight: "700",
          flex: 1,
        }}
      >
        {title}
      </Text>
      {onAction && actionLabel ? (
        <A11yButton
          label={actionLabel}
          hint={actionHint}
          onPress={onAction}
        >
          <Text style={{ color: colors.accent, fontSize: typography.body }}>
            {actionLabel}
          </Text>
        </A11yButton>
      ) : null}
    </View>
  );
});

export const OfferCard = memo(function OfferCard({
  title,
  discountPercent,
  stand,
  zone,
  imageLabel,
  discountLabel,
  hotLabel,
  noDiscountLabel,
  onPress,
  style,
}: {
  title: string;
  discountPercent: number | null;
  stand: string;
  zone?: string;
  imageLabel: string;
  discountLabel: string;
  hotLabel: string;
  noDiscountLabel: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const meta = [stand, zone].filter(Boolean).join(" · ");
  const label = composeOfferCardLabel({
    title,
    discount: discountPercent != null ? discountLabel : noDiscountLabel,
    stand: meta,
  });
  const hot = isHotDiscount(discountPercent);
  const body: ReactNode = (
    <>
      <View style={{ position: "relative" }}>
        <LazyImage
          uri={null}
          label={imageLabel}
          size="lg"
          initial={placeholderInitial(title)}
        />
        {hot ? (
          <View
            style={{
              position: "absolute",
              top: spacing.xs,
              left: spacing.xs,
              backgroundColor: colors.badgeBackground,
              paddingHorizontal: spacing.sm,
              paddingVertical: 2,
              borderRadius: radius.sm,
            }}
          >
            <Text
              style={{
                color: colors.badgeText,
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              {hotLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={2}
        style={{
          color: colors.text,
          fontSize: typography.body,
          fontWeight: "600",
          marginTop: spacing.sm,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.accentWarm,
          fontSize: 28,
          fontWeight: "800",
          marginTop: 2,
        }}
      >
        {discountPercent != null ? discountLabel : noDiscountLabel}
      </Text>
      {meta ? (
        <Text
          numberOfLines={1}
          style={{ color: colors.mutedAA, fontSize: 12, marginTop: 2 }}
        >
          {meta}
        </Text>
      ) : null}
    </>
  );

  const cardStyle = [
    {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={cardStyle}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View accessibilityRole="button" accessibilityLabel={label} style={cardStyle}>
      {body}
    </View>
  );
});
