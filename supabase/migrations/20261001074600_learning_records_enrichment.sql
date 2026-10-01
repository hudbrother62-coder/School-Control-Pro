alter table public.sc_teacher_journals
 add column if not exists subject_id uuid references public.sc_subjects(id) on delete set null,
 add column if not exists teacher_name_snapshot text,
 add column if not exists class_name_snapshot text,
 add column if not exists activity text,
 add column if not exists reflection text,
 add column if not exists follow_up text;

alter table public.sc_grades
 add column if not exists assessment_category text,
 add column if not exists max_score numeric not null default 100,
 add column if not exists subject_id uuid references public.sc_subjects(id) on delete set null;
