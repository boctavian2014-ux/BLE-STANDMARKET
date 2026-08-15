import { expect, test } from "bun:test";
import { readSupabasePublicEnv } from "./env";

test("reads public Supabase env", () => {
  const env = readSupabasePublicEnv({
    EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  });
  expect(env.url).toBe("http://127.0.0.1:54321");
  expect(env.anonKey).toBe("test-anon-key");
});

test("throws when public env is missing", () => {
  expect(() => readSupabasePublicEnv({})).toThrow("Missing EXPO_PUBLIC_SUPABASE");
});
