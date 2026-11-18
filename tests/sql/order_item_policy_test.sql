-- Behavioral checks after applying 0008 to the disposable fixture.
set role authenticated;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.order_items;
  if v_count <> 1 then raise exception 'Buyer should see exactly their own order item; saw %', v_count; end if;
end
$$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.order_items;
  if v_count <> 1 then raise exception 'Fulfillment user should see assigned order item; saw %', v_count; end if;
end
$$;

select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.order_items;
  if v_count <> 1 then raise exception 'Sponsor should see downline order item; saw %', v_count; end if;
end
$$;

select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777777', false);
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.order_items;
  if v_count <> 0 then raise exception 'Unrelated member must see no order items; saw %', v_count; end if;
end
$$;

select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', false);
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.order_items;
  if v_count <> 4 then raise exception 'Administrator should see all four order items; saw %', v_count; end if;
end
$$;

-- No authenticated identity should see any order item.
select set_config('request.jwt.claim.sub', '', false);
do $authcheck$
declare v_count integer;
begin
  select count(*) into v_count from public.order_items;
  if v_count <> 0 then raise exception 'Unauthenticated user must see no order items; saw %', v_count; end if;
end
$authcheck$;

reset role;

-- The anon role must not receive table-level SELECT privileges.
do $grantcheck$
begin
  if has_table_privilege('anon', 'public.order_items', 'SELECT') then
    raise exception 'anon unexpectedly has SELECT privilege on order_items';
  end if;
end
$grantcheck$;
