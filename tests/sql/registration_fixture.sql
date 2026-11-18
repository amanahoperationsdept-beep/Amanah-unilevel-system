-- Disposable PostgreSQL fixture approximating only the audited Supabase
-- registration contract. Never point this test at a hosted/live database.
do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema auth;
create type public.amanah_role as enum (
  'administrator','marketing_officer','branch_operator','mobile_stockist','distributor'
);

create table auth.users (
  id uuid primary key,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create or replace function auth.role()
returns text language sql stable
as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  member_code text unique,
  full_name text not null default '',
  phone text,
  role public.amanah_role not null default 'distributor',
  sponsor_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  username text
);
create unique index profiles_username_lower_uidx
  on public.profiles(lower(username)) where username is not null;

create table public.wallets (
  member_id uuid primary key references public.profiles(id) on delete cascade
);

create table public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  batch_id uuid not null,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.activation_codes enable row level security;
grant all on public.profiles, public.activation_codes, public.wallets to service_role;

create or replace function public.handle_new_amanah_user()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_sponsor_id uuid; v_sponsor_code text;
begin
  v_sponsor_code := nullif(trim(new.raw_user_meta_data ->> 'sponsor_code'), '');
  if v_sponsor_code is not null then
    select id into v_sponsor_id from public.profiles
    where member_code=v_sponsor_code and is_active=true limit 1;
  end if;
  insert into public.profiles(id,full_name,phone,member_code,role,sponsor_id)
  values(new.id,coalesce(new.raw_user_meta_data ->> 'full_name',''),
    new.raw_user_meta_data ->> 'phone',
    'AM-' || upper(substr(replace(new.id::text,'-',''),1,8)),
    'distributor',v_sponsor_id)
  on conflict(id) do nothing;
  insert into public.wallets(member_id) values(new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created_amanah
after insert on auth.users for each row
execute function public.handle_new_amanah_user();

-- The migration expects the live inventory to be empty at installation.
insert into auth.users(id,raw_user_meta_data)
values ('00000000-0000-4000-8000-000000000001','{"full_name":"Test Admin"}');
