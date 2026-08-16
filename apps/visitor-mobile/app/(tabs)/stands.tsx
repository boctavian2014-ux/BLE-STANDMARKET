import { EmptyState, LazyImage, QueryGate } from "@standmarket/supabase-client";
import { useTranslation } from "@standmarket/ui";
import { useQuery } from "@tanstack/react-query";
import { memo } from "react";
import { FlatList, Text, View } from "react-native";
import { fetchStands, type StandListItem } from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

const StandRow = memo(function StandRow({
  item,
  imageLabel,
  rowLabel,
}: {
  item: StandListItem;
  imageLabel: string;
  rowLabel: string;
}) {
  return (
    <View
      accessibilityRole="button"
      accessibilityLabel={rowLabel}
      style={screenStyles.card}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <LazyImage label={imageLabel} initial={item.name.slice(0, 1)} />
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
  const { t } = useTranslation();
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
          ListEmptyComponent={
            <EmptyState
              icon="🏪"
              title={t("empty.standsTitle")}
              message={t("empty.standsMessage")}
            />
          }
          renderItem={({ item }) => (
            <StandRow
              item={item}
              imageLabel={t("stands.image", { name: item.name })}
              rowLabel={t("stands.rowLabel", {
                name: item.name,
                hall: item.hall,
                zone: item.zone,
              })}
            />
          )}
        />
      </View>
    </QueryGate>
  );
}
