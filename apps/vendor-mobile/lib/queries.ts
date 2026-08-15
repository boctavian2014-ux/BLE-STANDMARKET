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
