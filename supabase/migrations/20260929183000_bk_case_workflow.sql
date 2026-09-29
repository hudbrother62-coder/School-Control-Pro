-- Assigned counselor-only case transitions. Never expose private notes to principal views.
create or replace function public.sc_update_bk_case(p_school uuid,p_case uuid,p_status text,p_follow_up date) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_write_active(p_school) or public.sc_role(p_school)<>'counselor' then raise exception 'Akses konselor ditolak';end if;
 if p_status not in ('open','ongoing','closed') then raise exception 'Status tidak valid';end if;
 update public.sc_bk_cases set status=p_status,follow_up_date=p_follow_up
  where school_id=p_school and id=p_case and assigned_counselor=auth.uid();
 if not found then raise exception 'Kasus tidak tersedia untuk konselor';end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
  values(p_school,auth.uid(),'bk.case.status.changed',p_case::text,jsonb_build_object('status',p_status));
end $$;
revoke all on function public.sc_update_bk_case(uuid,uuid,text,date) from public;
grant execute on function public.sc_update_bk_case(uuid,uuid,text,date) to authenticated;
