CREATE OR REPLACE FUNCTION public.sc_reconcile_payment(p_order_id text, p_amount integer, p_gateway_tx text, p_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_order public.sc_payment_orders%rowtype;
 v_new text;
begin
 if current_user <> 'service_role' and auth.role()<>'service_role' then
   raise exception 'Forbidden';
 end if;
 if p_status not in ('pending','paid','failed','expired') then
   raise exception 'Status pembayaran tidak valid';
 end if;

 select * into v_order from public.sc_payment_orders where order_id=p_order_id for update;
 if not found then raise exception 'Pesanan tidak ditemukan'; end if;
 if v_order.gross_amount<>p_amount then raise exception 'Nominal pembayaran tidak cocok'; end if;

 if v_order.status='paid' then return true; end if;
 v_new:=p_status;

 update public.sc_payment_orders
 set status=v_new,
     gateway_transaction_id=case when nullif(p_gateway_tx,'') is not null then p_gateway_tx else gateway_transaction_id end,
     paid_at=case when v_new='paid' then coalesce(paid_at,now()) else paid_at end
 where order_id=p_order_id;

 if v_new='paid' then
   update public.sc_subscriptions
   set status='active',
       current_period_end=greatest(now(),coalesce(current_period_end,trial_ends_at))
          + make_interval(days=>v_order.period_days),
       updated_at=now()
   where school_id=v_order.school_id;
 end if;

 insert into public.sc_audit_log(school_id,action,target_id,metadata)
 values(
   v_order.school_id,
   case v_new
     when 'paid' then 'subscription.payment.confirmed'
     when 'expired' then 'subscription.payment.expired'
     when 'failed' then 'subscription.payment.failed'
     else 'subscription.payment.pending'
   end,
   p_order_id,
   jsonb_build_object('amount',p_amount,'days',v_order.period_days,'gateway_transaction_id',nullif(p_gateway_tx,''))
 );
 return true;
end $function$
;
revoke all on function public.sc_reconcile_payment(text,integer,text,text) from public, anon, authenticated;
grant execute on function public.sc_reconcile_payment(text,integer,text,text) to service_role;
