-- Retain reasons and review comments in the manager-only audit history.
create or replace function public.sc_work_journal_action(p_school uuid,p_id uuid,p_action text,p_note text default '') returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.sc_work_journals; own boolean; manager boolean:=coalesce(public.sc_manager(p_school),false);
begin
 if auth.uid() is null or not coalesce(public.sc_write_active(p_school),false) then raise exception 'Akses jurnal ditolak' using errcode='42501';end if;
 select * into r from public.sc_work_journals where id=p_id and school_id=p_school for update;
 if not found then raise exception 'Jurnal tidak ditemukan';end if;own:=r.author_id=auth.uid();
 if not own and not manager then raise exception 'Jurnal bukan milik Anda' using errcode='42501';end if;
 if length(p_note)>4000 then raise exception 'Catatan maksimal 4000 karakter';end if;
 if p_action='submit' then
  if not own or r.status not in('draft','revision') or r.archived_at is not null then raise exception 'Hanya draf aktif penulis dapat dikirim';end if;
  update public.sc_work_journals set status='submitted',submitted_at=now(),updated_at=now() where id=p_id;
 elsif p_action in('review','revision') then
  if not manager or r.author_id=auth.uid() or r.status<>'submitted' or r.archived_at is not null then raise exception 'Jurnal menunggu review oleh pengelola lain';end if;
  if length(btrim(coalesce(p_note,'')))<5 then raise exception 'Catatan review minimal 5 karakter';end if;
  update public.sc_work_journals set status=case when p_action='review' then 'reviewed' else 'revision' end,reviewed_by=auth.uid(),reviewed_at=now(),review_note=btrim(p_note),updated_at=now() where id=p_id;
 elsif p_action='withdraw' then
  if not own or r.status<>'submitted' or r.archived_at is not null then raise exception 'Hanya kiriman yang belum direview dapat ditarik';end if;
  update public.sc_work_journals set status='draft',updated_at=now() where id=p_id;
 elsif p_action='archive' then
  if r.archived_at is not null then raise exception 'Jurnal sudah diarsipkan';end if;
  update public.sc_work_journals set archived_at=now(),updated_at=now() where id=p_id;
 elsif p_action='restore' then
  if r.archived_at is null then raise exception 'Jurnal belum diarsipkan';end if;
  update public.sc_work_journals set archived_at=null,updated_at=now() where id=p_id;
 elsif p_action='delete' then
  if r.archived_at is null or (r.status in('submitted','reviewed') and not manager) then raise exception 'Arsipkan dahulu; laporan dikirim/direview hanya dapat dihapus pengelola';end if;
  if length(btrim(coalesce(p_note,'')))<5 then raise exception 'Alasan hapus permanen minimal 5 karakter';end if;
  delete from public.sc_work_journals where id=p_id;
 else raise exception 'Tindakan jurnal tidak valid';end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata) values(p_school,auth.uid(),'journal.'||p_action,p_id::text,jsonb_build_object('previous_status',r.status,'journal_title',r.title,'author_id',r.author_id,'note',coalesce(p_note,'')));
end $$;
