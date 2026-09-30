-- Enrich Data Induk forms using fields already proven in BK Pro, SIKAS Pro, and Gajian Pro.
alter table public.sc_staff
  add column if not exists employee_code text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists department text,
  add column if not exists rank_name text,
  add column if not exists employment_type text,
  add column if not exists hire_date date,
  add column if not exists contract_end date,
  add column if not exists personal_data jsonb not null default '{}'::jsonb,
  add column if not exists bank_name text,
  add column if not exists bank_account_name text,
  add column if not exists bank_account_number text,
  add column if not exists payroll_data jsonb not null default '{}'::jsonb;

create unique index if not exists sc_staff_school_employee_code_uq
on public.sc_staff(school_id,employee_code)
where employee_code is not null and btrim(employee_code) <> '';

create or replace function public.sc_master_save_student_full(
 p_school uuid,p_id uuid,p_name text,p_nis text,p_nisn text,p_gender text,p_class uuid,p_status text,
 p_guardian_name text,p_guardian_phone text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if not public.sc_write_active(p_school) or not public.sc_manager(p_school) then raise exception 'Akses Data Induk ditolak'; end if;
 v_id:=public.sc_master_save_student(p_school,p_id,p_name,p_nis,p_nisn,p_gender,p_class,p_status);
 insert into public.sc_student_contacts(student_id,school_id,guardian_name,guardian_phone,updated_at)
 values(v_id,p_school,nullif(trim(coalesce(p_guardian_name,'')),''),nullif(trim(coalesce(p_guardian_phone,'')),''),now())
 on conflict(student_id) do update set guardian_name=excluded.guardian_name,guardian_phone=excluded.guardian_phone,updated_at=now()
 where public.sc_student_contacts.school_id=p_school;
 return v_id;
end $$;

create or replace function public.sc_master_save_staff_full(
 p_school uuid,p_id uuid,p_name text,p_position text,p_shift time,p_tolerance integer,p_staff_type text,p_profile jsonb
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if not public.sc_write_active(p_school) or not public.sc_manager(p_school) then raise exception 'Akses Data Induk ditolak'; end if;
 if length(trim(p_name))<2 or p_tolerance<0 or p_tolerance>240 then raise exception 'Data SDM tidak valid'; end if;
 if p_staff_type not in ('teacher','education_staff','staff') then raise exception 'Jenis SDM tidak valid'; end if;
 if p_id is null then
  insert into public.sc_staff(
    school_id,name,position,shift_start,late_tolerance_minutes,staff_type,
    employee_code,email,phone,department,rank_name,employment_type,hire_date,contract_end,
    personal_data,bank_name,bank_account_name,bank_account_number,payroll_data
  ) values(
    p_school,trim(p_name),nullif(trim(p_position),''),coalesce(p_shift,'07:00'::time),p_tolerance,p_staff_type,
    nullif(trim(coalesce(p_profile->>'employee_code','')),''),nullif(trim(coalesce(p_profile->>'email','')),''),
    nullif(trim(coalesce(p_profile->>'phone','')),''),nullif(trim(coalesce(p_profile->>'department','')),''),
    nullif(trim(coalesce(p_profile->>'rank_name','')),''),nullif(trim(coalesce(p_profile->>'employment_type','')),''),
    nullif(p_profile->>'hire_date','')::date,nullif(p_profile->>'contract_end','')::date,
    coalesce(p_profile->'personal_data','{}'::jsonb),nullif(trim(coalesce(p_profile->>'bank_name','')),''),
    nullif(trim(coalesce(p_profile->>'bank_account_name','')),''),nullif(trim(coalesce(p_profile->>'bank_account_number','')),''),
    coalesce(p_profile->'payroll_data','{}'::jsonb)
  ) returning id into v_id;
 else
  update public.sc_staff set
    name=trim(p_name),position=nullif(trim(p_position),''),shift_start=coalesce(p_shift,shift_start),
    late_tolerance_minutes=p_tolerance,staff_type=p_staff_type,
    employee_code=nullif(trim(coalesce(p_profile->>'employee_code','')),''),
    email=nullif(trim(coalesce(p_profile->>'email','')),''),phone=nullif(trim(coalesce(p_profile->>'phone','')),''),
    department=nullif(trim(coalesce(p_profile->>'department','')),''),rank_name=nullif(trim(coalesce(p_profile->>'rank_name','')),''),
    employment_type=nullif(trim(coalesce(p_profile->>'employment_type','')),''),
    hire_date=nullif(p_profile->>'hire_date','')::date,contract_end=nullif(p_profile->>'contract_end','')::date,
    personal_data=coalesce(p_profile->'personal_data','{}'::jsonb),
    bank_name=nullif(trim(coalesce(p_profile->>'bank_name','')),''),
    bank_account_name=nullif(trim(coalesce(p_profile->>'bank_account_name','')),''),
    bank_account_number=nullif(trim(coalesce(p_profile->>'bank_account_number','')),''),
    payroll_data=coalesce(p_profile->'payroll_data','{}'::jsonb)
  where id=p_id and school_id=p_school returning id into v_id;
  if v_id is null then raise exception 'Data SDM tidak ditemukan'; end if;
 end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'master.staff.full.saved',v_id::text,jsonb_build_object('name',trim(p_name),'staff_type',p_staff_type));
 return v_id;
end $$;

create or replace function public.sc_import_students_full(p_school uuid,p_rows jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_result jsonb; r jsonb; v_student uuid;
begin
 if not public.sc_write_active(p_school) or not public.sc_manager(p_school) then raise exception 'Akses impor ditolak'; end if;
 v_result:=public.sc_import_students(p_school,p_rows);
 for r in select value from jsonb_array_elements(p_rows) loop
   if trim(coalesce(r->>'nis',''))='' then continue; end if;
   select id into v_student from public.sc_students where school_id=p_school and nis=trim(r->>'nis') limit 1;
   if v_student is not null then
     insert into public.sc_student_contacts(student_id,school_id,guardian_name,guardian_phone,updated_at)
     values(v_student,p_school,nullif(trim(coalesce(r->>'guardian_name','')),''),nullif(trim(coalesce(r->>'guardian_phone','')),''),now())
     on conflict(student_id) do update set guardian_name=excluded.guardian_name,guardian_phone=excluded.guardian_phone,updated_at=now()
     where public.sc_student_contacts.school_id=p_school;
   end if;
 end loop;
 return v_result;
end $$;

create or replace function public.sc_import_staff_full(p_school uuid,p_rows jsonb,p_staff_type text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb; added int:=0; skipped int:=0; v_id uuid; v_tol int;
begin
 if not public.sc_write_active(p_school) or not public.sc_manager(p_school) then raise exception 'Akses impor ditolak'; end if;
 if p_staff_type not in ('teacher','education_staff','staff') then raise exception 'Jenis SDM tidak valid'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then raise exception 'Maksimal 500 baris'; end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  begin
   if trim(coalesce(r->>'name',''))='' then skipped:=skipped+1; continue; end if;
   v_tol:=greatest(0,least(coalesce(nullif(r->>'late_tolerance_minutes','')::int,15),240));
   v_id:=public.sc_master_save_staff_full(
     p_school,null,trim(r->>'name'),coalesce(r->>'position',''),
     coalesce(nullif(r->>'shift_start','')::time,'07:00'::time),v_tol,p_staff_type,
     jsonb_build_object(
       'employee_code',coalesce(r->>'employee_code',''),'email',coalesce(r->>'email',''),'phone',coalesce(r->>'phone',''),
       'department',coalesce(r->>'department',''),'rank_name',coalesce(r->>'rank_name',''),'employment_type',coalesce(r->>'employment_type',''),
       'hire_date',coalesce(r->>'hire_date',''),'contract_end',coalesce(r->>'contract_end',''),
       'bank_name',coalesce(r->>'bank_name',''),'bank_account_name',coalesce(r->>'bank_account_name',''),'bank_account_number',coalesce(r->>'bank_account_number',''),
       'personal_data',coalesce(r->'personal_data','{}'::jsonb),'payroll_data',coalesce(r->'payroll_data','{}'::jsonb)
     )
   );
   added:=added+1;
  exception when unique_violation then skipped:=skipped+1;
           when others then skipped:=skipped+1;
  end;
 end loop;
 return jsonb_build_object('added',added,'skipped',skipped);
end $$;

revoke all on function public.sc_master_save_student_full(uuid,uuid,text,text,text,text,uuid,text,text,text),
 public.sc_master_save_staff_full(uuid,uuid,text,text,time,integer,text,jsonb),
 public.sc_import_students_full(uuid,jsonb),
 public.sc_import_staff_full(uuid,jsonb,text)
 from public,anon;
grant execute on function public.sc_master_save_student_full(uuid,uuid,text,text,text,text,uuid,text,text,text),
 public.sc_master_save_staff_full(uuid,uuid,text,text,time,integer,text,jsonb),
 public.sc_import_students_full(uuid,jsonb),
 public.sc_import_staff_full(uuid,jsonb,text)
 to authenticated;
