-- Apply migration 0004 to the disposable fixture and exercise the RPC.
\set ON_ERROR_STOP on
\ir ../../supabase/migrations/0004_secure_order_destinations.sql

do $$
declare
  v_result jsonb;
  v_items jsonb;
  v_dist uuid := '10000000-0000-4000-8000-000000000001';
  v_branch uuid := '10000000-0000-4000-8000-000000000004';
  v_stockist uuid := '10000000-0000-4000-8000-000000000006';
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', v_dist::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  -- Main-branch order: duplicate product lines are aggregated and priced
  -- server-side at the Distributor price; caller-supplied prices are ignored.
  v_items := jsonb_build_array(
    jsonb_build_object('product_id','20000000-0000-4000-8000-000000000001','quantity',2,'unit_price',9999),
    jsonb_build_object('product_id','20000000-0000-4000-8000-000000000001','quantity',3,'unit_price',0),
    jsonb_build_object('product_id','20000000-0000-4000-8000-000000000002','quantity',1,'unit_price',9999)
  );
  select public.submit_member_order(v_items,'main_branch',null,'  Test Contact  ','  09123456789  ','  Test Address  ')
    into v_result;
  if v_result->>'status' <> 'submitted' or (v_result->>'total')::numeric <> 54.25
     or (v_result->>'product_count')::integer <> 2 then
    raise exception 'Main-branch pricing/aggregation result was unexpected: %',v_result;
  end if;

  -- Destination checks: only active role-matched profiles with active locations.
  select public.submit_member_order(
    jsonb_build_array(jsonb_build_object('product_id','20000000-0000-4000-8000-000000000002','quantity',2)),
    'branch_operator',v_branch,null,null,null
  ) into v_result;
  if v_result->>'destination_name' <> 'Test Branch Operator' then
    raise exception 'Branch Operator destination validation/result failed: %',v_result;
  end if;

  select public.submit_member_order(
    jsonb_build_array(jsonb_build_object('product_id','20000000-0000-4000-8000-000000000002','quantity',1)),
    'mobile_stockist',v_stockist,null,null,null
  ) into v_result;
  if v_result->>'destination_name' <> 'Test Mobile Stockist' then
    raise exception 'Mobile Stockist destination validation/result failed: %',v_result;
  end if;

  -- Expected validation failures.
  begin
    perform public.submit_member_order('[]'::jsonb,'invalid',null,null,null,null);
    raise exception 'Invalid destination category unexpectedly accepted';
  exception when others then
    if sqlerrm = 'Invalid destination category unexpectedly accepted' then raise; end if;
  end;
  begin
    perform public.submit_member_order('[]'::jsonb,'branch_operator',null,null,null,null);
    raise exception 'Missing destination member unexpectedly accepted';
  exception when others then
    if sqlerrm = 'Missing destination member unexpectedly accepted' then raise; end if;
  end;
  begin
    perform public.submit_member_order('[]'::jsonb,'branch_operator','10000000-0000-4000-8000-000000000005',null,null,null);
    raise exception 'Inactive stock location unexpectedly accepted';
  exception when others then
    if sqlerrm = 'Inactive stock location unexpectedly accepted' then raise; end if;
  end;
  begin
    perform public.submit_member_order('[]'::jsonb,'mobile_stockist',v_branch,null,null,null);
    raise exception 'Role-mismatched destination unexpectedly accepted';
  exception when others then
    if sqlerrm = 'Role-mismatched destination unexpectedly accepted' then raise; end if;
  end;
  begin
    perform public.submit_member_order('[]'::jsonb,'main_branch',null,'','09123456789','Address');
    raise exception 'Missing main-branch contact unexpectedly accepted';
  exception when others then
    if sqlerrm = 'Missing main-branch contact unexpectedly accepted' then raise; end if;
  end;
  begin
    perform public.submit_member_order('[]'::jsonb,'main_branch',null,'Contact','Phone','Address');
    raise exception 'Empty cart unexpectedly accepted';
  exception when others then
    if sqlerrm = 'Empty cart unexpectedly accepted' then raise; end if;
  end;
  begin
    perform public.submit_member_order(jsonb_build_array(jsonb_build_object('product_id','20000000-0000-4000-8000-000000000003','quantity',1)),'main_branch',null,'Contact','Phone','Address');
    raise exception 'Inactive product unexpectedly accepted';
  exception when others then
    if sqlerrm = 'Inactive product unexpectedly accepted' then raise; end if;
  end;
  begin
    perform public.submit_member_order(jsonb_build_array(jsonb_build_object('product_id','20000000-0000-4000-8000-000000000002','quantity',0)),'main_branch',null,'Contact','Phone','Address');
    raise exception 'Zero quantity unexpectedly accepted';
  exception when others then
    if sqlerrm = 'Zero quantity unexpectedly accepted' then raise; end if;
  end;
  begin
    perform public.submit_member_order(jsonb_build_array(jsonb_build_object('product_id','20000000-0000-4000-8000-000000000002','quantity',1001)),'main_branch',null,'Contact','Phone','Address');
    raise exception 'Over-limit quantity unexpectedly accepted';
  exception when others then
    if sqlerrm = 'Over-limit quantity unexpectedly accepted' then raise; end if;
  end;

  -- Profile authorization uses the database profile, not a caller role claim.
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
  begin
    perform public.submit_member_order(jsonb_build_array(jsonb_build_object('product_id','20000000-0000-4000-8000-000000000002','quantity',1)),'main_branch',null,'Contact','Phone','Address');
    raise exception 'Administrator unexpectedly submitted member order';
  exception when others then
    if sqlerrm = 'Administrator unexpectedly submitted member order' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  begin
    perform public.submit_member_order(jsonb_build_array(jsonb_build_object('product_id','20000000-0000-4000-8000-000000000002','quantity',1)),'main_branch',null,'Contact','Phone','Address');
    raise exception 'Inactive Distributor unexpectedly submitted order';
  exception when others then
    if sqlerrm = 'Inactive Distributor unexpectedly submitted order' then raise; end if;
  end;
end $$;

reset role;

do $$
begin
  if (select count(*) from public.orders) <> 3 then
    raise exception 'Expected exactly 3 accepted orders; found %',(select count(*) from public.orders);
  end if;
  if (select count(*) from public.order_items) <> 4 then
    raise exception 'Expected four aggregated order items; found %',(select count(*) from public.order_items);
  end if;
  if exists(select 1 from public.orders where payment_method <> 'Pending - no payment collected' or status <> 'submitted') then
    raise exception 'Order submission unexpectedly changed payment/status semantics';
  end if;
  if exists(select 1 from public.order_items where quantity not between 1 and 1000) then
    raise exception 'Invalid quantity persisted';
  end if;
  if has_function_privilege('anon','public.submit_member_order(jsonb,text,uuid,text,text,text)','EXECUTE') then
    raise exception 'anon unexpectedly has execute permission on submit_member_order';
  end if;
end $$;

select 'order submission tests passed' as result;
