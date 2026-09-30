-- Safe edit helpers for pending HR/performance workflow records.
create or replace function public.sc_update_auxiliary(
  p_school uuid,p_entity text,p_id uuid,p_patch jsonb
) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare r text:=public.sc_role(p_school);
begin
 if not public.sc_write_active(p_school) then raise exception 'Langganan tidak aktif'; end if;

 case p_entity
  when 'staff_event' then
   if not exists(
    select 1 from public.sc_staff_events
    where id=p_id and school_id=p_school and verified_at is null
      and (created_by=auth.uid() or public.sc_manager(p_school) or r='hr')
   ) then raise exception 'Bukti sudah diverifikasi atau akses ditolak'; end if;

   update public.sc_staff_events set
    event_type=coalesce(nullif(trim(p_patch->>'event_type'),''),event_type),
    title=coalesce(nullif(trim(p_patch->>'title'),''),title),
    occurred_at=coalesce(nullif(p_patch->>'occurred_at','')::date,occurred_at)
   where id=p_id and school_id=p_school;

  when 'leave_request' then
   if not exists(
    select 1 from public.sc_leave_requests
    where id=p_id and school_id=p_school and status='pending'
      and (user_id=auth.uid() or public.sc_manager(p_school) or r='hr')
   ) then raise exception 'Pengajuan sudah diputuskan atau akses ditolak'; end if;

   if coalesce(nullif(p_patch->>'from_date','')::date,current_date)>
      coalesce(nullif(p_patch->>'to_date','')::date,current_date) then
     raise exception 'Rentang tanggal tidak valid';
   end if;

   update public.sc_leave_requests set
    kind=coalesce(nullif(trim(p_patch->>'kind'),''),kind),
    from_date=coalesce(nullif(p_patch->>'from_date','')::date,from_date),
    to_date=coalesce(nullif(p_patch->>'to_date','')::date,to_date),
    reason=coalesce(nullif(trim(p_patch->>'reason'),''),reason)
   where id=p_id and school_id=p_school;

  else raise exception 'Jenis data tidak didukung';
 end case;

 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'auxiliary.updated',p_id::text,jsonb_build_object('entity',p_entity));
end $$;

revoke all on function public.sc_update_auxiliary(uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.sc_update_auxiliary(uuid,text,uuid,jsonb) to authenticated;
