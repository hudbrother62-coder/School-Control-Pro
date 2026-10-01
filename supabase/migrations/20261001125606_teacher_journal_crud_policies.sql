grant update, delete on table public.sc_teacher_journals to authenticated;

drop policy if exists sc_journals_update on public.sc_teacher_journals;
create policy sc_journals_update
on public.sc_teacher_journals
for update
to authenticated
using (
  sc_write_active(school_id)
  and (
    sc_manager(school_id)
    or (teacher_id = (select auth.uid()) and sc_member(school_id))
  )
)
with check (
  sc_write_active(school_id)
  and (
    sc_manager(school_id)
    or (teacher_id = (select auth.uid()) and sc_member(school_id))
  )
);

drop policy if exists sc_journals_delete on public.sc_teacher_journals;
create policy sc_journals_delete
on public.sc_teacher_journals
for delete
to authenticated
using (
  sc_write_active(school_id)
  and (
    sc_manager(school_id)
    or (teacher_id = (select auth.uid()) and sc_member(school_id))
  )
);
