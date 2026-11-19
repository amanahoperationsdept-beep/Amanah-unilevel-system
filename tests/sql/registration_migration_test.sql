-- Run only in the disposable PostgreSQL CI database.
\set ON_ERROR_STOP on

-- Apply the real forward-only migration under the database owner.
\ir ../../supabase/migrations/0007_activation_code_reservation_expiry.sql

-- Seed a pre-existing legacy-format role code to verify collision skipping.
insert into auth.users(id,raw_user_meta_data)
values ('00000002-0000-4000-8000-000000000002','{"full_name":"Legacy Member"}');
update public.profiles set member_code='DS0001', username='legacy.member'
where id='00000002-0000-4000-8000-000000000002';

-- Auth trigger must create exactly one profile and one wallet per user.
insert into auth.users(id,raw_user_meta_data)
values ('00000010-0000-4000-8000-000000000010','{"full_name":"New Distributor"}'),
       ('00000011-0000-4000-8000-000000000011','{"full_name":"New Stockist"}'),
       ('00000012-0000-4000-8000-000000000012','{"full_name":"New Branch Operator"}'),
       ('00000013-0000-4000-8000-000000000013','{"full_name":"New Marketing Officer"}'),
       ('00000014-0000-4000-8000-000000000014','{"full_name":"New Stockist"}');

do $$
begin
  if (select count(*) from public.profiles where id in (
    '00000010-0000-4000-8000-000000000010','00000011-0000-4000-8000-000000000011',
    '00000012-0000-4000-8000-000000000012','00000013-0000-4000-8000-000000000013','00000014-0000-4000-8000-000000000014')) <> 5 then
    raise exception 'Auth trigger did not create all expected profiles';
  end if;
  if (select count(*) from public.wallets where member_id in (
    '00000010-0000-4000-8000-000000000010','00000011-0000-4000-8000-000000000011',
    '00000012-0000-4000-8000-000000000012','00000013-0000-4000-8000-000000000013','00000014-0000-4000-8000-000000000014')) <> 5 then
    raise exception 'Auth trigger did not create all expected wallets';
  end if;
end $$;

insert into public.activation_codes(code_hash,batch_id,created_by,expires_at,role)
values
 (repeat('a',64),gen_random_uuid(),'00000001-0000-4000-8000-000000000001',now()+interval '1 day','distributor'),
 (repeat('b',64),gen_random_uuid(),'00000001-0000-4000-8000-000000000001',now()+interval '1 day','mobile_stockist'),
 (repeat('c',64),gen_random_uuid(),'00000001-0000-4000-8000-000000000001',now()+interval '1 day','branch_operator'),
 (repeat('d',64),gen_random_uuid(),'00000001-0000-4000-8000-000000000001',now()+interval '1 day','marketing_officer'),
 (repeat('e',64),gen_random_uuid(),'00000001-0000-4000-8000-000000000001',now()-interval '1 second','distributor'),
 (repeat('f',64),gen_random_uuid(),'00000001-0000-4000-8000-000000000001',now()+interval '1 day','mobile_stockist');

set request.jwt.claim.role = 'service_role';
set role service_role;

do $$
declare v_id uuid; v_role text; v_code text;
begin
  select activation_id,assigned_role into v_id,v_role
  from public.reserve_amanah_activation_code(repeat('a',64),'00000010-0000-4000-8000-000000000010');
  if v_role <> 'distributor' then raise exception 'Reservation did not return assigned distributor role'; end if;

  -- Active lease cannot be stolen.
  begin
    perform * from public.reserve_amanah_activation_code(repeat('a',64),'00000011-0000-4000-8000-000000000011');
    raise exception 'Active reservation was incorrectly stolen';
  exception when raise_exception then
    if sqlerrm = 'Active reservation was incorrectly stolen' then raise; end if;
  end;

  -- Wrong owner cannot release another user's reservation.
  perform public.release_amanah_activation_reservation(v_id,'00000011-0000-4000-8000-000000000011');
  if not exists(select 1 from public.activation_codes where id=v_id and status='reserved'
    and reserved_user_id='00000010-0000-4000-8000-000000000010') then
    raise exception 'Reservation owner check failed';
  end if;

  -- Correct owner can release, then reserve again.
  perform public.release_amanah_activation_reservation(v_id,'00000010-0000-4000-8000-000000000010');
  select activation_id into v_id from public.reserve_amanah_activation_code(
    repeat('a',64),'00000010-0000-4000-8000-000000000010');

  -- Expired lease is reclaimable by a new user.
  update public.activation_codes set reserved_at=now()-interval '16 minutes' where id=v_id;
  select activation_id into v_id from public.reserve_amanah_activation_code(
    repeat('a',64),'00000011-0000-4000-8000-000000000011');
  if not exists(select 1 from public.activation_codes where id=v_id
    and reserved_user_id='00000011-0000-4000-8000-000000000011') then
    raise exception 'Stale reservation was not reclaimed';
  end if;

  -- Completion updates the Auth-trigger-created profile, preserving wallet.
  v_code := public.complete_amanah_activation(v_id,'00000011-0000-4000-8000-000000000011',
    'new.distributor','New Distributor',null);
  if v_code <> 'DS0002' then raise exception 'Unexpected distributor code / legacy collision handling: %',v_code; end if;
  if not exists(select 1 from public.profiles where id='00000011-0000-4000-8000-000000000011'
    and member_code='DS0002' and role='distributor' and username='new.distributor') then
    raise exception 'Completion did not update the trigger-created profile correctly';
  end if;
  if not exists(select 1 from public.wallets where member_id='00000011-0000-4000-8000-000000000011') then
    raise exception 'Completion lost the trigger-created wallet';
  end if;
  if not exists(select 1 from public.activation_codes where id=v_id and status='redeemed'
    and used_by='00000011-0000-4000-8000-000000000011' and used_at is not null
    and reserved_user_id is null and reserved_at is null) then
    raise exception 'Completion did not atomically redeem and clear reservation';
  end if;

  -- Legacy DS0001 collision is skipped; generated code starts at DS0002.
  select activation_id into v_id from public.reserve_amanah_activation_code(
    repeat('b',64),'00000014-0000-4000-8000-000000000014');
  v_code := public.complete_amanah_activation(v_id,'00000014-0000-4000-8000-000000000014',
    'new.stockist','New Stockist',null);
  if v_code <> 'MS0001' then raise exception 'Unexpected stockist code: %',v_code; end if;

  select activation_id into v_id from public.reserve_amanah_activation_code(
    repeat('c',64),'00000012-0000-4000-8000-000000000012');
  v_code := public.complete_amanah_activation(v_id,'00000012-0000-4000-8000-000000000012',
    'new.branch','New Branch Operator',null);
  if v_code <> 'BO0001' then raise exception 'Unexpected branch code: %',v_code; end if;

  select activation_id into v_id from public.reserve_amanah_activation_code(
    repeat('d',64),'00000013-0000-4000-8000-000000000013');
  v_code := public.complete_amanah_activation(v_id,'00000013-0000-4000-8000-000000000013',
    'new.marketing','New Marketing Officer',null);
  if v_code <> 'MO0001' then raise exception 'Unexpected marketing code: %',v_code; end if;

  -- Expired unused code is marked expired and cannot be reserved.
  if exists(select 1 from public.reserve_amanah_activation_code(
    repeat('e',64),'00000010-0000-4000-8000-000000000010')) then
    raise exception 'Expired code unexpectedly reserved';
  end if;
  if not exists(select 1 from public.activation_codes where code_hash=repeat('e',64)
    and status='expired') then raise exception 'Expired code was not marked expired'; end if;

  -- Duplicate case-insensitive username must fail without redeeming the code.
  select activation_id into v_id from public.reserve_amanah_activation_code(
    repeat('f',64),'00000010-0000-4000-8000-000000000010');
  begin
    perform public.complete_amanah_activation(v_id,'00000010-0000-4000-8000-000000000010',
      'NEW.STOCKIST','Duplicate Username',null);
    raise exception 'Duplicate username was incorrectly accepted';
  exception when raise_exception then
    if sqlerrm = 'Duplicate username was incorrectly accepted' then raise; end if;
  end;
  if not exists(select 1 from public.activation_codes where id=v_id and status='reserved') then
    raise exception 'Failed completion unexpectedly redeemed activation code';
  end if;
end $$;

reset role;

-- Advance the sequence as its owner, then test the SECURITY DEFINER allocator
-- at the first value beyond the four-digit boundary.
select setval('public.amanah_ds_code_seq',9999,true);
set request.jwt.claim.role = 'service_role';
set role service_role;
do $$
declare v_code text;
begin
  v_code := public.generate_amanah_member_code('distributor');
  if v_code <> 'DS10000' then raise exception 'Allocator truncated >9999: %',v_code; end if;
end $$;
reset role;

-- Execute privilege must remain unavailable to anon/authenticated.
set role anon;
do $$
begin
  begin
    perform * from public.reserve_amanah_activation_code(repeat('a',64),'00000010-0000-4000-8000-000000000010');
    raise exception 'anon unexpectedly executed reservation RPC';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'registration migration tests passed' as result;
