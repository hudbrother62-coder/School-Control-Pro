-- Enrich student Excel import with optional NISN and gender while preserving existing history.
create or replace function public.sc_import_students(p_school uuid,p_rows jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_item jsonb;v_nis text;v_nisn text;v_name text;v_gender text;v_class text;v_year text;v_class_id uuid;v_added integer:=0;v_updated integer:=0;v_skipped integer:=0;v_existing uuid;
begin
 if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Hanya pengelola sekolah yang dapat mengimpor';end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>500 then raise exception 'Impor maksimal 500 siswa per berkas';end if;
 for v_item in select value from jsonb_array_elements(p_rows) loop
  if jsonb_typeof(v_item)<>'object' then raise exception 'Baris data tidak valid';end if;
  v_nis:=trim(coalesce(v_item->>'nis',''));v_nisn:=trim(coalesce(v_item->>'nisn',''));v_name:=trim(coalesce(v_item->>'name',''));v_gender:=trim(coalesce(v_item->>'gender',''));
  v_class:=trim(coalesce(v_item->>'class_name',''));v_year:=trim(coalesce(v_item->>'academic_year',''));
  if length(v_nis) not between 1 and 40 or length(v_name) not between 2 and 160 or v_class='' or v_year='' then raise exception 'NIS, nama, kelas dan tahun ajaran wajib valid';end if;
  select id into v_class_id from public.sc_classes where school_id=p_school and name=v_class and academic_year=v_year;
  if v_class_id is null then raise exception 'Kelas % pada tahun % belum dibuat',v_class,v_year;end if;
  select id into v_existing from public.sc_students where school_id=p_school and nis=v_nis limit 1;
  if v_existing is null then
   insert into public.sc_students(school_id,class_id,nis,nisn,name,gender,status)
   values(p_school,v_class_id,v_nis,nullif(v_nisn,''),v_name,nullif(v_gender,''),'active');
   v_added:=v_added+1;
  else
   update public.sc_students set class_id=v_class_id,nisn=nullif(v_nisn,''),name=v_name,gender=nullif(v_gender,''),status='active',archived_at=null
   where id=v_existing and school_id=p_school;
   v_updated:=v_updated+1;
  end if;
 end loop;
 insert into public.sc_audit_log(school_id,actor_id,action,metadata)
 values(p_school,auth.uid(),'students.xlsx.imported',jsonb_build_object('added',v_added,'updated',v_updated,'skipped',v_skipped));
 return jsonb_build_object('added',v_added,'updated',v_updated,'skipped',v_skipped);
end $$;
revoke all on function public.sc_import_students(uuid,jsonb) from public,anon;
grant execute on function public.sc_import_students(uuid,jsonb) to authenticated;
