import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabasePublicEnv } from "./env";

let client: SupabaseClient | undefined;

/**
 * Session persistence uses AsyncStorage (official Supabase Expo pattern).
 * expo-secure-store is a 2KB-per-value store; a persisted session (JWT +
 * refresh token + user) can exceed that. AsyncStorage is the supported
 * auth storage adapter for React Native.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) {
    return client;
  }
  const { url, anonKey } = readSupabasePublicEnv();
  client = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function resetSupabaseClientForTests(): void {
  client = undefined;
}
