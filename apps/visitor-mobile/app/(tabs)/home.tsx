import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { colors } from "@standmarket/ui";
import { fetchActiveOffers } from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

export default function HomeScreen() {
  const offers = useQuery({
    queryKey: ["offers", "active"],
    queryFn: fetchActiveOffers,
  });

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
