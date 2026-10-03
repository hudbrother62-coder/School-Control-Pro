-- Reject mismatched tenant/class pointers without changing existing historical records.
alter policy sc_grades_write on public.sc_grades with check(public.sc_write_active(school_id) and public.sc_teaches_class(school_id,class_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sc_students s where s.id=sc_grades.student_id and s.school_id=sc_grades.school_id and s.class_id=sc_grades.class_id));
alter policy sc_student_attendance_write on public.sc_student_attendance with check(public.sc_write_active(school_id) and public.sc_teaches_class(school_id,class_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sc_students s where s.id=sc_student_attendance.student_id and s.school_id=sc_student_attendance.school_id and s.class_id=sc_student_attendance.class_id));
create function public.sc_guard_academic_relations() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.sc_classes c where c.id=new.class_id and c.school_id=new.school_id) then raise exception 'Kelas bukan milik sekolah';end if;
 if tg_table_name in('sc_grades','sc_student_attendance') then
  if not exists(select 1 from public.sc_students s where s.id=new.student_id and s.school_id=new.school_id and s.class_id=new.class_id) then raise exception 'Siswa tidak berada di kelas sekolah yang dipilih';end if;
 end if;
 if tg_table_name in('sc_grades','sc_teacher_journals') then
  if new.subject_id is not null and not exists(select 1 from public.sc_subjects s where s.id=new.subject_id and s.school_id=new.school_id) then raise exception 'Mata pelajaran bukan milik sekolah';end if;
 end if;
 if tg_table_name='sc_teacher_journals' and not exists(select 1 from public.sc_members m where m.school_id=new.school_id and m.user_id=new.teacher_id) then raise exception 'Akun pencatat guru bukan anggota sekolah';end if;
 return new;
end $$;
revoke all on function public.sc_guard_academic_relations() from public,anon,authenticated;
create trigger sc_academic_relation_guard before insert or update of school_id,class_id,student_id,subject_id on public.sc_grades for each row execute function public.sc_guard_academic_relations();
create trigger sc_academic_relation_guard before insert or update of school_id,class_id,student_id on public.sc_student_attendance for each row execute function public.sc_guard_academic_relations();
create trigger sc_academic_relation_guard before insert or update of school_id,class_id,subject_id,teacher_id on public.sc_teacher_journals for each row execute function public.sc_guard_academic_relations();
