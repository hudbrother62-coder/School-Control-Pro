do $$
declare
  r record;
  new_qual text;
  new_check text;
  stmt text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname='public' and tablename like 'sc_%'
      and (
        coalesce(qual,'') ~ 'auth\.(uid|role|jwt|email)\(\)'
        or coalesce(with_check,'') ~ 'auth\.(uid|role|jwt|email)\(\)'
      )
  loop
    new_qual := r.qual;
    new_check := r.with_check;
    if new_qual is not null then
      new_qual := replace(new_qual,'auth.uid()','(select auth.uid())');
      new_qual := replace(new_qual,'auth.role()','(select auth.role())');
      new_qual := replace(new_qual,'auth.jwt()','(select auth.jwt())');
      new_qual := replace(new_qual,'auth.email()','(select auth.email())');
    end if;
    if new_check is not null then
      new_check := replace(new_check,'auth.uid()','(select auth.uid())');
      new_check := replace(new_check,'auth.role()','(select auth.role())');
      new_check := replace(new_check,'auth.jwt()','(select auth.jwt())');
      new_check := replace(new_check,'auth.email()','(select auth.email())');
    end if;

    stmt := format('alter policy %I on %I.%I',r.policyname,r.schemaname,r.tablename);
    if new_qual is not null then stmt := stmt || ' using (' || new_qual || ')'; end if;
    if new_check is not null then stmt := stmt || ' with check (' || new_check || ')'; end if;
    execute stmt;
  end loop;
end $$;
