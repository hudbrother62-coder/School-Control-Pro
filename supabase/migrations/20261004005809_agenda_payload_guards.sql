create or replace function public.sc_save_calendar_event_v4(p_school uuid,p_event uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; a boolean:=coalesce((p_payload->>'attendance_required')::boolean,false); r text[]; u uuid[]; target text:=coalesce(p_payload->>'attendance_target','roles'); lat double precision; lng double precision;
begin
 if auth.uid() is null or not public.sc_member(p_school) or not public.sc_write_active(p_school) or public.sc_role(p_school)='viewer' then raise exception 'Akses agenda ditolak' using errcode='42501';end if;
 r:=array(select distinct jsonb_array_elements_text(coalesce(p_payload->'attendance_roles','[]')));
 u:=array(select distinct jsonb_array_elements_text(coalesce(p_payload->'attendance_users','[]'))::uuid);
 lat:=nullif(p_payload->>'attendance_latitude','')::double precision;lng:=nullif(p_payload->>'attendance_longitude','')::double precision;
 if length(trim(coalesce(p_payload->>'title',''))) not between 3 and 180 or length(coalesce(p_payload->>'notes',''))>6000 or length(coalesce(p_payload->>'location',''))>300 or length(coalesce(p_payload->>'attendance_address',''))>500 then raise exception 'Judul atau keterangan agenda melewati batas';end if;
 if (p_payload->>'event_date')::date not between date '2000-01-01' and date '2100-12-31' then raise exception 'Tanggal agenda tidak valid';end if;
 if a then
  if not public.sc_manager(p_school) then raise exception 'Hanya manajemen dapat mengatur presensi agenda' using errcode='42501';end if;
  if p_payload->>'scope'<>'school' then raise exception 'Presensi hanya untuk agenda sekolah';end if;
  if target not in ('roles','users') then raise exception 'Sasaran presensi tidak valid';end if;
  if target='roles' and (cardinality(r)=0 or exists(select 1 from unnest(r) x where x is null or x not in ('owner','principal','vice_principal','teacher','counselor','hr','treasurer','finance_staff','supervisor','staff'))) then raise exception 'Pilih peran presensi yang valid';end if;
  if target='users' and (cardinality(u)=0 or exists(select 1 from unnest(u) x where not exists(select 1 from public.sc_members m where m.school_id=p_school and m.user_id=x and m.role<>'viewer'))) then raise exception 'Pilih anggota sekolah yang wajib presensi';end if;
  if lat is null or lng is null or not(lat between -90 and 90 and lng between -180 and 180) or length(trim(coalesce(p_payload->>'attendance_address','')))<3 then raise exception 'Alamat dan koordinat presensi wajib valid';end if;
  if nullif(p_payload->>'start_time','') is null then raise exception 'Jam mulai wajib untuk presensi';end if;
 end if;
 if p_payload->>'category' not in ('school','teaching','meeting','training','program','other','personal') then raise exception 'Kategori agenda tidak valid';end if;
 if (p_payload->>'scope'='personal')<>(p_payload->>'category'='personal') then raise exception 'Agenda pribadi harus memakai kategori pribadi';end if;
 if p_payload->>'audience_type'='users' and jsonb_array_length(coalesce(p_payload->'participants','[]'))=0 then raise exception 'Pilih pengguna sasaran agenda';end if;
 -- Existing canonical RPC validates membership, dates, time, class and event ownership.
 v_id:=public.sc_save_calendar_event_v3(p_school,p_event,p_payload->>'title',(p_payload->>'event_date')::date,nullif(p_payload->>'start_time','')::time,nullif(p_payload->>'end_time','')::time,p_payload->>'category',p_payload->>'notes',p_payload->>'location',p_payload->>'scope',array(select jsonb_array_elements_text(coalesce(p_payload->'participants','[]'))::uuid),p_payload->>'audience_type',p_payload->>'audience_grade',nullif(p_payload->>'audience_class_id','')::uuid,false,null,coalesce((p_payload->>'checkin_open_minutes')::integer,30),coalesce((p_payload->>'checkin_close_minutes')::integer,60));
 insert into public.sc_calendar_participants(school_id,event_id,user_id) select p_school,v_id,u from (select distinct jsonb_array_elements_text(coalesce(p_payload->'participants','[]'))::uuid as u) x where u=auth.uid() on conflict(event_id,user_id) do nothing;
 update public.sc_calendar_events set attendance_required=a,attendance_target=target,attendance_roles=case when a and target='roles' then r else '{}'::text[] end,attendance_users=case when a and target='users' then u else '{}'::uuid[] end,attendance_address=case when a then trim(p_payload->>'attendance_address') end,attendance_latitude=case when a then lat end,attendance_longitude=case when a then lng end,attendance_radius_meters=100 where id=v_id and school_id=p_school;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata) values(p_school,auth.uid(),'calendar.attendance_configured',v_id::text,jsonb_build_object('required',a,'target',target,'roles',r,'user_count',cardinality(u),'radius_meters',100));
 return v_id;
end $$;

revoke all on function public.sc_save_calendar_event_v4(uuid,uuid,jsonb) from public,anon;
grant execute on function public.sc_save_calendar_event_v4(uuid,uuid,jsonb) to authenticated;
