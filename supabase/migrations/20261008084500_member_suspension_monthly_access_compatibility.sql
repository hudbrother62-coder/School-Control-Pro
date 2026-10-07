-- Preserve platform monthly-access protections while honoring per-school account suspension.
create or replace function public.sc_member(p_school uuid) returns boolean
 language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null
 and exists(select 1 from public.sc_members m where m.school_id=p_school and m.user_id=auth.uid() and m.is_active=true)
 and exists(select 1 from public.sc_schools s where s.id=p_school and not s.is_paused)
 and exists(select 1 from public.sc_subscriptions sub where sub.school_id=p_school and sub.status='active' and sub.current_period_end>now())
 and exists(select 1 from auth.users u where u.id=auth.uid() and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()))
 and not exists(select 1 from public.sc_platform_account_holds h where h.user_id=auth.uid() and h.is_disabled)
$$;