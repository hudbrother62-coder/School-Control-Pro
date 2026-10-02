alter table public.sc_programs add column archived_at timestamptz;
alter table public.sc_program_tasks add column archived_at timestamptz;
alter table public.sc_meetings add column archived_at timestamptz;
create or replace function public.sc_archive_operational(p_school uuid,p_entity text,p_id uuid,p_archive boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare changed integer;
begin
 if not sc_write_active(p_school) then raise exception 'Akses sekolah aktif diperlukan.'; end if;
 case p_entity
 when 'program' then
  if not sc_manager(p_school) then raise exception 'Akses ditolak.'; end if;
  update sc_programs set archived_at=case when p_archive then now() else null end where id=p_id and school_id=p_school;
 when 'task' then
  update sc_program_tasks set archived_at=case when p_archive then now() else null end where id=p_id and school_id=p_school and (sc_manager(p_school) or created_by=auth.uid() or pic_id=auth.uid());
 when 'meeting' then
  update sc_meetings set archived_at=case when p_archive then now() else null end where id=p_id and school_id=p_school and (sc_manager(p_school) or created_by=auth.uid());
 else raise exception 'Jenis arsip tidak didukung.';
 end case;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Data tidak ditemukan atau akses ditolak.'; end if;
 insert into sc_audit_log(school_id,actor_id,action,target_id,metadata) values(p_school,auth.uid(),case when p_archive then 'record.archived' else 'record.restored' end,p_id::text,jsonb_build_object('entity',p_entity));
end $$;
revoke all on function public.sc_archive_operational(uuid,text,uuid,boolean) from public,anon;
grant execute on function public.sc_archive_operational(uuid,text,uuid,boolean) to authenticated;
create or replace function public.sc_guard_command_delete() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from sc_schools where id=old.school_id) then return old; end if;
 if old.archived_at is null then raise exception 'Arsipkan data sebelum menghapus permanen.'; end if;
 if tg_table_name='sc_programs' then
  if exists(select 1 from sc_program_tasks where program_id=old.id) or exists(select 1 from sc_evidence where target_type='program' and target_id=old.id) then raise exception 'Program memiliki riwayat tugas atau bukti; simpan sebagai arsip.'; end if;
 elsif tg_table_name='sc_program_tasks' then
  if exists(select 1 from sc_evidence where target_type='task' and target_id=old.id) then raise exception 'Tugas memiliki bukti; simpan sebagai arsip.'; end if;
 end if;
 return old;
end $$;
revoke all on function public.sc_guard_command_delete() from public,anon,authenticated;
create trigger sc_program_delete_guard before delete on public.sc_programs for each row execute function public.sc_guard_command_delete();
create trigger sc_task_delete_guard before delete on public.sc_program_tasks for each row execute function public.sc_guard_command_delete();
create trigger sc_meeting_delete_guard before delete on public.sc_meetings for each row execute function public.sc_guard_command_delete();
create or replace function public.sc_save_command_record(p_school uuid,p_entity text,p_id uuid,p_patch jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_entity not in ('program','task','meeting','calendar') then raise exception 'Jenis data tidak didukung.'; end if;
 if length(trim(coalesce(p_patch->>'title','')))<3 then raise exception 'Judul minimal 3 karakter.'; end if;
 if p_entity='task' and p_patch ? 'status' then
  perform sc_decide_task(p_school,p_id,p_patch->>'status',p_patch->>'problem',p_patch->>'result');
 end if;
 perform sc_update_operational(p_school,p_entity,p_id,p_patch);
 if p_entity='program' and p_patch ? 'deadline' then
  update sc_programs set deadline=nullif(p_patch->>'deadline','')::date where id=p_id and school_id=p_school;
 end if;
end $$;
revoke all on function public.sc_save_command_record(uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.sc_save_command_record(uuid,text,uuid,jsonb) to authenticated;
