-- Ensure pgTAP is available for subsequent tests
create extension if not exists pgtap with schema extensions;

begin;
select plan(1);
select ok(true, 'pgTAP setup completed');
select * from finish();
rollback;
