-- Confirm failed migration transaction leaves the original unsafe policy intact.
do $rollbackcheck$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_items'
      and policyname = 'order_items_select_related'
      and qual not ilike '%buyer_id%'
  ) then
    raise exception 'Failed migration did not roll back the original child policy';
  end if;
end
$rollbackcheck$;
