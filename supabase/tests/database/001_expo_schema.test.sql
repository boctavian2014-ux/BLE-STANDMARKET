begin;
create extension if not exists pgtap with schema extensions;

select plan(25);

select has_table('public', 'expos', 'expos exists');
select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'stands', 'stands exists');
select has_table('public', 'beacons', 'beacons exists');
select has_table('public', 'offers', 'offers exists');
select has_table('public', 'user_interests', 'user_interests exists');
select has_table('public', 'offer_redemptions', 'offer_redemptions exists');
select has_table('public', 'notification_events', 'notification_events exists');

select ok((select relrowsecurity from pg_class where oid = 'public.expos'::regclass), 'RLS on expos');
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'RLS on profiles');
select ok((select relrowsecurity from pg_class where oid = 'public.stands'::regclass), 'RLS on stands');
select ok((select relrowsecurity from pg_class where oid = 'public.beacons'::regclass), 'RLS on beacons');
select ok((select relrowsecurity from pg_class where oid = 'public.offers'::regclass), 'RLS on offers');
select ok((select relrowsecurity from pg_class where oid = 'public.user_interests'::regclass), 'RLS on user_interests');
select ok((select relrowsecurity from pg_class where oid = 'public.offer_redemptions'::regclass), 'RLS on offer_redemptions');
select ok((select relrowsecurity from pg_class where oid = 'public.notification_events'::regclass), 'RLS on notification_events');

select col_is_unique('public', 'stands', array['expo_id', 'code'], 'stands unique (expo_id, code)');
select col_is_unique('public', 'beacons', array['expo_id', 'beacon_uuid', 'major', 'minor'], 'beacons unique identity');
select col_is_unique('public', 'user_interests', array['user_id', 'expo_id', 'category'], 'user_interests unique triple');
select col_is_unique('public', 'offer_redemptions', 'redemption_code', 'redemption_code unique');
select col_is_unique('public', 'offer_redemptions', array['offer_id', 'user_id'], 'one redemption per offer/user');

select throws_ok(
  $$insert into public.offers (stand_id, created_by, product_name, category, discount_percent, status)
    values (
      '10000000-0000-0000-0000-000000000001',
      'aaaaaaaa-0000-0000-0000-00000000000a',
      'Bad status',
      'Electronics',
      10,
      'live'
    )$$,
  '23514',
  null,
  'invalid offer status is rejected'
);

select throws_ok(
  $$insert into public.offers (stand_id, created_by, product_name, category, discount_percent, status)
    values (
      '10000000-0000-0000-0000-000000000001',
      'aaaaaaaa-0000-0000-0000-00000000000a',
      'Zero discount',
      'Electronics',
      0,
      'draft'
    )$$,
  '23514',
  null,
  'discount 0 is rejected'
);

select throws_ok(
  $$insert into public.offers (stand_id, created_by, product_name, category, discount_percent, status)
    values (
      '10000000-0000-0000-0000-000000000001',
      'aaaaaaaa-0000-0000-0000-00000000000a',
      'Over discount',
      'Electronics',
      101,
      'draft'
    )$$,
  '23514',
  null,
  'discount over 100 is rejected'
);

select throws_ok(
  $$insert into public.offers (
      stand_id, created_by, product_name, category, status, valid_from, valid_until
    ) values (
      '10000000-0000-0000-0000-000000000001',
      'aaaaaaaa-0000-0000-0000-00000000000a',
      'Bad window',
      'Electronics',
      'draft',
      now() + interval '2 days',
      now() + interval '1 day'
    )$$,
  '23514',
  null,
  'valid_until must be after valid_from'
);

select * from finish();
rollback;
