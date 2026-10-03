-- Exporting journals must not make their private records readable by school colleagues.
create policy sc_journal_report_privacy on public.sc_report_documents as restrictive for select to authenticated using(module_key<>'journals' or public.sc_manager(school_id) or issued_by=(select auth.uid()));
