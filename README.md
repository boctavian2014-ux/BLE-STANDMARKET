# BLE STANDMARKET

Expoziție BLE / NFC / QR — fundație de date (Supabase local-first).

## Cerințe

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase --version`)
- Node.js ≥ 22.13 (pentru fazele ulterioare ale monorepo-ului)

## Setup local (schema + seed)

```bash
# Pornește stack-ul local (Postgres, Auth, Studio, etc.)
supabase start

# Aplică migrările și rulează seed.sql
supabase db reset

# Teste pgTAP (schema, RLS, seed)
supabase test db

# Lint SQL / plpgsql
supabase db lint
```

După `supabase start`, Studio e de obicei la [http://127.0.0.1:54323](http://127.0.0.1:54323). Cheile locale apar în output-ul comenzii `supabase status`.

## Structură

```
supabase/
  config.toml
  migrations/     # schema + RLS
  seed.sql        # 1 expo, 30 standuri, 5 oferte active
  tests/database/ # pgTAP
```

## Variabile de mediu (ulterior, apps)

| Variabilă | Descriere |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL API NestJS |
| `EXPO_PUBLIC_SUPABASE_URL` | URL proiect Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Cheie anon / publishable |

Nu aplicați migrările pe un proiect remote până nu e confirmat explicit.
