import { LazyImage, QueryGate } from "@standmarket/supabase-client";
import { useQuery } from "@tanstack/react-query";
import { memo } from "react";
import { FlatList, Text, View } from "react-native";
import { fetchStands, type StandListItem } from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

const StandRow = memo(function StandRow({ item }: { item: StandListItem }) {
  return (
    <View
      accessibilityLabel={`${item.name}, ${item.hall} ${item.zone}`}
      style={screenStyles.card}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <LazyImage label={`Imagine stand ${item.name}`} />
        <View style={{ flex: 1 }}>
          <Text style={screenStyles.body}>{item.name}</Text>
          <Text style={screenStyles.muted}>
            {item.hall} · {item.zone}
          </Text>
        </View>
      </View>
    </View>
  );
});

export default function StandsScreen() {
  const stands = useQuery({
    queryKey: ["stands", "active"],
    queryFn: fetchStands,
  });

  return (
    <QueryGate
      loading={stands.isLoading}
      error={stands.error}
      onRetry={() => void stands.refetch()}
    >
      <View style={screenStyles.root}>
        <FlatList
          data={stands.data ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={screenStyles.muted}>No stands</Text>}
          renderItem={({ item }) => <StandRow item={item} />}
        />
      </View>
    </QueryGate>
  );
}
