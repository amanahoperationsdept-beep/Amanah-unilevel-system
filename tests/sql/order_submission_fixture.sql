-- Synthetic PostgreSQL fixture for migration 0004 order-submission RPC tests.
-- Never connect this test to a hosted or live database.
do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;

create schema auth;
create type public.amanah_role as enum (
  'administrator','marketing_officer','branch_operator','mobile_stockist','distributor'
);

create function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create function auth.role()
returns text language sql stable
as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;

create table public.profiles (
  id uuid primary key,
  full_name text not null,
  role public.amanah_role not null,
  is_active boolean not null
);
create table public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  is_active boolean not null
);
create table public.products (
  id uuid primary key,
  name text not null,
  is_active boolean not null,
  distributor_price numeric(12,2) not null,
  mobile_stockist_price numeric(12,2) not null,
  branch_operator_price numeric(12,2) not null,
  marketing_officer_price numeric(12,2) not null,
  srp numeric(12,2) not null
);
create sequence public.order_number_seq;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null default ('TEST-' || nextval('public.order_number_seq')),
  buyer_id uuid not null,
  status text not null,
  subtotal numeric(12,2) not null,
  total numeric(12,2) not null,
  payment_method text,
  notes text,
  destination_category text,
  destination_name text,
  destination_contact_person text,
  destination_contact_number text,
  destination_address text,
  destination_member_id uuid,
  fulfillment_user_id uuid
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  product_id uuid not null references public.products(id),
  quantity integer not null,
  unit_price numeric(12,2) not null
);

grant usage on schema public, auth to authenticated, anon;
grant execute on function auth.uid(), auth.role() to authenticated, anon;
grant execute on all functions in schema public to authenticated;

insert into public.profiles(id,full_name,role,is_active) values
 ('10000000-0000-4000-8000-000000000001','Test Distributor','distributor',true),
 ('10000000-0000-4000-8000-000000000002','Inactive Distributor','distributor',false),
 ('10000000-0000-4000-8000-000000000003','Test Administrator','administrator',true),
 ('10000000-0000-4000-8000-000000000004','Test Branch Operator','branch_operator',true),
 ('10000000-0000-4000-8000-000000000005','Inactive Branch Location','branch_operator',true),
 ('10000000-0000-4000-8000-000000000006','Test Mobile Stockist','mobile_stockist',true);

insert into public.stock_locations(profile_id,is_active) values
 ('10000000-0000-4000-8000-000000000004',true),
 ('10000000-0000-4000-8000-000000000005',false),
 ('10000000-0000-4000-8000-000000000006',true);

insert into public.products(id,name,is_active,distributor_price,mobile_stockist_price,branch_operator_price,marketing_officer_price,srp) values
 ('20000000-0000-4000-8000-000000000001','Test Product A',true,10.25,12.00,13.00,14.00,15.00),
 ('20000000-0000-4000-8000-000000000002','Test Product B',true,3.00,4.00,5.00,6.00,7.00),
 ('20000000-0000-4000-8000-000000000003','Inactive Product',false,1.00,2.00,3.00,4.00,5.00);
