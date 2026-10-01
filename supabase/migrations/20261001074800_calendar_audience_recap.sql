alter table public.sc_calendar_events
 add column if not exists audience_type text not null default 'school',
 add column if not exists audience_grade text,
 add column if not exists audience_class_id uuid references public.sc_classes(id) on delete set null;

create index if not exists sc_calendar_events_school_date_audience_idx
 on public.sc_calendar_events(school_id,event_date,audience_type,audience_grade,audience_class_id);

create or replace function public.sc_save_calendar_event_v2(
 p_school uuid,p_event uuid,p_title text,p_date date,p_start time,p_end time,p_category text,p_notes text,p_location text,p_scope text,
 p_participants uuid[],p_audience_type text,p_audience_grade text,p_audience_class uuid
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;v_role text:=public.sc_role(p_school);
begin
 if not public.sc_write_active(p_school) or not public.sc_member(p_school) then raise exception 'Akses agenda ditolak';end if;
 if p_scope not in ('school','personal') or p_audience_type not in ('school','grade','class','users','personal') then raise exception 'Jenis agenda tidak valid';end if;
 if p_scope='school' and v_role='viewer' then raise exception 'Viewer tidak dapat membuat agenda sekolah';end if;
 if length(trim(coalesce(p_title,'')))<3 then raise exception 'Judul agenda terlalu pendek';end if;
 if p_end is not null and p_start is not null and p_end<p_start then raise exception 'Jam selesai tidak boleh sebelum jam mulai';end if;
 if p_scope='personal' then p_audience_type:='personal';p_audience_grade:=null;p_audience_class:=null;end if;
 if p_audience_type='class' and not exists(select 1 from public.sc_classes where id=p_audience_class and school_id=p_school) then raise exception 'Kelas sasaran tidak valid';end if;
 if p_audience_type='grade' and trim(coalesce(p_audience_grade,''))='' then raise exception 'Tingkat sasaran belum dipilih';end if;
 if p_event is null then
  insert into public.sc_calendar_events(school_id,title,event_date,category,notes,created_by,scope,start_time,end_time,location,owner_user_id,audience_type,audience_grade,audience_class_id)
  values(p_school,trim(p_title),p_date,coalesce(nullif(trim(p_category),''),'school'),nullif(trim(coalesce(p_notes,'')),''),auth.uid(),p_scope,p_start,p_end,nullif(trim(coalesce(p_location,'')),''),auth.uid(),p_audience_type,nullif(trim(coalesce(p_audience_grade,'')),''),p_audience_class)
  returning id into v_id;
 else
  if not exists(select 1 from public.sc_calendar_events e where e.id=p_event and e.school_id=p_school and (e.owner_user_id=auth.uid() or public.sc_manager(p_school))) then raise exception 'Agenda tidak dapat diubah';end if;
  update public.sc_calendar_events set title=trim(p_title),event_date=p_date,category=coalesce(nullif(trim(p_category),''),category),notes=nullif(trim(coalesce(p_notes,'')),''),scope=p_scope,start_time=p_start,end_time=p_end,location=nullif(trim(coalesce(p_location,'')),''),audience_type=p_audience_type,audience_grade=nullif(trim(coalesce(p_audience_grade,'')),''),audience_class_id=p_audience_class
  where id=p_event and school_id=p_school returning id into v_id;
 end if;
 delete from public.sc_calendar_participants where school_id=p_school and event_id=v_id;
 insert into public.sc_calendar_participants(school_id,event_id,user_id)
 select p_school,v_id,u from (select distinct unnest(coalesce(p_participants,'{}'::uuid[])) u) x
 where u<>auth.uid() and exists(select 1 from public.sc_members m where m.school_id=p_school and m.user_id=u);
 return v_id;
end $$;
revoke all on function public.sc_save_calendar_event_v2(uuid,uuid,text,date,time,time,text,text,text,text,uuid[],text,text,uuid) from public,anon;
grant execute on function public.sc_save_calendar_event_v2(uuid,uuid,text,date,time,time,text,text,text,text,uuid[],text,text,uuid) to authenticated;
