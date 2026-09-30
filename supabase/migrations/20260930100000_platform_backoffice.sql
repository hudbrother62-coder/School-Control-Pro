-- Platform-wide back office is independent from per-school role memberships.
-- No platform-admin privileges are read from user-editable auth metadata.
alter table public.sc_schools
 add column if not exists is_internal_test boolean not null default false;

create table if not exists public.sc_platform_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 note text
);
alter table public.sc_platform_admins enable row level security;
revoke all on public.sc_platform_admins from public,anon,authenticated;
grant select on public.sc_platform_admins to authenticated;
create policy sc_platform_admin_self on public.sc_platform_admins for select to authenticated
 using(user_id=auth.uid());

create or replace function public.sc_is_platform_admin() returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and exists (
  select 1 from public.sc_platform_admins where user_id=auth.uid()
 )
$$;

create or replace function public.sc_platform_summary() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not public.sc_is_platform_admin() then raise exception 'Akses platform ditolak' using errcode='42501';end if;
 select jsonb_build_object(
  'schools',(select count(*) from public.sc_schools where not is_internal_test),
  'test_schools',(select count(*) from public.sc_schools where is_internal_test),
  'accounts',(select count(*) from auth.users),
  'trial',(select count(*) from public.sc_subscriptions x join public.sc_schools s on s.id=x.school_id where not s.is_internal_test and x.status='trial' and x.trial_ends_at>now()),
  'active',(select count(*) from public.sc_subscriptions x join public.sc_schools s on s.id=x.school_id where not s.is_internal_test and x.status='active' and x.current_period_end>now()),
  'expired',(select count(*) from public.sc_subscriptions x join public.sc_schools s on s.id=x.school_id where not s.is_internal_test and not ((x.status='trial' and x.trial_ends_at>now()) or (x.status='active' and x.current_period_end>now()))),
  'pending_orders',(select count(*) from public.sc_payment_orders p join public.sc_schools s on s.id=p.school_id where not s.is_internal_test and p.status='pending'),
  'paid_orders',(select count(*) from public.sc_payment_orders p join public.sc_schools s on s.id=p.school_id where not s.is_internal_test and p.status='paid'),
  'revenue_total',(select coalesce(sum(p.gross_amount),0) from public.sc_payment_orders p join public.sc_schools s on s.id=p.school_id where not s.is_internal_test and p.status='paid'),
  'revenue_current_month',(select coalesce(sum(p.gross_amount),0) from public.sc_payment_orders p join public.sc_schools s on s.id=p.school_id where not s.is_internal_test and p.status='paid' and p.paid_at>=date_trunc('month',now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta'),
  'generated_at',now()
 ) into result;
 return result;
end $$;

create or replace function public.sc_platform_schools() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not public.sc_is_platform_admin() then raise exception 'Akses platform ditolak' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into result from (
  select s.id,s.name,s.created_at,s.is_internal_test,
   coalesce(sub.status,'none') as subscription_status,sub.trial_ends_at,sub.current_period_end,
   (select count(*) from public.sc_members m where m.school_id=s.id) as member_count,
   (select count(*) from public.sc_students st where st.school_id=s.id) as student_count,
   (select coalesce(sum(o.gross_amount),0) from public.sc_payment_orders o where o.school_id=s.id and o.status='paid') as paid_amount
  from public.sc_schools s left join public.sc_subscriptions sub on sub.school_id=s.id
  order by s.created_at desc limit 100
 ) x;
 return result;
end $$;

create or replace function public.sc_platform_orders() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not public.sc_is_platform_admin() then raise exception 'Akses platform ditolak' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into result from (
  select o.order_id,o.school_id,s.name as school_name,s.is_internal_test,
   o.gross_amount,o.period_days,o.status,o.created_at,o.paid_at
  from public.sc_payment_orders o join public.sc_schools s on s.id=o.school_id
  order by o.created_at desc limit 100
 ) x;
 return result;
end $$;
-- RPC is read-only and does not expose confidential counseling, payroll or student details.
revoke all on function public.sc_is_platform_admin(),public.sc_platform_summary(),public.sc_platform_schools(),public.sc_platform_orders()
 from PUBLIC,anon;
grant execute on function public.sc_is_platform_admin(),public.sc_platform_summary(),public.sc_platform_schools(),public.sc_platform_orders()
 to authenticated;
