begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

select has_column(
  'public',
  'offers',
  'image_url',
  'offers.image_url exists'
);

select col_is_null(
  'public',
  'offers',
  'image_url',
  'offers.image_url is nullable'
);

select ok(
  exists(
    select 1
    from storage.buckets
    where id = 'offer-images'
      and public = true
  ),
  'offer-images bucket exists and is public'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-0000-0000-0000-0000000000aa',
    'authenticated', 'authenticated', 'img-vendor-a@local.test',
    crypt('local-only', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-0000-0000-0000-0000000000bb',
    'authenticated', 'authenticated', 'img-vendor-b@local.test',
    crypt('local-only', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.vendor_stand_memberships (
  expo_id, stand_id, user_id, status
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000020',
    'bbbbbbbb-0000-0000-0000-0000000000aa',
    'active'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000006',
    'bbbbbbbb-0000-0000-0000-0000000000bb',
    'active'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-0000000000aa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-0000000000aa","role":"authenticated"}',
  true
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'offer-images',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/10000000-0000-0000-0000-000000000020/eeeeeeee-1111-0000-0000-000000000001.jpg'
    )$$,
  'vendor can INSERT on their own stand path'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'offer-images',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/10000000-0000-0000-0000-000000000006/eeeeeeee-1111-0000-0000-000000000002.jpg'
    )$$,
  '42501',
  null,
  'vendor cannot INSERT on another stand path'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select results_eq(
  $$select count(*)::bigint
    from storage.objects
    where bucket_id = 'offer-images'
      and name = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/10000000-0000-0000-0000-000000000020/eeeeeeee-1111-0000-0000-000000000001.jpg'$$,
  array[1::bigint],
  'anon can SELECT objects in offer-images'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'offer-images',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/10000000-0000-0000-0000-000000000020/eeeeeeee-1111-0000-0000-000000000099.jpg'
    )$$,
  '42501',
  null,
  'anon cannot INSERT into offer-images'
);

select * from finish();
rollback;
