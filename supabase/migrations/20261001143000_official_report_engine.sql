-- Official report engine, school document identity, archive, numbering, and BK aggregate.
alter table public.sc_schools
  add column if not exists principal_nip text,
  add column if not exists signature_url text,
  add column if not exists stamp_url text,
  add column if not exists report_settings jsonb not null default '{}'::jsonb;

create table if not exists public.sc_document_sequences (
  school_id uuid not null references public.sc_schools(id) on delete cascade,
  prefix text not null,
  document_year integer not null,
  last_number integer not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now(),
  primary key (school_id,prefix,document_year)
);
alter table public.sc_document_sequences enable row level security;
revoke all on table public.sc_document_sequences from anon, authenticated;

create table if not exists public.sc_report_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.sc_schools(id) on delete cascade,
  module_key text not null,
  document_type text not null,
  document_number text not null,
  title text not null,
  status text not null default 'issued' check (status in ('draft','review','approved','issued','archived')),
  period_start date,
  period_end date,
  content_snapshot jsonb not null default '{}'::jsonb,
  issued_by uuid not null references auth.users(id),
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (school_id,document_number)
);
create index if not exists sc_report_documents_school_issued_idx
  on public.sc_report_documents(school_id,issued_at desc);
create index if not exists sc_report_documents_module_idx
  on public.sc_report_documents(school_id,module_key,document_type);

alter table public.sc_report_documents enable row level security;
revoke all on table public.sc_report_documents from anon;
grant select,update,delete on table public.sc_report_documents to authenticated;

drop policy if exists sc_report_documents_select on public.sc_report_documents;
create policy sc_report_documents_select
on public.sc_report_documents
for select to authenticated
using (
  public.sc_member(school_id)
  and case
    when module_key='gajian' then public.sc_role(school_id) in ('owner','principal','vice_principal','hr','treasurer')
    when module_key='sikas' then public.sc_role(school_id) in ('owner','principal','treasurer')
    when module_key='bk' then public.sc_role(school_id) in ('owner','principal','counselor')
    when module_key='buku_kerja' then public.sc_role(school_id) in ('owner','principal','vice_principal','teacher')
    when module_key='disiplin' then public.sc_role(school_id) in ('owner','principal','vice_principal','teacher','counselor')
    when module_key='kepsek_ai' then public.sc_role(school_id) in ('owner','principal','vice_principal')
    else public.sc_role(school_id) <> 'viewer'
  end
);

drop policy if exists sc_report_documents_manage on public.sc_report_documents;
create policy sc_report_documents_manage
on public.sc_report_documents
for update to authenticated
using (public.sc_manager(school_id))
with check (public.sc_manager(school_id));

drop policy if exists sc_report_documents_delete on public.sc_report_documents;
create policy sc_report_documents_delete
on public.sc_report_documents
for delete to authenticated
using (public.sc_manager(school_id));

create or replace function public.sc_issue_report_document(
  p_school uuid,
  p_module text,
  p_type text,
  p_title text,
  p_snapshot jsonb,
  p_prefix text default 'LAP',
  p_period_start date default null,
  p_period_end date default null
)
returns public.sc_report_documents
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prefix text;
  v_year integer;
  v_next integer;
  v_number text;
  v_row public.sc_report_documents;
  v_role text;
begin
  if auth.uid() is null or not public.sc_write_active(p_school) then
    raise exception 'Akses penerbitan laporan tidak diizinkan.';
  end if;

  v_role := public.sc_role(p_school);
  if p_module='gajian' and v_role not in ('owner','principal','vice_principal','hr','treasurer') then raise exception 'Akses laporan payroll/SDM ditolak'; end if;
  if p_module='sikas' and v_role not in ('owner','principal','treasurer') then raise exception 'Akses laporan keuangan ditolak'; end if;
  if p_module='bk' and v_role not in ('owner','principal','counselor') then raise exception 'Akses laporan BK ditolak'; end if;
  if p_module='buku_kerja' and v_role not in ('owner','principal','vice_principal','teacher') then raise exception 'Akses laporan pembelajaran ditolak'; end if;
  if p_module='disiplin' and v_role not in ('owner','principal','vice_principal','teacher','counselor') then raise exception 'Akses laporan disiplin ditolak'; end if;
  if p_module='kepsek_ai' and v_role not in ('owner','principal','vice_principal') then raise exception 'Akses laporan manajemen ditolak'; end if;

  v_prefix := upper(regexp_replace(coalesce(nullif(trim(p_prefix),''),'LAP'),'[^A-Z0-9]+','','g'));
  if length(v_prefix) > 12 then v_prefix := left(v_prefix,12); end if;
  if v_prefix = '' then v_prefix := 'LAP'; end if;
  v_year := extract(year from current_date)::integer;

  insert into public.sc_document_sequences(school_id,prefix,document_year,last_number,updated_at)
  values(p_school,v_prefix,v_year,1,now())
  on conflict (school_id,prefix,document_year)
  do update set last_number=public.sc_document_sequences.last_number+1,updated_at=now()
  returning last_number into v_next;

  v_number := v_prefix || '/' || lpad(v_next::text,4,'0') || '/' || v_year::text;

  insert into public.sc_report_documents(
    school_id,module_key,document_type,document_number,title,status,
    period_start,period_end,content_snapshot,issued_by
  ) values (
    p_school,left(coalesce(p_module,'report'),60),left(coalesce(p_type,'report'),80),
    v_number,left(coalesce(p_title,'Laporan'),180),'issued',
    p_period_start,p_period_end,coalesce(p_snapshot,'{}'::jsonb),auth.uid()
  )
  returning * into v_row;

  return v_row;
end
$$;
revoke all on function public.sc_issue_report_document(uuid,text,text,text,jsonb,text,date,date) from public, anon;
grant execute on function public.sc_issue_report_document(uuid,text,text,text,jsonb,text,date,date) to authenticated;

create or replace function public.sc_update_report_settings(p_school uuid,p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_settings jsonb;
begin
  if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak'; end if;
  update public.sc_schools
  set report_settings=coalesce(report_settings,'{}'::jsonb)||coalesce(p_patch,'{}'::jsonb)
  where id=p_school
  returning report_settings into v_settings;
  insert into public.sc_audit_log(school_id,actor_id,action)
  values(p_school,auth.uid(),'school.report_settings.updated');
  return v_settings;
end
$$;
revoke all on function public.sc_update_report_settings(uuid,jsonb) from public, anon;
grant execute on function public.sc_update_report_settings(uuid,jsonb) to authenticated;

create or replace function public.sc_edit_school_details(p_school uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak'; end if;
  if length(trim(coalesce(p_payload->>'name','')))<3 then raise exception 'Nama sekolah tidak valid'; end if;
  update public.sc_schools set
    name=trim(p_payload->>'name'),
    npsn=nullif(trim(coalesce(p_payload->>'npsn','')),''),
    address=nullif(trim(coalesce(p_payload->>'address','')),''),
    academic_year=coalesce(nullif(trim(p_payload->>'academic_year'),''),academic_year),
    timezone=coalesce(nullif(trim(p_payload->>'timezone'),''),timezone),
    school_type=nullif(trim(coalesce(p_payload->>'school_type','')),''),
    education_level=nullif(trim(coalesce(p_payload->>'education_level','')),''),
    accreditation=nullif(trim(coalesce(p_payload->>'accreditation','')),''),
    principal_name=nullif(trim(coalesce(p_payload->>'principal_name','')),''),
    principal_nip=nullif(trim(coalesce(p_payload->>'principal_nip','')),''),
    phone=nullif(trim(coalesce(p_payload->>'phone','')),''),
    email=nullif(trim(coalesce(p_payload->>'email','')),''),
    website=nullif(trim(coalesce(p_payload->>'website','')),''),
    province=nullif(trim(coalesce(p_payload->>'province','')),''),
    city=nullif(trim(coalesce(p_payload->>'city','')),''),
    district=nullif(trim(coalesce(p_payload->>'district','')),''),
    village=nullif(trim(coalesce(p_payload->>'village','')),''),
    postal_code=nullif(trim(coalesce(p_payload->>'postal_code','')),''),
    semester=coalesce(nullif(trim(p_payload->>'semester'),''),semester),
    motto=nullif(trim(coalesce(p_payload->>'motto','')),''),
    logo_url=nullif(trim(coalesce(p_payload->>'logo_url','')),''),
    signature_url=nullif(trim(coalesce(p_payload->>'signature_url','')),''),
    stamp_url=nullif(trim(coalesce(p_payload->>'stamp_url','')),''),
    report_settings=coalesce(p_payload->'report_settings',report_settings)
  where id=p_school;

  insert into public.sc_audit_log(school_id,actor_id,action)
  values(p_school,auth.uid(),'school.profile.updated');
end
$$;
revoke all on function public.sc_edit_school_details(uuid,jsonb) from public, anon;
grant execute on function public.sc_edit_school_details(uuid,jsonb) to authenticated;

create or replace function public.sc_bk_aggregate(p_school uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_students integer;
  v_total integer;
  v_active integer;
  v_closed integer;
  v_services integer;
  v_due integer;
  v_domains jsonb;
  v_kinds jsonb;
begin
  if not public.sc_member(p_school) or (not public.sc_manager(p_school) and public.sc_role(p_school)<>'counselor') then raise exception 'Akses ditolak'; end if;

  select count(*) into v_students
  from public.sc_students
  where school_id=p_school and status='active' and deleted_at is null;

  select count(*),
         count(*) filter(where status<>'closed'),
         count(*) filter(where status='closed'),
         count(*) filter(where follow_up_date is not null and follow_up_date<=current_date and status<>'closed')
  into v_total,v_active,v_closed,v_due
  from public.sc_bk_cases
  where school_id=p_school;

  select count(*) into v_services
  from public.sc_bk_records
  where school_id=p_school;

  select coalesce(jsonb_object_agg(domain,cnt),'{}'::jsonb) into v_domains
  from (
    select coalesce(nullif(domain,''),'Lainnya') domain,count(*) cnt
    from public.sc_bk_records
    where school_id=p_school
    group by 1
  ) s;

  select coalesce(jsonb_object_agg(kind,cnt),'{}'::jsonb) into v_kinds
  from (
    select coalesce(nullif(kind,''),'lainnya') kind,count(*) cnt
    from public.sc_bk_records
    where school_id=p_school
    group by 1
  ) s;

  return jsonb_build_object(
    'students_active',v_students,
    'total_cases',v_total,
    'active_cases',v_active,
    'closed_cases',v_closed,
    'services_total',v_services,
    'follow_up_due',v_due,
    'domains',v_domains,
    'kinds',v_kinds
  );
end
$$;
revoke all on function public.sc_bk_aggregate(uuid) from public, anon;
grant execute on function public.sc_bk_aggregate(uuid) to authenticated;
