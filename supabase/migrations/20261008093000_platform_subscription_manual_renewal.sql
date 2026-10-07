-- Single source of truth for 30-day subscription renewal in customer and Super Admin.
-- Never mark a payment paid on behalf of the customer; a platform admin must explicitly confirm receipt.
create or replace function public.sc_platform_confirm_subscription_payment(
 p_school uuid,p_reference text,p_amount integer default 100000
) returns timestamptz language plpgsql security definer set search_path=public,pg_temp as $$
declare v_sub public.sc_subscriptions%rowtype;
        v_id text;v_start timestamptz;v_end timestamptz;v_exists boolean;
begin
 if not public.sc_is_platform_admin() then
  raise exception 'Akses Super Admin diperlukan' using errcode='42501';
 end if;
 if p_school is null or p_reference is null or length(p_reference) not between 12 and 90
    or p_reference !~ '^[A-Za-z0-9-]+$' then
  raise exception 'Referensi pembayaran tidak valid';
 end if;
 if p_amount<>100000 then
  raise exception 'Harga langganan bulanan tidak sesuai';
 end if;
 v_id:='ADMIN-'||p_reference;
 select * into v_sub from public.sc_subscriptions where school_id=p_school for update;
 if not found then raise exception 'Langganan sekolah tidak ditemukan'; end if;
 select exists(select 1 from public.sc_payment_orders where order_id=v_id and school_id=p_school and status='paid') into v_exists;
 if v_exists then return v_sub.current_period_end; end if;
 if exists(select 1 from public.sc_payment_orders where order_id=v_id) then
  raise exception 'Referensi pembayaran telah digunakan';
 end if;
 -- Active paid subscriptions extend from existing expiry; expired/temporary access restarts today.
 v_start:=case when v_sub.status='active' and v_sub.current_period_end>now()
   then v_sub.current_period_end else now() end;
 v_end:=v_start+interval '30 days';
 insert into public.sc_payment_orders(order_id,school_id,gross_amount,period_days,status,gateway_transaction_id,paid_at,created_at)
 values(v_id,p_school,p_amount,30,'paid','manual-admin-confirmation',now(),now());
 update public.sc_subscriptions
  set status='active',current_period_end=v_end,updated_at=now()
  where school_id=p_school;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
  values(p_school,auth.uid(),'subscription.manual_payment.confirmed',v_id,
    jsonb_build_object('amount',p_amount,'period_days',30,'period_start',v_start,'period_end',v_end,'method','confirmed_by_super_admin'));
 return v_end;
end $$;
revoke all on function public.sc_platform_confirm_subscription_payment(uuid,text,integer) from public,anon;
grant execute on function public.sc_platform_confirm_subscription_payment(uuid,text,integer) to authenticated;

-- Latest renewal is computed from the same verified/confirmed payment records displayed to schools.
create or replace function public.sc_platform_schools() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not public.sc_is_platform_admin() then raise exception 'Akses platform ditolak' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into result from (
  select s.id,s.name,s.created_at,s.is_internal_test,
   coalesce(sub.status,'none') as subscription_status,sub.trial_ends_at,sub.current_period_end,sub.updated_at,
   (select max(o.paid_at) from public.sc_payment_orders o where o.school_id=s.id and o.status='paid') as last_paid_at,
   (select count(*) from public.sc_members m where m.school_id=s.id) as member_count,
   (select count(*) from public.sc_students st where st.school_id=s.id) as student_count,
   (select coalesce(sum(o.gross_amount),0) from public.sc_payment_orders o where o.school_id=s.id and o.status='paid') as paid_amount
  from public.sc_schools s left join public.sc_subscriptions sub on sub.school_id=s.id
  order by s.created_at desc
 ) x;
 return result;
end $$;
revoke all on function public.sc_platform_schools() from public,anon;
grant execute on function public.sc_platform_schools() to authenticated;
