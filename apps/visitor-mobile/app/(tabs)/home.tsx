import {
  EmptyState,
  OfferCard,
  QueryGate,
  SectionHeader,
  usePostgresChanges,
  useSession,
  useToast,
} from "@standmarket/supabase-client";
import { colors, radius, spacing, useTranslation } from "@standmarket/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { INTEREST_CATEGORIES } from "../../lib/categories";
import {
  fetchActiveOffers,
  fetchCurrentExpoId,
  fetchInterestCategories,
  recordOfferViews,
  type OfferListItem,
} from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

const CATEGORY_KEYS = {
  Electronics: "interests.electronics",
  Fashion: "interests.fashion",
  Home: "interests.home",
  Food: "interests.food",
} as const;

export default function HomeScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const { t } = useTranslation();
  const router = useRouter();
  const userId = session?.user.id ?? "";
  const seenViews = useRef(new Set<string>());
  const [chip, setChip] = useState<string>("all");

  const offers = useQuery({
    queryKey: ["offers", "active"],
    queryFn: fetchActiveOffers,
    refetchInterval: 2_000,
  });

  const expo = useQuery({
    queryKey: ["expo", "current"],
    queryFn: fetchCurrentExpoId,
  });

  const interests = useQuery({
    queryKey: ["interests", userId, expo.data],
    queryFn: () => fetchInterestCategories(userId, expo.data!),
    enabled: Boolean(userId && expo.data),
  });

  usePostgresChanges(
    Boolean(userId),
    "visitor-offers",
    { table: "offers", event: "*" },
    () => {
      void queryClient.refetchQueries({ queryKey: ["offers", "active"] });
    },
  );

  usePostgresChanges(
    Boolean(userId),
    "visitor-notifications",
    {
      table: "notification_events",
      event: "INSERT",
      filter: userId ? `user_id=eq.${userId}` : undefined,
    },
    () => {
      showToast(t("home.notification"), "success");
    },
  );

  useEffect(() => {
    if (!userId || !offers.data?.length) {
      return;
    }
    const fresh = offers.data.filter((offer) => !seenViews.current.has(offer.id));
    if (!fresh.length) {
      return;
    }
    for (const offer of fresh) {
      seenViews.current.add(offer.id);
    }
    void recordOfferViews(userId, fresh).catch(() => undefined);
  }, [offers.data, userId]);

  const selectedInterests = interests.data ?? [];
  const forYou = useMemo(() => {
    if (!selectedInterests.length) {
      return [];
    }
    return (offers.data ?? []).filter(
      (offer) => offer.category && selectedInterests.includes(offer.category),
    );
  }, [offers.data, selectedInterests]);

  const allOffers = useMemo(() => {
    const list = offers.data ?? [];
    if (chip === "all") {
      return list;
    }
    return list.filter((offer) => offer.category === chip);
  }, [chip, offers.data]);

  function renderCard(item: OfferListItem, extraStyle?: object) {
    const discountLabel =
      item.discount_percent != null
        ? t("home.discount", { n: item.discount_percent })
        : t("home.offer");
    return (
      <OfferCard
        title={item.product_name}
        discountPercent={item.discount_percent}
        stand={item.stand_name ?? ""}
        zone={item.zone ?? undefined}
        imageUrl={item.image_url}
        imageLabel={t("home.image", { name: item.product_name })}
        discountLabel={discountLabel}
        hotLabel={t("home.hot")}
        noDiscountLabel={t("home.offer")}
        style={extraStyle}
      />
    );
  }

  return (
    <QueryGate
      loading={offers.isLoading}
      error={offers.error}
      onRetry={() => void offers.refetch()}
    >
      <FlatList
        style={screenStyles.root}
        data={allOffers}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.sm }}
        ListHeaderComponent={
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: spacing.sm }}
            >
              <Chip
                label={t("home.allCategories")}
                active={chip === "all"}
                onPress={() => setChip("all")}
              />
              {INTEREST_CATEGORIES.map((category) => (
                <Chip
                  key={category}
                  label={t(CATEGORY_KEYS[category])}
                  active={chip === category}
                  onPress={() => setChip(category)}
                />
              ))}
            </ScrollView>
            {forYou.length > 0 ? (
              <>
                <SectionHeader
                  title={t("home.forYou")}
                  actionLabel={t("home.seeAll")}
                  actionHint={t("home.seeAllHint")}
                  onAction={() => setChip("all")}
                />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {forYou.slice(0, 4).map((item) => (
                    <View key={item.id} style={{ width: "48%" }}>
                      {renderCard(item)}
                    </View>
                  ))}
                </View>
              </>
            ) : null}
            <SectionHeader title={t("home.allOffers")} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="🛍️"
            title={t("home.emptyTitle")}
            message={t("home.emptyMessage")}
            actionLabel={t("home.emptyCta")}
            actionHint={t("home.emptyCtaHint")}
            onAction={() => router.push("/(tabs)/stands")}
          />
        }
        renderItem={({ item }) => renderCard(item)}
      />
    </QueryGate>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        backgroundColor: active ? colors.accentWarm : colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.lg,
        marginRight: spacing.sm,
      }}
    >
      <Text
        style={{
          color: active ? colors.buttonLabelOnAccent : colors.text,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
