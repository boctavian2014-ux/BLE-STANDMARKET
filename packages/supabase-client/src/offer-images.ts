import type { SupabaseClient } from "@supabase/supabase-js";

export const OFFER_IMAGES_BUCKET = "offer-images";
export const MAX_OFFER_IMAGE_BYTES = 2 * 1024 * 1024;
export const OFFER_IMAGE_TOO_LARGE = "OFFER_IMAGE_TOO_LARGE";

export type OfferImageClient = Pick<SupabaseClient, "storage">;

export function offerImagePath(
  expoId: string,
  standId: string,
  offerId: string,
): string {
  return `${expoId}/${standId}/${offerId}.jpg`;
}

export function assertOfferImageSize(byteLength: number): void {
  if (byteLength > MAX_OFFER_IMAGE_BYTES) {
    throw new Error(OFFER_IMAGE_TOO_LARGE);
  }
}

export function bytesFromBase64(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function getOfferImageUrl(path: string, supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${OFFER_IMAGES_BUCKET}/${path}`;
}

export async function uploadOfferImage(
  offerId: string,
  standId: string,
  expoId: string,
  uri: string,
  client?: OfferImageClient,
  readBytes: (fileUri: string) => Promise<Uint8Array> = readUriBytes,
): Promise<string> {
  const storage = client ?? (await loadClient());
  const path = offerImagePath(expoId, standId, offerId);
  const bytes = await readBytes(uri);
  assertOfferImageSize(bytes.byteLength);
  const { error } = await storage.storage.from(OFFER_IMAGES_BUCKET).upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) {
    throw error;
  }
  return storage.storage.from(OFFER_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deleteOfferImage(
  path: string,
  client?: OfferImageClient,
): Promise<void> {
  const storage = client ?? (await loadClient());
  const { error } = await storage.storage.from(OFFER_IMAGES_BUCKET).remove([path]);
  if (error) {
    throw error;
  }
}

async function loadClient(): Promise<OfferImageClient> {
  const { getSupabaseClient } = await import("./client");
  return getSupabaseClient();
}

async function readUriBytes(uri: string): Promise<Uint8Array> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error("OFFER_IMAGE_READ_FAILED");
  }
  return new Uint8Array(await response.arrayBuffer());
}
