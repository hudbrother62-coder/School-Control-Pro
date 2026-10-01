drop policy if exists "workflow run access" on public.sc_workflow_runs;
drop policy if exists "workflow step access" on public.sc_workflow_steps;

drop index if exists public.sc_workflow_runs_resume_idx;
drop index if exists public.sc_workflow_steps_run_idx;

create index if not exists sc_workflow_runs_user_status_idx
 on public.sc_workflow_runs(school_id,user_id,status,updated_at desc);
create index if not exists sc_workflow_steps_run_order_idx
 on public.sc_workflow_steps(run_id,step_order);
