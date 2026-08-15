begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

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
  );

select ok(
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'offers'
  ),
  'realtime publication includes public.offers'
);

select ok(
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notification_events'
  ),
  'realtime publication includes public.notification_events'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000aa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000aa","role":"authenticated"}',
  true
);

select lives_ok(
  $$insert into public.analytics_events (
      id, event_type, user_id, offer_id, stand_id, expo_id
    ) values (
      '90000000-0000-0000-0000-000000000001',
      'offer_view',
      'aaaaaaaa-0000-0000-0000-0000000000aa',
      '30000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    )$$,
  'authenticated can insert own analytics_events'
);

select throws_ok(
  $$insert into public.analytics_events (
      event_type, user_id, stand_id, expo_id
    ) values (
      'stand_view',
      'aaaaaaaa-0000-0000-0000-00000000000a',
      '10000000-0000-0000-0000-000000000001',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    )$$,
  '42501',
  null,
  'authenticated cannot insert analytics_events for another user'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000a', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}',
  true
);

select results_eq(
  $$select count(*)::bigint
    from public.analytics_events
    where id = '90000000-0000-0000-0000-000000000001'$$,
  array[1::bigint],
  'vendor can select analytics_events for stands with active membership'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000b', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-00000000000b","role":"authenticated"}',
  true
);

select results_eq(
  $$select count(*)::bigint
    from public.analytics_events
    where id = '90000000-0000-0000-0000-000000000001'$$,
  array[0::bigint],
  'vendor cannot select analytics_events for other stands'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000a', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}',
  true
);

select lives_ok(
  $$insert into public.analytics_events (
      event_type, user_id, stand_id, expo_id
    ) values (
      'stand_view',
      'aaaaaaaa-0000-0000-0000-00000000000a',
      '10000000-0000-0000-0000-000000000001',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    )$$,
  'vendor can insert own stand_view events'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.analytics_events'::regclass),
  'RLS enabled on analytics_events'
);

select * from finish();
rollback;
