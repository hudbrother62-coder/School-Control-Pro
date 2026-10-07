-- Unified school account access and editable class homeroom (2026-10-08)
alter table public.sc_members add column if not exists is_active boolean not null default true;
alter table public.sc_classes add column if not exists homeroom_user_id uuid references auth.users(id) on delete set null;
alter table public.sc_classes add column if not exists homeroom_name text;

create index if not exists sc_classes_homeroom_user_idx on public.sc_classes(homeroom_user_id) where homeroom_user_id is not null;

create or replace function public.sc_role(p_school uuid) returns text language sql stable security definer set search_path=public,pg_temp as $$
 select role from public.sc_members where school_id=p_school and user_id=auth.uid() and is_active=true limit 1
$$;
create or replace function public.sc_member(p_school uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and exists(select 1 from public.sc_members where school_id=p_school and user_id=auth.uid() and is_active=true)
$$;

create or replace function public.sc_change_member_role(p_school uuid,p_user uuid,p_role text)
 returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare actor text:=public.sc_role(p_school); old_role text;
begin
 if not public.sc_write_active(p_school) or actor not in ('owner','principal') then raise exception 'Tidak berwenang mengubah peran'; end if;
 if p_role not in ('principal','vice_principal','teacher','counselor','hr','treasurer','finance_staff','supervisor','staff','viewer') then raise exception 'Peran tidak valid'; end if;
 select role into old_role from public.sc_members where school_id=p_school and user_id=p_user for update;
 if old_role is null then raise exception 'Anggota tidak ditemukan'; end if;
 if old_role='owner' or p_user=auth.uid() or (actor='principal' and (old_role='principal' or p_role='principal')) then raise exception 'Akun atau peran dilindungi'; end if;
 update public.sc_members set role=p_role where school_id=p_school and user_id=p_user;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'team.role.changed',p_user::text,jsonb_build_object('from',old_role,'to',p_role));
end $$;

create or replace function public.sc_set_member_active(p_school uuid,p_user uuid,p_active boolean)
 returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare actor text:=public.sc_role(p_school); target_role text; prior boolean;
begin
 if not public.sc_write_active(p_school) or actor not in ('owner','principal') then raise exception 'Tidak berwenang mengubah status akses'; end if;
 select role,is_active into target_role,prior from public.sc_members
 where school_id=p_school and user_id=p_user for update;
 if target_role is null then raise exception 'Anggota tidak ditemukan'; end if;
 if target_role='owner' or p_user=auth.uid() or (actor='principal' and target_role='principal') then raise exception 'Akun dilindungi'; end if;
 update public.sc_members set is_active=coalesce(p_active,false) where school_id=p_school and user_id=p_user;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'team.access.status',p_user::text,jsonb_build_object('from',prior,'to',p_active));
end $$;

create or replace function public.sc_master_save_class_homeroom(
 p_school uuid,p_id uuid,p_name text,p_grade text,p_year text,p_homeroom_user uuid,p_homeroom_name text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_name text; v_role text;
begin
 if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses kelas ditolak'; end if;
 if p_homeroom_user is not null then
  select role into v_role from public.sc_members where school_id=p_school and user_id=p_homeroom_user and is_active=true;
  if v_role not in ('owner','principal','vice_principal','teacher') or v_role is null then
   raise exception 'Wali kelas harus memiliki akun guru aktif di sekolah ini';
  end if;
  select name into v_name from public.sc_staff where school_id=p_school and user_id=p_homeroom_user limit 1;
  if nullif(trim(coalesce(v_name,'')),'') is null then
   select split_part(email,'@',1) into v_name from auth.users where id=p_homeroom_user;
  end if;
 else
  v_name=nullif(trim(coalesce(p_homeroom_name,'')),'');
  if v_name is not null and length(v_name)<2 then raise exception 'Nama wali kelas terlalu pendek'; end if;
 end if;
 v_id:=public.sc_master_save_class(p_school,p_id,p_name,p_grade,p_year);
 update public.sc_classes set homeroom_user_id=p_homeroom_user,homeroom_name=v_name where id=v_id and school_id=p_school;
 -- Homeroom access is reflected in teaching assignments; never delete subject-teacher entries.
 delete from public.sc_teacher_assignments where school_id=p_school and class_id=v_id and mode='homeroom';
 if p_homeroom_user is not null then
  insert into public.sc_teacher_assignments(school_id,teacher_id,class_id,subject_id,mode)
  values(p_school,p_homeroom_user,v_id,null,'homeroom');
 end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'master.class.homeroom',v_id::text,
 jsonb_build_object('user_id',p_homeroom_user,'name',v_name,'mode',case when p_homeroom_user is not null then 'account' when v_name is not null then 'name_only' else 'empty' end));
 return v_id;
end $$;

revoke all on function public.sc_set_member_active(uuid,uuid,boolean), public.sc_master_save_class_homeroom(uuid,uuid,text,text,text,uuid,text) from public,anon;
grant execute on function public.sc_set_member_active(uuid,uuid,boolean), public.sc_master_save_class_homeroom(uuid,uuid,text,text,text,uuid,text) to authenticated;
