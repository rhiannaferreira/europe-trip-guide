-- Optional: shared daily caps for the live data gateway (api/live.js).
-- Without this, each server instance counts on its own, which is fine for a small site.
-- Run once in Supabase → SQL Editor. Only the server's service_role key can call it; visitors can't.

create table if not exists public.live_usage (
  provider text not null,
  day date not null default (now() at time zone 'utc')::date,
  calls integer not null default 0,
  primary key (provider, day)
);

alter table public.live_usage enable row level security;
-- No policies: the anon and authenticated roles can't read or write it.

-- Count one provider call for today (UTC) and return today's total.
create or replace function public.live_usage_hit(p_provider text)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.live_usage as u (provider, day, calls)
  values (left(p_provider, 40), (now() at time zone 'utc')::date, 1)
  on conflict (provider, day) do update set calls = u.calls + 1
  returning u.calls;
$$;

revoke all on function public.live_usage_hit(text) from public, anon, authenticated;
grant execute on function public.live_usage_hit(text) to service_role;

-- Usage by day, newest first:  select * from public.live_usage order by day desc, provider;
