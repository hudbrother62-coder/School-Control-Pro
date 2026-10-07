-- Receive a library procurement atomically: title, physical copies, and receipt state.
-- Access stays tenant-scoped; repeated receipt cannot duplicate inventory.
create or replace function public.sc_library_receive_acquisition(p_school uuid,p_acquisition uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
 r public.sc_library_acquisitions%rowtype;
 v_title uuid;
 v_count integer;
 i integer;
begin
 if auth.uid() is null or not public.sc_write_active(p_school) then
  raise exception 'Akses sekolah untuk menerima buku tidak aktif';
 end if;
 select * into r from public.sc_library_acquisitions
  where school_id=p_school and id=p_acquisition for update;
 if not found then raise exception 'Pengadaan buku tidak ditemukan'; end if;
 if r.status not in ('requested','ordered') then
  raise exception 'Pengadaan tidak dapat diterima lagi';
 end if;
 if r.quantity < 1 or r.quantity > 200 then
  raise exception 'Jumlah penerimaan harus 1 sampai 200 eksemplar';
 end if;
 v_count:=r.quantity;
 if r.title_id is not null then
  select id into v_title from public.sc_library_titles
   where id=r.title_id and school_id=p_school and active=true;
  if v_title is null then raise exception 'Judul buku tidak terdaftar di sekolah ini'; end if;
 else
  select id into v_title from public.sc_library_titles
   where school_id=p_school and lower(trim(title))=lower(trim(r.item_title)) and active=true
   order by created_at,id limit 1;
  if v_title is null then
   insert into public.sc_library_titles(school_id,title,source,notes)
   values(p_school,trim(r.item_title),'Pengadaan perpustakaan','Dibuat otomatis melalui penerimaan buku')
   returning id into v_title;
  end if;
 end if;
 for i in 1..v_count loop
  insert into public.sc_library_copies(school_id,title_id,inventory_code,condition,status,acquired_at,notes)
  values(p_school,v_title,'PERP-'||extract(year from current_date)::int||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
    'Baik','available',current_date,'Diterima dari pengadaan '||r.id);
 end loop;
 update public.sc_library_acquisitions
  set title_id=v_title,status='received',received_at=current_date,updated_at=now()
  where id=r.id and school_id=p_school;
 return v_count;
end $$;
revoke all on function public.sc_library_receive_acquisition(uuid,uuid) from public,anon;
grant execute on function public.sc_library_receive_acquisition(uuid,uuid) to authenticated;