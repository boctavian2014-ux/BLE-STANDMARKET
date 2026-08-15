/**
 * Placeholder for a future local Supabase JS client.
 * Do not add @supabase/supabase-js, URLs, keys, or env reads in this package.
 */
export const SUPABASE_CLIENT_PENDING = true as const;

export type SupabaseClientPending = {
  readonly pending: true;
};
