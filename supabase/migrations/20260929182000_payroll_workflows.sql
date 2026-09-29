-- Payroll from Gajian Pro: compensation -> draft -> review -> approved -> locked -> paid.
alter table public.sc_payroll_records drop constraint if exists sc_payroll_records_status_check;
alter table public.sc_payroll_records add constraint sc_payroll_records_status_check
 check(status in ('draft','review','approved','locked','paid'));

create or replace function public.sc_save_compensation(p_school uuid,p_staff uuid,p_base numeric,p_allowance numeric,p_deduction numeric) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_write_active(p_school) or public.sc_role(p_school) not in ('owner','hr') then raise exception 'Akses HR ditolak';end if;
 if p_base is null or p_allowance is null or p_deduction is null or least(p_base,p_allowance,p_deduction)<0 or p_deduction>p_base+p_allowance then raise exception 'Komponen gaji tidak valid';end if;
 if not exists(select 1 from public.sc_staff where id=p_staff and school_id=p_school and user_id is not null) then raise exception 'Karyawan belum terhubung akun';end if;
 insert into public.sc_hr_compensation(staff_id,school_id,base_salary,allowance,deduction)
 values(p_staff,p_school,p_base,p_allowance,p_deduction)
 on conflict(staff_id) do update set base_salary=excluded.base_salary,allowance=excluded.allowance,deduction=excluded.deduction,updated_at=now()
 where public.sc_hr_compensation.school_id=p_school;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id) values(p_school,auth.uid(),'hr.compensation.updated',p_staff::text);
end $$;

create or replace function public.sc_generate_payroll(p_school uuid,p_period text) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_count integer;v_invalid integer;
begin
 if not public.sc_write_active(p_school) or public.sc_role(p_school) not in ('owner','hr') then raise exception 'Akses HR ditolak';end if;
 if p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Periode YYYY-MM tidak valid';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_school::text||p_period,0));
 if exists(select 1 from public.sc_payroll_records where school_id=p_school and period=p_period and status<>'draft') then raise exception 'Periode sedang diproses/dikunci; tidak dapat dihitung ulang';end if;
 if not exists(select 1 from public.sc_hr_compensation c join public.sc_staff s on s.id=c.staff_id and s.school_id=p_school where c.school_id=p_school and s.user_id is not null) then raise exception 'Belum ada komponen gaji pegawai aktif';end if;
 delete from public.sc_payroll_records where school_id=p_school and period=p_period and status='draft';
 insert into public.sc_payroll_records(school_id,staff_id,period,gross,deductions,base_salary,allowances,absence_deduction,staff_snapshot,status)
 select p_school,s.id,p_period,c.base_salary+c.allowance,c.deduction,c.base_salary,c.allowance,0,
 jsonb_build_object('name',s.name,'position',s.position,'user_id',s.user_id),'draft'
 from public.sc_staff s join public.sc_hr_compensation c on c.staff_id=s.id and c.school_id=s.school_id
 where s.school_id=p_school and s.user_id is not null;
 get diagnostics v_count=row_count;
 insert into public.sc_audit_log(school_id,actor_id,action,metadata) values(p_school,auth.uid(),'payroll.generated',jsonb_build_object('period',p_period,'staff_count',v_count));
 return v_count;
end $$;

create or replace function public.sc_advance_payroll(p_school uuid,p_period text,p_next text) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_current text;v_count integer;
begin
 if not public.sc_write_active(p_school) then raise exception 'Langganan sekolah tidak aktif';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_school::text||p_period,0));
 select min(status) into v_current from public.sc_payroll_records where school_id=p_school and period=p_period;
 if v_current is null or exists(select 1 from public.sc_payroll_records where school_id=p_school and period=p_period and status<>v_current) then raise exception 'Status payroll tidak konsisten';end if;
 if not ((v_current='draft' and p_next='review' and public.sc_role(p_school) in ('owner','hr'))
 or (v_current='review' and p_next='approved' and public.sc_role(p_school)='owner')
 or (v_current='approved' and p_next='locked' and public.sc_role(p_school)='owner')
 or (v_current='locked' and p_next='paid' and public.sc_role(p_school) in ('owner','hr'))) then raise exception 'Transisi payroll tidak diizinkan';end if;
 update public.sc_payroll_records set status=p_next,approved_by=case when p_next='approved' then auth.uid() else approved_by end where school_id=p_school and period=p_period;
 get diagnostics v_count=row_count;
 insert into public.sc_audit_log(school_id,actor_id,action,metadata) values(p_school,auth.uid(),'payroll.transition',jsonb_build_object('period',p_period,'from',v_current,'to',p_next,'staff_count',v_count));
 return v_count;
end $$;
create or replace function public.sc_my_payslips(p_school uuid)
 returns table(period text,gross numeric,deductions numeric,base_salary numeric,allowances numeric,staff_snapshot jsonb,status text)
language sql stable security definer set search_path=public,pg_temp as $$
 select p.period,p.gross,p.deductions,p.base_salary,p.allowances,p.staff_snapshot,p.status
 from public.sc_payroll_records p join public.sc_staff s on s.id=p.staff_id and s.school_id=p.school_id
 where p.school_id=p_school and s.user_id=auth.uid() and public.sc_member(p_school) and p.status in ('locked','paid')
 order by p.period desc limit 36
$$;
revoke all on function public.sc_save_compensation(uuid,uuid,numeric,numeric,numeric),public.sc_generate_payroll(uuid,text),public.sc_advance_payroll(uuid,text,text),public.sc_my_payslips(uuid) from public;
grant execute on function public.sc_save_compensation(uuid,uuid,numeric,numeric,numeric),public.sc_generate_payroll(uuid,text),public.sc_advance_payroll(uuid,text,text),public.sc_my_payslips(uuid) to authenticated;

-- Freeze direct financial record mutation: new payments/payroll transitions use guarded RPC.
revoke insert on public.sc_payroll_records from authenticated;
drop policy if exists sc_payroll_write on public.sc_payroll_records;
