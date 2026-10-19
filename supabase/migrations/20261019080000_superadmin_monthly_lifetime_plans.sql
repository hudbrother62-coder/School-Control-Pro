-- SekolaPro two official plans: monthly Rp99.000, lifetime Rp299.000.
-- Non-destructive: existing schools remain on their current plans. Never convert users implicitly.
alter table public.sc_subscriptions
  add column if not exists is_lifetime boolean not null default false;

-- Reject a downgrade or accidental monthly extension after a confirmed lifetime purchase.
create or replace function public.sc_guard_lifetime_subscription()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if old.is_lifetime and
   (not new.is_lifetime or new.current_period_end is distinct from old.current_period_end)
 then raise exception 'Paket sekali beli tidak dapat ditagih atau diubah kembali ke bulanan';
 end if;
 return new;
end $$;
drop trigger if exists sc_guard_lifetime_subscription on public.sc_subscriptions;
create trigger sc_guard_lifetime_subscription
before update on public.sc_subscriptions
for each row execute function public.sc_guard_lifetime_subscription();

-- Service-role-only operation. Edge Function verifies the signed-in platform admin before calling.
create or replace function public.sc_platform_confirm_lifetime(p_school uuid,p_actor uuid,p_ref text,p_note text default null)
returns timestamptz language plpgsql security definer set search_path=public,pg_temp as $$
declare v_sub public.sc_subscriptions%rowtype;
        v_order text:='LIFE-'||trim(coalesce(p_ref,''));
        v_end timestamptz:='9999-12-31 23:59:59+00';
begin
 if nullif(current_setting('request.jwt.claim.role',true),'') is distinct from 'service_role'
    or not exists(select 1 from public.sc_platform_admins where user_id=p_actor)
 then raise exception 'Akses Super Admin diperlukan' using errcode='42501';end if;
 if p_ref is null or length(p_ref) not between 8 and 85 or p_ref !~ '^[A-Za-z0-9-]+$'
    or length(coalesce(p_note,''))>500
 then raise exception 'Referensi pembayaran tidak valid';end if;
 select * into v_sub from public.sc_subscriptions where school_id=p_school for update;
 if not found then raise exception 'Langganan sekolah tidak ditemukan';end if;
 if v_sub.is_lifetime then
  if exists(select 1 from public.sc_payment_orders where school_id=p_school and order_id=v_order and status='paid')
  then return v_sub.current_period_end;end if;
  raise exception 'Sekolah sudah memiliki akses selamanya';
 end if;
 if exists(select 1 from public.sc_payment_orders where order_id=v_order)
 then raise exception 'Referensi pembayaran sudah digunakan';end if;
 insert into public.sc_payment_orders(order_id,school_id,gross_amount,period_days,status,gateway_transaction_id,paid_at,created_at)
 values(v_order,p_school,299000,0,'paid','manual-super-admin',now(),now());
 update public.sc_subscriptions
  set status='active',is_lifetime=true,current_period_end=v_end,updated_at=now()
  where school_id=p_school;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,p_actor,'subscription.manual_lifetime',v_order,
        jsonb_build_object('amount',299000,'plan','lifetime','payment_verified',true,
                           'note',left(coalesce(p_note,''),500)));
 return v_end;
end $$;
revoke all on function public.sc_platform_confirm_lifetime(uuid,uuid,text,text)
 from public,anon,authenticated;
grant execute on function public.sc_platform_confirm_lifetime(uuid,uuid,text,text) to service_role;

-- Admin list returns the permanent-plan flag used by the package dropdown.
create or replace function public.sc_platform_schools() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not public.sc_is_platform_admin() then
  raise exception 'Akses platform ditolak' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
 into result from (
  select s.id,s.name,s.created_at,s.is_internal_test,s.is_paused,
         coalesce(sub.status,'none') as subscription_status,
         sub.trial_ends_at,sub.current_period_end,sub.is_lifetime,sub.updated_at,
         (select count(*) from public.sc_members m where m.school_id=s.id) as member_count,
         (select count(*) from public.sc_students st where st.school_id=s.id) as student_count,
         (select coalesce(sum(o.gross_amount),0)
          from public.sc_payment_orders o where o.school_id=s.id and o.status='paid') as paid_amount
  from public.sc_schools s left join public.sc_subscriptions sub on sub.school_id=s.id
  order by s.created_at desc
 ) x;
 return result;
end $$;
revoke all on function public.sc_platform_schools() from public,anon;
grant execute on function public.sc_platform_schools() to authenticated;
