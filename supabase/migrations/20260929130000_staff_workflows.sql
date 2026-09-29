-- Staff management enhancements: verified performance, leave approvals and controlled shift edits.
create table if not exists public.sc_leave_requests (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 kind text not null check(kind in ('annual','sick','permission','other')),
 from_date date not null,
 to_date date not null,
 reason text not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 decided_by uuid references auth.users(id),
 decided_at timestamptz,
 created_at timestamptz not null default now(),
 check(to_date>=from_date)
);
create index if not exists sc_leave_user_idx on public.sc_leave_requests(school_id,user_id,created_at desc);
alter table public.sc_leave_requests enable row level security;
create policy sc_leave_read on public.sc_leave_requests for select to authenticated
 using(user_id=auth.uid() or public.sc_manager(school_id) or public.sc_role(school_id)='hr');
create policy sc_leave_insert on public.sc_leave_requests for insert to authenticated
 with check(user_id=auth.uid() and public.sc_member(school_id) and public.sc_write_active(school_id) and status='pending'
 and exists(select 1 from public.sc_staff where school_id=sc_leave_requests.school_id and user_id=sc_leave_requests.user_id));
revoke all on public.sc_leave_requests from anon,authenticated;
grant select,insert on public.sc_leave_requests to authenticated;

create or replace function public.sc_update_staff(p_school uuid,p_staff uuid,p_name text,p_position text,p_shift time,p_tolerance integer) returns boolean
 language plpgsql security definer set search_path=public,pg_temp as $$
 begin
  if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak';end if;
  if length(trim(p_name)) not between 2 and 160 or p_tolerance not between 0 and 120 then raise exception 'Data SDM tidak valid';end if;
  update public.sc_staff set name=trim(p_name),position=nullif(trim(p_position),''),shift_start=p_shift,late_tolerance_minutes=p_tolerance
   where school_id=p_school and id=p_staff;
  if not found then raise exception 'SDM tidak ditemukan';end if;
  insert into public.sc_audit_log(school_id,actor_id,action,target_id) values(p_school,auth.uid(),'staff.updated',p_staff::text);
  return true;
 end $$;
create or replace function public.sc_add_staff_event(p_school uuid,p_user uuid,p_type text,p_title text,p_day date,p_evidence text default null) returns uuid
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_id uuid;
 begin
  if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak';end if;
  if p_type not in ('program','training','supervision','achievement','feedback') or length(trim(p_title)) not between 3 and 200 then raise exception 'Kegiatan tidak valid';end if;
  if not exists(select 1 from public.sc_staff where school_id=p_school and user_id=p_user) then raise exception 'SDM tidak berada di sekolah';end if;
  insert into public.sc_staff_events(school_id,staff_user_id,event_type,title,occurred_at,evidence_path,created_by)
   values(p_school,p_user,p_type,trim(p_title),p_day,p_evidence,auth.uid()) returning id into v_id;
  insert into public.sc_audit_log(school_id,actor_id,action,target_id) values(p_school,auth.uid(),'performance.evidence.created',v_id::text);
  return v_id;
 end $$;
create or replace function public.sc_verify_staff_event(p_school uuid,p_event uuid) returns boolean
 language plpgsql security definer set search_path=public,pg_temp as $$
 begin
  if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak';end if;
  update public.sc_staff_events set verified_by=auth.uid(),verified_at=now()
   where school_id=p_school and id=p_event and verified_at is null;
  if not found then raise exception 'Bukti tidak tersedia atau sudah diverifikasi';end if;
  insert into public.sc_audit_log(school_id,actor_id,action,target_id) values(p_school,auth.uid(),'performance.evidence.verified',p_event::text);
  return true;
 end $$;
create or replace function public.sc_decide_leave(p_school uuid,p_request uuid,p_approve boolean) returns boolean
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_user uuid;
 begin
  if not public.sc_manager(p_school) and public.sc_role(p_school)<>'hr' then raise exception 'Akses ditolak';end if;
  if not public.sc_write_active(p_school) then raise exception 'Langganan tidak aktif';end if;
  update public.sc_leave_requests set status=case when p_approve then 'approved' else 'rejected' end,
   decided_at=now(),decided_by=auth.uid() where id=p_request and school_id=p_school and status='pending' returning user_id into v_user;
  if not found then raise exception 'Pengajuan tidak ditemukan atau sudah diputuskan';end if;
  insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
   values(p_school,auth.uid(),'leave.decided',p_request::text,jsonb_build_object('approved',p_approve));
  return true;
 end $$;
revoke all on function public.sc_update_staff(uuid,uuid,text,text,time,integer),public.sc_add_staff_event(uuid,uuid,text,text,date,text),public.sc_verify_staff_event(uuid,uuid),public.sc_decide_leave(uuid,uuid,boolean) from public;
grant execute on function public.sc_update_staff(uuid,uuid,text,text,time,integer),public.sc_add_staff_event(uuid,uuid,text,text,date,text),public.sc_verify_staff_event(uuid,uuid),public.sc_decide_leave(uuid,uuid,boolean) to authenticated;
