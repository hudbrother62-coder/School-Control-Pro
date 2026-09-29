-- Match backend module authorization with role-aware UI; frontend navigation is not a security boundary.
create or replace function public.sc_module_access(p_school uuid,p_module text) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select public.sc_member(p_school) and case
  when p_module='sikas' then public.sc_role(p_school) in ('owner','principal','treasurer')
  when p_module='gajian' then public.sc_role(p_school) in ('owner','hr')
  when p_module='kepsek_ai' then public.sc_role(p_school) in ('owner','principal','vice_principal')
  when p_module in ('guru_ai','buku_kerja') then public.sc_role(p_school) in ('owner','principal','vice_principal','teacher')
  when p_module='disiplin' then public.sc_role(p_school) in ('owner','principal','vice_principal','teacher','counselor')
  when p_module='bk' then public.sc_role(p_school)='counselor'
  when p_module='command' then public.sc_role(p_school)<>'viewer'
  else public.sc_role(p_school)<>'viewer' end
$$;
-- Recalculate individual account balance across complete history, not a paginated frontend list.
create or replace function public.sc_account_balances(p_school uuid)
returns table(account_id uuid,account_name text,kind text,balance numeric)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if public.sc_role(p_school) not in ('owner','principal','treasurer') then raise exception 'Akses keuangan ditolak';end if;
 return query select a.id,a.name,a.kind,a.opening_balance+
  coalesce((select sum(case when t.kind='income' then t.amount else -t.amount end) from public.sc_finance_transactions t where t.school_id=p_school and t.account_id=a.id),0)
 from public.sc_finance_accounts a where a.school_id=p_school order by a.name;
end $$;
revoke all on function public.sc_account_balances(uuid) from public;
grant execute on function public.sc_account_balances(uuid) to authenticated;

create or replace function public.sc_edit_grade(p_school uuid,p_grade uuid,p_score numeric,p_note text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_creator uuid;v_class uuid;v_old numeric;
begin
 if not public.sc_write_active(p_school) or p_score is null or p_score<0 or p_score>100 then raise exception 'Nilai tidak valid atau langganan tidak aktif';end if;
 select recorded_by,class_id,score into v_creator,v_class,v_old from public.sc_grades where id=p_grade and school_id=p_school for update;
 if not found or not public.sc_teaches_class(p_school,v_class) or (v_creator<>auth.uid() and not public.sc_manager(p_school)) then raise exception 'Tidak dapat mengubah nilai';end if;
 update public.sc_grades set score=p_score,notes=nullif(trim(p_note),'') where id=p_grade and school_id=p_school;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'grade.updated',p_grade::text,jsonb_build_object('old_score',v_old,'new_score',p_score));
end $$;
revoke all on function public.sc_edit_grade(uuid,uuid,numeric,text) from public;
grant execute on function public.sc_edit_grade(uuid,uuid,numeric,text) to authenticated;
