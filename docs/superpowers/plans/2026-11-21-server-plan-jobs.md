# Server-side plan jobs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A plan keeps being made on the server until every day is saved, whether the app is open, in the background or closed.

**Architecture:** `generate-itinerary` gains a job API: `start` stores a `plan_jobs` row and kicks a run; a run claims the row's lease, makes the next missing days with the existing streaming pipeline and appends each finished day to the row; `pg_cron` pokes free running jobs every 15 s through `pg_net`. The app keeps `{ job, token }` on the trip and polls `status` while it is on screen.

**Tech Stack:** Supabase Postgres (pg_cron 1.6, pg_net 0.20), Edge Functions (Deno, `EdgeRuntime.waitUntil`), Expo / React Native app.

**Spec:** `docs/superpowers/specs/2026-11-21-server-plan-jobs-design.md`

## Global Constraints

- Quota is counted once per job, when its first day is saved, on `owner` (`user:<id>` or the device id).
- A run never starts on a worker older than 20 s; it stops before `TIME_BUDGET_MS` (125 s) like today.
- 4 claims in a row without a new day, or a job older than 2 hours, ends as `failed`.
- `plan_jobs` has RLS on and no policies; only the edge function (service role) and the cron job touch it.
- The SSE mode stays for `replanDay`.
- Copy on the planning screen: "ปิดแอปได้เลย ฉันวางแผนต่อบนเซิร์ฟเวอร์ เปิดแอปเมื่อไหร่ก็เห็นแผน".

## Review Focus

- A cron poke and a kick arriving together for the same job: only one run may claim it (lease) — Task 1 test "second claim returns null".
- A run killed by the worker limit mid-day: the lease expires and the next poke continues from the saved days, no duplicate day — Task 3 test.
- Stop pressed while a day is being written: the day append must fail and the run must end — Task 1 test "add_day on stopped job returns null".
- Wrong or missing token on status/stop/resume: 403, no data — Task 2 test.
- Whole-trip cache hit on `start`: all days saved at once and status `done` — Task 2 (cache path in job mode).

---

### Task 1: `plan_jobs` table and lease functions

**Files:** Create `supabase/plan_jobs.sql` (applied as migration `plan_jobs`)

**Produces:** table `public.plan_jobs(id uuid, token text, owner text, request jsonb, total_days int, days jsonb, title text, status text, error text, attempts int, lease_until timestamptz, created_at, updated_at)`; `plan_job_claim(p_id uuid, p_token text) returns plan_jobs` (null when not claimable; marks `failed` when attempts ≥ 4 or older than 2 h); `plan_job_add_day(p_id uuid, p_index int, p_day jsonb, p_title text) returns int` (new day count, null when stopped or index is not the next one; sets `done` and clears the lease on the last day). Execute revoked from `anon` and `authenticated`.

- [ ] Apply the migration; SQL checks on a throwaway row: claim → row; claim again → null; add_day(0) → 1; add_day(0) again → null; stop then add_day(1) → null; attempts = 4 then claim → status `failed`; last day → `done`, lease null. Delete the row.

### Task 2: job API in `generate-itinerary`

**Files:** Modify `supabase/functions/generate-itinerary/index.ts`

**Consumes:** Task 1 functions. **Produces:** POST bodies `{ job: 'start', ...GenerateItinerary }` → `{ jobId, token, totalDays }`; `{ jobId, token }` → 202 (run in background) / 409 (not claimed) / 503 (worker too old); `{ job: 'status', jobId, token, have }` → `{ status, totalDays, title, error, days (from index have) }`; `{ job: 'stop' | 'resume', jobId, token }` → `{ status }`. Wrong token → 403.

- [ ] Job run builds the request from the row (`fromDay` = saved days + 1, `planned` from saved days), skips quota checks and IP limits, counts quota on `owner` when fromDay is 1; `writeSSE` goes to a job sink (day_complete → `plan_job_add_day`, a null result stops the run; complete → add any remaining days; error → release the lease with the error); stopped early → release the lease.
- [ ] `start` and `resume` kick a run with a fetch to the function itself inside `EdgeRuntime.waitUntil`.
- [ ] Deploy; from a script as a new guest device: start a 2-day trip, never poll, then read the row until `done` with 2 days; status with a bad token → 403; quota row for the device counts 1.

### Task 3: cron tick

**Files:** Modify `supabase/plan_jobs.sql` (migration `plan_jobs_tick`)

- [ ] `cron.schedule('plan-jobs-tick', '15 seconds', …)` posting `{ jobId, token }` with the publishable key for `running` jobs whose lease is free or expired.
- [ ] Kill test: start a 3-day job, after day 1 set `lease_until` to the past while a run is going; the job still ends `done` with 3 distinct days.

### Task 4: app uses jobs

**Files:** Modify `src/lib/backend.ts`, `src/lib/itinerary.ts` (+ test), `src/lib/tripStore.tsx`, `src/app/work.tsx`

**Produces:** `startPlan(req: GenRequest, messages: ChatMessage[]): Promise<PlanRef>`, `planStatus(ref: PlanRef, have: number): Promise<PlanState>`, `stopPlan(ref)`, `resumePlan(ref)` in `backend.ts`; `AppTrip.plan?: PlanInfo` and pure `withPlanState(trip: AppTrip, s: PlanState): AppTrip` in `itinerary.ts`; `planning` in the trip store derived from the open trip's `plan.status`.

- [ ] Test `withPlanState`: new days appended in order, duplicate/old days ignored, `done` keeps every day and drops the raw copies, `failed` keeps days and error.
- [ ] Trip store polls running plans every 3 s while the app is not in the background, on any screen.
- [ ] Work screen starts a job, shows progress from the trip's plan, stop/resume call the API, 429 at start shows the used-quota card; remove `generateItinerary`, `foreground` and `nextRound`.
- [ ] `npx tsc --noEmit`, `npx expo lint`, `npm test`; web export and a screenshot of the running state.

### Task 5: docs, commit, push

- [ ] `docs/backend.md` (job API, cron, table), `docs/phone-test.md` (close the app while planning), commit, push to the work branch and `main`.
