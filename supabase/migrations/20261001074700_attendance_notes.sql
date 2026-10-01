create or replace function public.sc_bulk_attendance(p_school uuid,p_day date,p_lesson text,p_rows jsonb)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_row jsonb;v_student uuid;v_class uuid;v_mark text;v_notes text;v_count integer:=0;
begin
 if not public.sc_write_active(p_school) or public.sc_role(p_school) not in ('owner','principal','vice_principal','teacher') then raise exception 'Akses absensi ditolak';end if;
 if p_day is null or trim(p_lesson)='' or length(p_lesson)>120 or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>1000 then raise exception 'Data presensi tidak valid';end if;
 for v_row in select value from jsonb_array_elements(p_rows) loop
  v_student:=(v_row->>'student_id')::uuid;v_mark:=v_row->>'mark';v_notes:=nullif(trim(coalesce(v_row->>'notes','')),'');
  if v_mark not in ('present','sick','permission','absent') then raise exception 'Status presensi tidak valid';end if;
  select class_id into v_class from public.sc_students where id=v_student and school_id=p_school and status='active';
  if v_class is null or not public.sc_teaches_class(p_school,v_class) then raise exception 'Siswa tidak tersedia untuk kelas penugasan Anda';end if;
  insert into public.sc_student_attendance(school_id,student_id,class_id,attendance_date,lesson_key,mark,notes,recorded_by)
   values(p_school,v_student,v_class,p_day,trim(p_lesson),v_mark,v_notes,auth.uid())
   on conflict(school_id,student_id,attendance_date,lesson_key) do update set mark=excluded.mark,notes=excluded.notes,recorded_by=auth.uid();
  v_count:=v_count+1;
 end loop;
 return v_count;
end $$;
