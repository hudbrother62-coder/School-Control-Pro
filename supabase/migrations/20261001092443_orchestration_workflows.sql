create table if not exists public.sc_workflow_runs (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 request text not null check (length(trim(request)) between 3 and 4000),
 title text not null check (length(trim(title)) between 1 and 120),
 status text not null default 'active' check (status in ('active','completed','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,school_id)
);
create index if not exists sc_workflow_runs_owner_idx
 on public.sc_workflow_runs(school_id,user_id,updated_at desc);

create table if not exists public.sc_workflow_steps (
 id uuid primary key default gen_random_uuid(),
 run_id uuid not null references public.sc_workflow_runs(id) on delete cascade,
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 step_order integer not null check (step_order between 1 and 8),
 module_key text not null check (module_key in ('overview','master','calendar','attendance','performance','guru_ai','kepsek_ai','buku_kerja','disiplin','bk','command','sikas','gajian','payslip','access','settings','help')),
 feature text not null default '',
 title text not null check (length(trim(title)) between 1 and 120),
 instruction text not null default '',
 status text not null default 'pending' check (status in ('pending','active','completed','blocked')),
 context jsonb not null default '{}'::jsonb,
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 unique(run_id,step_order),
 foreign key(run_id,school_id) references public.sc_workflow_runs(id,school_id) on delete cascade
);
create index if not exists sc_workflow_steps_run_idx on public.sc_workflow_steps(run_id,step_order);

alter table public.sc_workflow_runs enable row level security;
alter table public.sc_workflow_steps enable row level security;

create policy sc_workflow_runs_read on public.sc_workflow_runs
 for select to authenticated using (public.sc_member(school_id) and user_id=auth.uid());
create policy sc_workflow_runs_insert on public.sc_workflow_runs
 for insert to authenticated with check (public.sc_write_active(school_id) and user_id=auth.uid());
create policy sc_workflow_runs_update on public.sc_workflow_runs
 for update to authenticated using (public.sc_write_active(school_id) and user_id=auth.uid())
 with check (public.sc_write_active(school_id) and user_id=auth.uid());

create policy sc_workflow_steps_read on public.sc_workflow_steps
 for select to authenticated using (public.sc_member(school_id) and exists(
  select 1 from public.sc_workflow_runs r where r.id=run_id and r.user_id=auth.uid()
  and r.school_id=sc_workflow_steps.school_id
 ));
create policy sc_workflow_steps_insert on public.sc_workflow_steps
 for insert to authenticated with check (public.sc_write_active(school_id) and exists(
  select 1 from public.sc_workflow_runs r where r.id=run_id and r.user_id=auth.uid()
  and r.school_id=sc_workflow_steps.school_id
 ));
create policy sc_workflow_steps_update on public.sc_workflow_steps
 for update to authenticated using (public.sc_write_active(school_id) and exists(
  select 1 from public.sc_workflow_runs r where r.id=run_id and r.user_id=auth.uid()
  and r.school_id=sc_workflow_steps.school_id
 )) with check (public.sc_write_active(school_id) and exists(
  select 1 from public.sc_workflow_runs r where r.id=run_id and r.user_id=auth.uid()
  and r.school_id=sc_workflow_steps.school_id
 ));

grant select,insert,update on public.sc_workflow_runs,public.sc_workflow_steps to authenticated;
