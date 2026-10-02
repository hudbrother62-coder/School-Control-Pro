alter table public.sc_recruitment_candidates add column archived_at timestamptz;
create or replace function public.sc_guard_recruitment_delete() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from sc_schools where id=old.school_id) then return old; end if;
 if tg_table_name='sc_recruitment_openings' then
  if old.status<>'closed' then raise exception 'Tutup lowongan sebelum menghapus permanen.'; end if;
  if exists(select 1 from sc_recruitment_candidates where opening_id=old.id) then raise exception 'Lowongan memiliki riwayat kandidat; simpan sebagai lowongan ditutup.'; end if;
 else
  if old.archived_at is null then raise exception 'Arsipkan kandidat sebelum menghapus permanen.'; end if;
 end if;
 return old;
end $$;
revoke all on function public.sc_guard_recruitment_delete() from public,anon,authenticated;
create trigger sc_recruitment_opening_delete_guard before delete on public.sc_recruitment_openings for each row execute function public.sc_guard_recruitment_delete();
create trigger sc_recruitment_candidate_delete_guard before delete on public.sc_recruitment_candidates for each row execute function public.sc_guard_recruitment_delete();
