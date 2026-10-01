create or replace function public.sc_create_school(p_name text) returns uuid
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_school uuid;
 begin
  if auth.uid() is null then raise exception 'Login diperlukan'; end if;
  if length(trim(p_name)) not between 3 and 120 then raise exception 'Nama sekolah tidak valid'; end if;
  insert into public.sc_schools(name,created_by) values(trim(p_name),auth.uid()) returning id into v_school;
  insert into public.sc_members(school_id,user_id,role) values(v_school,auth.uid(),'owner');
  insert into public.sc_subscriptions(school_id,status,trial_ends_at) values(v_school,'trial',now()+interval '7 days');
  insert into public.sc_audit_log(school_id,actor_id,action,metadata)
   values(v_school,auth.uid(),'school.created',jsonb_build_object('trial_days',7));
  return v_school;
 end $$;

revoke all on function public.sc_create_school(text) from public, anon;
grant execute on function public.sc_create_school(text) to authenticated;
