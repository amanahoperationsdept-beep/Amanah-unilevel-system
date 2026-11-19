-- Generate official AMANAH account codes by role.
-- Safe to review in the feature branch; do not apply to the live database
-- until the existing profiles schema and code uniqueness have been verified.
--
-- Codes are identifiers for activation/account type, NOT login credentials.
-- Login remains username + password.

create sequence if not exists public.amanah_ds_code_seq start with 1 increment by 1;
create sequence if not exists public.amanah_ms_code_seq start with 1 increment by 1;
create sequence if not exists public.amanah_bo_code_seq start with 1 increment by 1;
create sequence if not exists public.amanah_mo_code_seq start with 1 increment by 1;

create or replace function public.generate_amanah_member_code(p_role text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  -- This RPC is intended for trusted server-side activation only.
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Trusted AMANAH activation service required'
      using errcode = '42501';
  end if;

  case pg_catalog.lower(pg_catalog.btrim(coalesce(p_role, '')))
    when 'distributor' then
      v_code := 'DS' || pg_catalog.lpad(pg_catalog.nextval('public.amanah_ds_code_seq'::regclass)::text, 4, '0');
    when 'mobile_stockist' then
      v_code := 'MS' || pg_catalog.lpad(pg_catalog.nextval('public.amanah_ms_code_seq'::regclass)::text, 4, '0');
    when 'branch_operator' then
      v_code := 'BO' || pg_catalog.lpad(pg_catalog.nextval('public.amanah_bo_code_seq'::regclass)::text, 4, '0');
    when 'marketing_officer' then
      v_code := 'MO' || pg_catalog.lpad(pg_catalog.nextval('public.amanah_mo_code_seq'::regclass)::text, 4, '0');
    when 'administrator' then
      v_code := 'ADMIN';
    else
      raise exception 'Unsupported AMANAH account role';
  end case;

  return v_code;
end;
$$;

revoke all on function public.generate_amanah_member_code(text)
  from public, anon, authenticated;
grant execute on function public.generate_amanah_member_code(text)
  to service_role;

comment on function public.generate_amanah_member_code(text) is
  'Allocates an official AMANAH member code by role. Server/service-role only; codes identify account type and are not login credentials.';
