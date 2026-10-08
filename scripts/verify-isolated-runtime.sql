begin;
create temporary table qa_isolated_users(id uuid primary key,ord integer);
insert into qa_isolated_users select gen_random_uuid(),n from generate_series(1,3) n;
insert into auth.users(id,email,aud,role) select id,'qa-rollback-'||id||'@example.test','authenticated','authenticated' from qa_isolated_users;
insert into sc_schools(name,created_by,is_internal_test) select 'QA rollback isolated Sekolapro',id,true from qa_isolated_users where ord=1;
insert into sc_members(school_id,user_id,role) select s.id,s.created_by,'owner' from sc_schools s join qa_isolated_users u on u.id=s.created_by where u.ord=1;
insert into sc_subscriptions(school_id,status,trial_ends_at,current_period_end) select s.id,'active',now()+interval '30 days',now()+interval '30 days' from sc_schools s join qa_isolated_users u on u.id=s.created_by where u.ord=1;
select set_config('request.jwt.claim.sub',(select id::text from qa_isolated_users where ord=1),true);
do $$
declare sid uuid; tid uuid; src uuid; doc uuid; fsid uuid; fdoc uuid; rejected boolean;
begin
 select school_id into sid from sc_members where user_id=auth.uid() limit 1;
 insert into sc_template_library(school_id,scope,category,title,url,created_by) values(sid,'school','SOP Sekolah','QA rollback template','https://example.org/format',auth.uid()) returning id into tid;
 rejected:=false;
 begin update sc_template_library set url='javascript:alert(1)' where id=tid; exception when check_violation then rejected:=true; end;
 if not rejected then raise exception 'FAIL executable template URL'; end if;
 rejected:=false;
 begin delete from sc_template_library where id=tid; exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'FAIL active template deletion'; end if;
 perform sc_archive_management_resource(sid,'template',tid,true);
 perform sc_archive_management_resource(sid,'template',tid,false);
 if not exists(select 1 from sc_template_library where id=tid and archived_at is null) then raise exception 'FAIL template restore'; end if;
 insert into sc_documents(school_id,kind,title,created_by) values(sid,'SOP','QA rollback source document',auth.uid()) returning id into doc;
 insert into sc_document_sources(school_id,document_id,title,source_type,note,created_by) values(sid,doc,'QA rollback source','note','QA note',auth.uid()) returning id into src;
 perform sc_archive_management_resource(sid,'source',src,true);
 rejected:=false;
 begin delete from sc_document_sources where id=src; exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'FAIL linked source deleted'; end if;
 rejected:=false;
 begin insert into sc_document_sources(school_id,title,source_type,url,created_by) values(sid,'QA invalid URL','url',null,auth.uid()); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'FAIL source URL mandatory'; end if;
 rejected:=false;
 begin insert into sc_document_sources(school_id,title,source_type,storage_path,created_by) values(sid,'QA invalid file folder','file',gen_random_uuid()::text||'/source.pdf',auth.uid()); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'FAIL cross-school file folder'; end if;
 insert into sc_schools(name,created_by,is_internal_test) select 'QA rollback foreign source school',u.id,true from qa_isolated_users u where u.ord=2 returning id into fsid;
 insert into sc_documents(school_id,kind,title,created_by) values(fsid,'SOP','QA foreign source document',auth.uid()) returning id into fdoc;
 rejected:=false;
 begin insert into sc_document_sources(school_id,document_id,title,source_type,note,created_by) values(sid,fdoc,'QA foreign linked source','note','QA note',auth.uid()); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'FAIL cross-school source document'; end if;
end $$;
select 'PASS management URL, archive/restore, linked source preservation, file folder and tenant document boundaries' result;


-- Real lifecycle checks under the application database role; everything rolls back.
set local role authenticated;
do $$
declare sid uuid; cls uuid; student uuid; book uuid; copy uuid; loan uuid; acquisition uuid; room1 uuid; room2 uuid; item uuid; req uuid; procurement uuid; account uuid; bill uuid; pay uuid; chatroom uuid; private_room uuid; rejected boolean; n int;
begin
 select school_id into sid from sc_members where user_id=auth.uid() limit 1;
 chatroom:=sc_school_chat_open(sid);private_room:=sc_school_chat_open(sid,auth.uid());
 for n in 1..3 loop
  perform sc_school_chat_send(chatroom,'QA Pesan grup '||n);perform sc_school_chat_send(private_room,'QA Pesan privat '||n);
  insert into sc_classes(school_id,name,grade,academic_year) values(sid,'QA Kelas '||n,'7','2026/2027') returning id into cls;
  insert into sc_students(school_id,name,nis,class_id) values(sid,'QA Siswa '||n,'QA-'||n,cls) returning id into student;
  insert into sc_notes(school_id,author_id,scope,target_role,title,body) values(sid,auth.uid(),case when n=1 then 'personal' else 'role' end,case when n=2 then 'teacher' when n=3 then 'staff' else null end,'QA Catatan '||n,'QA catatan pengujian akses');
  perform sc_bulk_attendance(sid,current_date,'QA Pelajaran',jsonb_build_array(jsonb_build_object('student_id',student,'class_id',cls,'mark','present','notes','QA presensi')));
  insert into sc_library_titles(school_id,title) values(sid,'QA Buku '||n) returning id into book;
  insert into sc_library_copies(school_id,title_id,inventory_code) values(sid,book,'QA-COPY-'||n) returning id into copy;
  loan:=sc_library_checkout(sid,copy,'student',student,'QA Siswa '||n,current_date+7,null);
  if not exists(select 1 from sc_library_copies where id=copy and status='loaned') then raise exception 'FAIL book checkout'; end if;
  perform sc_library_return(sid,loan,'Baik',null);
  if not exists(select 1 from sc_library_copies where id=copy and status='available') then raise exception 'FAIL book return'; end if;
  insert into sc_library_acquisitions(school_id,title_id,item_title,quantity,status) values(sid,book,'QA Pengadaan '||n,3,'ordered') returning id into acquisition;
  if sc_library_receive_acquisition(sid,acquisition)<>3 then raise exception 'FAIL book receipt'; end if;
  rejected:=false;begin perform sc_library_receive_acquisition(sid,acquisition);exception when raise_exception then rejected:=true;end;
  if not rejected then raise exception 'FAIL duplicate book receipt';end if;
  insert into sc_sarpras_rooms(school_id,code,name) values(sid,'QA-R-'||n,'QA Ruang '||n) returning id into room1;
  insert into sc_sarpras_rooms(school_id,code,name) values(sid,'QA-R2-'||n,'QA Ruang Tujuan '||n) returning id into room2;
  insert into sc_sarpras_items(school_id,name,brand,room_id) values(sid,'QA Aset '||n,'QA Brand',room1) returning id into item;
  insert into sc_sarpras_requests(school_id,kind,item_id,requester_user_id,requester_name,purpose) values(sid,'item_loan',item,auth.uid(),'QA Guru','QA Pembelajaran') returning id into req;
  perform sc_sarpras_transition_request(sid,req,'approved');perform sc_sarpras_transition_request(sid,req,'borrowed');
  if not exists(select 1 from sc_sarpras_items where id=item and status='loaned') then raise exception 'FAIL asset borrowing';end if;
  perform sc_sarpras_transition_request(sid,req,'returned');perform sc_sarpras_move_item(sid,item,room2,'QA mutasi ruang');
  if not exists(select 1 from sc_sarpras_items where id=item and room_id=room2 and status='available') then raise exception 'FAIL asset return/move';end if;
  insert into sc_sarpras_procurements(school_id,item_name,brand,quantity,status) values(sid,'QA Aset Pengadaan '||n,'QA Brand',3,'approved') returning id into procurement;
  perform sc_sarpras_receive_procurement(sid,procurement);
  rejected:=false;begin perform sc_sarpras_receive_procurement(sid,procurement);exception when raise_exception then rejected:=true;end;
  if not rejected then raise exception 'FAIL duplicate asset receipt';end if;
  insert into sc_finance_accounts(school_id,name,kind,opening_balance) values(sid,'QA Kas '||n,'cash',0) returning id into account;
  insert into sc_student_bills(school_id,student_id,title,amount_due,due_on,created_by) values(sid,student,'QA SPP '||n,100000,current_date,auth.uid()) returning id into bill;
  pay:=sc_record_bill_payment(sid,bill,account,40000,'QA-PART-'||n);
  pay:=sc_record_bill_payment(sid,bill,account,60000,'QA-FULL-'||n);
  rejected:=false;begin perform sc_record_bill_payment(sid,bill,account,1,'QA-OVER-'||n);exception when raise_exception then rejected:=true;end;
  if not rejected then raise exception 'FAIL overpayment';end if;
  if (select sum(amount) from sc_bill_payments where bill_id=bill)<>100000 then raise exception 'FAIL bill persistence';end if;
 end loop;
end $$;
reset role;
insert into sc_members(school_id,user_id,role) select s.id,u.id,'teacher' from sc_schools s join qa_isolated_users owner on owner.id=s.created_by and owner.ord=1 cross join qa_isolated_users u where u.ord=2;
select set_config('request.jwt.claim.sub',(select id::text from qa_isolated_users where ord=2),true);
set local role authenticated;
do $$ begin
 if (select count(*) from sc_school_chat_messages where body like 'QA Pesan %')<>3 then raise exception 'FAIL teacher private chat isolation';end if;
 if (select count(*) from sc_notes where title like 'QA Catatan %')<>1 then raise exception 'FAIL teacher note visibility';end if;
end $$;
reset role;
update sc_members set role='principal' where user_id=(select id from qa_isolated_users where ord=2);
set local role authenticated;
do $$ begin
 if (select count(*) from sc_school_chat_messages where body like 'QA Pesan %')<>6 then raise exception 'FAIL principal private chat access';end if;
 if (select count(*) from sc_notes where title like 'QA Catatan %')<>3 then raise exception 'FAIL principal sees all notes';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from qa_isolated_users where ord=1),true);

do $$
declare sid uuid; foreign_school uuid; st uuid; foreign_st uuid; sch uuid; loc uuid; comp uuid; opening uuid; foreign_opening uuid; candidate uuid; rejected boolean;
begin
 select school_id into sid from sc_members where user_id=auth.uid() limit 1;
 insert into sc_schools(name,created_by,is_internal_test) select 'QA rollback foreign-school',u.id,true from qa_isolated_users u where u.ord=3 returning id into foreign_school;
 insert into sc_staff(school_id,name) values(sid,'QA rollback HR staff') returning id into st;
 insert into sc_staff(school_id,name) values(foreign_school,'QA rollback foreign staff') returning id into foreign_st;
 insert into sc_hr_work_schedules(school_id,name,start_time,end_time) values(sid,'QA rollback HR schedule','07:00','16:00') returning id into sch;
 insert into sc_hr_locations(school_id,name,latitude,longitude,radius_meters) values(sid,'QA rollback HR location',0,0,150) returning id into loc;
 insert into sc_hr_assignments(school_id,staff_id,schedule_id,location_id,effective_from) values(sid,st,sch,loc,current_date);
 rejected:=false;
 begin insert into sc_hr_assignments(school_id,staff_id,schedule_id,effective_from) values(sid,foreign_st,sch,current_date); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'FAIL cross-school staff assignment'; end if;
 update sc_hr_work_schedules set active=false where id=sch;
 rejected:=false;
 begin delete from sc_hr_work_schedules where id=sch; exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'FAIL referenced schedule deleted'; end if;
 update sc_hr_locations set active=false where id=loc;
 rejected:=false;
 begin delete from sc_hr_locations where id=loc; exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'FAIL referenced location deleted'; end if;
 insert into sc_payroll_component_catalog(school_id,name,kind,default_amount) values(sid,'QA rollback HR component','earning',125000) returning id into comp;
 insert into sc_payroll_staff_components(school_id,staff_id,component_id,amount) values(sid,st,comp,125000);
 update sc_payroll_component_catalog set active=false where id=comp;
 rejected:=false;
 begin delete from sc_payroll_component_catalog where id=comp; exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'FAIL referenced payroll component deleted'; end if;
 insert into sc_recruitment_openings(school_id,title,status,created_by) values(sid,'QA rollback HR opening','closed',auth.uid()) returning id into opening;
 insert into sc_recruitment_openings(school_id,title,status,created_by) values(foreign_school,'QA foreign opening','open',auth.uid()) returning id into foreign_opening;
 rejected:=false;
 begin insert into sc_recruitment_candidates(school_id,opening_id,name) values(sid,foreign_opening,'QA cross-school candidate'); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'FAIL cross-school opening'; end if;
 insert into sc_recruitment_candidates(school_id,opening_id,name) values(sid,opening,'QA rollback private candidate') returning id into candidate;
 rejected:=false;
 begin delete from sc_recruitment_openings where id=opening; exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'FAIL opening candidate history deleted'; end if;
 rejected:=false;
 begin delete from sc_recruitment_candidates where id=candidate; exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'FAIL active candidate deleted'; end if;
 -- Keep fixtures in transaction to test actual row visibility, not an empty table.
end $$;
update sc_members set role='teacher' where user_id=auth.uid();
set local role authenticated;
do $$
declare sid uuid; req uuid; rejected boolean;
begin
 select school_id into sid from sc_members where user_id=auth.uid() limit 1;
 if exists(select 1 from sc_recruitment_candidates where name='QA rollback private candidate') then raise exception 'FAIL candidate privacy'; end if;
 if exists(select 1 from sc_payroll_staff_components where amount=125000) then raise exception 'FAIL other staff payroll privacy'; end if;
 rejected:=false;
 begin insert into sc_hr_locations(school_id,name,latitude,longitude,radius_meters) values(sid,'QA denied teacher',0,0,150); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'FAIL teacher modifies HR master'; end if;
 insert into sc_hr_requests(school_id,user_id,kind,reason,amount) values(sid,auth.uid(),'permission','QA rollback permission',0) returning id into req;
 rejected:=false;
 begin update sc_hr_requests set status='approved' where id=req; exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'FAIL self approval'; end if;
 update sc_hr_requests set status='cancelled' where id=req;
 if not exists(select 1 from sc_hr_requests where id=req and status='cancelled') then raise exception 'FAIL own cancellation'; end if;
end $$;
select 'PASS: isolated 3-row core attendance, library checkout/return/receipt, Sarpras borrow/return/move/receipt, bill partial/full/overpayment, notes and chat role privacy; management archives, HR references/privacy and request approval' result;


reset role;
rollback;
