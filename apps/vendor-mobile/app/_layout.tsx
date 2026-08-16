import {
  ErrorBoundary,
  fetchActiveMembership,
  getSupabaseClient,
  HardeningProvider,
  QuerySkeleton,
  SessionProvider,
  useSession,
} from "@standmarket/supabase-client";
import { LanguageProvider, useTranslation } from "@standmarket/ui";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { pingSupabase, offlineStore } from "../lib/hardening-setup";
import { vendorOfflineHandlers } from "../lib/offline-handlers";
import { queryClient } from "../lib/query-client";

function VendorGate({ children }: { children: ReactNode }) {
  const { session, isLoading } = useSession();
  const { t } = useTranslation();
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
    return <QuerySkeleton label={t("query.vendorSession")} />;
  }

  return children;
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <HardeningProvider
              ping={pingSupabase}
              store={offlineStore}
              handlers={vendorOfflineHandlers}
            >
              <VendorGate>
                <Stack screenOptions={{ headerShown: false }} />
              </VendorGate>
            </HardeningProvider>
          </SessionProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </LanguageProvider>
  );
}
