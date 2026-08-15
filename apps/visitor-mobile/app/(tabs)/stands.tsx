import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { colors } from "@standmarket/ui";
import { fetchStands } from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

export default function StandsScreen() {
  const stands = useQuery({
    queryKey: ["stands", "active"],
    queryFn: fetchStands,
  });

  if (stands.isLoading) {
    return (
      <View style={screenStyles.root}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (stands.isError) {
    return (
      <View style={screenStyles.root}>
        <Text style={screenStyles.error}>
          {stands.error instanceof Error ? stands.error.message : "Could not load stands"}
        </Text>
      </View>
    );
  }

  return (
    <View style={screenStyles.root}>
      <FlatList
        data={stands.data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={screenStyles.muted}>No stands</Text>}
        renderItem={({ item }) => (
          <View style={screenStyles.card}>
            <Text style={screenStyles.body}>{item.name}</Text>
            <Text style={screenStyles.muted}>
              {item.hall} · {item.zone}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
