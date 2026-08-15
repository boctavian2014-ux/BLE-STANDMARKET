-- Additive PR 2: visitor profile trigger, hashed activation codes,
-- stand memberships, atomic redeem RPC, membership-based offer RLS.
-- Does not modify 20260815110016_expo_foundation.sql.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- profiles: default visitor only. Users never self-select vendor/organizer.
-- ---------------------------------------------------------------------------

alter table public.profiles
  alter column role set default 'visitor';

drop policy if exists profiles_insert_own on public.profiles;

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (
    id = (select auth.uid())
    and role = 'visitor'
  );

-- Foundation WITH CHECK self-selected from public.profiles and recursed under RLS.
-- Read the frozen role via the existing security-definer helper instead.
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = private.current_profile_role()
  );

-- Clients may change display_name only. role stays frozen (column privilege).
revoke update on table public.profiles from authenticated;
grant update (display_name) on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Auth → visitor profile
-- SECURITY DEFINER: signup runs as the Auth role, which cannot INSERT
-- public.profiles under RLS. The trigger must elevate just enough to
-- create the default visitor row. It never reads user_metadata.
-- ---------------------------------------------------------------------------

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'visitor')
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- stands.vendor_id is deprecated. RLS uses memberships only (no sync).
-- ---------------------------------------------------------------------------

comment on column public.stands.vendor_id is
  'DEPRECATED. Do not use for authorization. Source of truth is public.vendor_stand_memberships.status = active. Not synced.';

-- ---------------------------------------------------------------------------
-- Activation codes, memberships, audit
-- ---------------------------------------------------------------------------

create table public.vendor_activation_codes (
  id uuid primary key default gen_random_uuid(),
  expo_id uuid not null references public.expos (id) on delete cascade,
  stand_id uuid not null references public.stands (id) on delete cascade,
  code_hash bytea not null,
  status text not null default 'active',
  max_uses integer not null default 1,
  used_count integer not null default 0,
  expires_at timestamptz not null,
  created_by uuid not null references public.profiles (id),
  consumed_by uuid references public.profiles (id),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint vendor_activation_codes_hash_key unique (code_hash),
  constraint vendor_activation_codes_status_chk
    check (status in ('active', 'consumed', 'revoked', 'expired')),
  constraint vendor_activation_codes_max_uses_chk check (max_uses > 0),
  constraint vendor_activation_codes_used_count_chk check (used_count >= 0),
  constraint vendor_activation_codes_used_le_max_chk check (used_count <= max_uses)
);

create table public.vendor_stand_memberships (
  id uuid primary key default gen_random_uuid(),
  expo_id uuid not null references public.expos (id) on delete cascade,
  stand_id uuid not null references public.stands (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active',
  activated_via_code_id uuid references public.vendor_activation_codes (id),
  activated_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint vendor_stand_memberships_status_chk
    check (status in ('active', 'revoked')),
  constraint vendor_stand_memberships_stand_user_key unique (stand_id, user_id)
);

create table public.vendor_activation_audit (
  id uuid primary key default gen_random_uuid(),
  code_id uuid references public.vendor_activation_codes (id) on delete set null,
  actor_id uuid references public.profiles (id),
  event_type text not null,
  detail jsonb,
  occurred_at timestamptz not null default now(),
  constraint vendor_activation_audit_event_chk check (
    event_type in (
      'attempt_success',
      'attempt_invalid',
      'attempt_expired',
      'attempt_revoked',
      'attempt_reused',
      'attempt_wrong_stand',
      'attempt_rate_limited'
    )
  )
);

create index vendor_activation_codes_stand_id_idx
  on public.vendor_activation_codes (stand_id);
create index vendor_activation_codes_expo_id_idx
  on public.vendor_activation_codes (expo_id);
create index vendor_stand_memberships_user_id_idx
  on public.vendor_stand_memberships (user_id);
create index vendor_stand_memberships_stand_id_idx
  on public.vendor_stand_memberships (stand_id);
create index vendor_activation_audit_actor_occurred_idx
  on public.vendor_activation_audit (actor_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function private.normalize_activation_code(p_code text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text;
begin
  if p_code is null then
    return null;
  end if;
  v := upper(p_code);
  v := replace(replace(replace(v, '-', ''), ' ', ''), E'\t', '');
  v := translate(v, 'ILOU', '110V');
  if v = '' or v !~ '^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]+$' then
    return null;
  end if;
  return v;
end;
$$;

create or replace function private.hash_activation_code(p_code text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select extensions.digest(p_code, 'sha256');
$$;

create or replace function private.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.role = 'organizer'
  );
$$;

create or replace function private.has_active_membership(p_stand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vendor_stand_memberships as m
    where m.stand_id = p_stand_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

-- Redefine: membership only. stands.vendor_id is ignored.
create or replace function private.owns_stand(p_stand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_active_membership(p_stand_id);
$$;

create or replace function private.write_activation_audit(
  p_code_id uuid,
  p_actor_id uuid,
  p_event text,
  p_detail jsonb default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.vendor_activation_audit (code_id, actor_id, event_type, detail)
  values (p_code_id, p_actor_id, p_event, p_detail);
$$;

-- Reject path for redeem: persist audit, then return a generic error object.
-- Must not RAISE: a same-statement exception rolls the audit row back, so
-- rate-limit counters would never increment (local postgres is not a
-- superuser, so dblink autonomous commit is unavailable).
-- PostgREST: response.status 400. Client message is always the same.
create or replace function private.redeem_reject(
  p_code_id uuid,
  p_actor_id uuid,
  p_event text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.write_activation_audit(p_code_id, p_actor_id, p_event, null);
  perform set_config('response.status', '400', true);
  return jsonb_build_object('error', 'invalid or expired code');
end;
$$;

revoke all on function private.normalize_activation_code(text) from public;
revoke all on function private.hash_activation_code(text) from public;
revoke all on function private.is_organizer() from public;
revoke all on function private.has_active_membership(uuid) from public;
revoke all on function private.write_activation_audit(uuid, uuid, text, jsonb) from public;
revoke all on function private.redeem_reject(uuid, uuid, text) from public;

grant execute on function private.is_organizer() to authenticated;
grant execute on function private.has_active_membership(uuid) to authenticated;
grant execute on function private.owns_stand(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Redeem RPC — only writer for activation
-- SECURITY DEFINER: must lock/update codes, insert memberships and audit
-- that authenticated clients cannot write. search_path is empty; all
-- names are schema-qualified. EXECUTE granted only to authenticated.
-- Expected failures return {"error":"invalid or expired code"} (HTTP 400)
-- instead of RAISE, so the audit row commits and rate-limit can fire.
-- ---------------------------------------------------------------------------

create or replace function public.redeem_vendor_activation_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_norm text;
  v_hash bytea;
  v_code public.vendor_activation_codes%rowtype;
  v_membership public.vendor_stand_memberships%rowtype;
  v_fail_15 integer;
  v_fail_24 integer;
  v_new_used integer;
begin
  v_uid := (select auth.uid());
  if v_uid is null then
    return private.redeem_reject(null, null, 'attempt_invalid');
  end if;

  -- Rate limit from audit only (per profiles.id).
  -- Tripwire: 5 failures in 15 minutes. Lockout: any attempt_rate_limited
  -- in the last 24 hours keeps the RPC blocked (query, not a separate row type).
  select count(*) into v_fail_15
  from public.vendor_activation_audit as a
  where a.actor_id = v_uid
    and a.occurred_at > now() - interval '15 minutes'
    and a.event_type in (
      'attempt_invalid',
      'attempt_expired',
      'attempt_revoked',
      'attempt_reused',
      'attempt_wrong_stand'
    );

  select count(*) into v_fail_24
  from public.vendor_activation_audit as a
  where a.actor_id = v_uid
    and a.occurred_at > now() - interval '24 hours'
    and a.event_type = 'attempt_rate_limited';

  if v_fail_15 >= 5 or v_fail_24 >= 1 then
    return private.redeem_reject(null, v_uid, 'attempt_rate_limited');
  end if;

  v_norm := private.normalize_activation_code(p_code);
  if v_norm is null then
    return private.redeem_reject(null, v_uid, 'attempt_invalid');
  end if;

  v_hash := private.hash_activation_code(v_norm);

  select c.*
  into v_code
  from public.vendor_activation_codes as c
  where c.code_hash = v_hash
  for update;

  if not found then
    return private.redeem_reject(null, v_uid, 'attempt_invalid');
  end if;

  if v_code.status = 'revoked' then
    return private.redeem_reject(v_code.id, v_uid, 'attempt_revoked');
  end if;

  if v_code.status is distinct from 'active' then
    if v_code.status = 'consumed' or v_code.used_count >= v_code.max_uses then
      return private.redeem_reject(v_code.id, v_uid, 'attempt_reused');
    elsif v_code.status = 'expired' then
      return private.redeem_reject(v_code.id, v_uid, 'attempt_expired');
    else
      return private.redeem_reject(v_code.id, v_uid, 'attempt_invalid');
    end if;
  end if;

  if v_code.expires_at <= now() then
    return private.redeem_reject(v_code.id, v_uid, 'attempt_expired');
  end if;

  if v_code.used_count >= v_code.max_uses then
    return private.redeem_reject(v_code.id, v_uid, 'attempt_reused');
  end if;

  select m.*
  into v_membership
  from public.vendor_stand_memberships as m
  where m.stand_id = v_code.stand_id
    and m.user_id = v_uid
  for update;

  if found and v_membership.status = 'active' then
    v_new_used := v_code.used_count + 1;
    update public.vendor_activation_codes as c
    set
      used_count = v_new_used,
      status = case when v_new_used >= c.max_uses then 'consumed' else c.status end,
      consumed_by = coalesce(c.consumed_by, v_uid),
      consumed_at = coalesce(c.consumed_at, now())
    where c.id = v_code.id;
    perform private.write_activation_audit(v_code.id, v_uid, 'attempt_success', null);
    return jsonb_build_object(
      'stand_id', v_code.stand_id,
      'expo_id', v_code.expo_id,
      'activated_at', v_membership.activated_at
    );
  end if;

  if found and v_membership.status = 'revoked' then
    update public.vendor_stand_memberships as m
    set
      status = 'active',
      revoked_at = null,
      activated_at = now(),
      activated_via_code_id = v_code.id
    where m.id = v_membership.id
    returning * into v_membership;
  else
    insert into public.vendor_stand_memberships (
      expo_id, stand_id, user_id, status, activated_via_code_id
    ) values (
      v_code.expo_id, v_code.stand_id, v_uid, 'active', v_code.id
    )
    returning * into v_membership;
  end if;

  v_new_used := v_code.used_count + 1;
  update public.vendor_activation_codes as c
  set
    used_count = v_new_used,
    status = case when v_new_used >= c.max_uses then 'consumed' else c.status end,
    consumed_by = v_uid,
    consumed_at = now()
  where c.id = v_code.id;

  perform private.write_activation_audit(v_code.id, v_uid, 'attempt_success', null);

  return jsonb_build_object(
    'stand_id', v_code.stand_id,
    'expo_id', v_code.expo_id,
    'activated_at', v_membership.activated_at
  );
end;
$$;

create or replace function public.revoke_vendor_membership(p_membership_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.vendor_stand_memberships%rowtype;
begin
  if not private.is_organizer() then
    raise exception 'invalid or expired code' using errcode = '42501';
  end if;

  update public.vendor_stand_memberships as m
  set
    status = 'revoked',
    revoked_at = now()
  where m.id = p_membership_id
  returning * into v_row;

  if not found then
    raise exception 'invalid or expired code' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'stand_id', v_row.stand_id,
    'status', v_row.status
  );
end;
$$;

create or replace function public.generate_vendor_activation_code(p_stand_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_stand public.stands%rowtype;
  v_plain text := '';
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_bytes bytea;
begin
  v_uid := (select auth.uid());
  if v_uid is null or not private.is_organizer() then
    raise exception 'invalid or expired code' using errcode = '42501';
  end if;

  select s.* into v_stand
  from public.stands as s
  where s.id = p_stand_id;

  if not found then
    raise exception 'invalid or expired code' using errcode = '42501';
  end if;

  v_bytes := extensions.gen_random_bytes(16);
  for v_i in 0..15 loop
    v_plain := v_plain
      || substr(v_alphabet, (get_byte(v_bytes, v_i) % 32) + 1, 1);
  end loop;

  insert into public.vendor_activation_codes (
    expo_id, stand_id, code_hash, status, expires_at, created_by
  ) values (
    v_stand.expo_id,
    v_stand.id,
    private.hash_activation_code(v_plain),
    'active',
    now() + interval '7 days',
    v_uid
  );

  return jsonb_build_object(
    'code',
    substr(v_plain, 1, 4) || '-' || substr(v_plain, 5, 4) || '-'
      || substr(v_plain, 9, 4) || '-' || substr(v_plain, 13, 4),
    'expires_at', now() + interval '7 days',
    'stand_id', v_stand.id,
    'expo_id', v_stand.expo_id
  );
end;
$$;

revoke all on function public.redeem_vendor_activation_code(text) from public;
revoke all on function public.redeem_vendor_activation_code(text) from anon;
revoke all on function public.revoke_vendor_membership(uuid) from public;
revoke all on function public.revoke_vendor_membership(uuid) from anon;
revoke all on function public.generate_vendor_activation_code(uuid) from public;
revoke all on function public.generate_vendor_activation_code(uuid) from anon;

grant execute on function public.redeem_vendor_activation_code(text) to authenticated;
grant execute on function public.revoke_vendor_membership(uuid) to authenticated;
grant execute on function public.generate_vendor_activation_code(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Offer / stand RLS: membership instead of vendor_id + profiles.role
-- ---------------------------------------------------------------------------

drop policy if exists stands_select_own_vendor on public.stands;
create policy stands_select_own_vendor
  on public.stands
  for select
  to authenticated
  using (private.has_active_membership(id));

drop policy if exists offers_insert_own_vendor on public.offers;
drop policy if exists offers_update_own_vendor on public.offers;
drop policy if exists offers_delete_own_vendor on public.offers;
drop policy if exists offers_select_own_vendor on public.offers;

create policy offers_select_own_vendor
  on public.offers
  for select
  to authenticated
  using (private.has_active_membership(stand_id));

create policy offers_insert_own_vendor
  on public.offers
  for insert
  to authenticated
  with check (
    private.has_active_membership(stand_id)
    and created_by = (select auth.uid())
  );

create policy offers_update_own_vendor
  on public.offers
  for update
  to authenticated
  using (
    private.has_active_membership(stand_id)
    and created_by = (select auth.uid())
  )
  with check (
    private.has_active_membership(stand_id)
    and created_by = (select auth.uid())
  );

create policy offers_delete_own_vendor
  on public.offers
  for delete
  to authenticated
  using (
    private.has_active_membership(stand_id)
    and created_by = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- RLS on new tables
-- ---------------------------------------------------------------------------

alter table public.vendor_activation_codes enable row level security;
alter table public.vendor_stand_memberships enable row level security;
alter table public.vendor_activation_audit enable row level security;

create policy vendor_activation_codes_select_organizer
  on public.vendor_activation_codes
  for select
  to authenticated
  using (private.is_organizer());

create policy vendor_activation_codes_insert_organizer
  on public.vendor_activation_codes
  for insert
  to authenticated
  with check (
    private.is_organizer()
    and created_by = (select auth.uid())
  );

create policy vendor_stand_memberships_select_own
  on public.vendor_stand_memberships
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy vendor_stand_memberships_select_organizer
  on public.vendor_stand_memberships
  for select
  to authenticated
  using (private.is_organizer());

create policy vendor_activation_audit_select_organizer
  on public.vendor_activation_audit
  for select
  to authenticated
  using (private.is_organizer());

revoke all on table public.vendor_activation_codes from anon;
revoke all on table public.vendor_stand_memberships from anon;
revoke all on table public.vendor_activation_audit from anon;

grant select, insert on table public.vendor_activation_codes to authenticated;
grant select on table public.vendor_stand_memberships to authenticated;
grant select on table public.vendor_activation_audit to authenticated;
