# Meals and stays in the plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AiGo's plans name lunch and dinner restaurants every day and the hotel for every night, and the plan screen shows them (meal labels, "คืนนี้พักที่…" with photo, price and a booking link).

**Architecture:** generate-itinerary's prompt asks for `meal` on restaurant stops and a `stay` per day; the server already saves day JSON as written. The app maps them in `toAppTrip` (`Place.food`, `Place.meal`, `AppTrip.stays`), text helpers carry them to sharing, chat context and later plan runs, and the plan screen renders them through `StopCard` and `RouteList`'s end row.

**Tech Stack:** Supabase Edge Function (Deno) generate-itinerary, Expo app (TypeScript), node --test.

**Spec:** `docs/superpowers/specs/2026-11-21-meals-and-stays-design.md`

## Global Constraints

- Lunch and dinner every day at named restaurants (category "restaurant", `meal` "lunch" or "dinner"); no breakfast unless asked; a meal may be skipped only when it cannot fit.
- One stay per night; same stay on consecutive nights in a city; none on the trip's last day (the app drops one if the model adds it); a stay is never a place.
- No invented prices (R15c): no `pricePerNight.amount` > 0 → no price shown.
- Trips without meals or stays look exactly as before ("จบวัน · กลับที่พัก").
- Server: deploy with the same files as before (index.ts + `_shared/{cors,auth,validation,guest-quota,rate-limit}.ts`), project `vjblrglalptgdxabteqm`, verify_jwt false.
- Commits end with the session's two attribution lines; push to `claude/awesome-cori-zvsu1f` and `main`.

## Review Focus

1. A trip saved before this change (no `food`, `meal`, `stays`) renders and shares exactly as before — T1 test (toAppTrip/planText on old data), T3 web check with an old trip.
2. A stay over several nights in one city gives one booking range; a city change starts a new one — T1 `stayNights` test.
3. Replanning one day keeps that night's stay when the model leaves it out — T3 (replan merge) reviewer reads; T1 helper test.
4. The model adds a stay on the last day — the app shows "จบทริป", no stay — T1 test.
5. A real plan from the deployed function actually has lunch, dinner and stays — T2 live run.

---

### Task 1: Data model and text helpers (tests first)

**Files:** Modify `src/lib/itinerary.ts`, `src/lib/itinerary.test.ts`, `src/lib/links.ts`, `src/lib/links.test.ts`.

**Interfaces — Produces:**
- `GenPlace` + `category?: string; meal?: string`; `GenStay = { name?: string; area?: string; coordinates?: { lat?: number; lng?: number }; pricePerNight?: { amount?: number; currency?: string } }`; `GenDay` + `stay?: GenStay | null`.
- `Place` + `food?: boolean; meal?: 'lunch' | 'dinner'` (category restaurant/cafe/food → `food`; meal only lunch/dinner).
- `Stay = { name: string; area?: string; lat: number; lon: number; price?: L }` (price `{ th: '~CA$320/คืน', en: '~CA$320/night' }`); `AppTrip.stays?: (Stay | null)[]` indexed by day, `null` on the last day and where there is none.
- `stayNights(stays: (Stay | null)[] | undefined, day: number): { first: number; last: number } | null` — the run of consecutive days with the same stay name around `day`.
- `plannedText` adds `; stay: <name>` per day; `dayLines` (planText, tripContext) marks meals (`(มื้อกลางวัน)` / `(lunch)`) and adds `พัก <name>` / `stay <name>`.
- `stayLink(stay: Stay, trip: { startDate: string; destination: L; people: number; stays?: (Stay | null)[] }, day: number): string` in links.ts — Booking.com via `hotelLink`, checkin = day `first`, checkout = day `last + 1`.

- [ ] Step 1: failing tests: restaurant with meal → `food` true and `meal` 'dinner'; attraction → neither; stays by day with price both languages; amount 0 → no price; stay without name → null; stay on the last day → null; `withPlanState` appends stays; `plannedText` contains `stay: Fairmont Waterfront`; `planText` has the meal label and the stay; old trip (no fields) text unchanged; `stayNights` same-name run and city change; `stayLink` dates and people. Run `npm test` — Expected: fail.
- [ ] Step 2: implement; `npm test`, tsc, lint — Expected: pass. Commit "Plan data: meals and nightly stays (app model and text)".

### Task 2: generate-itinerary asks for meals and stays

**Files:** Modify `supabase/functions/generate-itinerary/index.ts`.

- [ ] Step 1: prompt schema adds `meal` and `stay`; rule 2 = 3–4 places to see plus lunch and dinner at named restaurants near the stops around them at local meal times; new rule: every day has a `stay` except day `totalDays`, unless the special requirements say the trip continues after it; same stay in a city, change on a city move, use the hotel chosen in the conversation; never a place. Server `plannedText` adds `; stay:`. Skeleton cache key gets a version so older cached plans are not served.
- [ ] Step 2: deploy; start a real 3-day job with a fresh client key and poll it to done — Expected: every day has a restaurant with `meal` lunch and one with dinner, days 1–2 have a named `stay`, day 3 has none. Commit "generate-itinerary: lunch, dinner and a stay every night".

### Task 3: Plan screen shows meals and stays

**Files:** Modify `src/components/icon.tsx` (`food`, `bed`), `src/components/ui.tsx` (`StopCard` meal badge; `RouteList` end row takes `photo`, `icon`, `action`), `src/app/itinerary.tsx` (stay end row, "จบทริป" on the last day, replan keeps the stay and tells AiGo tonight's stay).

- [ ] Step 1: make the change.
- [ ] Step 2: web check with a mocked plan (meals, a two-city stay, an old trip): meal labels, "คืนนี้พักที่", price, booking link dates, "จบทริป", old trip unchanged, light/dark, no page errors. tsc, lint, tests. Commit "Plan screen: meal labels and tonight's stay".

### Task 4: Docs, canvas, review, push

- [ ] phone-test rows; spec marked built; canvas boards 3b (light/dark) re-shot; final review; push branch and `main`.
