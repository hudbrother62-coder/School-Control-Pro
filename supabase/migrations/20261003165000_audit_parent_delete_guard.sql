-- During tenant deletion, child rows cascade after the school has already gone.
-- Their tenant-scoped audit rows cascade too; inserting a new dangling audit row
-- would incorrectly block the deletion. Normal child deletion remains audited.
create or replace function sc_private.audit_row_change()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare sid uuid;tid text;
begin
 if tg_op='DELETE' then sid:=old.school_id;tid:=old.id::text;
 else sid:=new.school_id;tid:=new.id::text;end if;
 if tg_op='DELETE' and sid is not null and not exists(select 1 from public.sc_schools where id=sid) then return old;end if;
 if sid is not null then
  insert into public.sc_audit_log(school_id,actor_id,action,target_id,metadata)
  values(sid,auth.uid(),tg_table_name||'.'||lower(tg_op),tid,jsonb_build_object('table',tg_table_name,'operation',tg_op));
 end if;
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
