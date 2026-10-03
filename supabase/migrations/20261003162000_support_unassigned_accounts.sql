alter table public.sc_support_threads alter column school_id drop not null;
alter table public.sc_support_threads drop constraint sc_support_threads_school_id_user_id_key;
alter table public.sc_support_threads add constraint sc_support_threads_school_id_user_id_key unique nulls not distinct(school_id,user_id);
create or replace function public.sc_support_access(p_thread uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.sc_support_threads t where t.id=p_thread and (public.sc_is_platform_admin() or (t.user_id=auth.uid() and (t.school_id is null or public.sc_member(t.school_id)))));
$$;
alter policy sc_support_thread_read on public.sc_support_threads using(public.sc_is_platform_admin() or (user_id=(select auth.uid()) and (school_id is null or public.sc_member(school_id))));
create or replace function public.sc_support_open(p_school uuid,p_user uuid default null) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=coalesce(p_user,auth.uid()); t uuid;
begin
 if auth.uid() is null or (u<>auth.uid() and not public.sc_is_platform_admin()) then raise exception 'Akses chat ditolak' using errcode='42501';end if;
 if p_school is not null and not exists(select 1 from public.sc_members where school_id=p_school and user_id=u) then raise exception 'Pengguna bukan anggota sekolah';end if;
 if not exists(select 1 from auth.users where id=u and deleted_at is null) then raise exception 'Pengguna tidak ditemukan';end if;
 insert into public.sc_support_threads(school_id,user_id) values(p_school,u) on conflict(school_id,user_id) do update set user_id=excluded.user_id returning id into t;
 return t;
end $$;
create or replace function public.sc_support_contacts(p_school uuid default null) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Masuk terlebih dahulu';end if;
 return (select coalesce(jsonb_agg(to_jsonb(x) order by x.last_message_at desc nulls last,x.school_name,x.account_name),'[]') from (
 select m.school_id,m.user_id,s.name school_name,m.role,u.email,
 coalesce(nullif(st.name,''),u.email,'Pengguna') account_name,u.created_at registered_at,u.last_sign_in_at,
 t.id thread_id,t.last_message_at,
 (select count(*) from public.sc_support_messages msg where msg.thread_id=t.id and msg.sender_is_admin<>public.sc_is_platform_admin() and msg.created_at>coalesce(case when public.sc_is_platform_admin() then t.admin_read_at else t.user_read_at end,'epoch')) unread,
 (select coalesce(left(msg.body,90),'🎙 Voice note') from public.sc_support_messages msg where msg.thread_id=t.id order by msg.id desc limit 1) preview
 from public.sc_members m join public.sc_schools s on s.id=m.school_id join auth.users u on u.id=m.user_id
 left join public.sc_support_threads t on t.school_id=m.school_id and t.user_id=m.user_id
 left join lateral(select name from public.sc_staff where school_id=m.school_id and user_id=m.user_id order by created_at limit 1) st on true
 where (public.sc_is_platform_admin() or m.user_id=auth.uid()) and (p_school is null or m.school_id=p_school) and u.deleted_at is null
 union all
 select null,u.id,'Pendaftaran akun','belum_bergabung',u.email,u.email,u.created_at,u.last_sign_in_at,t.id,t.last_message_at,
 (select count(*) from public.sc_support_messages msg where msg.thread_id=t.id and msg.sender_is_admin<>public.sc_is_platform_admin() and msg.created_at>coalesce(case when public.sc_is_platform_admin() then t.admin_read_at else t.user_read_at end,'epoch')),
 (select coalesce(left(msg.body,90),'🎙 Voice note') from public.sc_support_messages msg where msg.thread_id=t.id order by msg.id desc limit 1)
 from auth.users u left join public.sc_support_threads t on t.user_id=u.id and t.school_id is null
 where p_school is null and u.deleted_at is null and (public.sc_is_platform_admin() or u.id=auth.uid())
 and not exists(select 1 from public.sc_platform_admins a where a.user_id=u.id)
 and (t.id is not null or not exists(select 1 from public.sc_members m where m.user_id=u.id))
 ) x);
end $$;
