import {
  A11yButton,
  fetchActiveMembership,
  getSupabaseClient,
  QueryGate,
  useProfile,
  useSession,
} from "@standmarket/supabase-client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";
import { fetchVendorStand } from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

export default function ProfileScreen() {
  const { session, signOut } = useSession();
  const { profile, isLoading, error } = useProfile();
  const userId = session?.user.id ?? "";
  const [crash, setCrash] = useState(false);
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

  if (crash) {
    throw new Error("Simulated crash");
  }

  return (
    <QueryGate
      loading={isLoading || membership.isLoading || stand.isLoading}
      error={error ?? membership.error ?? stand.error}
      onRetry={() => {
        void membership.refetch();
        void stand.refetch();
      }}
    >
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
        <A11yButton
          label="Log out"
          hint="Ieși din contul de vendor"
          onPress={() => void signOut()}
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonLabel}>Log out</Text>
        </A11yButton>
        <A11yButton
          label="Simulează crash"
          hint="Afișează ecranul de eroare"
          onPress={() => setCrash(true)}
          style={screenStyles.buttonSecondary}
        >
          <Text style={screenStyles.buttonLabelOnSurface}>Simulează crash</Text>
        </A11yButton>
      </View>
    </QueryGate>
  );
}
