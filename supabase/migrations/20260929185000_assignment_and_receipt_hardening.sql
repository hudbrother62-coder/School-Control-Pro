-- Teacher access follows explicit homeroom/subject/combined assignment rather than only school membership.
create or replace function public.sc_teaches_class(p_school uuid,p_class uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select public.sc_manager(p_school) or
  (public.sc_role(p_school)='teacher' and exists(select 1 from public.sc_teacher_assignments a
    where a.school_id=p_school and a.class_id=p_class and a.teacher_id=auth.uid()))
$$;
drop policy if exists sc_student_attendance_write on public.sc_student_attendance;
create policy sc_student_attendance_write on public.sc_student_attendance for insert to authenticated
 with check(public.sc_write_active(school_id) and public.sc_teaches_class(school_id,class_id) and recorded_by=auth.uid()
 and exists(select 1 from public.sc_students s where s.school_id=sc_student_attendance.school_id and s.id=student_id and s.class_id=class_id));
drop policy if exists sc_grades_write on public.sc_grades;
create policy sc_grades_write on public.sc_grades for insert to authenticated
 with check(public.sc_write_active(school_id) and public.sc_teaches_class(school_id,class_id) and recorded_by=auth.uid()
 and exists(select 1 from public.sc_students s where s.school_id=sc_grades.school_id and s.id=student_id and s.class_id=class_id));
drop policy if exists sc_journals_write on public.sc_teacher_journals;
create policy sc_journals_write on public.sc_teacher_journals for insert to authenticated
 with check(public.sc_write_active(school_id) and public.sc_teaches_class(school_id,class_id) and teacher_id=auth.uid());

-- Bulk presensi uses same assignment guard server-side.
create or replace function public.sc_bulk_attendance(p_school uuid,p_day date,p_lesson text,p_rows jsonb) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_row jsonb;v_student uuid;v_class uuid;v_mark text;v_count integer:=0;
begin
 if not public.sc_write_active(p_school) or public.sc_role(p_school) not in ('owner','principal','vice_principal','teacher') then raise exception 'Akses absensi ditolak';end if;
 if p_day is null or trim(p_lesson)='' or length(p_lesson)>80 or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>100 then raise exception 'Data presensi tidak valid';end if;
 for v_row in select value from jsonb_array_elements(p_rows) loop
  v_student:=(v_row->>'student_id')::uuid;v_mark:=v_row->>'mark';
  if v_mark not in ('present','sick','permission','absent') then raise exception 'Status presensi tidak valid';end if;
  select class_id into v_class from public.sc_students where id=v_student and school_id=p_school and status='active';
  if v_class is null or not public.sc_teaches_class(p_school,v_class) then raise exception 'Siswa tidak tersedia untuk kelas penugasan Anda';end if;
  insert into public.sc_student_attendance(school_id,student_id,class_id,attendance_date,lesson_key,mark,recorded_by)
   values(p_school,v_student,v_class,p_day,p_lesson,v_mark,auth.uid())
   on conflict(school_id,student_id,attendance_date,lesson_key) do update set mark=excluded.mark,recorded_by=auth.uid();
  v_count:=v_count+1;
 end loop;
 return v_count;
end $$;
-- Prevent fake receipt entries via generic transaction INSERT; only sc_record_bill_payment may create student_bill income.
drop policy if exists sc_finance_write on public.sc_finance_transactions;
create policy sc_finance_write on public.sc_finance_transactions for insert to authenticated
 with check(public.sc_role(school_id) in ('owner','principal','treasurer') and public.sc_write_active(school_id)
 and category<>'student_bill' and created_by=auth.uid()
 and (account_id is null or exists(select 1 from public.sc_finance_accounts a where a.id=account_id and a.school_id=sc_finance_transactions.school_id))
 and (activity_id is null or exists(select 1 from public.sc_programs p where p.id=activity_id and p.school_id=sc_finance_transactions.school_id)));
