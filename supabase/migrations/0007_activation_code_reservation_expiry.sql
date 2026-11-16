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


-- Complete registration against the existing auth.on_auth_user_created_amanah
-- trigger. That trigger creates the initial profile (and wallet) immediately
-- after Auth user creation, so completion MUST update that row rather than
-- attempt a second INSERT into profiles.
create or replace function public.complete_amanah_activation(
  p_activation_id uuid,
  p_user_id uuid,
  p_username text,
  p_full_name text,
  p_phone text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $
declare
  v_activation public.activation_codes%rowtype;
  v_member_code text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Trusted AMANAH registration service required' using errcode = '42501';
  end if;
  if p_activation_id is null or p_user_id is null
     or p_username is null or lower(btrim(p_username)) !~ '^[a-z0-9._-]{3,32}(text, uuid) from public, anon, authenticated;
revoke all on function public.release_amanah_activation_reservation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_amanah_activation_code(text, uuid) to service_role;
grant execute on function public.release_amanah_activation_reservation(uuid, uuid) to service_role;

commit;

     or p_full_name is null or length(btrim(p_full_name)) < 2
     or length(btrim(p_full_name)) > 120
     or length(coalesce(p_phone, '')) > 40 then
    raise exception 'Invalid registration details';
  end if;

  -- Serialize competing attempts to claim the same case-insensitive username.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(lower(btrim(p_username)), 0)
  );

  select * into v_activation
  from public.activation_codes
  where id = p_activation_id
  for update;

  if not found
     or v_activation.status <> 'reserved'
     or v_activation.reserved_user_id <> p_user_id
     or v_activation.reserved_at is null
     or v_activation.reserved_at <= now() - interval '15 minutes'
     or v_activation.expires_at is null
     or v_activation.expires_at <= now()
     or v_activation.used_at is not null then
    raise exception 'Activation reservation is invalid, expired, or already used';
  end if;

  if exists (
    select 1 from public.profiles
    where lower(username) = lower(btrim(p_username))
      and id <> p_user_id
  ) then
    raise exception 'Username is already in use';
  end if;

  -- The live Auth trigger is expected to have created this profile already.
  -- Preserve its generated member_code and trigger-created wallet.
  update public.profiles
  set username = lower(btrim(p_username)),
      full_name = btrim(p_full_name),
      phone = nullif(btrim(coalesce(p_phone, '')), ''),
      role = v_activation.role,
      is_active = true
  where id = p_user_id
  returning member_code into v_member_code;

  if not found then
    raise exception 'Auth profile trigger did not create the expected profile';
  end if;

  update public.activation_codes
  set status = 'redeemed',
      used_at = now(),
      used_by = p_user_id,
      reserved_user_id = null,
      reserved_at = null
  where id = v_activation.id;

  return v_member_code;
end;
$;

revoke all on function public.complete_amanah_activation(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_amanah_activation(uuid, uuid, text, text, text)
  to service_role;

revoke all on function public.reserve_amanah_activation_code(text, uuid) from public, anon, authenticated;
revoke all on function public.release_amanah_activation_reservation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_amanah_activation_code(text, uuid) to service_role;
grant execute on function public.release_amanah_activation_reservation(uuid, uuid) to service_role;

commit;
