import {
  fetchActiveMembership,
  getSupabaseClient,
  useSession,
} from "@standmarket/supabase-client";
import { colors } from "@standmarket/ui";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Text, View } from "react-native";
import { fetchVendorStand } from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

export default function StandScreen() {
  const { session } = useSession();
  const userId = session?.user.id ?? "";
  const membership = useQuery({
    queryKey: ["membership", userId],
    queryFn: () => fetchActiveMembership(getSupabaseClient(), userId),
    enabled: Boolean(userId),
  });
  const standId = membership.data?.stand_id;
  const stand = useQuery({
    queryKey: ["vendor-stand", standId],
    queryFn: () => fetchVendorStand(standId ?? ""),
    enabled: Boolean(standId),
  });

  if (membership.isLoading || stand.isLoading) {
    return (
      <View style={screenStyles.root}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (membership.isError || stand.isError || !stand.data) {
    return (
      <View style={screenStyles.root}>
        <Text style={screenStyles.error}>
          {stand.error instanceof Error
            ? stand.error.message
            : "Could not load stand"}
        </Text>
      </View>
    );
  }

  return (
    <View style={screenStyles.root}>
      <View style={screenStyles.card}>
        <Text style={screenStyles.muted}>Nume</Text>
        <Text style={screenStyles.body}>{stand.data.name}</Text>
      </View>
      <View style={screenStyles.card}>
        <Text style={screenStyles.muted}>Hală</Text>
        <Text style={screenStyles.body}>{stand.data.hall}</Text>
      </View>
      <View style={screenStyles.card}>
        <Text style={screenStyles.muted}>Zonă</Text>
        <Text style={screenStyles.body}>{stand.data.zone}</Text>
      </View>
      <View style={screenStyles.card}>
        <Text style={screenStyles.muted}>Expo</Text>
        <Text style={screenStyles.body}>{stand.data.expo_name ?? "—"}</Text>
      </View>
    </View>
  );
}
