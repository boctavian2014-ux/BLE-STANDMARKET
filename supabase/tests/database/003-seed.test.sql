begin;
select plan(5);

select results_eq(
  'select count(*)::bigint from public.expos',
  array[1::bigint],
  'seed has 1 expo'
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

select results_eq(
  'select count(*)::bigint from public.offers where active = true',
  array[5::bigint],
  'seed has 5 active offers'
);

select * from finish();
rollback;
