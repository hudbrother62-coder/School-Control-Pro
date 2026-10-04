alter table public.sc_calendar_events
 add column attendance_target text not null default 'roles' check(attendance_target in ('roles','users')),
 add column attendance_roles text[] not null default '{}',
 add column attendance_users uuid[] not null default '{}',
 add column attendance_address text,
 add column attendance_latitude double precision,
 add column attendance_longitude double precision,
 add column attendance_radius_meters integer not null default 100 check(attendance_radius_meters=100);
-- Preserve existing attendance assignments. Visibility and required attendance are separate.
update public.sc_calendar_events e set attendance_roles=array['owner','principal','vice_principal','teacher','counselor','hr','treasurer','finance_staff','supervisor','staff'],attendance_address=l.address,attendance_latitude=l.latitude,attendance_longitude=l.longitude from public.sc_hr_locations l where l.id=e.attendance_location_id and l.school_id=e.school_id;
update public.sc_calendar_events e set attendance_target='users',attendance_users=(select array_agg(p.user_id) from public.sc_calendar_participants p where p.event_id=e.id) where e.attendance_required and exists(select 1 from public.sc_calendar_participants p where p.event_id=e.id);

create or replace function public.sc_save_calendar_event_v4(p_school uuid,p_event uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; a boolean:=coalesce((p_payload->>'attendance_required')::boolean,false); r text[]; u uuid[]; target text:=coalesce(p_payload->>'attendance_target','roles'); lat double precision; lng double precision;
begin
 if auth.uid() is null or not public.sc_member(p_school) or not public.sc_write_active(p_school) or public.sc_role(p_school)='viewer' then raise exception 'Akses agenda ditolak' using errcode='42501';end if;
 r:=array(select distinct jsonb_array_elements_text(coalesce(p_payload->'attendance_roles','[]')));
 u:=array(select distinct jsonb_array_elements_text(coalesce(p_payload->'attendance_users','[]'))::uuid);
 lat:=nullif(p_payload->>'attendance_latitude','')::double precision;lng:=nullif(p_payload->>'attendance_longitude','')::double precision;
 if a then
  if not public.sc_manager(p_school) then raise exception 'Hanya manajemen dapat mengatur presensi agenda' using errcode='42501';end if;
  if p_payload->>'scope'<>'school' then raise exception 'Presensi hanya untuk agenda sekolah';end if;
  if target not in ('roles','users') then raise exception 'Sasaran presensi tidak valid';end if;
  if target='roles' and (cardinality(r)=0 or exists(select 1 from unnest(r) x where x not in ('owner','principal','vice_principal','teacher','counselor','hr','treasurer','finance_staff','supervisor','staff'))) then raise exception 'Pilih peran presensi yang valid';end if;
  if target='users' and (cardinality(u)=0 or exists(select 1 from unnest(u) x where not exists(select 1 from public.sc_members m where m.school_id=p_school and m.user_id=x and m.role<>'viewer'))) then raise exception 'Pilih anggota sekolah yang wajib presensi';end if;
  if lat is null or lng is null or not(lat between -90 and 90 and lng between -180 and 180) or length(trim(coalesce(p_payload->>'attendance_address','')))<3 then raise exception 'Alamat dan koordinat presensi wajib valid';end if;
  if nullif(p_payload->>'start_time','') is null then raise exception 'Jam mulai wajib untuk presensi';end if;
 end if;
 if p_payload->>'category' not in ('school','teaching','meeting','training','program','other','personal') then raise exception 'Kategori agenda tidak valid';end if;
 if (p_payload->>'scope'='personal')<>(p_payload->>'category'='personal') then raise exception 'Agenda pribadi harus memakai kategori pribadi';end if;
 if p_payload->>'audience_type'='users' and jsonb_array_length(coalesce(p_payload->'participants','[]'))=0 then raise exception 'Pilih pengguna sasaran agenda';end if;
 -- Existing canonical RPC validates membership, dates, time, class and event ownership.
 v_id:=public.sc_save_calendar_event_v3(p_school,p_event,p_payload->>'title',(p_payload->>'event_date')::date,nullif(p_payload->>'start_time','')::time,nullif(p_payload->>'end_time','')::time,p_payload->>'category',p_payload->>'notes',p_payload->>'location',p_payload->>'scope',array(select jsonb_array_elements_text(coalesce(p_payload->'participants','[]'))::uuid),p_payload->>'audience_type',p_payload->>'audience_grade',nullif(p_payload->>'audience_class_id','')::uuid,false,null,coalesce((p_payload->>'checkin_open_minutes')::integer,30),coalesce((p_payload->>'checkin_close_minutes')::integer,60));
 update public.sc_calendar_events set attendance_required=a,attendance_target=target,attendance_roles=case when a and target='roles' then r else '{}'::text[] end,attendance_users=case when a and target='users' then u else '{}'::uuid[] end,attendance_address=case when a then trim(p_payload->>'attendance_address') end,attendance_latitude=case when a then lat end,attendance_longitude=case when a then lng end,attendance_radius_meters=100 where id=v_id and school_id=p_school;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata) values(p_school,auth.uid(),'calendar.attendance_configured',v_id::text,jsonb_build_object('required',a,'target',target,'roles',r,'user_count',cardinality(u),'radius_meters',100));
 return v_id;
end $$;

create or replace function sc_private.agenda_attendance_allowed(e public.sc_calendar_events)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and e.attendance_required and e.scope='school' and exists(select 1 from public.sc_members m where m.school_id=e.school_id and m.user_id=auth.uid() and m.role<>'viewer' and ((e.attendance_target='roles' and m.role=any(e.attendance_roles)) or(e.attendance_target='users' and m.user_id=any(e.attendance_users))));
$$;
revoke all on function sc_private.agenda_attendance_allowed(public.sc_calendar_events) from public,anon,authenticated;

create or replace function public.sc_event_check_in(p_school uuid,p_event uuid,p_lat double precision default null,p_lng double precision default null,p_accuracy double precision default null)
returns public.sc_event_attendance language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.sc_calendar_events; v public.sc_event_attendance; local_now timestamp; start_at timestamp; distance double precision; zone text;
begin
 if auth.uid() is null or not public.sc_write_active(p_school) then raise exception 'Akses presensi ditolak' using errcode='42501';end if;
 select * into e from public.sc_calendar_events where id=p_event and school_id=p_school for update;
 if not found or not sc_private.agenda_attendance_allowed(e) then raise exception 'Anda tidak diwajibkan presensi pada agenda ini' using errcode='42501';end if;
 if e.start_time is null or e.attendance_latitude is null or e.attendance_longitude is null then raise exception 'Pengelola perlu melengkapi jam dan koordinat agenda';end if;
 select timezone into zone from public.sc_schools where id=p_school;
 local_now:=now() at time zone coalesce(zone,'Asia/Jakarta');start_at:=e.event_date+e.start_time;
 if local_now<start_at-make_interval(mins=>e.checkin_open_minutes) then raise exception 'Check-in belum dibuka';end if;
 if local_now>start_at+make_interval(mins=>e.checkin_close_minutes) then raise exception 'Waktu check-in agenda sudah ditutup';end if;
 if p_lat is null or p_lng is null or not(p_lat between -90 and 90 and p_lng between -180 and 180) then raise exception 'GPS wajib aktif dan koordinat harus valid';end if;
 if p_accuracy is null or not(p_accuracy between 0 and 100) then raise exception 'Akurasi GPS belum cukup; tunggu sampai maksimal 100 meter';end if;
 distance:=public.sc_geo_distance_m(e.attendance_latitude,e.attendance_longitude,p_lat,p_lng);
 if distance>100 then raise exception 'Di luar radius 100 m (jarak % m)',round(distance);end if;
 insert into public.sc_event_attendance(school_id,event_id,user_id,check_in_at,check_in_lat,check_in_lng,check_in_accuracy,status) values(p_school,p_event,auth.uid(),now(),p_lat,p_lng,p_accuracy,case when local_now>start_at then 'late' else 'present' end) on conflict(event_id,user_id) do update set check_in_at=coalesce(sc_event_attendance.check_in_at,excluded.check_in_at),check_in_lat=coalesce(sc_event_attendance.check_in_lat,excluded.check_in_lat),check_in_lng=coalesce(sc_event_attendance.check_in_lng,excluded.check_in_lng),check_in_accuracy=coalesce(sc_event_attendance.check_in_accuracy,excluded.check_in_accuracy),status=case when sc_event_attendance.check_in_at is null then excluded.status else sc_event_attendance.status end returning * into v;
 return v;
end $$;
create or replace function public.sc_event_check_out(p_school uuid,p_event uuid,p_lat double precision default null,p_lng double precision default null,p_accuracy double precision default null)
returns public.sc_event_attendance language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.sc_calendar_events;v public.sc_event_attendance;local_now timestamp;zone text;finish timestamp;distance double precision;
begin
 if auth.uid() is null or not public.sc_write_active(p_school) then raise exception 'Akses presensi ditolak' using errcode='42501';end if;
 select * into e from public.sc_calendar_events where id=p_event and school_id=p_school for update;
 if not found or not sc_private.agenda_attendance_allowed(e) then raise exception 'Anda tidak diwajibkan presensi pada agenda ini' using errcode='42501';end if;
 select * into v from public.sc_event_attendance where school_id=p_school and event_id=p_event and user_id=auth.uid() for update;
 if not found or v.check_in_at is null then raise exception 'Check-in harus dilakukan terlebih dahulu';end if;
 select timezone into zone from public.sc_schools where id=p_school;local_now:=now() at time zone coalesce(zone,'Asia/Jakarta');finish:=e.event_date+coalesce(e.end_time,e.start_time);
 if finish is null or local_now<finish then raise exception 'Check-out dibuka setelah agenda selesai';end if;
 if local_now>finish+make_interval(mins=>greatest(e.checkin_close_minutes,60)) then raise exception 'Waktu check-out agenda sudah ditutup';end if;
 if e.attendance_latitude is null or e.attendance_longitude is null or p_lat is null or p_lng is null or not(p_lat between -90 and 90 and p_lng between -180 and 180) then raise exception 'GPS dan koordinat agenda wajib valid';end if;
 if p_accuracy is null or not(p_accuracy between 0 and 100) then raise exception 'Akurasi GPS belum cukup';end if;
 distance:=public.sc_geo_distance_m(e.attendance_latitude,e.attendance_longitude,p_lat,p_lng);if distance>100 then raise exception 'Di luar radius 100 m (jarak % m)',round(distance);end if;
 if v.check_out_at is null then update public.sc_event_attendance set check_out_at=now(),check_out_lat=p_lat,check_out_lng=p_lng,check_out_accuracy=p_accuracy where id=v.id returning * into v;end if;return v;
end $$;
revoke all on function public.sc_save_calendar_event_v4(uuid,uuid,jsonb) from public,anon;
grant execute on function public.sc_save_calendar_event_v4(uuid,uuid,jsonb) to authenticated;
revoke all on function public.sc_event_check_in(uuid,uuid,double precision,double precision,double precision),public.sc_event_check_out(uuid,uuid,double precision,double precision,double precision) from public,anon;
grant execute on function public.sc_event_check_in(uuid,uuid,double precision,double precision,double precision),public.sc_event_check_out(uuid,uuid,double precision,double precision,double precision) to authenticated;
-- Existing policies permit reading school agendas and only own/manager attendance. Writes use checked RPCs.
revoke insert,update,delete on public.sc_event_attendance from authenticated,anon;
-- Direct table inserts and older RPCs must not bypass management-only attendance setup.
create or replace function sc_private.guard_agenda_attendance_config() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare changed boolean;
begin
 changed:=new.attendance_required;
 if tg_op='UPDATE' then changed:=row(new.attendance_required,new.attendance_target,new.attendance_roles,new.attendance_users,new.attendance_address,new.attendance_latitude,new.attendance_longitude,new.attendance_location_id) is distinct from row(old.attendance_required,old.attendance_target,old.attendance_roles,old.attendance_users,old.attendance_address,old.attendance_latitude,old.attendance_longitude,old.attendance_location_id);end if;
 if changed and auth.uid() is not null and not public.sc_manager(new.school_id) then raise exception 'Hanya manajemen dapat mengatur presensi agenda' using errcode='42501';end if;
 if new.attendance_required and (new.scope<>'school' or new.start_time is null or new.attendance_latitude is null or new.attendance_longitude is null or not(new.attendance_latitude between -90 and 90 and new.attendance_longitude between -180 and 180) or length(trim(coalesce(new.attendance_address,'')))<3) then raise exception 'Alamat, koordinat dan jam presensi agenda wajib valid';end if;
 return new;
end $$;
revoke all on function sc_private.guard_agenda_attendance_config() from public,anon,authenticated;
create trigger sc_agenda_attendance_config_guard before insert or update on public.sc_calendar_events for each row execute function sc_private.guard_agenda_attendance_config();
