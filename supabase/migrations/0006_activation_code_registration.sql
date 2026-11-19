-- One-time activation inventory and redemption for AMANAH.
-- Apply only after reviewing against the live schema. No live database changes are made by this commit.

create table if not exists public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  role public.amanah_role not null,
  status text not null default 'issued' check (status in ('issued','reserved','redeemed','revoked')),
  issued_by uuid references public.profiles(id) on delete restrict,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  reserved_user_id uuid,
  reserved_at timestamptz,
  redeemed_by uuid references public.profiles(id) on delete restrict,
  redeemed_at timestamptz,
  constraint activation_reservation_consistency check (
    (status = 'reserved' and reserved_user_id is not null and reserved_at is not null)
    or (status <> 'reserved' and reserved_user_id is null and reserved_at is null)
  )
);

create index if not exists activation_codes_status_issued_idx
  on public.activation_codes(status, issued_at desc);

alter table public.activation_codes enable row level security;
revoke all on public.activation_codes from anon, authenticated, public;
grant select, insert, update on public.activation_codes to service_role;

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
  v_activation public.activation_codes%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Trusted AMANAH registration service required' using errcode = '42501';
  end if;
  select * into v_activation
  from public.activation_codes
  where code_hash = p_code_hash
  for update;
  if not found or v_activation.status <> 'issued'
     or (v_activation.expires_at is not null and v_activation.expires_at <= now()) then
    raise exception 'Activation code is invalid, expired, or already used';
  end if;
  update public.activation_codes
  set status = 'reserved', reserved_user_id = p_user_id, reserved_at = now()
  where id = v_activation.id;
  return query select v_activation.id, v_activation.role::text;
end;
$$;

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
as $$
declare
  v_activation public.activation_codes%rowtype;
  v_role text;
  v_member_code text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Trusted AMANAH registration service required' using errcode = '42501';
  end if;
  select * into v_activation
  from public.activation_codes
  where id = p_activation_id
  for update;
  if not found or v_activation.status <> 'reserved'
     or v_activation.reserved_user_id <> p_user_id
     or v_activation.reserved_at < now() - interval '15 minutes' then
    raise exception 'Activation reservation is invalid or expired';
  end if;
  if exists (select 1 from public.profiles where id = p_user_id)
     or exists (select 1 from public.profiles where lower(username) = lower(p_username)) then
    raise exception 'Account or username already exists';
  end if;

  v_role := v_activation.role::text;
  v_member_code := public.generate_amanah_member_code(v_role);

  insert into public.profiles(id, member_code, full_name, phone, role, is_active, username)
  values (p_user_id, v_member_code, p_full_name, nullif(p_phone, ''), v_activation.role, true, lower(p_username));

  update public.activation_codes
  set status = 'redeemed', reserved_user_id = null, reserved_at = null,
      redeemed_by = p_user_id, redeemed_at = now()
  where id = v_activation.id;

  return v_member_code;
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
  update public.activation_codes
  set status = 'issued', reserved_user_id = null, reserved_at = null
  where id = p_activation_id and status = 'reserved' and reserved_user_id = p_user_id;
end;
$$;

revoke all on function public.reserve_amanah_activation_code(text, uuid) from public, anon, authenticated;
revoke all on function public.complete_amanah_activation(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.release_amanah_activation_reservation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_amanah_activation_code(text, uuid) to service_role;
grant execute on function public.complete_amanah_activation(uuid, uuid, text, text, text) to service_role;
grant execute on function public.release_amanah_activation_reservation(uuid, uuid) to service_role;
