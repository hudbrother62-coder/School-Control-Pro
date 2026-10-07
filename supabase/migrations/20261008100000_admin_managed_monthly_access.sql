-- Admin-managed accounts and calendar-month subscriptions. No public self-registration or trial.
alter table public.sc_schools add column if not exists is_paused boolean not null default false;

create table if not exists public.sc_platform_account_holds (
 user_id uuid primary key references auth.users(id) on delete cascade,
 is_disabled boolean not null default false,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
alter table public.sc_platform_account_holds enable row level security;
revoke all on public.sc_platform_account_holds from public,anon,authenticated;
grant select,insert,update on public.sc_platform_account_holds to service_role;

create table if not exists public.sc_platform_renewals (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 confirmation_ref text not null,
 confirmed_by uuid not null references auth.users(id),
 confirmed_at timestamptz not null default now(),
 period_start timestamptz not null,
 period_end timestamptz not null,
 note text,
 unique(school_id,confirmation_ref)
);
alter table public.sc_platform_renewals enable row level security;
revoke all on public.sc_platform_renewals from public,anon,authenticated;
grant select,insert on public.sc_platform_renewals to service_role;

-- Preserve existing customer schools while retiring their trial state.
update public.sc_subscriptions sub set
 status='active',
 current_period_end=coalesce(sub.current_period_end,school.created_at + interval '1 month'),
 updated_at=now()
from public.sc_schools school where school.id=sub.school_id and sub.status='trial';

-- Do not permit any signed-in user to provision a free school.
create or replace function public.sc_create_school(p_name text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 raise exception 'Pembuatan sekolah hanya melalui Super Admin' using errcode='42501';
end $$;
revoke all on function public.sc_create_school(text) from public,anon,authenticated;

-- Central membership entitlement: deny all tenant data access if payment expired,
-- school is paused, or individual account is disabled/banned.
create or replace function public.sc_member(p_school uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null
 and exists(select 1 from public.sc_members m where m.school_id=p_school and m.user_id=auth.uid() and m.is_active)
 and exists(select 1 from public.sc_schools s where s.id=p_school and not s.is_paused)
 and exists(select 1 from public.sc_subscriptions sub where sub.school_id=p_school and sub.status='active' and sub.current_period_end>now())
 and exists(select 1 from auth.users u where u.id=auth.uid() and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()))
 and not exists(select 1 from public.sc_platform_account_holds h where h.user_id=auth.uid() and h.is_disabled)
$$;

create or replace function public.sc_role(p_school uuid) returns text
language sql stable security definer set search_path=public,pg_temp as $$
 select m.role from public.sc_members m where m.school_id=p_school
 and m.user_id=auth.uid() and public.sc_member(p_school) limit 1
$$;
-- School name and access deadline remain visible so the expired user sees
-- a clear renewal instruction; other tenant data is blocked by sc_member/sc_role.
alter policy sc_schools_read on public.sc_schools
 using(exists(select 1 from public.sc_members m where m.school_id=id and m.user_id=(select auth.uid())));
alter policy sc_subscriptions_read on public.sc_subscriptions
 using(exists(select 1 from public.sc_members m where m.school_id=sc_subscriptions.school_id and m.user_id=(select auth.uid())));

create or replace function public.sc_platform_provision_account(
 p_user uuid,p_school_name text,p_school uuid default null,p_role text default 'owner'
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_school uuid;
begin
 if nullif(current_setting('request.jwt.claim.role',true),'') is distinct from 'service_role' then raise exception 'Forbidden' using errcode='42501';end if;
 if not exists(select 1 from auth.users where id=p_user and deleted_at is null) then raise exception 'Akun tidak ditemukan';end if;
 if p_school is null then
  if p_role<>'owner' or length(trim(coalesce(p_school_name,''))) not between 3 and 120 then raise exception 'Sekolah/owner tidak valid';end if;
  insert into public.sc_schools(name,created_by) values(trim(p_school_name),p_user) returning id into v_school;
  insert into public.sc_subscriptions(school_id,status,trial_ends_at,current_period_end)
  values(v_school,'active',now(),now()+interval '1 month');
 else
  if p_role not in ('principal','vice_principal','teacher','counselor','hr','treasurer','staff','viewer') then raise exception 'Peran tidak valid';end if;
  if not exists(select 1 from public.sc_schools where id=p_school) then raise exception 'Sekolah tidak ditemukan';end if;
  v_school:=p_school;
 end if;
 insert into public.sc_members(school_id,user_id,role) values(v_school,p_user,p_role);
 insert into public.sc_audit_log(school_id,action,target_id,metadata)
 values(v_school,'platform.account.created',p_user::text,jsonb_build_object('role',p_role));
 return v_school;
end $$;

create or replace function public.sc_platform_set_account_disabled(p_user uuid,p_disabled boolean,p_actor uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if nullif(current_setting('request.jwt.claim.role',true),'') is distinct from 'service_role'
 or not exists(select 1 from public.sc_platform_admins where user_id=p_actor) then raise exception 'Forbidden' using errcode='42501';end if;
 if exists(select 1 from public.sc_platform_admins where user_id=p_user) then raise exception 'Tidak boleh mematikan Super Admin';end if;
 if not exists(select 1 from auth.users where id=p_user and deleted_at is null) then raise exception 'Akun tidak ditemukan';end if;
 insert into public.sc_platform_account_holds(user_id,is_disabled,updated_at,updated_by) values(p_user,p_disabled,now(),p_actor)
 on conflict(user_id) do update set is_disabled=excluded.is_disabled,updated_at=now(),updated_by=excluded.updated_by;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id)
 select m.school_id,p_actor,case when p_disabled then 'platform.account.disabled' else 'platform.account.enabled' end,p_user::text
 from public.sc_members m where m.user_id=p_user;
 return true;
end $$;

create or replace function public.sc_platform_set_school_paused(p_school uuid,p_paused boolean,p_actor uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if nullif(current_setting('request.jwt.claim.role',true),'') is distinct from 'service_role'
 or not exists(select 1 from public.sc_platform_admins where user_id=p_actor) then raise exception 'Forbidden' using errcode='42501';end if;
 update public.sc_schools set is_paused=p_paused where id=p_school;
 if not found then raise exception 'Sekolah tidak ditemukan';end if;
 insert into public.sc_audit_log(school_id,actor_id,action)
 values(p_school,p_actor,case when p_paused then 'platform.school.paused' else 'platform.school.resumed' end);
 return true;
end $$;

create or replace function public.sc_platform_confirm_renewal(p_school uuid,p_actor uuid,p_ref text,p_note text default null)
returns timestamptz language plpgsql security definer set search_path=public,pg_temp as $$
declare v_old timestamptz;v_start timestamptz;v_end timestamptz;
begin
 if nullif(current_setting('request.jwt.claim.role',true),'') is distinct from 'service_role'
 or not exists(select 1 from public.sc_platform_admins where user_id=p_actor) then raise exception 'Forbidden' using errcode='42501';end if;
 if length(trim(coalesce(p_ref,''))) not between 8 and 100 then raise exception 'Referensi konfirmasi tidak valid';end if;
 select period_end into v_end from public.sc_platform_renewals where school_id=p_school and confirmation_ref=p_ref;
 if found then return v_end;end if;
 select current_period_end into v_old from public.sc_subscriptions where school_id=p_school for update;
 if not found then raise exception 'Langganan tidak ditemukan';end if;
 -- Idempotency recheck after the school subscription lock.
 select period_end into v_end from public.sc_platform_renewals where school_id=p_school and confirmation_ref=p_ref;
 if found then return v_end;end if;
 v_start:=greatest(coalesce(v_old,now()),now());
 v_end:=v_start + interval '1 month';
 update public.sc_subscriptions set status='active',current_period_end=v_end,updated_at=now() where school_id=p_school;
 insert into public.sc_platform_renewals(school_id,confirmation_ref,confirmed_by,period_start,period_end,note)
 values(p_school,p_ref,p_actor,v_start,v_end,nullif(left(trim(coalesce(p_note,'')),500),''));
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,p_actor,'subscription.manual_renewal',p_ref,jsonb_build_object('new_end',v_end,'note',left(coalesce(p_note,''),500)));
 return v_end;
end $$;

-- Gateway events may be recorded, but cannot renew a school without Super Admin approval.
create or replace function public.sc_reconcile_payment(p_order_id text,p_amount integer,p_gateway_tx text,p_status text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_order public.sc_payment_orders%rowtype;
begin
 if nullif(current_setting('request.jwt.claim.role',true),'') is distinct from 'service_role' then raise exception 'Forbidden' using errcode='42501';end if;
 if p_status not in ('pending','paid','failed','expired') then raise exception 'Status tidak valid';end if;
 select * into v_order from public.sc_payment_orders where order_id=p_order_id for update;
 if not found or v_order.gross_amount<>p_amount then raise exception 'Pesanan atau nominal tidak cocok';end if;
 if v_order.status='paid' then return true;end if;
 update public.sc_payment_orders set status=p_status,
 gateway_transaction_id=coalesce(nullif(p_gateway_tx,''),gateway_transaction_id),
 paid_at=case when p_status='paid' then coalesce(paid_at,now()) else paid_at end
 where order_id=p_order_id;
 insert into public.sc_audit_log(school_id,action,target_id,metadata)
 values(v_order.school_id,'subscription.gateway_recorded',p_order_id,jsonb_build_object('status',p_status,'manual_confirmation_required',true));
 return true;
end $$;

create or replace function public.sc_confirm_payment(p_order_id text,p_amount integer,p_gateway_tx text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 return public.sc_reconcile_payment(p_order_id,p_amount,p_gateway_tx,'paid');
end $$;

create or replace function public.sc_platform_schools() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not public.sc_is_platform_admin() then raise exception 'Akses platform ditolak' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into result from (
 select s.id,s.name,s.created_at,s.is_internal_test,s.is_paused,
 coalesce(sub.status,'none') as subscription_status,sub.trial_ends_at,sub.current_period_end,sub.updated_at,
 (select count(*) from public.sc_members m where m.school_id=s.id) as member_count,
 (select count(*) from public.sc_students st where st.school_id=s.id) as student_count,
 (select coalesce(sum(o.gross_amount),0) from public.sc_payment_orders o where o.school_id=s.id and o.status='paid') as paid_amount
 from public.sc_schools s left join public.sc_subscriptions sub on sub.school_id=s.id
 order by s.created_at desc
 ) x;
 return result;
end $$;

revoke all on function public.sc_platform_provision_account(uuid,text,uuid,text),
 public.sc_platform_set_account_disabled(uuid,boolean,uuid),
 public.sc_platform_set_school_paused(uuid,boolean,uuid),
 public.sc_platform_confirm_renewal(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.sc_platform_provision_account(uuid,text,uuid,text),
 public.sc_platform_set_account_disabled(uuid,boolean,uuid),
 public.sc_platform_set_school_paused(uuid,boolean,uuid),
 public.sc_platform_confirm_renewal(uuid,uuid,text,text) to service_role;
