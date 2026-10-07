-- SekolaPro school messaging: tenant-isolated school group and principal-private threads.
-- Messages only flow between authenticated, active members of the same subscribed school.
create table public.sc_school_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.sc_schools(id) on delete cascade,
  kind text not null check(kind in ('school','principal')),
  member_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint sc_chat_room_kind check ((kind='school' and member_id is null) or (kind='principal' and member_id is not null))
);
create unique index sc_chat_one_school_room on public.sc_school_chat_rooms(school_id) where kind='school';
create unique index sc_chat_one_principal_thread on public.sc_school_chat_rooms(school_id,member_id) where kind='principal';
create index sc_chat_rooms_member_idx on public.sc_school_chat_rooms(member_id) where member_id is not null;

create table public.sc_school_chat_messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.sc_school_chat_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  body text,
  audio_path text,
  audio_seconds integer,
  created_at timestamptz not null default now(),
  constraint sc_chat_content check (
    (body is not null and length(btrim(body)) between 1 and 4000 and audio_path is null and audio_seconds is null)
    or (body is null and audio_path is not null and audio_seconds between 1 and 120))
);
create index sc_school_chat_messages_cursor on public.sc_school_chat_messages(room_id,id desc);

create table public.sc_school_chat_reads (
  room_id uuid not null references public.sc_school_chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key(room_id,user_id)
);
alter table public.sc_school_chat_rooms enable row level security;
alter table public.sc_school_chat_messages enable row level security;
alter table public.sc_school_chat_reads enable row level security;
revoke all on public.sc_school_chat_rooms,public.sc_school_chat_messages,public.sc_school_chat_reads from public,anon,authenticated;
grant select on public.sc_school_chat_rooms,public.sc_school_chat_messages,public.sc_school_chat_reads to authenticated;

create function public.sc_school_chat_access(p_room uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(
   select 1 from public.sc_school_chat_rooms r
   where r.id=p_room and public.sc_member(r.school_id)
     and (r.kind='school' or r.member_id=auth.uid() or public.sc_role(r.school_id)='principal')
 );
$$;
revoke all on function public.sc_school_chat_access(uuid) from public,anon;
grant execute on function public.sc_school_chat_access(uuid) to authenticated;
create policy sc_school_chat_rooms_read on public.sc_school_chat_rooms for select to authenticated
 using(public.sc_school_chat_access(id));
create policy sc_school_chat_messages_read on public.sc_school_chat_messages for select to authenticated
 using(public.sc_school_chat_access(room_id));
create policy sc_school_chat_reads_read on public.sc_school_chat_reads for select to authenticated
 using(user_id=(select auth.uid()) and public.sc_school_chat_access(room_id));

create function public.sc_school_chat_open(p_school uuid,p_member uuid default null) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_room uuid;
begin
 if not public.sc_member(p_school) then
   raise exception 'Akses sekolah tidak aktif atau tidak diizinkan' using errcode='42501';
 end if;
 if p_member is not null then
   if p_member<>auth.uid() and public.sc_role(p_school)<>'principal' then
     raise exception 'Percakapan privat hanya tersedia dengan kepala sekolah' using errcode='42501';
   end if;
   if not exists(select 1 from public.sc_members m join auth.users u on u.id=m.user_id
      where m.school_id=p_school and m.user_id=p_member and m.is_active and u.deleted_at is null) then
     raise exception 'Akun tujuan tidak aktif atau bukan anggota sekolah' using errcode='42501';
   end if;
   insert into public.sc_school_chat_rooms(school_id,kind,member_id)
      values(p_school,'principal',p_member) on conflict do nothing;
   select id into v_room from public.sc_school_chat_rooms
      where school_id=p_school and kind='principal' and member_id=p_member;
 else
   insert into public.sc_school_chat_rooms(school_id,kind)
      values(p_school,'school') on conflict do nothing;
   select id into v_room from public.sc_school_chat_rooms
      where school_id=p_school and kind='school';
 end if;
 return v_room;
end $$;

create function public.sc_school_chat_send(p_room uuid,p_body text default null,p_audio_path text default null,p_audio_seconds integer default null) returns bigint
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id bigint; v_school uuid;
begin
 if not public.sc_school_chat_access(p_room) then
   raise exception 'Akses percakapan ditolak' using errcode='42501';
 end if;
 select school_id into v_school from public.sc_school_chat_rooms where id=p_room;
 if (select count(*) from public.sc_school_chat_messages where sender_id=auth.uid() and created_at>now()-interval '1 minute')>=30 then
   raise exception 'Terlalu banyak pesan, tunggu satu menit';
 end if;
 if p_audio_path is not null then
   if p_body is not null or p_audio_seconds is null or p_audio_seconds not between 1 and 120
     or p_audio_path !~ ('^'||p_room::text||'/'||auth.uid()::text||'/[0-9a-f-]{36}\.(webm|ogg|mp4)$')
     or not exists(select 1 from storage.objects where bucket_id='sc-school-chat-audio' and name=p_audio_path
       and nullif(metadata->>'size','')::bigint between 1 and 5242880) then
     raise exception 'Voice note tidak valid atau file tidak ditemukan';
   end if;
 elsif p_body is null or length(btrim(p_body)) not between 1 and 4000 then
   raise exception 'Pesan harus berisi 1-4000 karakter';
 end if;
 insert into public.sc_school_chat_messages(room_id,sender_id,body,audio_path,audio_seconds)
 values(p_room,auth.uid(),case when p_audio_path is null then btrim(p_body) end,p_audio_path,p_audio_seconds)
 returning id into v_id;
 update public.sc_school_chat_rooms set last_message_at=now() where id=p_room;
 return v_id;
end $$;

create function public.sc_school_chat_read(p_room uuid,p_until timestamptz) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_school_chat_access(p_room) then raise exception 'Akses percakapan ditolak' using errcode='42501'; end if;
 insert into public.sc_school_chat_reads(room_id,user_id,read_at)
 values(p_room,auth.uid(),least(coalesce(p_until,now()),now()))
 on conflict(room_id,user_id) do update set read_at=greatest(sc_school_chat_reads.read_at,excluded.read_at);
end $$;

-- List only members of this school. Members cannot read another member's private messages.
-- Principals can see each member's principal thread; regular members see only their own.
create function public.sc_school_chat_directory(p_school uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_principal boolean;
begin
 if not public.sc_member(p_school) then
   raise exception 'Akses direktori sekolah ditolak' using errcode='42501';
 end if;
 v_principal:=public.sc_role(p_school)='principal';
 return jsonb_build_object(
  'is_principal',v_principal,
  'group',(
    select jsonb_build_object(
      'room_id',r.id,'last_message_at',r.last_message_at,
      'preview',(select coalesce(left(msg.body,90),'🎙 Voice note') from public.sc_school_chat_messages msg where msg.room_id=r.id order by msg.id desc limit 1),
      'unread',(select count(*) from public.sc_school_chat_messages msg where msg.room_id=r.id and msg.sender_id<>auth.uid()
        and msg.created_at>coalesce((select read_at from public.sc_school_chat_reads rr where rr.room_id=r.id and rr.user_id=auth.uid()),'epoch'))
    ) from public.sc_school_chat_rooms r where r.school_id=p_school and r.kind='school'
  ),
  'contacts',coalesce((
   select jsonb_agg(to_jsonb(x) order by x.account_name,x.email) from (
    select m.user_id,m.role,u.email,
      coalesce(nullif(st.name,''),nullif(u.raw_user_meta_data->>'display_name',''),u.email,'Pengguna') account_name,
      case when v_principal or m.user_id=auth.uid() then r.id end room_id,
      case when v_principal or m.user_id=auth.uid() then r.last_message_at end last_message_at,
      case when v_principal or m.user_id=auth.uid() then
       (select coalesce(left(msg.body,90),'🎙 Voice note') from public.sc_school_chat_messages msg where msg.room_id=r.id order by msg.id desc limit 1) end preview,
      case when v_principal or m.user_id=auth.uid() then
       (select count(*) from public.sc_school_chat_messages msg where msg.room_id=r.id and msg.sender_id<>auth.uid()
         and msg.created_at>coalesce((select rr.read_at from public.sc_school_chat_reads rr where rr.room_id=r.id and rr.user_id=auth.uid()),'epoch'))
       else 0 end unread
    from public.sc_members m join auth.users u on u.id=m.user_id
    left join lateral(select s.name from public.sc_staff s where s.school_id=p_school and s.user_id=m.user_id
       order by s.created_at limit 1) st on true
    left join public.sc_school_chat_rooms r on r.school_id=m.school_id and r.kind='principal' and r.member_id=m.user_id
    where m.school_id=p_school and m.is_active=true and u.deleted_at is null
   ) x
  ),'[]'::jsonb)
 );
end $$;

revoke all on function public.sc_school_chat_open(uuid,uuid),public.sc_school_chat_send(uuid,text,text,integer),
 public.sc_school_chat_read(uuid,timestamptz),public.sc_school_chat_directory(uuid) from public,anon;
grant execute on function public.sc_school_chat_open(uuid,uuid),public.sc_school_chat_send(uuid,text,text,integer),
 public.sc_school_chat_read(uuid,timestamptz),public.sc_school_chat_directory(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('sc-school-chat-audio','sc-school-chat-audio',false,5242880,array['audio/webm','audio/ogg','audio/mp4'])
 on conflict(id) do nothing;

create function public.sc_school_chat_audio_access(p_name text) returns boolean
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if p_name !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webm|ogg|mp4)$' then return false; end if;
 return public.sc_school_chat_access(split_part(p_name,'/',1)::uuid);
exception when invalid_text_representation then return false;
end $$;
revoke all on function public.sc_school_chat_audio_access(text) from public,anon;
grant execute on function public.sc_school_chat_audio_access(text) to authenticated;
create policy sc_school_chat_audio_read on storage.objects for select to authenticated
 using(bucket_id='sc-school-chat-audio' and public.sc_school_chat_audio_access(name));
create policy sc_school_chat_audio_insert on storage.objects for insert to authenticated
 with check(bucket_id='sc-school-chat-audio' and public.sc_school_chat_audio_access(name) and split_part(name,'/',2)=(select auth.uid())::text);
create policy sc_school_chat_audio_delete on storage.objects for delete to authenticated
 using(bucket_id='sc-school-chat-audio' and public.sc_school_chat_audio_access(name)
  and split_part(name,'/',2)=(select auth.uid())::text
  and not exists(select 1 from public.sc_school_chat_messages msg where msg.audio_path=name));

do $$ begin
 if not exists(select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='sc_school_chat_messages') then
   alter publication supabase_realtime add table public.sc_school_chat_messages;
 end if;
end $$;
