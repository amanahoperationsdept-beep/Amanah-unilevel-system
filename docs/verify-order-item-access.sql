-- AMANAH order-item access verification (READ ONLY).
-- Run before and after any approved migration in Supabase SQL Editor.
-- Returns policy/catalog metadata only; no order rows, member PII, or secrets.

-- 1. Confirm RLS state on parent and child tables.
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in ('orders','order_items')
order by c.relname;

-- 2. Inspect relevant SELECT policies.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
  and tablename in ('orders','order_items')
  and cmd='SELECT'
order by tablename, policyname;

-- 3. Confirm authenticated/anon SELECT grants (grant alone is not row access;
-- RLS policy and role attributes still control visible rows).
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name in ('orders','order_items')
  and grantee in ('anon','authenticated','service_role')
  and privilege_type='SELECT'
order by table_name, grantee;

-- 4. Confirm the referenced helper functions and security mode.
select p.oid::regprocedure as function_signature,
       p.prosecdef as security_definer,
       p.provolatile as volatility,
       p.proconfig as function_settings,
       pg_get_userbyid(p.proowner) as function_owner
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.oid in (
    to_regprocedure('public.is_in_my_downline(uuid)'),
    to_regprocedure('public.is_amanah_admin()')
  )
order by p.oid::regprocedure::text;

-- 5. Static policy assertions. The expected policy should include the parent
-- order join plus buyer, fulfillment, downline, and admin predicates.
select
  coalesce(bool_and(
    qual ilike '%order_id%'
    and qual ilike '%buyer_id%'
    and qual ilike '%fulfillment_user_id%'
    and qual ilike '%is_in_my_downline%'
    and qual ilike '%is_amanah_admin%'
    and 'authenticated' = any(roles)
  ), false) as expected_order_item_policy_present
from pg_policies
where schemaname='public'
  and tablename='order_items'
  and policyname='order_items_select_related'
  and cmd='SELECT';
