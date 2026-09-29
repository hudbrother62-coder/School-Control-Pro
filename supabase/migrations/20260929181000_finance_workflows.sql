-- SIKAS workflows: accounts, cashbook, budgets, student bills and atomic receipts.
create table if not exists public.sc_student_bills(
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 student_id uuid not null references public.sc_students(id),
 title text not null,
 amount_due numeric(16,2) not null check(amount_due>0),
 due_on date not null,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.sc_bill_payments(
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 bill_id uuid not null references public.sc_student_bills(id),
 transaction_id uuid not null unique references public.sc_finance_transactions(id),
 receipt_no text not null,
 amount numeric(16,2) not null check(amount>0),
 paid_at timestamptz not null default now(),
 recorded_by uuid not null references auth.users(id),
 unique(school_id,receipt_no)
);
create index if not exists sc_bills_school_due on public.sc_student_bills(school_id,due_on);
create index if not exists sc_payments_bill on public.sc_bill_payments(bill_id);
alter table public.sc_student_bills enable row level security;
alter table public.sc_bill_payments enable row level security;
revoke all on public.sc_student_bills,public.sc_bill_payments from anon,authenticated;
create policy sc_bills_r on public.sc_student_bills for select to authenticated using(public.sc_role(school_id) in ('owner','principal','treasurer'));
create policy sc_bills_w on public.sc_student_bills for insert to authenticated with check(public.sc_write_active(school_id) and public.sc_role(school_id) in ('owner','principal','treasurer') and created_by=auth.uid() and exists(select 1 from public.sc_students s where s.id=student_id and s.school_id=sc_student_bills.school_id));
create policy sc_bill_payment_r on public.sc_bill_payments for select to authenticated using(public.sc_role(school_id) in ('owner','principal','treasurer'));
grant select,insert on public.sc_student_bills to authenticated;
grant select on public.sc_bill_payments to authenticated;

drop policy if exists sc_finance_write on public.sc_finance_transactions;
create policy sc_finance_write on public.sc_finance_transactions for insert to authenticated
with check(public.sc_role(school_id) in ('owner','principal','treasurer') and public.sc_write_active(school_id)
 and created_by=auth.uid()
 and (account_id is null or exists(select 1 from public.sc_finance_accounts a where a.id=account_id and a.school_id=sc_finance_transactions.school_id))
 and (activity_id is null or exists(select 1 from public.sc_programs p where p.id=activity_id and p.school_id=sc_finance_transactions.school_id)));

create or replace function public.sc_record_bill_payment(p_school uuid,p_bill uuid,p_account uuid,p_amount numeric,p_receipt text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_bill public.sc_student_bills%rowtype;v_paid numeric;v_tx uuid;v_pay uuid;
begin
 if not public.sc_write_active(p_school) or public.sc_role(p_school) not in ('owner','principal','treasurer') then raise exception 'Akses ditolak';end if;
 if p_amount is null or p_amount<=0 or length(trim(p_receipt)) not between 4 and 80 then raise exception 'Pembayaran tidak valid';end if;
 select * into v_bill from public.sc_student_bills where id=p_bill and school_id=p_school for update;
 if not found then raise exception 'Tagihan tidak ditemukan';end if;
 if not exists(select 1 from public.sc_finance_accounts where id=p_account and school_id=p_school) then raise exception 'Rekening/kas tidak sesuai';end if;
 select coalesce(sum(amount),0) into v_paid from public.sc_bill_payments where bill_id=p_bill and school_id=p_school;
 if v_paid+p_amount>v_bill.amount_due then raise exception 'Nominal melebihi sisa tagihan';end if;
 if exists(select 1 from public.sc_bill_payments where school_id=p_school and receipt_no=trim(p_receipt)) then raise exception 'Nomor kuitansi sudah digunakan';end if;
 insert into public.sc_finance_transactions(school_id,account_id,occurred_at,kind,category,amount,description,created_by)
 values(p_school,p_account,(now() at time zone (select timezone from public.sc_schools where id=p_school))::date,'income','student_bill',p_amount,'Tagihan: '||v_bill.title||' / '||trim(p_receipt),auth.uid()) returning id into v_tx;
 insert into public.sc_bill_payments(school_id,bill_id,transaction_id,receipt_no,amount,recorded_by)
 values(p_school,p_bill,v_tx,trim(p_receipt),p_amount,auth.uid()) returning id into v_pay;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata) values(p_school,auth.uid(),'student_bill.paid',v_pay::text,jsonb_build_object('amount',p_amount,'bill_id',p_bill,'receipt',p_receipt));
 return v_pay;
end $$;

create or replace function public.sc_finance_summary(p_school uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_out jsonb;
begin
 if public.sc_role(p_school) not in ('owner','principal','treasurer') then raise exception 'Akses keuangan ditolak';end if;
 select jsonb_build_object(
 'income',(select coalesce(sum(amount),0) from public.sc_finance_transactions where school_id=p_school and kind='income'),
 'expense',(select coalesce(sum(amount),0) from public.sc_finance_transactions where school_id=p_school and kind='expense'),
 'opening',(select coalesce(sum(opening_balance),0) from public.sc_finance_accounts where school_id=p_school),
 'budget',(select coalesce(sum(amount),0) from public.sc_budget_lines where school_id=p_school),
 'billed',(select coalesce(sum(amount_due),0) from public.sc_student_bills where school_id=p_school),
 'paid',(select coalesce(sum(amount),0) from public.sc_bill_payments where school_id=p_school)
 ) into v_out;
 return v_out;
end $$;
revoke all on function public.sc_record_bill_payment(uuid,uuid,uuid,numeric,text),public.sc_finance_summary(uuid) from public;
grant execute on function public.sc_record_bill_payment(uuid,uuid,uuid,numeric,text),public.sc_finance_summary(uuid) to authenticated;
