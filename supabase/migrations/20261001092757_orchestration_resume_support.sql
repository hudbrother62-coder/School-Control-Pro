alter table public.sc_workflow_runs
 add column if not exists context jsonb not null default '{}'::jsonb,
 add column if not exists current_step_order integer,
 add column if not exists source text not null default 'deterministic',
 add column if not exists last_error text,
 add column if not exists completed_at timestamptz;

alter table public.sc_workflow_steps
 add column if not exists context jsonb not null default '{}'::jsonb,
 add column if not exists depends_on integer[] not null default '{}',
 add column if not exists blocked_reason text,
 add column if not exists completed_at timestamptz,
 add column if not exists updated_at timestamptz not null default now();

alter table public.sc_workflow_steps drop constraint if exists sc_workflow_steps_status_check;
alter table public.sc_workflow_steps add constraint sc_workflow_steps_status_check
 check (status in ('pending','active','done','skipped'));

create index if not exists sc_workflow_runs_resume_idx
 on public.sc_workflow_runs(school_id,user_id,status,updated_at desc);
