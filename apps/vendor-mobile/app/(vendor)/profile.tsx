import {
  fetchActiveMembership,
  getSupabaseClient,
  useProfile,
  useSession,
} from "@standmarket/supabase-client";
import { colors } from "@standmarket/ui";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { fetchVendorStand } from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

export default function ProfileScreen() {
  const { session, signOut } = useSession();
  const { profile, isLoading, error } = useProfile();
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

  if (isLoading || membership.isLoading || stand.isLoading) {
    return (
      <View style={screenStyles.root}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={screenStyles.root}>
      <View style={screenStyles.card}>
        <Text style={screenStyles.muted}>Email</Text>
        <Text style={screenStyles.body}>{session?.user.email ?? "—"}</Text>
      </View>
      <View style={screenStyles.card}>
        <Text style={screenStyles.muted}>Name</Text>
        <Text style={screenStyles.body}>{profile?.display_name ?? "—"}</Text>
      </View>
      <View style={screenStyles.card}>
        <Text style={screenStyles.muted}>Stand asociat</Text>
        <Text style={screenStyles.body}>{stand.data?.name ?? "—"}</Text>
      </View>
      {error ? <Text style={screenStyles.error}>{error}</Text> : null}
      <Pressable onPress={() => void signOut()} style={screenStyles.button}>
        <Text style={screenStyles.buttonLabel}>Log out</Text>
      </Pressable>
    </View>
  );
}
