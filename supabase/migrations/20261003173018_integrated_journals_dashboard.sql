-- Operational journals are shared with managers only for review; never store counseling secrets here.
create table public.sc_work_journals(
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.sc_schools(id) on delete cascade,
 author_id uuid not null references auth.users(id), author_role text not null,
 kind text not null check(kind in('daily','student')), journal_date date not null,
 title text not null check(length(btrim(title)) between 3 and 180), activity text not null check(length(btrim(activity)) between 5 and 6000),
 result text not null default '' check(length(result)<=4000), reflection text not null default '' check(length(reflection)<=4000), follow_up text not null default '' check(length(follow_up)<=4000),
 class_id uuid references public.sc_classes(id), student_id uuid references public.sc_students(id),
 event_id uuid references public.sc_calendar_events(id), task_id uuid references public.sc_program_tasks(id),
 status text not null default 'draft' check(status in('draft','submitted','revision','reviewed')),
 submitted_at timestamptz, reviewed_by uuid references auth.users(id), reviewed_at timestamptz, review_note text not null default '',
 archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((kind='daily' and student_id is null) or (kind='student' and student_id is not null and class_id is not null))
);
create index sc_work_journals_period on public.sc_work_journals(school_id,journal_date desc,id);
create index sc_work_journals_author on public.sc_work_journals(school_id,author_id,journal_date);
alter table public.sc_work_journals enable row level security;
revoke all on public.sc_work_journals from anon,authenticated;
grant select on public.sc_work_journals to authenticated;
create policy sc_work_journals_read on public.sc_work_journals for select to authenticated using(public.sc_member(school_id) and (author_id=(select auth.uid()) or public.sc_manager(school_id)));
create trigger sc_realtime_change after insert or update or delete on public.sc_work_journals for each row execute function public.sc_emit_school_change();

-- Mutations deliberately use one guarded function; callers have no direct table write grants.
create function public.sc_save_work_journal(p_school uuid,p_id uuid,p_payload jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.sc_work_journals; v_id uuid; v_role text:=public.sc_role(p_school); v_kind text:=p_payload->>'kind'; v_date date; c uuid; s uuid; e uuid; t uuid;
begin
 if auth.uid() is null or not coalesce(public.sc_write_active(p_school),false) or v_role is null or v_role='viewer' then raise exception 'Akses jurnal ditolak' using errcode='42501';end if;
 if p_id is not null then select * into r from public.sc_work_journals where id=p_id and school_id=p_school for update;
  if not found or r.author_id<>auth.uid() or r.archived_at is not null or r.status not in('draft','revision') then raise exception 'Hanya penulis dapat mengedit draf atau jurnal yang perlu revisi';end if;
 end if;
 if v_kind not in('daily','student') or v_kind is null then raise exception 'Jenis jurnal tidak valid';end if;
 v_date:=(p_payload->>'journal_date')::date;
 if v_date is null or v_date>(now() at time zone 'Asia/Jakarta')::date or v_date<date '2000-01-01' then raise exception 'Tanggal jurnal tidak valid atau belum berlangsung';end if;
 if length(btrim(coalesce(p_payload->>'title',''))) not between 3 and 180 or length(btrim(coalesce(p_payload->>'activity',''))) not between 5 and 6000 or greatest(length(coalesce(p_payload->>'result','')),length(coalesce(p_payload->>'reflection','')),length(coalesce(p_payload->>'follow_up','')))>4000 then raise exception 'Judul, kegiatan, hasil, refleksi atau tindak lanjut tidak valid';end if;
 c:=nullif(p_payload->>'class_id','')::uuid;s:=nullif(p_payload->>'student_id','')::uuid;e:=nullif(p_payload->>'event_id','')::uuid;t:=nullif(p_payload->>'task_id','')::uuid;
 if c is not null and not exists(select 1 from public.sc_classes where id=c and school_id=p_school) then raise exception 'Kelas bukan milik sekolah';end if;
 if c is not null and v_role='teacher' and not coalesce(public.sc_teaches_class(p_school,c),false) then raise exception 'Kelas belum ditugaskan kepada guru';end if;
 if v_kind='student' then
  if v_role not in('owner','principal','vice_principal','teacher','counselor') then raise exception 'Jurnal siswa khusus guru dan manajemen';end if;
  if s is null or c is null or not exists(select 1 from public.sc_students where id=s and school_id=p_school and class_id=c) then raise exception 'Pilih siswa dari kelas sekolah yang sesuai';end if;
 elsif s is not null then raise exception 'Jurnal harian tidak memakai siswa';end if;
 if e is not null and not exists(select 1 from public.sc_calendar_events where id=e and school_id=p_school and (scope='school' or owner_user_id=auth.uid() or public.sc_manager(p_school))) then raise exception 'Agenda tidak tersedia';end if;
 if t is not null and not exists(select 1 from public.sc_program_tasks where id=t and school_id=p_school and archived_at is null) then raise exception 'Tugas tidak tersedia';end if;
 if p_id is null then
  insert into public.sc_work_journals(school_id,author_id,author_role,kind,journal_date,title,activity,result,reflection,follow_up,class_id,student_id,event_id,task_id)
  values(p_school,auth.uid(),v_role,v_kind,v_date,btrim(p_payload->>'title'),btrim(p_payload->>'activity'),btrim(coalesce(p_payload->>'result','')),btrim(coalesce(p_payload->>'reflection','')),btrim(coalesce(p_payload->>'follow_up','')),c,s,e,t) returning id into v_id;
 else
  update public.sc_work_journals set kind=v_kind,journal_date=v_date,title=btrim(p_payload->>'title'),activity=btrim(p_payload->>'activity'),result=btrim(coalesce(p_payload->>'result','')),reflection=btrim(coalesce(p_payload->>'reflection','')),follow_up=btrim(coalesce(p_payload->>'follow_up','')),class_id=c,student_id=s,event_id=e,task_id=t,updated_at=now() where id=p_id returning id into v_id;
 end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id) values(p_school,auth.uid(),case when p_id is null then 'journal.created' else 'journal.updated' end,v_id::text);
 return v_id;
end $$;
create function public.sc_work_journal_action(p_school uuid,p_id uuid,p_action text,p_note text default '') returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.sc_work_journals; own boolean; manager boolean:=coalesce(public.sc_manager(p_school),false);
begin
 if auth.uid() is null or not coalesce(public.sc_write_active(p_school),false) then raise exception 'Akses jurnal ditolak' using errcode='42501';end if;
 select * into r from public.sc_work_journals where id=p_id and school_id=p_school for update;
 if not found then raise exception 'Jurnal tidak ditemukan';end if;own:=r.author_id=auth.uid();
 if not own and not manager then raise exception 'Jurnal bukan milik Anda' using errcode='42501';end if;
 if length(p_note)>4000 then raise exception 'Catatan maksimal 4000 karakter';end if;
 if p_action='submit' then
  if not own or r.status not in('draft','revision') or r.archived_at is not null then raise exception 'Hanya draf aktif penulis dapat dikirim';end if;
  update public.sc_work_journals set status='submitted',submitted_at=now(),updated_at=now() where id=p_id;
 elsif p_action in('review','revision') then
  if not manager or r.author_id=auth.uid() or r.status<>'submitted' or r.archived_at is not null then raise exception 'Jurnal menunggu review oleh pengelola lain';end if;
  if length(btrim(coalesce(p_note,'')))<5 then raise exception 'Catatan review minimal 5 karakter';end if;
  update public.sc_work_journals set status=case when p_action='review' then 'reviewed' else 'revision' end,reviewed_by=auth.uid(),reviewed_at=now(),review_note=btrim(p_note),updated_at=now() where id=p_id;
 elsif p_action='withdraw' then
  if not own or r.status<>'submitted' or r.archived_at is not null then raise exception 'Hanya kiriman yang belum direview dapat ditarik';end if;
  update public.sc_work_journals set status='draft',updated_at=now() where id=p_id;
 elsif p_action='archive' then
  if r.archived_at is not null then raise exception 'Jurnal sudah diarsipkan';end if;
  update public.sc_work_journals set archived_at=now(),updated_at=now() where id=p_id;
 elsif p_action='restore' then
  if r.archived_at is null then raise exception 'Jurnal belum diarsipkan';end if;
  update public.sc_work_journals set archived_at=null,updated_at=now() where id=p_id;
 elsif p_action='delete' then
  if r.archived_at is null or (r.status in('submitted','reviewed') and not manager) then raise exception 'Arsipkan dahulu; laporan dikirim/direview hanya dapat dihapus pengelola';end if;
  if length(btrim(coalesce(p_note,'')))<5 then raise exception 'Alasan hapus permanen minimal 5 karakter';end if;
  delete from public.sc_work_journals where id=p_id;
 else raise exception 'Tindakan jurnal tidak valid';end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id) values(p_school,auth.uid(),'journal.'||p_action,p_id::text);
end $$;
revoke all on function public.sc_save_work_journal(uuid,uuid,jsonb),public.sc_work_journal_action(uuid,uuid,text,text) from public,anon;
grant execute on function public.sc_save_work_journal(uuid,uuid,jsonb),public.sc_work_journal_action(uuid,uuid,text,text) to authenticated;

-- Aggregate on the database, not the first 1,000 browser rows. Security invoker preserves source RLS.
create function public.sc_dashboard_analytics(p_school uuid,p_start date,p_end date,p_class uuid default null) returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare v_role text:=public.sc_role(p_school); manager boolean:=coalesce(public.sc_manager(p_school),false); result jsonb;
begin
 if auth.uid() is null or v_role is null then raise exception 'Akses dashboard ditolak' using errcode='42501';end if;
 if p_start is null or p_end is null or p_start>p_end or p_end-p_start>366 then raise exception 'Periode grafik maksimal 367 hari';end if;
 if p_class is not null and not exists(select 1 from public.sc_classes where id=p_class and school_id=p_school and (manager or v_role<>'teacher' or public.sc_teaches_class(p_school,id))) then raise exception 'Kelas tidak tersedia';end if;
 with allowed_classes as(select id from public.sc_classes where school_id=p_school and (p_class is null or id=p_class) and (manager or v_role<>'teacher' or public.sc_teaches_class(p_school,id))),
 att as(select attendance_date as "day",count(*) filter(where mark='present') present,count(*) filter(where mark='sick') sick,count(*) filter(where mark='permission') as "leave",count(*) filter(where mark='absent') absent,count(*) total from public.sc_student_attendance where school_id=p_school and class_id in(select id from allowed_classes) and attendance_date between p_start and p_end and (manager or v_role='teacher') group by attendance_date),
 work_att as(select duty_date as "day",count(*) filter(where status in('present','late')) present,count(*) filter(where status='late') late,count(*) total from public.sc_attendance where school_id=p_school and duty_date between p_start and p_end group by duty_date),
 cash as(select occurred_at as "day",coalesce(sum(amount) filter(where kind='income'),0) income,coalesce(sum(amount) filter(where kind='expense'),0) expense from public.sc_finance_transactions where school_id=p_school and occurred_at between p_start and p_end and coalesce(status,'posted')<>'void' group by occurred_at),
 prog as(select status,count(*) count from public.sc_program_tasks where school_id=p_school and archived_at is null and (created_at at time zone 'Asia/Jakarta')::date<=p_end and (status<>'done' or (created_at at time zone 'Asia/Jakarta')::date>=p_start) group by status),
 grade as(select subject,round(avg(score/nullif(max_score,0)*100),1) average,count(*) count from public.sc_grades where school_id=p_school and class_id in(select id from allowed_classes) and assessment_date between p_start and p_end and max_score>0 and (manager or v_role='teacher') group by subject),
 journal as(select author_id user_id,author_role role,count(*) filter(where kind='daily') daily,count(*) filter(where kind='student') student,0::bigint teaching,count(distinct journal_date) days from public.sc_work_journals where school_id=p_school and journal_date between p_start and p_end and archived_at is null and status in('submitted','reviewed') and (p_class is null or class_id=p_class) group by author_id,author_role),
 teaching as(select teacher_id user_id,'teacher'::text role,0::bigint daily,0::bigint student,count(*) teaching,count(distinct lesson_date) days from public.sc_teacher_journals where school_id=p_school and lesson_date between p_start and p_end and (p_class is null or class_id=p_class) group by teacher_id),
 activity_days as(select author_id user_id,journal_date as "day" from public.sc_work_journals where school_id=p_school and journal_date between p_start and p_end and archived_at is null and status in('submitted','reviewed') and (p_class is null or class_id=p_class) union select teacher_id user_id,lesson_date as "day" from public.sc_teacher_journals where school_id=p_school and lesson_date between p_start and p_end and (p_class is null or class_id=p_class)),
 combined as(select user_id,max(role) role,sum(daily) daily,sum(student) student,sum(teaching) teaching,(select count(*) from activity_days ad where ad.user_id=j.user_id) days from (select * from journal union all select * from teaching) j group by user_id),
 journal_days as(select journal_date as "day",count(*) filter(where kind='daily') daily,count(*) filter(where kind='student') student,0::bigint teaching from public.sc_work_journals where school_id=p_school and journal_date between p_start and p_end and archived_at is null and status in('submitted','reviewed') and (p_class is null or class_id=p_class) group by journal_date union all select lesson_date as "day",0::bigint daily,0::bigint student,count(*) teaching from public.sc_teacher_journals where school_id=p_school and lesson_date between p_start and p_end and (p_class is null or class_id=p_class) group by lesson_date),
 journal_trend as(select "day",sum(daily) daily,sum(student) student,sum(teaching) teaching from journal_days group by "day")
 select jsonb_build_object('period',jsonb_build_object('start',p_start,'end',p_end),'generated_at',now(),'scope',case when manager then 'Sekolah sesuai akses manajemen' when v_role='teacher' then 'Kelas penugasan dan aktivitas pribadi' else 'Data sesuai hak akses' end,
 'students',(select count(*) from public.sc_students where school_id=p_school and status='active' and class_id in(select id from allowed_classes)),
 'classes',(select count(*) from allowed_classes),'staff',(select count(*) from public.sc_staff where school_id=p_school),
 'student',coalesce((select jsonb_agg(to_jsonb(a) order by "day") from att a),'[]'),
 'attendance',coalesce((select jsonb_agg(to_jsonb(a) order by "day") from work_att a),'[]'),
 'finance',coalesce((select jsonb_agg(to_jsonb(a) order by "day") from cash a),'[]'),
 'program',coalesce((select jsonb_agg(to_jsonb(a) order by status) from prog a),'[]'),
 'grades',coalesce((select jsonb_agg(to_jsonb(a) order by subject) from grade a),'[]'),
 'journals',coalesce((select jsonb_agg(to_jsonb(a) order by name) from (select c.*,coalesce((select name from public.sc_staff where school_id=p_school and user_id=c.user_id order by created_at limit 1),'Pengguna sekolah') name from combined c) a),'[]'),
 'journal_trend',coalesce((select jsonb_agg(to_jsonb(a) order by "day") from journal_trend a),'[]')) into result;
 return result;
end $$;
revoke all on function public.sc_dashboard_analytics(uuid,date,date,uuid) from public,anon;
grant execute on function public.sc_dashboard_analytics(uuid,date,date,uuid) to authenticated;

create function public.sc_ai_school_context(p_school uuid,p_start date,p_end date) returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if auth.uid() is null or not coalesce(public.sc_member(p_school),false) or public.sc_role(p_school) not in('owner','principal','vice_principal','teacher') then raise exception 'Akses konteks AI ditolak' using errcode='42501';end if;
 result:=public.sc_dashboard_analytics(p_school,p_start,p_end,null);
 -- Finance has its own workflow and is not injected into teaching/principal prompts. No BK, salaries, names of students or private chats.
 result:=result-'finance';
 return jsonb_build_object('source','Data operasional School Control yang diizinkan RLS','summary',result,'limitations',jsonb_build_array('Jumlah presensi adalah catatan yang tersimpan; siswa tanpa catatan bukan otomatis alpa.','Jumlah jurnal bukan ukuran kualitas atau pemeringkatan guru.','Nilai memakai score / max_score; perbandingan antar mapel atau asesmen memerlukan konteks setara.','Draft dan arsip jurnal operasional tidak masuk agregat.'));
end $$;
revoke all on function public.sc_ai_school_context(uuid,date,date) from public,anon;
grant execute on function public.sc_ai_school_context(uuid,date,date) to authenticated;
