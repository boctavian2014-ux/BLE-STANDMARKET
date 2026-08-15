begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

select results_eq(
  'select count(*)::bigint from public.expos',
  array[1::bigint],
  'seed has exactly 1 expo'
);

select results_eq(
  'select count(distinct hall)::bigint from public.stands',
  array[3::bigint],
  'seed has 3 halls'
);

select results_eq(
  'select count(distinct zone)::bigint from public.stands',
  array[10::bigint],
  'seed has 10 zones'
);

select results_eq(
  'select count(*)::bigint from public.stands',
  array[30::bigint],
  'seed has 30 stands'
);

select ok(
  (
    select count(*) >= 10
    from public.beacons
    where is_active = true
      and stand_id is null
  ),
  'seed has at least 10 active zonal beacons'
);

select ok(
  (select count(*) >= 15 from public.offers),
  'seed has at least 15 offers'
);

select ok(
  (
    select count(*) filter (where status = 'active') >= 1
       and count(*) filter (where status = 'paused') >= 1
       and count(*) filter (where status = 'draft') >= 1
    from public.offers
  ),
  'seed offers include active, paused, and draft'
);

select * from finish();
rollback;
