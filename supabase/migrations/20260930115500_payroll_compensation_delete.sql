create or replace function public.sc_delete_compensation(p_school uuid,p_staff uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_write_active(p_school) or public.sc_role(p_school) not in ('owner','hr') then raise exception 'Akses payroll ditolak'; end if;
 delete from public.sc_hr_compensation where school_id=p_school and staff_id=p_staff;
 if not found then raise exception 'Komponen gaji tidak ditemukan'; end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'payroll.compensation.deleted',p_staff::text,'{}'::jsonb);
end $$;
revoke all on function public.sc_delete_compensation(uuid,uuid) from public,anon;
grant execute on function public.sc_delete_compensation(uuid,uuid) to authenticated;
