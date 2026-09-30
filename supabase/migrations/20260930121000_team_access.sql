-- Team directory and role administration.
create or replace function public.sc_team_directory(p_school uuid)
returns table(user_id uuid,email text,role text,staff_name text)
language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
begin
 if not public.sc_manager(p_school) then raise exception 'Akses tim ditolak'; end if;
 return query
 select m.user_id,u.email,m.role,coalesce(s.name,'')
 from public.sc_members m
 left join auth.users u on u.id=m.user_id
 left join public.sc_staff s on s.school_id=m.school_id and s.user_id=m.user_id
 where m.school_id=p_school
 order by case m.role when 'owner' then 0 when 'principal' then 1 else 2 end,coalesce(s.name,u.email);
end $$;

create or replace function public.sc_change_member_role(p_school uuid,p_user uuid,p_role text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare actor text:=public.sc_role(p_school); current_role text;
begin
 if not public.sc_write_active(p_school) or actor<>'owner' then raise exception 'Hanya owner dapat mengubah hak akses'; end if;
 if p_role not in ('principal','vice_principal','teacher','counselor','hr','treasurer','staff','viewer') then raise exception 'Peran tidak valid'; end if;
 select role into current_role from public.sc_members where school_id=p_school and user_id=p_user;
 if current_role is null then raise exception 'Anggota tidak ditemukan'; end if;
 if current_role='owner' then raise exception 'Peran owner tidak dapat diubah dari menu ini'; end if;
 update public.sc_members set role=p_role where school_id=p_school and user_id=p_user;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'team.role.changed',p_user::text,jsonb_build_object('from',current_role,'to',p_role));
end $$;

create or replace function public.sc_remove_member(p_school uuid,p_user uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare actor text:=public.sc_role(p_school); current_role text;
begin
 if not public.sc_write_active(p_school) or actor<>'owner' then raise exception 'Hanya owner dapat menghapus akses anggota'; end if;
 select role into current_role from public.sc_members where school_id=p_school and user_id=p_user;
 if current_role is null then raise exception 'Anggota tidak ditemukan'; end if;
 if current_role='owner' then raise exception 'Owner utama tidak dapat dihapus'; end if;
 update public.sc_staff set user_id=null where school_id=p_school and user_id=p_user;
 delete from public.sc_teacher_assignments where school_id=p_school and teacher_id=p_user;
 delete from public.sc_members where school_id=p_school and user_id=p_user;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'team.member.removed',p_user::text,jsonb_build_object('former_role',current_role));
end $$;

revoke all on function public.sc_team_directory(uuid),public.sc_change_member_role(uuid,uuid,text),public.sc_remove_member(uuid,uuid) from public,anon;
grant execute on function public.sc_team_directory(uuid),public.sc_change_member_role(uuid,uuid,text),public.sc_remove_member(uuid,uuid) to authenticated;
