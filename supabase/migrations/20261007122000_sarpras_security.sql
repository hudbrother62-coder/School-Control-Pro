-- Harden Sarpras permissions and make procurement receiving transactional.

drop policy if exists sc_sarpras_rooms_write on public.sc_sarpras_rooms;
drop policy if exists sc_sarpras_items_write on public.sc_sarpras_items;
drop policy if exists sc_sarpras_requests_write on public.sc_sarpras_requests;
drop policy if exists sc_sarpras_maintenance_write on public.sc_sarpras_maintenance;
drop policy if exists sc_sarpras_procurements_write on public.sc_sarpras_procurements;
drop policy if exists sc_sarpras_stocktakes_write on public.sc_sarpras_stocktakes;
drop policy if exists sc_sarpras_stocktake_items_write on public.sc_sarpras_stocktake_items;
drop policy if exists sc_sarpras_movements_write on public.sc_sarpras_movements;

create policy sc_sarpras_rooms_write on public.sc_sarpras_rooms for all to authenticated
 using(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id))
 with check(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id));
create policy sc_sarpras_items_write on public.sc_sarpras_items for all to authenticated
 using(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id))
 with check(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id));

create policy sc_sarpras_requests_insert on public.sc_sarpras_requests for insert to authenticated
 with check(public.sc_member(school_id) and public.sc_write_active(school_id) and requester_user_id=auth.uid());
create policy sc_sarpras_requests_update on public.sc_sarpras_requests for update to authenticated
 using(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id))
 with check(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id));
create policy sc_sarpras_requests_delete on public.sc_sarpras_requests for delete to authenticated
 using(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id));

create policy sc_sarpras_maintenance_write on public.sc_sarpras_maintenance for all to authenticated
 using(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id))
 with check(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id));
create policy sc_sarpras_procurements_write on public.sc_sarpras_procurements for all to authenticated
 using(public.sc_role(school_id) in ('owner','principal','vice_principal','staff','treasurer','finance_staff') and public.sc_write_active(school_id))
 with check(public.sc_role(school_id) in ('owner','principal','vice_principal','staff','treasurer','finance_staff') and public.sc_write_active(school_id));
create policy sc_sarpras_stocktakes_write on public.sc_sarpras_stocktakes for all to authenticated
 using(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id))
 with check(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id));
create policy sc_sarpras_stocktake_items_write on public.sc_sarpras_stocktake_items for all to authenticated
 using(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id))
 with check(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id));
create policy sc_sarpras_movements_write on public.sc_sarpras_movements for all to authenticated
 using(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id))
 with check(public.sc_role(school_id) in ('owner','principal','vice_principal','staff') and public.sc_write_active(school_id));

create or replace function public.sc_sarpras_transition_request(p_school uuid,p_request uuid,p_next text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.sc_sarpras_requests%rowtype;
begin
 if public.sc_role(p_school) not in ('owner','principal','vice_principal','staff') or not public.sc_write_active(p_school) then raise exception 'Tidak berwenang mengubah status permintaan'; end if;
 if p_next not in ('approved','rejected','borrowed','returned','in_progress','completed','cancelled') then raise exception 'Status tujuan tidak valid'; end if;
 select * into r from public.sc_sarpras_requests where id=p_request and school_id=p_school for update;
 if not found then raise exception 'Permintaan tidak ditemukan'; end if;
 if r.kind='room_loan' and p_next='approved' and exists(
  select 1 from public.sc_sarpras_requests x where x.school_id=p_school and x.room_id=r.room_id and x.kind='room_loan' and x.id<>r.id
   and x.status in ('approved','borrowed','in_progress')
   and tstzrange(x.start_at,x.end_at,'[)')&&tstzrange(r.start_at,r.end_at,'[)')
 ) then raise exception 'Ruangan sudah digunakan pada waktu tersebut'; end if;
 if r.kind='item_loan' and p_next='borrowed' then
  perform 1 from public.sc_sarpras_items where id=r.item_id and school_id=p_school and item_type='asset' and status='available' for update;
  if not found then raise exception 'Barang tidak tersedia untuk dipinjam'; end if;
  update public.sc_sarpras_items set status='loaned',updated_at=now() where id=r.item_id and school_id=p_school;
 end if;
 if r.kind='item_loan' and p_next='returned' and r.item_id is not null then
  update public.sc_sarpras_items set status='available',updated_at=now() where id=r.item_id and school_id=p_school and item_type='asset';
 end if;
 update public.sc_sarpras_requests set status=p_next,
  approved_by=case when p_next='approved' then auth.uid() else approved_by end,
  approved_at=case when p_next='approved' then now() else approved_at end,
  returned_at=case when p_next='returned' then now() else returned_at end,
  updated_at=now()
 where id=p_request and school_id=p_school;
 return true;
end $$;

create or replace function public.sc_sarpras_move_item(p_school uuid,p_item uuid,p_to_room uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_from uuid;
begin
 if public.sc_role(p_school) not in ('owner','principal','vice_principal','staff') or not public.sc_write_active(p_school) then raise exception 'Tidak berwenang memindahkan inventaris'; end if;
 if length(trim(coalesce(p_reason,'')))<2 then raise exception 'Alasan mutasi wajib diisi'; end if;
 select room_id into v_from from public.sc_sarpras_items where id=p_item and school_id=p_school for update;
 if not found then raise exception 'Barang tidak ditemukan'; end if;
 perform 1 from public.sc_sarpras_rooms where id=p_to_room and school_id=p_school and status<>'archived';
 if not found then raise exception 'Ruangan tujuan tidak valid'; end if;
 insert into public.sc_sarpras_movements(school_id,item_id,from_room_id,to_room_id,reason,moved_by)
 values(p_school,p_item,v_from,p_to_room,trim(p_reason),auth.uid());
 update public.sc_sarpras_items set room_id=p_to_room,updated_at=now() where id=p_item and school_id=p_school;
 return true;
end $$;

create or replace function public.sc_sarpras_receive_procurement(p_school uuid,p_procurement uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.sc_sarpras_procurements%rowtype; v_count integer; v_existing uuid;
begin
 if public.sc_role(p_school) not in ('owner','principal','vice_principal','staff','treasurer','finance_staff') or not public.sc_write_active(p_school) then raise exception 'Tidak berwenang menerima pengadaan'; end if;
 select * into r from public.sc_sarpras_procurements where id=p_procurement and school_id=p_school for update;
 if not found then raise exception 'Pengadaan tidak ditemukan'; end if;
 if r.status not in ('approved','ordered') then raise exception 'Pengadaan belum siap diterima'; end if;
 if r.item_type='asset' then
  if r.quantity<>floor(r.quantity) then raise exception 'Jumlah aset harus bilangan bulat'; end if;
  v_count:=r.quantity::integer;
  if v_count<1 or v_count>200 then raise exception 'Penerimaan aset per transaksi maksimal 200 unit'; end if;
  for i in 1..v_count loop
   insert into public.sc_sarpras_items(school_id,item_type,name,brand,model,category,inventory_code,unit,quantity,min_stock,condition,status,acquired_at,acquisition_source,acquisition_price,notes)
   values(p_school,'asset',r.item_name,r.brand,r.model,r.category,
    'SPR-'||extract(year from current_date)::int||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
    r.unit,1,0,'Baik','available',current_date,r.fund_source,r.unit_price,'Dibuat otomatis dari pengadaan '||r.id);
  end loop;
 else
  select id into v_existing from public.sc_sarpras_items
   where school_id=p_school and item_type='consumable' and lower(name)=lower(r.item_name) and lower(brand)=lower(r.brand)
    and lower(coalesce(model,''))=lower(coalesce(r.model,'')) and status<>'archived'
   order by created_at limit 1 for update;
  if v_existing is null then
   insert into public.sc_sarpras_items(school_id,item_type,name,brand,model,category,unit,quantity,min_stock,condition,status,acquired_at,acquisition_source,acquisition_price,notes)
   values(p_school,'consumable',r.item_name,r.brand,r.model,r.category,r.unit,r.quantity,0,'Baik','active',current_date,r.fund_source,r.unit_price,'Dibuat otomatis dari pengadaan '||r.id);
  else
   update public.sc_sarpras_items set quantity=quantity+r.quantity,updated_at=now() where id=v_existing;
  end if;
 end if;
 update public.sc_sarpras_procurements set status='received',received_at=current_date,updated_at=now() where id=r.id and school_id=p_school;
 return true;
end $$;
grant execute on function public.sc_sarpras_transition_request(uuid,uuid,text) to authenticated;
grant execute on function public.sc_sarpras_move_item(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.sc_sarpras_receive_procurement(uuid,uuid) to authenticated;
