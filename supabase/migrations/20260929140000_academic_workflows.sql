-- Academic shared entities: teacher journals, per-student attendance and assessments.
create table if not exists public.sc_student_attendance (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 student_id uuid not null references public.sc_students(id),
 class_id uuid not null references public.sc_classes(id),
 attendance_date date not null,
 lesson_key text not null default 'daily',
 mark text not null check(mark in ('present','sick','permission','absent')),
 notes text,
 recorded_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(school_id,student_id,attendance_date,lesson_key)
);
create index if not exists sc_student_attendance_date_idx on public.sc_student_attendance(school_id,attendance_date desc);
create table if not exists public.sc_grades (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 student_id uuid not null references public.sc_students(id),
 class_id uuid not null references public.sc_classes(id),
 subject text not null,
 assessment_name text not null,
 assessment_date date not null,
 score numeric(5,2) not null check(score between 0 and 100),
 notes text,
 recorded_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists sc_grades_student_idx on public.sc_grades(school_id,student_id,assessment_date desc);
create table if not exists public.sc_teacher_journals (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 teacher_id uuid not null references auth.users(id),
 class_id uuid not null references public.sc_classes(id),
 subject text not null,
 lesson_date date not null,
 topic text not null,
 notes text,
 created_at timestamptz not null default now()
);
create index if not exists sc_journal_teacher_idx on public.sc_teacher_journals(school_id,teacher_id,lesson_date desc);
alter table public.sc_student_attendance enable row level security;
alter table public.sc_grades enable row level security;
alter table public.sc_teacher_journals enable row level security;
create policy sc_student_attendance_read on public.sc_student_attendance for select to authenticated
 using(public.sc_member(school_id));
create policy sc_student_attendance_write on public.sc_student_attendance for insert to authenticated
 with check(public.sc_role(school_id) in ('owner','principal','vice_principal','teacher')
 and public.sc_write_active(school_id) and recorded_by=auth.uid()
 and exists(select 1 from public.sc_students s where s.school_id=sc_student_attendance.school_id and s.id=student_id and s.class_id=class_id)
 and exists(select 1 from public.sc_classes c where c.id=class_id and c.school_id=sc_student_attendance.school_id));
create policy sc_grades_read on public.sc_grades for select to authenticated
 using(public.sc_role(school_id) in ('owner','principal','vice_principal','teacher'));
create policy sc_grades_write on public.sc_grades for insert to authenticated
 with check(public.sc_role(school_id) in ('owner','principal','vice_principal','teacher')
 and public.sc_write_active(school_id) and recorded_by=auth.uid()
 and exists(select 1 from public.sc_students s where s.school_id=sc_grades.school_id and s.id=student_id and s.class_id=class_id)
 and exists(select 1 from public.sc_classes c where c.id=class_id and c.school_id=sc_grades.school_id));
create policy sc_journals_read on public.sc_teacher_journals for select to authenticated
 using(public.sc_manager(school_id) or (teacher_id=auth.uid() and public.sc_member(school_id)));
create policy sc_journals_write on public.sc_teacher_journals for insert to authenticated
 with check(public.sc_role(school_id) in ('owner','principal','vice_principal','teacher')
 and public.sc_write_active(school_id) and teacher_id=auth.uid()
 and exists(select 1 from public.sc_classes c where c.id=class_id and c.school_id=sc_teacher_journals.school_id));
revoke all on public.sc_student_attendance,public.sc_grades,public.sc_teacher_journals from anon,authenticated;
grant select,insert on public.sc_student_attendance,public.sc_grades,public.sc_teacher_journals to authenticated;
