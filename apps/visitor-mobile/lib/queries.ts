import { getSupabaseClient } from "@standmarket/supabase-client";

export type OfferListItem = {
  id: string;
  product_name: string;
  discount_percent: number | null;
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
    .select("id, product_name, discount_percent, stands(name)")
    .eq("status", "active");
  if (error) {
    throw error;
  }
  return (data ?? []).map((row) => {
    const stand = row.stands as { name: string } | { name: string }[] | null;
    const standName = Array.isArray(stand) ? stand[0]?.name : stand?.name;
    return {
      id: row.id as string,
      product_name: row.product_name as string,
      discount_percent: (row.discount_percent as number | null) ?? null,
      stand_name: standName ?? null,
    };
  });
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
