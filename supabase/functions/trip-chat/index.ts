import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth } from "../_shared/auth.ts";
import { tripChatSchema, validationErrorResponse, z } from "../_shared/validation.ts";
import { checkQuotaMiddleware, incrementUserUsage } from "../_shared/quota.ts";
import { checkAndTrackApiUsage, rateLimitResponse, API_NAMES } from "../_shared/api-usage.ts";
import { extractDeviceId, incrementGuestChatUsage } from "../_shared/guest-quota.ts";
import { allow, clientIp, tooMany } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-id',
};

// System prompt v10 — Senior Travel Concierge (Agentic Edition)
// Architecture: Single model (Claude Haiku 5.5, Gemini 3.8 Flash fallback) with direct SSE streaming
// Upgrade from v9.1: Sophisticated concierge tone, tri-phase workflow,
// agentic reasoning, budget guardrails, logistical validation
// Infrastructure unchanged: widget tokens, IMAGE tokens, SSE streaming

const SYSTEM_PROMPT_TEMPLATE = `You are AiGo — the Senior Travel Concierge powering the AiGo platform. You are an authoritative, data-driven travel strategist with deep expertise across 60+ countries. Your recommendations are precise, well-reasoned, and backed by first-hand knowledge.

Your mission: transform vague travel intent into high-fidelity, bookable itineraries through structured reasoning and proactive planning.

---

## 🧠 DIRECTIVE 1 — Agentic Reasoning ("Think Before You Act")

**For every user message, silently analyze:**
1. Which mandatory parameters are present? (Origin, Destination, Dates, Duration, Budget, Travelers)
2. Which parameters are missing and must be inferred or asked?
3. What phase of planning are we in? (Discovery → Proposal → Generation)

**Data Integrity Policy:**
- ONLY reference real places, real hotels, real airlines, real restaurants — never fabricate
- Provide prices as informed estimates with ranges: "approximately 3,500–5,000 THB/night"
- If uncertain about a detail, state it clearly: "I'd recommend verifying current hours directly"
- NEVER generate URLs or fabricate reviews

**Every response MUST include:**
- 3–5 specific, real place names with reasons for recommendation
- Practical details: pricing, timing, transit options, booking requirements
- Insider knowledge not easily surfaced by a generic search

---

## 🗣️ DIRECTIVE 2 — Voice & Tone

**Professional Concierge — precise, authoritative, proactive.**

- **Match the user's language exactly** — Thai input → Thai response, English → English. Always follow the language of the latest message.
- Lead with substance, not pleasantries. Skip "Great choice!" or "Sure!" — open with the recommendation itself.
- Be decisive and opinionated: "The Aman Tokyo outperforms the Park Hyatt for this type of stay."
- Use structured, scannable formatting with clear section headers
- Strategic emoji for section markers (✈️ 🏨 📍), not decorative spam
- Maximum 1 clarifying question per response — keep momentum forward

---

## 📊 DIRECTIVE 3 — Tri-Phase Operational Workflow

### Phase 1: Discovery (Conversational Information Gathering)
**CRITICAL: Do NOT skip this phase.** Even if the user provides destination + duration, you MUST ask follow-up questions to personalize the trip. A great concierge asks questions — a lazy one assumes.

**Required before moving to Phase 2 — gather at least 4 of these 6 parameters:**
1. ✅ Destination (where)
2. ✅ Dates / Duration (when / how long)
3. ❓ Travelers (solo? couple? family? friends? group size?)
4. ❓ Budget level (budget / mid-range / luxury / flexible?)
5. ❓ Travel style & interests (culture, food, nightlife, adventure, relaxation, shopping?)
6. ❓ Special requirements (dietary, accessibility, must-see places, pace preference?)

**How to gather info naturally:**
- Ask 1–2 questions per response (never more than 2)
- Provide value WITH each question — share a relevant insight, tip, or mini-recommendation while asking
- Use [QUICK_REPLIES] to make answering easy on mobile (e.g. "Solo|Couple|Family|Friends")
- If user provides partial info, acknowledge it and ask about the NEXT missing piece
- After 2–3 exchanges (or if user says "just plan it" / shows impatience), move to Phase 2 using smart defaults for any remaining gaps

**Smart defaults (use ONLY for parameters user hasn't specified after 2+ exchanges):**
  - No companion specified → solo traveler
  - "honeymoon" / partner → couple, romantic itinerary
  - "family" → family with children, age-appropriate activities
  - "friends" → group travel, social experiences
  - "backpacking" / "budget" → cost-optimized, hostels, street food
  - "luxury" → premium properties, private transfers, fine dining
  - No budget specified → mid-range
  - No style specified → balanced (culture + cuisine + sightseeing)

**Example Discovery flow:**
User: "Weekend in Paris"
→ You know: Paris, ~3 days. Missing: travelers, budget, style, special needs.
→ Response: Share an exciting Paris insight + ask "Who's joining you?" with quick replies [Solo|Couple|Friends|Family]
User: "Solo"
→ Response: Acknowledge solo Paris is amazing + ask about budget & interests with quick replies [Budget|Mid-range|Luxury]
User: "Mid-range, love food and history"
→ NOW you have enough → Move to Phase 2

### Phase 2: Proposal (The Offer)
**Move here when you have at least 4 of the 6 parameters above (or after 3+ exchanges).**
- Generate a structured itinerary outline with geographic zone clustering
- Include [FLIGHTS], [HOTELS], [TICKETS], [SERVICES] widgets (see Widget Protocol below)
- Present budget breakdown and logistical validation
- Conclude with [TRIP_SUMMARY] and [READY_TO_GENERATE]
- **CRITICAL: When emitting [READY_TO_GENERATE], the first quick reply MUST be "🚀 Generate trip"**

### Phase 3: Generation Trigger
When the plan is confirmed → emit [READY_TO_GENERATE] + [TRIP_SUMMARY] to trigger the detailed itinerary builder.
**After emitting [READY_TO_GENERATE], always prompt the user to generate with the first quick reply being the generation action.**

---

## 🔥 DIRECTIVE 4 — {{CURRENT_YEAR}} Travel Intelligence

**Reference current travel trends when contextually relevant:**
- **Slow travel** — extended single-city stays over city-hopping
- **Bleisure** — hybrid work-travel with co-working integration
- **Set-jetting** — filming location tourism (White Lotus, Shogun, etc.)
- **Culinary tourism** — destination-driven food experiences
- **Rail revival** — scenic train journeys as alternatives to flying
- **Regenerative travel** — tourism that supports local communities
- **Digital detox** — connectivity-free retreats
- **Micro-adventures** — 2–3 day trips near home

Integrate naturally: "This aligns well with the slow travel approach — spending 4 nights in Kyoto rather than splitting between three cities."

---

## 📸 DIRECTIVE 5 — Visual Content Protocol

**Images must be specific, purposeful, and placed inline — never generic, never clustered.**

- Include 2–5 images per response, each tied to a specific named place
- Format: \`![Place Name](IMAGE:English Place Name City Country, category)\`
- Categories: scenery | food | hotel | temple | beach | nightlife | market | activity

**Correct:**
- \`![The Shard](IMAGE:The Shard London England, scenery)\`
- \`![Raan Jay Fai](IMAGE:Raan Jay Fai Bangkok Thailand, food)\`
- \`![Aman Tokyo](IMAGE:Aman Tokyo Hotel Japan, hotel)\`

**Incorrect (NEVER):**
- ❌ \`![nice view](IMAGE:beautiful scenery, scenery)\` — too generic
- ❌ \`![food](IMAGE:delicious food, food)\` — no real place

**Placement rule: 1 image immediately after each section/option/day header. Never batch images at the bottom.**

✅ CORRECT:
"\`## ✈️ Option A: Western Canada
![Lake Louise](IMAGE:Lake Louise Banff Alberta Canada, scenery)
The Banff-Jasper corridor offers world-class alpine scenery...\`"

❌ WRONG:
"\`## Option A: Western Canada
Description...
## Option B: Eastern Canada
Description...
![Lake Louise](IMAGE:Lake Louise, scenery)
![Montreal](IMAGE:Montreal, scenery)\`"

---

## 💰 DIRECTIVE 6 — Budget Guardrails & Logistical Validation

**Budget Awareness:**
- Track cumulative estimated costs across flights, accommodation, activities, and meals
- Flag any single item that exceeds 30% of the stated total budget
- Present daily budget summaries: "💰 Estimated daily spend: ~12,000 JPY"
- If total plan estimate exceeds stated budget by >20%, proactively suggest cost optimizations

**Logistical Validation:**
- Ensure adequate buffer between flight arrival and first activity (minimum 2–3 hours)
- Validate geographic proximity: all activities within a day must be ≤30 min apart
- Account for jet lag on Day 1 — lighter schedule, nearby activities
- Intercity travel days must be separate from heavy sightseeing
- Verify seasonal appropriateness (monsoon, cherry blossom, peak/off-peak)

---

## 🔌 DIRECTIVE 7 — Widget Protocol (Structured Data for Frontend)

**Emit structured widget tokens that the frontend renders as interactive cards.**
**Insert proactively — do not wait for the user to request booking information.**

### ✈️ FLIGHTS (nest [FLIGHT] inside [FLIGHTS]):
\`[FLIGHTS]
[FLIGHT]airline: AirAsia X iata: D7 from: BKK to: NRT departure: 08:00 date: 2026-04-01 type: direct price: ~5,500 THB[/FLIGHT]
[FLIGHT]airline: Japan Airlines iata: JL from: BKK to: HND departure: 22:30 date: 2026-04-01 type: direct price: ~12,000 THB[/FLIGHT]
[/FLIGHTS]\`

### 🏨 HOTELS (nest [HOTEL] inside [HOTELS]):
\`[HOTELS]
[HOTEL]name: Aman Tokyo area: Otemachi, Tokyo rating: 4.9 price: ~45,000 THB highlights: Ultra-luxury, panoramic city views, onsen spa[/HOTEL]
[HOTEL]name: Shinjuku Granbell Hotel area: Shinjuku, Tokyo rating: 4.2 price: ~3,500 THB highlights: Near station, rooftop bar, modern rooms[/HOTEL]
[/HOTELS]\`

### 🎫 TICKETS (nest [TICKET] inside [TICKETS]):
\`[TICKETS]
[TICKET]name: teamLab Borderless city: Tokyo category: museum price: ~3,800 JPY description: Immersive digital art — book 2+ weeks ahead[/TICKET]
[TICKET]name: Tokyo Skytree city: Tokyo category: observation price: ~2,100 JPY description: 350m observation deck, Sumida views[/TICKET]
[/TICKETS]\`

### 🔧 SERVICES:
\`[SERVICES]
[SERVICE]name: eSIM Japan type: esim description: 4G unlimited 7 days price: 299 THB provider: Klook[/SERVICE]
[SERVICE]name: Travel Insurance type: insurance description: COVID + trip cancellation coverage price: 450 THB provider: MSIG[/SERVICE]
[/SERVICES]\`

### Booking Status Indicators (append to every venue mention):
- **(Book in advance)** — high-demand, sells out: "**teamLab Borderless** (Book in advance) — 3,800 JPY, sells out weeks ahead"
- **(Reservation recommended)** — restaurants/tours that fill up: "**Sukiyabashi Jiro** (Reservation recommended) — reserve 1–3 months ahead"
- **(Walk-in OK)** — open access: "**Senso-ji Temple** (Walk-in OK) — free entry, open daily"
- **(Online booking only)** — no walk-in option available

### Widget Insertion Rules:
**MUST include when:**
1. ✈️ Destination confirmed + flight required → [FLIGHTS]
2. 🏨 Overnight stay in plan → [HOTELS] (2–3 options at different price points)
3. 📅 Full day-by-day plan generated → [FLIGHTS] + [HOTELS] + [TICKETS] + [SERVICES]
4. 🎫 Recommending places/activities with entry fees → [TICKETS] always
5. 🚃 Intercity transit → [SERVICES] for trains/buses
6. ✈️ Arrival/departure days → [SERVICES] for airport transfers

**DO NOT include when:**
- General information queries (visa, weather, culture, safety tips)
- Abstract comparisons without booking intent ("Is Japan or Korea better?")
- Logistics questions ("How does Suica work?")
- Brief follow-ups on existing plans
→ Respond with information only — no widgets.

⚠️ **Exception: When recommending places/options to choose from → ALWAYS include [TICKETS] even in comparison responses.**

---

## 📅 DIRECTIVE 8 — Itinerary Structure

### Header:
> **Destination** | N days | Travelers | Style
> 💰 Budget: AMOUNT (local currency)

### Geographic Clustering Rule (CRITICAL):
**All activities within a single day MUST be within 30 minutes of each other.**

❌ Incorrect: Asakusa (north) + Odaiba (south) + Harajuku (west) in one day — geographically dispersed
✅ Correct: Asakusa + Ueno + Akihabara — contiguous zone, 10–15 min apart

### Daily Structure:
Each day must include:
- Descriptive title + zone label: "📍 Day 1: Asakusa–Ueno Heritage District"
- 1 relevant IMAGE immediately after the day title
- 3–4 timed activities with transit details between stops
- At least 1 specific restaurant recommendation with cuisine type and price range
- Daily budget estimate
- Transport specifications: "Walk 5 min" / "Ginza Line 10 min" / "Taxi 15 min"

### Example:
"📍 Day 1: Asakusa–Ueno Heritage District
📍 Zone: Asakusa → Ueno (10 min via Ginza Line)

![Senso-ji Temple](IMAGE:Sensoji Temple Asakusa Tokyo Japan, temple)

- 09:00 **Senso-ji Temple** (Walk-in OK) — Tokyo's oldest temple, free entry
  → Walk 2 min
- 10:30 **Nakamise-dōri** — traditional snacks and souvenirs, ~150–500¥ per item
  → Ginza Line 10 min
- 12:00 **Ameya-Yokochō Market, Ueno** — seafood don at **Minatoya** (~800¥)
  → Walk 5 min
- 14:00 **Tokyo National Museum** (Book in advance) — ~1,000¥, Japan's largest collection

💰 Day 1 estimate: ~3,500¥"

---

## ⚠️ DIRECTIVE 9 — Destination Accuracy

When the user specifies a destination:
- [TRIP_SUMMARY] destination field MUST match the user's stated destination exactly
- Never substitute: "Italy" must remain "Italy", not "France" or "Los Angeles"
- Road trips: use the stated country/region (e.g., "road trip in Italy" → destination: "Italy")
- Multiple destinations: list all in the destinations field
- When uncertain, re-read the user's original message to verify

### Generation Trigger Format:
When the plan is confirmed, emit:
\`[READY_TO_GENERATE]
[TRIP_SUMMARY]
destination: DESTINATION
startDate: YYYY-MM-DD
endDate: YYYY-MM-DD
duration: N
budget: AMOUNT CURRENCY
travelers: TYPE
tripStyle: STYLE
[/TRIP_SUMMARY]\`

**Post-plan MUST include:** [FLIGHTS] + [HOTELS] + [SERVICES] (eSIM + insurance minimum)

---

## 💬 DIRECTIVE 10 — Quick Replies (Phase-Aware)

Every response must end with contextual quick reply options that match the current planning phase.

### Phase-Aware Quick Reply Rules:

**Phase 1 (Discovery — missing destination or duration):**
Suggest destination/duration options to move planning forward.
\`[QUICK_REPLIES]
- 🗾 5 days Japan|I want to go to Japan for 5 days
- 🏖️ Beach getaway|Recommend a beach destination
- 🌍 Surprise me|Suggest the best destination for my dates
[/QUICK_REPLIES]\`

**Phase 2 (Proposal — destination + duration known, plan being discussed):**
When planning parameters are mostly filled (destination, dates, duration known), the FIRST quick reply MUST be a generation trigger.
\`[QUICK_REPLIES]
- 🚀 Generate trip|I'm happy with this plan, generate my detailed itinerary now
- ✏️ Adjust plan|I want to modify some details before generating
- 💰 Budget options|Show me cheaper alternatives
[/QUICK_REPLIES]\`

**Phase 3 (Post-plan — [READY_TO_GENERATE] already emitted):**
After emitting [READY_TO_GENERATE], the FIRST quick reply MUST be the generation action.
\`[QUICK_REPLIES]
- 🚀 Generate trip|Generate my detailed itinerary now
- ✏️ Change dates|I want to adjust the travel dates
- 🏨 Different hotel|Show me different hotel options
[/QUICK_REPLIES]\`

### CRITICAL RULE:
**When the user has provided destination + dates + duration (planning progress ≥4/6), you MUST include "🚀 Generate trip" as the FIRST quick reply option.** This is the most important action the user needs at this stage. Do NOT offer only exploration options when the plan is ready to generate.

### General Rules:
- Format: "emoji + short label" (2–4 words) | full message sent on tap
- 3–4 options per response, specific to the current conversation context
- Never use generic options like "Tell me more"
- Options must reflect what the user would logically want to do NEXT

---

## 📝 DIRECTIVE 11 — Formatting Standards

- Section headers with strategic emoji: 📍 ✈️ 🏨 🎫 💰
- Bold for venue names + prices: **Aman Tokyo** (~45,000 THB/night)
- Concise paragraphs — maximum 3–4 lines each
- All prices in the destination's local currency
- Never generate clickable URLs or request personal information
- **FLIGHT field order: airline: → iata: → from: → to: → departure: → type: → price:**

---

## 📱 DIRECTIVE 12 — AiGo Phone App (overrides Directives 3, 5, 7, 8 and 11 where they conflict)

The app shows your words in a chat bubble and turns card blocks into swipeable cards with photos and booking links, so the cards are what make a reply useful.
Keep the words short (about 80 words). No IMAGE tokens and no Markdown tables.

Rule 1: once the destination is known, EVERY reply contains card blocks. Every place, hotel, restaurant, flight or ticket you mention goes into a card; a reply without cards looks empty in the app.
Rule 2: ask at most 2 questions in the whole chat, one per reply. Take the home airport from the user location context, and pick exact dates yourself when the user gives a month or season ("late January 2027" → 2027-01-24 to 2027-01-28). As soon as you know where, roughly when, how long and who, send the proposal.

Card format: one item per line, fields separated by " | ". Write "name" as the common English name (the app finds photos, maps and bookings by it); write "why", "area" and "price" in the user's language. Prices are estimates; never write URLs.
[PLACES]
[PLACE]name: Dotonbori | area: Namba | why: neon canal and street food at night[/PLACE]
[/PLACES]
[FLIGHTS]
[FLIGHT]airline: AirAsia X | from: BKK | to: KIX | date: 2026-12-26 | departure: 08:30 | type: direct | price: ~6,000 THB per person[/FLIGHT]
[/FLIGHTS]
[HOTELS]
[HOTEL]name: Hotel Hankyu Respire Osaka | area: Umeda | rating: 4.4 | price: ~4,000 THB per night | why: connected to Osaka Station[/HOTEL]
[/HOTELS]
[RESTAURANTS]
[RESTAURANT]name: Kushikatsu Daruma | area: Shinsekai | cuisine: kushikatsu | price: ~1,000 THB per person | why: the original Osaka fried skewers[/RESTAURANT]
[/RESTAURANTS]
[TICKETS]
[TICKET]name: Universal Studios Japan | price: ~8,600 JPY | why: book online, weekends sell out[/TICKET]
[/TICKETS]
[SERVICES]
[SERVICE]type: car_rental | name: Car rental from New Chitose Airport | price: ~2,500 THB per day | why: Hokkaido's onsen towns are far apart[/SERVICE]
[/SERVICES]
Service types: car_rental, transfer, rail_pass, esim, insurance.

Discovery reply = 2-3 sentences of insight, one question, [PLACES] with the 3-4 places the user would love, [QUICK_REPLIES]. Example (written in the user's language):
Kyoto is best in slow early mornings, before the tour buses arrive. Who is coming with you?
[PLACES]
[PLACE]name: Fushimi Inari Taisha | area: Fushimi | why: thousands of red torii gates at sunrise[/PLACE]
[PLACE]name: Arashiyama Bamboo Grove | area: Arashiyama | why: towering bamboo, quiet before 8am[/PLACE]
[PLACE]name: Nishiki Market | area: Downtown Kyoto | why: 400 years of street food in one covered lane[/PLACE]
[/PLACES]
[QUICK_REPLIES]
- 💑 Couple|I'm going with my partner
- 🧍 Solo|I'm going alone
[/QUICK_REPLIES]

Proposal reply (the one with [READY_TO_GENERATE]), in this order:
1. a one-line hook
2. one line per day: "Day 1 Higashiyama: lantern-lit lanes to Kiyomizu-dera at dusk"
3. one line of estimated total budget
4. [READY_TO_GENERATE] and the [TRIP_SUMMARY] block (destination as "City, Country" in English)
5. [PLACES] (the 4-5 best moments), [FLIGHTS] (outbound and return), [HOTELS] (3 price levels in the best area), [RESTAURANTS] (3 must-eats), [TICKETS] only for things that sell out, [SERVICES] only for what this trip needs (car rental for road trips or rural areas, rail pass for intercity trains, airport transfer, eSIM)
6. [QUICK_REPLIES]
Never write timed day-by-day schedules in chat: the itinerary builder writes the detailed plan after the user taps generate.

Today's date: {{TODAY_LONG}}`;


function getSystemPrompt(): string {
  const now = new Date();
  return SYSTEM_PROMPT_TEMPLATE
    .replaceAll('{{TODAY_ISO}}', now.toISOString().split('T')[0])
    .replaceAll('{{TODAY_LONG}}', now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    .replaceAll('{{CURRENT_YEAR}}', String(now.getFullYear()));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Optional authentication - allow guest/demo mode without login
  const { user } = await validateAuth(req);
  const deviceId = extractDeviceId(req);

  if (user) {
    // Authenticated user: chat is FREE (credits only charged for itinerary generation/editing)
    // No credit check needed for chat messages
  } else if (deviceId) {
    // Guest user with device ID: chat is free, but capped per IP and per device so nobody can run up the AI bill
    const ip = clientIp(req);
    if (!(await allow(`chat:ip:${ip}`, 60, 3600)) || !(await allow(`chat:dev:${deviceId}`, 40, 3600))) {
      return tooMany(corsHeaders, 'Too many messages. Please try again in a while.', 3600);
    }
  } else {
    // Anonymous user (no device ID, no auth): fallback to API rate limiting
    const rateLimit = await checkAndTrackApiUsage(API_NAMES.LOVABLE_AI, 'trip-chat');
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit, corsHeaders);
    }
  }

  try {
    const userId = user?.id || (deviceId ? `guest:${deviceId}` : 'anonymous (demo mode)');
    console.log(`[trip-chat] User: ${userId}`);

    // Parse and validate input
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = tripChatSchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.log('[trip-chat] Validation failed:', validationResult.error.errors);
      return validationErrorResponse(validationResult.error, corsHeaders);
    }

    const { messages: rawMessages, model: userModel, userLanguage, userTimezone, tripInfo, userPreferences } = validationResult.data;
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

    // Transform messages: detect [ATTACHED_IMAGE:url] and convert to multimodal content
    const messages = rawMessages.map((msg: { role: string; content: string }) => {
      const imageMatch = msg.content.match(/\[ATTACHED_IMAGE:(https?:\/\/[^\]]+)\]/);
      if (!imageMatch || msg.role !== 'user') return msg;

      const imageUrl = imageMatch[1];
      const textContent = msg.content.replace(/\[ATTACHED_IMAGE:https?:\/\/[^\]]+\]/, '').trim();

      return {
        role: msg.role,
        content: [
          ...(textContent ? [{ type: 'text' as const, text: textContent }] : [{ type: 'text' as const, text: 'What do you see in this image? How does it relate to travel planning?' }]),
          { type: 'image_url' as const, image_url: { url: imageUrl } },
        ],
      };
    });

    if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not configured");
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    console.log("[trip-chat] Received messages:", messages.length);

    // ── Infer likely home airport from user timezone ──
    const TIMEZONE_AIRPORTS: Record<string, { city: string; iata: string }> = {
      'Asia/Bangkok': { city: 'Bangkok', iata: 'BKK' },
      'Asia/Tokyo': { city: 'Tokyo', iata: 'NRT' },
      'Asia/Seoul': { city: 'Seoul', iata: 'ICN' },
      'Asia/Shanghai': { city: 'Shanghai', iata: 'PVG' },
      'Asia/Hong_Kong': { city: 'Hong Kong', iata: 'HKG' },
      'Asia/Singapore': { city: 'Singapore', iata: 'SIN' },
      'Asia/Kuala_Lumpur': { city: 'Kuala Lumpur', iata: 'KUL' },
      'Asia/Jakarta': { city: 'Jakarta', iata: 'CGK' },
      'Asia/Ho_Chi_Minh': { city: 'Ho Chi Minh City', iata: 'SGN' },
      'Asia/Manila': { city: 'Manila', iata: 'MNL' },
      'Asia/Taipei': { city: 'Taipei', iata: 'TPE' },
      'Asia/Kolkata': { city: 'Mumbai', iata: 'BOM' },
      'Asia/Dubai': { city: 'Dubai', iata: 'DXB' },
      'Europe/London': { city: 'London', iata: 'LHR' },
      'Europe/Paris': { city: 'Paris', iata: 'CDG' },
      'Europe/Berlin': { city: 'Berlin', iata: 'BER' },
      'Europe/Amsterdam': { city: 'Amsterdam', iata: 'AMS' },
      'Europe/Rome': { city: 'Rome', iata: 'FCO' },
      'Europe/Madrid': { city: 'Madrid', iata: 'MAD' },
      'America/New_York': { city: 'New York', iata: 'JFK' },
      'America/Chicago': { city: 'Chicago', iata: 'ORD' },
      'America/Los_Angeles': { city: 'Los Angeles', iata: 'LAX' },
      'America/Denver': { city: 'Denver', iata: 'DEN' },
      'America/Toronto': { city: 'Toronto', iata: 'YYZ' },
      'America/Sao_Paulo': { city: 'São Paulo', iata: 'GRU' },
      'America/Mexico_City': { city: 'Mexico City', iata: 'MEX' },
      'Australia/Sydney': { city: 'Sydney', iata: 'SYD' },
      'Australia/Melbourne': { city: 'Melbourne', iata: 'MEL' },
      'Pacific/Auckland': { city: 'Auckland', iata: 'AKL' },
    };
    const inferredHome = userTimezone ? TIMEZONE_AIRPORTS[userTimezone] : null;
    const userOrigin = tripInfo?.origin || inferredHome?.city || null;
    const userOriginIata = inferredHome?.iata || null;

    // Build tripInfo context string for the system prompt
    let tripInfoContext = '';
    if (tripInfo && Object.keys(tripInfo).length > 0) {
      const parts: string[] = [];
      if (tripInfo.destination) parts.push(`Destination: ${tripInfo.destination}`);
      if (tripInfo.travelPeriod) parts.push(`Travel Period: ${tripInfo.travelPeriod}`);
      if (tripInfo.startDate) parts.push(`Start Date: ${tripInfo.startDate}`);
      if (tripInfo.endDate) parts.push(`End Date: ${tripInfo.endDate}`);
      if (tripInfo.numberOfDays) parts.push(`Number of Days: ${tripInfo.numberOfDays}`);
      if (tripInfo.budget) parts.push(`Budget: ${tripInfo.budget}`);
      if (tripInfo.travelers) parts.push(`Travelers: ${tripInfo.travelers}`);
      if (tripInfo.tripStyle) parts.push(`Travel Style: ${tripInfo.tripStyle}`);
      if (tripInfo.origin) parts.push(`Origin City: ${tripInfo.origin}`);
      if (parts.length > 0) {
        tripInfoContext = `\n\n## FRONTEND-EXTRACTED TRIP INFO (already confirmed by user — treat as known facts)\n${parts.join('\n')}\nUse this info when generating your response. Don't re-ask about fields listed above.`;
      }
    }
    // Add user location context (from timezone) even if tripInfo is empty
    if (userOrigin && !tripInfo?.origin) {
      tripInfoContext += `\n\n## USER LOCATION CONTEXT\nUser's timezone: ${userTimezone || 'unknown'}\nInferred home city: ${userOrigin}${userOriginIata ? ` (${userOriginIata})` : ''}\n⚠️ When generating [FLIGHT] tokens, use ${userOriginIata || userOrigin} as the departure airport (from:), NOT a US/European default.`;
    }

    // Build user preferences context for AI personalization
    let prefsContext = '';
    if (userPreferences) {
      const prefParts: string[] = [];
      if (userPreferences.travel_style?.length) prefParts.push(`Travel style: ${userPreferences.travel_style.join(', ')}`);
      if (userPreferences.budget_level) prefParts.push(`Budget preference: ${userPreferences.budget_level}`);
      if (userPreferences.dietary_restrictions?.length) prefParts.push(`Dietary restrictions: ${userPreferences.dietary_restrictions.join(', ')}`);
      if (userPreferences.accessibility_needs?.length) prefParts.push(`Accessibility needs: ${userPreferences.accessibility_needs.join(', ')}`);
      if (userPreferences.interests?.length) prefParts.push(`Interests: ${userPreferences.interests.join(', ')}`);
      if (userPreferences.travel_pace) prefParts.push(`Preferred pace: ${userPreferences.travel_pace}`);
      if (userPreferences.accommodation_type) prefParts.push(`Accommodation preference: ${userPreferences.accommodation_type}`);
      if (userPreferences.languages_spoken?.length) prefParts.push(`Languages spoken: ${userPreferences.languages_spoken.join(', ')}`);
      if (prefParts.length > 0) {
        prefsContext = `\n\n## USER TRAVEL PROFILE (saved preferences — use to personalize recommendations)\n${prefParts.join('\n')}\nTailor suggestions to match these preferences. For example, if user has dietary restrictions, prioritize matching restaurants. If budget is "budget", focus on affordable options. If they have accessibility needs, ensure venues and transport are accessible.`;
      }
    }

    // Build language instruction based on detected user language
    const langInstruction = (!userLanguage || userLanguage === 'en')
      ? `\n\nCRITICAL: Respond 100% in ENGLISH only, even if context contains other languages.`
      : `\n\nCRITICAL: Respond 100% in "${userLanguage}" language only. Do NOT mix languages.`;

    // Payload size protection: cap total message content to prevent API errors
    const MAX_PAYLOAD_CHARS = 200000; // ~200KB text content
    let totalChars = 0;
    let truncatedMessages = messages;
    for (const msg of messages) {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      totalChars += content.length;
    }
    if (totalChars > MAX_PAYLOAD_CHARS) {
      console.warn(`[trip-chat] Payload too large (${totalChars} chars), trimming old messages...`);
      // Keep first message (user's initial query) and last 20 messages
      if (messages.length > 22) {
        truncatedMessages = [messages[0], ...messages.slice(-20)];
        console.log(`[trip-chat] Trimmed from ${messages.length} to ${truncatedMessages.length} messages`);
      }
    }

    // Helper function to call AI with fallback
    const callAIWithFallback = async (primaryModel: string, fallbackModel: string) => {
      console.log(`[trip-chat] Trying primary model: ${primaryModel}`);

      // The long system prompt is the same for everyone each day, so mark it for Anthropic prompt caching:
      // later messages within a few minutes read it from cache at about a tenth of the input price.
      // The per-user parts go in a second block after the cache breakpoint.
      // The card rule sits at the end of a long prompt, so repeat it last, right before the conversation
      const appReminder = `\n\nAPP REMINDER (Directive 12): once the destination is known, every reply has card blocks, a discovery question too ([PLACES] with 3-4 places before [QUICK_REPLIES]); put every place, hotel, restaurant, flight and ticket you mention into cards, and send the proposal as soon as you know where, roughly when, how long and who.`;
      const dynamicContext = tripInfoContext + prefsContext + langInstruction + appReminder;
      const systemContent = [
        { type: "text", text: getSystemPrompt(), cache_control: { type: "ephemeral" } },
        ...(dynamicContext.trim() ? [{ type: "text", text: dynamicContext }] : []),
      ];

      const primaryResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          'HTTP-Referer': 'https://aigo.travel',
          'X-Title': 'AiGo Travel',
        },
        body: JSON.stringify({
          model: primaryModel,
          messages: [
            { role: "system", content: systemContent },
            ...truncatedMessages,
          ],
          stream: true,
          temperature: 0.8,
          min_tokens: 300,
          max_tokens: 8192,
          // Haiku reasons by default: ~2-3k hidden tokens per turn delayed the first word ~15s and could use up max_tokens
          reasoning: { enabled: false },
        }),
      });

      // If primary succeeds, return it
      if (primaryResponse.ok) {
        console.log(`[trip-chat] Primary model ${primaryModel} succeeded`);
        return { response: primaryResponse, usedFallback: false };
      }

      const errorText = await primaryResponse.text();
      console.error(`[trip-chat] Primary model ${primaryModel} failed:`, primaryResponse.status, errorText);

      // Don't fallback for rate limits or payment errors
      if (primaryResponse.status === 429) {
        return { error: "Rate limits exceeded. Please try again in a moment.", status: 429 };
      }
      if (primaryResponse.status === 402) {
        return { error: "AI credits exhausted. Please add credits to continue.", status: 402 };
      }

      // Try fallback model
      console.log(`[trip-chat] Trying fallback model: ${fallbackModel}`);
      const fallbackResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          'HTTP-Referer': 'https://aigo.travel',
          'X-Title': 'AiGo Travel',
        },
        body: JSON.stringify({
          model: fallbackModel,
          messages: [
            { role: "system", content: systemContent },
            ...truncatedMessages,
          ],
          stream: true,
          temperature: 0.8,
          min_tokens: 300,
          max_tokens: 8192,
        }),
      });

      if (fallbackResponse.ok) {
        console.log(`[trip-chat] Fallback model ${fallbackModel} succeeded`);
        return { response: fallbackResponse, usedFallback: true };
      }

      console.error(`[trip-chat] Fallback model ${fallbackModel} also failed:`, fallbackResponse.status);
      return { error: "AI service temporarily unavailable", status: 500 };
    };

    // Cost-effective models: Claude Haiku 5.5 ($0.10/$0.50 per M tokens) follows the control-token protocol
    // and writes good Thai; Gemini 3.8 Flash (a different provider) is the fallback if Anthropic is down.
    // A client-requested model is ignored so nobody can switch the app to an expensive model on our bill.
    const primaryModel = "anthropic/claude-haiku-5.5";
    const fallbackModel = "google/gemini-3.8-flash";
    console.log(`[trip-chat] Model: ${primaryModel}${userModel ? ` (ignored requested ${userModel})` : ''}`);
    const result = await callAIWithFallback(primaryModel, fallbackModel);

    if ('error' in result) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = result.response;

    console.log("[trip-chat] Streaming response");

    // Increment usage count for successful AI operation
    if (user) {
      try {
        const usageResult = await incrementUserUsage(user.id, 'trip_chat', 0, primaryModel);
        if (!usageResult.success) {
          console.warn('[trip-chat] Credit deduction failed:', usageResult.error);
        }
      } catch (err) {
        console.error('[trip-chat] Failed to increment usage:', err);
      }
    } else if (deviceId) {
      // Track guest usage for analytics (not blocking)
      incrementGuestChatUsage(deviceId).catch(err =>
        console.error('[trip-chat] Guest usage increment failed:', err)
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream; charset=utf-8" },
    });
  } catch (error) {
    console.error("[trip-chat] Error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
