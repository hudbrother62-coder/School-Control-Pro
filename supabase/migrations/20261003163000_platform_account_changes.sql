-- Platform-only signal for new accounts, account status and login activity.
insert into public.sc_school_changes(school_id) values('00000000-0000-0000-0000-000000000000') on conflict do nothing;
create function public.sc_emit_account_change() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.sc_school_changes(school_id) values('00000000-0000-0000-0000-000000000000') on conflict(school_id) do update set revision=sc_school_changes.revision+1,changed_at=now();
 return null;
end $$;
revoke all on function public.sc_emit_account_change() from public,anon,authenticated;
create trigger sc_account_realtime_insert after insert or delete on auth.users for each row execute function public.sc_emit_account_change();
create trigger sc_account_realtime_update after update of email,last_sign_in_at,banned_until,deleted_at on auth.users for each row execute function public.sc_emit_account_change();
