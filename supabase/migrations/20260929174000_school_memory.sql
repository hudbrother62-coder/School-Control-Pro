-- School profile and curated memory for principal/teaching AI; NEVER include BK private records.
create table if not exists public.sc_school_facts(
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 key text not null check(length(trim(key)) between 2 and 80),
 value text not null check(length(value) between 1 and 5000),
 verified_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 primary key(school_id,key)
);
alter table public.sc_school_facts enable row level security;
create policy sc_facts_read on public.sc_school_facts for select to authenticated using(public.sc_member(school_id) and public.sc_role(school_id)<>'viewer');
revoke all on public.sc_school_facts from anon,authenticated;
grant select on public.sc_school_facts to authenticated;
create or replace function public.sc_save_school_fact(p_school uuid,p_key text,p_value text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Hanya manajemen sekolah';end if;
 if length(trim(p_key)) not between 2 and 80 or length(trim(p_value)) not between 1 and 5000 then raise exception 'Data memori tidak valid';end if;
 if lower(trim(p_key)) like '%konseling%' or lower(trim(p_key)) like '%kasus%' then raise exception 'Catatan BK rahasia tidak dapat dijadikan memori umum';end if;
 insert into public.sc_school_facts(school_id,key,value,verified_by) values(p_school,trim(p_key),trim(p_value),auth.uid())
 on conflict(school_id,key) do update set value=excluded.value,verified_by=excluded.verified_by,updated_at=now();
 insert into public.sc_audit_log(school_id,actor_id,action,target_id) values(p_school,auth.uid(),'school.fact.updated',trim(p_key));
end $$;
create or replace function public.sc_edit_school(p_school uuid,p_name text,p_npsn text,p_address text,p_year text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_manager(p_school) or not public.sc_write_active(p_school) then raise exception 'Akses ditolak';end if;
 if length(trim(p_name)) not between 3 and 120 or length(trim(p_year)) not between 5 and 20 then raise exception 'Profil sekolah tidak valid';end if;
 update public.sc_schools set name=trim(p_name),npsn=nullif(trim(p_npsn),''),address=nullif(trim(p_address),''),academic_year=trim(p_year) where id=p_school;
 insert into public.sc_audit_log(school_id,actor_id,action) values(p_school,auth.uid(),'school.profile.updated');
end $$;
revoke all on function public.sc_save_school_fact(uuid,text,text),public.sc_edit_school(uuid,text,text,text,text) from public;
grant execute on function public.sc_save_school_fact(uuid,text,text),public.sc_edit_school(uuid,text,text,text,text) to authenticated;
