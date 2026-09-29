-- Additional tenant-bound foreign keys and read-only viewer policy.
create or replace function public.sc_module_write_access(p_school uuid,p_module text) returns boolean
 language sql stable security definer set search_path=public,pg_temp as $$
 select public.sc_module_access(p_school,p_module)
 and public.sc_role(p_school)<>'viewer'
 $$;
drop policy if exists sc_records_write on public.sc_records;
create policy sc_records_write on public.sc_records for insert to authenticated
 with check(public.sc_module_write_access(school_id,module_key) and public.sc_write_active(school_id) and created_by=auth.uid());

drop policy if exists sc_bk_private_write on public.sc_bk_cases;
create policy sc_bk_private_write on public.sc_bk_cases for insert to authenticated
 with check(assigned_counselor=auth.uid() and public.sc_role(school_id)='counselor'
 and public.sc_write_active(school_id)
 and exists(select 1 from public.sc_students s where s.id=student_id and s.school_id=sc_bk_cases.school_id));

drop policy if exists sc_discipline_write on public.sc_discipline_events;
create policy sc_discipline_write on public.sc_discipline_events for insert to authenticated
 with check(public.sc_role(school_id) in ('owner','principal','vice_principal','teacher','counselor')
 and public.sc_write_active(school_id)
 and created_by=auth.uid()
 and exists(select 1 from public.sc_students s where s.id=student_id and s.school_id=sc_discipline_events.school_id));

drop policy if exists sc_finance_write on public.sc_finance_transactions;
create policy sc_finance_write on public.sc_finance_transactions for insert to authenticated
 with check(public.sc_role(school_id) in ('owner','principal','treasurer') and public.sc_write_active(school_id)
 and created_by=auth.uid()
 and (activity_id is null or exists(select 1 from public.sc_programs p where p.id=activity_id and p.school_id=sc_finance_transactions.school_id)));

drop policy if exists sc_payroll_write on public.sc_payroll_records;
create policy sc_payroll_write on public.sc_payroll_records for insert to authenticated
 with check(public.sc_role(school_id) in ('owner','hr') and public.sc_write_active(school_id)
 and exists(select 1 from public.sc_staff s where s.id=staff_id and s.school_id=sc_payroll_records.school_id));

drop policy if exists sc_events_write on public.sc_staff_events;
create policy sc_events_write on public.sc_staff_events for insert to authenticated
 with check(public.sc_manager(school_id) and public.sc_write_active(school_id) and created_by=auth.uid()
 and exists(select 1 from public.sc_members m where m.school_id=sc_staff_events.school_id and m.user_id=staff_user_id));

drop policy if exists sc_programs_write on public.sc_programs;
create policy sc_programs_write on public.sc_programs for insert to authenticated
 with check(public.sc_manager(school_id) and public.sc_write_active(school_id)
 and (owner_id is null or exists(select 1 from public.sc_members m where m.school_id=sc_programs.school_id and m.user_id=owner_id))
 and (pic_id is null or exists(select 1 from public.sc_members m where m.school_id=sc_programs.school_id and m.user_id=pic_id)));

create or replace function public.sc_ensure_own_staff(p_school uuid) returns uuid
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_id uuid;v_name text;
 begin
  if not public.sc_member(p_school) or not public.sc_write_active(p_school) or public.sc_role(p_school)='viewer'
    then raise exception 'Akses sekolah tidak aktif atau hanya melihat'; end if;
  select id into v_id from public.sc_staff where school_id=p_school and user_id=auth.uid();
  if v_id is not null then return v_id; end if;
  select split_part(email,'@',1) into v_name from auth.users where id=auth.uid();
  insert into public.sc_staff(school_id,user_id,name) values(p_school,auth.uid(),coalesce(nullif(v_name,''),'Pengguna')) returning id into v_id;
  return v_id;
 end $$;
