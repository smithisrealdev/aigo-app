-- Applied to Supabase project vjblrglalptgdxabteqm on 2026-11-20 as migration "guest_quota_and_skeleton_cache".
-- Recreated from how _shared/guest-quota.ts and generate-itinerary use them; production made these outside the migration files.
create table if not exists public.itinerary_skeleton_cache (
  cache_key text primary key,
  skeleton jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.itinerary_skeleton_cache enable row level security;

create table if not exists public.guest_sessions (
  device_id text primary key,
  chat_messages_used integer not null default 0,
  chat_messages_limit integer not null default 10,
  trips_generated integer not null default 0,
  trips_limit integer not null default 1,
  quota_reset_at timestamptz not null default now() + interval '7 days',
  last_trip jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.guest_sessions enable row level security;

-- one row per device; the weekly window restarts once it has passed
create or replace function public._guest_session(p_device_id text) returns public.guest_sessions
language plpgsql security definer set search_path = public as $$
declare g public.guest_sessions;
begin
  insert into public.guest_sessions (device_id) values (p_device_id) on conflict (device_id) do nothing;
  update public.guest_sessions
     set chat_messages_used = 0, trips_generated = 0, quota_reset_at = now() + interval '7 days', updated_at = now()
   where device_id = p_device_id and quota_reset_at <= now();
  select * into g from public.guest_sessions where device_id = p_device_id;
  return g;
end $$;

create or replace function public.check_guest_chat_quota(p_device_id text)
returns table(allowed boolean, messages_used integer, messages_limit integer, reset_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare g public.guest_sessions := public._guest_session(p_device_id);
begin
  return query select g.chat_messages_used < g.chat_messages_limit, g.chat_messages_used, g.chat_messages_limit, g.quota_reset_at;
end $$;

create or replace function public.check_guest_generation_quota(p_device_id text)
returns table(allowed boolean, trips_used integer, trips_limit integer, reset_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare g public.guest_sessions := public._guest_session(p_device_id);
begin
  return query select g.trips_generated < g.trips_limit, g.trips_generated, g.trips_limit, g.quota_reset_at;
end $$;

create or replace function public.increment_guest_chat_usage(p_device_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._guest_session(p_device_id);
  update public.guest_sessions set chat_messages_used = chat_messages_used + 1, updated_at = now() where device_id = p_device_id;
end $$;

create or replace function public.increment_guest_generation_usage(p_device_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._guest_session(p_device_id);
  update public.guest_sessions set trips_generated = trips_generated + 1, updated_at = now() where device_id = p_device_id;
end $$;

create or replace function public.save_guest_trip(p_device_id text, p_trip_data jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  perform public._guest_session(p_device_id);
  update public.guest_sessions set last_trip = p_trip_data, updated_at = now() where device_id = p_device_id;
  return found;
end $$;

-- only edge functions (service role) may touch guest quotas
revoke all on function public._guest_session(text), public.check_guest_chat_quota(text), public.check_guest_generation_quota(text),
  public.increment_guest_chat_usage(text), public.increment_guest_generation_usage(text), public.save_guest_trip(text, jsonb)
  from public, anon, authenticated;
grant execute on function public._guest_session(text), public.check_guest_chat_quota(text), public.check_guest_generation_quota(text),
  public.increment_guest_chat_usage(text), public.increment_guest_generation_usage(text), public.save_guest_trip(text, jsonb)
  to service_role;
