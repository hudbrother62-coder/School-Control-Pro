alter table public.sc_calendar_events
  add column if not exists attendance_required boolean not null default false,
  add column if not exists attendance_location_id uuid null references public.sc_hr_locations(id) on delete set null,
  add column if not exists checkin_open_minutes integer not null default 30 check (checkin_open_minutes between 0 and 720),
  add column if not exists checkin_close_minutes integer not null default 60 check (checkin_close_minutes between 0 and 1440);

create index if not exists sc_calendar_events_attendance_location_idx
  on public.sc_calendar_events(attendance_location_id)
  where attendance_location_id is not null;

CREATE OR REPLACE FUNCTION public.sc_save_calendar_event_v3(p_school uuid, p_event uuid, p_title text, p_date date, p_start time without time zone, p_end time without time zone, p_category text, p_notes text, p_location text, p_scope text, p_participants uuid[], p_audience_type text, p_audience_grade text, p_audience_class uuid, p_attendance_required boolean DEFAULT false, p_attendance_location uuid DEFAULT NULL::uuid, p_checkin_open_minutes integer DEFAULT 30, p_checkin_close_minutes integer DEFAULT 60)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_id uuid;
 v_role text:=public.sc_role(p_school);
begin
 if not public.sc_write_active(p_school) then raise exception 'Langganan sekolah tidak aktif'; end if;
 if not public.sc_member(p_school) then raise exception 'Akses ditolak'; end if;
 if p_scope not in ('school','personal') then raise exception 'Jenis agenda tidak valid'; end if;
 if p_scope='school' and v_role='viewer' then raise exception 'Viewer tidak dapat membuat agenda sekolah'; end if;
 if length(trim(coalesce(p_title,'')))<3 then raise exception 'Judul agenda minimal 3 karakter'; end if;
 if p_end is not null and p_start is not null and p_end<p_start then raise exception 'Jam selesai tidak boleh sebelum jam mulai'; end if;
 if p_audience_type not in ('school','grade','class','users','personal') then raise exception 'Sasaran agenda tidak valid'; end if;
 if p_scope='personal' then
   p_audience_type:='personal'; p_audience_grade:=null; p_audience_class:=null;
 end if;
 if p_audience_type='class' and not exists(
   select 1 from public.sc_classes c where c.id=p_audience_class and c.school_id=p_school
 ) then raise exception 'Kelas sasaran tidak valid'; end if;
 if p_audience_type='grade' and trim(coalesce(p_audience_grade,''))='' then raise exception 'Tingkat sasaran belum dipilih'; end if;
 if exists(
   select 1 from unnest(coalesce(p_participants,'{}'::uuid[])) u
   where not exists(select 1 from public.sc_members m where m.school_id=p_school and m.user_id=u)
 ) then raise exception 'Peserta harus anggota sekolah'; end if;
 if coalesce(p_checkin_open_minutes,0) not between 0 and 720 then raise exception 'Batas buka check-in tidak valid'; end if;
 if coalesce(p_checkin_close_minutes,0) not between 0 and 1440 then raise exception 'Batas tutup check-in tidak valid'; end if;
 if coalesce(p_attendance_required,false) and p_start is null then raise exception 'Jam mulai wajib jika kehadiran agenda diaktifkan'; end if;
 if p_attendance_location is not null and not exists(
   select 1 from public.sc_hr_locations l where l.id=p_attendance_location and l.school_id=p_school and l.active
 ) then raise exception 'Lokasi presensi agenda tidak valid atau tidak aktif'; end if;

 if p_event is null then
  insert into public.sc_calendar_events(
   school_id,title,event_date,category,notes,created_by,pic_id,scope,start_time,end_time,location,
   owner_user_id,audience_type,audience_grade,audience_class_id,
   attendance_required,attendance_location_id,checkin_open_minutes,checkin_close_minutes
  )
  values(
   p_school,trim(p_title),p_date,coalesce(nullif(trim(p_category),''),'school'),
   nullif(trim(coalesce(p_notes,'')),''),auth.uid(),null,p_scope,p_start,p_end,
   nullif(trim(coalesce(p_location,'')),''),auth.uid(),p_audience_type,
   nullif(trim(coalesce(p_audience_grade,'')),''),p_audience_class,
   coalesce(p_attendance_required,false),p_attendance_location,
   coalesce(p_checkin_open_minutes,30),coalesce(p_checkin_close_minutes,60)
  )
  returning id into v_id;
 else
  if not exists(
    select 1 from public.sc_calendar_events e
    where e.id=p_event and e.school_id=p_school
      and (e.owner_user_id=auth.uid() or public.sc_manager(p_school))
  ) then raise exception 'Agenda tidak dapat diubah'; end if;

  update public.sc_calendar_events set
   title=trim(p_title),event_date=p_date,category=coalesce(nullif(trim(p_category),''),category),
   notes=nullif(trim(coalesce(p_notes,'')),''),scope=p_scope,start_time=p_start,end_time=p_end,
   location=nullif(trim(coalesce(p_location,'')),''),audience_type=p_audience_type,
   audience_grade=nullif(trim(coalesce(p_audience_grade,'')),''),audience_class_id=p_audience_class,
   attendance_required=coalesce(p_attendance_required,false),
   attendance_location_id=p_attendance_location,
   checkin_open_minutes=coalesce(p_checkin_open_minutes,30),
   checkin_close_minutes=coalesce(p_checkin_close_minutes,60)
  where id=p_event and school_id=p_school returning id into v_id;
 end if;

 delete from public.sc_calendar_participants where event_id=v_id and school_id=p_school;
 insert into public.sc_calendar_participants(school_id,event_id,user_id)
 select p_school,v_id,u
 from (select distinct unnest(coalesce(p_participants,'{}'::uuid[])) as u) q
 where u<>auth.uid();

 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(
   p_school,auth.uid(),case when p_event is null then 'calendar.created' else 'calendar.updated' end,
   v_id::text,
   jsonb_build_object(
     'scope',p_scope,'audience_type',p_audience_type,'audience_grade',p_audience_grade,
     'audience_class_id',p_audience_class,'participant_count',coalesce(array_length(p_participants,1),0),
     'attendance_required',coalesce(p_attendance_required,false),
     'attendance_location_id',p_attendance_location,
     'checkin_open_minutes',coalesce(p_checkin_open_minutes,30),
     'checkin_close_minutes',coalesce(p_checkin_close_minutes,60)
   )
 );
 return v_id;
end $function$
;
CREATE OR REPLACE FUNCTION public.sc_event_check_in(p_school uuid, p_event uuid, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_accuracy double precision DEFAULT NULL::double precision)
 RETURNS sc_event_attendance
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v public.sc_event_attendance%rowtype;
 e public.sc_calendar_events%rowtype;
 l public.sc_hr_locations%rowtype;
 v_zone text;
 v_local timestamp;
 v_start timestamp;
 v_open timestamp;
 v_close timestamp;
 v_distance double precision;
 v_status text;
begin
 if not public.sc_write_active(p_school) then raise exception 'Langganan sekolah tidak aktif'; end if;
 if p_lat is not null and (p_lat < -90 or p_lat > 90) then raise exception 'Latitude tidak valid'; end if;
 if p_lng is not null and (p_lng < -180 or p_lng > 180) then raise exception 'Longitude tidak valid'; end if;

 select * into e from public.sc_calendar_events where id=p_event and school_id=p_school;
 if not found then raise exception 'Agenda tidak ditemukan'; end if;

 if not (
   e.owner_user_id=auth.uid()
   or exists(select 1 from public.sc_calendar_participants p where p.event_id=e.id and p.user_id=auth.uid())
   or (e.audience_type='school' and public.sc_member(p_school))
 ) then raise exception 'Anda tidak terdaftar pada agenda ini'; end if;

 if e.start_time is null then raise exception 'Jam mulai agenda belum ditentukan'; end if;
 select timezone into v_zone from public.sc_schools where id=p_school;
 v_local := now() at time zone coalesce(v_zone,'Asia/Jakarta');
 v_start := e.event_date + e.start_time;
 v_open := v_start - make_interval(mins=>coalesce(e.checkin_open_minutes,30));
 v_close := v_start + make_interval(mins=>coalesce(e.checkin_close_minutes,60));

 if v_local < v_open then
   raise exception 'Check-in belum dibuka. Check-in dibuka % menit sebelum agenda',coalesce(e.checkin_open_minutes,30);
 end if;
 if v_local > v_close then
   raise exception 'Waktu check-in agenda sudah ditutup';
 end if;

 if e.attendance_location_id is not null then
   select * into l from public.sc_hr_locations
   where id=e.attendance_location_id and school_id=p_school and active;
   if not found then raise exception 'Lokasi presensi agenda tidak aktif'; end if;
   if l.latitude is not null and l.longitude is not null then
     if p_lat is null or p_lng is null then raise exception 'Lokasi GPS wajib untuk agenda ini'; end if;
     v_distance := public.sc_geo_distance_m(l.latitude,l.longitude,p_lat,p_lng);
     if v_distance > l.radius_meters + least(greatest(coalesce(p_accuracy,0),0),100) then
       raise exception 'Anda berada di luar radius % (jarak % m)',l.name,round(v_distance);
     end if;
   end if;
 end if;

 v_status:=case when v_local>v_start then 'late' else 'present' end;

 insert into public.sc_event_attendance(
   school_id,event_id,user_id,check_in_at,check_in_lat,check_in_lng,check_in_accuracy,status
 ) values(p_school,p_event,auth.uid(),now(),p_lat,p_lng,p_accuracy,v_status)
 on conflict(event_id,user_id) do update set
   check_in_at=coalesce(sc_event_attendance.check_in_at,excluded.check_in_at),
   check_in_lat=coalesce(sc_event_attendance.check_in_lat,excluded.check_in_lat),
   check_in_lng=coalesce(sc_event_attendance.check_in_lng,excluded.check_in_lng),
   check_in_accuracy=coalesce(sc_event_attendance.check_in_accuracy,excluded.check_in_accuracy),
   status=case when sc_event_attendance.check_in_at is null then excluded.status else sc_event_attendance.status end
 returning * into v;
 return v;
end $function$
;
CREATE OR REPLACE FUNCTION public.sc_event_check_out(p_school uuid, p_event uuid, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_accuracy double precision DEFAULT NULL::double precision)
 RETURNS sc_event_attendance
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v public.sc_event_attendance%rowtype;
 e public.sc_calendar_events%rowtype;
 l public.sc_hr_locations%rowtype;
 v_zone text;
 v_local timestamp;
 v_start timestamp;
 v_distance double precision;
begin
 if not public.sc_write_active(p_school) then raise exception 'Langganan sekolah tidak aktif'; end if;
 select * into e from public.sc_calendar_events where id=p_event and school_id=p_school;
 if not found then raise exception 'Agenda tidak ditemukan'; end if;

 select * into v from public.sc_event_attendance
 where school_id=p_school and event_id=p_event and user_id=auth.uid() for update;
 if not found or v.check_in_at is null then raise exception 'Check-in agenda harus dilakukan terlebih dahulu'; end if;

 if e.start_time is not null then
   select timezone into v_zone from public.sc_schools where id=p_school;
   v_local:=now() at time zone coalesce(v_zone,'Asia/Jakarta');
   v_start:=e.event_date+e.start_time;
   if v_local<v_start then raise exception 'Check-out belum dapat dilakukan sebelum agenda dimulai'; end if;
 end if;

 if e.attendance_location_id is not null then
   select * into l from public.sc_hr_locations
   where id=e.attendance_location_id and school_id=p_school and active;
   if l.id is not null and l.latitude is not null and l.longitude is not null then
     if p_lat is null or p_lng is null then raise exception 'Lokasi GPS wajib untuk agenda ini'; end if;
     v_distance:=public.sc_geo_distance_m(l.latitude,l.longitude,p_lat,p_lng);
     if v_distance > l.radius_meters + least(greatest(coalesce(p_accuracy,0),0),100) then
       raise exception 'Anda berada di luar radius % (jarak % m)',l.name,round(v_distance);
     end if;
   end if;
 end if;

 if v.check_out_at is null then
   update public.sc_event_attendance
   set check_out_at=now(),check_out_lat=p_lat,check_out_lng=p_lng,check_out_accuracy=p_accuracy
   where id=v.id returning * into v;
 end if;
 return v;
end $function$
;

revoke all on function public.sc_save_calendar_event_v3(uuid,uuid,text,date,time,time,text,text,text,text,uuid[],text,text,uuid,boolean,uuid,integer,integer) from public, anon;
grant execute on function public.sc_save_calendar_event_v3(uuid,uuid,text,date,time,time,text,text,text,text,uuid[],text,text,uuid,boolean,uuid,integer,integer) to authenticated;
revoke all on function public.sc_event_check_in(uuid,uuid,double precision,double precision,double precision) from public, anon;
grant execute on function public.sc_event_check_in(uuid,uuid,double precision,double precision,double precision) to authenticated;
revoke all on function public.sc_event_check_out(uuid,uuid,double precision,double precision,double precision) from public, anon;
grant execute on function public.sc_event_check_out(uuid,uuid,double precision,double precision,double precision) to authenticated;
