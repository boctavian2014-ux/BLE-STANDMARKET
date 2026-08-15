import {
  ErrorBoundary,
  HardeningProvider,
  QuerySkeleton,
  SessionProvider,
  useSession,
} from "@standmarket/supabase-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { pingSupabase, offlineStore } from "../lib/hardening-setup";
import { visitorOfflineHandlers } from "../lib/offline-handlers";
import { queryClient } from "../lib/query-client";

function AuthGate({ children }: { children: ReactNode }) {
  const { session, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)/home");
    }
  }, [isLoading, router, segments, session]);

  if (isLoading) {
    return <QuerySkeleton label="Se încarcă sesiunea" />;
  }

  return children;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <HardeningProvider
            ping={pingSupabase}
            store={offlineStore}
            handlers={visitorOfflineHandlers}
          >
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }} />
            </AuthGate>
          </HardeningProvider>
        </SessionProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
