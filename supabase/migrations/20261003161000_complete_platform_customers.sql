create or replace function public.sc_platform_schools() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not public.sc_is_platform_admin() then raise exception 'Akses platform ditolak' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into result from (
  select s.id,s.name,s.created_at,s.is_internal_test,
   coalesce(sub.status,'none') as subscription_status,sub.trial_ends_at,sub.current_period_end,sub.updated_at,
   (select count(*) from public.sc_members m where m.school_id=s.id) as member_count,
   (select count(*) from public.sc_students st where st.school_id=s.id) as student_count,
   (select coalesce(sum(o.gross_amount),0) from public.sc_payment_orders o where o.school_id=s.id and o.status='paid') as paid_amount
  from public.sc_schools s left join public.sc_subscriptions sub on sub.school_id=s.id
  order by s.created_at desc
 ) x;
 return result;
end $$;

