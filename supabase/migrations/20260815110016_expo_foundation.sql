-- Replace the previous local schema with the expo foundation model.
-- Local-only: this migration is not applied to any remote project.

drop table if exists public.redemptions cascade;
drop table if exists public.notifications_log cascade;
drop table if exists public.offer_redemptions cascade;
drop table if exists public.notification_events cascade;
drop table if exists public.user_interests cascade;
drop table if exists public.offers cascade;
drop table if exists public.beacons cascade;
drop table if exists public.stands cascade;
drop table if exists public.profiles cascade;
drop table if exists public.expos cascade;

drop function if exists private.current_profile_role();
drop function if exists private.owns_stand(uuid);
drop function if exists private.offers_protect_immutable_columns();
drop function if exists private.set_updated_at();

drop type if exists public.notification_type;
drop type if exists public.profile_role;

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.expos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint expos_window_chk check (ends_at > starts_at)
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null,
  display_name text,
  created_at timestamptz not null default now(),
  constraint profiles_role_chk check (role in ('organizer', 'vendor', 'visitor'))
);

create table public.stands (
  id uuid primary key default gen_random_uuid(),
  expo_id uuid not null references public.expos (id) on delete cascade,
  vendor_id uuid references public.profiles (id) on delete set null,
  code text not null,
  name text not null,
  hall text not null,
  zone text not null,
  x_coord numeric not null,
  y_coord numeric not null,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint stands_expo_code_key unique (expo_id, code)
);

create table public.beacons (
  id uuid primary key default gen_random_uuid(),
  expo_id uuid not null references public.expos (id) on delete cascade,
  stand_id uuid references public.stands (id) on delete set null,
  beacon_uuid uuid not null,
  major integer not null,
  minor integer not null,
  hall text not null,
  zone text not null,
  x_coord numeric not null,
  y_coord numeric not null,
  tx_power integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint beacons_major_chk check (major between 0 and 65535),
  constraint beacons_minor_chk check (minor between 0 and 65535),
  constraint beacons_identity_key unique (expo_id, beacon_uuid, major, minor)
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  stand_id uuid not null references public.stands (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  product_name text not null,
  description text,
  category text not null,
  discount_percent numeric(5, 2),
  status text not null default 'draft',
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_discount_chk check (
    discount_percent is null
    or (discount_percent > 0 and discount_percent <= 100)
  ),
  constraint offers_status_chk check (status in ('draft', 'active', 'paused', 'expired')),
  constraint offers_validity_chk check (
    valid_until is null
    or valid_from is null
    or valid_until > valid_from
  )
);

create table public.user_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_id uuid not null references public.expos (id) on delete cascade,
  category text not null,
  created_at timestamptz not null default now(),
  constraint user_interests_unique unique (user_id, expo_id, category)
);

create table public.offer_redemptions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  redemption_code text not null unique,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint offer_redemptions_offer_user_key unique (offer_id, user_id)
);

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  expo_id uuid not null references public.expos (id) on delete cascade,
  stand_id uuid references public.stands (id) on delete set null,
  offer_id uuid references public.offers (id) on delete set null,
  beacon_id uuid references public.beacons (id) on delete set null,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  constraint notification_events_type_chk check (
    event_type in (
      'zone_detected',
      'offer_shown',
      'offer_opened',
      'qr_scanned',
      'nfc_tapped',
      'offer_redeemed'
    )
  )
);

create index stands_expo_id_idx on public.stands (expo_id);
create index stands_vendor_id_idx on public.stands (vendor_id);
create index stands_hall_zone_idx on public.stands (hall, zone);
create index beacons_expo_id_idx on public.beacons (expo_id);
create index beacons_stand_id_idx on public.beacons (stand_id);
create index offers_stand_id_idx on public.offers (stand_id);
create index offers_created_by_idx on public.offers (created_by);
create index offers_status_idx on public.offers (status);
create index user_interests_user_id_idx on public.user_interests (user_id);
create index user_interests_expo_id_idx on public.user_interests (expo_id);
create index offer_redemptions_offer_id_idx on public.offer_redemptions (offer_id);
create index offer_redemptions_user_id_idx on public.offer_redemptions (user_id);
create index notification_events_user_id_idx on public.notification_events (user_id);
create index notification_events_expo_id_idx on public.notification_events (expo_id);

-- ---------------------------------------------------------------------------
-- Helpers (security definer, pinned search_path)
-- ---------------------------------------------------------------------------

create or replace function private.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid());
$$;

create or replace function private.owns_stand(p_stand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.stands as s
    where s.id = p_stand_id
      and s.vendor_id = (select auth.uid())
  );
$$;

create or replace function private.offers_protect_immutable_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stand_id is distinct from old.stand_id then
    raise exception 'stand_id cannot be changed' using errcode = '42501';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger offers_protect_immutable_columns
  before update on public.offers
  for each row
  execute function private.offers_protect_immutable_columns();

create trigger offers_set_updated_at
  before update on public.offers
  for each row
  execute function private.set_updated_at();

revoke all on function private.current_profile_role() from public;
revoke all on function private.owns_stand(uuid) from public;
revoke all on function private.offers_protect_immutable_columns() from public;
revoke all on function private.set_updated_at() from public;
grant execute on function private.current_profile_role() to authenticated;
grant execute on function private.owns_stand(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.expos enable row level security;
alter table public.profiles enable row level security;
alter table public.stands enable row level security;
alter table public.beacons enable row level security;
alter table public.offers enable row level security;
alter table public.user_interests enable row level security;
alter table public.offer_redemptions enable row level security;
alter table public.notification_events enable row level security;

-- Catalog: public read of currently running expos and active floor data only.
create policy expos_select_active
  on public.expos
  for select
  to anon, authenticated
  using (starts_at <= now() and ends_at >= now());

create policy stands_select_active
  on public.stands
  for select
  to anon, authenticated
  using (is_active = true);

create policy stands_select_own_vendor
  on public.stands
  for select
  to authenticated
  using (vendor_id = (select auth.uid()));

create policy beacons_select_active
  on public.beacons
  for select
  to anon, authenticated
  using (is_active = true);

create policy beacons_select_own_vendor
  on public.beacons
  for select
  to authenticated
  using (
    stand_id is not null
    and private.owns_stand(stand_id)
  );

-- Offers: public sees only active; vendors manage their own stands' offers.
create policy offers_select_active
  on public.offers
  for select
  to anon, authenticated
  using (status = 'active');

create policy offers_select_own_vendor
  on public.offers
  for select
  to authenticated
  using (private.owns_stand(stand_id));

create policy offers_insert_own_vendor
  on public.offers
  for insert
  to authenticated
  with check (
    private.owns_stand(stand_id)
    and created_by = (select auth.uid())
    and private.current_profile_role() = 'vendor'
  );

create policy offers_update_own_vendor
  on public.offers
  for update
  to authenticated
  using (
    private.owns_stand(stand_id)
    and created_by = (select auth.uid())
    and private.current_profile_role() = 'vendor'
  )
  with check (
    private.owns_stand(stand_id)
    and created_by = (select auth.uid())
    and private.current_profile_role() = 'vendor'
  );

create policy offers_delete_own_vendor
  on public.offers
  for delete
  to authenticated
  using (
    private.owns_stand(stand_id)
    and created_by = (select auth.uid())
    and private.current_profile_role() = 'vendor'
  );

-- Profiles: own row only. No public vendor PII.
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = (select p.role from public.profiles as p where p.id = (select auth.uid()))
  );

-- Visitor interests
create policy user_interests_select_own
  on public.user_interests
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy user_interests_insert_own
  on public.user_interests
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy user_interests_delete_own
  on public.user_interests
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Visitor redemptions: create + read own; no UPDATE (redeemed_at is immutable for clients)
create policy offer_redemptions_select_own
  on public.offer_redemptions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy offer_redemptions_insert_own
  on public.offer_redemptions
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Notification events: insert/read own only
create policy notification_events_select_own
  on public.notification_events
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy notification_events_insert_own
  on public.notification_events
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant usage on schema private to authenticated;

grant select on table public.expos to anon, authenticated;
grant select on table public.stands to anon, authenticated;
grant select on table public.beacons to anon, authenticated;
grant select on table public.offers to anon, authenticated;

revoke all on table public.profiles from anon;
revoke all on table public.user_interests from anon;
revoke all on table public.offer_redemptions from anon;
revoke all on table public.notification_events from anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.offers to authenticated;
grant select, insert, delete on table public.user_interests to authenticated;
grant select, insert on table public.offer_redemptions to authenticated;
grant select, insert on table public.notification_events to authenticated;
