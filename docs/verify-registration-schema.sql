-- AMANAH registration compatibility audit (READ ONLY)
-- Run in the existing Supabase SQL Editor. This script does not read member rows,
-- expose activation-code values, change data, or modify schema.
-- Share the result grids with the project assistant before applying any migration.

-- 1) Registration-related table and column inventory (names/types only).
select
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and (
    c.table_name in ('profiles', 'pending_distributor_applications')
    or c.table_name ilike '%activation%'
    or c.table_name ilike '%application%'
    or c.table_name ilike '%registration%'
  )
order by c.table_name, c.ordinal_position;

-- 2) Tables whose names suggest registration/activation, with RLS status.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and (
    c.relname in ('profiles', 'pending_distributor_applications')
    or c.relname ilike '%activation%'
    or c.relname ilike '%application%'
    or c.relname ilike '%registration%'
  )
order by c.relname;

-- 3) Registration-related policies (expressions only; no table data).
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and (
    tablename in ('profiles', 'pending_distributor_applications')
    or tablename ilike '%activation%'
    or tablename ilike '%application%'
    or tablename ilike '%registration%'
  )
order by tablename, policyname;

-- 4) Public functions with registration/activation-related names and signatures.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type,
  p.prosecdef as security_definer,
  p.provolatile as volatility
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.proname ilike '%activation%'
    or p.proname ilike '%register%'
    or p.proname ilike '%application%'
    or p.proname ilike '%member_code%'
  )
order by p.proname, arguments;

-- 5) Enum labels used by registration/profile role and status columns.
select
  t.typname as enum_type,
  e.enumsortorder,
  e.enumlabel
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and (
    t.typname ilike '%role%'
    or t.typname ilike '%status%'
  )
order by t.typname, e.enumsortorder;

-- 6) Grants on registration-related tables (privilege inventory only).
select
  table_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and (
    table_name in ('profiles', 'pending_distributor_applications')
    or table_name ilike '%activation%'
    or table_name ilike '%application%'
    or table_name ilike '%registration%'
  )
order by table_name, grantee, privilege_type;
