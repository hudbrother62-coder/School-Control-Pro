-- Only signed-in tenants may invoke protected library and sarpras transactional RPCs.
-- Existing server-side sc_write_active/sc_role checks remain authoritative.
revoke all on function public.sc_library_checkout(uuid,uuid,text,uuid,text,date,text) from public,anon;
revoke all on function public.sc_library_return(uuid,uuid,text,text) from public,anon;
revoke all on function public.sc_sarpras_create_room_booking(uuid,uuid,text,text,timestamptz,timestamptz,text,text) from public,anon;
revoke all on function public.sc_sarpras_transition_request(uuid,uuid,text) from public,anon;
revoke all on function public.sc_sarpras_move_item(uuid,uuid,uuid,text) from public,anon;
revoke all on function public.sc_sarpras_receive_procurement(uuid,uuid) from public,anon;
grant execute on function public.sc_library_checkout(uuid,uuid,text,uuid,text,date,text) to authenticated;
grant execute on function public.sc_library_return(uuid,uuid,text,text) to authenticated;
grant execute on function public.sc_sarpras_create_room_booking(uuid,uuid,text,text,timestamptz,timestamptz,text,text) to authenticated;
grant execute on function public.sc_sarpras_transition_request(uuid,uuid,text) to authenticated;
grant execute on function public.sc_sarpras_move_item(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.sc_sarpras_receive_procurement(uuid,uuid) to authenticated;