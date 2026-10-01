do $$
declare
  r record;
  cols text;
  idx_name text;
begin
  for r in
    select c.oid, c.conname, c.conrelid, n.nspname, t.relname, c.conkey
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where c.contype='f' and n.nspname='public' and t.relname like 'sc_%'
      and not exists (
        select 1 from pg_index i
        where i.indrelid=c.conrelid
          and i.indisvalid
          and (i.indkey::smallint[])[0:cardinality(c.conkey)-1] = c.conkey
      )
  loop
    select string_agg(quote_ident(a.attname), ', ' order by u.ord)
      into cols
    from unnest(r.conkey) with ordinality u(attnum,ord)
    join pg_attribute a on a.attrelid=r.conrelid and a.attnum=u.attnum;

    idx_name := left('idx_'||r.relname||'_fk_'||substr(md5(r.conname),1,8),63);
    execute format('create index if not exists %I on %I.%I (%s)',idx_name,r.nspname,r.relname,cols);
  end loop;
end $$;
