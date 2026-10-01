create table if not exists public.sc_discipline_master_items(
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.sc_schools(id) on delete cascade,
 type text not null check(type in ('violation','achievement','sanction')),name text not null,category text,points integer not null default 0 check(points>=0),
 min_points integer,max_points integer,description text,is_active boolean not null default true,created_at timestamptz not null default now(),unique(school_id,type,name)
);
alter table public.sc_discipline_master_items enable row level security;
drop policy if exists sc_discipline_master_read on public.sc_discipline_master_items;
create policy sc_discipline_master_read on public.sc_discipline_master_items for select to authenticated using(public.sc_member(school_id));
drop policy if exists sc_discipline_master_write on public.sc_discipline_master_items;
create policy sc_discipline_master_write on public.sc_discipline_master_items for all to authenticated using(public.sc_write_active(school_id) and public.sc_role(school_id) in ('owner','principal','vice_principal','teacher','counselor')) with check(public.sc_write_active(school_id) and public.sc_role(school_id) in ('owner','principal','vice_principal','teacher','counselor'));

alter table public.sc_discipline_events
 add column if not exists master_item_id uuid references public.sc_discipline_master_items(id) on delete set null,
 add column if not exists event_type text,add column if not exists item_name_snapshot text,add column if not exists category_snapshot text,
 add column if not exists points_snapshot integer not null default 0,add column if not exists occurred_at_ts timestamptz,
 add column if not exists chronology text,add column if not exists recorder_name text;
update public.sc_discipline_events set event_type=case when category='achievement' then 'achievement' else 'violation' end where event_type is null;
alter table public.sc_discipline_events alter column event_type set default 'violation';
update public.sc_discipline_events set item_name_snapshot=coalesce(item_name_snapshot,title),occurred_at_ts=coalesce(occurred_at_ts,occurred_at::timestamp at time zone 'Asia/Jakarta') where item_name_snapshot is null or occurred_at_ts is null;

create table if not exists public.sc_discipline_coaching(
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.sc_schools(id) on delete cascade,student_id uuid not null references public.sc_students(id) on delete cascade,
 reason text not null,form text not null,result text,notes text,follow_up_date date,status text not null default 'pending',recorder_name text,happened_at timestamptz not null default now(),
 created_by uuid not null default auth.uid(),created_at timestamptz not null default now()
);
alter table public.sc_discipline_coaching enable row level security;
drop policy if exists sc_discipline_coaching_read on public.sc_discipline_coaching;
create policy sc_discipline_coaching_read on public.sc_discipline_coaching for select to authenticated using(public.sc_member(school_id));
drop policy if exists sc_discipline_coaching_write on public.sc_discipline_coaching;
create policy sc_discipline_coaching_write on public.sc_discipline_coaching for all to authenticated using(public.sc_write_active(school_id) and public.sc_role(school_id) in ('owner','principal','vice_principal','teacher','counselor')) with check(public.sc_write_active(school_id) and public.sc_role(school_id) in ('owner','principal','vice_principal','teacher','counselor'));

create table if not exists public.sc_discipline_actions(
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.sc_schools(id) on delete cascade,student_id uuid not null references public.sc_students(id) on delete cascade,
 event_id uuid references public.sc_discipline_events(id) on delete set null,sanction_name_snapshot text not null,threshold_points integer not null default 0,status text not null default 'pending',
 notes text,due_date date,completed_at timestamptz,created_by uuid not null default auth.uid(),created_at timestamptz not null default now()
);
alter table public.sc_discipline_actions enable row level security;
drop policy if exists sc_discipline_actions_read on public.sc_discipline_actions;
create policy sc_discipline_actions_read on public.sc_discipline_actions for select to authenticated using(public.sc_member(school_id));
drop policy if exists sc_discipline_actions_write on public.sc_discipline_actions;
create policy sc_discipline_actions_write on public.sc_discipline_actions for all to authenticated using(public.sc_write_active(school_id) and public.sc_role(school_id) in ('owner','principal','vice_principal','teacher','counselor')) with check(public.sc_write_active(school_id) and public.sc_role(school_id) in ('owner','principal','vice_principal','teacher','counselor'));
