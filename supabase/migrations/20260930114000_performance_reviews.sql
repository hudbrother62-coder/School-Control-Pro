-- Structured performance review with teacher response.
create table if not exists public.sc_performance_reviews(
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 period text not null,
 evaluator_id uuid not null references auth.users(id),
 summary text not null,
 status text not null default 'draft' check(status in ('draft','review','responded','final')),
 response text,
 responded_at timestamptz,
 finalized_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists sc_performance_reviews_school_user_idx on public.sc_performance_reviews(school_id,user_id,period);
alter table public.sc_performance_reviews enable row level security;

drop policy if exists sc_performance_review_read on public.sc_performance_reviews;
create policy sc_performance_review_read on public.sc_performance_reviews for select to authenticated
 using(public.sc_manager(school_id) or public.sc_role(school_id)='hr' or user_id=auth.uid());

create or replace function public.sc_save_performance_review(
 p_school uuid,p_id uuid,p_user uuid,p_period text,p_summary text,p_submit boolean
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if not public.sc_write_active(p_school) or not (public.sc_manager(p_school) or public.sc_role(p_school)='hr') then raise exception 'Akses evaluasi ditolak'; end if;
 if length(trim(p_period))<4 or length(trim(p_summary))<10 then raise exception 'Periode dan ringkasan evaluasi wajib diisi'; end if;
 if not exists(select 1 from public.sc_members where school_id=p_school and user_id=p_user) then raise exception 'Pegawai tidak terdaftar'; end if;
 if p_id is null then
  insert into public.sc_performance_reviews(school_id,user_id,period,evaluator_id,summary,status)
  values(p_school,p_user,trim(p_period),auth.uid(),trim(p_summary),case when p_submit then 'review' else 'draft' end)
  returning id into v_id;
 else
  update public.sc_performance_reviews set period=trim(p_period),summary=trim(p_summary),status=case when p_submit then 'review' else status end,updated_at=now()
  where id=p_id and school_id=p_school and status='draft'
  returning id into v_id;
  if v_id is null then raise exception 'Evaluasi tidak dapat diubah setelah diajukan'; end if;
 end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'performance.review.saved',v_id::text,jsonb_build_object('submitted',p_submit));
 return v_id;
end $$;

create or replace function public.sc_respond_performance_review(p_school uuid,p_id uuid,p_response text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.sc_write_active(p_school) or length(trim(p_response))<3 then raise exception 'Tanggapan wajib diisi'; end if;
 update public.sc_performance_reviews set response=trim(p_response),responded_at=now(),status='responded',updated_at=now()
 where id=p_id and school_id=p_school and user_id=auth.uid() and status='review';
 if not found then raise exception 'Evaluasi tidak tersedia untuk ditanggapi'; end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'performance.review.responded',p_id::text,'{}'::jsonb);
end $$;

create or replace function public.sc_finalize_performance_review(p_school uuid,p_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not (public.sc_manager(p_school) or public.sc_role(p_school)='hr') then raise exception 'Akses finalisasi ditolak'; end if;
 update public.sc_performance_reviews set status='final',finalized_at=now(),updated_at=now()
 where id=p_id and school_id=p_school and status in ('review','responded');
 if not found then raise exception 'Evaluasi tidak dapat difinalkan'; end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'performance.review.finalized',p_id::text,'{}'::jsonb);
end $$;

create or replace function public.sc_delete_performance_review(p_school uuid,p_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not (public.sc_manager(p_school) or public.sc_role(p_school)='hr') then raise exception 'Akses hapus ditolak'; end if;
 delete from public.sc_performance_reviews where id=p_id and school_id=p_school and status='draft';
 if not found then raise exception 'Hanya evaluasi draft yang dapat dihapus'; end if;
 insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
 values(p_school,auth.uid(),'performance.review.deleted',p_id::text,'{}'::jsonb);
end $$;

revoke all on table public.sc_performance_reviews from anon;
grant select on table public.sc_performance_reviews to authenticated;
revoke all on function public.sc_save_performance_review(uuid,uuid,uuid,text,text,boolean),
 public.sc_respond_performance_review(uuid,uuid,text),
 public.sc_finalize_performance_review(uuid,uuid),
 public.sc_delete_performance_review(uuid,uuid) from public,anon;
grant execute on function public.sc_save_performance_review(uuid,uuid,uuid,text,text,boolean),
 public.sc_respond_performance_review(uuid,uuid,text),
 public.sc_finalize_performance_review(uuid,uuid),
 public.sc_delete_performance_review(uuid,uuid) to authenticated;
