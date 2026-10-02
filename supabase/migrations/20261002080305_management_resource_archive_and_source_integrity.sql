alter table public.sc_template_library add column archived_at timestamptz;
alter table public.sc_document_sources add column archived_at timestamptz;
alter table public.sc_template_library add constraint sc_template_http_url check(url is null or (url~'^https?://[^[:space:]]+$' and url!~'^https?://[^/]*@')) not valid;
alter table public.sc_document_sources add constraint sc_source_http_url check(url is null or (url~'^https?://[^[:space:]]+$' and url!~'^https?://[^/]*@')) not valid;
create or replace function public.sc_guard_document_source_reference() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.document_id is not null and not exists(select 1 from sc_documents where id=new.document_id and school_id=new.school_id) then raise exception 'Dokumen sumber harus berasal dari sekolah yang sama.'; end if;
 if new.source_type in ('url','official_reference') and nullif(trim(new.url),'') is null then raise exception 'URL acuan wajib diisi.'; end if;
 if new.source_type='file' and (new.storage_path is null or left(new.storage_path,length(new.school_id::text)+1)<>new.school_id::text||'/') then raise exception 'Berkas sumber harus berada di folder sekolah yang sama.'; end if;
 return new;
end $$;
revoke all on function public.sc_guard_document_source_reference() from public,anon,authenticated;
create trigger sc_document_source_reference before insert or update of school_id,document_id,source_type,url,storage_path on public.sc_document_sources for each row execute function public.sc_guard_document_source_reference();
create or replace function public.sc_archive_management_resource(p_school uuid,p_entity text,p_id uuid,p_archive boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare changed integer;
begin
 if not sc_manager(p_school) or not sc_write_active(p_school) then raise exception 'Akses pengelola sekolah aktif diperlukan.'; end if;
 case p_entity
 when 'template' then update sc_template_library set archived_at=case when p_archive then now() else null end where school_id=p_school and id=p_id and scope='school';
 when 'source' then update sc_document_sources set archived_at=case when p_archive then now() else null end where school_id=p_school and id=p_id;
 else raise exception 'Jenis data tidak didukung.'; end case;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Data tidak tersedia untuk sekolah ini.'; end if;
 insert into sc_audit_log(school_id,actor_id,action,target_id,metadata) values(p_school,auth.uid(),case when p_archive then 'management.resource.archived' else 'management.resource.restored' end,p_id::text,jsonb_build_object('entity',p_entity));
end $$;
revoke all on function public.sc_archive_management_resource(uuid,text,uuid,boolean) from public,anon;
grant execute on function public.sc_archive_management_resource(uuid,text,uuid,boolean) to authenticated;
create or replace function public.sc_guard_management_resource_delete() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if old.school_id is null then raise exception 'Pustaka platform tidak dapat dihapus melalui akun sekolah.'; end if;
 if not exists(select 1 from sc_schools where id=old.school_id) then return old; end if;
 if old.archived_at is null then raise exception 'Arsipkan sumber atau template sebelum menghapus permanen.'; end if;
 if tg_table_name='sc_document_sources' then
  if old.document_id is not null then raise exception 'Sumber terkait dokumen harus disimpan sebagai arsip.'; end if;
 end if;
 return old;
end $$;
revoke all on function public.sc_guard_management_resource_delete() from public,anon,authenticated;
create trigger sc_template_delete_guard before delete on public.sc_template_library for each row execute function public.sc_guard_management_resource_delete();
create trigger sc_source_delete_guard before delete on public.sc_document_sources for each row execute function public.sc_guard_management_resource_delete();
