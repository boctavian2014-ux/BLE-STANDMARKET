# StandMarket Vendor (local MVP)

## Environment

1. `bun run db:start` from the repo root.
2. Copy `.env.example` to `.env`.
3. Fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `supabase status`.
4. Never commit `.env`. Never use the `service_role` key.

Android emulator: use `http://10.0.2.2:54321` instead of `127.0.0.1`.

## Session storage

`@standmarket/supabase-client` persists Auth with AsyncStorage. SecureStore is not used because a full session payload can exceed its size limit.

## Activation

Sign up creates a visitor profile (DB trigger). Redeem a local seed code from `supabase/seed.sql` (`DEV0-ACTV-CODE-0001`) to attach an active membership. Role is never chosen in the UI.
