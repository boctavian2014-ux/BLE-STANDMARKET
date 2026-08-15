-- Realtime publication + analytics_events (PR 6). Additive. Does not alter
-- existing table definitions except replica identity for postgres_changes.

alter table public.offers replica identity full;
alter table public.notification_events replica identity full;

alter publication supabase_realtime add table public.offers;
alter publication supabase_realtime add table public.notification_events;

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references public.profiles (id) on delete set null,
  offer_id uuid references public.offers (id) on delete set null,
  stand_id uuid references public.stands (id) on delete set null,
  expo_id uuid references public.expos (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint analytics_events_type_chk check (
    event_type in ('offer_view', 'offer_redeem', 'stand_view')
  )
);

create index analytics_events_stand_id_idx on public.analytics_events (stand_id);
create index analytics_events_offer_id_idx on public.analytics_events (offer_id);
create index analytics_events_user_id_idx on public.analytics_events (user_id);
create index analytics_events_expo_id_idx on public.analytics_events (expo_id);

alter table public.analytics_events enable row level security;

create policy analytics_events_insert_own
  on public.analytics_events
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy analytics_events_select_own
  on public.analytics_events
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy analytics_events_select_vendor
  on public.analytics_events
  for select
  to authenticated
  using (
    stand_id is not null
    and private.has_active_membership(stand_id)
  );

create policy analytics_events_select_organizer
  on public.analytics_events
  for select
  to authenticated
  using (private.is_organizer());

-- Vendors need stand-scoped redemption counts on the dashboard.
create policy offer_redemptions_select_vendor
  on public.offer_redemptions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.offers as o
      where o.id = offer_id
        and private.has_active_membership(o.stand_id)
    )
  );

revoke all on table public.analytics_events from anon;
grant select, insert on table public.analytics_events to authenticated;
