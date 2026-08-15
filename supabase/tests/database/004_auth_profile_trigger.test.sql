begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'bbbbbbbb-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'trigger-user@local.test',
  crypt('local-only', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"organizer"}'::jsonb,
  now(), now(), '', '', '', ''
);

select results_eq(
  $$select role from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  $$values ('visitor'::text)$$,
  'auth.users insert creates exactly a visitor profile and ignores user_metadata'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

-- Column privilege: authenticated has UPDATE(display_name) only.
-- WITH CHECK also freezes role via private.current_profile_role().
select throws_ok(
  $$update public.profiles
    set role = 'vendor'
    where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'authenticated user cannot set own role to vendor'
);

select throws_ok(
  $$update public.profiles
    set role = 'organizer'
    where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'authenticated user cannot set own role to organizer'
);

select * from finish();
rollback;
