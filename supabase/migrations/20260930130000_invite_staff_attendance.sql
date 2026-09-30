create or replace function public.sc_accept_invite(p_code text) returns uuid
 language plpgsql security definer set search_path=public,pg_temp as $$
 declare v_inv public.sc_invitations%rowtype;v_name text;
 begin
  if auth.uid() is null then raise exception 'Login diperlukan'; end if;
  select * into v_inv from public.sc_invitations where code_hash=encode(digest(trim(p_code),'sha256'),'hex') and expires_at>now() and used_at is null for update;
  if not found then raise exception 'Undangan tidak sah atau telah kedaluwarsa'; end if;
  insert into public.sc_members(school_id,user_id,role) values(v_inv.school_id,auth.uid(),v_inv.role)
   on conflict(school_id,user_id) do update set role=excluded.role;
  if v_inv.role<>'viewer' and not exists(select 1 from public.sc_staff where school_id=v_inv.school_id and user_id=auth.uid()) then
    select coalesce(nullif(raw_user_meta_data->>'display_name',''),split_part(email,'@',1),'Pengguna') into v_name
    from auth.users where id=auth.uid();
    insert into public.sc_staff(school_id,user_id,name,position)
    values(v_inv.school_id,auth.uid(),v_name,
      case v_inv.role when 'principal' then 'Kepala Sekolah' when 'vice_principal' then 'Wakil Kepala Sekolah'
       when 'teacher' then 'Guru' when 'counselor' then 'Guru BK' when 'hr' then 'SDM / HR'
       when 'treasurer' then 'Bendahara' when 'staff' then 'Staf' else 'Anggota' end);
  end if;
  update public.sc_invitations set used_by=auth.uid(),used_at=now() where id=v_inv.id;
  insert into public.sc_audit_log(school_id,actor_id,action,metadata)
  values(v_inv.school_id,auth.uid(),'team.invite.accepted',jsonb_build_object('role',v_inv.role));
  return v_inv.school_id;
 end $$;
revoke all on function public.sc_accept_invite(text) from public,anon;
grant execute on function public.sc_accept_invite(text) to authenticated;