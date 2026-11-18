-- Restrict order item reads to users who can read the parent order.
-- Forward-only remediation for the audited live AMANAH schema.
-- REVIEWED AGAINST docs/PROJECT_PROGRESS.md (live audit sections D/E, 2026-11-16).
-- Do not apply to Supabase without a fresh read-only schema/policy check,
-- disposable PostgreSQL test, approved backup, and explicit owner approval.

begin;

do $$
declare
  v_policy_count integer;
begin
  if to_regclass('public.order_items') is null
     or to_regclass('public.orders') is null then
    raise exception 'Expected public.order_items and public.orders tables; aborting';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='order_items' and column_name='order_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='buyer_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='fulfillment_user_id'
  ) then
    raise exception 'Live order ownership columns differ from the audited contract; aborting';
  end if;

  if to_regprocedure('public.is_in_my_downline(uuid)') is null
     or to_regprocedure('public.is_amanah_admin()') is null then
    raise exception 'Expected AMANAH order-visibility helper functions are missing; aborting';
  end if;

  if not (select relrowsecurity from pg_class where oid='public.order_items'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.orders'::regclass) then
    raise exception 'RLS must be enabled on both order_items and orders; aborting';
  end if;

  select count(*) into v_policy_count
  from pg_policies
  where schemaname='public'
    and tablename='order_items'
    and policyname='order_items_select_related'
    and cmd='SELECT';

  if v_policy_count <> 1 then
    raise exception 'Expected exactly one order_items_select_related SELECT policy; aborting';
  end if;

  -- The child-table policy must not silently narrow or broaden the existing
  -- parent-order visibility contract. Policies are permissive by default and
  -- combine with OR, so each required access path may be in a separate policy.
  if not (
    select coalesce(bool_or(qual ilike '%buyer_id%'), false)
       and coalesce(bool_or(qual ilike '%fulfillment_user_id%'), false)
       and coalesce(bool_or(qual ilike '%is_in_my_downline%'), false)
       and coalesce(bool_or(qual ilike '%is_amanah_admin%'), false)
    from pg_policies
    where schemaname='public'
      and tablename='orders'
      and cmd in ('SELECT', 'ALL')
      and permissive = 'PERMISSIVE'
      and ('authenticated' = any(roles) or 'public' = any(roles))
  ) then
    raise exception 'Existing orders SELECT/ALL policies do not expose all audited buyer, fulfillment, downline, and admin paths; aborting';
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

-- Fail the transaction if the installed policy does not expose all four
-- intended access predicates to authenticated users.
do $$
declare
  v_qual text;
  v_roles name[];
begin
  select qual, roles into v_qual, v_roles
  from pg_policies
  where schemaname='public'
    and tablename='order_items'
    and policyname='order_items_select_related'
    and cmd='SELECT';

  if v_qual is null
     or position('buyer_id' in v_qual) = 0
     or position('fulfillment_user_id' in v_qual) = 0
     or position('is_in_my_downline' in v_qual) = 0
     or position('is_amanah_admin' in v_qual) = 0
     or not ('authenticated' = any(v_roles)) then
    raise exception 'Order item SELECT policy postcondition failed; rolling back';
  end if;
end
$$;

commit;
