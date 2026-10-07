-- Prevent correction entries from being recorded twice or splitting student receipts from the cash ledger.
create or replace function public.sc_reverse_finance_transaction(p_school uuid,p_tx uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare r text:=public.sc_role(p_school); t public.sc_finance_transactions%rowtype; v_id uuid;
begin
 if auth.uid() is null or r not in ('owner','principal','treasurer','finance_staff')
  or not public.sc_write_active(p_school) then raise exception 'Akses keuangan ditolak'; end if;
 if p_reason is null or length(trim(p_reason))<3 then raise exception 'Alasan koreksi minimal 3 karakter'; end if;
 select * into t from public.sc_finance_transactions where id=p_tx and school_id=p_school for update;
 if not found or t.status<>'posted' then raise exception 'Transaksi tidak ditemukan atau tidak dapat dikoreksi'; end if;
 if t.category='student_bill' or exists(select 1 from public.sc_bill_payments where school_id=p_school and transaction_id=p_tx)
 then raise exception 'Transaksi tagihan siswa tidak boleh dibalik melalui kas. Gunakan prosedur koreksi pembayaran khusus.'; end if;
 if t.category like 'Koreksi · %' or exists(
  select 1 from public.sc_audit_log
  where school_id=p_school and action='finance.transaction.reversed' and target_id=p_tx::text
 ) then raise exception 'Transaksi ini telah dikoreksi atau merupakan jurnal pembalik'; end if;
 insert into public.sc_finance_transactions(school_id,activity_id,occurred_at,kind,category,amount,description,created_by,account_id,status)
 values(p_school,t.activity_id,current_date,
  case when t.kind='income' then 'expense' else 'income' end,
  'Koreksi · '||t.category,t.amount,
  'Pembalik transaksi '||p_tx::text||'. Alasan: '||trim(p_reason),auth.uid(),t.account_id,'posted')
 returning id into v_id;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'finance.transaction.reversed',p_tx::text,
  jsonb_build_object('reversal_id',v_id,'reason',trim(p_reason)));
 return v_id;
end $$;
revoke all on function public.sc_reverse_finance_transaction(uuid,uuid,text) from public,anon;
grant execute on function public.sc_reverse_finance_transaction(uuid,uuid,text) to authenticated;
