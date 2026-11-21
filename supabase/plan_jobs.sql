-- Plans made on the server (docs/superpowers/specs/2026-11-21-server-plan-jobs-design.md).
-- generate-itinerary stores one row per plan, appends each finished day, and a run holds a lease so only one run works on a job;
-- pg_cron pokes running jobs whose lease is free (see plan_jobs_tick below). Only the edge function (service role) touches this.
-- Checks: supabase/plan_jobs_check.sql

create table if not exists public.plan_jobs (
  id uuid primary key default gen_random_uuid(),
  token text not null,                      -- given to the app instead of a login, so guests can ask for their plan
  owner text not null,                      -- 'user:<uuid>' or the guest device id; the free-plan quota is counted on it
  request jsonb not null,                   -- the generate-itinerary request body, conversation included
  total_days int not null check (total_days between 1 and 60),
  days jsonb not null default '[]'::jsonb,  -- finished days in trip order
  title text,
  status text not null default 'running' check (status in ('running', 'done', 'failed', 'stopped')),
  error text,
  attempts int not null default 0,          -- runs in a row that saved no day
  lease_until timestamptz,                  -- a run is working on it until then
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- The app's trip id (migration plan_jobs_minors): a retried start whose first reply was lost gets the same job, not a second plan
alter table public.plan_jobs add column if not exists client_key text;
create unique index if not exists plan_jobs_client_key on public.plan_jobs (owner, client_key) where client_key is not null;
alter table public.plan_jobs enable row level security;
create index if not exists plan_jobs_running on public.plan_jobs (lease_until) where status = 'running';

-- Take the job for one run: only while running and nobody holds it. A job with 4 empty runs in a row,
-- or 2 hours after it started (created_at; resume restarts it), ends as failed instead (no endless runs paying for AI).
-- Null = not yours to run.
create or replace function public.plan_job_claim(p_id uuid, p_token text)
returns public.plan_jobs language plpgsql set search_path = '' as $$
declare j public.plan_jobs;
begin
  update public.plan_jobs
     set status = 'failed', error = coalesce(error, 'stalled'), lease_until = null, updated_at = now()
   where id = p_id and token = p_token and status = 'running' and (lease_until is null or lease_until < now())
     and (attempts >= 4 or created_at < now() - interval '2 hours');
  update public.plan_jobs
     set lease_until = now() + interval '160 seconds', attempts = attempts + 1, updated_at = now()
   where id = p_id and token = p_token and status = 'running' and (lease_until is null or lease_until < now())
  returning * into j;
  return j;
end $$;

-- Save the next day (p_index = days saved so far) and keep the lease; the last day finishes the job.
-- Saving day 1 also counts the plan's free trip on its owner, in the same transaction: never lost, never twice (migration plan_jobs_minors).
-- Null = the job was stopped or that day is already saved, so the run should end.
create or replace function public.plan_job_add_day(p_id uuid, p_index int, p_day jsonb, p_title text)
returns int language plpgsql set search_path = '' as $$
declare n int; who text;
begin
  update public.plan_jobs
     set days = days || jsonb_build_array(p_day),
         title = coalesce(title, p_title),
         attempts = 0,
         status = case when p_index + 1 >= total_days then 'done' else status end,
         lease_until = case when p_index + 1 >= total_days then null else now() + interval '160 seconds' end,
         updated_at = now()
   where id = p_id and status = 'running' and jsonb_array_length(days) = p_index
  returning jsonb_array_length(days), owner into n, who;
  if n = 1 then perform public.increment_guest_generation_usage(who); end if;
  return n;
end $$;

revoke all on function public.plan_job_claim(uuid, text) from public, anon, authenticated;
revoke all on function public.plan_job_add_day(uuid, int, jsonb, text) from public, anon, authenticated;

-- Every 15 s, poke running jobs that nobody is working on: a run that stopped before the worker's time limit, or one
-- that was cut, whose lease ran out. The function claims the lease, so a poke during a live run does nothing.
-- (migration plan_jobs_tick; the publishable key is the app's public key)
select cron.schedule('plan-jobs-tick', '15 seconds', $tick$
  select net.http_post(
    url := 'https://vjblrglalptgdxabteqm.supabase.co/functions/v1/generate-itinerary',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable_ThF183z7kk5KPpjGxBggFQ_Op7La_La'),
    body := jsonb_build_object('jobId', id, 'token', token),
    timeout_milliseconds := 5000
  )
  from public.plan_jobs
  where status = 'running' and (lease_until is null or lease_until < now())
  limit 10;
$tick$);

-- Keep one week of pg_cron run history: the 15 s tick adds about 5,760 rows a day (migration plan_jobs_minors)
select cron.schedule('purge-cron-history', '23 3 * * *', $purge$ delete from cron.job_run_details where end_time < now() - interval '7 days' $purge$);
