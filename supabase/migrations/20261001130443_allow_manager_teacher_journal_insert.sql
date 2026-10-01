create policy sc_journals_manager_insert
on public.sc_teacher_journals
for insert
to authenticated
with check (
  sc_write_active(school_id)
  and sc_manager(school_id)
);
