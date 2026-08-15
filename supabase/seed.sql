-- Local catalog seed. Does not insert into auth.users.
-- Demo profile IDs are placeholders (FK to auth.users is deferred via replica role).
-- Tests attach real JWT subjects with the same UUIDs. See docs/database/EXPO_FOUNDATION.md.

-- Documented local UUIDs
-- expo:      aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- organizer: aaaaaaaa-0000-0000-0000-000000000001
-- vendor_a:  aaaaaaaa-0000-0000-0000-00000000000a
-- vendor_b:  aaaaaaaa-0000-0000-0000-00000000000b
-- visitor_a: aaaaaaaa-0000-0000-0000-0000000000aa
-- visitor_b: aaaaaaaa-0000-0000-0000-0000000000bb

insert into public.expos (id, slug, name, starts_at, ends_at)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'demo-expo',
  'BLE Standmarket Demo Expo',
  now() - interval '1 day',
  now() + interval '7 days'
);

-- Placeholder profiles for vendor_id / created_by only. Not Auth users.
set session_replication_role = replica;

insert into public.profiles (id, role, display_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'organizer', 'Demo Organizer'),
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'vendor', 'Vendor A'),
  ('aaaaaaaa-0000-0000-0000-00000000000b', 'vendor', 'Vendor B'),
  ('aaaaaaaa-0000-0000-0000-0000000000aa', 'visitor', 'Visitor A'),
  ('aaaaaaaa-0000-0000-0000-0000000000bb', 'visitor', 'Visitor B');

-- 30 stands / 3 halls / 10 zones. vendor_id set on a subset for RLS tests.
insert into public.stands (
  id, expo_id, vendor_id, code, name, hall, zone, x_coord, y_coord, category, is_active
) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'A-01', 'Stand A-01', 'Hall A', 'A1', 10, 10, 'Electronics', true),
  ('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'A-02', 'Stand A-02', 'Hall A', 'A1', 20, 10, 'Electronics', true),
  ('10000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'A-03', 'Stand A-03', 'Hall A', 'A1', 30, 10, 'Fashion', true),
  ('10000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'A-04', 'Stand A-04', 'Hall A', 'A2', 10, 20, 'Fashion', true),
  ('10000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'A-05', 'Stand A-05', 'Hall A', 'A2', 20, 20, 'Home', true),
  ('10000000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000b', 'A-06', 'Stand A-06', 'Hall A', 'A2', 30, 20, 'Home', true),
  ('10000000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000b', 'A-07', 'Stand A-07', 'Hall A', 'A3', 10, 30, 'Food', true),
  ('10000000-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000b', 'A-08', 'Stand A-08', 'Hall A', 'A3', 20, 30, 'Food', true),
  ('10000000-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000b', 'A-09', 'Stand A-09', 'Hall A', 'A3', 30, 30, 'Electronics', true),
  ('10000000-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'A-10', 'Stand A-10', 'Hall A', 'A4', 10, 40, 'Fashion', false),
  ('10000000-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'B-01', 'Stand B-01', 'Hall B', 'B1', 50, 10, 'Electronics', true),
  ('10000000-0000-0000-0000-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'B-02', 'Stand B-02', 'Hall B', 'B1', 60, 10, 'Fashion', true),
  ('10000000-0000-0000-0000-000000000013', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000b', 'B-03', 'Stand B-03', 'Hall B', 'B1', 70, 10, 'Home', true),
  ('10000000-0000-0000-0000-000000000014', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000b', 'B-04', 'Stand B-04', 'Hall B', 'B2', 50, 20, 'Food', true),
  ('10000000-0000-0000-0000-000000000015', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'B-05', 'Stand B-05', 'Hall B', 'B2', 60, 20, 'Electronics', true),
  ('10000000-0000-0000-0000-000000000016', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'B-06', 'Stand B-06', 'Hall B', 'B2', 70, 20, 'Fashion', true),
  ('10000000-0000-0000-0000-000000000017', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000b', 'B-07', 'Stand B-07', 'Hall B', 'B3', 50, 30, 'Home', true),
  ('10000000-0000-0000-0000-000000000018', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000b', 'B-08', 'Stand B-08', 'Hall B', 'B3', 60, 30, 'Food', true),
  ('10000000-0000-0000-0000-000000000019', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'B-09', 'Stand B-09', 'Hall B', 'B3', 70, 30, 'Electronics', true),
  ('10000000-0000-0000-0000-000000000020', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'B-10', 'Stand B-10', 'Hall B', 'B3', 80, 30, 'Fashion', true),
  ('10000000-0000-0000-0000-000000000021', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'C-01', 'Stand C-01', 'Hall C', 'C1', 90, 10, 'Fashion', true),
  ('10000000-0000-0000-0000-000000000022', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000b', 'C-02', 'Stand C-02', 'Hall C', 'C1', 100, 10, 'Home', true),
  ('10000000-0000-0000-0000-000000000023', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000b', 'C-03', 'Stand C-03', 'Hall C', 'C1', 110, 10, 'Food', true),
  ('10000000-0000-0000-0000-000000000024', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'C-04', 'Stand C-04', 'Hall C', 'C2', 90, 20, 'Electronics', true),
  ('10000000-0000-0000-0000-000000000025', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'C-05', 'Stand C-05', 'Hall C', 'C2', 100, 20, 'Fashion', true),
  ('10000000-0000-0000-0000-000000000026', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000b', 'C-06', 'Stand C-06', 'Hall C', 'C2', 110, 20, 'Home', true),
  ('10000000-0000-0000-0000-000000000027', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000b', 'C-07', 'Stand C-07', 'Hall C', 'C3', 90, 30, 'Food', true),
  ('10000000-0000-0000-0000-000000000028', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000a', 'C-08', 'Stand C-08', 'Hall C', 'C3', 100, 30, 'Electronics', true),
  ('10000000-0000-0000-0000-000000000029', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-0000-0000-00000000000b', 'C-09', 'Stand C-09', 'Hall C', 'C3', 110, 30, 'Fashion', true),
  ('10000000-0000-0000-0000-000000000030', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'C-10', 'Stand C-10', 'Hall C', 'C3', 120, 30, 'Home', true);

-- 12 zone-level beacons (not 1:1 with stands). stand_id is null.
insert into public.beacons (
  id, expo_id, stand_id, beacon_uuid, major, minor, hall, zone, x_coord, y_coord, tx_power, is_active
) values
  ('20000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'e2c56db5-dffb-48d2-b060-d0f5a71096e0', 1, 1, 'Hall A', 'A1', 15, 10, -59, true),
  ('20000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'e2c56db5-dffb-48d2-b060-d0f5a71096e0', 1, 2, 'Hall A', 'A2', 15, 20, -59, true),
  ('20000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'e2c56db5-dffb-48d2-b060-d0f5a71096e0', 1, 3, 'Hall A', 'A3', 15, 30, -59, true),
  ('20000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'e2c56db5-dffb-48d2-b060-d0f5a71096e0', 1, 4, 'Hall A', 'A4', 15, 40, -59, true),
  ('20000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'e2c56db5-dffb-48d2-b060-d0f5a71096e0', 2, 1, 'Hall B', 'B1', 60, 10, -59, true),
  ('20000000-0000-0000-0000-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'e2c56db5-dffb-48d2-b060-d0f5a71096e0', 2, 2, 'Hall B', 'B2', 60, 20, -59, true),
  ('20000000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'e2c56db5-dffb-48d2-b060-d0f5a71096e0', 2, 3, 'Hall B', 'B3', 60, 30, -59, true),
  ('20000000-0000-0000-0000-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'e2c56db5-dffb-48d2-b060-d0f5a71096e0', 3, 1, 'Hall C', 'C1', 100, 10, -59, true),
  ('20000000-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'e2c56db5-dffb-48d2-b060-d0f5a71096e0', 3, 2, 'Hall C', 'C2', 100, 20, -59, true),
  ('20000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'e2c56db5-dffb-48d2-b060-d0f5a71096e0', 3, 3, 'Hall C', 'C3', 100, 30, -59, true),
  ('20000000-0000-0000-0000-00000000000b', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'e2c56db5-dffb-48d2-b060-d0f5a71096e0', 1, 11, 'Hall A', 'A1', 25, 12, -70, true),
  ('20000000-0000-0000-0000-00000000000c', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'e2c56db5-dffb-48d2-b060-d0f5a71096e0', 2, 12, 'Hall B', 'B2', 65, 22, -80, false);

insert into public.offers (
  id, stand_id, created_by, product_name, description, category, discount_percent, status, valid_from, valid_until
) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Wireless Earbuds', 'Active demo', 'Electronics', 20, 'active', now() - interval '1 hour', now() + interval '2 days'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-00000000000a', 'USB-C Hub', 'Active demo', 'Electronics', 15, 'active', now() - interval '1 hour', now() + interval '2 days'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Summer Jacket', 'Active demo', 'Fashion', 25, 'active', now() - interval '1 hour', now() + interval '2 days'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-00000000000b', 'Smart Lamp', 'Active demo', 'Home', 10, 'active', now() - interval '1 hour', now() + interval '2 days'),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-00000000000b', 'Coffee Pack', 'Active demo', 'Food', 12, 'active', now() - interval '1 hour', now() + interval '2 days'),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Power Bank', 'Active demo', 'Electronics', 18, 'active', now() - interval '1 hour', now() + interval '2 days'),
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000014', 'aaaaaaaa-0000-0000-0000-00000000000b', 'Snack Box', 'Active demo', 'Food', 8, 'active', now() - interval '1 hour', now() + interval '2 days'),
  ('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Desk Organizer', 'Paused demo', 'Home', 30, 'paused', now() - interval '1 hour', now() + interval '2 days'),
  ('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-00000000000b', 'Tea Sampler', 'Paused demo', 'Food', 14, 'paused', now() - interval '1 hour', now() + interval '2 days'),
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000012', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Canvas Tote', 'Paused demo', 'Fashion', 22, 'paused', now() - interval '1 hour', now() + interval '2 days'),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000013', 'aaaaaaaa-0000-0000-0000-00000000000b', 'Candle Set', 'Paused demo', 'Home', 16, 'paused', now() - interval '1 hour', now() + interval '2 days'),
  ('30000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Cap Draft', 'Draft demo', 'Fashion', 5, 'draft', now(), now() + interval '3 days'),
  ('30000000-0000-0000-0000-00000000000d', '10000000-0000-0000-0000-000000000015', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Cable Draft', 'Draft demo', 'Electronics', 9, 'draft', now(), now() + interval '3 days'),
  ('30000000-0000-0000-0000-00000000000e', '10000000-0000-0000-0000-000000000017', 'aaaaaaaa-0000-0000-0000-00000000000b', 'Pillow Draft', 'Draft demo', 'Home', 11, 'draft', now(), now() + interval '3 days'),
  ('30000000-0000-0000-0000-00000000000f', '10000000-0000-0000-0000-000000000018', 'aaaaaaaa-0000-0000-0000-00000000000b', 'Jam Draft', 'Draft demo', 'Food', 7, 'draft', now(), now() + interval '3 days');

insert into public.user_interests (id, user_id, expo_id, category) values
  ('40000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000aa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Electronics'),
  ('40000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-0000000000bb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Food');

insert into public.offer_redemptions (id, offer_id, user_id, redemption_code) values
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000aa', 'RDM-VISITOR-A-001'),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-0000000000bb', 'RDM-VISITOR-B-001');

insert into public.notification_events (id, user_id, expo_id, stand_id, offer_id, beacon_id, event_type) values
  ('60000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000aa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'offer_shown'),
  ('60000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-0000000000bb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', 'zone_detected');

set session_replication_role = origin;
