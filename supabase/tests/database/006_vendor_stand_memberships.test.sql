begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

-- Concurrent redeem cannot be two live connections in pgTAP. This file
-- simulates the race sequentially: first redeem consumes max_uses=1,
-- second redeem of the same code must not create a second membership.
-- FOR UPDATE in the RPC is the production guard; unique(stand_id, user_id)
-- is the second guard.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-0000-0000-0000-0000000000aa',
    'authenticated', 'authenticated', 'member-a@local.test',
    crypt('local-only', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'org-local@local.test',
    crypt('local-only', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

-- Trigger created visitor; promote organizer out of band (service_role path).
update public.profiles
set role = 'organizer'
where id = 'cccccccc-0000-0000-0000-000000000001';

insert into public.vendor_activation_codes (
  expo_id, stand_id, code_hash, status, max_uses, used_count, expires_at, created_by
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '10000000-0000-0000-0000-000000000020',
  private.hash_activation_code(private.normalize_activation_code('TEST-ONCE-CODE-000F')),
  'active', 1, 0, now() + interval '2 days',
  'aaaaaaaa-0000-0000-0000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-0000000000aa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-0000000000aa","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.redeem_vendor_activation_code('TEST-ONCE-CODE-000F')$$,
  'first redeem consumes the single-use code'
);

select results_eq(
  $$select public.redeem_vendor_activation_code('TEST-ONCE-CODE-000F')->>'error'$$,
  $$values ('invalid or expired code')$$,
  'second redeem of the same code is rejected'
);

select results_eq(
  $$select count(*)::bigint
    from public.vendor_stand_memberships
    where stand_id = '10000000-0000-0000-0000-000000000020'
      and user_id = 'cccccccc-0000-0000-0000-0000000000aa'$$,
  array[1::bigint],
  'exactly one membership exists after sequential double redeem'
);

select throws_ok(
  $$insert into public.vendor_stand_memberships (expo_id, stand_id, user_id)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '10000000-0000-0000-0000-000000000030',
      'cccccccc-0000-0000-0000-0000000000aa'
    )$$,
  '42501',
  null,
  'visitor cannot insert memberships directly'
);

select throws_ok(
  $$update public.vendor_stand_memberships
    set status = 'revoked'
    where user_id = 'cccccccc-0000-0000-0000-0000000000aa'$$,
  '42501',
  null,
  'visitor cannot update memberships directly'
);

select throws_ok(
  $$delete from public.vendor_stand_memberships
    where user_id = 'cccccccc-0000-0000-0000-0000000000aa'$$,
  '42501',
  null,
  'visitor cannot delete memberships directly'
);

reset role;
-- Organizer revokes via RPC, then vendor cannot insert offers.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.revoke_vendor_membership(
      (select id from public.vendor_stand_memberships
       where user_id = 'cccccccc-0000-0000-0000-0000000000aa'
         and stand_id = '10000000-0000-0000-0000-000000000020')
    )$$,
  'organizer can revoke membership via RPC'
);

select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-0000000000aa', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-0000000000aa","role":"authenticated"}',
  true
);

select throws_ok(
  $$insert into public.offers (stand_id, created_by, product_name, category, status)
    values (
      '10000000-0000-0000-0000-000000000020',
      'cccccccc-0000-0000-0000-0000000000aa',
      'Should fail',
      'Fashion',
      'draft'
    )$$,
  '42501',
  null,
  'revoked member cannot insert offers on that stand'
);

select * from finish();
rollback;
