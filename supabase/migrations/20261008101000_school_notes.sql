-- Catatan pribadi dan catatan lintas peran, dibatasi per sekolah.
-- "Pribadi" dapat dibaca penulis dan kepala sekolah/pemilik akun.
create table if not exists public.sc_notes (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 scope text not null check (scope in ('personal','role')),
 target_role text,
 title text not null check (char_length(btrim(title)) between 2 and 160),
 body text not null check (char_length(btrim(body)) between 1 and 12000),
 is_pinned boolean not null default false,
 archived_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint sc_notes_scope_target check (
  (scope='personal' and target_role is null)
  or (scope='role' and target_role in
   ('owner','principal','vice_principal','teacher','counselor','hr','treasurer','finance_staff','supervisor','staff'))
 )
);
create index if not exists sc_notes_school_recent_idx on public.sc_notes(school_id,updated_at desc,id);
create index if not exists sc_notes_role_idx on public.sc_notes(school_id,target_role,updated_at desc) where scope='role';
create index if not exists sc_notes_author_idx on public.sc_notes(school_id,author_id,updated_at desc);

alter table public.sc_notes enable row level security;
revoke all on public.sc_notes from public,anon,authenticated;
grant select,insert,delete on public.sc_notes to authenticated;
grant update(title,body,scope,target_role,is_pinned,archived_at) on public.sc_notes to authenticated;

create policy sc_notes_read on public.sc_notes for select to authenticated
 using (public.sc_member(school_id) and
  (author_id=(select auth.uid()) or public.sc_role(school_id) in ('owner','principal')
   or (scope='role' and target_role=public.sc_role(school_id))));
create policy sc_notes_create on public.sc_notes for insert to authenticated
 with check (public.sc_member(school_id) and public.sc_write_active(school_id)
  and author_id=(select auth.uid()) and public.sc_role(school_id)<>'viewer');
create policy sc_notes_edit on public.sc_notes for update to authenticated
 using (public.sc_member(school_id) and public.sc_write_active(school_id)
  and author_id=(select auth.uid()) and public.sc_role(school_id)<>'viewer')
 with check (public.sc_member(school_id) and public.sc_write_active(school_id)
  and author_id=(select auth.uid()) and public.sc_role(school_id)<>'viewer');
create policy sc_notes_delete on public.sc_notes for delete to authenticated
 using (public.sc_member(school_id) and public.sc_write_active(school_id)
  and author_id=(select auth.uid()) and public.sc_role(school_id)<>'viewer');

create or replace function public.sc_note_stamp() returns trigger
 language plpgsql set search_path=public,pg_temp as $$
begin
 if new.school_id is distinct from old.school_id or new.author_id is distinct from old.author_id
   or new.created_at is distinct from old.created_at then
  raise exception 'Identitas catatan tidak boleh diubah' using errcode='42501';
 end if;
 new.updated_at:=now();
 return new;
end $$;
create trigger sc_note_stamp_before_update
 before update on public.sc_notes for each row execute function public.sc_note_stamp();
create trigger sc_notes_school_realtime
 after insert or update or delete on public.sc_notes for each row execute function public.sc_emit_school_change();
comment on table public.sc_notes is 'Catatan berdasarkan peran dan pribadi. Kepala sekolah dan pemilik akun dapat membaca seluruh catatan dalam sekolahnya.';
