-- Per-user support conversations remain available after subscription expiry.
create table public.sc_support_threads (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.sc_schools(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(),
 last_message_at timestamptz, user_read_at timestamptz, admin_read_at timestamptz,
 unique(school_id,user_id)
);
create table public.sc_support_messages (
 id bigint generated always as identity primary key, thread_id uuid not null references public.sc_support_threads(id) on delete cascade,
 sender_id uuid not null references auth.users(id), sender_is_admin boolean not null, body text,
 audio_path text, audio_seconds integer, created_at timestamptz not null default now(),
 check ((body is not null and length(btrim(body)) between 1 and 4000 and audio_path is null and audio_seconds is null)
 or (body is null and audio_path is not null and audio_seconds between 1 and 120))
);
create index sc_support_messages_thread_time on public.sc_support_messages(thread_id,id desc);
create index sc_support_threads_user on public.sc_support_threads(user_id);
alter table public.sc_support_threads enable row level security;
alter table public.sc_support_messages enable row level security;
revoke all on public.sc_support_threads,public.sc_support_messages from anon,authenticated;
grant select on public.sc_support_threads,public.sc_support_messages to authenticated;
create function public.sc_support_access(p_thread uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.sc_support_threads t where t.id=p_thread and (public.sc_is_platform_admin() or (t.user_id=auth.uid() and public.sc_member(t.school_id))));
$$;
revoke all on function public.sc_support_access(uuid) from public,anon;
grant execute on function public.sc_support_access(uuid) to authenticated;
create policy sc_support_thread_read on public.sc_support_threads for select to authenticated using (public.sc_is_platform_admin() or (user_id=(select auth.uid()) and public.sc_member(school_id)));
create policy sc_support_message_read on public.sc_support_messages for select to authenticated using(public.sc_support_access(thread_id));
create function public.sc_support_open(p_school uuid,p_user uuid default null) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=coalesce(p_user,auth.uid()); t uuid;
begin
 if auth.uid() is null or (u<>auth.uid() and not public.sc_is_platform_admin()) then raise exception 'Akses chat ditolak' using errcode='42501';end if;
 if not exists(select 1 from public.sc_members where school_id=p_school and user_id=u) then raise exception 'Pengguna bukan anggota sekolah';end if;
 insert into public.sc_support_threads(school_id,user_id) values(p_school,u) on conflict(school_id,user_id) do update set user_id=excluded.user_id returning id into t;
 return t;
end $$;
create function public.sc_support_send(p_thread uuid,p_body text default null,p_audio_path text default null,p_audio_seconds integer default null) returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare msg bigint; v_admin boolean:=public.sc_is_platform_admin();
begin
 if not public.sc_support_access(p_thread) then raise exception 'Akses chat ditolak' using errcode='42501';end if;
 if exists(select 1 from public.sc_support_messages where sender_id=auth.uid() and created_at>now()-interval '1 minute' group by sender_id having count(*)>=30) then raise exception 'Terlalu banyak pesan. Tunggu satu menit.';end if;
 if p_audio_path is not null then
  if p_body is not null or p_audio_seconds is null or p_audio_seconds not between 1 and 120 or p_audio_path !~ ('^'||p_thread::text||'/'||auth.uid()::text||'/[0-9a-f-]+\.(webm|ogg|mp4)$') then raise exception 'Voice note tidak valid';end if;
  if not exists(select 1 from storage.objects where bucket_id='sc-support-audio' and name=p_audio_path and (metadata->>'size')::bigint between 1 and 5242880) then raise exception 'File voice note tidak ditemukan atau terlalu besar';end if;
 elsif p_body is null or length(btrim(p_body)) not between 1 and 4000 then raise exception 'Isi pesan wajib 1–4000 karakter';end if;
 insert into public.sc_support_messages(thread_id,sender_id,sender_is_admin,body,audio_path,audio_seconds) values(p_thread,auth.uid(),v_admin,case when p_audio_path is null then btrim(p_body) end,p_audio_path,p_audio_seconds) returning id into msg;
 update public.sc_support_threads set last_message_at=now() where id=p_thread;
 return msg;
end $$;
create function public.sc_support_read(p_thread uuid,p_until timestamptz) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_support_access(p_thread) then raise exception 'Akses chat ditolak' using errcode='42501';end if;
 if public.sc_is_platform_admin() then update public.sc_support_threads set admin_read_at=greatest(coalesce(admin_read_at,'epoch'),least(p_until,now())) where id=p_thread;
 else update public.sc_support_threads set user_read_at=greatest(coalesce(user_read_at,'epoch'),least(p_until,now())) where id=p_thread;end if;
end $$;
create function public.sc_support_contacts(p_school uuid default null) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
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
 where (public.sc_is_platform_admin() or m.user_id=auth.uid()) and (p_school is null or m.school_id=p_school)
 ) x);
end $$;
revoke all on function public.sc_support_open(uuid,uuid),public.sc_support_send(uuid,text,text,integer),public.sc_support_read(uuid,timestamptz),public.sc_support_contacts(uuid) from public,anon;
grant execute on function public.sc_support_open(uuid,uuid),public.sc_support_send(uuid,text,text,integer),public.sc_support_read(uuid,timestamptz),public.sc_support_contacts(uuid) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('sc-support-audio','sc-support-audio',false,5242880,array['audio/webm','audio/ogg','audio/mp4']) on conflict(id) do nothing;
create function public.sc_support_audio_access(p_name text) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if p_name !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]+\.(webm|ogg|mp4)$' then return false;end if;
 return public.sc_support_access(split_part(p_name,'/',1)::uuid);
exception when invalid_text_representation then return false;
end $$;
revoke all on function public.sc_support_audio_access(text) from public,anon;
grant execute on function public.sc_support_audio_access(text) to authenticated;
create policy sc_support_audio_read on storage.objects for select to authenticated using(bucket_id='sc-support-audio' and public.sc_support_audio_access(name));
create policy sc_support_audio_insert on storage.objects for insert to authenticated with check(bucket_id='sc-support-audio' and public.sc_support_audio_access(name) and split_part(name,'/',2)=(select auth.uid())::text);
create policy sc_support_audio_cleanup on storage.objects for delete to authenticated using(bucket_id='sc-support-audio' and split_part(name,'/',2)=(select auth.uid())::text and public.sc_support_audio_access(name) and not exists(select 1 from public.sc_support_messages where audio_path=name));
-- One safe change signal per school; no private record payload reaches other roles.
create table public.sc_school_changes(school_id uuid primary key,revision bigint not null default 1,changed_at timestamptz not null default now());
alter table public.sc_school_changes enable row level security;
revoke all on public.sc_school_changes from anon,authenticated;
grant select on public.sc_school_changes to authenticated;
create policy sc_changes_read on public.sc_school_changes for select to authenticated using(public.sc_member(school_id) or public.sc_is_platform_admin());
insert into public.sc_school_changes(school_id) select id from public.sc_schools;
create function public.sc_emit_school_change() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare s uuid; old_s uuid; row_data jsonb;
begin
 row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 s:=case when tg_table_name='sc_schools' then (row_data->>'id')::uuid else (row_data->>'school_id')::uuid end;
 if s is not null then insert into public.sc_school_changes(school_id) values(s) on conflict(school_id) do update set revision=sc_school_changes.revision+1,changed_at=now();end if;
 if tg_op='UPDATE' and tg_table_name<>'sc_schools' then
  old_s:=(to_jsonb(old)->>'school_id')::uuid;
  if old_s is not null and old_s is distinct from s then insert into public.sc_school_changes(school_id) values(old_s) on conflict(school_id) do update set revision=sc_school_changes.revision+1,changed_at=now();end if;
 end if;
 return null;
end $$;
revoke all on function public.sc_emit_school_change() from public,anon,authenticated;
do $$ declare t record;begin
 for t in select distinct c.table_name from information_schema.columns c join information_schema.tables a on a.table_schema=c.table_schema and a.table_name=c.table_name and a.table_type='BASE TABLE' where c.table_schema='public' and (c.column_name='school_id' or c.table_name='sc_schools') and c.table_name like 'sc_%' and c.table_name not in('sc_school_changes','sc_support_threads','sc_support_messages') loop
 execute format('create trigger sc_realtime_change after insert or update or delete on public.%I for each row execute function public.sc_emit_school_change()',t.table_name);
 end loop;
end $$;
do $$ declare t text;begin
 foreach t in array array['sc_school_changes','sc_support_threads','sc_support_messages'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
 end loop;
end $$;
