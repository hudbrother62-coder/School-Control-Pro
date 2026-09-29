-- Data created by new customers only. No legacy-data transfer.
create or replace function public.sc_import_students(p_school uuid,p_rows jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_item jsonb;v_nis text;v_name text;v_class text;v_year text;v_class_id uuid;v_added integer:=0;v_skipped integer:=0;
begin
 if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Hanya pengelola sekolah yang dapat mengimpor';end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>500 then raise exception 'Impor maksimal 500 siswa per berkas';end if;
 for v_item in select value from jsonb_array_elements(p_rows) loop
  if jsonb_typeof(v_item)<>'object' then raise exception 'Baris data tidak valid';end if;
  v_nis:=trim(coalesce(v_item->>'nis',''));v_name:=trim(coalesce(v_item->>'name',''));
  v_class:=trim(coalesce(v_item->>'class_name',''));v_year:=trim(coalesce(v_item->>'academic_year',''));
  if length(v_nis) not between 1 and 40 or length(v_name) not between 2 and 160 or v_class='' or v_year='' then raise exception 'NIS, nama, kelas dan tahun ajaran wajib valid';end if;
  select id into v_class_id from public.sc_classes where school_id=p_school and name=v_class and academic_year=v_year;
  if v_class_id is null then raise exception 'Kelas % pada tahun % belum dibuat',v_class,v_year;end if;
  insert into public.sc_students(school_id,class_id,nis,name)
   values(p_school,v_class_id,v_nis,v_name) on conflict (school_id,nis) do nothing;
  if found then v_added:=v_added+1;else v_skipped:=v_skipped+1;end if;
 end loop;
 insert into public.sc_audit_log(school_id,actor_id,action,metadata) values(p_school,auth.uid(),'students.csv.imported',jsonb_build_object('added',v_added,'skipped',v_skipped));
 return jsonb_build_object('added',v_added,'skipped',v_skipped);
end $$;
revoke all on function public.sc_import_students(uuid,jsonb) from public;
grant execute on function public.sc_import_students(uuid,jsonb) to authenticated;

-- Student-related archived students remain present for historical reports. No cascading archive/delete.
create or replace function public.sc_bulk_attendance(p_school uuid,p_day date,p_lesson text,p_rows jsonb) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_row jsonb;v_student uuid;v_class uuid;v_mark text;v_count integer:=0;
begin
 if not public.sc_write_active(p_school) or public.sc_role(p_school) not in ('owner','principal','vice_principal','teacher') then raise exception 'Akses absensi ditolak';end if;
 if p_day is null or trim(p_lesson)='' or length(p_lesson)>80 or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>100 then raise exception 'Data presensi tidak valid';end if;
 for v_row in select value from jsonb_array_elements(p_rows) loop
  v_student:=(v_row->>'student_id')::uuid;v_mark:=v_row->>'mark';
  if v_mark not in ('present','sick','permission','absent') then raise exception 'Status presensi tidak valid';end if;
  select class_id into v_class from public.sc_students where id=v_student and school_id=p_school and status='active';
  if v_class is null then raise exception 'Siswa tidak aktif atau belum memiliki kelas';end if;
  insert into public.sc_student_attendance(school_id,student_id,class_id,attendance_date,lesson_key,mark,recorded_by)
   values(p_school,v_student,v_class,p_day,p_lesson,v_mark,auth.uid())
   on conflict(school_id,student_id,attendance_date,lesson_key) do update set mark=excluded.mark,recorded_by=auth.uid();
  v_count:=v_count+1;
 end loop;
 return v_count;
end $$;
revoke all on function public.sc_bulk_attendance(uuid,date,text,jsonb) from public;
grant execute on function public.sc_bulk_attendance(uuid,date,text,jsonb) to authenticated;

-- Explicit function to store AI drafts. Client cannot forge other users' AI history.
create or replace function public.sc_store_ai_draft(p_school uuid,p_module text,p_template text,p_title text,p_prompt text,p_content text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if not public.sc_write_active(p_school) or not public.sc_module_access(p_school,p_module) or p_module not in ('guru_ai','kepsek_ai') then raise exception 'Akses ditolak';end if;
 if length(trim(p_title)) not between 2 and 180 or length(p_content)>200000 then raise exception 'Draft tidak valid';end if;
 insert into public.sc_ai_drafts(school_id,user_id,module_key,template_key,title,prompt,content)
 values(p_school,auth.uid(),p_module,p_template,trim(p_title),p_prompt,p_content) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.sc_store_ai_draft(uuid,text,text,text,text,text) from public;
grant execute on function public.sc_store_ai_draft(uuid,text,text,text,text,text) to authenticated;
