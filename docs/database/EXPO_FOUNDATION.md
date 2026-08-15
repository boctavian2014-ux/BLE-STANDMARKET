# Expo foundation (local)

Local-only data foundation for an exhibition floor of up to 300 stands. Nothing here is applied to a remote Supabase project.

## Objects

| Table | Purpose |
|---|---|
| `public.expos` | Exhibition window (`slug` unique) |
| `public.profiles` | `organizer` / `vendor` / `visitor`; PK = Auth user id |
| `public.stands` | Floor booths; unique `(expo_id, code)` |
| `public.beacons` | Zone (or optional stand) beacons; unique `(expo_id, beacon_uuid, major, minor)` |
| `public.offers` | Vendor offers: `draft` / `active` / `paused` / `expired` |
| `public.user_interests` | Visitor categories per expo |
| `public.offer_redemptions` | One redemption per user/offer; `redemption_code` unique |
| `public.notification_events` | Client-side event log |

## RLS

- **expos**: `SELECT` for `anon`/`authenticated` only while `starts_at <= now() <= ends_at`.
- **stands / beacons**: public `SELECT` only when `is_active`. A vendor may also `SELECT` their own inactive stands (and beacons attached to those stands).
- **offers**: public `SELECT` only when `status = 'active'`. A vendor may CRUD offers on stands where `stands.vendor_id = auth.uid()`, and must set `created_by = auth.uid()` on insert.
- **profiles**: own row only. Role cannot be changed by the owner (update `WITH CHECK` keeps the existing role).
- **user_interests**: visitor `SELECT` / `INSERT` / `DELETE` own rows. No `UPDATE` policy.
- **offer_redemptions**: visitor `SELECT` / `INSERT` own rows. No `UPDATE` policy, so clients cannot set `redeemed_at`.
- **notification_events**: authenticated `SELECT` / `INSERT` only when `user_id = auth.uid()`.

Anonymous has no `INSERT`/`UPDATE`/`DELETE` grants on catalog tables.

Draft, paused, and expired offers are not publicly readable.

## Organizer limit

`profiles.role = 'organizer'` is stored and checked, but **there is no organizer write policy**. Organizers do not receive a bypass. Local admin work uses the database owner / `service_role` (which bypasses RLS). Do not invent a broad organizer policy.

## Security definer helpers

All of these use `set search_path = ''`:

- `private.current_profile_role()`
- `private.owns_stand(uuid)`
- `private.offers_protect_immutable_columns()` — blocks changes to `offers.stand_id` and `offers.created_by`
- `private.set_updated_at()`

`auth.uid()` is written as `(select auth.uid())` in policies.

## Documented local UUIDs

Used by `supabase/seed.sql` and pgTAP JWT simulation. These are not Auth users in seed.

| Key | UUID |
|---|---|
| expo | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` |
| organizer | `aaaaaaaa-0000-0000-0000-000000000001` |
| vendor_a | `aaaaaaaa-0000-0000-0000-00000000000a` |
| vendor_b | `aaaaaaaa-0000-0000-0000-00000000000b` |
| visitor_a | `aaaaaaaa-0000-0000-0000-0000000000aa` |
| visitor_b | `aaaaaaaa-0000-0000-0000-0000000000bb` |

Seed inserts placeholder `profiles` with `session_replication_role = replica` so it does **not** write `auth.users`. Tests create matching `auth.users` rows inside a transaction and call:

```sql
select set_config('request.jwt.claim.sub', '<uuid>', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
```

## Seed shape

- 1 running demo expo
- 3 halls, 10 zones, 30 stands (one stand inactive)
- 12 zone beacons (`stand_id` null); 11 active, 1 inactive
- 15 offers: 7 active, 4 paused, 4 draft

## Local commands

```bash
bun run db:start
bun run db:reset
bun run db:test
bun run db:lint
bun run db:stop
```

`db:lint` maps to `bunx supabase db lint` (CLI 2.114.0 / `plpgsql_check`).
