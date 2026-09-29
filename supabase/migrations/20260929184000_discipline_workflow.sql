-- Discipline case follow-up transitions without unrestricted table UPDATE.
create or replace function public.sc_decide_discipline_followup(p_school uuid,p_followup uuid,p_status text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_creator uuid;
begin
 if not public.sc_write_active(p_school) or public.sc_role(p_school) not in ('owner','principal','vice_principal','teacher','counselor') then raise exception 'Akses ditolak';end if;
 if p_status not in ('open','in_progress','completed') then raise exception 'Status tidak valid';end if;
 select created_by into v_creator from public.sc_discipline_followups where id=p_followup and school_id=p_school;
 if not found or (not public.sc_manager(p_school) and v_creator<>auth.uid()) then raise exception 'Tindak lanjut tidak tersedia';end if;
 update public.sc_discipline_followups set status=p_status where id=p_followup and school_id=p_school;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'discipline.followup.changed',p_followup::text,jsonb_build_object('status',p_status));
end $$;
revoke all on function public.sc_decide_discipline_followup(uuid,uuid,text) from public;
grant execute on function public.sc_decide_discipline_followup(uuid,uuid,text) to authenticated;
