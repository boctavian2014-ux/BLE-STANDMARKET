begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-0000-0000-0000-0000000000aa',
    'authenticated', 'authenticated', 'redeem-a@local.test',
    crypt('local-only', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-0000-0000-0000-0000000000bb',
    'authenticated', 'authenticated', 'redeem-b@local.test',
    crypt('local-only', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

insert into public.vendor_activation_codes (
  id, expo_id, stand_id, code_hash, status, max_uses, used_count, expires_at, created_by
) values
  (
    '71111111-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000020',
    private.hash_activation_code(private.normalize_activation_code('TEST-ACTV-CODE-000A')),
    'active', 1, 0, now() + interval '2 days',
    'aaaaaaaa-0000-0000-0000-000000000001'
  ),
  (
    '71111111-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000030',
    private.hash_activation_code(private.normalize_activation_code('TEST-EXPR-CODE-000B')),
    'active', 1, 0, now() - interval '1 hour',
    'aaaaaaaa-0000-0000-0000-000000000001'
  ),
  (
    '71111111-0000-0000-0000-000000000003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000030',
    private.hash_activation_code(private.normalize_activation_code('TEST-REVK-CODE-000C')),
    'revoked', 1, 0, now() + interval '2 days',
    'aaaaaaaa-0000-0000-0000-000000000001'
  ),
  (
    '71111111-0000-0000-0000-000000000004',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000030',
    private.hash_activation_code(private.normalize_activation_code('TEST-USED-CODE-000D')),
    'consumed', 1, 1, now() + interval '2 days',
    'aaaaaaaa-0000-0000-0000-000000000001'
  ),
  (
    '71111111-0000-0000-0000-000000000005',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000020',
    private.hash_activation_code(private.normalize_activation_code('TEST-RATE-CODE-000E')),
    'active', 1, 0, now() + interval '2 days',
    'aaaaaaaa-0000-0000-0000-000000000001'
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
  $$select public.redeem_vendor_activation_code('TEST-ACTV-CODE-000A')$$,
  'valid unused code redeems'
);

select results_eq(
  $$select count(*)::bigint
    from public.vendor_stand_memberships
    where user_id = 'bbbbbbbb-0000-0000-0000-0000000000aa'
      and stand_id = '10000000-0000-0000-0000-000000000020'
      and status = 'active'$$,
  array[1::bigint],
  'valid redeem creates exactly one membership on the code stand'
);

select results_eq(
  $$select public.redeem_vendor_activation_code('TEST-EXPR-CODE-000B')->>'error'$$,
  $$values ('invalid or expired code')$$,
  'expired code is rejected'
);

select results_eq(
  $$select public.redeem_vendor_activation_code('TEST-REVK-CODE-000C')->>'error'$$,
  $$values ('invalid or expired code')$$,
  'revoked code is rejected'
);

select results_eq(
  $$select public.redeem_vendor_activation_code('TEST-USED-CODE-000D')->>'error'$$,
  $$values ('invalid or expired code')$$,
  'consumed code is rejected'
);

reset role;
select ok(
  (
    select count(*) filter (where event_type = 'attempt_expired') >= 1
       and count(*) filter (where event_type = 'attempt_revoked') >= 1
       and count(*) filter (where event_type = 'attempt_reused') >= 1
    from public.vendor_activation_audit
    where actor_id = 'bbbbbbbb-0000-0000-0000-0000000000aa'
  ),
  'failures log expired / revoked / reused without exposing plaintext'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-0000000000bb', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-0000000000bb","role":"authenticated"}',
  true
);

-- Five invalid attempts (not asserted) so the sixth can hit the 15-minute cap.
-- Redeem returns an error object; it does not RAISE (audit must persist).
do $$
declare
  v text;
begin
  foreach v in array array[
    'ZZZZZZZZZZZZZZZZ',
    'YYYYYYYYYYYYYYYY',
    'XXXXXXXXXXXXXXXX',
    'WWWWWWWWWWWWWWWW',
    'VVVVVVVVVVVVVVVV'
  ] loop
    perform public.redeem_vendor_activation_code(v);
  end loop;
end;
$$;

select results_eq(
  $$select public.redeem_vendor_activation_code('TEST-RATE-CODE-000E')->>'error'$$,
  $$values ('invalid or expired code')$$,
  'sixth attempt is rate limited even if the code is valid'
);

reset role;
select ok(
  (
    select count(*) >= 1
    from public.vendor_activation_audit
    where actor_id = 'bbbbbbbb-0000-0000-0000-0000000000bb'
      and event_type = 'attempt_rate_limited'
  ),
  'sixth attempt logs attempt_rate_limited'
);

select results_eq(
  $$select count(*)::bigint
    from public.vendor_stand_memberships
    where user_id = 'bbbbbbbb-0000-0000-0000-0000000000bb'
      and stand_id = '10000000-0000-0000-0000-000000000020'$$,
  array[0::bigint],
  'rate-limited actor has no membership on the valid code stand'
);

select results_eq(
  $$select used_count, status
    from public.vendor_activation_codes
    where id = '71111111-0000-0000-0000-000000000005'$$,
  $$values (0, 'active')$$,
  'valid code used_count and status stay unchanged after rate limit'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-0000000000aa', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-0000000000aa","role":"authenticated"}',
  true
);

select results_eq(
  'select count(*)::bigint from public.vendor_activation_codes',
  array[0::bigint],
  'non-organizer authenticated cannot select activation codes'
);

select * from finish();
rollback;
