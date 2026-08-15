begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

-- Attach documented seed profile IDs to auth.users so auth.uid() resolves.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-00000000000a',
    'authenticated', 'authenticated', 'vendor-a@local.test',
    crypt('local-only', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-00000000000b',
    'authenticated', 'authenticated', 'vendor-b@local.test',
    crypt('local-only', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-0000000000aa',
    'authenticated', 'authenticated', 'visitor-a@local.test',
    crypt('local-only', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-0000000000bb',
    'authenticated', 'authenticated', 'visitor-b@local.test',
    crypt('local-only', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

-- ---------------------------------------------------------------------------
-- Anonymous: active catalog only, no writes
-- ---------------------------------------------------------------------------
set local role anon;

select results_eq(
  'select count(*)::bigint from public.expos',
  array[1::bigint],
  'anon reads the currently running expo'
);

select results_eq(
  $$select count(*)::bigint from public.stands where code = 'A-10'$$,
  array[0::bigint],
  'anon cannot see inactive stands'
);

select results_eq(
  $$select count(*)::bigint from public.beacons where minor = 12$$,
  array[0::bigint],
  'anon cannot see inactive beacons'
);

select throws_ok(
  $$insert into public.stands (
      expo_id, code, name, hall, zone, x_coord, y_coord
    ) values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'Z-99', 'Nope', 'Hall A', 'A1', 1, 1
    )$$,
  '42501',
  null,
  'anon cannot insert stands'
);

select throws_ok(
  $$update public.stands set name = 'Hacked' where code = 'A-01'$$,
  '42501',
  null,
  'anon cannot update stands'
);

select throws_ok(
  $$delete from public.stands where code = 'A-01'$$,
  '42501',
  null,
  'anon cannot delete stands'
);

-- anon has no SELECT grant on user_interests (REVOKE ALL), so this is 42501, not an empty RLS set
select throws_ok(
  'select count(*) from public.user_interests',
  '42501',
  null,
  'anon cannot read user_interests'
);

-- ---------------------------------------------------------------------------
-- Visitor A vs Visitor B
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000aa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000aa","role":"authenticated"}',
  true
);

select results_eq(
  'select count(*)::bigint from public.user_interests',
  array[1::bigint],
  'visitor A sees only own interests'
);

-- visitor has UPDATE grant on offers, but no vendor USING policy → 0 rows, not 42501
select is_empty(
  $$update public.offers
    set discount_percent = 99
    returning id$$,
  'visitor cannot update any offers'
);

select is_empty(
  $$delete from public.user_interests
    where user_id = 'aaaaaaaa-0000-0000-0000-0000000000bb'
    returning id$$,
  'visitor A cannot delete visitor B interests'
);

select results_eq(
  'select count(*)::bigint from public.offer_redemptions',
  array[1::bigint],
  'visitor A sees only own redemptions'
);

select throws_ok(
  $$update public.offer_redemptions
    set redeemed_at = now()
    where user_id = 'aaaaaaaa-0000-0000-0000-0000000000aa'$$,
  '42501',
  null,
  'visitor cannot modify redeemed_at'
);

select lives_ok(
  $$insert into public.notification_events (user_id, expo_id, event_type)
    values (
      'aaaaaaaa-0000-0000-0000-0000000000aa',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'qr_scanned'
    )$$,
  'visitor A can insert own notification event'
);

select throws_ok(
  $$insert into public.notification_events (user_id, expo_id, event_type)
    values (
      'aaaaaaaa-0000-0000-0000-0000000000bb',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'qr_scanned'
    )$$,
  '42501',
  null,
  'visitor A cannot insert an event for visitor B'
);

select results_eq(
  'select count(*)::bigint from public.notification_events',
  array[2::bigint],
  'visitor A cannot read visitor B notification events'
);

-- ---------------------------------------------------------------------------
-- Vendor A vs Vendor B
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000a', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}',
  true
);

select lives_ok(
  $$insert into public.offers (stand_id, created_by, product_name, category, discount_percent, status)
    values (
      '10000000-0000-0000-0000-000000000001',
      'aaaaaaaa-0000-0000-0000-00000000000a',
      'Vendor A extra',
      'Electronics',
      6,
      'draft'
    )$$,
  'vendor A can create an offer on own stand'
);

select throws_ok(
  $$insert into public.offers (stand_id, created_by, product_name, category, discount_percent, status)
    values (
      '10000000-0000-0000-0000-000000000006',
      'aaaaaaaa-0000-0000-0000-00000000000a',
      'Stolen stand offer',
      'Home',
      6,
      'draft'
    )$$,
  '42501',
  null,
  'vendor A cannot create an offer on vendor B stand'
);

select is_empty(
  $$update public.offers
    set product_name = 'Stolen'
    where id = '30000000-0000-0000-0000-000000000004'
    returning id$$,
  'vendor A cannot update vendor B offer'
);

select is_empty(
  $$delete from public.offers
    where id = '30000000-0000-0000-0000-000000000004'
    returning id$$,
  'vendor A cannot delete vendor B offer'
);

select throws_ok(
  $$update public.offers
    set stand_id = '10000000-0000-0000-0000-000000000002'
    where id = '30000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'vendor cannot change stand_id after insert'
);

select throws_ok(
  $$update public.offers
    set created_by = 'aaaaaaaa-0000-0000-0000-00000000000b'
    where id = '30000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'vendor cannot change created_by after insert'
);

select * from finish();
rollback;
