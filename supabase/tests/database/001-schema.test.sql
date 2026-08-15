begin;
select plan(20);

select has_table('public', 'expos', 'expos table exists');
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'stands', 'stands table exists');
select has_table('public', 'beacons', 'beacons table exists');
select has_table('public', 'offers', 'offers table exists');
select has_table('public', 'user_interests', 'user_interests table exists');
select has_table('public', 'notifications_log', 'notifications_log table exists');
select has_table('public', 'redemptions', 'redemptions table exists');

select has_column('public', 'beacons', 'uuid', 'beacons.uuid exists');
select has_column('public', 'beacons', 'major', 'beacons.major exists');
select has_column('public', 'beacons', 'minor', 'beacons.minor exists');
select has_column('public', 'offers', 'active', 'offers.active exists');
select has_column('public', 'redemptions', 'redemption_code', 'redemptions.redemption_code exists');

select col_is_unique('public', 'redemptions', 'redemption_code', 'redemption_code is unique');

select has_type('public', 'notification_type', 'notification_type enum exists');
select has_type('public', 'profile_role', 'profile_role enum exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.stands'::regclass),
  'RLS enabled on stands'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.offers'::regclass),
  'RLS enabled on offers'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_interests'::regclass),
  'RLS enabled on user_interests'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.notifications_log'::regclass),
  'RLS enabled on notifications_log'
);

select * from finish();
rollback;
