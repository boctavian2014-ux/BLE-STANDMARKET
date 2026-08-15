begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-0000-0000-0000-0000000000aa',
    'authenticated', 'authenticated', 'offer-vendor@local.test',
    crypt('local-only', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'offer-org@local.test',
    crypt('local-only', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

update public.profiles
set role = 'organizer'
where id = 'dddddddd-0000-0000-0000-000000000001';

insert into public.vendor_activation_codes (
  expo_id, stand_id, code_hash, status, expires_at, created_by
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '10000000-0000-0000-0000-000000000020',
  private.hash_activation_code(private.normalize_activation_code('TEST-OFFR-CODE-000G')),
  'active', now() + interval '2 days',
  'aaaaaaaa-0000-0000-0000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-0000000000aa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-0000000000aa","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.redeem_vendor_activation_code('TEST-OFFR-CODE-000G')$$,
  'vendor activates stand A (B-10)'
);

select lives_ok(
  $$insert into public.offers (
      id, stand_id, created_by, product_name, category, discount_percent, status
    ) values (
      'eeeeeeee-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000020',
      'dddddddd-0000-0000-0000-0000000000aa',
      'Membership offer',
      'Fashion',
      12,
      'active'
    )$$,
  'active member can insert an offer on stand A'
);

select lives_ok(
  $$update public.offers
    set product_name = 'Membership offer updated'
    where id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  'active member can update an offer on stand A'
);

select throws_ok(
  $$insert into public.offers (stand_id, created_by, product_name, category, status)
    values (
      '10000000-0000-0000-0000-000000000006',
      'dddddddd-0000-0000-0000-0000000000aa',
      'Other stand',
      'Home',
      'draft'
    )$$,
  '42501',
  null,
  'member of stand A cannot insert an offer on stand B'
);

select set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.revoke_vendor_membership(
      (select id from public.vendor_stand_memberships
       where user_id = 'dddddddd-0000-0000-0000-0000000000aa'
         and stand_id = '10000000-0000-0000-0000-000000000020')
    )$$,
  'organizer revokes stand A membership'
);

select set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-0000000000aa', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-0000000000aa","role":"authenticated"}',
  true
);

select throws_ok(
  $$insert into public.offers (stand_id, created_by, product_name, category, status)
    values (
      '10000000-0000-0000-0000-000000000020',
      'dddddddd-0000-0000-0000-0000000000aa',
      'After revoke',
      'Fashion',
      'draft'
    )$$,
  '42501',
  null,
  'revoked member cannot insert new offers on stand A'
);

set local role anon;

select results_eq(
  $$select count(*)::bigint
    from public.offers
    where id = 'eeeeeeee-0000-0000-0000-000000000001'$$,
  array[1::bigint],
  'existing active offer stays publicly visible after membership revoke'
);

select * from finish();
rollback;
