create or replace function public.sc_hr_manager(p_school uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select sc_member(p_school) and sc_role(p_school) in ('owner','principal','vice_principal','hr') $$;
revoke all on function public.sc_hr_manager(uuid) from public,anon;
grant execute on function public.sc_hr_manager(uuid) to authenticated;
do $$
declare t text;
begin
 foreach t in array array['sc_hr_work_schedules','sc_hr_locations','sc_hr_assignments','sc_payroll_component_catalog','sc_payroll_staff_components','sc_recruitment_openings','sc_recruitment_candidates'] loop
  execute format('drop policy if exists "gajian write" on public.%I',t);
  execute format('create policy "hr manager write" on public.%I for all to authenticated using (public.sc_hr_manager(school_id) and public.sc_write_active(school_id)) with check (public.sc_hr_manager(school_id) and public.sc_write_active(school_id))',t);
 end loop;
 foreach t in array array['sc_payroll_component_catalog','sc_recruitment_openings','sc_recruitment_candidates'] loop
  execute format('drop policy if exists "gajian read" on public.%I',t);
  execute format('create policy "hr manager read" on public.%I for select to authenticated using (public.sc_hr_manager(school_id))',t);
 end loop;
end $$;
drop policy "gajian read" on public.sc_payroll_staff_components;
create policy "own payroll components read" on public.sc_payroll_staff_components for select to authenticated using (sc_member(school_id) and (sc_hr_manager(school_id) or exists(select 1 from sc_staff s where s.id=staff_id and s.school_id=sc_payroll_staff_components.school_id and s.user_id=auth.uid())));
drop policy "gajian read" on public.sc_hr_assignments;
create policy "own assignment read" on public.sc_hr_assignments for select to authenticated using (sc_member(school_id) and (sc_hr_manager(school_id) or exists(select 1 from sc_staff s where s.id=staff_id and s.school_id=sc_hr_assignments.school_id and s.user_id=auth.uid())));
drop policy "field visit read" on public.sc_field_visits;
drop policy "field visit write" on public.sc_field_visits;
create policy "field visit read" on public.sc_field_visits for select to authenticated using(sc_member(school_id) and (user_id=auth.uid() or sc_hr_manager(school_id)));
create policy "field visit write" on public.sc_field_visits for all to authenticated using(sc_write_active(school_id) and (user_id=auth.uid() or sc_hr_manager(school_id))) with check(sc_write_active(school_id) and (user_id=auth.uid() or sc_hr_manager(school_id)));
drop policy "tracking session read" on public.sc_tracking_sessions;
drop policy "tracking session write" on public.sc_tracking_sessions;
create policy "tracking session read" on public.sc_tracking_sessions for select to authenticated using(sc_member(school_id) and (user_id=auth.uid() or sc_hr_manager(school_id)));
create policy "tracking session write" on public.sc_tracking_sessions for all to authenticated using(sc_write_active(school_id) and user_id=auth.uid()) with check(sc_write_active(school_id) and user_id=auth.uid());
drop policy "tracking points read" on public.sc_tracking_points;
drop policy "tracking points insert" on public.sc_tracking_points;
create policy "tracking points read" on public.sc_tracking_points for select to authenticated using(sc_member(school_id) and (user_id=auth.uid() or sc_hr_manager(school_id)));
create policy "tracking points insert" on public.sc_tracking_points for insert to authenticated with check(sc_write_active(school_id) and user_id=auth.uid() and exists(select 1 from sc_tracking_sessions s where s.id=session_id and s.school_id=sc_tracking_points.school_id and s.user_id=auth.uid() and s.status='active'));
drop policy "hr requests insert" on public.sc_hr_requests;
create policy "hr requests insert" on public.sc_hr_requests for insert to authenticated with check(sc_write_active(school_id) and user_id=auth.uid() and status='pending');
drop policy "hr requests delete" on public.sc_hr_requests;
create policy "hr requests delete" on public.sc_hr_requests for delete to authenticated using(sc_write_active(school_id) and status in ('pending','cancelled','rejected') and (user_id=auth.uid() or sc_hr_manager(school_id)));
create or replace function public.sc_guard_hr_request_update() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare allowed boolean;
begin
 if auth.uid() is null then return new; end if;
 if not sc_write_active(old.school_id) then raise exception 'Sekolah atau akses tidak aktif.'; end if;
 if new.school_id<>old.school_id or new.user_id<>old.user_id then raise exception 'Pemilik dan sekolah pengajuan tidak dapat diubah.'; end if;
 allowed:=sc_hr_manager(old.school_id) or exists(select 1 from sc_supervisor_assignments a join sc_staff s on s.id=a.staff_id and s.school_id=a.school_id where a.school_id=old.school_id and a.supervisor_user_id=auth.uid() and s.user_id=old.user_id);
 if not allowed then
  if old.user_id<>auth.uid() or old.status<>'pending' or new.status not in ('pending','cancelled') or new.decided_by is distinct from old.decided_by or new.decided_at is distinct from old.decided_at or new.decision_note is distinct from old.decision_note then raise exception 'Pengajuan hanya dapat diedit atau dibatalkan sebelum keputusan; approval memerlukan atasan.'; end if;
 end if;
 return new;
end $$;
revoke all on function public.sc_guard_hr_request_update() from public,anon,authenticated;
create trigger sc_hr_request_update_guard before update on public.sc_hr_requests for each row execute function public.sc_guard_hr_request_update();

