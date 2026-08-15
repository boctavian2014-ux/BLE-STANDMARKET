-- Deterministic seed for local development / pgTAP seed checks
-- Fixed UUIDs so RLS tests can reference the same identities.

-- Auth users (password: password123 — local only)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'visitor@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'vendor-a@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'vendor-b@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'visitor@example.com'),
    'email',
    '11111111-1111-1111-1111-111111111111',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    jsonb_build_object('sub', '22222222-2222-2222-2222-222222222222', 'email', 'vendor-a@example.com'),
    'email',
    '22222222-2222-2222-2222-222222222222',
    now(),
    now(),
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    jsonb_build_object('sub', '33333333-3333-3333-3333-333333333333', 'email', 'vendor-b@example.com'),
    'email',
    '33333333-3333-3333-3333-333333333333',
    now(),
    now(),
    now()
  );

insert into public.profiles (id, role, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'visitor', 'Demo Visitor'),
  ('22222222-2222-2222-2222-222222222222', 'vendor', 'Vendor A'),
  ('33333333-3333-3333-3333-333333333333', 'vendor', 'Vendor B');

insert into public.expos (id, name, starts_at, ends_at) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'BLE Standmarket Demo Expo',
    now() - interval '1 day',
    now() + interval '3 days'
  );

-- 30 stands across Hall A/B/C and 10 zones (A1–A4, B1–B3, C1–C3)
insert into public.stands (id, expo_id, name, hall, zone, x_coord, y_coord, vendor_id, category)
values
  ('a0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand A1-01', 'Hall A', 'A1', 10, 10, '22222222-2222-2222-2222-222222222222', 'Electronics'),
  ('a0000002-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand A1-02', 'Hall A', 'A1', 20, 10, '22222222-2222-2222-2222-222222222222', 'Electronics'),
  ('a0000003-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand A1-03', 'Hall A', 'A1', 30, 10, '22222222-2222-2222-2222-222222222222', 'Fashion'),
  ('a0000004-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand A2-01', 'Hall A', 'A2', 10, 20, '22222222-2222-2222-2222-222222222222', 'Fashion'),
  ('a0000005-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand A2-02', 'Hall A', 'A2', 20, 20, '22222222-2222-2222-2222-222222222222', 'Home'),
  ('a0000006-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand A2-03', 'Hall A', 'A2', 30, 20, '33333333-3333-3333-3333-333333333333', 'Home'),
  ('a0000007-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand A3-01', 'Hall A', 'A3', 10, 30, '33333333-3333-3333-3333-333333333333', 'Food'),
  ('a0000008-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand A3-02', 'Hall A', 'A3', 20, 30, '33333333-3333-3333-3333-333333333333', 'Food'),
  ('a0000009-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand A3-03', 'Hall A', 'A3', 30, 30, '33333333-3333-3333-3333-333333333333', 'Electronics'),
  ('a0000010-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand A4-01', 'Hall A', 'A4', 10, 40, '22222222-2222-2222-2222-222222222222', 'Fashion'),
  ('a0000011-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand A4-02', 'Hall A', 'A4', 20, 40, '22222222-2222-2222-2222-222222222222', 'Home'),
  ('a0000012-0000-0000-0000-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand A4-03', 'Hall A', 'A4', 30, 40, '33333333-3333-3333-3333-333333333333', 'Food'),
  ('a0000013-0000-0000-0000-000000000013', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand B1-01', 'Hall B', 'B1', 50, 10, '22222222-2222-2222-2222-222222222222', 'Electronics'),
  ('a0000014-0000-0000-0000-000000000014', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand B1-02', 'Hall B', 'B1', 60, 10, '22222222-2222-2222-2222-222222222222', 'Fashion'),
  ('a0000015-0000-0000-0000-000000000015', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand B1-03', 'Hall B', 'B1', 70, 10, '33333333-3333-3333-3333-333333333333', 'Home'),
  ('a0000016-0000-0000-0000-000000000016', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand B2-01', 'Hall B', 'B2', 50, 20, '33333333-3333-3333-3333-333333333333', 'Food'),
  ('a0000017-0000-0000-0000-000000000017', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand B2-02', 'Hall B', 'B2', 60, 20, '22222222-2222-2222-2222-222222222222', 'Electronics'),
  ('a0000018-0000-0000-0000-000000000018', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand B2-03', 'Hall B', 'B2', 70, 20, '22222222-2222-2222-2222-222222222222', 'Fashion'),
  ('a0000019-0000-0000-0000-000000000019', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand B3-01', 'Hall B', 'B3', 50, 30, '33333333-3333-3333-3333-333333333333', 'Home'),
  ('a0000020-0000-0000-0000-000000000020', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand B3-02', 'Hall B', 'B3', 60, 30, '33333333-3333-3333-3333-333333333333', 'Food'),
  ('a0000021-0000-0000-0000-000000000021', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand B3-03', 'Hall B', 'B3', 70, 30, '22222222-2222-2222-2222-222222222222', 'Electronics'),
  ('a0000022-0000-0000-0000-000000000022', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand C1-01', 'Hall C', 'C1', 90, 10, '22222222-2222-2222-2222-222222222222', 'Fashion'),
  ('a0000023-0000-0000-0000-000000000023', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand C1-02', 'Hall C', 'C1', 100, 10, '33333333-3333-3333-3333-333333333333', 'Home'),
  ('a0000024-0000-0000-0000-000000000024', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand C1-03', 'Hall C', 'C1', 110, 10, '33333333-3333-3333-3333-333333333333', 'Food'),
  ('a0000025-0000-0000-0000-000000000025', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand C2-01', 'Hall C', 'C2', 90, 20, '22222222-2222-2222-2222-222222222222', 'Electronics'),
  ('a0000026-0000-0000-0000-000000000026', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand C2-02', 'Hall C', 'C2', 100, 20, '22222222-2222-2222-2222-222222222222', 'Fashion'),
  ('a0000027-0000-0000-0000-000000000027', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand C2-03', 'Hall C', 'C2', 110, 20, '33333333-3333-3333-3333-333333333333', 'Home'),
  ('a0000028-0000-0000-0000-000000000028', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand C3-01', 'Hall C', 'C3', 90, 30, '33333333-3333-3333-3333-333333333333', 'Food'),
  ('a0000029-0000-0000-0000-000000000029', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand C3-02', 'Hall C', 'C3', 100, 30, '22222222-2222-2222-2222-222222222222', 'Electronics'),
  ('a0000030-0000-0000-0000-000000000030', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Stand C3-03', 'Hall C', 'C3', 110, 30, '33333333-3333-3333-3333-333333333333', 'Fashion');

-- 5 active offers
insert into public.offers (
  id, stand_id, product_name, description, discount_percent, category, active, valid_from, valid_until
) values
  (
    'c0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    'Wireless Earbuds',
    'Noise-cancelling earbuds — demo offer',
    20,
    'Electronics',
    true,
    now() - interval '1 hour',
    now() + interval '2 days'
  ),
  (
    'c0000002-0000-0000-0000-000000000002',
    'a0000004-0000-0000-0000-000000000004',
    'Summer Jacket',
    'Light jacket for the season',
    15,
    'Fashion',
    true,
    now() - interval '1 hour',
    now() + interval '2 days'
  ),
  (
    'c0000003-0000-0000-0000-000000000003',
    'a0000007-0000-0000-0000-000000000007',
    'Artisan Coffee Pack',
    'Local roast sampler',
    10,
    'Food',
    true,
    now() - interval '1 hour',
    now() + interval '2 days'
  ),
  (
    'c0000004-0000-0000-0000-000000000004',
    'a0000006-0000-0000-0000-000000000006',
    'Smart Lamp',
    'RGB desk lamp',
    25,
    'Home',
    true,
    now() - interval '1 hour',
    now() + interval '2 days'
  ),
  (
    'c0000005-0000-0000-0000-000000000005',
    'a0000013-0000-0000-0000-000000000013',
    'USB-C Hub',
    '7-in-1 hub',
    30,
    'Electronics',
    true,
    now() - interval '1 hour',
    now() + interval '2 days'
  );

-- Beacons for stands that have offers (useful for later BLE work)
insert into public.beacons (
  id, expo_id, uuid, major, minor, stand_id, hall, zone, x_coord, y_coord, tx_power
) values
  (
    'b0000001-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0',
    1, 1,
    'a0000001-0000-0000-0000-000000000001',
    'Hall A', 'A1', 10, 10, -59
  ),
  (
    'b0000002-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0',
    1, 2,
    'a0000004-0000-0000-0000-000000000004',
    'Hall A', 'A2', 10, 20, -59
  ),
  (
    'b0000003-0000-0000-0000-000000000003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0',
    1, 3,
    'a0000007-0000-0000-0000-000000000007',
    'Hall A', 'A3', 10, 30, -59
  ),
  (
    'b0000004-0000-0000-0000-000000000004',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0',
    1, 4,
    'a0000006-0000-0000-0000-000000000006',
    'Hall A', 'A2', 30, 20, -59
  ),
  (
    'b0000005-0000-0000-0000-000000000005',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0',
    1, 5,
    'a0000013-0000-0000-0000-000000000013',
    'Hall B', 'B1', 50, 10, -59
  );

-- Sample visitor interest
insert into public.user_interests (id, user_id, expo_id, category) values
  (
    'd0000001-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Electronics'
  );
