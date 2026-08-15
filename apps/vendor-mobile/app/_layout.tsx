import {
  fetchActiveMembership,
  getSupabaseClient,
  SessionProvider,
  useSession,
} from "@standmarket/supabase-client";
import { colors } from "@standmarket/ui";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { queryClient } from "../lib/query-client";

function VendorGate({ children }: { children: ReactNode }) {
  const { session, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const membership = useQuery({
    queryKey: ["membership", session?.user.id],
    queryFn: () =>
      fetchActiveMembership(getSupabaseClient(), session?.user.id ?? ""),
    enabled: Boolean(session?.user.id),
  });

  useEffect(() => {
    if (isLoading || (session && membership.isLoading)) {
      return;
    }
    const group = segments[0];
    const inAuth = group === "(auth)";
    const onActivate = group === "activate";
    if (!session && !inAuth) {
      router.replace("/(auth)/sign-in");
      return;
    }
    if (session && inAuth) {
      router.replace(membership.data ? "/(vendor)/offers" : "/activate");
      return;
    }
    if (session && !membership.data && !onActivate) {
      router.replace("/activate");
      return;
    }
    if (session && membership.data && onActivate) {
      router.replace("/(vendor)/offers");
    }
  }, [
    isLoading,
    membership.data,
    membership.isLoading,
    router,
    segments,
    session,
  ]);

  if (isLoading || (session && membership.isLoading)) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return children;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <VendorGate>
          <Stack screenOptions={{ headerShown: false }} />
        </VendorGate>
      </SessionProvider>
    </QueryClientProvider>
  );
}
