# Vendor activation and stand memberships

Technical design for **PR 2**: `feat(auth): add vendor activation and stand memberships`.

No SQL in this document. `b140d2d` (expo foundation) is not modified here. Implementation (migration, RLS, pgTAP) starts only after this design is accepted.

Two mobile products stay separate: **BLE Standmarket Visitor** and **BLE Standmarket Vendor**. Neither app is an authorization boundary. Postgres RLS is.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Default profile | Every `auth.users` insert creates `public.profiles` with `role = visitor`. |
| Allowed role values | `visitor`, `vendor`, `organizer`. |
| Self-serve role | A user cannot set `vendor` or `organizer` on themselves. |
| Vendor authority | Derived from an **active membership**, not from choosing a role in the Vendor app. |
| Activation | Organizer issues a one-time hashed code bound to `expo_id` + `stand_id`. |
| Redeem timing | **After login only.** The code never creates an Auth user. |
| Multi-stand / multi-staff | `vendor_stand_memberships` (N:N). Do not rely on `stands.vendor_id` long term. |
| Code storage | Hash only. Plaintext shown once at generation. |
| Redeem path | Atomic security-definer RPC. No client `UPDATE` on codes. |
| Security definer | Minimal surface, always `set search_path = ''`. |

## 1. Profile on Auth insert

On `auth.users` `INSERT`, a trigger in `private` creates:

```
public.profiles (id = new.id, role = 'visitor', display_name = null)
```

Rules:

- Runs as security definer with `search_path = ''`.
- Idempotent (`ON CONFLICT (id) DO NOTHING`) so seed/tests can pre-insert profiles.
- Never reads `raw_user_meta_data` / `user_metadata` for role. Those claims are user-editable.
- Visitor app and Vendor app both get a visitor profile at signup. Installing Vendor does not grant vendor rights.

`profiles.role` may later be set to `organizer` **only** by `service_role` / SQL (out of band). The client `UPDATE` policy must keep `role` immutable, as in the foundation.

`profiles.role = 'vendor'` is optional denormalization after first successful redeem. Authorization must not depend on it. **Active membership is the source of truth.**

## 2. Roles

| Role | How it is obtained | Apps |
|---|---|---|
| `visitor` | Automatic on signup | Visitor app (primary). Also the default after Vendor signup, before redeem. |
| vendor (effective) | Active row in `vendor_stand_memberships` | Vendor app only, after redeem |
| `organizer` | Out-of-band (`service_role`) | Not a third mobile app in this roadmap. Dashboard / SQL / future admin. |

A user may be a visitor in the Visitor app and a vendor (via membership) in the Vendor app with the **same** Auth identity. The Visitor app never shows activation or offer-CRUD screens.

## 3. Users cannot self-promote

Blocked paths:

- `UPDATE profiles SET role = 'vendor'|'organizer'` — rejected by RLS `WITH CHECK` (role frozen).
- Inserting `vendor_stand_memberships` from the client — no `INSERT` grant/policy for `authenticated`.
- Updating `stands.vendor_id` from the client — no write policy.
- Calling generate/redeem RPCs without the documented checks.

Escalation `visitor → organizer` is a required pgTAP failure case.

## 4. Activation codes

Table (PR 2): `public.vendor_activation_codes`.

| Column | Rule |
|---|---|
| `expo_id`, `stand_id` | Required. Stand must belong to that expo. |
| `code_hash` | `sha256` of normalized plaintext (and a server pepper from Vault when remote exists). Never store plaintext. |
| `expires_at` | Default **7 days** from creation. Reject if `now() >= expires_at`. |
| `max_uses` | Default **1**. |
| `used_count` | Incremented atomically in the redeem RPC. |
| `status` | `active` \| `consumed` \| `revoked` \| `expired` |
| `created_by` | Organizer / service actor. |
| `consumed_by`, `consumed_at` | Set on successful redeem. |

### Format (plaintext, shown once)

- Alphabet: Crockford Base32 (`0-9A-HJKMNP-TV-Z`), no ambiguous `I/L/O/U`.
- Shape: `XXXX-XXXX-XXXX-XXXX` (16 symbols, ~80 bits).
- Normalize before hash: uppercase, strip dashes/spaces.
- Organizer UI/RPC returns plaintext **once** in the generate response. It is not readable later via `SELECT`.

### Generation

Organizer (or `service_role`) creates/imports the stand, then calls `private.generate_vendor_activation_code(stand_id)`.

- Allowed only if the caller is `service_role` **or** `profiles.role = 'organizer'` (role itself was not self-assigned).
- Inserts a hash row with `status = active`.
- Returns `{ code, expires_at, stand_id, expo_id }`.
- Client apps (Visitor and Vendor) have **no** generate grant.

## 5. Many stands, many staff

`public.vendor_stand_memberships`:

| Column | Rule |
|---|---|
| `expo_id`, `stand_id`, `user_id` | Required |
| `status` | `active` \| `revoked` |
| `activated_at`, `revoked_at`, `created_at` | Timestamps |
| unique | `(stand_id, user_id)` |

Implications:

- One merchant, many stands: many memberships, one Auth user. Redeem one code per stand.
- One stand, many employees: many memberships on the same `stand_id`. Each person gets their own code (or a future `max_uses > 1` code — default remains 1).
- `stands.vendor_id` stays in the foundation schema as a legacy pointer. PR 2 must **not** use it for new RLS. A later cleanup PR can drop or sync it.

Effective vendor check:

```
exists membership
  where user_id = auth.uid()
    and stand_id = <target>
    and status = 'active'
```

## 6. Redeem only after login

Established flow:

```
Organizer
  -> create / import stand
  -> generate activation code
  -> send code to the merchant (offline / email / print)

Merchant
  -> install BLE Standmarket Vendor
  -> create account or sign in   -- Auth first
  -> enter code
  -> RPC redeem                  -- session required
  -> membership active
  -> publish offers only for membership stands
```

The code does **not** create `auth.users`. If there is no JWT, redeem fails.

- Tokenul este comparat după normalizare: se elimină separatorii, se convertește la uppercase și se aplică regulile de decodare Crockford înainte de hashing; codul în clar nu este persistat și nu apare în audit sau loguri.
- Redeem-ul este executat exclusiv printr-un RPC atomic; pentru aceeași cerere, tranzacția blochează rândul codului înainte de verificare și consumare, astfel încât două redeem-uri concurente nu pot activa același cod de două ori.

Signup in the Vendor app still creates a visitor profile. Rights appear only after a successful redeem.

## 7. Revoke vendor access

Organizer / `service_role` sets membership `status = revoked` and `revoked_at = now()`. Optionally revoke unused codes (`status = revoked`).

Published offers:

- Rows stay. History and visitor redemptions stay.
- The revoked user **loses** insert/update/delete on those offers.
- Active offers **remain publicly visible** until another active member of that stand, or `service_role`, sets `paused` / `expired`.
- PR 2 does not auto-pause on revoke (avoids surprising the floor mid-show). Document this in the Vendor app later as an organizer action.

## 8. Brute-force resistance

| Control | Rule |
|---|---|
| Entropy | ~80 bits; guessing is not practical. |
| Uniform errors | Redeem always returns the same client error for invalid / expired / consumed / revoked / wrong stand. |
| Rate (user) | Max **5** failed redeems / **15 minutes** / `auth.uid()`. Then reject for the remainder of the window. |
| Rate (code prefix) | Optional extra limit per normalized hash attempt bucket, to slow spraying. |
| Lock | After **15** failed attempts / rolling **24 hours** / user: block redeem until `service_role` clears the audit lock. |
| Audit | `private.vendor_activation_attempts` (`user_id`, `at`, `success`, `source`). No plaintext code. |
| Compare | Hash then compare; no `SELECT` of candidate rows by plaintext. |
| Network | IP rate limits belong to Edge / API when staging exists. Not required for local pgTAP. |

Visitor app must not expose the redeem RPC in its client bundle as a product feature. RLS/RPC still reject unauthenticated and non-eligible callers.

## 9. Visibility: visitor vs vendor

| Data | Visitor (Visitor app) | Vendor (Vendor app, after membership) |
|---|---|---|
| Running expos, active stands/beacons | Yes | Yes (catalog) |
| Inactive stands | No | Own membership stands only |
| Offers `active` | Yes | Yes |
| Offers `draft` / `paused` / `expired` | No | Membership stands only |
| Other vendors' draft/paused | No | No |
| Own profile | Yes | Yes |
| Other profiles | No | No |
| `user_interests`, own redemptions, own notification events | Yes | Not a Vendor product surface; same RLS if same user |
| Activation codes | No | No (not even own consumed hash) |
| Memberships | No | Own rows only |
| Analytics | Own saves/redeems (later) | Own stand/offers only (later) |

Anonymous: public catalog only (active expo/stands/beacons, active offers). No interests, codes, or memberships. `SELECT` on `user_interests` remains privilege-denied (`42501`) as in foundation tests.

## 10. RLS matrix (PR 2 target)

`anon` and `authenticated` never get `UPDATE`/`DELETE` on codes. Redeem and generate are RPCs.

### `profiles`

| Actor | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| anon | no | no | no | no |
| authenticated | own row | own row (`id = auth.uid()`, `role = visitor` only) | own row, **role immutable** | no |
| service_role | all | all | all (including organizer assign) | all |

Client `INSERT` after the trigger is optional; if present, `role` must be `visitor`.

### `stands`

| Actor | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| anon | `is_active` | no | no | no |
| authenticated | `is_active` OR stand in caller's **active** memberships | no | no | no |
| service_role / organizer RPC | all | create/import (organizer path) | yes | yes |

Replace foundation `vendor_id = auth.uid()` with membership. Do not add client writes on stands in PR 2.

### `offers`

| Actor | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| anon | `status = 'active'` | no | no | no |
| visitor (no membership) | `status = 'active'` | no | no | no |
| authenticated with active membership on `stand_id` | active + own-stand non-public statuses | yes, `created_by = auth.uid()` | yes, same stand; `stand_id` / `created_by` immutable | yes, same stand |
| revoked membership | `status = 'active'` only | no | no | no |
| service_role | all | all | all | all |

`private.owns_stand(stand_id)` must be redefined as **active membership**, not `stands.vendor_id`. Keep `search_path = ''`.

### `vendor_activation_codes`

| Actor | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| anon | no | no | no | no |
| authenticated | no | no | no | no |
| organizer generate RPC | n/a (returns plaintext once) | via definer | no | no |
| redeem RPC | hash lookup via definer | no | consume via definer | no |
| service_role | hashes/metadata only | yes | yes | yes |

No `GRANT` to `anon` / `authenticated` on this table.

### `vendor_stand_memberships`

| Actor | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| anon | no | no | no | no |
| authenticated | own rows | no | no | no |
| redeem RPC | n/a | insert `active` via definer | no | no |
| organizer / service_role | all | yes | revoke | optional |

## 11. RPCs (minimal security definer)

All: `security definer`, `set search_path = ''`, `revoke` from `public`, grant execute only as specified.

| Function | Grant | Behavior |
|---|---|---|
| `private.handle_new_user()` | trigger only | Insert visitor profile |
| `private.has_active_membership(stand_id)` | used by RLS | Boolean |
| `private.owns_stand(stand_id)` | redefine | Alias of active membership (keeps existing policy names) |
| `public.generate_vendor_activation_code(stand_id)` | `service_role` + organizer | Insert hash, return plaintext once |
| `public.redeem_vendor_activation_code(code)` | `authenticated` | Auth required; rate-limit; validate hash/expiry/status/uses/stand; insert membership; consume code; audit success |
| organizer revoke helpers | `service_role` / organizer | Membership and unused codes |

Do not put definer functions in an API-exposed schema except the two `public` RPCs above. Prefer `private` + `GRANT EXECUTE` on a thin `public` wrapper if we need PostgREST.

## 12. pgTAP scenarios (required)

Each file: `BEGIN` / `plan(...)` / `finish()` / `ROLLBACK`. JWT via `set_config('request.jwt.claim.sub', ...)` and `set_config('request.jwt.claim.role', 'authenticated', true)`.

| Case | Expected |
|---|---|
| Valid code, logged-in user | Membership `active`; code `consumed`; `used_count = 1` |
| Expired code | No membership; uniform error; code not usable |
| Revoked code | No membership; uniform error |
| Reused / already consumed code | No second membership; uniform error |
| Code for another stand (user already member of stand A, redeems stand B's code) | Membership only for B if that code is valid; cannot attach A's code to B |
| Code bound to stand A used while claiming stand B | Reject |
| Visitor `UPDATE profiles.role` to `organizer` or `vendor` | 0 rows or `42501` |
| Visitor `INSERT` membership | `42501` or 0 rows |
| User without membership `INSERT` offer | `42501` or 0 rows |
| Member of stand A `INSERT` offer on stand B | Reject |
| Revoked member `UPDATE`/`DELETE` old offers | 0 rows |
| Anon `SELECT` codes / memberships | `42501` |
| Anon / visitor `SELECT` `user_interests` of others | unchanged foundation behavior |
| Failed redeem spam | 6th attempt in 15 minutes rejected (lock/rate) |
| Generate as non-organizer | Reject |

## 13. Out of scope for PR 2

- Expo / React Native apps and monorepo scaffold (PR 3+)
- BLE, NFC, QR UI, notifications, map
- Railway, remote Supabase (except later staging)
- Changing `b140d2d` foundation tables beyond additive migrations
- Auto-pause of offers on revoke
- Email/SMS delivery of codes

## 14. PR naming

```
feat(auth): add vendor activation and stand memberships
```

Branch already in use: `feat/auth-vendor-membership`.
