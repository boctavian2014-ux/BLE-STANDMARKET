-- Expo exhibition schema: tables, indexes, helpers, RLS, grants

create schema if not exists private;

create type public.notification_type as enum ('zone', 'stand', 'qr');
create type public.profile_role as enum ('visitor', 'vendor', 'organizer');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.expos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.profile_role not null default 'visitor',
  display_name text,
  created_at timestamptz not null default now()
);

create table public.stands (
  id uuid primary key default gen_random_uuid(),
  expo_id uuid not null references public.expos (id) on delete cascade,
  name text not null,
  hall text not null,
  zone text not null,
  x_coord double precision,
  y_coord double precision,
  vendor_id uuid references public.profiles (id) on delete set null,
  category text,
  created_at timestamptz not null default now()
);

create table public.beacons (
  id uuid primary key default gen_random_uuid(),
  expo_id uuid not null references public.expos (id) on delete cascade,
  uuid text not null,
  major integer not null,
  minor integer not null,
  stand_id uuid references public.stands (id) on delete set null,
  hall text,
  zone text,
  x_coord double precision,
  y_coord double precision,
  tx_power integer,
  created_at timestamptz not null default now(),
  constraint beacons_uuid_major_minor_key unique (uuid, major, minor)
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  stand_id uuid not null references public.stands (id) on delete cascade,
  product_name text not null,
  description text,
  discount_percent numeric(5, 2),
  category text,
  active boolean not null default true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create table public.user_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_id uuid not null references public.expos (id) on delete cascade,
  category text not null,
  created_at timestamptz not null default now(),
  constraint user_interests_user_expo_category_key unique (user_id, expo_id, category)
);

create table public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete set null,
  beacon_id uuid references public.beacons (id) on delete set null,
  stand_id uuid references public.stands (id) on delete set null,
  notification_type public.notification_type not null,
  created_at timestamptz not null default now()
);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  redemption_code text not null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint redemptions_redemption_code_key unique (redemption_code)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index stands_expo_id_idx on public.stands (expo_id);
create index stands_vendor_id_idx on public.stands (vendor_id);
create index stands_hall_zone_idx on public.stands (hall, zone);

create index beacons_expo_id_idx on public.beacons (expo_id);
create index beacons_stand_id_idx on public.beacons (stand_id);
create index beacons_uuid_major_minor_idx on public.beacons (uuid, major, minor);

create index offers_stand_id_idx on public.offers (stand_id);
create index offers_active_idx on public.offers (active) where active = true;
create index offers_category_idx on public.offers (category);

create index user_interests_user_id_idx on public.user_interests (user_id);
create index user_interests_expo_id_idx on public.user_interests (expo_id);

create index notifications_log_user_id_idx on public.notifications_log (user_id);
create index notifications_log_offer_id_idx on public.notifications_log (offer_id);
create index notifications_log_stand_id_idx on public.notifications_log (stand_id);

create index redemptions_offer_id_idx on public.redemptions (offer_id);
create index redemptions_user_id_idx on public.redemptions (user_id);

-- ---------------------------------------------------------------------------
-- Private helpers (security definer, empty search_path)
-- ---------------------------------------------------------------------------

create or replace function private.current_profile_role()
returns public.profile_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
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
    from public.stands s
    where s.id = p_stand_id
      and s.vendor_id = (select auth.uid())
  );
$$;

revoke all on function private.current_profile_role() from public;
revoke all on function private.owns_stand(uuid) from public;
grant execute on function private.current_profile_role() to authenticated;
grant execute on function private.owns_stand(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.expos enable row level security;
alter table public.profiles enable row level security;
alter table public.stands enable row level security;
alter table public.beacons enable row level security;
alter table public.offers enable row level security;
alter table public.user_interests enable row level security;
alter table public.notifications_log enable row level security;
alter table public.redemptions enable row level security;

-- expos: public read
create policy "expos_select_public"
  on public.expos
  for select
  to anon, authenticated
  using (true);

-- profiles: own row
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- stands / beacons: public read
create policy "stands_select_public"
  on public.stands
  for select
  to anon, authenticated
  using (true);

create policy "beacons_select_public"
  on public.beacons
  for select
  to anon, authenticated
  using (true);

-- offers: active readable by everyone; vendors manage own stands' offers
create policy "offers_select_active"
  on public.offers
  for select
  to anon, authenticated
  using (active = true);

create policy "offers_select_own_vendor"
  on public.offers
  for select
  to authenticated
  using (private.owns_stand(stand_id));

create policy "offers_insert_own_vendor"
  on public.offers
  for insert
  to authenticated
  with check (
    private.owns_stand(stand_id)
    and private.current_profile_role() = 'vendor'
  );

create policy "offers_update_own_vendor"
  on public.offers
  for update
  to authenticated
  using (
    private.owns_stand(stand_id)
    and private.current_profile_role() = 'vendor'
  )
  with check (
    private.owns_stand(stand_id)
    and private.current_profile_role() = 'vendor'
  );

create policy "offers_delete_own_vendor"
  on public.offers
  for delete
  to authenticated
  using (
    private.owns_stand(stand_id)
    and private.current_profile_role() = 'vendor'
  );

-- user_interests: own rows only
create policy "user_interests_select_own"
  on public.user_interests
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_interests_insert_own"
  on public.user_interests
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_interests_update_own"
  on public.user_interests
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_interests_delete_own"
  on public.user_interests
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- notifications_log: own rows
create policy "notifications_log_select_own"
  on public.notifications_log
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "notifications_log_insert_own"
  on public.notifications_log
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- redemptions: users manage own; vendors can read for their offers
create policy "redemptions_select_own"
  on public.redemptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "redemptions_select_vendor"
  on public.redemptions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.offers o
      where o.id = offer_id
        and private.owns_stand(o.stand_id)
    )
  );

create policy "redemptions_insert_own"
  on public.redemptions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Grants (least privilege)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant usage on schema private to authenticated;

-- Public catalog tables
grant select on table public.expos to anon, authenticated;
grant select on table public.stands to anon, authenticated;
grant select on table public.beacons to anon, authenticated;
grant select on table public.offers to anon, authenticated;

-- Private tables: revoke default anon grants from Supabase base roles
revoke all on table public.profiles from anon;
revoke all on table public.user_interests from anon;
revoke all on table public.notifications_log from anon;
revoke all on table public.redemptions from anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.offers to authenticated;
grant select, insert, update, delete on table public.user_interests to authenticated;
grant select, insert on table public.notifications_log to authenticated;
grant select, insert on table public.redemptions to authenticated;
