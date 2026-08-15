# BLE STANDMARKET

Expoziție BLE / NFC / QR — monorepo local-first (Bun + Expo + Supabase).

## Cerințe

- [Bun](https://bun.sh)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node.js ≥ 22.13 (cerut de Expo SDK)

## Structură

```
apps/
  visitor-mobile/     # StandMarket (Visitor)
  vendor-mobile/      # StandMarket Vendor
packages/
  shared/             # identitate produs
  supabase-client/    # placeholder, fără client
  ui/                 # design tokens
  expo-config/        # slug / scheme / bundle IDs
supabase/             # schema, RLS, seed, pgTAP
docs/
```

## Aplicații mobile (local)

```bash
bun install
bun run dev:visitor
bun run dev:vendor
```

Quality:

```bash
bun run typecheck
bun run lint
bun run test
```

## Setup local (schema + seed)

```bash
bun run db:start
bun run db:reset
bun run db:test
bun run db:lint
```

După `db:start`, Studio e de obicei la [http://127.0.0.1:54323](http://127.0.0.1:54323). Cheile locale apar în `supabase status`. Nu le commitați.

## Exclus din acest scaffold (PR 3)

Auth UI, BLE, NFC, QR, hărți, notificări, RevenueCat, IAP, billing, Railway, NestJS, EAS build/submit, Supabase remote, ecrane de produs și mock data de business.

Identitatea nativă și modelul Daily Pass sunt în `docs/architecture/MOBILE_APP_IDENTITY.md`.
