create or replace function public.sc_team_directory(p_school uuid)
returns table(user_id uuid,email text,role text,staff_name text)
language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
begin
 if not public.sc_manager(p_school) then raise exception 'Akses tim ditolak';end if;
 return query
 select m.user_id,u.email::text,m.role::text,coalesce(s.name,'')::text
 from public.sc_members m
 left join auth.users u on u.id=m.user_id
 left join public.sc_staff s on s.school_id=m.school_id and s.user_id=m.user_id
 where m.school_id=p_school
 order by case m.role when 'owner' then 0 when 'principal' then 1 else 2 end,coalesce(s.name,u.email);
end $$;
revoke all on function public.sc_team_directory(uuid) from public,anon;
grant execute on function public.sc_team_directory(uuid) to authenticated;
