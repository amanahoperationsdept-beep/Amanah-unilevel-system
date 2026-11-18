-- A1.2/A1.3 forward-only activation-code lifecycle draft.
-- Targets the audited live activation_codes table; NOT a replay of migration 0006.
-- Do not execute until the live schema, enum values, trigger and profile columns
-- have been freshly rechecked, the migration has passed PostgreSQL tests, and
-- the owner has explicitly approved a controlled live change.

begin;

do $$
declare
  v_count bigint;
  v_role_count integer;
begin
  if to_regclass('public.activation_codes') is null then
    raise exception 'Expected existing public.activation_codes table; aborting safely';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='activation_codes' and column_name='code_hash')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='activation_codes' and column_name='batch_id')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='activation_codes' and column_name='created_by')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='activation_codes' and column_name='expires_at')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='activation_codes' and column_name='used_at')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='activation_codes' and column_name='used_by') then
    raise exception 'Live activation_codes columns differ from the audited contract; aborting safely';
  end if;
  select count(*) into v_count from public.activation_codes;
  if v_count <> 0 then
    raise exception 'activation_codes is not empty; manually reconcile existing rows before applying A1.2 (rows=%)', v_count;
  end if;
  if to_regtype('public.amanah_role') is null then
    raise exception 'Expected public.amanah_role enum; aborting safely';
  end if;
  if to_regclass('public.profiles') is null then
    raise exception 'Expected public.profiles table; aborting safely';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='member_code')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='full_name')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='phone')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='is_active')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='username') then
    raise exception 'Live profiles columns differ from the audited registration contract; aborting safely';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid='public.profiles'::regclass
      and contype='u' and pg_catalog.pg_get_constraintdef(oid)='UNIQUE (member_code)'
  ) then
    raise exception 'Expected unique public.profiles(member_code) constraint; aborting safely';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_index
    where indexrelid=to_regclass('public.profiles_username_lower_uidx')
      and indisunique
  ) then
    raise exception 'Expected unique case-insensitive profiles username index; aborting safely';
  end if;
  select count(*) into v_role_count
  from pg_catalog.pg_enum e
  where e.enumtypid='public.amanah_role'::regtype
    and e.enumlabel in ('distributor','mobile_stockist','branch_operator','marketing_officer');
  if v_role_count <> 4 then
    raise exception 'Live amanah_role enum is missing a registration role; aborting safely';
  end if;

  -- Hold an exclusive lock from the row-count precondition through COMMIT.
  -- This closes the race where an issuance could insert a row after the
  -- empty-table check but before the NOT NULL role column is added.
  execute 'lock table public.activation_codes in access exclusive mode';
  select count(*) into v_count from public.activation_codes;
  if v_count <> 0 then
    raise exception 'activation_codes is not empty; manually reconcile existing rows before applying A1.2 (rows=%)', v_count;
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
  if v_code.expires_at is null or v_code.expires_at <= now() then
    update public.activation_codes
    set status='expired', reserved_user_id=null, reserved_at=null
    where id=v_code.id;
    return;
  end if;

  if v_code.status='reserved' then
    if v_code.reserved_at is null or v_code.reserved_at > now() - interval '15 minutes' then
      raise exception 'Activation code is currently being used';
    end if;
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
  set status = case when expires_at <= now() then 'expired' else 'issued' end,
      reserved_user_id = null,
      reserved_at = null
  where id = p_activation_id
    and status = 'reserved'
    and reserved_user_id = p_user_id
    and used_at is null;
end;
$$;


-- Role-specific code allocator. Existing AM-/legacy codes are preserved; if a
-- generated candidate collides with one, the allocator advances the sequence.
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
  v_prefix text;
  v_sequence regclass;
  v_candidate text;
  v_next bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Trusted AMANAH activation service required' using errcode = '42501';
  end if;

  case pg_catalog.lower(pg_catalog.btrim(coalesce(p_role, '')))
    when 'distributor' then v_prefix := 'DS'; v_sequence := 'public.amanah_ds_code_seq'::regclass;
    when 'mobile_stockist' then v_prefix := 'MS'; v_sequence := 'public.amanah_ms_code_seq'::regclass;
    when 'branch_operator' then v_prefix := 'BO'; v_sequence := 'public.amanah_bo_code_seq'::regclass;
    when 'marketing_officer' then v_prefix := 'MO'; v_sequence := 'public.amanah_mo_code_seq'::regclass;
    else raise exception 'Unsupported AMANAH registration role';
  end case;

  loop
    -- Keep at least four digits without truncating values above 9999.
    -- lpad(text, 4, ...) truncates longer inputs in PostgreSQL.
    v_next := pg_catalog.nextval(v_sequence);
    v_candidate := v_prefix || pg_catalog.lpad(
      v_next::text,
      case
        when pg_catalog.length(v_next::text) > 4 then pg_catalog.length(v_next::text)
        else 4
      end,
      '0'
    );
    exit when not exists (
      select 1 from public.profiles p
      where pg_catalog.upper(p.member_code) = v_candidate
    );
  end loop;
  return v_candidate;
end;
$$;

revoke all on function public.generate_amanah_member_code(text) from public, anon, authenticated;
grant execute on function public.generate_amanah_member_code(text) to service_role;

-- The existing Auth trigger creates the initial profile and wallet. This RPC
-- updates that profile rather than inserting a duplicate. The member code is
-- assigned from the activation role by the guarded role-specific allocator.
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
  v_member_code text;
  v_new_member_code text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Trusted AMANAH registration service required' using errcode = '42501';
  end if;
  if p_activation_id is null or p_user_id is null
     or p_username is null or lower(btrim(p_username)) !~ '^[a-z0-9._-]{3,32}$'
     or p_full_name is null or length(btrim(p_full_name)) < 2
     or length(btrim(p_full_name)) > 120
     or length(coalesce(p_phone, '')) > 40 then
    raise exception 'Invalid registration details';
  end if;

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

  v_new_member_code := public.generate_amanah_member_code(v_activation.role::text);

  update public.profiles
  set member_code = v_new_member_code,
      username = lower(btrim(p_username)),
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
$$;

revoke all on function public.reserve_amanah_activation_code(text, uuid) from public, anon, authenticated;
revoke all on function public.release_amanah_activation_reservation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.complete_amanah_activation(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.reserve_amanah_activation_code(text, uuid) to service_role;
grant execute on function public.release_amanah_activation_reservation(uuid, uuid) to service_role;
grant execute on function public.complete_amanah_activation(uuid, uuid, text, text, text) to service_role;

commit;
