-- A primary owner account may open only one paid/trial school workspace.
-- Prevents repeatedly starting a new trial under the same owner identity.
create unique index if not exists sc_one_school_per_owner on public.sc_schools(created_by);
