create table if not exists public.sc_library_titles (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 240),
 author text,
 publisher text,
 publication_year integer check (publication_year is null or publication_year between 1000 and 2200),
 isbn text,
 classification text,
 category text,
 shelf_location text,
 source text,
 purchase_price numeric(14,2) not null default 0 check (purchase_price >= 0),
 notes text,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists sc_library_titles_school_title_idx on public.sc_library_titles(school_id,title);
create unique index if not exists sc_library_titles_isbn_uniq on public.sc_library_titles(school_id,isbn) where isbn is not null and length(trim(isbn))>0;

create table if not exists public.sc_library_copies (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 title_id uuid not null references public.sc_library_titles(id) on delete cascade,
 inventory_code text not null check (length(trim(inventory_code)) between 1 and 80),
 barcode text,
 condition text not null default 'Baik',
 status text not null default 'available' check (status in ('available','loaned','maintenance','lost','archived')),
 acquired_at date,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(school_id,inventory_code)
);
create index if not exists sc_library_copies_title_idx on public.sc_library_copies(school_id,title_id,status);
create unique index if not exists sc_library_copies_barcode_uniq on public.sc_library_copies(school_id,barcode) where barcode is not null and length(trim(barcode))>0;

create table if not exists public.sc_library_loans (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 copy_id uuid not null references public.sc_library_copies(id) on delete restrict,
 borrower_type text not null default 'student' check (borrower_type in ('student','staff','other')),
 borrower_id uuid,
 borrower_name text not null check (length(trim(borrower_name)) between 1 and 180),
 borrowed_at timestamptz not null default now(),
 due_at date not null,
 returned_at timestamptz,
 status text not null default 'active' check (status in ('active','returned','overdue','lost')),
 notes text,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists sc_library_loans_active_idx on public.sc_library_loans(school_id,status,due_at);
create index if not exists sc_library_loans_borrower_idx on public.sc_library_loans(school_id,borrower_id,borrower_name);

create table if not exists public.sc_library_visits (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 visitor_type text not null default 'student' check (visitor_type in ('student','staff','other','class')),
 visitor_id uuid,
 visitor_name text not null check (length(trim(visitor_name)) between 1 and 180),
 purpose text,
 visited_at timestamptz not null default now(),
 notes text,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now()
);
create index if not exists sc_library_visits_school_date_idx on public.sc_library_visits(school_id,visited_at desc);

create table if not exists public.sc_library_acquisitions (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 title_id uuid references public.sc_library_titles(id) on delete set null,
 item_title text not null check (length(trim(item_title)) between 1 and 240),
 supplier text,
 source_fund text,
 quantity integer not null default 1 check (quantity > 0),
 unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
 ordered_at date,
 received_at date,
 status text not null default 'requested' check (status in ('requested','ordered','received','cancelled')),
 notes text,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists sc_library_acquisitions_school_idx on public.sc_library_acquisitions(school_id,status,created_at desc);

create table if not exists public.sc_library_maintenance (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 copy_id uuid references public.sc_library_copies(id) on delete set null,
 action text not null check (length(trim(action)) between 1 and 180),
 condition_before text,
 condition_after text,
 cost numeric(14,2) not null default 0 check (cost >= 0),
 handled_at date not null default current_date,
 notes text,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now()
);
create index if not exists sc_library_maintenance_school_idx on public.sc_library_maintenance(school_id,handled_at desc);

alter table public.sc_library_titles enable row level security;
alter table public.sc_library_copies enable row level security;
alter table public.sc_library_loans enable row level security;
alter table public.sc_library_visits enable row level security;
alter table public.sc_library_acquisitions enable row level security;
alter table public.sc_library_maintenance enable row level security;

do $$ begin create policy sc_library_titles_read on public.sc_library_titles for select to authenticated using (public.sc_member(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_library_titles_write on public.sc_library_titles for all to authenticated using (public.sc_write_active(school_id)) with check (public.sc_write_active(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_library_copies_read on public.sc_library_copies for select to authenticated using (public.sc_member(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_library_copies_write on public.sc_library_copies for all to authenticated using (public.sc_write_active(school_id)) with check (public.sc_write_active(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_library_loans_read on public.sc_library_loans for select to authenticated using (public.sc_member(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_library_loans_write on public.sc_library_loans for all to authenticated using (public.sc_write_active(school_id)) with check (public.sc_write_active(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_library_visits_read on public.sc_library_visits for select to authenticated using (public.sc_member(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_library_visits_write on public.sc_library_visits for all to authenticated using (public.sc_write_active(school_id)) with check (public.sc_write_active(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_library_acquisitions_read on public.sc_library_acquisitions for select to authenticated using (public.sc_member(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_library_acquisitions_write on public.sc_library_acquisitions for all to authenticated using (public.sc_write_active(school_id)) with check (public.sc_write_active(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_library_maintenance_read on public.sc_library_maintenance for select to authenticated using (public.sc_member(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_library_maintenance_write on public.sc_library_maintenance for all to authenticated using (public.sc_write_active(school_id)) with check (public.sc_write_active(school_id)); exception when duplicate_object then null; end $$;

grant select,insert,update,delete on public.sc_library_titles,public.sc_library_copies,public.sc_library_loans,public.sc_library_visits,public.sc_library_acquisitions,public.sc_library_maintenance to authenticated;

create or replace function public.sc_library_checkout(
 p_school uuid,p_copy uuid,p_borrower_type text,p_borrower_id uuid,p_borrower_name text,p_due_at date,p_notes text default null
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_loan uuid;
begin
 if not public.sc_write_active(p_school) then raise exception 'Akses tulis sekolah tidak aktif'; end if;
 if p_borrower_type not in ('student','staff','other') then raise exception 'Jenis peminjam tidak valid'; end if;
 if trim(coalesce(p_borrower_name,''))='' then raise exception 'Nama peminjam wajib'; end if;
 if p_due_at < current_date then raise exception 'Tanggal kembali tidak boleh sebelum hari ini'; end if;
 perform 1 from public.sc_library_copies where id=p_copy and school_id=p_school and status='available' for update;
 if not found then raise exception 'Eksemplar tidak tersedia'; end if;
 insert into public.sc_library_loans(school_id,copy_id,borrower_type,borrower_id,borrower_name,due_at,notes,created_by)
 values(p_school,p_copy,p_borrower_type,p_borrower_id,trim(p_borrower_name),p_due_at,nullif(trim(coalesce(p_notes,'')),''),auth.uid())
 returning id into v_loan;
 update public.sc_library_copies set status='loaned',updated_at=now() where id=p_copy and school_id=p_school;
 return v_loan;
end $$;

create or replace function public.sc_library_return(
 p_school uuid,p_loan uuid,p_condition text default null,p_notes text default null
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_copy uuid;
begin
 if not public.sc_write_active(p_school) then raise exception 'Akses tulis sekolah tidak aktif'; end if;
 select copy_id into v_copy from public.sc_library_loans where id=p_loan and school_id=p_school and status in ('active','overdue') for update;
 if v_copy is null then raise exception 'Peminjaman aktif tidak ditemukan'; end if;
 update public.sc_library_loans set status='returned',returned_at=now(),notes=coalesce(nullif(trim(coalesce(p_notes,'')),''),notes),updated_at=now() where id=p_loan and school_id=p_school;
 update public.sc_library_copies set status='available',condition=coalesce(nullif(trim(coalesce(p_condition,'')),''),condition),updated_at=now() where id=v_copy and school_id=p_school;
 return true;
end $$;
grant execute on function public.sc_library_checkout(uuid,uuid,text,uuid,text,date,text) to authenticated;
grant execute on function public.sc_library_return(uuid,uuid,text,text) to authenticated;
