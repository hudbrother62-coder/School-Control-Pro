alter table public.sc_calendar_events drop constraint if exists sc_calendar_events_category_check;
alter table public.sc_calendar_events
  add constraint sc_calendar_events_category_check
  check (category = any(array['school'::text,'teaching'::text,'meeting'::text,'training'::text,'program'::text,'other'::text,'personal'::text]));
