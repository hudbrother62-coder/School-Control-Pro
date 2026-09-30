-- Unified Data Induk CRUD + bulk import helpers for School Control.
create or replace function public.sc_master_save_class(
  p_school uuid,p_id uuid,p_name text,p_grade text,p_year text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if not public.sc_write_active(p_school) or not public.sc_manager(p_school) then raise exception 'Akses Data Induk ditolak'; end if;
 if length(trim(p_name))<1 or length(trim(p_year))<4 then raise exception 'Nama kelas / tahun ajaran tidak valid'; end if;
 if p_id is null then
  insert into public.sc_classes(school_id,name,grade,academic_year)
  values(p_school,trim(p_name),nullif(trim(p_grade),''),trim(p_year)) returning id into v_id;
 else
  update public.sc_classes set name=trim(p_name),grade=nullif(trim(p_grade),''),academic_year=trim(p_year)
  where id=p_id and school_id=p_school returning id into v_id;
  if v_id is null then raise exception 'Kelas tidak ditemukan'; end if;
 end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'master.class.saved',v_id::text,jsonb_build_object('name',trim(p_name),'year',trim(p_year)));
 return v_id;
end $$;

create or replace function public.sc_master_save_student(
 p_school uuid,p_id uuid,p_name text,p_nis text,p_nisn text,p_gender text,p_class uuid,p_status text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if not public.sc_write_active(p_school) or not public.sc_manager(p_school) then raise exception 'Akses Data Induk ditolak'; end if;
 if length(trim(p_name))<2 or p_status not in ('active','archived') then raise exception 'Data siswa tidak valid'; end if;
 if p_class is not null and not exists(select 1 from public.sc_classes where id=p_class and school_id=p_school) then raise exception 'Kelas tidak valid'; end if;
 if p_id is null then
  insert into public.sc_students(school_id,name,nis,nisn,gender,class_id,status,archived_at)
  values(p_school,trim(p_name),nullif(trim(p_nis),''),nullif(trim(p_nisn),''),nullif(trim(p_gender),''),p_class,p_status,case when p_status='archived' then now() end)
  returning id into v_id;
 else
  update public.sc_students set name=trim(p_name),nis=nullif(trim(p_nis),''),nisn=nullif(trim(p_nisn),''),gender=nullif(trim(p_gender),''),class_id=p_class,status=p_status,
   archived_at=case when p_status='archived' then coalesce(archived_at,now()) else null end
  where id=p_id and school_id=p_school returning id into v_id;
  if v_id is null then raise exception 'Siswa tidak ditemukan'; end if;
 end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'master.student.saved',v_id::text,jsonb_build_object('name',trim(p_name),'status',p_status));
 return v_id;
end $$;

create or replace function public.sc_master_save_staff(
 p_school uuid,p_id uuid,p_name text,p_position text,p_shift time,p_tolerance integer
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if not public.sc_write_active(p_school) or not public.sc_manager(p_school) then raise exception 'Akses Data Induk ditolak'; end if;
 if length(trim(p_name))<2 or p_tolerance<0 or p_tolerance>240 then raise exception 'Data SDM tidak valid'; end if;
 if p_id is null then
   insert into public.sc_staff(school_id,name,position,shift_start,late_tolerance_minutes)
   values(p_school,trim(p_name),nullif(trim(p_position),''),coalesce(p_shift,'07:00'::time),p_tolerance) returning id into v_id;
 else
   update public.sc_staff set name=trim(p_name),position=nullif(trim(p_position),''),shift_start=coalesce(p_shift,shift_start),late_tolerance_minutes=p_tolerance
   where id=p_id and school_id=p_school returning id into v_id;
   if v_id is null then raise exception 'Data SDM tidak ditemukan'; end if;
 end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'master.staff.saved',v_id::text,jsonb_build_object('name',trim(p_name),'position',p_position));
 return v_id;
end $$;

create or replace function public.sc_master_save_subject(
 p_school uuid,p_id uuid,p_name text,p_code text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if not public.sc_write_active(p_school) or not public.sc_manager(p_school) then raise exception 'Akses Data Induk ditolak'; end if;
 if length(trim(p_name))<2 then raise exception 'Nama mata pelajaran tidak valid'; end if;
 if p_id is null then
  insert into public.sc_subjects(school_id,name,code) values(p_school,trim(p_name),nullif(trim(p_code),'')) returning id into v_id;
 else
  update public.sc_subjects set name=trim(p_name),code=nullif(trim(p_code),'') where id=p_id and school_id=p_school returning id into v_id;
  if v_id is null then raise exception 'Mata pelajaran tidak ditemukan'; end if;
 end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'master.subject.saved',v_id::text,jsonb_build_object('name',trim(p_name),'code',p_code));
 return v_id;
end $$;

create or replace function public.sc_master_save_assignment(
 p_school uuid,p_id uuid,p_teacher uuid,p_class uuid,p_subject uuid,p_mode text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if not public.sc_write_active(p_school) or not public.sc_manager(p_school) then raise exception 'Akses penugasan ditolak'; end if;
 if p_mode not in ('homeroom','subject','combined') then raise exception 'Mode penugasan tidak valid'; end if;
 if not exists(select 1 from public.sc_members where school_id=p_school and user_id=p_teacher and role in ('owner','principal','vice_principal','teacher')) then raise exception 'Guru tidak terdaftar sebagai anggota sekolah'; end if;
 if not exists(select 1 from public.sc_classes where school_id=p_school and id=p_class) then raise exception 'Kelas tidak valid'; end if;
 if p_subject is not null and not exists(select 1 from public.sc_subjects where school_id=p_school and id=p_subject) then raise exception 'Mata pelajaran tidak valid'; end if;
 if p_id is null then
  insert into public.sc_teacher_assignments(school_id,teacher_id,class_id,subject_id,mode)
  values(p_school,p_teacher,p_class,p_subject,p_mode) returning id into v_id;
 else
  update public.sc_teacher_assignments set teacher_id=p_teacher,class_id=p_class,subject_id=p_subject,mode=p_mode
  where id=p_id and school_id=p_school returning id into v_id;
  if v_id is null then raise exception 'Penugasan tidak ditemukan'; end if;
 end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'master.assignment.saved',v_id::text,jsonb_build_object('mode',p_mode));
 return v_id;
end $$;

create or replace function public.sc_master_delete(
 p_school uuid,p_entity text,p_id uuid
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_write_active(p_school) or not public.sc_manager(p_school) then raise exception 'Akses hapus ditolak'; end if;
 begin
  case p_entity
   when 'student' then
    if not exists(select 1 from public.sc_students where id=p_id and school_id=p_school and status='archived') then raise exception 'Arsipkan siswa sebelum hapus permanen'; end if;
    delete from public.sc_students where id=p_id and school_id=p_school;
   when 'class' then delete from public.sc_classes where id=p_id and school_id=p_school;
   when 'staff' then delete from public.sc_staff where id=p_id and school_id=p_school and user_id is null;
   when 'subject' then delete from public.sc_subjects where id=p_id and school_id=p_school;
   when 'assignment' then delete from public.sc_teacher_assignments where id=p_id and school_id=p_school;
   else raise exception 'Entitas tidak didukung';
  end case;
 exception when foreign_key_violation then
  raise exception 'Data masih dipakai oleh riwayat lain. Arsipkan / lepaskan relasi terlebih dahulu.';
 end;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'master.deleted',p_id::text,jsonb_build_object('entity',p_entity));
end $$;

create or replace function public.sc_import_classes(p_school uuid,p_rows jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb; added integer:=0; skipped integer:=0;
begin
 if not public.sc_write_active(p_school) or not public.sc_manager(p_school) then raise exception 'Akses impor ditolak'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then raise exception 'Maksimal 500 baris'; end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  begin
   if trim(coalesce(r->>'name',''))='' or trim(coalesce(r->>'academic_year',''))='' then skipped:=skipped+1; continue; end if;
   insert into public.sc_classes(school_id,name,grade,academic_year)
   values(p_school,trim(r->>'name'),nullif(trim(coalesce(r->>'grade','')),''),trim(r->>'academic_year'))
   on conflict(school_id,academic_year,name) do update set grade=excluded.grade;
   added:=added+1;
  exception when others then skipped:=skipped+1;
  end;
 end loop;
 return jsonb_build_object('added',added,'skipped',skipped);
end $$;

create or replace function public.sc_import_staff(p_school uuid,p_rows jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb; added integer:=0; skipped integer:=0; v_tol integer;
begin
 if not public.sc_write_active(p_school) or not public.sc_manager(p_school) then raise exception 'Akses impor ditolak'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then raise exception 'Maksimal 500 baris'; end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  begin
   if trim(coalesce(r->>'name',''))='' then skipped:=skipped+1; continue; end if;
   v_tol:=coalesce(nullif(r->>'late_tolerance_minutes','')::integer,15);
   insert into public.sc_staff(school_id,name,position,shift_start,late_tolerance_minutes)
   values(p_school,trim(r->>'name'),nullif(trim(coalesce(r->>'position','')),''),coalesce(nullif(r->>'shift_start','')::time,'07:00'::time),greatest(0,least(v_tol,240)));
   added:=added+1;
  exception when others then skipped:=skipped+1;
  end;
 end loop;
 return jsonb_build_object('added',added,'skipped',skipped);
end $$;

create or replace function public.sc_import_subjects(p_school uuid,p_rows jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb; added integer:=0; skipped integer:=0;
begin
 if not public.sc_write_active(p_school) or not public.sc_manager(p_school) then raise exception 'Akses impor ditolak'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then raise exception 'Maksimal 500 baris'; end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  begin
   if trim(coalesce(r->>'name',''))='' then skipped:=skipped+1; continue; end if;
   insert into public.sc_subjects(school_id,name,code)
   values(p_school,trim(r->>'name'),nullif(trim(coalesce(r->>'code','')),''))
   on conflict(school_id,name) do update set code=excluded.code;
   added:=added+1;
  exception when others then skipped:=skipped+1;
  end;
 end loop;
 return jsonb_build_object('added',added,'skipped',skipped);
end $$;

revoke all on function public.sc_master_save_class(uuid,uuid,text,text,text),
 public.sc_master_save_student(uuid,uuid,text,text,text,text,uuid,text),
 public.sc_master_save_staff(uuid,uuid,text,text,time,integer),
 public.sc_master_save_subject(uuid,uuid,text,text),
 public.sc_master_save_assignment(uuid,uuid,uuid,uuid,uuid,text),
 public.sc_master_delete(uuid,text,uuid),
 public.sc_import_classes(uuid,jsonb),
 public.sc_import_staff(uuid,jsonb),
 public.sc_import_subjects(uuid,jsonb)
 from public,anon;
grant execute on function public.sc_master_save_class(uuid,uuid,text,text,text),
 public.sc_master_save_student(uuid,uuid,text,text,text,text,uuid,text),
 public.sc_master_save_staff(uuid,uuid,text,text,time,integer),
 public.sc_master_save_subject(uuid,uuid,text,text),
 public.sc_master_save_assignment(uuid,uuid,uuid,uuid,uuid,text),
 public.sc_master_delete(uuid,text,uuid),
 public.sc_import_classes(uuid,jsonb),
 public.sc_import_staff(uuid,jsonb),
 public.sc_import_subjects(uuid,jsonb)
 to authenticated;
