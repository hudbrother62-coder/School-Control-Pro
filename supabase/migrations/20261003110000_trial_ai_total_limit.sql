-- Trial is a total allowance; crossing calendar months must not renew it.
insert into public.sc_ai_usage(school_id,period,requests)
select u.school_id,'trial',sum(u.requests)::integer from public.sc_ai_usage u join public.sc_subscriptions s on s.school_id=u.school_id
where s.status='trial' and u.period<>'trial' group by u.school_id on conflict(school_id,period) do nothing;
create or replace function public.sc_consume_ai_budget(p_school uuid,p_module text) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_status text;v_limit integer;v_count integer;v_period text;
begin
 if not public.sc_module_access(p_school,p_module) or p_module not in ('guru_ai','kepsek_ai') then raise exception 'Akses AI tidak diizinkan';end if;
 if not public.sc_write_active(p_school) then raise exception 'Masa langganan tidak aktif';end if;
 select status into v_status from public.sc_subscriptions where school_id=p_school;
 v_limit=case when v_status='trial' then 15 else 200 end;
 v_period=case when v_status='trial' then 'trial' else to_char(now() at time zone 'UTC','YYYY-MM') end;
 insert into public.sc_ai_usage(school_id,period,requests) values(p_school,v_period,1)
 on conflict(school_id,period) do update set requests=public.sc_ai_usage.requests+1
 where public.sc_ai_usage.requests<v_limit returning requests into v_count;
 if v_count is null then raise exception 'Kuota permintaan AI periode ini telah habis';end if;
 return v_count;
end; $$;
revoke all on function public.sc_consume_ai_budget(uuid,text) from public,anon;
grant execute on function public.sc_consume_ai_budget(uuid,text) to authenticated;
