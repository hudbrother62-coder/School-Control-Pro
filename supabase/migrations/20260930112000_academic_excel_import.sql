-- Excel-compatible bulk imports for academic workflows.
create or replace function public.sc_import_student_attendance(p_school uuid,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb; added int:=0; skipped int:=0; v_student uuid;v_class uuid;v_mark text;
begin
 if not public.sc_write_active(p_school) or public.sc_role(p_school) not in ('owner','principal','vice_principal','teacher')
 then raise exception 'Akses import presensi ditolak'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then raise exception 'Maksimal 500 baris'; end if;

 for r in select value from jsonb_array_elements(p_rows) loop
  begin
   select id,class_id into v_student,v_class from public.sc_students
   where school_id=p_school and nis=trim(r->>'nis') and status='active' limit 1;
   if v_student is null or v_class is null or not public.sc_teaches_class(p_school,v_class) then skipped:=skipped+1;continue;end if;

   v_mark:=lower(trim(r->>'mark'));
   v_mark:=case v_mark when 'hadir' then 'present' when 'sakit' then 'sick' when 'izin' then 'permission' when 'alpa' then 'absent' else v_mark end;
   if v_mark not in ('present','sick','permission','absent') then skipped:=skipped+1;continue;end if;

   insert into public.sc_student_attendance(school_id,student_id,class_id,attendance_date,lesson_key,mark,recorded_by)
   values(p_school,v_student,v_class,(r->>'attendance_date')::date,trim(r->>'lesson_key'),v_mark,auth.uid())
   on conflict(school_id,student_id,attendance_date,lesson_key)
   do update set mark=excluded.mark,recorded_by=auth.uid();
   added:=added+1;
  exception when others then skipped:=skipped+1;
  end;
 end loop;
 return jsonb_build_object('added',added,'skipped',skipped);
end $$;

create or replace function public.sc_import_grades(p_school uuid,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb; added int:=0;skipped int:=0;v_student uuid;v_class uuid;v_score numeric;v_existing uuid;
begin
 if not public.sc_write_active(p_school) or public.sc_role(p_school) not in ('owner','principal','vice_principal','teacher')
 then raise exception 'Akses import nilai ditolak'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then raise exception 'Maksimal 500 baris'; end if;

 for r in select value from jsonb_array_elements(p_rows) loop
  begin
   select id,class_id into v_student,v_class from public.sc_students
   where school_id=p_school and nis=trim(r->>'nis') and status='active' limit 1;
   v_score:=(r->>'score')::numeric;
   if v_student is null or v_class is null or not public.sc_teaches_class(p_school,v_class) or v_score<0 or v_score>100
   then skipped:=skipped+1;continue;end if;

   select id into v_existing from public.sc_grades
   where school_id=p_school and student_id=v_student
     and subject=trim(r->>'subject')
     and assessment_name=trim(r->>'assessment_name')
     and assessment_date=(r->>'assessment_date')::date
   order by created_at desc limit 1;

   if v_existing is null then
    insert into public.sc_grades(school_id,student_id,class_id,subject,assessment_name,assessment_date,score,recorded_by)
    values(p_school,v_student,v_class,trim(r->>'subject'),trim(r->>'assessment_name'),(r->>'assessment_date')::date,v_score,auth.uid());
   else
    update public.sc_grades set score=v_score,recorded_by=auth.uid()
    where id=v_existing and school_id=p_school;
   end if;
   added:=added+1;
  exception when others then skipped:=skipped+1;
  end;
 end loop;
 return jsonb_build_object('added',added,'skipped',skipped);
end $$;

revoke all on function public.sc_import_student_attendance(uuid,jsonb),public.sc_import_grades(uuid,jsonb) from public,anon;
grant execute on function public.sc_import_student_attendance(uuid,jsonb),public.sc_import_grades(uuid,jsonb) to authenticated;
