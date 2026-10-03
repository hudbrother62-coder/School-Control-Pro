-- Private assets, tenant-scoped reads, manager-only writes. No public signatures/stamps.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('sc-report-assets','sc-report-assets',false,5242880,array['image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document']) on conflict(id) do nothing;
create policy sc_report_asset_read on storage.objects for select to authenticated
using(bucket_id='sc-report-assets' and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$' and public.sc_member(((storage.foldername(name))[1])::uuid));
create policy sc_report_asset_insert on storage.objects for insert to authenticated
with check(bucket_id='sc-report-assets' and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$' and public.sc_manager(((storage.foldername(name))[1])::uuid) and public.sc_write_active(((storage.foldername(name))[1])::uuid) and (storage.foldername(name))[2] in ('templates','images'));
create policy sc_report_asset_delete on storage.objects for delete to authenticated
using(bucket_id='sc-report-assets' and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$' and public.sc_manager(((storage.foldername(name))[1])::uuid) and public.sc_write_active(((storage.foldername(name))[1])::uuid));
create or replace function public.sc_configure_report_templates(p_school uuid,p_patch jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare settings jsonb;entry record;path text;key text;
begin
 if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak';end if;
 if jsonb_typeof(p_patch)<>'object' or octet_length(p_patch::text)>50000 then raise exception 'Pengaturan tidak valid';end if;
 if exists(select 1 from jsonb_object_keys(p_patch) x where x not in ('templates','asset_paths','body_font','body_font_size','show_logo','show_signature','show_stamp')) then raise exception 'Pengaturan tidak didukung';end if;
 if p_patch ? 'body_font_size' and ((p_patch->>'body_font_size')::numeric not between 8 and 18) then raise exception 'Ukuran font harus 8–18 pt';end if;
 if p_patch ? 'body_font' and length(p_patch->>'body_font') not between 1 and 80 then raise exception 'Font tidak valid';end if;
 select coalesce(report_settings,'{}'::jsonb) into settings from public.sc_schools where id=p_school for update;
 foreach key in array array['templates','asset_paths'] loop
  if not p_patch ? key then continue;end if;
  if jsonb_typeof(p_patch->key)<>'object' then raise exception 'Daftar template/aset tidak valid';end if;
  for entry in select * from jsonb_each(p_patch->key) loop
   if entry.key !~ '^[A-Za-z0-9_-]{1,80}$' then raise exception 'Kode laporan tidak valid';end if;
   if entry.value='null'::jsonb then settings=jsonb_set(settings,array[key],coalesce(settings->key,'{}'::jsonb)-entry.key);continue;end if;
   if key='templates' then path=entry.value->>'path';
    if jsonb_typeof(entry.value)<>'object' or length(coalesce(entry.value->>'name','')) not between 1 and 180 then raise exception 'Metadata template tidak valid';end if;
   else
    if entry.key not in ('logo','signature','stamp') then raise exception 'Jenis aset tidak valid';end if;
    path=entry.value#>>'{}';
   end if;
   if path is null or path not like (p_school::text||'/'||(case when key='templates' then 'templates' else 'images' end)||'/%') or not exists(select 1 from storage.objects where bucket_id='sc-report-assets' and name=path) then raise exception 'File bukan milik sekolah ini atau tidak ditemukan';end if;
   settings=jsonb_set(settings,array[key],coalesce(settings->key,'{}'::jsonb)||jsonb_build_object(entry.key,entry.value));
  end loop;
 end loop;
 settings=settings||(p_patch-'templates'-'asset_paths');
 update public.sc_schools set report_settings=settings where id=p_school;
 insert into public.sc_audit_log(school_id,actor_id,action,metadata) values(p_school,auth.uid(),'report.templates.configured',jsonb_build_object('keys',array(select jsonb_object_keys(p_patch))));
end; $$;
revoke all on function public.sc_configure_report_templates(uuid,jsonb) from public,anon;
grant execute on function public.sc_configure_report_templates(uuid,jsonb) to authenticated;
