create or replace function public.sc_guard_hr_master_delete() returns trigger language plpgsql set search_path=public as $$
begin
 if old.active then raise exception 'Arsipkan data sebelum menghapus permanen.'; end if;
 if tg_table_name='sc_hr_work_schedules' and exists(select 1 from sc_hr_assignments where schedule_id=old.id) then raise exception 'Jadwal sudah dipakai penempatan; simpan sebagai arsip.'; end if;
 if tg_table_name='sc_hr_locations' then
  if exists(select 1 from sc_hr_assignments where location_id=old.id) or exists(select 1 from sc_calendar_events where attendance_location_id=old.id) then raise exception 'Lokasi sudah dipakai penempatan atau agenda; simpan sebagai arsip.'; end if;
 end if;
 if tg_table_name='sc_payroll_component_catalog' and exists(select 1 from sc_payroll_staff_components where component_id=old.id) then raise exception 'Komponen sudah dipakai payroll; simpan sebagai arsip.'; end if;
 return old;
end $$;
create trigger sc_hr_schedule_safe_delete before delete on public.sc_hr_work_schedules for each row execute function public.sc_guard_hr_master_delete();
create trigger sc_hr_location_safe_delete before delete on public.sc_hr_locations for each row execute function public.sc_guard_hr_master_delete();
create trigger sc_hr_component_safe_delete before delete on public.sc_payroll_component_catalog for each row execute function public.sc_guard_hr_master_delete();

