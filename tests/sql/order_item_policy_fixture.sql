-- Disposable PostgreSQL fixture for migration 0008.
-- Run only in the isolated GitHub Actions PostgreSQL service database.

create role authenticated nologin;
create role anon nologin;

create schema auth;
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create table public.profiles (
  id uuid primary key,
  sponsor_id uuid,
  role text not null
);

create table public.orders (
  id uuid primary key,
  buyer_id uuid not null,
  fulfillment_user_id uuid
);

create table public.order_items (
  id integer generated always as identity primary key,
  order_id uuid not null references public.orders(id),
  sku text not null
);

create or replace function public.is_in_my_downline(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_member_id and p.sponsor_id = auth.uid()
  )
$$;

create or replace function public.is_amanah_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'administrator'
  )
$$;

grant execute on function public.is_in_my_downline(uuid) to authenticated;
grant execute on function public.is_amanah_admin() to authenticated;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy orders_select_related
on public.orders for select to authenticated
using (
  buyer_id = auth.uid()
  or fulfillment_user_id = auth.uid()
  or public.is_in_my_downline(buyer_id)
  or public.is_amanah_admin()
);

-- Deliberately unsafe pre-migration policy: existence-only parent check.
create policy order_items_select_related
on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
  )
);

grant usage on schema public to authenticated;
grant select on public.orders, public.order_items to authenticated;

insert into public.profiles(id, sponsor_id, role) values
  ('11111111-1111-4111-8111-111111111111', null, 'distributor'),
  ('22222222-2222-4222-8222-222222222222', null, 'distributor'),
  ('33333333-3333-4333-8333-333333333333', null, 'distributor'),
  ('44444444-4444-4444-8444-444444444444', null, 'distributor'),
  ('55555555-5555-4555-8555-555555555555', null, 'administrator'),
  ('66666666-6666-4666-8666-666666666666', '33333333-3333-4333-8333-333333333333', 'distributor'),
  ('77777777-7777-4777-8777-777777777777', null, 'distributor');

insert into public.orders(id, buyer_id, fulfillment_user_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', null),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '66666666-6666-4666-8666-666666666666', null),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '44444444-4444-4444-8444-444444444444', null);

insert into public.order_items(order_id, sku) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'OWN-ORDER'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'FULFILLMENT-ORDER'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'DOWNLINE-ORDER'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'UNRELATED-ORDER');
