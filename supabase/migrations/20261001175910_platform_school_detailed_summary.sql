CREATE OR REPLACE FUNCTION public.sc_platform_school_detail(p_school uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  result jsonb;
begin
  if not public.sc_is_platform_admin() then
    raise exception 'Akses platform ditolak' using errcode='42501';
  end if;
  if not exists(select 1 from public.sc_schools where id=p_school) then
    raise exception 'Sekolah tidak ditemukan';
  end if;

  select jsonb_build_object(
    'school', (
      select to_jsonb(x) from (
        select s.id,s.name,s.npsn,s.school_type,s.education_level,s.accreditation,
               s.address,s.province,s.city,s.district,s.village,s.postal_code,s.phone,s.email,s.website,
               s.academic_year,s.semester,s.principal_name,s.created_at,s.is_internal_test
        from public.sc_schools s where s.id=p_school
      ) x
    ),
    'subscription', (
      select coalesce(to_jsonb(x),'{}'::jsonb) from (
        select status,trial_ends_at,current_period_end,updated_at
        from public.sc_subscriptions where school_id=p_school
      ) x
    ),
    'owner', (
      select coalesce(to_jsonb(x),'{}'::jsonb) from (
        select u.email,m.role
        from public.sc_members m join auth.users u on u.id=m.user_id
        where m.school_id=p_school and m.role='owner'
        order by m.created_at limit 1
      ) x
    ),
    'roles', (
      select coalesce(jsonb_agg(jsonb_build_object('role',role,'count',n) order by role),'[]'::jsonb)
      from (select role,count(*)::int n from public.sc_members where school_id=p_school group by role) q
    ),
    'core', jsonb_build_object(
      'members',(select count(*) from public.sc_members where school_id=p_school),
      'students',(select count(*) from public.sc_students where school_id=p_school and status<>'deleted'),
      'students_active',(select count(*) from public.sc_students where school_id=p_school and status='active'),
      'students_archived',(select count(*) from public.sc_students where school_id=p_school and status='archived'),
      'classes',(select count(*) from public.sc_classes where school_id=p_school),
      'staff',(select count(*) from public.sc_staff where school_id=p_school),
      'teachers',(select count(*) from public.sc_staff where school_id=p_school and staff_type='teacher')
    ),
    'attendance', jsonb_build_object(
      'today',(select count(*) from public.sc_attendance where school_id=p_school and duty_date=(now() at time zone 'Asia/Jakarta')::date),
      'present_30d',(select count(*) from public.sc_attendance where school_id=p_school and duty_date>=((now() at time zone 'Asia/Jakarta')::date-29) and status='present'),
      'late_30d',(select count(*) from public.sc_attendance where school_id=p_school and duty_date>=((now() at time zone 'Asia/Jakarta')::date-29) and status='late'),
      'event_checkins_30d',(select count(*) from public.sc_event_attendance where school_id=p_school and check_in_at>=now()-interval '30 days')
    ),
    'academic', jsonb_build_object(
      'grades',(select count(*) from public.sc_grades where school_id=p_school),
      'journals',(select count(*) from public.sc_teacher_journals where school_id=p_school),
      'student_attendance',(select count(*) from public.sc_student_attendance where school_id=p_school),
      'ai_projects',(select count(*) from public.sc_ai_projects where school_id=p_school),
      'ai_outputs',(select count(*) from public.sc_ai_outputs where school_id=p_school)
    ),
    'student_affairs', jsonb_build_object(
      'discipline_events',(select count(*) from public.sc_discipline_events where school_id=p_school),
      'discipline_open_actions',(select count(*) from public.sc_discipline_actions where school_id=p_school and status<>'completed'),
      'bk_cases',(select count(*) from public.sc_bk_cases where school_id=p_school),
      'bk_records',(select count(*) from public.sc_bk_records where school_id=p_school)
    ),
    'programs', jsonb_build_object(
      'programs',(select count(*) from public.sc_programs where school_id=p_school),
      'tasks',(select count(*) from public.sc_program_tasks where school_id=p_school),
      'tasks_open',(select count(*) from public.sc_program_tasks where school_id=p_school and status not in ('done','completed','verified')),
      'tasks_overdue',(select count(*) from public.sc_program_tasks where school_id=p_school and status not in ('done','completed','verified') and due_at is not null and due_at<now()),
      'evidence',(select count(*) from public.sc_evidence where school_id=p_school)
    ),
    'finance', jsonb_build_object(
      'transactions',(select count(*) from public.sc_finance_transactions where school_id=p_school and status<>'void'),
      'income',(select coalesce(sum(amount),0) from public.sc_finance_transactions where school_id=p_school and status<>'void' and kind='income'),
      'expense',(select coalesce(sum(amount),0) from public.sc_finance_transactions where school_id=p_school and status<>'void' and kind='expense'),
      'student_bills',(select count(*) from public.sc_student_bills where school_id=p_school),
      'bill_payments',(select count(*) from public.sc_bill_payments where school_id=p_school)
    ),
    'hr', jsonb_build_object(
      'requests',(select count(*) from public.sc_hr_requests where school_id=p_school),
      'requests_pending',(select count(*) from public.sc_hr_requests where school_id=p_school and status='pending'),
      'payroll_records',(select count(*) from public.sc_payroll_records where school_id=p_school),
      'payroll_approved',(select count(*) from public.sc_payroll_records where school_id=p_school and status in ('approved','paid','locked')),
      'work_locations',(select count(*) from public.sc_hr_locations where school_id=p_school and active)
    ),
    'documents', jsonb_build_object(
      'documents',(select count(*) from public.sc_documents where school_id=p_school),
      'reports',(select count(*) from public.sc_report_documents where school_id=p_school),
      'imports',(select count(*) from public.sc_import_history where school_id=p_school),
      'supervisions',(select count(*) from public.sc_supervisions where school_id=p_school)
    ),
    'calendar', jsonb_build_object(
      'upcoming_31d',(select count(*) from public.sc_calendar_events where school_id=p_school and event_date between (now() at time zone 'Asia/Jakarta')::date and (now() at time zone 'Asia/Jakarta')::date+31),
      'attendance_required',(select count(*) from public.sc_calendar_events where school_id=p_school and attendance_required),
      'total',(select count(*) from public.sc_calendar_events where school_id=p_school)
    ),
    'ai', jsonb_build_object(
      'requests',(select coalesce(sum(requests),0) from public.sc_ai_usage where school_id=p_school)
    ),
    'payments', jsonb_build_object(
      'orders',(select count(*) from public.sc_payment_orders where school_id=p_school),
      'pending',(select count(*) from public.sc_payment_orders where school_id=p_school and status='pending'),
      'paid',(select count(*) from public.sc_payment_orders where school_id=p_school and status='paid'),
      'paid_amount',(select coalesce(sum(gross_amount),0) from public.sc_payment_orders where school_id=p_school and status='paid')
    ),
    'recent_activity', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.occurred_at desc),'[]'::jsonb)
      from (
        select action,target_id,occurred_at
        from public.sc_audit_log
        where school_id=p_school
        order by occurred_at desc
        limit 30
      ) x
    )
  ) into result;

  return result;
end $function$
;
revoke all on function public.sc_platform_school_detail(uuid) from public, anon, authenticated;
grant execute on function public.sc_platform_school_detail(uuid) to authenticated;
