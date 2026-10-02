create or replace function public.sc_validate_hr_reference() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_table_name in ('sc_hr_assignments','sc_payroll_staff_components') then
  if not exists(select 1 from sc_staff where id=new.staff_id and school_id=new.school_id) then raise exception 'Pegawai harus berasal dari sekolah yang sama.'; end if;
 end if;
 if tg_table_name='sc_hr_assignments' then
  if new.schedule_id is not null and not exists(select 1 from sc_hr_work_schedules where id=new.schedule_id and school_id=new.school_id and active) then raise exception 'Jadwal harus aktif dan berasal dari sekolah yang sama.'; end if;
  if new.location_id is not null and not exists(select 1 from sc_hr_locations where id=new.location_id and school_id=new.school_id and active) then raise exception 'Lokasi harus aktif dan berasal dari sekolah yang sama.'; end if;
 end if;
 if tg_table_name='sc_payroll_staff_components' and not exists(select 1 from sc_payroll_component_catalog where id=new.component_id and school_id=new.school_id and active) then raise exception 'Komponen harus aktif dan berasal dari sekolah yang sama.'; end if;
 if tg_table_name='sc_recruitment_candidates' and new.opening_id is not null and not exists(select 1 from sc_recruitment_openings where id=new.opening_id and school_id=new.school_id) then raise exception 'Lowongan harus berasal dari sekolah yang sama.'; end if;
 return new;
end $$;
revoke all on function public.sc_validate_hr_reference() from public,anon,authenticated;
create trigger sc_hr_assignment_reference before insert or update of school_id,staff_id,schedule_id,location_id on public.sc_hr_assignments for each row execute function public.sc_validate_hr_reference();
create trigger sc_hr_staff_component_reference before insert or update of school_id,staff_id,component_id on public.sc_payroll_staff_components for each row execute function public.sc_validate_hr_reference();
create trigger sc_hr_candidate_reference before insert or update of school_id,opening_id on public.sc_recruitment_candidates for each row execute function public.sc_validate_hr_reference();
alter table public.sc_hr_work_schedules add constraint sc_hr_schedule_values_valid check(length(trim(name)) between 2 and 120 and start_time<end_time and cardinality(weekday)>0 and weekday <@ array[1,2,3,4,5,6,7]::smallint[]) not valid;
alter table public.sc_hr_requests add constraint sc_hr_request_values_valid check(length(trim(reason))>=3 and (from_at is null or to_at is null or to_at>=from_at) and (kind not in ('cash_advance','reimbursement') or amount>0)) not valid;
