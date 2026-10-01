revoke execute on function public.sc_pay_hr_request(uuid,uuid,text) from public, anon;
grant execute on function public.sc_pay_hr_request(uuid,uuid,text) to authenticated;

revoke execute on function public.sc_return_payroll_to_draft(uuid,text,text) from public, anon;
grant execute on function public.sc_return_payroll_to_draft(uuid,text,text) to authenticated;
