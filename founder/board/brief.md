# AiGo Mobile

- What it is: a native mobile app (iOS and Android) of AiGo, an AI travel planner where you tell an AI where you want to go and get a day-by-day itinerary you can edit, budget, book from and share.
- Who it is for: per the web product's brand guidelines, travellers worldwide in four groups: solo travellers, groups (friends, families, couples), business travellers and digital nomads. The mobile v1 proposal is Thai-first with an English pair. The founder has not narrowed the customer further than this.
- What it sells, at what price: AI usage paid in credits. Free: 30 credits a month, no rollover. Travel Pass: $4.99 a month for 50 credits. Credit packs: 10 for $1.99, 50 for $7.99, 100 for $12.99. Second income: affiliate commissions on flights, hotels, activities and about 25 partner links. (The web codebase holds conflicting older price tables; these are the ones the live pricing page uses and are not yet confirmed against Stripe.)
- Where and how: App Store and Google Play. The web app already exists at theaigo.co with SEO landing pages and a blog; how mobile users will be acquired is not decided.
- Budget and constraints: budget, team size and timeline are not stated. Decided: the visual design reuses the "ChefJiw" design system (the founder's other app); the mobile repo is empty today; the backend (Supabase, about 70 edge functions) already exists and would be reused.

## What exists today (from the web codebase, verified in code)

- Web app: Vite + React + Supabase. Last commit March 2026.
- Core journey: a guest types (or speaks, or attaches an image/PDF) a trip request, the AI streams a reply and generates a day-by-day itinerary. Guests get 10 chat messages and 1 trip, then a full-screen lock until they sign up; guest trips migrate into the account on login.
- Itinerary: day sections, drag to reorder with travel times recalculated, Google map, weather forecast and weather-triggered replan, place details, checklist, AI packing list, reservations log, undo/redo.
- Budget: a trip budget and manual expenses.
- Booking: search for flights, hotels, activities and transfers that hands off to partners through affiliate links; price alerts by email. No in-app payment for bookings.
- My Trips, a marketplace of public trips that can be cloned (2 credits; the creator earns 1 credit per clone), share links, invite members as editor or viewer (itinerary content is not synced live).
- Users choose the AI model per message; cost per message runs from 1 credit (cheap models) to 15 credits (the most expensive). Generating an itinerary costs 10 credits plus 2 per day beyond day 3. So the free 30 credits covers roughly one generated trip plus some chat.
- Referral: both sides get 10 credits after the friend creates a first trip.
- 10 interface languages. Auth: email/password and Google.
- No push notifications, no working offline mode, no account deletion today.

## The mobile v1 as proposed

- Four tabs: Home (prompt box to the AI, next trip, recent trips), Trips, Explore (public trips and templates), Me (profile, credits, referral, settings).
- Flows: AI planning chat, itinerary by day with map, place detail, budget, booking via partner links, checklist and packing list, share and invite, buy credits.
- Left out of v1: SEO pages, blog, admin, and features that exist in code but are not live (expense splitting, PDF export, realtime voice conversation, offline mode).
- Added because it is a store app: Sign in with Apple, account deletion, buying credits through the stores' in-app purchase instead of Stripe (the stores take a commission of 15 to 30 percent), push notifications.

## Not known

- Number of users, paying users, revenue, retention or conversion of the web app.
- Cost of AI per credit, so the margin on a credit is unknown.
- Affiliate revenue to date.
- Budget, team and timeline for mobile.
- Why mobile now; the founder has not said.
