-- Restrict order item reads to users who can read the parent order.
-- This is a reviewed draft for the existing live schema; do not apply to production
-- without approval and verification of the current policy name/order authorization.
--
-- The prior live policy order_items_select_related allowed SELECT when a parent
-- order existed, without checking the caller's relationship to that order.
-- Keep existing order visibility: buyer, assigned fulfillment user, buyer's
-- downline, or AMANAH administrator.

begin;

do $$
begin
  if to_regclass('public.order_items') is null
     or to_regclass('public.orders') is null then
    raise exception 'Expected public.order_items and public.orders tables; aborting';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='buyer_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='fulfillment_user_id'
  ) then
    raise exception 'Order ownership columns differ from the reviewed contract; aborting';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='order_items'
      and policyname='order_items_select_related'
  ) then
    raise exception 'Expected policy order_items_select_related was not found; aborting';
  end if;
end
$$;

drop policy order_items_select_related on public.order_items;

create policy order_items_select_related
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        o.buyer_id = auth.uid()
        or o.fulfillment_user_id = auth.uid()
        or public.is_in_my_downline(o.buyer_id)
        or public.is_amanah_admin()
      )
  )
);

commit;
