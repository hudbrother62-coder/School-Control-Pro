-- Revoke personal historical access immediately when a user leaves a school.
drop policy if exists sc_attendance_read on public.sc_attendance;
create policy sc_attendance_read on public.sc_attendance for select to authenticated
 using(public.sc_member(school_id) and (user_id=auth.uid() or public.sc_manager(school_id) or public.sc_role(school_id)='hr'));

drop policy if exists sc_events_read on public.sc_staff_events;
create policy sc_events_read on public.sc_staff_events for select to authenticated
 using(public.sc_member(school_id) and (staff_user_id=auth.uid() or public.sc_manager(school_id) or public.sc_role(school_id)='hr'));

drop policy if exists sc_leave_read on public.sc_leave_requests;
create policy sc_leave_read on public.sc_leave_requests for select to authenticated
 using(public.sc_member(school_id) and (user_id=auth.uid() or public.sc_manager(school_id) or public.sc_role(school_id)='hr'));
