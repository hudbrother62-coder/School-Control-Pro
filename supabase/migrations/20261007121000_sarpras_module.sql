-- SekolaPro Sarana & Prasarana
-- No photo/image/blob columns by design. Brand is required for every item/procurement.

create table if not exists public.sc_sarpras_rooms(
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 code text not null check(length(trim(code)) between 1 and 50),
 name text not null check(length(trim(name)) between 1 and 160),
 building text,floor text,capacity integer check(capacity is null or capacity>=0),
 condition text not null default 'Baik',
 status text not null default 'active' check(status in ('active','maintenance','inactive','archived')),
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(school_id,code)
);

create table if not exists public.sc_sarpras_items(
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 item_type text not null default 'asset' check(item_type in ('asset','consumable')),
 name text not null check(length(trim(name)) between 1 and 200),
 brand text not null check(length(trim(brand)) between 1 and 120),
 model text,category text,inventory_code text,serial_number text,
 room_id uuid references public.sc_sarpras_rooms(id) on delete set null,
 unit text not null default 'unit',quantity numeric(14,2) not null default 1 check(quantity>=0),
 min_stock numeric(14,2) not null default 0 check(min_stock>=0),
 condition text not null default 'Baik',
 status text not null default 'available' check(status in ('available','loaned','maintenance','lost','inactive','archived','active')),
 acquired_at date,acquisition_source text,acquisition_price numeric(16,2) not null default 0 check(acquisition_price>=0),
 custodian_staff_id uuid references public.sc_staff(id) on delete set null,
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index if not exists sc_sarpras_items_inventory_uniq on public.sc_sarpras_items(school_id,inventory_code) where inventory_code is not null and length(trim(inventory_code))>0;
create index if not exists sc_sarpras_items_school_idx on public.sc_sarpras_items(school_id,item_type,status,category);
create index if not exists sc_sarpras_items_room_idx on public.sc_sarpras_items(school_id,room_id);

create table if not exists public.sc_sarpras_requests(
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 kind text not null check(kind in ('item_loan','room_loan','repair','procurement','stock_request')),
 item_id uuid references public.sc_sarpras_items(id) on delete set null,
 room_id uuid references public.sc_sarpras_rooms(id) on delete set null,
 requester_user_id uuid default auth.uid(),
 requester_name text not null check(length(trim(requester_name)) between 1 and 180),
 quantity numeric(14,2) not null default 1 check(quantity>0),
 purpose text not null check(length(trim(purpose)) between 2 and 500),
 start_at timestamptz,end_at timestamptz,
 priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
 status text not null default 'submitted' check(status in ('submitted','approved','rejected','borrowed','returned','in_progress','completed','cancelled')),
 approved_by uuid,approved_at timestamptz,returned_at timestamptz,notes text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists sc_sarpras_requests_school_idx on public.sc_sarpras_requests(school_id,status,kind,created_at desc);

create table if not exists public.sc_sarpras_maintenance(
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 item_id uuid not null references public.sc_sarpras_items(id) on delete restrict,
 issue text not null check(length(trim(issue)) between 2 and 500),
 action text,vendor text,cost numeric(16,2) not null default 0 check(cost>=0),
 priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
 status text not null default 'open' check(status in ('open','scheduled','in_progress','completed','cancelled')),
 reported_by uuid default auth.uid(),due_at date,completed_at timestamptz,notes text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists sc_sarpras_maintenance_school_idx on public.sc_sarpras_maintenance(school_id,status,due_at,created_at desc);

create table if not exists public.sc_sarpras_procurements(
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 item_type text not null default 'asset' check(item_type in ('asset','consumable')),
 item_name text not null check(length(trim(item_name)) between 1 and 200),
 brand text not null check(length(trim(brand)) between 1 and 120),
 model text,category text,vendor text,
 quantity numeric(14,2) not null default 1 check(quantity>0),
 unit text not null default 'unit',unit_price numeric(16,2) not null default 0 check(unit_price>=0),
 fund_source text,status text not null default 'requested' check(status in ('requested','approved','ordered','received','cancelled')),
 ordered_at date,received_at date,notes text,created_by uuid default auth.uid(),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists sc_sarpras_procurements_school_idx on public.sc_sarpras_procurements(school_id,status,created_at desc);

create table if not exists public.sc_sarpras_stocktakes(
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 title text not null check(length(trim(title)) between 2 and 180),
 room_id uuid references public.sc_sarpras_rooms(id) on delete set null,
 status text not null default 'draft' check(status in ('draft','active','review','completed','cancelled')),
 started_at timestamptz,completed_at timestamptz,created_by uuid default auth.uid(),notes text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

create table if not exists public.sc_sarpras_stocktake_items(
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 stocktake_id uuid not null references public.sc_sarpras_stocktakes(id) on delete cascade,
 item_id uuid not null references public.sc_sarpras_items(id) on delete cascade,
 expected_quantity numeric(14,2) not null default 1,counted_quantity numeric(14,2),
 expected_condition text,observed_condition text,
 result text not null default 'unchecked' check(result in ('unchecked','matched','quantity_mismatch','condition_changed','missing','moved')),
 notes text,verified_at timestamptz,unique(stocktake_id,item_id)
);

create table if not exists public.sc_sarpras_movements(
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.sc_schools(id) on delete cascade,
 item_id uuid not null references public.sc_sarpras_items(id) on delete cascade,
 from_room_id uuid references public.sc_sarpras_rooms(id) on delete set null,
 to_room_id uuid references public.sc_sarpras_rooms(id) on delete set null,
 reason text not null check(length(trim(reason)) between 2 and 500),
 moved_by uuid default auth.uid(),moved_at timestamptz not null default now()
);

alter table public.sc_sarpras_rooms enable row level security;
alter table public.sc_sarpras_items enable row level security;
alter table public.sc_sarpras_requests enable row level security;
alter table public.sc_sarpras_maintenance enable row level security;
alter table public.sc_sarpras_procurements enable row level security;
alter table public.sc_sarpras_stocktakes enable row level security;
alter table public.sc_sarpras_stocktake_items enable row level security;
alter table public.sc_sarpras_movements enable row level security;

do $$ begin create policy sc_sarpras_rooms_read on public.sc_sarpras_rooms for select to authenticated using(public.sc_member(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_rooms_write on public.sc_sarpras_rooms for all to authenticated using(public.sc_write_active(school_id)) with check(public.sc_write_active(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_items_read on public.sc_sarpras_items for select to authenticated using(public.sc_member(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_items_write on public.sc_sarpras_items for all to authenticated using(public.sc_write_active(school_id)) with check(public.sc_write_active(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_requests_read on public.sc_sarpras_requests for select to authenticated using(public.sc_member(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_requests_write on public.sc_sarpras_requests for all to authenticated using(public.sc_write_active(school_id)) with check(public.sc_write_active(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_maintenance_read on public.sc_sarpras_maintenance for select to authenticated using(public.sc_member(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_maintenance_write on public.sc_sarpras_maintenance for all to authenticated using(public.sc_write_active(school_id)) with check(public.sc_write_active(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_procurements_read on public.sc_sarpras_procurements for select to authenticated using(public.sc_member(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_procurements_write on public.sc_sarpras_procurements for all to authenticated using(public.sc_write_active(school_id)) with check(public.sc_write_active(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_stocktakes_read on public.sc_sarpras_stocktakes for select to authenticated using(public.sc_member(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_stocktakes_write on public.sc_sarpras_stocktakes for all to authenticated using(public.sc_write_active(school_id)) with check(public.sc_write_active(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_stocktake_items_read on public.sc_sarpras_stocktake_items for select to authenticated using(public.sc_member(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_stocktake_items_write on public.sc_sarpras_stocktake_items for all to authenticated using(public.sc_write_active(school_id)) with check(public.sc_write_active(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_movements_read on public.sc_sarpras_movements for select to authenticated using(public.sc_member(school_id)); exception when duplicate_object then null; end $$;
do $$ begin create policy sc_sarpras_movements_write on public.sc_sarpras_movements for all to authenticated using(public.sc_write_active(school_id)) with check(public.sc_write_active(school_id)); exception when duplicate_object then null; end $$;

grant select,insert,update,delete on public.sc_sarpras_rooms,public.sc_sarpras_items,public.sc_sarpras_requests,public.sc_sarpras_maintenance,public.sc_sarpras_procurements,public.sc_sarpras_stocktakes,public.sc_sarpras_stocktake_items,public.sc_sarpras_movements to authenticated;

create or replace function public.sc_sarpras_create_room_booking(p_school uuid,p_room uuid,p_requester_name text,p_purpose text,p_start timestamptz,p_end timestamptz,p_priority text default 'normal',p_notes text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if not public.sc_write_active(p_school) then raise exception 'Akses tulis sekolah tidak aktif'; end if;
 if p_start is null or p_end is null or p_end<=p_start then raise exception 'Rentang waktu tidak valid'; end if;
 if exists(select 1 from public.sc_sarpras_requests where school_id=p_school and room_id=p_room and kind='room_loan' and status in ('approved','borrowed','in_progress') and tstzrange(start_at,end_at,'[)')&&tstzrange(p_start,p_end,'[)')) then raise exception 'Ruangan sudah digunakan pada waktu tersebut'; end if;
 insert into public.sc_sarpras_requests(school_id,kind,room_id,requester_user_id,requester_name,purpose,start_at,end_at,priority,notes)
 values(p_school,'room_loan',p_room,auth.uid(),trim(p_requester_name),trim(p_purpose),p_start,p_end,p_priority,nullif(trim(coalesce(p_notes,'')),''))
 returning id into v_id;
 return v_id;
end $$;
grant execute on function public.sc_sarpras_create_room_booking(uuid,uuid,text,text,timestamptz,timestamptz,text,text) to authenticated;

create or replace function public.sc_sarpras_transition_request(p_school uuid,p_request uuid,p_next text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.sc_sarpras_requests%rowtype;
begin
 if not public.sc_write_active(p_school) then raise exception 'Akses tulis sekolah tidak aktif'; end if;
 if p_next not in ('approved','rejected','borrowed','returned','in_progress','completed','cancelled') then raise exception 'Status tujuan tidak valid'; end if;
 select * into r from public.sc_sarpras_requests where id=p_request and school_id=p_school for update;
 if not found then raise exception 'Permintaan tidak ditemukan'; end if;
 if r.kind='room_loan' and p_next='approved' and exists(select 1 from public.sc_sarpras_requests x where x.school_id=p_school and x.room_id=r.room_id and x.kind='room_loan' and x.id<>r.id and x.status in ('approved','borrowed','in_progress') and tstzrange(x.start_at,x.end_at,'[)')&&tstzrange(r.start_at,r.end_at,'[)')) then raise exception 'Ruangan sudah digunakan pada waktu tersebut'; end if;
 if r.kind='item_loan' and p_next='borrowed' then
  perform 1 from public.sc_sarpras_items where id=r.item_id and school_id=p_school and status in ('available','active') for update;
  if not found then raise exception 'Barang tidak tersedia untuk dipinjam'; end if;
  update public.sc_sarpras_items set status='loaned',updated_at=now() where id=r.item_id and school_id=p_school;
 end if;
 if r.kind='item_loan' and p_next='returned' and r.item_id is not null then update public.sc_sarpras_items set status='available',updated_at=now() where id=r.item_id and school_id=p_school and item_type='asset'; end if;
 update public.sc_sarpras_requests set status=p_next,approved_by=case when p_next='approved' then auth.uid() else approved_by end,approved_at=case when p_next='approved' then now() else approved_at end,returned_at=case when p_next='returned' then now() else returned_at end,updated_at=now() where id=p_request and school_id=p_school;
 return true;
end $$;
grant execute on function public.sc_sarpras_transition_request(uuid,uuid,text) to authenticated;

create or replace function public.sc_sarpras_move_item(p_school uuid,p_item uuid,p_to_room uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_from uuid;
begin
 if not public.sc_write_active(p_school) then raise exception 'Akses tulis sekolah tidak aktif'; end if;
 select room_id into v_from from public.sc_sarpras_items where id=p_item and school_id=p_school for update;
 if not found then raise exception 'Barang tidak ditemukan'; end if;
 insert into public.sc_sarpras_movements(school_id,item_id,from_room_id,to_room_id,reason,moved_by) values(p_school,p_item,v_from,p_to_room,trim(p_reason),auth.uid());
 update public.sc_sarpras_items set room_id=p_to_room,updated_at=now() where id=p_item and school_id=p_school;
 return true;
end $$;
grant execute on function public.sc_sarpras_move_item(uuid,uuid,uuid,text) to authenticated;
