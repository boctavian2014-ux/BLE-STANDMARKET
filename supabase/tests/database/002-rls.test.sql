begin;
select plan(10);

-- ---------------------------------------------------------------------------
-- anon: public reads ok, private tables blocked
-- ---------------------------------------------------------------------------
set local role anon;
reset request.jwt.claim.sub;

select results_eq(
  'select count(*)::bigint from public.stands',
  array[30::bigint],
  'anon can read stands'
);

select results_eq(
  'select count(*)::bigint from public.beacons',
  array[5::bigint],
  'anon can read beacons'
);

select throws_ok(
  'select count(*) from public.user_interests',
  '42501',
  null,
  'anon cannot read user_interests'
);

-- ---------------------------------------------------------------------------
-- visitor A: own interests / notifications only
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set local request.jwt.claim.role = 'authenticated';

select results_eq(
  'select count(*)::bigint from public.user_interests',
  array[1::bigint],
  'visitor sees only own interests'
);

select lives_ok(
  $$insert into public.notifications_log (user_id, offer_id, stand_id, notification_type)
    values (
      '11111111-1111-1111-1111-111111111111',
      'c0000001-0000-0000-0000-000000000001',
      'a0000001-0000-0000-0000-000000000001',
      'stand'
    )$$,
  'visitor can insert own notification log'
);

select results_eq(
  'select count(*)::bigint from public.notifications_log',
  array[1::bigint],
  'visitor sees own notifications'
);

-- visitor cannot update offers
select results_ne(
  $$update public.offers
    set discount_percent = 99
    where id = 'c0000001-0000-0000-0000-000000000001'
    returning 1$$,
  $$values (1)$$,
  'visitor cannot update offers'
);

-- ---------------------------------------------------------------------------
-- vendor A: can write offers on own stand, not vendor B's stand
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select lives_ok(
  $$insert into public.offers (stand_id, product_name, discount_percent, category, active)
    values (
      'a0000001-0000-0000-0000-000000000001',
      'Vendor A Extra Offer',
      5,
      'Electronics',
      true
    )$$,
  'vendor A can insert offer on own stand'
);

select throws_ok(
  $$insert into public.offers (stand_id, product_name, discount_percent, category, active)
    values (
      'a0000006-0000-0000-0000-000000000006',
      'Hacked Offer',
      50,
      'Home',
      true
    )$$,
  '42501',
  null,
  'vendor A cannot insert offer on vendor B stand'
);

-- vendor B cannot update vendor A offer
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select results_ne(
  $$update public.offers
    set product_name = 'Stolen'
    where id = 'c0000001-0000-0000-0000-000000000001'
    returning 1$$,
  $$values (1)$$,
  'vendor B cannot update vendor A offer'
);

select * from finish();
rollback;
