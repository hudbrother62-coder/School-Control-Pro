-- Extend safe record removal to drafts and workflow records.
create or replace function public.sc_delete_auxiliary(p_school uuid,p_entity text,p_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_write_active(p_school) then raise exception 'Langganan tidak aktif'; end if;
 case p_entity
  when 'ai_draft' then
   delete from public.sc_ai_drafts where id=p_id and school_id=p_school and user_id=auth.uid();
  when 'document' then
   delete from public.sc_documents where id=p_id and school_id=p_school and status in ('draft','review') and (created_by=auth.uid() or public.sc_manager(p_school));
  when 'supervision' then
   if not public.sc_manager(p_school) then raise exception 'Akses supervisi ditolak'; end if;
   if not exists(select 1 from public.sc_supervisions where id=p_id and school_id=p_school and status='draft') then raise exception 'Hanya supervisi draft yang dapat dihapus'; end if;
   delete from public.sc_supervision_answers where school_id=p_school and supervision_id=p_id;
   delete from public.sc_supervisions where id=p_id and school_id=p_school;
  when 'staff_event' then
   delete from public.sc_staff_events where id=p_id and school_id=p_school and verified_at is null and (created_by=auth.uid() or public.sc_manager(p_school) or public.sc_role(p_school)='hr');
  when 'leave_request' then
   delete from public.sc_leave_requests where id=p_id and school_id=p_school and status='pending' and (user_id=auth.uid() or public.sc_manager(p_school) or public.sc_role(p_school)='hr');
  else raise exception 'Jenis data tidak didukung';
 end case;
 if not found then raise exception 'Data tidak dapat dihapus atau sudah dikunci'; end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'auxiliary.deleted',p_id::text,jsonb_build_object('entity',p_entity));
end $$;

create or replace function public.sc_delete_school_fact(p_school uuid,p_key text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_write_active(p_school) or not public.sc_manager(p_school) then raise exception 'Akses ditolak'; end if;
 delete from public.sc_school_facts where school_id=p_school and key=p_key;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'school.fact.deleted',p_key,jsonb_build_object('key',p_key));
end $$;

revoke all on function public.sc_delete_auxiliary(uuid,text,uuid),public.sc_delete_school_fact(uuid,text) from public,anon;
grant execute on function public.sc_delete_auxiliary(uuid,text,uuid),public.sc_delete_school_fact(uuid,text) to authenticated;
