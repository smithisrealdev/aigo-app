# Smooth motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One motion language (Animate UI's values on Reanimated) across the app, controls that always answer, skeletons while loading, and three wow moments (planning orb, plan-ready celebration, onboarding parallax).

**Architecture:** `src/theme/motion.ts` holds every spring, curve, scale and the live Reduce Motion hook; `src/components/ui.tsx` consumes it. The map sheet's drag moves to react-native-gesture-handler worklets. Reacticx's EnergyOrb and NumberFlow are copied into `src/components/reacticx/` (MIT, notice kept); the orb has a web fallback. Pure decisions (when a plan just finished) are tested with node.

**Tech Stack:** Expo SDK 58, Reanimated 4.7 + react-native-worklets 0.13, react-native-gesture-handler 3.3, @shopify/react-native-skia (new, `npx expo install`), expo-haptics.

**Spec:** `docs/superpowers/specs/2026-11-21-smooth-motion-design.md`

## Global Constraints

- Values exactly as the spec (Animate UI tokens): springs press 550/30, entrance 200/20, reflow 500/40, selection 300/30, progress 300/35, toast 280/24, checkPop 500/24 (mass 1); curves out `bezier(0.23,1,0.32,1)`, soft `(0.215,0.61,0.355,1)`, drawer `(0.34,1.2,0.64,1)`; sheet/drawer 400 ms; scales press 0.97, card/row 0.985, toast 0.96.
- Transform and opacity only (a small progress bar may scale); no loops off screen or under Reduce Motion; Reduce Motion read live.
- No new dependency except `@shopify/react-native-skia`. No NativeWind. Web must keep working (Skia only on native).
- Celebration only on a running → done change seen on the work screen; plan-done toast only when the user is elsewhere.
- Commits end with the session's two attribution lines; push to `claude/awesome-cori-zvsu1f` and `main`.

## Review Focus

1. Reduce Motion turned on while the app is open: entrances fade without moving, loops stop, the orb is still — reviewer reads T1/T4.
2. Opening the work screen of a plan that is already done must not throw confetti — T3 `finishedNow` test.
3. Dragging the map sheet fast or tapping it must still snap and toggle like before — T2 web check (map-web-check sheet rows).
4. Web build must not load Skia — T4 web export + page-error check.
5. Onboarding swiped quickly back and forth: dots and text follow the finger, no jump on release — reviewer reads T5; web check swipes.

---

### Task 1: Motion values and live Reduce Motion everywhere

**Files:** Create `src/theme/motion.ts`; modify `src/components/ui.tsx`, `src/app/(tabs)/_layout.tsx`, `src/components/tripMap.native.tsx` (use the shared live value).

**Interfaces — Produces:** `spring.{press,entrance,reflow,selection,progress,toast,checkPop}` (`{ stiffness, damping, mass: 1 }`), `ease.{out,soft,drawer}` (Reanimated `Easing.bezier(...)`), `tween.{reveal,sheet,drawer,dismiss}` (`{ duration, easing }`), `scale.{press,choice,toast}`, `reduceMotionNow(): boolean | undefined` (liveSetting), `useReduceMotion(): boolean` (re-renders on change).

- [ ] **Step 1:** Write `src/theme/motion.ts` with those exports.
- [ ] **Step 2:** `usePress` uses `spring.press`; Button, IconButton, Chip press to `scale.press`; PressScale default and its card/row callers (`to={0.98}`) to `scale.choice`; the add-tile `to={0.88}` stays (its own character).
- [ ] **Step 3:** `FadeIn`: entering `FadeInUp` on `spring.entrance`, layout on `spring.reflow`; under Reduce Motion `FadeIn` (opacity only) and no layout animation. Segmented and tab indicator on `spring.selection`; ProgressBar on `spring.progress`; toast on `spring.toast` (from `scale.toast`), leaving `FadeOutDown`; done marks on `spring.checkPop`; the three loops use `useReduceMotion()`.
- [ ] **Step 4: Verify** `npx tsc --noEmit`, `npx expo lint`, `npm test` — Expected: exit 0, all pass.
- [ ] **Step 5: Commit** — "Motion: one set of values (Animate UI) and live Reduce Motion across shared components"

### Task 2: Map sheet drag on the UI thread

**Files:** Modify `src/app/_layout.tsx` (wrap in `GestureHandlerRootView`), `src/app/map.tsx` (PanResponder → `Gesture.Pan()` + `Gesture.Tap()` in a `GestureDetector`; snap with `tween.drawer`; release with velocity as now: up fast or past half opens; `setOpen` via `scheduleOnRN`).

- [ ] **Step 1:** Make the change; accessibility actions on the handle stay.
- [ ] **Step 2: Verify** web export + `map-web-check.cjs` — Expected: 21/21 (its sheet rows drag the handle up, tap to collapse).
- [ ] **Step 3: Commit** — "Map sheet: drag on the UI thread, drawer curve"

### Task 3: Every control answers, skeletons, plan-done toast

**Files:** Modify `src/lib/itinerary.ts` (+ test), `src/components/ui.tsx` (`Skeleton`, photo shimmer in PhotoCard/StopCard/PhotoStrip tiles), `src/app/account.tsx` (busy on sign out and delete account), `src/app/work.tsx` (next-day skeleton row while running), `src/app/_layout.tsx` (`PlanDoneToast` under ToastProvider).

**Interfaces — Produces:** `finishedNow(before?: PlanStatus, now?: PlanStatus): boolean` — true only for `'running'` → `'done'`.

- [ ] **Step 1: Failing test** `finishedNow`: running→done true; done→done, undefined→done, stopped→done, running→failed false. Run `npm test` — Expected: fails, missing export.
- [ ] **Step 2:** Implement; `PlanDoneToast` watches the open trip's plan status and toasts "แผน <title> เสร็จแล้ว" when `finishedNow` and the path is not `/work`.
- [ ] **Step 3:** `Skeleton` = a soft block with a band sweeping by `translateX` (1.2 s loop, opacity pulse under Reduce Motion); photos show it until the image loads (`onLoad`); the work screen shows one skeleton day (title bar + three tiles) while the plan is running.
- [ ] **Step 4:** Account: sign out and delete account show busy ("กำลังออกจากระบบ…", "กำลังลบบัญชี…").
- [ ] **Step 5: Verify** tests, tsc, lint — Expected: pass. **Commit** — "Smooth UX: busy everywhere, skeletons, plan-done toast"

### Task 4: Wow — planning orb and plan-ready celebration

**Files:** `package.json` (Skia via `npx expo install @shopify/react-native-skia`); create `src/components/reacticx/energy-orb/*`, `src/components/reacticx/number-flow/*` (copied, MIT notice), `src/components/planOrb.native.tsx` (EnergyOrb, AiGo colors, paused when not focused, not running or Reduce Motion), `src/components/planOrb.tsx` (web: Reanimated glow), `src/components/celebrate.tsx` (36-piece confetti + check pop, `Haptics.notificationAsync(Success)`); modify `src/app/work.tsx`.

- [ ] **Step 1:** Install and copy; type-check the copies.
- [ ] **Step 2:** Work screen while running: orb hero (180 px) above the task list, "กำลังวางวันที่ N จาก M" with N in NumberFlow. On `finishedNow` seen here: celebration once.
- [ ] **Step 3: Verify** tsc, lint, tests, web export with no page errors on `/work`, `npx expo export --platform ios` — Expected: pass. **Commit** — "Wow: planning orb (Reacticx EnergyOrb, NumberFlow) and plan-ready celebration"

### Task 5: Wow — onboarding

**Files:** Modify `src/app/onboarding.tsx`.

- [ ] **Step 1:** `Animated.ScrollView` + `useAnimatedScrollHandler` → `x`; per page: art `translateX` at half speed and scale 0.92→1→0.92, title and body fade and rise 16 px by distance from the page; dots `scaleX` 1→3 and opacity by distance; page state for buttons from `onMomentumScrollEnd`.
- [ ] **Step 2: Verify** a web check swipes pages and taps Next/Skip; tsc, lint — Expected: pass, no page errors. **Commit** — "Wow: onboarding follows the finger (parallax, text, dots)"

### Task 6: Docs, canvas, final checks, push

- [ ] phone-test rows (press feel, sheet drag, skeletons, plan-done toast, orb, confetti once, onboarding, Reduce Motion); full verification (tests, tsc, lint, web export + all web checks, iOS export); canvas boards for the work screen and onboarding; push to the branch and `main`.
