import {
  usePostgresChanges,
  useSession,
} from "@standmarket/supabase-client";
import { colors } from "@standmarket/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { fetchActiveOffers, recordOfferViews } from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

export default function HomeScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? "";
  const seenViews = useRef(new Set<string>());
  const [notice, setNotice] = useState<string | null>(null);

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
      setNotice("Notificare nouă");
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

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (offers.isLoading) {
    return (
      <View style={screenStyles.root}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (offers.isError) {
    return (
      <View style={screenStyles.root}>
        <Text style={screenStyles.error}>
          {offers.error instanceof Error ? offers.error.message : "Could not load offers"}
        </Text>
      </View>
    );
  }

  return (
    <View style={screenStyles.root}>
      {notice ? (
        <View style={screenStyles.card}>
          <Text style={screenStyles.body}>{notice}</Text>
        </View>
      ) : null}
      <FlatList
        data={offers.data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={screenStyles.muted}>No active offers</Text>}
        renderItem={({ item }) => (
          <View style={screenStyles.card}>
            <Text style={screenStyles.body}>{item.product_name}</Text>
            <Text style={screenStyles.muted}>
              {item.discount_percent != null ? `${item.discount_percent}%` : "Offer"}
              {item.stand_name ? ` · ${item.stand_name}` : ""}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
