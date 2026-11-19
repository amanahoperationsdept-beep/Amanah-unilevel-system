-- AMANAH checkout security audit (READ ONLY)
-- Run in Supabase Dashboard > SQL Editor. No data or schema is changed.
-- 1) Existing function definition, security mode, owner, and settings.
SELECT p.oid::regprocedure AS function_signature,
       pg_get_functiondef(p.oid) AS function_definition,
       p.prosecdef AS is_security_definer,
       p.proconfig AS function_settings,
       pg_get_userbyid(p.proowner) AS function_owner
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='submit_member_order';

-- 2) Live columns.
SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('orders','order_items','profiles','products')
ORDER BY table_name,ordinal_position;

-- 3) Constraints and foreign keys.
SELECT tc.table_name,tc.constraint_name,tc.constraint_type,kcu.column_name,
       ccu.table_name AS referenced_table,ccu.column_name AS referenced_column,
       cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
 ON tc.constraint_schema=kcu.constraint_schema AND tc.constraint_name=kcu.constraint_name
 AND tc.table_name=kcu.table_name
LEFT JOIN information_schema.constraint_column_usage ccu
 ON tc.constraint_schema=ccu.constraint_schema AND tc.constraint_name=ccu.constraint_name
LEFT JOIN information_schema.check_constraints cc
 ON tc.constraint_schema=cc.constraint_schema AND tc.constraint_name=cc.constraint_name
WHERE tc.constraint_schema='public'
 AND tc.table_name IN ('orders','order_items','profiles')
ORDER BY tc.table_name,tc.constraint_name,kcu.ordinal_position;

-- 4) RLS policies and grants.
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname='public'
 AND tablename IN ('orders','order_items','profiles')
ORDER BY tablename,policyname;

SELECT grantee,table_name,privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public'
 AND table_name IN ('orders','order_items','profiles')
ORDER BY table_name,grantee,privilege_type;

-- 5) Enum values.
SELECT t.typname AS enum_name,e.enumlabel AS enum_value,e.enumsortorder
FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
JOIN pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname='public'
 AND t.typname IN ('app_role','user_role','order_status')
ORDER BY t.typname,e.enumsortorder;

-- 6) Orders/order_items triggers and trigger function source.
SELECT c.relname AS table_name,t.tgname AS trigger_name,
       pg_get_triggerdef(t.oid) AS trigger_definition,
       p.oid::regprocedure AS trigger_function,
       pg_get_functiondef(p.oid) AS trigger_function_definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_proc p ON p.oid=t.tgfoid
WHERE n.nspname='public' AND c.relname IN ('orders','order_items')
 AND NOT t.tgisinternal
ORDER BY c.relname,t.tgname;

-- 7) Actual seller role labels and active-member counts.
SELECT role::text AS role_value,is_active,count(*) AS member_count
FROM public.profiles
GROUP BY role::text,is_active
ORDER BY role_value,is_active;
