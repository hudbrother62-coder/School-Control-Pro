-- Private evidence bucket. This migration targets a NEW standalone Supabase instance.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('sc-evidence','sc-evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'])
on conflict(id) do nothing;

create policy sc_evidence_upload on storage.objects for insert to authenticated
with check(bucket_id='sc-evidence'
 and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
 and public.sc_write_active(((storage.foldername(name))[1])::uuid)
 and ((storage.foldername(name))[2] in ('program','task','meeting','document','supervision') and public.sc_role(((storage.foldername(name))[1])::uuid)<>'viewer'
      or (storage.foldername(name))[2]='finance' and public.sc_role(((storage.foldername(name))[1])::uuid) in ('owner','principal','treasurer')
      or (storage.foldername(name))[2]='staff_event' and public.sc_role(((storage.foldername(name))[1])::uuid) in ('owner','principal','vice_principal','hr'))
);
create policy sc_evidence_download on storage.objects for select to authenticated
using(bucket_id='sc-evidence'
 and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
 and public.sc_member(((storage.foldername(name))[1])::uuid)
 and ((storage.foldername(name))[2] in ('program','task','meeting','document','supervision') and public.sc_role(((storage.foldername(name))[1])::uuid)<>'viewer'
      or (storage.foldername(name))[2]='finance' and public.sc_role(((storage.foldername(name))[1])::uuid) in ('owner','principal','treasurer')
      or (storage.foldername(name))[2]='staff_event' and public.sc_role(((storage.foldername(name))[1])::uuid) in ('owner','principal','vice_principal','hr'))
);

drop policy if exists sc_evidence_w on public.sc_evidence;
create policy sc_evidence_w on public.sc_evidence for insert to authenticated
with check(public.sc_write_active(school_id) and uploaded_by=auth.uid()
 and file_path like school_id::text||'/'||target_type||'/%'
 and case target_type
   when 'program' then exists(select 1 from public.sc_programs p where p.id=target_id and p.school_id=sc_evidence.school_id and (public.sc_manager(p.school_id) or p.pic_id=auth.uid() or p.owner_id=auth.uid()))
   when 'task' then exists(select 1 from public.sc_program_tasks t where t.id=target_id and t.school_id=sc_evidence.school_id and (public.sc_manager(t.school_id) or t.pic_id=auth.uid()))
   when 'meeting' then exists(select 1 from public.sc_meetings m where m.id=target_id and m.school_id=sc_evidence.school_id and public.sc_manager(m.school_id))
   when 'supervision' then exists(select 1 from public.sc_supervisions s where s.id=target_id and s.school_id=sc_evidence.school_id and public.sc_manager(s.school_id))
   when 'staff_event' then exists(select 1 from public.sc_staff_events se where se.id=target_id and se.school_id=sc_evidence.school_id and (public.sc_manager(se.school_id) or public.sc_role(se.school_id)='hr'))
   when 'document' then exists(select 1 from public.sc_documents d where d.id=target_id and d.school_id=sc_evidence.school_id and (d.created_by=auth.uid() or public.sc_manager(d.school_id)))
   when 'finance' then exists(select 1 from public.sc_finance_transactions f where f.id=target_id and f.school_id=sc_evidence.school_id and public.sc_role(f.school_id) in ('owner','principal','treasurer'))
   else false end);
drop policy if exists sc_evidence_r on public.sc_evidence;
create policy sc_evidence_r on public.sc_evidence for select to authenticated
using(public.sc_member(school_id) and public.sc_role(school_id)<>'viewer' and target_type in ('program','task','meeting','document','supervision'));
create policy sc_evidence_staff_r on public.sc_evidence for select to authenticated
using(target_type='staff_event' and public.sc_role(school_id) in ('owner','principal','vice_principal','hr'));

create or replace function public.sc_update_program(p_school uuid,p_program uuid,p_status text,p_pic uuid,p_result text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak';end if;
 if p_status not in ('planned','ongoing','blocked','completed','verified') then raise exception 'Status tidak valid';end if;
 if p_pic is not null and not exists(select 1 from public.sc_members where school_id=p_school and user_id=p_pic) then raise exception 'PIC bukan anggota';end if;
 if p_status='verified' and not exists(select 1 from public.sc_evidence where school_id=p_school and target_type='program' and target_id=p_program) then raise exception 'Verifikasi memerlukan bukti';end if;
 update public.sc_programs set status=p_status,pic_id=p_pic where id=p_program and school_id=p_school;
 if not found then raise exception 'Program tidak ditemukan';end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'program.status.changed',p_program::text,jsonb_build_object('status',p_status,'result',p_result));
end $$;
revoke all on function public.sc_update_program(uuid,uuid,text,uuid,text) from public;
grant execute on function public.sc_update_program(uuid,uuid,text,uuid,text) to authenticated;
