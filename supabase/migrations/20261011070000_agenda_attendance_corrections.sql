-- Attendance corrections operate on one configured school agenda and one eligible participant.
-- Original GPS/time evidence is kept in the immutable audit log before an override.
alter table public.sc_event_attendance
  add column if not exists correction_reason text,
  add column if not exists corrected_at timestamptz,
  add column if not exists corrected_by uuid references auth.users(id);

create or replace function public.sc_correct_event_attendance(
  p_school uuid,
  p_event uuid,
  p_user uuid,
  p_status text,
  p_check_in_local text,
  p_check_out_local text,
  p_reason text
) returns public.sc_event_attendance
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_event public.sc_calendar_events%rowtype;
  v_member public.sc_members%rowtype;
  v_old public.sc_event_attendance%rowtype;
  v_result public.sc_event_attendance%rowtype;
  v_zone text;
  v_check_in timestamp;
  v_check_out timestamp;
  v_before jsonb;
  v_targeted boolean;
begin
  if auth.uid() is null or not public.sc_manager(p_school) or not public.sc_write_active(p_school) then
    raise exception 'Hanya manajemen sekolah aktif dapat mengoreksi presensi kegiatan' using errcode='42501';
  end if;
  if length(trim(coalesce(p_reason,''))) not between 10 and 2000 then
    raise exception 'Alasan koreksi harus 10 sampai 2000 karakter';
  end if;
  if p_status is null or p_status not in ('present','late','absent','excused') then
    raise exception 'Pilih status presensi yang valid';
  end if;

  -- Serialise corrections and normal check-in against the same agenda.
  select * into v_event from public.sc_calendar_events
   where id=p_event and school_id=p_school for update;
  if not found or not v_event.attendance_required or v_event.scope<>'school' then
    raise exception 'Pilih kegiatan sekolah yang mengaktifkan presensi';
  end if;
  select coalesce(nullif(timezone,''),'Asia/Jakarta') into v_zone
   from public.sc_schools where id=p_school;
  if v_event.event_date > (now() at time zone v_zone)::date or
     (v_event.event_date = (now() at time zone v_zone)::date
      and v_event.start_time is not null
      and (now() at time zone v_zone)::time < v_event.start_time) then
    raise exception 'Kegiatan belum dimulai; koreksi hanya untuk presensi yang sudah berlangsung';
  end if;

  select * into v_member from public.sc_members
   where school_id=p_school and user_id=p_user;
  if not found or v_member.role='viewer' then
    raise exception 'Anggota tidak ditemukan di sekolah ini';
  end if;
  select * into v_old from public.sc_event_attendance
   where school_id=p_school and event_id=p_event and user_id=p_user for update;
  v_before:=case when found then to_jsonb(v_old) else null end;
  v_targeted:=coalesce(v_member.is_active,true) and (
    (v_event.attendance_target='users' and p_user=any(v_event.attendance_users))
    or (v_event.attendance_target='roles' and v_member.role=any(v_event.attendance_roles))
  );
  if not v_targeted and v_before is null then
    raise exception 'Peserta tidak ditugaskan presensi pada kegiatan ini';
  end if;

  if p_status in ('present','late') then
    if p_check_in_local is null or
       p_check_in_local !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$' then
      raise exception 'Jam masuk wajib diisi dengan tanggal dan waktu yang valid';
    end if;
    v_check_in:=p_check_in_local::timestamp;
    if to_char(v_check_in,'YYYY-MM-DD"T"HH24:MI')<>p_check_in_local or
       v_check_in::date<>v_event.event_date then
      raise exception 'Jam masuk harus berada pada tanggal kegiatan';
    end if;
    if p_check_out_local is not null and p_check_out_local<>'' then
      if p_check_out_local !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$' then
        raise exception 'Jam pulang tidak valid';
      end if;
      v_check_out:=p_check_out_local::timestamp;
      if to_char(v_check_out,'YYYY-MM-DD"T"HH24:MI')<>p_check_out_local or
         v_check_out<v_check_in or v_check_out>v_check_in+interval '24 hours' then
        raise exception 'Jam pulang harus sesudah jam masuk dan maksimal 24 jam';
      end if;
    end if;
  elsif p_check_in_local is not null or p_check_out_local is not null then
    raise exception 'Status tidak hadir atau izin tidak boleh memiliki jam check-in';
  end if;

  if v_before is null then
    insert into public.sc_event_attendance (
      school_id,event_id,user_id,status,check_in_at,check_out_at,
      correction_reason,corrected_at,corrected_by
    ) values (
      p_school,p_event,p_user,p_status,
      case when v_check_in is not null then v_check_in at time zone v_zone end,
      case when v_check_out is not null then v_check_out at time zone v_zone end,
      trim(p_reason),now(),auth.uid()
    ) returning * into v_result;
  else
    update public.sc_event_attendance
    set status=p_status,
        check_in_at=case when v_check_in is not null then v_check_in at time zone v_zone end,
        check_out_at=case when v_check_out is not null then v_check_out at time zone v_zone end,
        check_in_lat=null,check_in_lng=null,check_in_accuracy=null,
        check_out_lat=null,check_out_lng=null,check_out_accuracy=null,
        correction_reason=trim(p_reason),corrected_at=now(),corrected_by=auth.uid()
    where id=v_old.id and school_id=p_school and event_id=p_event and user_id=p_user
    returning * into v_result;
  end if;

  insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
   values(p_school,auth.uid(),'agenda.attendance_corrected',v_result.id::text,
    jsonb_build_object(
      'event_id',p_event,'event_title',v_event.title,'event_date',v_event.event_date,
      'user_id',p_user,'reason',trim(p_reason),
      'before',v_before,'after',to_jsonb(v_result)
    ));
  return v_result;
end $$;

revoke all on function public.sc_correct_event_attendance(uuid,uuid,uuid,text,text,text,text) from public,anon;
grant execute on function public.sc_correct_event_attendance(uuid,uuid,uuid,text,text,text,text) to authenticated;
