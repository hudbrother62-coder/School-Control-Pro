-- School-facing unified ledger for Super Admin-confirmed renewals and gateway records.
-- Accessible only to owner/principal of the specific school, including after access expiration.
create or replace function public.sc_school_subscription_history(p_school uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(
   select 1 from public.sc_members m
   where m.school_id=p_school and m.user_id=auth.uid()
     and m.role in ('owner','principal') and m.is_active
 ) then
  raise exception 'Akses riwayat langganan ditolak' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
 into result from (
   select r.confirmed_at as created_at,r.confirmed_at as paid_at,
     'ADMIN-'||r.confirmation_ref as order_id,
     null::integer as gross_amount,30::integer as period_days,'paid'::text as status,
     'manual'::text as source,r.period_end
   from public.sc_platform_renewals r where r.school_id=p_school
   union all
   select o.created_at,o.paid_at,o.order_id,o.gross_amount,o.period_days,o.status,
     case when o.order_id like 'ADMIN-%' then 'manual' else 'gateway' end as source,
     null::timestamptz as period_end
   from public.sc_payment_orders o where o.school_id=p_school
   order by created_at desc limit 100
 ) x;
 return result;
end $$;
revoke all on function public.sc_school_subscription_history(uuid) from public,anon;
grant execute on function public.sc_school_subscription_history(uuid) to authenticated;
