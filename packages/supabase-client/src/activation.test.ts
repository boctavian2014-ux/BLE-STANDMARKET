import { expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GENERIC_ACTIVATION_ERROR,
  fetchActiveMembership,
  parseRedeemVendorResponse,
  redeemVendorActivationCode,
} from "./activation";

test("parseRedeemVendorResponse returns stand and expo on success", () => {
  const result = parseRedeemVendorResponse(
    {
      stand_id: "stand-1",
      expo_id: "expo-1",
      activated_at: "2026-08-15T12:00:00Z",
    },
    null,
  );
  expect(result).toEqual({
    stand_id: "stand-1",
    expo_id: "expo-1",
    activated_at: "2026-08-15T12:00:00Z",
  });
});

test("parseRedeemVendorResponse hides RPC error details", () => {
  expect(() =>
    parseRedeemVendorResponse({ error: "invalid or expired code" }, null),
  ).toThrow(GENERIC_ACTIVATION_ERROR);
  expect(() =>
    parseRedeemVendorResponse(null, { message: "rate limited" }),
  ).toThrow(GENERIC_ACTIVATION_ERROR);
  expect(() => parseRedeemVendorResponse({}, null)).toThrow(
    GENERIC_ACTIVATION_ERROR,
  );
});

test("redeemVendorActivationCode uses the mock RPC and never hits the network", async () => {
  const client = {
    rpc: async () => ({
      data: {
        stand_id: "stand-1",
        expo_id: "expo-1",
        activated_at: "2026-08-15T12:00:00Z",
      },
      error: null,
    }),
  } as unknown as SupabaseClient;

  await expect(
    redeemVendorActivationCode(client, "DEV0-ACTV-CODE-0001"),
  ).resolves.toEqual({
    stand_id: "stand-1",
    expo_id: "expo-1",
    activated_at: "2026-08-15T12:00:00Z",
  });
});

test("redeemVendorActivationCode maps any RPC failure to the generic message", async () => {
  const client = {
    rpc: async () => ({
      data: null,
      error: { message: "JSON object requested, multiple (or no) rows returned" },
    }),
  } as unknown as SupabaseClient;

  await expect(
    redeemVendorActivationCode(client, "BAD0-CODE-XXXX-0000"),
  ).rejects.toThrow(GENERIC_ACTIVATION_ERROR);
});

test("fetchActiveMembership returns the first active row from the mock client", async () => {
  const client = {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        limit() {
          return this;
        },
        maybeSingle: async () => ({
          data: {
            id: "mem-1",
            stand_id: "stand-1",
            expo_id: "expo-1",
            status: "active",
          },
          error: null,
        }),
      };
    },
  } as unknown as SupabaseClient;

  await expect(fetchActiveMembership(client, "user-1")).resolves.toEqual({
    id: "mem-1",
    stand_id: "stand-1",
    expo_id: "expo-1",
    status: "active",
  });
});
