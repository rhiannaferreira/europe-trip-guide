-- Eurowander accounts: saved trips, one row per trip, each visible only to the person who owns it.
--
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste this file > Run.
-- It is safe to run again (it only creates what's missing and replaces the policies).
--
-- The app talks to this table straight from the browser with the project's public anon key.
-- That is safe because of row-level security below: every request carries the signed-in person's
-- token, and the policies only let a person read, add, change or delete rows where user_id is
-- their own id. Signed-out visitors can't read or write anything.

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 200),
  -- The trip exactly as the app keeps it (stops, dates, saved places and their status, itinerary, notes).
  trip jsonb not null,
  -- The budget planner's settings and expenses for this trip.
  budget jsonb,
  -- OpenStreetMap places the trip uses, so they can be shown on another device.
  extra_places jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Keeps one row from growing without limit (a big real trip is well under 100 KB).
  constraint trips_size check (pg_column_size(trip) + coalesce(pg_column_size(budget), 0) + pg_column_size(extra_places) < 1000000)
);

create index if not exists trips_user_updated on public.trips (user_id, updated_at desc);

-- updated_at is set by the database on every change, so every device agrees on which copy is newer.
create or replace function public.trips_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    -- A trip can't be moved to another account, and keeps its creation time.
    new.user_id := old.user_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trips_touch on public.trips;
create trigger trips_touch before insert or update on public.trips
for each row execute function public.trips_touch();

-- Row-level security: each person sees and changes only their own trips.
alter table public.trips enable row level security;

drop policy if exists "Own trips: read" on public.trips;
drop policy if exists "Own trips: add" on public.trips;
drop policy if exists "Own trips: change" on public.trips;
drop policy if exists "Own trips: delete" on public.trips;

create policy "Own trips: read" on public.trips
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Own trips: add" on public.trips
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Own trips: change" on public.trips
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Own trips: delete" on public.trips
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Signed-out visitors (the anon role) get no access at all; signed-in people get only what the policies allow.
revoke all on public.trips from anon;
grant select, insert, update, delete on public.trips to authenticated;
