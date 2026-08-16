import AsyncStorage from "@react-native-async-storage/async-storage";
import { readSupabasePublicEnv, type KeyValueStore } from "@standmarket/supabase-client";

export const offlineStore: KeyValueStore = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};

export async function pingSupabase(): Promise<boolean> {
  try {
    const { url, anonKey } = readSupabasePublicEnv();
    const response = await fetch(`${url}/rest/v1/expos?select=id&limit=1`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
