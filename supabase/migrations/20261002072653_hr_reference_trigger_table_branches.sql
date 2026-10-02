create or replace function public.sc_validate_hr_reference() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_table_name in ('sc_hr_assignments','sc_payroll_staff_components') then
  if not exists(select 1 from sc_staff where id=new.staff_id and school_id=new.school_id) then raise exception 'Pegawai harus berasal dari sekolah yang sama.'; end if;
 end if;
 if tg_table_name='sc_hr_assignments' then
  if new.schedule_id is not null and not exists(select 1 from sc_hr_work_schedules where id=new.schedule_id and school_id=new.school_id and active) then raise exception 'Jadwal harus aktif dan berasal dari sekolah yang sama.'; end if;
  if new.location_id is not null and not exists(select 1 from sc_hr_locations where id=new.location_id and school_id=new.school_id and active) then raise exception 'Lokasi harus aktif dan berasal dari sekolah yang sama.'; end if;
 end if;
 if tg_table_name='sc_payroll_staff_components' then
  if not exists(select 1 from sc_payroll_component_catalog where id=new.component_id and school_id=new.school_id and active) then raise exception 'Komponen harus aktif dan berasal dari sekolah yang sama.'; end if;
 end if;
 if tg_table_name='sc_recruitment_candidates' then
  if new.opening_id is not null and not exists(select 1 from sc_recruitment_openings where id=new.opening_id and school_id=new.school_id) then raise exception 'Lowongan harus berasal dari sekolah yang sama.'; end if;
 end if;
 return new;
end $$;
revoke all on function public.sc_validate_hr_reference() from public,anon,authenticated;

