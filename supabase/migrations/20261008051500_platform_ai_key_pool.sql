-- Platform-owned AI key pool. Plaintext provider keys are never stored in Postgres.
-- Values are AES-256-GCM ciphertext produced by the Next.js server using AI_KEY_ENCRYPTION_SECRET.
create table if not exists public.sc_platform_ai_keys (
 slot smallint primary key check (slot between 1 and 7),
 provider text not null default 'gemini' check (provider='gemini'),
 secret_encrypted text not null check (length(secret_encrypted) between 40 and 2048),
 last_four text not null check (length(last_four)=4),
 is_active boolean not null default true,
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);

alter table public.sc_platform_ai_keys enable row level security;
revoke all on public.sc_platform_ai_keys from public,anon;
grant select,insert,update,delete on public.sc_platform_ai_keys to authenticated;

drop policy if exists sc_platform_ai_keys_read_ciphertext on public.sc_platform_ai_keys;
drop policy if exists sc_platform_ai_keys_insert_admin on public.sc_platform_ai_keys;
drop policy if exists sc_platform_ai_keys_update_admin on public.sc_platform_ai_keys;
drop policy if exists sc_platform_ai_keys_delete_admin on public.sc_platform_ai_keys;

-- AI route handlers use the caller's JWT. They may read ciphertext only after membership
-- checks; decryption remains impossible without the server-only Vercel encryption secret.
create policy sc_platform_ai_keys_read_ciphertext on public.sc_platform_ai_keys
 for select to authenticated
 using (
  public.sc_is_platform_admin()
  or exists(select 1 from public.sc_members m where m.user_id=(select auth.uid()))
 );

create policy sc_platform_ai_keys_insert_admin on public.sc_platform_ai_keys
 for insert to authenticated
 with check (public.sc_is_platform_admin());

create policy sc_platform_ai_keys_update_admin on public.sc_platform_ai_keys
 for update to authenticated
 using (public.sc_is_platform_admin())
 with check (public.sc_is_platform_admin());

create policy sc_platform_ai_keys_delete_admin on public.sc_platform_ai_keys
 for delete to authenticated
 using (public.sc_is_platform_admin());

comment on table public.sc_platform_ai_keys is 'Encrypted SekolaPro platform Gemini key pool. No plaintext AI provider key is stored here.';
