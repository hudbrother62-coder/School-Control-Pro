create or replace function public.sc_guard_hr_request_update() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare allowed boolean;
begin
 if auth.uid() is null then return new; end if;
 if not sc_write_active(old.school_id) then raise exception 'Sekolah atau akses tidak aktif.'; end if;
 if new.school_id<>old.school_id or new.user_id<>old.user_id then raise exception 'Pemilik dan sekolah pengajuan tidak dapat diubah.'; end if;
 allowed:=sc_hr_manager(old.school_id) or exists(select 1 from sc_supervisor_assignments a join sc_staff s on s.id=a.staff_id and s.school_id=a.school_id where a.school_id=old.school_id and a.supervisor_user_id=auth.uid() and s.user_id=old.user_id);
 if old.status<>'pending' and (new.kind is distinct from old.kind or new.reason is distinct from old.reason or new.amount is distinct from old.amount or new.from_at is distinct from old.from_at or new.to_at is distinct from old.to_at) then raise exception 'Isi pengajuan yang sudah diputuskan tidak dapat diubah.'; end if;
 if new.status is distinct from old.status then
  if not ((old.status='pending' and new.status in ('approved','rejected','cancelled')) or (old.status='approved' and new.status='paid' and old.kind in ('cash_advance','reimbursement') and sc_role(old.school_id) in ('owner','hr'))) then raise exception 'Perubahan status pengajuan tidak valid.'; end if;
 end if;
 if not allowed then
  if old.user_id<>auth.uid() or old.status<>'pending' or new.status not in ('pending','cancelled') or new.decided_by is distinct from old.decided_by or new.decided_at is distinct from old.decided_at or new.decision_note is distinct from old.decision_note then raise exception 'Pengajuan hanya dapat diedit atau dibatalkan sebelum keputusan; approval memerlukan atasan.'; end if;
 end if;
 return new;
end $$;
revoke all on function public.sc_guard_hr_request_update() from public,anon,authenticated;

