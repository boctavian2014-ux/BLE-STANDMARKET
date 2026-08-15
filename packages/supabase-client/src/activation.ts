import type { SupabaseClient } from "@supabase/supabase-js";

export const GENERIC_ACTIVATION_ERROR = "Cod invalid sau expirat";

export type RedeemVendorResult = {
  stand_id: string;
  expo_id: string;
  activated_at: string;
};

export type VendorMembership = {
  id: string;
  stand_id: string;
  expo_id: string;
  status: "active" | "revoked";
};

export function parseRedeemVendorResponse(
  data: unknown,
  error: { message?: string } | null,
): RedeemVendorResult {
  const payload =
    data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  if (
    error ||
    !payload ||
    typeof payload.error === "string" ||
    typeof payload.stand_id !== "string" ||
    typeof payload.expo_id !== "string"
  ) {
    throw new Error(GENERIC_ACTIVATION_ERROR);
  }
  return {
    stand_id: payload.stand_id,
    expo_id: payload.expo_id,
    activated_at:
      typeof payload.activated_at === "string" ? payload.activated_at : "",
  };
}

export async function redeemVendorActivationCode(
  client: Pick<SupabaseClient, "rpc">,
  code: string,
): Promise<RedeemVendorResult> {
  const { data, error } = await client.rpc("redeem_vendor_activation_code", {
    p_code: code,
  });
  return parseRedeemVendorResponse(data, error);
}

export async function fetchActiveMembership(
  client: Pick<SupabaseClient, "from">,
  userId: string,
): Promise<VendorMembership | null> {
  const { data, error } = await client
    .from("vendor_stand_memberships")
    .select("id, stand_id, expo_id, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return (data as VendorMembership | null) ?? null;
}
