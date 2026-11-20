-- Applied to Supabase project vjblrglalptgdxabteqm on 2026-11-20 as migration "edge_rate_limits".
-- Per-key hit counters for edge functions (supabase/functions/_shared/rate-limit.ts). Only the service role may use them.
create table if not exists public.edge_rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
create index if not exists edge_rate_limits_window_start on public.edge_rate_limits (window_start);
alter table public.edge_rate_limits enable row level security;

-- counts one hit in the current fixed window and returns whether it is still within p_limit
create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.edge_rate_limits (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = edge_rate_limits.hits + 1
  returning hits into n;
  -- old windows are useless; clear them now and then instead of running a cron job
  if random() < 0.01 then
    delete from public.edge_rate_limits where window_start < now() - interval '2 days';
  end if;
  return n <= p_limit;
end $$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
