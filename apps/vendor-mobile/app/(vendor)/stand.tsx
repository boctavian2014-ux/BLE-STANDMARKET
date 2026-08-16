import {
  fetchActiveMembership,
  getSupabaseClient,
  QueryGate,
  useSession,
} from "@standmarket/supabase-client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import {
  fetchVendorStand,
  fetchVendorStandStats,
  recordStandView,
} from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

export default function StandScreen() {
  const { session } = useSession();
  const userId = session?.user.id ?? "";
  const recordedStand = useRef<string | null>(null);
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
  const stats = useQuery({
    queryKey: ["vendor-stand-stats", standId],
    queryFn: () => fetchVendorStandStats(standId ?? ""),
    enabled: Boolean(standId),
  });

  useEffect(() => {
    if (!userId || !stand.data) {
      return;
    }
    if (recordedStand.current === stand.data.id) {
      return;
    }
    recordedStand.current = stand.data.id;
    void recordStandView(
      userId,
      stand.data.id,
      membership.data?.expo_id ?? null,
    ).catch(() => undefined);
  }, [membership.data?.expo_id, stand.data, userId]);

  return (
    <QueryGate
      loading={membership.isLoading || stand.isLoading || stats.isLoading}
      error={membership.error ?? stand.error ?? stats.error}
      onRetry={() => {
        void membership.refetch();
        void stand.refetch();
        void stats.refetch();
      }}
    >
      <View style={screenStyles.root}>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>Nume</Text>
          <Text style={screenStyles.body}>{stand.data?.name}</Text>
        </View>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>Hală</Text>
          <Text style={screenStyles.body}>{stand.data?.hall}</Text>
        </View>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>Zonă</Text>
          <Text style={screenStyles.body}>{stand.data?.zone}</Text>
        </View>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>Expo</Text>
          <Text style={screenStyles.body}>{stand.data?.expo_name ?? "—"}</Text>
        </View>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>Oferte active</Text>
          <Text style={screenStyles.body}>
            {stats.data?.activeOffers ?? "—"}
          </Text>
        </View>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>Views</Text>
          <Text style={screenStyles.body}>{stats.data?.views ?? "—"}</Text>
        </View>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>Redemptions</Text>
          <Text style={screenStyles.body}>{stats.data?.redemptions ?? "—"}</Text>
        </View>
      </View>
    </QueryGate>
  );
}
