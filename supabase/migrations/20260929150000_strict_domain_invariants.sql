-- Invariants that must hold even for direct API calls, not just UI validation.
alter table public.sc_payroll_records
 add constraint sc_payroll_nonnegative check(gross>=0 and deductions>=0 and deductions<=gross);
alter table public.sc_staff_events
 add constraint sc_staff_event_valid_title check(length(trim(title)) between 3 and 200);
alter table public.sc_leave_requests
 add constraint sc_leave_reason_required check(length(trim(reason))>0);

create or replace function public.sc_manual_attendance(p_school uuid,p_user uuid,p_day date,p_reason text) returns uuid
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_id uuid;v_tz text;v_today date;
 begin
  if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak'; end if;
  if length(trim(coalesce(p_reason,'')))<10 then raise exception 'Alasan koreksi wajib minimal 10 karakter'; end if;
  select timezone into v_tz from public.sc_schools where id=p_school;
  v_today:=(now() at time zone v_tz)::date;
  if p_day is null or p_day>v_today then raise exception 'Tidak bisa menginput kehadiran manual untuk tanggal mendatang';end if;
  if not exists(select 1 from public.sc_staff where school_id=p_school and user_id=p_user) then raise exception 'SDM tidak terdaftar'; end if;
  if exists(select 1 from public.sc_attendance where school_id=p_school and user_id=p_user and duty_date=p_day) then raise exception 'Catatan hari tersebut sudah ada. Koreksi memerlukan alur persetujuan terpisah'; end if;
  insert into public.sc_attendance(school_id,user_id,duty_date,status,source,notes,created_by)
   values(p_school,p_user,p_day,'manual','manual',trim(p_reason),auth.uid()) returning id into v_id;
  insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
   values(p_school,auth.uid(),'attendance.manual',v_id::text,jsonb_build_object('reason',p_reason,'user_id',p_user,'duty_date',p_day));
  return v_id;
 end $$;
