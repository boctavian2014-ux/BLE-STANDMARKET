import { getSupabaseClient } from "@standmarket/supabase-client";

export type OfferListItem = {
  id: string;
  product_name: string;
  discount_percent: number | null;
  stand_id: string;
  expo_id: string | null;
  stand_name: string | null;
  hall: string | null;
  zone: string | null;
  category: string | null;
  image_url: string | null;
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
    .select(
      "id, product_name, discount_percent, stand_id, image_url, stands(name, expo_id, hall, zone, category)",
    )
    .eq("status", "active");
  if (error) {
    throw error;
  }
  return (data ?? []).map(mapOffer);
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

export type ZonalBeaconRow = {
  id: string;
  expo_id: string;
  beacon_uuid: string;
  major: number;
  minor: number;
  hall: string;
  zone: string;
  tx_power: number | null;
  is_active: boolean;
};

function mapOffer(row: {
  id: unknown;
  product_name: unknown;
  discount_percent: unknown;
  stand_id: unknown;
  image_url?: unknown;
  stands: unknown;
}): OfferListItem {
  const stand = row.stands as
    | {
        name: string;
        expo_id: string;
        hall?: string;
        zone?: string;
        category?: string;
      }
    | {
        name: string;
        expo_id: string;
        hall?: string;
        zone?: string;
        category?: string;
      }[]
    | null;
  const standRow = Array.isArray(stand) ? stand[0] : stand;
  return {
    id: row.id as string,
    product_name: row.product_name as string,
    discount_percent: (row.discount_percent as number | null) ?? null,
    stand_id: row.stand_id as string,
    expo_id: standRow?.expo_id ?? null,
    stand_name: standRow?.name ?? null,
    hall: standRow?.hall ?? null,
    zone: standRow?.zone ?? null,
    category: standRow?.category ?? null,
    image_url: (row.image_url as string | null) ?? null,
  };
}

export async function fetchActiveBeacons(): Promise<ZonalBeaconRow[]> {
  const { data, error } = await getSupabaseClient()
    .from("beacons")
    .select(
      "id, expo_id, beacon_uuid, major, minor, hall, zone, tx_power, is_active",
    )
    .eq("is_active", true);
  if (error) {
    throw error;
  }
  return (data ?? []) as ZonalBeaconRow[];
}

export async function fetchActiveOffersInZone(
  hall: string,
  zone: string,
): Promise<OfferListItem[]> {
  const { data, error } = await getSupabaseClient()
    .from("offers")
    .select(
      "id, product_name, discount_percent, stand_id, stands!inner(name, expo_id, hall, zone)",
    )
    .eq("status", "active")
    .eq("stands.hall", hall)
    .eq("stands.zone", zone);
  if (error) {
    throw error;
  }
  return (data ?? []).map(mapOffer);
}

export async function fetchOfferById(
  offerId: string,
): Promise<OfferListItem | null> {
  const { data, error } = await getSupabaseClient()
    .from("offers")
    .select("id, product_name, discount_percent, stand_id, stands(name, expo_id)")
    .eq("id", offerId)
    .eq("status", "active")
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data ? mapOffer(data) : null;
}

function newRedemptionCode(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RDM-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export async function redeemOffer(
  userId: string,
  offer: OfferListItem,
): Promise<string> {
  const redemption_code = newRedemptionCode();
  const { error } = await getSupabaseClient().from("offer_redemptions").insert({
    offer_id: offer.id,
    user_id: userId,
    redemption_code,
    redeemed_at: new Date().toISOString(),
  });
  if (error) {
    if (error.code === "23505") {
      throw new Error("Oferta a fost deja revendicată");
    }
    throw error;
  }
  await getSupabaseClient().from("analytics_events").insert({
    event_type: "offer_redeem",
    user_id: userId,
    offer_id: offer.id,
    stand_id: offer.stand_id,
    expo_id: offer.expo_id,
  });
  return redemption_code;
}

export async function recordVisitorEvent(input: {
  userId: string;
  expoId: string;
  eventType:
    | "zone_detected"
    | "offer_shown"
    | "qr_scanned"
    | "nfc_tapped"
    | "offer_redeemed";
  standId?: string | null;
  offerId?: string | null;
  beaconId?: string | null;
}): Promise<void> {
  const { error } = await getSupabaseClient().from("notification_events").insert({
    user_id: input.userId,
    expo_id: input.expoId,
    stand_id: input.standId ?? null,
    offer_id: input.offerId ?? null,
    beacon_id: input.beaconId ?? null,
    event_type: input.eventType,
  });
  if (error) {
    throw error;
  }
}
