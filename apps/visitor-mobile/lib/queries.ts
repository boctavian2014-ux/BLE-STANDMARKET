import { getSupabaseClient } from "@standmarket/supabase-client";

export type OfferListItem = {
  id: string;
  product_name: string;
  discount_percent: number | null;
  stand_id: string;
  expo_id: string | null;
  stand_name: string | null;
};

export type StandListItem = {
  id: string;
  name: string;
  hall: string;
  zone: string;
};

export async function fetchCurrentExpoId(): Promise<string> {
  const { data, error } = await getSupabaseClient()
    .from("expos")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data?.id) {
    throw new Error("No running expo");
  }
  return data.id as string;
}

export async function fetchActiveOffers(): Promise<OfferListItem[]> {
  const { data, error } = await getSupabaseClient()
    .from("offers")
    .select("id, product_name, discount_percent, stand_id, stands(name, expo_id)")
    .eq("status", "active");
  if (error) {
    throw error;
  }
  return (data ?? []).map((row) => {
    const stand = row.stands as
      | { name: string; expo_id: string }
      | { name: string; expo_id: string }[]
      | null;
    const standRow = Array.isArray(stand) ? stand[0] : stand;
    return {
      id: row.id as string,
      product_name: row.product_name as string,
      discount_percent: (row.discount_percent as number | null) ?? null,
      stand_id: row.stand_id as string,
      expo_id: standRow?.expo_id ?? null,
      stand_name: standRow?.name ?? null,
    };
  });
}

export async function recordOfferViews(
  userId: string,
  offers: OfferListItem[],
): Promise<void> {
  if (!offers.length) {
    return;
  }
  const { error } = await getSupabaseClient().from("analytics_events").insert(
    offers.map((offer) => ({
      event_type: "offer_view",
      user_id: userId,
      offer_id: offer.id,
      stand_id: offer.stand_id,
      expo_id: offer.expo_id,
    })),
  );
  if (error) {
    throw error;
  }
}

export async function fetchStands(): Promise<StandListItem[]> {
  const { data, error } = await getSupabaseClient()
    .from("stands")
    .select("id, name, hall, zone")
    .eq("is_active", true)
    .order("name");
  if (error) {
    throw error;
  }
  return (data ?? []) as StandListItem[];
}

export async function fetchInterestCategories(
  userId: string,
  expoId: string,
): Promise<string[]> {
  const { data, error } = await getSupabaseClient()
    .from("user_interests")
    .select("category")
    .eq("user_id", userId)
    .eq("expo_id", expoId);
  if (error) {
    throw error;
  }
  return (data ?? []).map((row) => row.category as string);
}

export async function addInterest(
  userId: string,
  expoId: string,
  category: string,
): Promise<void> {
  const { error } = await getSupabaseClient().from("user_interests").insert({
    user_id: userId,
    expo_id: expoId,
    category,
  });
  if (error) {
    throw error;
  }
}

export async function removeInterest(
  userId: string,
  expoId: string,
  category: string,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("user_interests")
    .delete()
    .eq("user_id", userId)
    .eq("expo_id", expoId)
    .eq("category", category);
  if (error) {
    throw error;
  }
}
