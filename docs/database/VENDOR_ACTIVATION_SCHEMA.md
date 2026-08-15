# Vendor activation schema (PR 2)

Technical notes for `supabase/migrations/20260815114844_vendor_activation.sql`. Product rules live in `docs/auth/VENDOR_ACTIVATION_DESIGN.md`.

## Inventory (pre-change)

| Table | Existing columns used |
|---|---|
| `public.profiles` | `id`, `role` (check `organizer\|vendor\|visitor`), `display_name`, `created_at`. Added `role` default `visitor`, INSERT only as `visitor`, UPDATE policy that freezes `role` via `private.current_profile_role()` (avoids the foundation self-join RLS recursion), and `GRANT UPDATE (display_name)` only. |
| `public.stands` | `vendor_id` remains. **Deprecated.** Not used by new RLS. Not synced. |
| `public.offers` | Unchanged columns. CRUD policies now call `private.has_active_membership(stand_id)` instead of `stands.vendor_id` and instead of `profiles.role = vendor`. |

## New objects

- `public.vendor_activation_codes` — hash-only tokens (`code_hash bytea`, unique).
- `public.vendor_stand_memberships` — unique `(stand_id, user_id)`.
- `public.vendor_activation_audit` — never stores plaintext or partial codes.
- Trigger `on_auth_user_created` → `private.handle_new_user()` inserts `profiles.role = visitor`. Ignores `user_metadata`.
- RPCs: `redeem_vendor_activation_code(text)`, `revoke_vendor_membership(uuid)`, `generate_vendor_activation_code(uuid)`.

## `stands.vendor_id`

Option **(b)**: deprecated in a SQL comment. RLS uses memberships only. No trigger copies membership → `vendor_id`. Seed still fills `vendor_id` for older rows and also inserts matching memberships so foundation tests stay valid.

## Redeem is the only activation writer

`public.redeem_vendor_activation_code` is `SECURITY DEFINER` with `SET search_path = ''`. It is the only path that:

- normalizes (strip separators, uppercase, Crockford `ILOU` → `110V`) and hashes with `extensions.digest(..., 'sha256')`;
- `SELECT … FOR UPDATE` on the code row;
- increments `used_count` and sets `consumed` / `consumed_by` / `consumed_at`;
- inserts or reactivates `vendor_stand_memberships`;
- writes `vendor_activation_audit`.

`EXECUTE` is granted only to `authenticated`. Revoked from `anon` and `public`. Clients have no `UPDATE` policy on codes.

Generic client error for every failure (including rate limit): `{ "error": "invalid or expired code" }`. `private.redeem_reject` writes the audit row, sets PostgREST `response.status` to `400`, and returns that object. The RPC does **not** `RAISE` on expected failures: a same-statement exception would roll back the audit insert, so rate-limit counters would never increment. Local `postgres` is not a superuser, so an autonomous `dblink` commit is not available. Clients must treat a present `error` key as failure. Success still returns only `stand_id`, `expo_id`, `activated_at`.

## RPC contract (`redeem_vendor_activation_code`)

Succes: HTTP 200 + `{ stand_id, expo_id, activated_at }`

Eșec: HTTP 400 + `{ error: "invalid or expired code" }`

Client: orice răspuns cu cheia `error` este un eșec; nu considera
redeem-ul reușit. Nu trata HTTP 200 + `{ error: ... }` ca succes:
nu este o cale implementată, fiindcă eșecurile așteptate setează
explicit `response.status = 400`.

## Rate limit

Implemented as queries on `vendor_activation_audit` keyed by `actor_id = auth.uid()` (no IP):

- **Tripwire (15 minutes):** ≥ 5 of `attempt_invalid|expired|revoked|reused|wrong_stand` → log `attempt_rate_limited` and return the generic error.
- **Lockout (24 hours):** ≥ 1 `attempt_rate_limited` in the last 24 hours → same block. This is a query on existing audit rows, not a separate lock table.

Checked before hash lookup so a 6th attempt does not reveal whether the code is valid. Plaintext is never written.

## RLS (new)

| Table | anon | authenticated | organizer |
|---|---|---|---|
| codes | no | no rows (SELECT grant + RLS false) / INSERT only if organizer | SELECT + INSERT |
| memberships | no | SELECT own | SELECT all |
| audit | no | no rows unless organizer | SELECT |

No client `UPDATE`/`DELETE` on the three tables. Revoke is `revoke_vendor_membership`.

## pgTAP concurrency limit

`006_vendor_stand_memberships.test.sql` cannot open two sessions. It redeems the same `max_uses=1` code twice in one transaction (first success, second reject) and asserts a single membership. Production races are serialized by `FOR UPDATE` plus `unique(stand_id, user_id)`.

## Local seed (dev only)

Plaintext in `seed.sql` comments/literals only: `DEV0-ACTV-CODE-0001`, `DEV0-EXPR-CODE-0002`, `DEV0-USED-CODE-0003`. Stored value is the digest of the normalized form.
