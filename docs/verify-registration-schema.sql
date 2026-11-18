-- AMANAH registration compatibility audit (READ ONLY, SINGLE RESULT GRID)
-- Run this entire script in the EXISTING Supabase project's SQL Editor.
-- It returns ONE result set with two columns: audit_section and details (JSON).
-- This avoids accidentally copying only the final result tab.
-- No member rows, activation-code values, secrets, or PII are queried.
-- No schema or data is changed.

select audit_section, details
from (
  select
    '1_columns'::text as audit_section,
    to_jsonb(x) as details
  from (
    select c.table_name, c.ordinal_position, c.column_name, c.data_type,
           c.udt_name, c.is_nullable, c.column_default
    from information_schema.columns c
    where c.table_schema = 'public'
      and (
        c.table_name in ('profiles', 'pending_distributor_applications')
        or c.table_name ilike '%activation%'
        or c.table_name ilike '%application%'
        or c.table_name ilike '%registration%'
      )
  ) x

  union all

  select
    '2_rls_status'::text,
    to_jsonb(x)
  from (
    select n.nspname as schema_name, c.relname as table_name,
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
  ) x

  union all

  select
    '3_policies'::text,
    to_jsonb(x)
  from (
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        tablename in ('profiles', 'pending_distributor_applications')
        or tablename ilike '%activation%'
        or tablename ilike '%application%'
        or tablename ilike '%registration%'
      )
  ) x

  union all

  select
    '4_functions'::text,
    to_jsonb(x)
  from (
    select n.nspname as schema_name, p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as arguments,
           pg_get_function_result(p.oid) as result_type,
           p.prosecdef as security_definer, p.provolatile as volatility
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (
        p.proname ilike '%activation%'
        or p.proname ilike '%register%'
        or p.proname ilike '%application%'
        or p.proname ilike '%member_code%'
      )
  ) x

  union all

  select
    '5_role_status_enums'::text,
    to_jsonb(x)
  from (
    select t.typname as enum_type, e.enumsortorder, e.enumlabel
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and (t.typname ilike '%role%' or t.typname ilike '%status%')
  ) x

  union all

  select
    '6_table_grants'::text,
    to_jsonb(x)
  from (
    select table_name, grantee, privilege_type, is_grantable
    from information_schema.role_table_grants
    where table_schema = 'public'
      and (
        table_name in ('profiles', 'pending_distributor_applications')
        or table_name ilike '%activation%'
        or table_name ilike '%application%'
        or table_name ilike '%registration%'
      )
  ) x
) audit_rows
order by audit_section, details::text;
