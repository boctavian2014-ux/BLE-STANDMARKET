import {
  LazyImage,
  QueryGate,
  usePostgresChanges,
  useSession,
  useToast,
} from "@standmarket/supabase-client";
import { useTranslation } from "@standmarket/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useEffect, useRef } from "react";
import { FlatList, Text, View } from "react-native";
import {
  fetchActiveOffers,
  recordOfferViews,
  type OfferListItem,
} from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

const OfferRow = memo(function OfferRow({
  item,
  offerLabel,
  imageLabel,
  rowLabel,
}: {
  item: OfferListItem;
  offerLabel: string;
  imageLabel: string;
  rowLabel: string;
}) {
  const discount =
    item.discount_percent != null ? `${item.discount_percent}%` : offerLabel;
  return (
    <View accessibilityLabel={rowLabel} style={screenStyles.card}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <LazyImage label={imageLabel} />
        <View style={{ flex: 1 }}>
          <Text style={screenStyles.body}>{item.product_name}</Text>
          <Text style={screenStyles.muted}>
            {discount}
            {item.stand_name ? ` · ${item.stand_name}` : ""}
          </Text>
        </View>
      </View>
    </View>
  );
});

export default function HomeScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const { t } = useTranslation();
  const userId = session?.user.id ?? "";
  const seenViews = useRef(new Set<string>());

  const offers = useQuery({
    queryKey: ["offers", "active"],
    queryFn: fetchActiveOffers,
    refetchInterval: 2_000,
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

  return (
    <QueryGate
      loading={offers.isLoading}
      error={offers.error}
      onRetry={() => void offers.refetch()}
    >
      <View style={screenStyles.root}>
        <FlatList
          data={offers.data ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={screenStyles.muted}>{t("home.empty")}</Text>
          }
          renderItem={({ item }) => {
            const meta =
              item.discount_percent != null
                ? `${item.discount_percent}%`
                : t("home.offer");
            return (
              <OfferRow
                item={item}
                offerLabel={t("home.offer")}
                imageLabel={t("home.image", { name: item.product_name })}
                rowLabel={t("home.rowLabel", {
                  name: item.product_name,
                  meta: item.stand_name ? `${meta}, ${item.stand_name}` : meta,
                })}
              />
            );
          }}
        />
      </View>
    </QueryGate>
  );
}
