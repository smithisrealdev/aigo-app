-- Checks for supabase/plan_jobs.sql. Run with execute_sql: raises on the first failure (and nothing is kept),
-- otherwise deletes its own rows (plan_jobs and the guest_sessions quota row of owner 'check') and returns 'plan_jobs ok'.
do $$
declare
  a uuid; b uuid; c uuid; d uuid;
  j public.plan_jobs;
  n int;
  used0 int;
begin
  select coalesce((select trips_generated from public.guest_sessions where device_id = 'check'), 0) into used0;
  insert into public.plan_jobs (token, owner, request, total_days) values ('t', 'check', '{}', 2) returning id into a;

  j := public.plan_job_claim(a, 't');
  if j.id is null or j.attempts <> 1 or j.lease_until is null then raise exception 'first claim should take the lease'; end if;
  if (public.plan_job_claim(a, 't')).id is not null then raise exception 'second claim must not take a held lease'; end if;
  update public.plan_jobs set lease_until = null where id = a;
  if (public.plan_job_claim(a, 'wrong')).id is not null then raise exception 'wrong token must not claim'; end if;

  n := public.plan_job_add_day(a, 0, '{"title":"d1"}', 'Trip');
  if n is distinct from 1 then raise exception 'add_day(0) should give 1, got %', n; end if;
  if (select trips_generated from public.guest_sessions where device_id = 'check') is distinct from used0 + 1 then raise exception 'day 1 should count the free trip once'; end if;
  select * into j from public.plan_jobs where id = a;
  if j.title <> 'Trip' or j.attempts <> 0 or j.status <> 'running' then raise exception 'day 1 should set title, reset attempts, keep running'; end if;
  if public.plan_job_add_day(a, 0, '{"title":"again"}', null) is not null then raise exception 'a day already saved must not be added twice'; end if;
  n := public.plan_job_add_day(a, 1, '{"title":"d2"}', 'Other');
  select * into j from public.plan_jobs where id = a;
  if n is distinct from 2 or j.status <> 'done' or j.lease_until is not null or j.title <> 'Trip' then raise exception 'last day should finish the job and clear the lease'; end if;
  if jsonb_array_length(j.days) <> 2 or j.days->1->>'title' <> 'd2' then raise exception 'days should be kept in order'; end if;
  if (select trips_generated from public.guest_sessions where device_id = 'check') is distinct from used0 + 1 then raise exception 'later days must not count the trip again'; end if;

  update public.plan_jobs set client_key = 'k' where id = a;
  begin
    insert into public.plan_jobs (token, owner, request, total_days, client_key) values ('t', 'check', '{}', 2, 'k');
    raise exception 'one owner must not have two jobs with the same client key';
  exception when unique_violation then null;
  end;

  insert into public.plan_jobs (token, owner, request, total_days, status) values ('t', 'check', '{}', 3, 'stopped') returning id into b;
  if public.plan_job_add_day(b, 0, '{}', null) is not null then raise exception 'a stopped job must not take days'; end if;
  if (public.plan_job_claim(b, 't')).id is not null then raise exception 'a stopped job must not be claimed'; end if;

  insert into public.plan_jobs (token, owner, request, total_days, attempts) values ('t', 'check', '{}', 3, 4) returning id into c;
  if (public.plan_job_claim(c, 't')).id is not null then raise exception 'a job with 4 empty runs must not be claimed'; end if;
  if (select status from public.plan_jobs where id = c) <> 'failed' then raise exception 'a job with 4 empty runs should fail'; end if;

  insert into public.plan_jobs (token, owner, request, total_days, created_at) values ('t', 'check', '{}', 3, now() - interval '3 hours') returning id into d;
  if (public.plan_job_claim(d, 't')).id is not null then raise exception 'a job older than 2 hours must not be claimed'; end if;
  if (select status from public.plan_jobs where id = d) <> 'failed' then raise exception 'a job older than 2 hours should fail'; end if;

  if not (select relrowsecurity from pg_class where oid = 'public.plan_jobs'::regclass) then raise exception 'RLS must be on'; end if;
  if has_function_privilege('anon', 'public.plan_job_claim(uuid, text)', 'execute') or has_function_privilege('authenticated', 'public.plan_job_add_day(uuid, integer, jsonb, text)', 'execute')
    then raise exception 'app roles must not run the job functions'; end if;

  delete from public.plan_jobs where owner = 'check';
  delete from public.guest_sessions where device_id = 'check';
end $$;
select 'plan_jobs ok' as result;
