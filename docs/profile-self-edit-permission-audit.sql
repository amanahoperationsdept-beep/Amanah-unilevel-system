-- AMANAH SELF-PROFILE EDIT AUTHORIZATION AUDIT — READ ONLY
-- Intended to verify database-side controls for editing profiles.full_name and profiles.phone.
-- Run only in Supabase SQL Editor against the live project when approved for a READ-ONLY audit.
-- No DDL/DML is included. Share result sets without personal data or secrets.

-- A. Table-level grants for profiles.
select grantee, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema='public' and table_name='profiles'
order by grantee, privilege_type;

-- B. Column-level grants on profiles, including editable and sensitive columns.
select grantee, column_name, privilege_type, is_grantable
from information_schema.column_privileges
where table_schema='public' and table_name='profiles'
order by grantee, column_name, privilege_type;

-- C. Effective UPDATE privileges for the authenticated and anonymous roles.
-- Table-level privilege can permit updates to columns not covered by column grants;
-- column checks help distinguish the effective scope.
select role_name,
       has_table_privilege(role_name, 'public.profiles', 'UPDATE') as table_update,
       has_column_privilege(role_name, 'public.profiles', 'full_name', 'UPDATE') as full_name_update,
       has_column_privilege(role_name, 'public.profiles', 'phone', 'UPDATE') as phone_update,
       has_column_privilege(role_name, 'public.profiles', 'role', 'UPDATE') as role_update,
       has_column_privilege(role_name, 'public.profiles', 'sponsor_id', 'UPDATE') as sponsor_update,
       has_column_privilege(role_name, 'public.profiles', 'member_code', 'UPDATE') as member_code_update,
       has_column_privilege(role_name, 'public.profiles', 'is_active', 'UPDATE') as active_update
from (values ('authenticated'), ('anon')) as roles(role_name);

-- D. Profile RLS policies and their exact expressions.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename='profiles'
order by policyname;

-- E. Triggers on profiles and the invoked trigger function definitions.
select t.tgname as trigger_name,
       pg_get_triggerdef(t.oid) as trigger_definition,
       p.oid::regprocedure as trigger_function,
       pg_get_functiondef(p.oid) as function_definition
from pg_trigger t
join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
join pg_proc p on p.oid=t.tgfoid
where n.nspname='public' and c.relname='profiles' and not t.tgisinternal
order by t.tgname;

-- F. Functions referencing profile/member updates, SECURITY DEFINER status,
-- search_path settings, and EXECUTE grants. Review definitions carefully.
select p.oid::regprocedure as function_signature,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       pg_get_functiondef(p.oid) as function_definition,
       coalesce(array_to_string(p.proacl, ', '), '(default ACL)') as raw_acl
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and (p.proname ilike '%profile%' or p.proname ilike '%member%' or p.proname ilike '%user%')
order by p.proname, p.oid::regprocedure::text;

-- G. Public views/materialized views whose definitions reference profiles.
select schemaname, viewname, definition
from pg_views
where schemaname='public' and definition ilike '%profiles%'
order by viewname;

-- H. Confirm RLS flags and table owner for profiles.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
       pg_get_userbyid(c.relowner) as table_owner
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='profiles';

-- I. Broader function scan: inspect every public function/procedure whose source
-- mentions profiles, rather than relying only on function names. This can catch
-- helper functions with unrelated names. Dynamic SQL may still require manual review.
select p.oid::regprocedure as function_signature,
       p.prokind as object_kind,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       coalesce(array_to_string(p.proacl, ', '), '(default ACL)') as raw_acl,
       pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.prosrc ilike '%profiles%'
order by p.proname, p.oid::regprocedure::text;
