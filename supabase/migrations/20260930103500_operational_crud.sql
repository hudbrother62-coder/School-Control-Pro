-- Safe edit/delete/reversal helpers for operational School Control records.
create or replace function public.sc_update_operational(p_school uuid,p_entity text,p_id uuid,p_patch jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r text:=public.sc_role(p_school);
begin
 if not public.sc_write_active(p_school) then raise exception 'Langganan tidak aktif'; end if;
 case p_entity
  when 'program' then
   if not public.sc_manager(p_school) then raise exception 'Akses ditolak'; end if;
   update public.sc_programs set
    title=coalesce(nullif(trim(p_patch->>'title'),''),title),
    deadline=coalesce(nullif(p_patch->>'deadline','')::date,deadline),
    pic_id=case when p_patch ? 'pic_id' then nullif(p_patch->>'pic_id','')::uuid else pic_id end
   where id=p_id and school_id=p_school;
  when 'task' then
   if not exists(select 1 from public.sc_program_tasks where id=p_id and school_id=p_school and (public.sc_manager(p_school) or created_by=auth.uid() or pic_id=auth.uid())) then raise exception 'Akses ditolak'; end if;
   update public.sc_program_tasks set
    title=coalesce(nullif(trim(p_patch->>'title'),''),title),
    due_at=case when p_patch ? 'due_at' then nullif(p_patch->>'due_at','')::timestamptz else due_at end,
    pic_id=case when p_patch ? 'pic_id' then nullif(p_patch->>'pic_id','')::uuid else pic_id end,
    problem=case when p_patch ? 'problem' then nullif(trim(p_patch->>'problem'),'') else problem end,
    result=case when p_patch ? 'result' then nullif(trim(p_patch->>'result'),'') else result end
   where id=p_id and school_id=p_school;
  when 'meeting' then
   if not exists(select 1 from public.sc_meetings where id=p_id and school_id=p_school and (public.sc_manager(p_school) or created_by=auth.uid())) then raise exception 'Akses ditolak'; end if;
   update public.sc_meetings set
    title=coalesce(nullif(trim(p_patch->>'title'),''),title),
    held_at=coalesce(nullif(p_patch->>'held_at','')::timestamptz,held_at),
    minutes=case when p_patch ? 'minutes' then coalesce(p_patch->>'minutes','') else minutes end,
    decisions=case when p_patch ? 'decisions' then coalesce(p_patch->>'decisions','') else decisions end
   where id=p_id and school_id=p_school;
  when 'calendar' then
   if not exists(select 1 from public.sc_calendar_events where id=p_id and school_id=p_school and (public.sc_manager(p_school) or created_by=auth.uid())) then raise exception 'Akses ditolak'; end if;
   update public.sc_calendar_events set
    title=coalesce(nullif(trim(p_patch->>'title'),''),title),
    event_date=coalesce(nullif(p_patch->>'event_date','')::date,event_date),
    category=coalesce(nullif(trim(p_patch->>'category'),''),category),
    notes=case when p_patch ? 'notes' then nullif(trim(p_patch->>'notes'),'') else notes end
   where id=p_id and school_id=p_school;
  when 'discipline_event' then
   if not exists(select 1 from public.sc_discipline_events where id=p_id and school_id=p_school and (public.sc_manager(p_school) or created_by=auth.uid())) then raise exception 'Akses ditolak'; end if;
   update public.sc_discipline_events set
    title=coalesce(nullif(trim(p_patch->>'title'),''),title),
    category=coalesce(nullif(trim(p_patch->>'category'),''),category),
    occurred_at=coalesce(nullif(p_patch->>'occurred_at','')::date,occurred_at),
    follow_up=case when p_patch ? 'follow_up' then nullif(trim(p_patch->>'follow_up'),'') else follow_up end
   where id=p_id and school_id=p_school;
  when 'discipline_followup' then
   if not exists(select 1 from public.sc_discipline_followups where id=p_id and school_id=p_school and (public.sc_manager(p_school) or created_by=auth.uid())) then raise exception 'Akses ditolak'; end if;
   update public.sc_discipline_followups set
    action_taken=coalesce(nullif(trim(p_patch->>'action_taken'),''),action_taken),
    due_on=case when p_patch ? 'due_on' then nullif(p_patch->>'due_on','')::date else due_on end
   where id=p_id and school_id=p_school;
  when 'bk_record' then
   if not exists(select 1 from public.sc_bk_records where id=p_id and school_id=p_school and counselor_id=auth.uid()) then raise exception 'Akses BK ditolak'; end if;
   update public.sc_bk_records set
    title=coalesce(nullif(trim(p_patch->>'title'),''),title),
    notes=case when p_patch ? 'notes' then nullif(trim(p_patch->>'notes'),'') else notes end,
    follow_up_on=case when p_patch ? 'follow_up_on' then nullif(p_patch->>'follow_up_on','')::date else follow_up_on end
   where id=p_id and school_id=p_school;
  when 'journal' then
   if not exists(select 1 from public.sc_teacher_journals where id=p_id and school_id=p_school and (public.sc_manager(p_school) or teacher_id=auth.uid())) then raise exception 'Akses ditolak'; end if;
   update public.sc_teacher_journals set
    subject=coalesce(nullif(trim(p_patch->>'subject'),''),subject),
    topic=coalesce(nullif(trim(p_patch->>'topic'),''),topic),
    lesson_date=coalesce(nullif(p_patch->>'lesson_date','')::date,lesson_date),
    notes=case when p_patch ? 'notes' then nullif(trim(p_patch->>'notes'),'') else notes end
   where id=p_id and school_id=p_school;
  when 'finance_account' then
   if r not in ('owner','principal','treasurer') then raise exception 'Akses keuangan ditolak'; end if;
   update public.sc_finance_accounts set
    name=coalesce(nullif(trim(p_patch->>'name'),''),name),
    kind=coalesce(nullif(trim(p_patch->>'kind'),''),kind),
    opening_balance=coalesce(nullif(p_patch->>'opening_balance','')::numeric,opening_balance)
   where id=p_id and school_id=p_school;
  when 'budget' then
   if r not in ('owner','principal','treasurer') then raise exception 'Akses keuangan ditolak'; end if;
   update public.sc_budget_lines set
    category=coalesce(nullif(trim(p_patch->>'category'),''),category),
    amount=coalesce(nullif(p_patch->>'amount','')::numeric,amount),
    notes=case when p_patch ? 'notes' then nullif(trim(p_patch->>'notes'),'') else notes end
   where id=p_id and school_id=p_school;
  when 'bill' then
   if r not in ('owner','principal','treasurer') then raise exception 'Akses keuangan ditolak'; end if;
   update public.sc_student_bills set
    title=coalesce(nullif(trim(p_patch->>'title'),''),title),
    amount_due=coalesce(nullif(p_patch->>'amount_due','')::numeric,amount_due),
    due_on=coalesce(nullif(p_patch->>'due_on','')::date,due_on)
   where id=p_id and school_id=p_school;
  else raise exception 'Jenis data tidak didukung';
 end case;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'record.updated',p_id::text,jsonb_build_object('entity',p_entity));
end $$;

create or replace function public.sc_delete_operational(p_school uuid,p_entity text,p_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r text:=public.sc_role(p_school);
begin
 if not public.sc_write_active(p_school) then raise exception 'Langganan tidak aktif'; end if;
 begin
 case p_entity
  when 'program' then
   if not public.sc_manager(p_school) then raise exception 'Akses ditolak'; end if;
   delete from public.sc_programs where id=p_id and school_id=p_school;
  when 'task' then
   delete from public.sc_program_tasks where id=p_id and school_id=p_school and (public.sc_manager(p_school) or created_by=auth.uid() or pic_id=auth.uid());
  when 'meeting' then
   delete from public.sc_meetings where id=p_id and school_id=p_school and (public.sc_manager(p_school) or created_by=auth.uid());
  when 'calendar' then
   delete from public.sc_calendar_events where id=p_id and school_id=p_school and (public.sc_manager(p_school) or created_by=auth.uid());
  when 'discipline_event' then
   delete from public.sc_discipline_events where id=p_id and school_id=p_school and (public.sc_manager(p_school) or created_by=auth.uid());
  when 'discipline_followup' then
   delete from public.sc_discipline_followups where id=p_id and school_id=p_school and (public.sc_manager(p_school) or created_by=auth.uid());
  when 'bk_record' then
   delete from public.sc_bk_records where id=p_id and school_id=p_school and counselor_id=auth.uid();
  when 'bk_case' then
   delete from public.sc_bk_cases where id=p_id and school_id=p_school and assigned_counselor=auth.uid();
  when 'grade' then
   delete from public.sc_grades where id=p_id and school_id=p_school and (public.sc_manager(p_school) or recorded_by=auth.uid());
  when 'journal' then
   delete from public.sc_teacher_journals where id=p_id and school_id=p_school and (public.sc_manager(p_school) or teacher_id=auth.uid());
  when 'finance_account' then
   if r not in ('owner','principal','treasurer') then raise exception 'Akses keuangan ditolak'; end if;
   delete from public.sc_finance_accounts where id=p_id and school_id=p_school;
  when 'budget' then
   if r not in ('owner','principal','treasurer') then raise exception 'Akses keuangan ditolak'; end if;
   delete from public.sc_budget_lines where id=p_id and school_id=p_school;
  when 'bill' then
   if r not in ('owner','principal','treasurer') then raise exception 'Akses keuangan ditolak'; end if;
   if exists(select 1 from public.sc_bill_payments where bill_id=p_id and school_id=p_school) then raise exception 'Tagihan yang sudah dibayar tidak boleh dihapus'; end if;
   delete from public.sc_student_bills where id=p_id and school_id=p_school;
  else raise exception 'Jenis data tidak didukung';
 end case;
 exception when foreign_key_violation then raise exception 'Data masih dipakai oleh riwayat lain dan tidak dapat dihapus.';
 end;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'record.deleted',p_id::text,jsonb_build_object('entity',p_entity));
end $$;

create or replace function public.sc_reverse_finance_transaction(p_school uuid,p_tx uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare r text:=public.sc_role(p_school); t public.sc_finance_transactions%rowtype; v_id uuid;
begin
 if r not in ('owner','principal','treasurer') or not public.sc_write_active(p_school) then raise exception 'Akses keuangan ditolak'; end if;
 if length(trim(p_reason))<3 then raise exception 'Alasan koreksi wajib diisi'; end if;
 select * into t from public.sc_finance_transactions where id=p_tx and school_id=p_school;
 if not found then raise exception 'Transaksi tidak ditemukan'; end if;
 insert into public.sc_finance_transactions(school_id,activity_id,occurred_at,kind,category,amount,description,created_by,account_id)
 values(p_school,t.activity_id,current_date,case when t.kind='income' then 'expense' else 'income' end,'Koreksi · '||t.category,t.amount,'Pembalik transaksi '||p_tx::text||'. Alasan: '||trim(p_reason),auth.uid(),t.account_id)
 returning id into v_id;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'finance.transaction.reversed',p_tx::text,jsonb_build_object('reversal_id',v_id,'reason',trim(p_reason)));
 return v_id;
end $$;

create or replace function public.sc_import_finance_transactions(p_school uuid,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb; added int:=0; skipped int:=0; acc uuid; k text;
begin
 if public.sc_role(p_school) not in ('owner','principal','treasurer') or not public.sc_write_active(p_school) then raise exception 'Akses impor keuangan ditolak'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then raise exception 'Maksimal 500 baris'; end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  begin
   select id into acc from public.sc_finance_accounts where school_id=p_school and lower(name)=lower(trim(r->>'account_name')) limit 1;
   k:=lower(trim(r->>'kind'));
   if acc is null or k not in ('income','expense') or coalesce((r->>'amount')::numeric,0)<=0 then skipped:=skipped+1; continue; end if;
   insert into public.sc_finance_transactions(school_id,occurred_at,kind,category,amount,description,created_by,account_id)
   values(p_school,(r->>'occurred_at')::date,k,trim(r->>'category'),(r->>'amount')::numeric,nullif(trim(coalesce(r->>'description','')),''),auth.uid(),acc);
   added:=added+1;
  exception when others then skipped:=skipped+1;
  end;
 end loop;
 return jsonb_build_object('added',added,'skipped',skipped);
end $$;

revoke all on function public.sc_update_operational(uuid,text,uuid,jsonb),public.sc_delete_operational(uuid,text,uuid),public.sc_reverse_finance_transaction(uuid,uuid,text),public.sc_import_finance_transactions(uuid,jsonb) from public,anon;
grant execute on function public.sc_update_operational(uuid,text,uuid,jsonb),public.sc_delete_operational(uuid,text,uuid),public.sc_reverse_finance_transaction(uuid,uuid,text),public.sc_import_finance_transactions(uuid,jsonb) to authenticated;
