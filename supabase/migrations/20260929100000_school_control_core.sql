-- School Control: isolated, non-destructive starter schema (2026-09-29).
-- Run ONLY in a new dedicated School Control Supabase project.
create extension if not exists pgcrypto;

create table if not exists public.sc_schools (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 3 and 120),
 timezone text not null default 'Asia/Jakarta',
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.sc_members (
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','principal','vice_principal','teacher','counselor','hr','treasurer','staff','viewer')),
 created_at timestamptz not null default now(),
 primary key (school_id,user_id)
);
create table if not exists public.sc_subscriptions (
 school_id uuid primary key references public.sc_schools(id) on delete cascade,
 status text not null check (status in ('trial','active','past_due','expired','cancelled')),
 trial_ends_at timestamptz not null,
 current_period_end timestamptz,
 updated_at timestamptz not null default now()
);
create table if not exists public.sc_invitations (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 code_hash text not null unique,
 role text not null check (role in ('principal','vice_principal','teacher','counselor','hr','treasurer','staff','viewer')),
 expires_at timestamptz not null,
 created_by uuid not null references auth.users(id),
 used_by uuid references auth.users(id),
 used_at timestamptz
);
create table if not exists public.sc_staff (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 user_id uuid references auth.users(id),
 name text not null,
 position text,
 shift_start time not null default time '07:00',
 late_tolerance_minutes integer not null default 15 check (late_tolerance_minutes between 0 and 120),
 created_at timestamptz not null default now()
);
create unique index if not exists sc_staff_member_unique on public.sc_staff(school_id,user_id) where user_id is not null;
create table if not exists public.sc_attendance (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 duty_date date not null,
 check_in_at timestamptz,
 check_out_at timestamptz,
 status text not null check(status in ('present','late','manual','leave')),
 source text not null check(source in ('self','manual')),
 notes text,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 unique(school_id,user_id,duty_date),
 check (check_out_at is null or (check_in_at is not null and check_out_at >= check_in_at) or source='manual')
);
create index if not exists sc_attendance_school_day_idx on public.sc_attendance(school_id,duty_date desc);
create table if not exists public.sc_classes (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 name text not null,
 grade text,
 academic_year text not null,
 unique(school_id,academic_year,name)
);
create table if not exists public.sc_students (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 class_id uuid references public.sc_classes(id),
 nis text,
 name text not null,
 status text not null default 'active' check(status in ('active','archived')),
 created_at timestamptz not null default now(),
 unique(school_id,nis)
);
create table if not exists public.sc_records (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 module_key text not null check(module_key in ('guru_ai','kepsek_ai','buku_kerja','disiplin','command','sikas','gajian')),
 title text not null check(length(trim(title)) between 1 and 180),
 notes text,
 status text not null default 'draft' check(status in ('draft','active','completed','archived')),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists sc_records_module_idx on public.sc_records(school_id,module_key,created_at desc);
create table if not exists public.sc_programs (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 title text not null,
 owner_id uuid references auth.users(id),
 pic_id uuid references auth.users(id),
 deadline date,
 status text not null default 'planned' check(status in ('planned','ongoing','blocked','completed','verified')),
 evidence_path text,
 created_at timestamptz not null default now()
);
create table if not exists public.sc_staff_events (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 staff_user_id uuid not null references auth.users(id),
 event_type text not null check (event_type in ('program','training','supervision','achievement','feedback')),
 title text not null,
 occurred_at date not null,
 evidence_path text,
 verified_by uuid references auth.users(id),
 verified_at timestamptz,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.sc_discipline_events (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 student_id uuid not null references public.sc_students(id),
 category text not null check(category in ('violation','achievement','coaching')),
 title text not null,
 occurred_at date not null,
 follow_up text,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.sc_bk_cases (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 student_id uuid not null references public.sc_students(id),
 assigned_counselor uuid not null references auth.users(id),
 status text not null default 'open' check(status in ('open','ongoing','closed')),
 category text not null,
 confidential_notes text,
 follow_up_date date,
 created_at timestamptz not null default now()
);
create table if not exists public.sc_finance_transactions (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 activity_id uuid references public.sc_programs(id),
 occurred_at date not null,
 kind text not null check(kind in ('income','expense')),
 category text not null,
 amount numeric(16,2) not null check(amount > 0),
 description text,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.sc_payroll_records (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 staff_id uuid not null references public.sc_staff(id),
 period text not null check(period ~ '^[0-9]{4}-[0-9]{2}$'),
 gross numeric(16,2) not null default 0,
 deductions numeric(16,2) not null default 0,
 status text not null default 'draft' check(status in ('draft','approved','paid')),
 approved_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 unique(school_id,staff_id,period)
);
create table if not exists public.sc_payment_orders (
 order_id text primary key,
 school_id uuid not null references public.sc_schools(id),
 gross_amount integer not null check(gross_amount>0),
 period_days integer not null check(period_days between 1 and 366),
 status text not null default 'pending' check(status in ('pending','paid','failed','expired')),
 gateway_transaction_id text,
 paid_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.sc_audit_log (
 id bigint generated always as identity primary key,
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 actor_id uuid references auth.users(id),
 action text not null,
 target_id text,
 metadata jsonb not null default '{}'::jsonb,
 occurred_at timestamptz not null default now()
);

create or replace function public.sc_role(p_school uuid) returns text
 language sql stable security definer set search_path=public,pg_temp as $$
  select role from public.sc_members where school_id=p_school and user_id=auth.uid() limit 1
 $$;
create or replace function public.sc_member(p_school uuid) returns boolean
 language sql stable security definer set search_path=public,pg_temp as $$
  select auth.uid() is not null and exists(select 1 from public.sc_members where school_id=p_school and user_id=auth.uid())
 $$;
create or replace function public.sc_manager(p_school uuid) returns boolean
 language sql stable security definer set search_path=public,pg_temp as $$
  select public.sc_role(p_school) in ('owner','principal','vice_principal')
 $$;
create or replace function public.sc_write_active(p_school uuid) returns boolean
 language sql stable security definer set search_path=public,pg_temp as $$
  select public.sc_member(p_school) and exists(
   select 1 from public.sc_subscriptions where school_id=p_school and
    ((status='trial' and trial_ends_at>now()) or
     (status='active' and current_period_end>now()))
  )
 $$;
create or replace function public.sc_module_access(p_school uuid,p_module text) returns boolean
 language sql stable security definer set search_path=public,pg_temp as $$
 select public.sc_member(p_school) and case
  when p_module='sikas' then public.sc_role(p_school) in ('owner','principal','treasurer')
  when p_module='gajian' then public.sc_role(p_school) in ('owner','hr')
  when p_module='kepsek_ai' then public.sc_role(p_school) in ('owner','principal','vice_principal')
  else true end
 $$;

create or replace function public.sc_create_school(p_name text) returns uuid
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_school uuid;
 begin
  if auth.uid() is null then raise exception 'Login diperlukan'; end if;
  if length(trim(p_name)) not between 3 and 120 then raise exception 'Nama sekolah tidak valid'; end if;
  insert into public.sc_schools(name,created_by) values(trim(p_name),auth.uid()) returning id into v_school;
  insert into public.sc_members(school_id,user_id,role) values(v_school,auth.uid(),'owner');
  insert into public.sc_subscriptions(school_id,status,trial_ends_at) values(v_school,'trial',now()+interval '7 days');
  insert into public.sc_audit_log(school_id,actor_id,action) values(v_school,auth.uid(),'school.created');
  return v_school;
 end $$;
create or replace function public.sc_create_invite(p_school uuid,p_role text) returns text
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_code text;
 begin
  if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak'; end if;
  if p_role not in ('principal','vice_principal','teacher','counselor','hr','treasurer','staff','viewer') then raise exception 'Peran tidak valid'; end if;
  v_code:=encode(gen_random_bytes(24),'hex');
  insert into public.sc_invitations(school_id,code_hash,role,expires_at,created_by)
   values(p_school,encode(digest(v_code,'sha256'),'hex'),p_role,now()+interval '7 days',auth.uid());
  return v_code;
 end $$;
create or replace function public.sc_accept_invite(p_code text) returns uuid
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_inv public.sc_invitations%rowtype;
 begin
  if auth.uid() is null then raise exception 'Login diperlukan'; end if;
  select * into v_inv from public.sc_invitations where code_hash=encode(digest(trim(p_code),'sha256'),'hex') and expires_at>now() and used_at is null for update;
  if not found then raise exception 'Undangan tidak sah atau telah kedaluwarsa'; end if;
  insert into public.sc_members(school_id,user_id,role) values(v_inv.school_id,auth.uid(),v_inv.role) on conflict(school_id,user_id) do nothing;
  update public.sc_invitations set used_by=auth.uid(),used_at=now() where id=v_inv.id;
  insert into public.sc_audit_log(school_id,actor_id,action) values(v_inv.school_id,auth.uid(),'team.invite.accepted');
  return v_inv.school_id;
 end $$;
create or replace function public.sc_ensure_own_staff(p_school uuid) returns uuid
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_id uuid;v_name text;
 begin
  if not public.sc_member(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses sekolah tidak aktif'; end if;
  select id into v_id from public.sc_staff where school_id=p_school and user_id=auth.uid();
  if v_id is not null then return v_id; end if;
  select split_part(email,'@',1) into v_name from auth.users where id=auth.uid();
  insert into public.sc_staff(school_id,user_id,name) values(p_school,auth.uid(),coalesce(nullif(v_name,''),'Pengguna')) returning id into v_id;
  return v_id;
 end $$;
create or replace function public.sc_check_in(p_school uuid) returns public.sc_attendance
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_staff public.sc_staff%rowtype;v_zone text;v_day date;v_local time;v_state text;v_row public.sc_attendance%rowtype;
 begin
  if not public.sc_write_active(p_school) then raise exception 'Langganan sekolah tidak aktif'; end if;
  select * into v_staff from public.sc_staff where school_id=p_school and user_id=auth.uid();
  if not found then raise exception 'Profil guru/staf belum terhubung'; end if;
  select timezone into v_zone from public.sc_schools where id=p_school;
  v_day:=(now() at time zone v_zone)::date;v_local:=(now() at time zone v_zone)::time;
  v_state:=case when v_local>(v_staff.shift_start+make_interval(mins=>v_staff.late_tolerance_minutes))::time then 'late' else 'present' end;
  insert into public.sc_attendance(school_id,user_id,duty_date,check_in_at,status,source,created_by)
   values(p_school,auth.uid(),v_day,now(),v_state,'self',auth.uid())
   on conflict(school_id,user_id,duty_date) do nothing;
  select * into v_row from public.sc_attendance where school_id=p_school and user_id=auth.uid() and duty_date=v_day;
  return v_row;
 end $$;
create or replace function public.sc_check_out(p_school uuid) returns public.sc_attendance
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_row public.sc_attendance%rowtype;v_zone text;v_day date;
 begin
  if not public.sc_write_active(p_school) then raise exception 'Langganan sekolah tidak aktif'; end if;
  select timezone into v_zone from public.sc_schools where id=p_school; v_day:=(now() at time zone v_zone)::date;
  select * into v_row from public.sc_attendance where school_id=p_school and user_id=auth.uid() and duty_date=v_day for update;
  if not found or v_row.check_in_at is null or v_row.source<>'self' then raise exception 'Absen masuk mandiri harus dilakukan terlebih dahulu'; end if;
  if v_row.check_out_at is not null then return v_row; end if;
  update public.sc_attendance set check_out_at=now() where id=v_row.id returning * into v_row;
  return v_row;
 end $$;
create or replace function public.sc_manual_attendance(p_school uuid,p_user uuid,p_day date,p_reason text) returns uuid
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_id uuid;
 begin
  if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak'; end if;
  if length(trim(coalesce(p_reason,'')))<10 then raise exception 'Alasan koreksi wajib minimal 10 karakter'; end if;
  if not exists(select 1 from public.sc_staff where school_id=p_school and user_id=p_user) then raise exception 'SDM tidak terdaftar'; end if;
  if exists(select 1 from public.sc_attendance where school_id=p_school and user_id=p_user and duty_date=p_day) then raise exception 'Catatan hari tersebut sudah ada. Koreksi memerlukan alur persetujuan terpisah'; end if;
  insert into public.sc_attendance(school_id,user_id,duty_date,status,source,notes,created_by)
   values(p_school,p_user,p_day,'manual','manual',trim(p_reason),auth.uid()) returning id into v_id;
  insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
   values(p_school,auth.uid(),'attendance.manual',v_id::text,jsonb_build_object('reason',p_reason,'user_id',p_user,'duty_date',p_day));
  return v_id;
 end $$;
create or replace function public.sc_performance_summary(p_school uuid,p_user uuid) returns jsonb
 language plpgsql stable security definer set search_path=public,pg_temp as $$
 declare v_res jsonb;
 begin
  if not public.sc_member(p_school) or (p_user<>auth.uid() and not public.sc_manager(p_school) and public.sc_role(p_school)<>'hr') then raise exception 'Akses ditolak'; end if;
  select jsonb_build_object(
    'present_days',(select count(*) from public.sc_attendance where school_id=p_school and user_id=p_user and status in ('present','late')),
    'late_days',(select count(*) from public.sc_attendance where school_id=p_school and user_id=p_user and status='late'),
    'programs',(select count(*) from public.sc_staff_events where school_id=p_school and staff_user_id=p_user and event_type='program' and verified_at is not null),
    'trainings',(select count(*) from public.sc_staff_events where school_id=p_school and staff_user_id=p_user and event_type='training' and verified_at is not null),
    'verified_events',(select count(*) from public.sc_staff_events where school_id=p_school and staff_user_id=p_user and verified_at is not null)
  ) into v_res;
  return v_res;
 end $$;
create or replace function public.sc_bk_aggregate(p_school uuid) returns jsonb
 language plpgsql stable security definer set search_path=public,pg_temp as $$
 declare v_total integer;
 begin
  if not public.sc_member(p_school) or (not public.sc_manager(p_school) and public.sc_role(p_school)<>'counselor') then raise exception 'Akses ditolak';end if;
  select count(*) into v_total from public.sc_bk_cases where school_id=p_school;
  return jsonb_build_object('total_cases',v_total);
 end $$;

alter table public.sc_schools enable row level security;
alter table public.sc_members enable row level security;
alter table public.sc_subscriptions enable row level security;
alter table public.sc_invitations enable row level security;
alter table public.sc_staff enable row level security;
alter table public.sc_attendance enable row level security;
alter table public.sc_classes enable row level security;
alter table public.sc_students enable row level security;
alter table public.sc_records enable row level security;
alter table public.sc_programs enable row level security;
alter table public.sc_staff_events enable row level security;
alter table public.sc_discipline_events enable row level security;
alter table public.sc_bk_cases enable row level security;
alter table public.sc_finance_transactions enable row level security;
alter table public.sc_payroll_records enable row level security;
alter table public.sc_payment_orders enable row level security;
alter table public.sc_audit_log enable row level security;

create policy sc_schools_read on public.sc_schools for select to authenticated using(public.sc_member(id));
create policy sc_members_read on public.sc_members for select to authenticated using(user_id=auth.uid() or public.sc_manager(school_id));
create policy sc_subscriptions_read on public.sc_subscriptions for select to authenticated using(public.sc_member(school_id));
create policy sc_invitations_read on public.sc_invitations for select to authenticated using(public.sc_manager(school_id));
create policy sc_staff_read on public.sc_staff for select to authenticated using(public.sc_member(school_id));
create policy sc_attendance_read on public.sc_attendance for select to authenticated using(user_id=auth.uid() or public.sc_manager(school_id) or public.sc_role(school_id)='hr');
create policy sc_classes_read on public.sc_classes for select to authenticated using(public.sc_member(school_id));
create policy sc_classes_write on public.sc_classes for insert to authenticated with check(public.sc_manager(school_id) and public.sc_write_active(school_id));
create policy sc_students_read on public.sc_students for select to authenticated using(public.sc_member(school_id));
create policy sc_students_write on public.sc_students for insert to authenticated with check(public.sc_manager(school_id) and public.sc_write_active(school_id) and (class_id is null or exists(select 1 from public.sc_classes where id=class_id and school_id=sc_students.school_id)));
create policy sc_records_read on public.sc_records for select to authenticated using(public.sc_module_access(school_id,module_key));
create policy sc_records_write on public.sc_records for insert to authenticated with check(public.sc_module_access(school_id,module_key) and public.sc_write_active(school_id) and created_by=auth.uid());
create policy sc_programs_read on public.sc_programs for select to authenticated using(public.sc_member(school_id));
create policy sc_programs_write on public.sc_programs for insert to authenticated with check(public.sc_manager(school_id) and public.sc_write_active(school_id));
create policy sc_events_read on public.sc_staff_events for select to authenticated using(staff_user_id=auth.uid() or public.sc_manager(school_id) or public.sc_role(school_id)='hr');
create policy sc_events_write on public.sc_staff_events for insert to authenticated with check(public.sc_manager(school_id) and public.sc_write_active(school_id) and created_by=auth.uid());
create policy sc_discipline_read on public.sc_discipline_events for select to authenticated using(public.sc_member(school_id) and public.sc_role(school_id)<>'viewer');
create policy sc_discipline_write on public.sc_discipline_events for insert to authenticated with check(public.sc_member(school_id) and public.sc_role(school_id) in ('owner','principal','vice_principal','teacher','counselor') and public.sc_write_active(school_id));
create policy sc_bk_private_read on public.sc_bk_cases for select to authenticated using(assigned_counselor=auth.uid() and public.sc_role(school_id)='counselor');
create policy sc_bk_private_write on public.sc_bk_cases for insert to authenticated with check(assigned_counselor=auth.uid() and public.sc_role(school_id)='counselor' and public.sc_write_active(school_id));
create policy sc_finance_read on public.sc_finance_transactions for select to authenticated using(public.sc_role(school_id) in ('owner','principal','treasurer'));
create policy sc_finance_write on public.sc_finance_transactions for insert to authenticated with check(public.sc_role(school_id) in ('owner','principal','treasurer') and public.sc_write_active(school_id) and created_by=auth.uid());
create policy sc_payroll_read on public.sc_payroll_records for select to authenticated using(public.sc_role(school_id) in ('owner','hr'));
create policy sc_payroll_write on public.sc_payroll_records for insert to authenticated with check(public.sc_role(school_id) in ('owner','hr') and public.sc_write_active(school_id));
create policy sc_payments_read on public.sc_payment_orders for select to authenticated using(public.sc_role(school_id) in ('owner','principal'));
create policy sc_audit_read on public.sc_audit_log for select to authenticated using(public.sc_role(school_id) in ('owner','principal'));

revoke all on public.sc_schools,public.sc_members,public.sc_subscriptions,public.sc_invitations,public.sc_staff,public.sc_attendance,public.sc_classes,public.sc_students,public.sc_records,public.sc_programs,public.sc_staff_events,public.sc_discipline_events,public.sc_bk_cases,public.sc_finance_transactions,public.sc_payroll_records,public.sc_payment_orders,public.sc_audit_log from anon,authenticated;
grant select on public.sc_schools,public.sc_members,public.sc_subscriptions,public.sc_invitations,public.sc_staff,public.sc_attendance,public.sc_classes,public.sc_students,public.sc_records,public.sc_programs,public.sc_staff_events,public.sc_discipline_events,public.sc_bk_cases,public.sc_finance_transactions,public.sc_payroll_records,public.sc_payment_orders,public.sc_audit_log to authenticated;
grant insert on public.sc_classes,public.sc_students,public.sc_records,public.sc_programs,public.sc_staff_events,public.sc_discipline_events,public.sc_bk_cases,public.sc_finance_transactions,public.sc_payroll_records to authenticated;
revoke all on function public.sc_create_school(text),public.sc_create_invite(uuid,text),public.sc_accept_invite(text),public.sc_ensure_own_staff(uuid),public.sc_check_in(uuid),public.sc_check_out(uuid),public.sc_manual_attendance(uuid,uuid,date,text),public.sc_performance_summary(uuid,uuid),public.sc_bk_aggregate(uuid) from public;
grant execute on function public.sc_create_school(text),public.sc_create_invite(uuid,text),public.sc_accept_invite(text),public.sc_ensure_own_staff(uuid),public.sc_check_in(uuid),public.sc_check_out(uuid),public.sc_manual_attendance(uuid,uuid,date,text),public.sc_performance_summary(uuid,uuid),public.sc_bk_aggregate(uuid) to authenticated;
