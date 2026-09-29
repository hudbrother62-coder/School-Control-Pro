-- School Control unified domain schema. Schema only: NO legacy data copy or cross-project connection.
-- Independent master data shared by academics, counseling, discipline, projects and HR.
alter table public.sc_schools
 add column if not exists npsn text,
 add column if not exists address text,
 add column if not exists academic_year text not null default '2026/2027';
alter table public.sc_students
 add column if not exists nisn text,
 add column if not exists gender text check(gender in ('L','P')),
 add column if not exists archived_at timestamptz;
create index if not exists sc_students_search_idx on public.sc_students(school_id,name);
create unique index if not exists sc_students_nisn_unique on public.sc_students(school_id,nisn) where nisn is not null;

create table if not exists public.sc_student_contacts (
 student_id uuid primary key references public.sc_students(id) on delete cascade,
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 guardian_name text,
 guardian_phone text,
 updated_at timestamptz not null default now()
);
alter table public.sc_student_contacts enable row level security;
create policy sc_contacts_read on public.sc_student_contacts for select to authenticated
 using(public.sc_role(school_id) in ('owner','principal','vice_principal','teacher','counselor'));
revoke all on public.sc_student_contacts from anon,authenticated;
grant select on public.sc_student_contacts to authenticated;

create table if not exists public.sc_subjects (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 name text not null,
 code text,
 unique(school_id,name)
);
create table if not exists public.sc_teacher_assignments (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 teacher_id uuid not null references auth.users(id),
 class_id uuid not null references public.sc_classes(id),
 subject_id uuid references public.sc_subjects(id),
 mode text not null check(mode in ('homeroom','subject','combined')),
 created_at timestamptz not null default now(),
 unique(school_id,teacher_id,class_id,subject_id,mode)
);
create table if not exists public.sc_teacher_schedules (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 assignment_id uuid not null references public.sc_teacher_assignments(id) on delete cascade,
 weekday smallint not null check(weekday between 1 and 7),
 starts_at time not null,
 ends_at time not null,
 room text,
 check(ends_at>starts_at)
);
create table if not exists public.sc_calendar_events (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 title text not null,
 event_date date not null,
 category text not null default 'school' check(category in ('school','teaching','meeting','training','other')),
 recurring_rule text,
 pic_id uuid references auth.users(id),
 notes text,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists sc_calendar_school_day_idx on public.sc_calendar_events(school_id,event_date);

create table if not exists public.sc_program_tasks (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 program_id uuid not null references public.sc_programs(id) on delete cascade,
 title text not null,
 pic_id uuid references auth.users(id),
 due_at timestamptz,
 status text not null default 'todo' check(status in ('todo','doing','blocked','review','done')),
 problem text,
 result text,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.sc_meetings (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 title text not null,
 held_at timestamptz not null,
 minutes text not null default '',
 decisions text not null default '',
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.sc_evidence (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 target_type text not null check(target_type in ('program','task','meeting','supervision','staff_event','document','finance')),
 target_id uuid not null,
 file_path text not null,
 description text,
 uploaded_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.sc_bk_records (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 case_id uuid references public.sc_bk_cases(id) on delete cascade,
 student_id uuid not null references public.sc_students(id),
 counselor_id uuid not null references auth.users(id),
 kind text not null check(kind in ('need','counseling','group','classical','rpl','program','agenda','followup','visit','referral','career','document')),
 domain text not null check(domain in ('Pribadi','Sosial','Belajar','Karier')),
 happened_on date not null,
 title text not null,
 confidential boolean not null default true,
 notes text,
 follow_up_on date,
 created_at timestamptz not null default now(),
 check(kind not in ('counseling','visit') or confidential)
);
create index if not exists sc_bk_records_assigned_idx on public.sc_bk_records(school_id,counselor_id,happened_on desc);
create table if not exists public.sc_discipline_followups (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 event_id uuid not null references public.sc_discipline_events(id) on delete cascade,
 action_taken text not null,
 due_on date,
 status text not null default 'open' check(status in ('open','in_progress','completed')),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.sc_finance_accounts (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 name text not null,
 kind text not null check(kind in ('cash','bank','ewallet','other')),
 opening_balance numeric(16,2) not null default 0,
 created_at timestamptz not null default now(),
 unique(school_id,name)
);
alter table public.sc_finance_transactions add column if not exists account_id uuid references public.sc_finance_accounts(id);
create table if not exists public.sc_budget_lines (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 fiscal_year integer not null check(fiscal_year between 2020 and 2100),
 program_id uuid references public.sc_programs(id),
 category text not null,
 amount numeric(16,2) not null check(amount>=0),
 notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.sc_hr_compensation (
 staff_id uuid primary key references public.sc_staff(id) on delete cascade,
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 base_salary numeric(16,2) not null default 0 check(base_salary>=0),
 allowance numeric(16,2) not null default 0 check(allowance>=0),
 deduction numeric(16,2) not null default 0 check(deduction>=0),
 updated_at timestamptz not null default now()
);
alter table public.sc_payroll_records
 add column if not exists base_salary numeric(16,2) not null default 0,
 add column if not exists allowances numeric(16,2) not null default 0,
 add column if not exists absence_deduction numeric(16,2) not null default 0,
 add column if not exists staff_snapshot jsonb not null default '{}'::jsonb;
create table if not exists public.sc_documents (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 kind text not null check(kind in ('PBD','KSP','KOSP','RKJM','RKT','RKAS','SOP','SUPERVISION','TEACHING','REPORT','OTHER')),
 title text not null,
 content text not null default '',
 status text not null default 'draft' check(status in ('draft','review','approved','archived')),
 revision integer not null default 1,
 created_by uuid not null references auth.users(id),
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.sc_document_versions (
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references public.sc_documents(id) on delete cascade,
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 revision integer not null,
 content text not null,
 changed_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(document_id,revision)
);
create table if not exists public.sc_supervisions (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 teacher_id uuid not null references auth.users(id),
 instrument text not null check(instrument in ('atp','module','administration','implementation')),
 scheduled_on date not null,
 notes text,
 status text not null default 'draft' check(status in ('draft','review','final')),
 observer_id uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.sc_supervision_answers (
 id uuid primary key default gen_random_uuid(),
 supervision_id uuid not null references public.sc_supervisions(id) on delete cascade,
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 item_key text not null,
 grade integer check(grade between 0 and 2),
 remark text,
 unique(supervision_id,item_key)
);
create table if not exists public.sc_ai_drafts (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 module_key text not null check(module_key in ('guru_ai','kepsek_ai')),
 template_key text,
 title text not null,
 prompt text not null,
 content text not null,
 created_at timestamptz not null default now()
);

-- Read/write permissions on each owned domain.
alter table public.sc_subjects enable row level security;
alter table public.sc_teacher_assignments enable row level security;
alter table public.sc_teacher_schedules enable row level security;
alter table public.sc_calendar_events enable row level security;
alter table public.sc_program_tasks enable row level security;
alter table public.sc_meetings enable row level security;
alter table public.sc_evidence enable row level security;
alter table public.sc_bk_records enable row level security;
alter table public.sc_discipline_followups enable row level security;
alter table public.sc_finance_accounts enable row level security;
alter table public.sc_budget_lines enable row level security;
alter table public.sc_hr_compensation enable row level security;
alter table public.sc_documents enable row level security;
alter table public.sc_document_versions enable row level security;
alter table public.sc_supervisions enable row level security;
alter table public.sc_supervision_answers enable row level security;
alter table public.sc_ai_drafts enable row level security;
revoke all on public.sc_subjects,public.sc_teacher_assignments,public.sc_teacher_schedules,public.sc_calendar_events,public.sc_program_tasks,public.sc_meetings,public.sc_evidence,public.sc_bk_records,public.sc_discipline_followups,public.sc_finance_accounts,public.sc_budget_lines,public.sc_hr_compensation,public.sc_documents,public.sc_document_versions,public.sc_supervisions,public.sc_supervision_answers,public.sc_ai_drafts from anon,authenticated;

create policy sc_subjects_r on public.sc_subjects for select to authenticated using(public.sc_member(school_id));
create policy sc_subjects_w on public.sc_subjects for insert to authenticated with check(public.sc_manager(school_id) and public.sc_write_active(school_id));
grant select,insert on public.sc_subjects to authenticated;

create policy sc_assignments_r on public.sc_teacher_assignments for select to authenticated using(public.sc_manager(school_id) or (teacher_id=auth.uid() and public.sc_member(school_id)));
create policy sc_assignments_w on public.sc_teacher_assignments for insert to authenticated with check(public.sc_manager(school_id) and public.sc_write_active(school_id) and exists(select 1 from public.sc_classes c where c.id=class_id and c.school_id=sc_teacher_assignments.school_id) and exists(select 1 from public.sc_members m where m.school_id=sc_teacher_assignments.school_id and m.user_id=teacher_id) and (subject_id is null or exists(select 1 from public.sc_subjects s where s.school_id=sc_teacher_assignments.school_id and s.id=subject_id)));
grant select,insert on public.sc_teacher_assignments to authenticated;
create policy sc_schedules_r on public.sc_teacher_schedules for select to authenticated using(public.sc_manager(school_id) or exists(select 1 from public.sc_teacher_assignments a where a.id=assignment_id and a.school_id=sc_teacher_schedules.school_id and a.teacher_id=auth.uid()));
create policy sc_schedules_w on public.sc_teacher_schedules for insert to authenticated with check(public.sc_manager(school_id) and public.sc_write_active(school_id) and exists(select 1 from public.sc_teacher_assignments a where a.id=assignment_id and a.school_id=sc_teacher_schedules.school_id));
grant select,insert on public.sc_teacher_schedules to authenticated;
create policy sc_calendar_r on public.sc_calendar_events for select to authenticated using(public.sc_member(school_id));
create policy sc_calendar_w on public.sc_calendar_events for insert to authenticated with check(public.sc_write_active(school_id) and public.sc_role(school_id)<>'viewer' and created_by=auth.uid() and (pic_id is null or exists(select 1 from public.sc_members m where m.school_id=sc_calendar_events.school_id and m.user_id=pic_id)));
grant select,insert on public.sc_calendar_events to authenticated;
create policy sc_tasks_r on public.sc_program_tasks for select to authenticated using(public.sc_member(school_id));
create policy sc_tasks_w on public.sc_program_tasks for insert to authenticated with check(public.sc_write_active(school_id) and public.sc_role(school_id)<>'viewer' and created_by=auth.uid() and exists(select 1 from public.sc_programs p where p.id=program_id and p.school_id=sc_program_tasks.school_id) and (pic_id is null or exists(select 1 from public.sc_members m where m.school_id=sc_program_tasks.school_id and m.user_id=pic_id)));
grant select,insert on public.sc_program_tasks to authenticated;
create policy sc_meetings_r on public.sc_meetings for select to authenticated using(public.sc_member(school_id));
create policy sc_meetings_w on public.sc_meetings for insert to authenticated with check(public.sc_write_active(school_id) and public.sc_role(school_id)<>'viewer' and created_by=auth.uid());
grant select,insert on public.sc_meetings to authenticated;
create policy sc_evidence_r on public.sc_evidence for select to authenticated using(public.sc_member(school_id) and target_type not in ('finance'));
create policy sc_evidence_finance_r on public.sc_evidence for select to authenticated using(public.sc_role(school_id) in ('owner','principal','treasurer') and target_type='finance');
create policy sc_evidence_w on public.sc_evidence for insert to authenticated with check(public.sc_write_active(school_id) and public.sc_role(school_id)<>'viewer' and uploaded_by=auth.uid());
grant select,insert on public.sc_evidence to authenticated;
create policy sc_bk_records_r on public.sc_bk_records for select to authenticated using(public.sc_role(school_id)='counselor' and counselor_id=auth.uid());
create policy sc_bk_records_w on public.sc_bk_records for insert to authenticated with check(public.sc_role(school_id)='counselor' and counselor_id=auth.uid() and public.sc_write_active(school_id) and exists(select 1 from public.sc_students s where s.id=student_id and s.school_id=sc_bk_records.school_id) and (case_id is null or exists(select 1 from public.sc_bk_cases c where c.id=case_id and c.school_id=sc_bk_records.school_id and c.student_id=student_id and c.assigned_counselor=auth.uid())));
grant select,insert on public.sc_bk_records to authenticated;
create policy sc_disc_follow_r on public.sc_discipline_followups for select to authenticated using(public.sc_member(school_id) and public.sc_role(school_id)<>'viewer');
create policy sc_disc_follow_w on public.sc_discipline_followups for insert to authenticated with check(public.sc_write_active(school_id) and public.sc_role(school_id) in ('owner','principal','vice_principal','teacher','counselor') and created_by=auth.uid() and exists(select 1 from public.sc_discipline_events e where e.id=event_id and e.school_id=sc_discipline_followups.school_id));
grant select,insert on public.sc_discipline_followups to authenticated;
create policy sc_accounts_r on public.sc_finance_accounts for select to authenticated using(public.sc_role(school_id) in ('owner','principal','treasurer'));
create policy sc_accounts_w on public.sc_finance_accounts for insert to authenticated with check(public.sc_write_active(school_id) and public.sc_role(school_id) in ('owner','principal','treasurer'));
grant select,insert on public.sc_finance_accounts to authenticated;
create policy sc_budgets_r on public.sc_budget_lines for select to authenticated using(public.sc_role(school_id) in ('owner','principal','treasurer'));
create policy sc_budgets_w on public.sc_budget_lines for insert to authenticated with check(public.sc_write_active(school_id) and public.sc_role(school_id) in ('owner','principal','treasurer') and (program_id is null or exists(select 1 from public.sc_programs p where p.id=program_id and p.school_id=sc_budget_lines.school_id)));
grant select,insert on public.sc_budget_lines to authenticated;
create policy sc_comp_r on public.sc_hr_compensation for select to authenticated using(public.sc_role(school_id) in ('owner','hr'));
grant select on public.sc_hr_compensation to authenticated;
create policy sc_docs_r on public.sc_documents for select to authenticated using(public.sc_member(school_id) and public.sc_role(school_id)<>'viewer' and (kind not in ('RKAS') or public.sc_role(school_id) in ('owner','principal','treasurer')));
create policy sc_docs_w on public.sc_documents for insert to authenticated with check(public.sc_write_active(school_id) and created_by=auth.uid() and public.sc_role(school_id) in ('owner','principal','vice_principal','teacher') and (kind not in ('RKAS') or public.sc_role(school_id) in ('owner','principal')));
grant select,insert on public.sc_documents to authenticated;
create policy sc_versions_r on public.sc_document_versions for select to authenticated using(exists(select 1 from public.sc_documents d where d.id=document_id and d.school_id=sc_document_versions.school_id));
grant select on public.sc_document_versions to authenticated;
create policy sc_supervisions_r on public.sc_supervisions for select to authenticated using(public.sc_manager(school_id) or (teacher_id=auth.uid() and public.sc_member(school_id)));
create policy sc_supervisions_w on public.sc_supervisions for insert to authenticated with check(public.sc_manager(school_id) and public.sc_write_active(school_id) and observer_id=auth.uid() and exists(select 1 from public.sc_members m where m.school_id=sc_supervisions.school_id and m.user_id=teacher_id));
grant select,insert on public.sc_supervisions to authenticated;
create policy sc_answers_r on public.sc_supervision_answers for select to authenticated using(exists(select 1 from public.sc_supervisions s where s.id=supervision_id and s.school_id=sc_supervision_answers.school_id and (public.sc_manager(s.school_id) or s.teacher_id=auth.uid())));
grant select on public.sc_supervision_answers to authenticated;
create policy sc_drafts_r on public.sc_ai_drafts for select to authenticated using(user_id=auth.uid() and public.sc_member(school_id));
grant select on public.sc_ai_drafts to authenticated;

-- Guarded mutations: update UI never uses unrestricted table UPDATE on these entities.
create or replace function public.sc_rename_class(p_school uuid,p_class uuid,p_name text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak';end if;
 if length(trim(p_name)) not between 1 and 100 then raise exception 'Nama kelas tidak valid';end if;
 update public.sc_classes set name=trim(p_name) where id=p_class and school_id=p_school;
 if not found then raise exception 'Kelas tidak ditemukan';end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id) values(p_school,auth.uid(),'class.renamed',p_class::text);
end $$;
create or replace function public.sc_update_student(p_school uuid,p_student uuid,p_name text,p_class uuid,p_status text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak';end if;
 if length(trim(p_name)) not between 2 and 160 or p_status not in ('active','archived') then raise exception 'Data siswa tidak valid';end if;
 if p_class is not null and not exists(select 1 from public.sc_classes where id=p_class and school_id=p_school) then raise exception 'Kelas bukan milik sekolah';end if;
 update public.sc_students set name=trim(p_name),class_id=p_class,status=p_status,archived_at=case when p_status='archived' then coalesce(archived_at,now()) else null end where id=p_student and school_id=p_school;
 if not found then raise exception 'Siswa tidak ditemukan';end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata) values(p_school,auth.uid(),'student.updated',p_student::text,jsonb_build_object('status',p_status));
end $$;
create or replace function public.sc_decide_task(p_school uuid,p_task uuid,p_status text,p_problem text,p_result text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_pic uuid;
begin
 if not public.sc_write_active(p_school) or public.sc_role(p_school)='viewer' then raise exception 'Akses ditolak';end if;
 if p_status not in ('todo','doing','blocked','review','done') then raise exception 'Status tidak valid';end if;
 select pic_id into v_pic from public.sc_program_tasks where id=p_task and school_id=p_school;
 if not found or (not public.sc_manager(p_school) and v_pic is distinct from auth.uid()) then raise exception 'Bukan PIC tugas';end if;
 update public.sc_program_tasks set status=p_status,problem=p_problem,result=p_result where school_id=p_school and id=p_task;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id) values(p_school,auth.uid(),'task.status.changed',p_task::text);
end $$;
create or replace function public.sc_save_document(p_school uuid,p_document uuid,p_kind text,p_title text,p_content text,p_submit boolean default false) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;v_rev integer;v_status text;v_author uuid;
begin
 if not public.sc_write_active(p_school) or public.sc_role(p_school) not in ('owner','principal','vice_principal','teacher') then raise exception 'Akses ditolak';end if;
 if p_kind not in ('PBD','KSP','KOSP','RKJM','RKT','RKAS','SOP','SUPERVISION','TEACHING','REPORT','OTHER') or length(trim(p_title)) not between 3 and 180 or length(p_content)>150000 then raise exception 'Dokumen tidak valid';end if;
 if p_kind='RKAS' and public.sc_role(p_school) not in ('owner','principal') then raise exception 'Akses RKAS terbatas';end if;
 if p_document is null then
  insert into public.sc_documents(school_id,kind,title,content,status,created_by) values(p_school,p_kind,trim(p_title),p_content,case when p_submit then 'review' else 'draft' end,auth.uid()) returning id,revision into v_id,v_rev;
 else
  select status,created_by into v_status,v_author from public.sc_documents where id=p_document and school_id=p_school for update;
  if not found or v_status in ('approved','archived') or (v_author<>auth.uid() and not public.sc_manager(p_school)) then raise exception 'Dokumen tidak dapat diedit';end if;
  update public.sc_documents set kind=p_kind,title=trim(p_title),content=p_content,status=case when p_submit then 'review' else 'draft' end,revision=revision+1,updated_at=now() where id=p_document and school_id=p_school returning id,revision into v_id,v_rev;
 end if;
 insert into public.sc_document_versions(document_id,school_id,revision,content,changed_by) values(v_id,p_school,v_rev,p_content,auth.uid());
 insert into public.sc_audit_log(school_id,actor_id,action,target_id) values(p_school,auth.uid(),'document.saved',v_id::text);
 return v_id;
end $$;
create or replace function public.sc_approve_document(p_school uuid,p_document uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak';end if;
 update public.sc_documents set status='approved',approved_by=auth.uid(),approved_at=now(),updated_at=now() where school_id=p_school and id=p_document and status='review';
 if not found then raise exception 'Hanya dokumen dalam review dapat disetujui';end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id) values(p_school,auth.uid(),'document.approved',p_document::text);
end $$;
create or replace function public.sc_save_supervision_answer(p_school uuid,p_supervision uuid,p_item text,p_grade integer,p_remark text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak';end if;
 if p_grade not between 0 and 2 or length(trim(p_item))<1 then raise exception 'Nilai instrumen tidak valid';end if;
 if not exists(select 1 from public.sc_supervisions where id=p_supervision and school_id=p_school and status='draft') then raise exception 'Instrumen sudah dikunci atau tidak tersedia';end if;
 insert into public.sc_supervision_answers(supervision_id,school_id,item_key,grade,remark) values(p_supervision,p_school,p_item,p_grade,p_remark)
 on conflict(supervision_id,item_key) do update set grade=excluded.grade,remark=excluded.remark;
end $$;
create or replace function public.sc_finalize_supervision(p_school uuid,p_supervision uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak';end if;
 update public.sc_supervisions set status='final' where school_id=p_school and id=p_supervision and status='draft';
 if not found then raise exception 'Supervisi tidak ditemukan atau sudah selesai';end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id) values(p_school,auth.uid(),'supervision.finalized',p_supervision::text);
end $$;
revoke all on function public.sc_rename_class(uuid,uuid,text),public.sc_update_student(uuid,uuid,text,uuid,text),public.sc_decide_task(uuid,uuid,text,text,text),public.sc_save_document(uuid,uuid,text,text,text,boolean),public.sc_approve_document(uuid,uuid),public.sc_save_supervision_answer(uuid,uuid,text,integer,text),public.sc_finalize_supervision(uuid,uuid) from public;
grant execute on function public.sc_rename_class(uuid,uuid,text),public.sc_update_student(uuid,uuid,text,uuid,text),public.sc_decide_task(uuid,uuid,text,text,text),public.sc_save_document(uuid,uuid,text,text,text,boolean),public.sc_approve_document(uuid,uuid),public.sc_save_supervision_answer(uuid,uuid,text,integer,text),public.sc_finalize_supervision(uuid,uuid) to authenticated;
