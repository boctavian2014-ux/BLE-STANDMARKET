# ADR: Mobile app identity

**Status:** Accepted  
**Date:** 2026-08-15  
**Scope:** Names, native IDs, deep-link schemes, store listing, monorepo layout, and Visitor digital-pass monetization.  
**Not this document:** Scaffold, Expo/React Native install, EAS project creation, Apple/Google reservation, RevenueCat, or IAP. Those start after this ADR is on `main`. PR 3 is scaffold only.

Two products, two binaries, one Auth identity. Neither app is an authorization boundary. Postgres RLS is.

## Decision

| Element | Visitor | Vendor |
|---|---|---|
| Store name | StandMarket | StandMarket Vendor |
| Home-screen name | StandMarket | SM Vendor |
| iOS bundle ID | `com.standmarket.visitor` | `com.standmarket.vendor` |
| Android package | `com.standmarket.visitor` | `com.standmarket.vendor` |
| Expo slug | `standmarket-visitor` | `standmarket-vendor` |
| EAS project | Separate | Separate |
| Deep-link scheme | `standmarket://` | `standmarket-vendor://` |
| App Store / Play | Public listing | Unlisted (or public later). Default: **unlisted** after launch |
| BLE background | Yes | No |
| NFC / QR | Read offers | Scan to validate a redemption |

Vendor is not a consumer app. After launch it is distributed to merchants via an activation QR/link. During development and the pilot: Google Play Internal Testing and TestFlight.

Both apps talk to the **same** Supabase project. Each has its own EAS project ID and signing credentials. Distinct native IDs allow both apps on one phone.

## Why these IDs

- Reverse-DNS, unique, stable after first distributed build.
- No `ble` in the identifier. The product may grow past BLE; native IDs are expensive to change after store publication.
- No `dev`, `staging`, or `production` in the **public** IDs.

Internal / preview binaries use suffixes (not the public listing IDs):

| Build | Visitor | Vendor |
|---|---|---|
| Development | `com.standmarket.visitor.dev` | `com.standmarket.vendor.dev` |
| Preview | `com.standmarket.visitor.preview` | `com.standmarket.vendor.preview` |
| Production | `com.standmarket.visitor` | `com.standmarket.vendor` |

Reserve all four **production** IDs in Apple Developer and Google Play before the first distributed build. Reserve the `.dev` / `.preview` IDs as well if those binaries will be installed on devices.

## Monorepo (PR 3 target)

```
BLE-STANDMARKET/
  apps/
    visitor-mobile/
    vendor-mobile/
  packages/
    shared/            # domain types, Zod, constants; no React Native
    supabase-client/   # create client, auth/session helpers
    ui/                # design tokens, primitive components
    expo-config/       # app config / EAS helpers
  supabase/
  docs/
```

React and React Native stay in the apps, or as **peer** dependencies of `packages/ui`. Do not hoist a second runtime copy into a package.

`packages/shared` must not import React Native. Vendor authority stays **active membership**, not `profiles.role` and not a client-side role picker.

## Visitor monetization

StandMarket Visitor folosește produse digitale cu plată unică, fără
reînnoire automată:

- `visitor_daily_pass`: acces Premium timp de 24 de ore de la confirmarea
  tranzacției; preț orientativ 1,49 EUR.
- `visitor_event_pass`: acces Premium până la finalul expoziției asociate;
  preț orientativ 3,99 EUR.
- Plan Free: hartă, căutare de bază, standuri, QR/NFC și oferte publice.

Daily Pass deblochează alerte personalizate pe zone, favorite, filtre
avansate, rută spre oferte și cupoane Premium. În UI este prezentat ca:
„Acces Premium 24 ore. Plată unică. Nu se reînnoiește automat.”

Pe iOS se livrează prin Apple In-App Purchase; pe Android prin Google
Play Billing. Starea entitlement-ului este verificată prin RevenueCat și
va fi sincronizată ulterior cu backend-ul. Nu se folosesc IAP pentru
bunurile fizice cumpărate la stand; acele plăți rămân între cumpărător și
comerciant.

Accesul digital temporar este un produs **non-renewing** pe iOS și
**one-time** pe Android. Pentru produsele digitale vândute în aplicație
trebuie folosite mecanismele de billing ale magazinelor. PR 3 nu
instalează RevenueCat și nu adaugă ecrane de plată.

## Consequences

- Scaffold (PR 3) must use these slugs, schemes, and bundle IDs. Do not invent a third app or a shared “role switch” binary.
- Visitor may request BLE background modes. Vendor must not.
- Deep links must not collide (`standmarket://` vs `standmarket-vendor://`).
- Store listing for Vendor defaults to unlisted; changing that is a product decision, not a code change in PR 3.

## Out of scope until PR 3+

- Creating `apps/` or `packages/`
- Installing Expo, React Native, EAS CLI
- Creating remote EAS or Supabase projects
- RevenueCat, IAP, Auth UI, BLE/NFC/QR
- Railway, NestJS, or a third mobile app
