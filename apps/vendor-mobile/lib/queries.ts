import { getSupabaseClient } from "@standmarket/supabase-client";

export type OfferStatus = "draft" | "active" | "paused";

export type VendorOffer = {
  id: string;
  product_name: string;
  description: string | null;
  discount_percent: number | null;
  status: OfferStatus;
  created_by: string;
};

export type VendorStand = {
  id: string;
  name: string;
  hall: string;
  zone: string;
  category: string | null;
  expo_name: string | null;
};

export type OfferDraft = {
  product_name: string;
  description: string;
  discount_percent: string;
  status: OfferStatus;
};

const DEFAULT_CATEGORY = "General";

function parseDiscount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
    throw new Error("Discount must be between 0 and 100");
  }
  return parsed;
}

export async function fetchVendorOffers(standId: string): Promise<VendorOffer[]> {
  const { data, error } = await getSupabaseClient()
    .from("offers")
    .select("id, product_name, description, discount_percent, status, created_by")
    .eq("stand_id", standId)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as VendorOffer[];
}

export async function fetchVendorStand(standId: string): Promise<VendorStand> {
  const { data, error } = await getSupabaseClient()
    .from("stands")
    .select("id, name, hall, zone, category, expos(name)")
    .eq("id", standId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("Stand not found");
  }
  const expo = data.expos as { name: string } | { name: string }[] | null;
  const expoName = Array.isArray(expo) ? expo[0]?.name : expo?.name;
  return {
    id: data.id as string,
    name: data.name as string,
    hall: data.hall as string,
    zone: data.zone as string,
    category: (data.category as string | null) ?? null,
    expo_name: expoName ?? null,
  };
}

export async function createVendorOffer(
  standId: string,
  userId: string,
  draft: OfferDraft,
  category: string | null,
): Promise<void> {
  const { error } = await getSupabaseClient().from("offers").insert({
    stand_id: standId,
    created_by: userId,
    product_name: draft.product_name.trim(),
    description: draft.description.trim() || null,
    category: category?.trim() || DEFAULT_CATEGORY,
    discount_percent: parseDiscount(draft.discount_percent),
    status: draft.status,
  });
  if (error) {
    throw error;
  }
}

export async function updateVendorOffer(
  offerId: string,
  draft: OfferDraft,
): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from("offers")
    .update({
      product_name: draft.product_name.trim(),
      description: draft.description.trim() || null,
      discount_percent: parseDiscount(draft.discount_percent),
      status: draft.status,
    })
    .eq("id", offerId)
    .select("id");
  if (error) {
    throw error;
  }
  if (!data?.length) {
    throw new Error("Could not update offer");
  }
}

export async function toggleVendorOfferStatus(
  offerId: string,
  current: OfferStatus,
): Promise<void> {
  const next: OfferStatus = current === "active" ? "paused" : "active";
  const { data, error } = await getSupabaseClient()
    .from("offers")
    .update({ status: next })
    .eq("id", offerId)
    .select("id");
  if (error) {
    throw error;
  }
  if (!data?.length) {
    throw new Error("Could not update offer");
  }
}

export type VendorStandStats = {
  activeOffers: number;
  views: number;
  redemptions: number;
};

export async function fetchVendorStandStats(
  standId: string,
): Promise<VendorStandStats> {
  const client = getSupabaseClient();
  const [active, views, offerIds] = await Promise.all([
    client
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("stand_id", standId)
      .eq("status", "active"),
    client
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("stand_id", standId)
      .eq("event_type", "offer_view"),
    client.from("offers").select("id").eq("stand_id", standId),
  ]);
  if (active.error) {
    throw active.error;
  }
  if (views.error) {
    throw views.error;
  }
  if (offerIds.error) {
    throw offerIds.error;
  }
  const ids = (offerIds.data ?? []).map((row) => row.id as string);
  let redemptions = 0;
  if (ids.length) {
    const counted = await client
      .from("offer_redemptions")
      .select("id", { count: "exact", head: true })
      .in("offer_id", ids);
    if (counted.error) {
      throw counted.error;
    }
    redemptions = counted.count ?? 0;
  }
  return {
    activeOffers: active.count ?? 0,
    views: views.count ?? 0,
    redemptions,
  };
}

export async function recordStandView(
  userId: string,
  standId: string,
  expoId: string | null,
): Promise<void> {
  const { error } = await getSupabaseClient().from("analytics_events").insert({
    event_type: "stand_view",
    user_id: userId,
    stand_id: standId,
    expo_id: expoId,
  });
  if (error) {
    throw error;
  }
}

export type RedemptionValidation = {
  status: "valid" | "invalid";
  product_name?: string;
  redemption_code?: string;
  redeemed_at?: string | null;
};

export async function validateRedemptionCode(
  code: string,
): Promise<RedemptionValidation> {
  const { data, error } = await getSupabaseClient()
    .from("offer_redemptions")
    .select("redemption_code, redeemed_at, offers(product_name)")
    .eq("redemption_code", code)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return { status: "invalid" };
  }
  const offer = data.offers as
    | { product_name: string }
    | { product_name: string }[]
    | null;
  const offerRow = Array.isArray(offer) ? offer[0] : offer;
  return {
    status: "valid",
    product_name: offerRow?.product_name,
    redemption_code: data.redemption_code as string,
    redeemed_at: (data.redeemed_at as string | null) ?? null,
  };
}
