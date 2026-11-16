-- A1.2: forward-only activation-code reservation and expiry repair.
-- Target: the already-existing AMANAH live activation_codes table.
-- This migration is intentionally NOT a replay of migration 0006.
-- Review and backup before any live execution. Do not run automatically in production.

begin;

do $$
declare
  v_count bigint;
begin
  if to_regclass('public.activation_codes') is null then
    raise exception 'Expected existing public.activation_codes table; aborting safely';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='activation_codes' and column_name='code_hash'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='activation_codes' and column_name='created_by'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='activation_codes' and column_name='expires_at'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='activation_codes' and column_name='used_at'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='activation_codes' and column_name='used_by'
  ) then
    raise exception 'Live activation_codes columns differ from the audited contract; aborting safely';
  end if;

  select count(*) into v_count from public.activation_codes;
  if v_count <> 0 then
    raise exception 'activation_codes is not empty; manually reconcile existing rows before applying A1.2 (rows=%)', v_count;
  end if;

  if to_regtype('public.amanah_role') is null then
    raise exception 'Expected public.amanah_role enum; aborting safely';
  end if;
end
$$;

alter table public.activation_codes
  add column role public.amanah_role not null,
  add column status text not null default 'issued',
  add column reserved_user_id uuid,
  add column reserved_at timestamptz;

alter table public.activation_codes
  add constraint activation_codes_status_check
  check (status in ('issued','reserved','redeemed','revoked','expired')),
  add constraint activation_codes_reservation_consistency_check
  check (
    (status = 'reserved' and reserved_user_id is not null and reserved_at is not null)
    or (status <> 'reserved' and reserved_user_id is null and reserved_at is null)
  );

create index activation_codes_status_expiry_idx
  on public.activation_codes(status, expires_at);

create or replace function public.reserve_amanah_activation_code(
  p_code_hash text,
  p_user_id uuid
)
returns table(activation_id uuid, assigned_role text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code public.activation_codes%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Trusted AMANAH registration service required' using errcode = '42501';
  end if;
  if p_user_id is null or p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid activation request';
  end if;

  select * into v_code
  from public.activation_codes
  where code_hash = p_code_hash
  for update;

  if not found then
    raise exception 'Activation code is invalid, expired, or already used';
  end if;

  if v_code.used_at is not null or v_code.status in ('redeemed','revoked','expired') then
    raise exception 'Activation code is invalid, expired, or already used';
  end if;

  if v_code.expires_at is not null and v_code.expires_at <= now() then
    update public.activation_codes
    set status='expired', reserved_user_id=null, reserved_at=null
    where id=v_code.id;
    return;
  end if;

  if v_code.status='reserved' then
    if v_code.reserved_at is null or v_code.reserved_at > now() - interval '15 minutes' then
      raise exception 'Activation code is currently being used';
    end if;
    -- Reclaim a stale lease, then reserve it for this request under the same row lock.
    update public.activation_codes
    set status='issued', reserved_user_id=null, reserved_at=null
    where id=v_code.id;
  elsif v_code.status <> 'issued' then
    raise exception 'Activation code is not available';
  end if;

  update public.activation_codes
  set status='reserved', reserved_user_id=p_user_id, reserved_at=now()
  where id=v_code.id;

  return query select v_code.id, v_code.role::text;
end;
$$;

create or replace function public.release_amanah_activation_reservation(
  p_activation_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Trusted AMANAH registration service required' using errcode = '42501';
  end if;
  if p_activation_id is null or p_user_id is null then
    raise exception 'Invalid activation reservation';
  end if;

  update public.activation_codes
  set status = case
        when expires_at is not null and expires_at <= now() then 'expired'
        else 'issued'
      end,
      reserved_user_id = null,
      reserved_at = null
  where id = p_activation_id
    and status = 'reserved'
    and reserved_user_id = p_user_id
    and used_at is null;
end;
$$;

revoke all on function public.reserve_amanah_activation_code(text, uuid) from public, anon, authenticated;
revoke all on function public.release_amanah_activation_reservation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_amanah_activation_code(text, uuid) to service_role;
grant execute on function public.release_amanah_activation_reservation(uuid, uuid) to service_role;

commit;
