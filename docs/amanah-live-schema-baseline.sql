-- AMANAH LIVE SCHEMA BASELINE — READ ONLY
-- Run ONLY in the existing AMANAH Supabase project SQL Editor.
-- Project ref: bqgxvnrgjmngezknqhsl
-- This file contains SELECT statements only. It does not alter schema, data,
-- privileges, policies, functions, triggers, or migration history.
-- Export/save each result set with its query label and execution timestamp.
-- Do not export auth.users rows, member PII, secrets, or application data.

-- 00. Capture database identity/version (safe metadata only).
select current_database() as database_name,
       current_user as execution_role,
       current_setting('server_version') as postgres_version,
       current_setting('search_path') as search_path,
       now() as captured_at;

-- 01. All non-system schemas and owners.
select n.nspname as schema_name, pg_get_userbyid(n.nspowner) as owner,
       n.nspacl as acl
from pg_namespace n
where n.nspname not like 'pg_%' and n.nspname <> 'information_schema'
order by n.nspname;

-- 02. All public relations: tables, partitioned tables, views, materialized views,
-- foreign tables, sequences; includes owner, persistence and RLS flags.
select n.nspname as schema_name, c.relname as object_name,
       case c.relkind when 'r' then 'table' when 'p' then 'partitioned_table'
         when 'v' then 'view' when 'm' then 'materialized_view'
         when 'f' then 'foreign_table' when 'S' then 'sequence'
         else c.relkind::text end as object_type,
       pg_get_userbyid(c.relowner) as owner,
       c.relpersistence as persistence,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced,
       c.reloptions as relation_options
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relkind in ('r','p','v','m','f','S')
order by object_type, object_name;

-- 03. Every public column, exact type, collation, nullability, default, identity/generated.
select table_name, ordinal_position, column_name, data_type, udt_schema, udt_name,
       is_nullable, column_default, is_identity, identity_generation,
       is_generated, generation_expression, collation_name
from information_schema.columns
where table_schema='public'
order by table_name, ordinal_position;

-- 04. All public constraints, with exact definitions and deferrability.
select n.nspname as schema_name, r.relname as table_name, con.conname,
       case con.contype when 'p' then 'PRIMARY KEY' when 'u' then 'UNIQUE'
         when 'f' then 'FOREIGN KEY' when 'c' then 'CHECK'
         when 'x' then 'EXCLUSION' else con.contype::text end as constraint_type,
       pg_get_constraintdef(con.oid, true) as definition,
       con.condeferrable, con.condeferred, con.convalidated
from pg_constraint con
join pg_class r on r.oid=con.conrelid
join pg_namespace n on n.oid=r.relnamespace
where n.nspname='public'
order by r.relname, con.conname;

-- 05. All public indexes, including partial predicates and included columns.
select schemaname, tablename, indexname, tablespace, indexdef
from pg_indexes where schemaname='public'
order by tablename, indexname;

-- 06. RLS flags and complete policy expressions.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p')
order by c.relname;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname='public'
order by tablename, policyname;

-- 07. Effective object ACLs for public schema tables/views/sequences/functions.
-- ACL arrays preserve grantee/grantor/privilege/grant-option details.
select n.nspname as schema_name, c.relname as object_name,
       c.relkind as object_kind, c.relacl as acl
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
order by c.relkind, c.relname;

select n.nspname as schema_name, p.oid::regprocedure as function_signature,
       pg_get_userbyid(p.proowner) as owner, p.proacl as acl,
       p.prosecdef as security_definer, p.proleakproof as leakproof,
       p.proconfig as function_settings
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
order by p.proname, p.oid::regprocedure::text;

-- 08. Schema privileges for API roles and object-level table grants.
select n.nspname as schema_name, roles.role_name,
       has_schema_privilege(roles.role_name, n.oid, 'USAGE') as has_usage,
       has_schema_privilege(roles.role_name, n.oid, 'CREATE') as has_create
from pg_namespace n
cross join (values ('anon'), ('authenticated'), ('authenticator'),
                   ('service_role'), ('postgres')) as roles(role_name)
where n.nspname in ('public','auth','storage','extensions')
order by n.nspname, roles.role_name;

select grantee, table_name, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema='public'
order by table_name, grantee, privilege_type;

-- 09. Default privileges (future objects), scoped by schema and creator.
select d.defaclrole::regrole as creator_role,
       coalesce(n.nspname, '(all schemas)') as schema_name,
       d.defaclobjtype as object_type, d.defaclacl as default_acl
from pg_default_acl d
left join pg_namespace n on n.oid=d.defaclnamespace
where d.defaclnamespace=0 or n.nspname='public'
order by creator_role::text, schema_name, object_type;

-- 10. Functions: full definitions, argument/return types, owner, security,
-- volatility, config, and explicit ACL. Review output for sensitive literals
-- before sharing; redact any secrets if a developer accidentally embedded one.
select p.oid::regprocedure as function_signature,
       pg_get_function_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as result_type,
       pg_get_userbyid(p.proowner) as owner,
       l.lanname as language,
       p.prosecdef as security_definer,
       p.provolatile as volatility,
       p.proleakproof as leakproof,
       p.proconfig as function_settings,
       p.proacl as acl,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
join pg_language l on l.oid=p.prolang
where n.nspname='public'
order by p.proname, p.oid::regprocedure::text;

-- 11. Triggers on public relations, with exact definitions and enabled state.
select n.nspname as schema_name, c.relname as table_name,
       t.tgname as trigger_name, t.tgenabled as enabled_state,
       pg_get_triggerdef(t.oid, true) as definition,
       p.oid::regprocedure as trigger_function
from pg_trigger t
join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
join pg_proc p on p.oid=t.tgfoid
where n.nspname='public' and not t.tgisinternal
order by c.relname, t.tgname;

-- 12. Enum definitions and ordered values.
select n.nspname as schema_name, t.typname as enum_name,
       e.enumlabel as enum_value, e.enumsortorder
from pg_type t join pg_enum e on e.enumtypid=t.oid
join pg_namespace n on n.oid=t.typnamespace
where n.nspname='public'
order by t.typname, e.enumsortorder;

-- 13. Sequences and their ownership/dependency metadata.
select schemaname, sequencename, sequenceowner, data_type,
       start_value, min_value, max_value, increment_by, cycle, cache_size
from pg_sequences where schemaname='public'
order by sequencename;

select seq_ns.nspname as sequence_schema, seq.relname as sequence_name,
       tbl_ns.nspname as table_schema, tbl.relname as table_name,
       att.attname as column_name, dep.deptype
from pg_class seq
join pg_namespace seq_ns on seq_ns.oid=seq.relnamespace
left join pg_depend dep on dep.objid=seq.oid and dep.classid='pg_class'::regclass
left join pg_class tbl on tbl.oid=dep.refobjid
left join pg_namespace tbl_ns on tbl_ns.oid=tbl.relnamespace
left join pg_attribute att on att.attrelid=tbl.oid and att.attnum=dep.refobjsubid
where seq_ns.nspname='public' and seq.relkind='S'
order by seq.relname;

-- 14. Views/materialized views definitions and security options.
select schemaname, viewname, viewowner, definition
from pg_views where schemaname='public'
order by viewname;

select schemaname, matviewname, matviewowner, definition, ispopulated
from pg_matviews where schemaname='public'
order by matviewname;

-- 15. Extensions and versions.
select e.extname, e.extversion, n.nspname as schema_name
from pg_extension e join pg_namespace n on n.oid=e.extnamespace
order by e.extname;

-- 16. Database role attributes only; do not query role passwords/auth secrets.
select rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb,
       rolcanlogin, rolreplication, rolbypassrls
from pg_roles
where rolname in ('anon','authenticated','authenticator','service_role','postgres')
order by rolname;

-- 17. Migration-history discovery: catalog metadata only.
-- This does not assert that Supabase's auth/storage/realtime migration tables
-- represent the AMANAH application migration ledger.
select schemaname, tablename
from pg_tables
where tablename ilike '%migration%'
order by schemaname, tablename;

-- 18. Public data counts only (no row contents or personal information).
select 'profiles' as table_name, count(*) as row_count from public.profiles
union all select 'activation_codes', count(*) from public.activation_codes
union all select 'products', count(*) from public.products
union all select 'orders', count(*) from public.orders
union all select 'order_items', count(*) from public.order_items
union all select 'commissions', count(*) from public.commissions
union all select 'wallets', count(*) from public.wallets
union all select 'withdrawal_requests', count(*) from public.withdrawal_requests
order by table_name;

-- END. No DDL/DML statements are included in this baseline audit.
