drop policy "hr requests read" on public.sc_hr_requests;
drop policy "hr requests update" on public.sc_hr_requests;
create policy "hr requests read" on public.sc_hr_requests for select to authenticated using(sc_member(school_id) and (user_id=auth.uid() or sc_hr_manager(school_id) or exists(select 1 from sc_supervisor_assignments a join sc_staff s on s.id=a.staff_id and s.school_id=a.school_id where a.school_id=sc_hr_requests.school_id and a.supervisor_user_id=auth.uid() and s.user_id=sc_hr_requests.user_id)));
create policy "hr requests update" on public.sc_hr_requests for update to authenticated using(sc_write_active(school_id) and (user_id=auth.uid() or sc_hr_manager(school_id) or exists(select 1 from sc_supervisor_assignments a join sc_staff s on s.id=a.staff_id and s.school_id=a.school_id where a.school_id=sc_hr_requests.school_id and a.supervisor_user_id=auth.uid() and s.user_id=sc_hr_requests.user_id))) with check(sc_write_active(school_id));
create or replace function public.sc_decide_hr_request(p_school uuid,p_request uuid,p_status text,p_note text default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v sc_hr_requests%rowtype; allowed boolean;
begin
 if not sc_write_active(p_school) then raise exception 'Akses sekolah aktif diperlukan.'; end if;
 select * into v from sc_hr_requests where id=p_request and school_id=p_school for update;
 if not found then raise exception 'Pengajuan tidak ditemukan.'; end if;
 allowed:=sc_hr_manager(p_school) or exists(select 1 from sc_supervisor_assignments a join sc_staff s on s.id=a.staff_id and s.school_id=a.school_id where a.school_id=p_school and a.supervisor_user_id=auth.uid() and s.user_id=v.user_id);
 if not allowed then raise exception 'Akses approval ditolak.'; end if;
 if p_status not in ('approved','rejected','paid','cancelled') then raise exception 'Status tidak valid.'; end if;
 if v.status=p_status then return; end if;
 if p_status='paid' then
  if sc_role(p_school) not in ('owner','hr') or v.status<>'approved' or v.kind not in ('cash_advance','reimbursement') then raise exception 'Pencairan hanya untuk pengajuan uang yang sudah disetujui, oleh pemilik atau HR.'; end if;
 elsif v.status<>'pending' then raise exception 'Pengajuan sudah diputuskan; status tidak dapat ditimpa.'; end if;
 update sc_hr_requests set status=p_status,decided_by=auth.uid(),decided_at=now(),decision_note=p_note where id=v.id;
end $$;

