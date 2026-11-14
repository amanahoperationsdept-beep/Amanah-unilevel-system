-- AMANAH LIVE DATABASE AUDIT — READ ONLY
-- Run in Supabase Dashboard > SQL Editor against the EXISTING AMANAH project.
-- This script only reads catalog metadata and counts. It does not change data/schema.
-- Save/export every result set and share it here. Never share API keys or passwords.

-- A. Public tables, columns, types, defaults, nullability.
select c.table_name, c.ordinal_position, c.column_name, c.data_type, c.udt_name,
       c.is_nullable, c.column_default
from information_schema.columns c
where c.table_schema='public'
order by c.table_name, c.ordinal_position;

-- B. Constraints and relationships for all public tables.
select tc.table_name, tc.constraint_name, tc.constraint_type,
       kcu.column_name, ccu.table_name as referenced_table,
       ccu.column_name as referenced_column, cc.check_clause
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_schema=kcu.constraint_schema
 and tc.constraint_name=kcu.constraint_name
 and tc.table_name=kcu.table_name
left join information_schema.constraint_column_usage ccu
  on tc.constraint_schema=ccu.constraint_schema
 and tc.constraint_name=cccu.constraint_name
left join information_schema.check_constraints cc
  on tc.constraint_schema=cc.constraint_schema
 and tc.constraint_name=cc.constraint_name
where tc.constraint_schema='public'
order by tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- C. RLS enabled/forced status for all public tables.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p')
order by c.relname;

-- D. Every RLS policy, including policy expressions.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname='public'
order by tablename, policyname;

-- E. Table grants (does not reveal credentials).
select grantee, table_name, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema='public'
order by table_name, grantee, privilege_type;

-- F. Enum types and their values.
select t.typname as enum_name, e.enumlabel as enum_value, e.enumsortorder
from pg_type t join pg_enum e on e.enumtypid=t.oid
join pg_namespace n on n.oid=t.typnamespace
where n.nspname='public'
order by t.typname, e.enumsortorder;

-- G. Functions/RPC signatures and security settings (definitions are not included here).
select p.oid::regprocedure as function_signature,
       p.prosecdef as security_definer,
       p.provolatile as volatility,
       p.proconfig as function_settings,
       pg_get_userbyid(p.proowner) as function_owner
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
order by p.proname, p.oid::regprocedure::text;

-- H. Triggers on all public tables.
select c.relname as table_name, t.tgname as trigger_name,
       pg_get_triggerdef(t.oid) as trigger_definition,
       p.oid::regprocedure as trigger_function
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
join pg_proc p on p.oid=t.tgfoid
where n.nspname='public' and not t.tgisinternal
order by c.relname, t.tgname;

-- I. Current profile role/status values and counts (no names or personal details).
select role::text as role_value,
       coalesce(to_jsonb(p)->>'is_active', to_jsonb(p)->>'status', 'unknown') as active_or_status,
       count(*) as member_count
from public.profiles p
group by role::text, coalesce(to_jsonb(p)->>'is_active', to_jsonb(p)->>'status', 'unknown')
order by role_value, active_or_status;

-- J. Stock location summary. Expected live design already shared by the owner:
-- stock_locations: location_code, location_type, profile_id, location_name,
-- is_active, created_at, updated_at. This query safely reports if table/columns exist.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='stock_locations'
order by ordinal_position;

-- K. Order-related live schema, if present.
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema='public'
  and table_name in ('orders','order_items','products','profiles','stock_locations',
                     'inventory','stock_movements','commission_ledger','wallet_transactions',
                     'withdrawal_requests')
order by table_name, ordinal_position;

-- L. Important RPC definitions. Review before enabling checkout or financial posting.
select p.oid::regprocedure as function_signature,
       pg_get_functiondef(p.oid) as function_definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('submit_member_order','list_order_destinations',
                    'review_member_application','is_active_distributor_sponsor')
order by p.proname;
