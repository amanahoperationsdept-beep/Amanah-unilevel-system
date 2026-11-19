-- AMANAH registration runtime audit (READ ONLY, one result grid).
-- Run in the existing Supabase SQL Editor. This returns metadata, function source,
-- trigger definitions, and a row COUNT only. It does not return member rows,
-- activation hashes, credentials, or personal data, and performs no writes.
select audit_section, details
from (
  select '1_activation_row_count'::text as audit_section,
         jsonb_build_object('row_count', (select count(*) from public.activation_codes)) as details

  union all
  select '2_constraints',
         to_jsonb(x)
  from (
    select conrelid::regclass::text as table_name, conname as constraint_name,
           contype as constraint_type, pg_get_constraintdef(oid, true) as definition
    from pg_constraint
    where conrelid in ('public.activation_codes'::regclass, 'public.profiles'::regclass)
    order by conrelid::regclass::text, conname
  ) x

  union all
  select '3_indexes',
         to_jsonb(x)
  from (
    select schemaname, tablename, indexname, indexdef
    from pg_indexes
    where schemaname = 'public'
      and tablename in ('activation_codes', 'profiles')
    order by tablename, indexname
  ) x

  union all
  select '4_triggers',
         to_jsonb(x)
  from (
    select n.nspname as table_schema, c.relname as table_name,
           t.tgname as trigger_name, pg_get_triggerdef(t.oid, true) as trigger_definition,
           pn.nspname as function_schema, p.proname as function_name,
           pg_get_functiondef(p.oid) as function_definition
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace pn on pn.oid = p.pronamespace
    where not t.tgisinternal
      and ((n.nspname = 'auth' and c.relname = 'users')
        or (n.nspname = 'public' and c.relname in ('profiles', 'activation_codes')))
    order by n.nspname, c.relname, t.tgname
  ) x

  union all
  select '5_registration_functions',
         to_jsonb(x)
  from (
    select n.nspname as schema_name, p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as arguments,
           pg_get_function_result(p.oid) as result_type,
           p.prosecdef as security_definer, p.provolatile as volatility,
           pg_get_userbyid(p.proowner) as owner,
           has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute,
           pg_get_functiondef(p.oid) as function_definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'auth')
      and (
        p.proname ilike '%activation%'
        or p.proname ilike '%register%'
        or p.proname ilike '%member_code%'
        or p.proname ilike '%profile%'
        or p.proname ilike '%new_user%'
        or p.proname ilike '%consume%'
      )
    order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
  ) x
) audit
order by audit_section, details::text;
