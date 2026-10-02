create or replace function public.sc_guard_final_report() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='DELETE' then
  if old.status in ('approved','issued') or (old.status='archived' and coalesce(old.archived_previous_status,'issued') in ('approved','issued')) then
   raise exception 'Laporan final bernomor tidak dapat dihapus; arsipkan untuk mempertahankan jejak dokumen.';
  end if;
  return old;
 end if;
 if old.status in ('approved','issued') or (old.status='archived' and coalesce(old.archived_previous_status,'issued') in ('approved','issued')) then
  if new.status='archived' and new.archived_previous_status is distinct from (case when old.status='archived' then coalesce(old.archived_previous_status,'issued') else old.status end) then raise exception 'Status asal laporan final harus dipertahankan.'; end if;
  if new.period_start is distinct from old.period_start or new.period_end is distinct from old.period_end then raise exception 'Periode laporan final tidak dapat diubah.'; end if;
  if new.content_snapshot is distinct from old.content_snapshot or new.document_number is distinct from old.document_number or new.title is distinct from old.title or new.school_id is distinct from old.school_id or new.module_key is distinct from old.module_key or new.document_type is distinct from old.document_type or new.issued_by is distinct from old.issued_by or new.issued_at is distinct from old.issued_at then raise exception 'Isi laporan final tidak dapat diubah; terbitkan versi baru.'; end if;
  if new.status not in ('approved','issued','archived') then raise exception 'Laporan final tidak dapat dikembalikan menjadi draft.'; end if;
 end if;
 return new;
end $$;

