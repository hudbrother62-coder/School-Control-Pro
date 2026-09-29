-- Add bounded AI requests and atomic, idempotent payment activation.
create table if not exists public.sc_ai_usage (
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 period text not null,
 requests integer not null default 0 check(requests>=0),
 primary key(school_id,user_id,period)
);
alter table public.sc_ai_usage enable row level security;
create policy sc_ai_usage_read on public.sc_ai_usage for select to authenticated using(user_id=auth.uid() or public.sc_manager(school_id));
revoke all on public.sc_ai_usage from anon,authenticated;
grant select on public.sc_ai_usage to authenticated;

create or replace function public.sc_consume_ai_budget(p_school uuid,p_module text) returns integer
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_status text;v_limit integer;v_count integer;v_period text;
 begin
  if not public.sc_module_access(p_school,p_module) or p_module not in ('guru_ai','kepsek_ai') then raise exception 'Akses AI tidak diizinkan';end if;
  if not public.sc_write_active(p_school) then raise exception 'Masa langganan tidak aktif';end if;
  select status into v_status from public.sc_subscriptions where school_id=p_school;
  v_limit:=case when v_status='trial' then 15 else 200 end;
  v_period:=to_char(now() at time zone 'UTC','YYYY-MM');
  insert into public.sc_ai_usage(school_id,user_id,period,requests) values(p_school,auth.uid(),v_period,1)
   on conflict(school_id,user_id,period) do update set requests=public.sc_ai_usage.requests+1
   where public.sc_ai_usage.requests<v_limit returning requests into v_count;
  if v_count is null then raise exception 'Kuota permintaan AI periode ini telah habis';end if;
  return v_count;
 end $$;
revoke all on function public.sc_consume_ai_budget(uuid,text) from public;
grant execute on function public.sc_consume_ai_budget(uuid,text) to authenticated;

create or replace function public.sc_confirm_payment(p_order_id text,p_amount integer,p_gateway_tx text) returns boolean
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_order public.sc_payment_orders%rowtype;
 begin
  if current_user <> 'service_role' and auth.role()<>'service_role' then raise exception 'Forbidden';end if;
  select * into v_order from public.sc_payment_orders where order_id=p_order_id for update;
  if not found or v_order.gross_amount<>p_amount then raise exception 'Pesanan atau nominal tidak cocok';end if;
  if v_order.status='paid' then return true;end if;
  if v_order.status<>'pending' then raise exception 'Pesanan tidak dapat dikonfirmasi';end if;
  update public.sc_payment_orders set status='paid',gateway_transaction_id=p_gateway_tx,paid_at=now() where order_id=p_order_id;
  update public.sc_subscriptions set status='active',
   current_period_end=greatest(now(),coalesce(current_period_end,now()))+make_interval(days=>v_order.period_days),
   updated_at=now() where school_id=v_order.school_id;
  insert into public.sc_audit_log(school_id,action,target_id,metadata)
   values(v_order.school_id,'subscription.payment.confirmed',p_order_id,jsonb_build_object('amount',p_amount,'days',v_order.period_days));
  return true;
 end $$;
revoke all on function public.sc_confirm_payment(text,integer,text) from public,anon,authenticated;
grant execute on function public.sc_confirm_payment(text,integer,text) to service_role;
