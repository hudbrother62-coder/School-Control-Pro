-- Changing a wali kelas must not cascade-delete schedules attached to the previous teacher assignment.
create or replace function public.sc_master_save_class_homeroom(
 p_school uuid,p_id uuid,p_name text,p_grade text,p_year text,p_homeroom_user uuid,p_homeroom_name text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_name text; v_role text;
begin
 if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses kelas ditolak'; end if;
 if p_homeroom_user is not null then
  select role into v_role from public.sc_members where school_id=p_school and user_id=p_homeroom_user and is_active=true;
  if v_role is null or v_role not in ('owner','principal','vice_principal','teacher') then
   raise exception 'Wali kelas harus memiliki akun guru aktif di sekolah ini';
  end if;
  select name into v_name from public.sc_staff where school_id=p_school and user_id=p_homeroom_user limit 1;
  if nullif(trim(coalesce(v_name,'')),'') is null then select split_part(email,'@',1) into v_name from auth.users where id=p_homeroom_user; end if;
 else
  v_name=nullif(trim(coalesce(p_homeroom_name,'')),'');
  if v_name is not null and length(v_name)<2 then raise exception 'Nama wali kelas terlalu pendek'; end if;
 end if;
 v_id:=public.sc_master_save_class(p_school,p_id,p_name,p_grade,p_year);
 update public.sc_classes set homeroom_user_id=p_homeroom_user,homeroom_name=v_name where id=v_id and school_id=p_school;
 -- Old homeroom accounts lose their homeroom role, but associated schedules remain intact.
 update public.sc_teacher_assignments a set mode='subject'
 where a.school_id=p_school and a.class_id=v_id and a.mode='homeroom'
 and (p_homeroom_user is null or a.teacher_id<>p_homeroom_user)
 and exists(select 1 from public.sc_teacher_schedules s where s.assignment_id=a.id and s.school_id=p_school);
 delete from public.sc_teacher_assignments a
 where a.school_id=p_school and a.class_id=v_id and a.mode='homeroom'
 and (p_homeroom_user is null or a.teacher_id<>p_homeroom_user)
 and not exists(select 1 from public.sc_teacher_schedules s where s.assignment_id=a.id and s.school_id=p_school);
 if p_homeroom_user is not null and not exists(
   select 1 from public.sc_teacher_assignments a where a.school_id=p_school and a.class_id=v_id
    and a.teacher_id=p_homeroom_user and a.mode='homeroom'
 ) then
  insert into public.sc_teacher_assignments(school_id,teacher_id,class_id,subject_id,mode)
  values(p_school,p_homeroom_user,v_id,null,'homeroom');
 end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'master.class.homeroom',v_id::text,
 jsonb_build_object('user_id',p_homeroom_user,'name',v_name,'mode',case when p_homeroom_user is not null then 'account' when v_name is not null then 'name_only' else 'empty' end));
 return v_id;
end $$;