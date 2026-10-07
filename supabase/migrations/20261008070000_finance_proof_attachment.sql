-- Keep payment evidence attached to its original ledger entry and receipt.
-- Only a finance team member who uploaded the private object can attach it.
create or replace function public.sc_attach_finance_proof(
 p_school uuid, p_kind text, p_record uuid, p_path text
) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_transaction uuid; v_existing text;
begin
 if auth.uid() is null or not public.sc_write_active(p_school)
  or public.sc_role(p_school) not in ('owner','principal','treasurer','finance_staff')
 then raise exception 'Akses keuangan ditolak'; end if;
 if p_kind not in ('transaction','payment') or p_path is null
  or p_path not like p_school::text||'/finance/%'
 then raise exception 'Lampiran tidak valid'; end if;
 if not exists (
  select 1 from storage.objects o
  where o.bucket_id='sc-evidence' and o.name=p_path
   and o.owner_id=auth.uid()::text
 ) then raise exception 'Bukti bukan milik pengguna atau belum diunggah'; end if;
 if p_kind='payment' then
  select transaction_id,proof_path into v_transaction,v_existing
  from public.sc_bill_payments
  where id=p_record and school_id=p_school for update;
  if not found then raise exception 'Pembayaran tidak ditemukan'; end if;
  if v_existing is not null or exists(
   select 1 from public.sc_finance_transactions
   where id=v_transaction and school_id=p_school and proof_path is not null
  ) then raise exception 'Bukti pembayaran sudah ada'; end if;
  update public.sc_bill_payments set proof_path=p_path
  where id=p_record and school_id=p_school;
  update public.sc_finance_transactions set proof_path=p_path
  where id=v_transaction and school_id=p_school and proof_path is null;
 else
  select proof_path into v_existing from public.sc_finance_transactions
  where id=p_record and school_id=p_school and status<>'void' for update;
  if not found then raise exception 'Transaksi tidak ditemukan atau telah dibatalkan'; end if;
  if v_existing is not null or exists (
   select 1 from public.sc_bill_payments
   where transaction_id=p_record and school_id=p_school and proof_path is not null
  ) then raise exception 'Bukti transaksi sudah ada'; end if;
  update public.sc_finance_transactions set proof_path=p_path
  where id=p_record and school_id=p_school;
  update public.sc_bill_payments set proof_path=p_path
  where transaction_id=p_record and school_id=p_school and proof_path is null;
 end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'finance.proof_attached',p_record::text,
  jsonb_build_object('kind',p_kind,'file_path',p_path));
end $$;
revoke all on function public.sc_attach_finance_proof(uuid,text,uuid,text) from public,anon;
grant execute on function public.sc_attach_finance_proof(uuid,text,uuid,text) to authenticated;
