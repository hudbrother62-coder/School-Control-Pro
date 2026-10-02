alter table public.sc_report_documents add column archived_at timestamptz, add column archived_reason text, add column archived_previous_status text;
create or replace function public.sc_archive_report(p_school uuid,p_document uuid,p_archive boolean,p_reason text default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare d sc_report_documents%rowtype;
begin
 if not sc_manager(p_school) or not sc_write_active(p_school) then raise exception 'Akses pengelola sekolah aktif diperlukan.'; end if;
 select * into d from sc_report_documents where id=p_document and school_id=p_school for update;
 if not found or not sc_module_access(p_school,d.module_key) then raise exception 'Dokumen tidak tersedia untuk peran Anda.'; end if;
 if p_archive then
  if d.status='archived' then return; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Alasan arsip minimal 3 karakter.'; end if;
  update sc_report_documents set archived_previous_status=status,status='archived',archived_at=now(),archived_reason=trim(p_reason) where id=d.id;
 else
  if d.status<>'archived' then return; end if;
  if d.archived_previous_status is null then raise exception 'Arsip lama tidak memiliki status asal; hubungi pengelola.'; end if;
  update sc_report_documents set status=archived_previous_status,archived_previous_status=null,archived_at=null,archived_reason=null where id=d.id;
 end if;
end $$;
revoke all on function public.sc_archive_report(uuid,uuid,boolean,text) from public,anon;
grant execute on function public.sc_archive_report(uuid,uuid,boolean,text) to authenticated;
create or replace function public.sc_guard_final_report() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='DELETE' then
  if old.status in ('approved','issued') or (old.status='archived' and coalesce(old.archived_previous_status,'issued') in ('approved','issued')) then
   raise exception 'Laporan final bernomor tidak dapat dihapus; arsipkan untuk mempertahankan jejak dokumen.';
  end if;
  return old;
 end if;
 if old.status in ('approved','issued') or (old.status='archived' and coalesce(old.archived_previous_status,'issued') in ('approved','issued')) then
  if new.content_snapshot is distinct from old.content_snapshot or new.document_number is distinct from old.document_number or new.title is distinct from old.title or new.school_id is distinct from old.school_id or new.module_key is distinct from old.module_key or new.document_type is distinct from old.document_type or new.issued_by is distinct from old.issued_by or new.issued_at is distinct from old.issued_at then raise exception 'Isi laporan final tidak dapat diubah; terbitkan versi baru.'; end if;
  if new.status not in ('approved','issued','archived') then raise exception 'Laporan final tidak dapat dikembalikan menjadi draft.'; end if;
 end if;
 return new;
end $$;
create trigger sc_report_final_immutable before update or delete on public.sc_report_documents for each row execute function public.sc_guard_final_report();

