import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";
import { validateAuth } from "../_shared/auth.ts";
import { generateItinerarySchema, validationErrorResponse, z } from "../_shared/validation.ts";
import { extractDeviceId, checkGuestGenerationQuota, saveGuestTrip, incrementGuestGenerationUsage } from "../_shared/guest-quota.ts";
import { allow, clientIp, tooMany } from "../_shared/rate-limit.ts";

/** Quota row of a signed-in user in guest_sessions (plans are counted per account, not per phone) */
const accountKey = (userId: string) => `user:${userId}`;

// --- Itinerary skeleton cache helpers ---
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// FIX #2: Cache key now accepts optional outline to include in hash
// instead of bypassing cache entirely when outline is present
function getSkeletonCacheKey(
  destination: string,
  totalDays: number,
  tripStyle: string,
  lang: string,
  tripSummary?: {
    preferences?: string[] | null;
    mustVisit?: string[] | null;
    mustAvoid?: string[] | null;
    dietaryRestrictions?: string[] | null;
    specialInterests?: string[] | null;
  } | null,
  outlineHash?: string | null
): Promise<string> {
  // Include user-specific preferences in cache key so different users
  // with different preferences get different itineraries, even for the
  // same destination/days/style combination
  const prefParts = [
    (tripSummary?.preferences || []).sort().join(','),
    (tripSummary?.mustVisit || []).sort().join(','),
    (tripSummary?.mustAvoid || []).sort().join(','),
    (tripSummary?.dietaryRestrictions || []).sort().join(','),
    (tripSummary?.specialInterests || []).sort().join(','),
  ].filter(Boolean).join('|');

  // FIX #2: Include outline hash so outline-based generations can be cached too
  const outlinePart = outlineHash ? `|outline:${outlineHash}` : '';
  const raw = `${destination.toLowerCase().trim()}|${totalDays}|${(tripStyle || 'mixed').toLowerCase().trim()}|${(lang || 'en').toLowerCase()}${prefParts ? '|' + prefParts.toLowerCase() : ''}${outlinePart}`;
  return sha256(raw).then(h => `itinerary_skeleton:${h}`);
}

function stripPersonalData(itinerary: any): any {
  const skeleton = JSON.parse(JSON.stringify(itinerary));
  delete skeleton.id;
  delete skeleton.startDate;
  delete skeleton.endDate;
  delete skeleton.author;
  if (skeleton.days) {
    skeleton.days.forEach((day: any) => {
      delete day.date;
      (day.places || []).forEach((p: any) => { delete p.id; delete p.saved; });
    });
  }
  return skeleton;
}

function hydrateSkeletonWithDates(skeleton: any, startDate: string, endDate: string, totalDays: number, destination: string, tripStyle: string): any {
  const hydrated = JSON.parse(JSON.stringify(skeleton));
  hydrated.id = `trip-${Date.now()}`;
  hydrated.destination = destination;
  hydrated.startDate = startDate;
  hydrated.endDate = endDate;
  hydrated.totalDays = totalDays;
  hydrated.tripStyle = tripStyle;
  const startDateObj = new Date(startDate);
  if (hydrated.days) {
    hydrated.days.forEach((day: any, idx: number) => {
      const currentDate = new Date(startDateObj);
      currentDate.setDate(currentDate.getDate() + idx);
      day.date = currentDate.toISOString().split('T')[0];
      // Assign unique IDs to places (stripped by trimSkeleton for prompt reuse)
      // Without these, frontend map pins all show "1" and selection breaks
      (day.places || []).forEach((p: any, pIdx: number) => {
        if (!p.id) {
          p.id = `place-d${idx}-p${pIdx}-${crypto.randomUUID().slice(0, 8)}`;
        }
      });
    });
  }
  return hydrated;
}

/** Build an SSE event string */
function sseEvent(type: string, data: any): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

// FIX #6: Skeleton cache TTL — 7 days
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Supabase stops a worker ~150 s after it starts, and one worker serves several requests in a row,
// so a request gets only what is left of that time (seen: a 30-day trip cut 85 s in on a reused worker)
const WORKER_STARTED_AT = Date.now();

// --- Plans made on the server (supabase/plan_jobs.sql, docs/superpowers/specs/2026-11-21-server-plan-jobs-design.md) ---
// { job: 'start', ...request } stores a job and kicks a run; { jobId, token } is a run (from the kick or the 15 s pg_cron tick);
// status / stop / resume answer at once. The token stands in for a login, so guests can follow their plan too.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
/** Places already in the plan, so a later run does not repeat them (the same text as the app's plannedText) */
const plannedText = (days: any[]) => days.map((d, i) => `Day ${i + 1}${d?.title ? ` (${d.title})` : ''}: ${(d?.places ?? []).map((p: any) => p?.name).filter(Boolean).join(', ')}`).join('\n').slice(0, 4000);
/** Run the job now, after this reply; if this request is cut, the cron tick starts the run instead */
const kick = (jobId: string, token: string) => EdgeRuntime.waitUntil(
  fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-itinerary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: Deno.env.get('SUPABASE_ANON_KEY')! },
    body: JSON.stringify({ jobId, token }),
  }).then((r) => r.body?.cancel()).catch((e) => console.warn('[generate-itinerary] kick failed', e)),
);

async function jobControl(body: any): Promise<Response> {
  if (typeof body.jobId !== 'string' || typeof body.token !== 'string') return json({ error: 'jobId and token are required' }, 400);
  const { data: job } = await db.from('plan_jobs').select('id, token, status, total_days, title, error, days').eq('id', body.jobId).maybeSingle();
  if (!job || job.token !== body.token) return json({ error: 'Not found' }, 403);
  const now = new Date().toISOString();
  if (body.job === 'stop') {
    await db.from('plan_jobs').update({ status: 'stopped', lease_until: null, updated_at: now }).eq('id', job.id).eq('status', 'running');
    return json({ status: job.status === 'running' ? 'stopped' : job.status });
  }
  if (body.job === 'resume') {
    if (job.status === 'done') return json({ status: 'done' });
    await db.from('plan_jobs').update({ status: 'running', attempts: 0, lease_until: null, error: null, updated_at: now }).eq('id', job.id).in('status', ['failed', 'stopped']);
    kick(job.id, job.token);
    return json({ status: 'running' });
  }
  const have = Math.max(0, Math.floor(Number(body.have) || 0));
  return json({ status: job.status, totalDays: job.total_days, title: job.title, error: job.error, from: have, days: (job.days ?? []).slice(have) });
}

// --- Main handler ---
serve(async (req) => {
  const startedAt = Date.now();
  // Handle preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' },
    });
  }

  try {
    // Validate method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse body
    let body: any;
    try {
      body = await req.json();
    } catch (_e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (['status', 'stop', 'resume'].includes(body?.job)) return await jobControl(body);

    // A job run: take the job's lease, then make its missing days from the stored request
    let job: { id: string; owner: string; request: any; days: any[] } | null = null;
    if (typeof body?.jobId === 'string' && body?.job === undefined) {
      // A worker reused for a while is cut at ~150 s mid-day; leave the job for the next tick, which gets a fresh one
      if (Date.now() - WORKER_STARTED_AT > 20_000) return json({ status: 'busy' }, 503);
      const { data: claimed, error } = await db.rpc('plan_job_claim', { p_id: body.jobId, p_token: String(body.token ?? '') });
      if (error) console.error('[generate-itinerary] job claim failed', error);
      if (!claimed?.id) return json({ status: 'not claimed' }, 409);
      job = claimed;
      const saved = job!.days ?? [];
      body = { ...job!.request, fromDay: saved.length + 1, planned: saved.length ? plannedText(saved) : undefined };
      console.log(`[generate-itinerary] Job ${job!.id} run from day ${saved.length + 1}`);
    }

    // Validate auth - allow guest mode with device ID; a job run speaks for the job's owner (the cron tick has no login)
    const authResult = job ? null : await validateAuth(req);
    const userId = job ? (job.owner.startsWith('user:') ? job.owner.slice(5) : null) : authResult?.user?.id || null;
    const deviceId = job ? (job.owner.startsWith('user:') ? null : job.owner) : extractDeviceId(req);
    const isGuest = !userId && !!deviceId;

    // Must be either authenticated or have a device ID
    if (!userId && !deviceId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required. Please sign in or enable guest mode.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate request body
    let validatedData;
    try {
      validatedData = generateItinerarySchema.parse(body);
    } catch (error) {
      return validationErrorResponse(error as z.ZodError, corsHeaders);
    }

    // A continuation (fromDay > 1) makes the rest of a trip whose first call stopped before the time limit;
    // that first call already passed the quota checks and counts the trip
    const fromDay = validatedData.fromDay ?? 1;
    const isContinuation = fromDay > 1;

    // Check quota based on user type (a job was checked when it started, and is counted when its first day is saved)
    if (job) {
      // nothing to check
    } else if (userId) {
      // Signed-in user: the same free plans as a guest, counted on the account (guest_sessions row "user:<id>"),
      // so a new phone or a reinstall does not reset them
      const quotaResponse = isContinuation ? null : await checkGuestGenerationQuota(accountKey(userId), corsHeaders);
      if (quotaResponse) {
        return quotaResponse;
      }
    } else if (deviceId) {
      // Device IDs can be faked, so also cap guest trips per IP per day (continuations have their own allowance)
      const ip = clientIp(req);
      if (!(await allow(isContinuation ? `gen:more:${ip}` : `gen:ip:${ip}`, isContinuation ? 20 : 5, 86400))) {
        return tooMany(corsHeaders, 'Too many trips today. Please try again tomorrow.', 86400);
      }
      // Guest user: 1 trip per device — check quota before generating
      const guestQuotaResponse = isContinuation ? null : await checkGuestGenerationQuota(deviceId, corsHeaders);
      if (guestQuotaResponse) {
        return guestQuotaResponse; // 429 — quota exceeded
      }
    }

    // Calculate total days from dates
    const startMs = new Date(validatedData.startDate).getTime();
    const endMs = new Date(validatedData.endDate).getTime();
    const totalDays = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);
    if (fromDay > totalDays) {
      return new Response(JSON.stringify({ error: 'fromDay is after the last day of the trip' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Days this call makes: the whole trip, or days fromDay..totalDays of a continuation
    const partDays = totalDays - fromDay + 1;
    const partStart = new Date(startMs + (fromDay - 1) * 86400000).toISOString().split('T')[0];

    // The stream continues a trip only for a one-day replan (replanDay); a whole plan is a job, which counts the free trip
    if (!job && isContinuation && partDays > 1) return json({ error: 'Start a plan with job: start' }, 400);

    if (body?.job === 'start') {
      const token = crypto.randomUUID().replaceAll('-', '');
      const { data: row, error } = await db.from('plan_jobs')
        .insert({ token, owner: userId ? accountKey(userId) : deviceId, request: { ...validatedData, fromDay: undefined, planned: undefined }, total_days: totalDays })
        .select('id').single();
      if (error || !row) { console.error('[generate-itinerary] job start failed', error); return json({ error: 'Could not start the plan' }, 500); }
      kick(row.id, token);
      return json({ jobId: row.id, token, totalDays });
    }

    const destinationStr = validatedData.destination;
    const tripStyle = validatedData.tripStyle || 'mixed';
    // FIX #7: Use language from request body instead of hardcoded 'en'
    const lang = validatedData.language || validatedData.lang || 'en';
    const langName = ({ th: 'Thai', en: 'English', ja: 'Japanese', ko: 'Korean', 'zh-CN': 'Simplified Chinese', 'zh-TW': 'Traditional Chinese', es: 'Spanish', fr: 'French', de: 'German', ru: 'Russian' } as Record<string, string>)[lang] || 'English';

    // FIX #2: Hash outline content for cache key (instead of skipping cache entirely)
    let outlineHash: string | null = null;
    if (validatedData.itineraryOutline) {
      // Use first 500 chars of outline for hash — enough to differentiate without being too expensive
      outlineHash = await sha256(validatedData.itineraryOutline.substring(0, 500));
    }

    // Check skeleton cache — includes user preferences + outline hash
    const cacheKey = await getSkeletonCacheKey(destinationStr, totalDays, tripStyle, lang, validatedData.tripSummary, outlineHash);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let skeletonItinerary: any = null;
    // A continuation makes only some days, so it never reads or writes the whole-trip cache. A plan shaped by a chat
    // never does either: the key does not see the chat, so a hit would hand out someone else's plan
    const useCache = !isContinuation && !validatedData.conversationMessages?.length;
    if (useCache) try {
      // FIX #6: Check cache TTL — only use cache entries younger than 7 days
      const { data: cached, error } = await supabase
        .from('itinerary_skeleton_cache')
        .select('skeleton, created_at')
        .eq('cache_key', cacheKey)
        .single();

      if (!error && cached) {
        const cacheAge = Date.now() - new Date(cached.created_at).getTime();
        if (cacheAge < CACHE_TTL_MS) {
          skeletonItinerary = cached.skeleton;
          console.log(`[generate-itinerary] Cache hit! Age: ${Math.round(cacheAge / 3600000)}h`);
        } else {
          console.log(`[generate-itinerary] Cache expired (${Math.round(cacheAge / 86400000)}d old), regenerating`);
          // Clean up expired entry
          await supabase.from('itinerary_skeleton_cache').delete().eq('cache_key', cacheKey);
        }
      }
    } catch (e) {
      console.log('Cache lookup error:', e);
    }

    // If cache hit, hydrate and return as SSE
    if (skeletonItinerary) {
      const hydratedItinerary = hydrateSkeletonWithDates(
        skeletonItinerary,
        validatedData.startDate,
        validatedData.endDate,
        totalDays,
        destinationStr,
        tripStyle
      );
      if (userId) {
        await incrementGuestGenerationUsage(accountKey(userId));
      } else if (deviceId) {
        // Save guest trip for later migration when they sign up
        await saveGuestTrip(deviceId, hydratedItinerary);
        // Increment generation quota AFTER success (not before)
        await incrementGuestGenerationUsage(deviceId);
      }

      const sseBody = sseEvent('progress', {
        day: totalDays,
        totalPlaces: 0,
        currentPlace: '',
        message: 'Loading cached itinerary...',
      }) + sseEvent('complete', { itinerary: hydratedItinerary, isGuest });

      return new Response(sseBody, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // --- GENERATION ARCHITECTURE ---
    // The outline is now pre-computed by trip-chat (Claude Sonnet) during the chat phase.
    // When the user confirms, trip-chat emits [ITINERARY_OUTLINE] with a detailed day-by-day plan.
    // The frontend parses it and passes it here as `itineraryOutline`.
    // This function uses GPT-5.4 to convert the outline into structured JSON — fast + reliable.
    //
    // Fallback: If no outline is provided (e.g., direct API call without chat),
    // GPT-5.4 generates from conversationContext + tripSummary fields.
    const budgetStr = validatedData.budget ? `Budget: ${validatedData.budget}/person` : 'No budget specified';
    const travelersStr = validatedData.travelers || 'Not specified';

    // Extract trip summary details if available
    const summary = validatedData.tripSummary;
    const preferences = summary?.preferences?.join(', ') || '';
    const restrictions = summary?.restrictions?.join(', ') || '';
    const dietaryRestrictions = summary?.dietaryRestrictions?.join(', ') || '';
    const mustVisit = summary?.mustVisit?.join(', ') || '';
    const mustAvoid = summary?.mustAvoid?.join(', ') || '';

    // Call OpenRouter API
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const openRouterHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://theaigo.co',
      'X-Title': 'AiGo Travel',
    };

    // FIX #3: REMOVED dead two-pass code (was ~90 lines of `if (false && ...)`)
    // Outline is now always pre-computed by trip-chat and passed as `itineraryOutline`

    // Use pre-computed outline from trip-chat if available (highest quality)
    const detailedOutline = validatedData.itineraryOutline || '';
    if (detailedOutline) {
      console.log(`[generate-itinerary] Using pre-computed itinerary outline from trip-chat: ${detailedOutline.length} chars`);
    }

    // If we have conversationMessages but no conversationContext, build context from messages
    const hasConversationMessages = validatedData.conversationMessages && validatedData.conversationMessages.length > 0;
    if (hasConversationMessages && !validatedData.conversationContext) {
      validatedData.conversationContext = validatedData.conversationMessages!
        .map(m => `${m.role}: ${m.content}`)
        .join('\n\n');
      console.log(`[generate-itinerary] Built conversationContext from ${validatedData.conversationMessages!.length} messages (${validatedData.conversationContext.length} chars)`);
    }

    // ═══════════════════════════════════════════════════════════════
    // JSON Generation: GPT-5.4 converts outline (or raw context) into JSON
    // ═══════════════════════════════════════════════════════════════

    // Build context block: use outline if available, otherwise fall back to smart-truncated conversation
    let contextBlock = '';
    if (detailedOutline) {
      contextBlock = `\n\n## DETAILED ITINERARY OUTLINE (created by planning AI from the full user conversation — follow this closely):\n${detailedOutline}`;
    } else if (validatedData.conversationContext) {
      const MAX_CONTEXT = 8000;
      const fullCtx = validatedData.conversationContext;
      if (fullCtx.length <= MAX_CONTEXT) {
        contextBlock = `\n\nConversation Context (use this to understand user preferences):\n${fullCtx}`;
      } else {
        const msgBlocks = fullCtx.split(/\n\n(?=(?:user|assistant):)/i);
        const userMsgs = msgBlocks.filter(m => m.toLowerCase().startsWith('user:'));
        const assistantMsgs = msgBlocks.filter(m => m.toLowerCase().startsWith('assistant:'));
        let prioritized = userMsgs.join('\n\n');
        let remaining = MAX_CONTEXT - prioritized.length;
        if (remaining > 500) {
          const recentAssistant = [];
          for (let i = assistantMsgs.length - 1; i >= 0 && remaining > 200; i--) {
            const msg = assistantMsgs[i];
            if (msg.length <= remaining) {
              recentAssistant.unshift(msg);
              remaining -= msg.length + 2;
            }
          }
          if (recentAssistant.length > 0) {
            prioritized += '\n\n' + recentAssistant.join('\n\n');
          }
        }
        contextBlock = `\n\nConversation Context (user preferences):\n${prioritized.substring(0, MAX_CONTEXT)}`;
      }
    }

    const continueBlock = isContinuation
      ? `\n\n## CONTINUATION\nDays 1-${fromDay - 1} are already planned:\n${validatedData.planned || '(list not provided)'}\nGenerate ONLY days ${fromDay}-${totalDays} (${partStart} to ${validatedData.endDate}); the "days" array starts at day ${fromDay}. Do not repeat places that are already planned.`
      : '';

    const prompt = `You are an expert travel planner creating a detailed ${totalDays}-day itinerary for ${destinationStr}.

Trip Details:
- Destination: ${destinationStr}
- Duration: ${totalDays} days (${validatedData.startDate} to ${validatedData.endDate})
- Trip Style: ${tripStyle}
- ${budgetStr}
- Travelers: ${travelersStr}
${preferences ? `- Preferences: ${preferences}` : ''}
${restrictions ? `- Restrictions: ${restrictions}` : ''}
${dietaryRestrictions ? `- Dietary: ${dietaryRestrictions}` : ''}
${mustVisit ? `- Must Visit: ${mustVisit}` : ''}
${mustAvoid ? `- Must Avoid: ${mustAvoid}` : ''}
${validatedData.specialRequirements ? `- Special Requirements: ${validatedData.specialRequirements}` : ''}
${contextBlock}${continueBlock}

Generate a JSON itinerary with this EXACT structure:
{
  "id": "trip-<timestamp>",
  "title": "<catchy trip title>",
  "destination": "${destinationStr}",
  "totalDays": ${totalDays},
  "tripStyle": "${tripStyle}",
  "startDate": "${validatedData.startDate}",
  "endDate": "${validatedData.endDate}",
  "budget": { "amount": <daily_budget_number>, "currency": "USD" },
  "days": [
    {
      "day": ${fromDay},
      "date": "${partStart}",
      "title": "Day Title",
      "description": "Brief overview of the day",
      "places": [
        {
          "name": "Place Name",
          "category": "attraction|restaurant|hotel|shopping|nature|cultural|activity|transport|nightlife",
          "coordinates": { "lat": 0.0, "lng": 0.0 },
          "startTime": "09:00",
          "duration": "2 hours",
          "cost": { "amount": 0, "currency": "<local currency code>" },
          "tips": ["One short practical tip"],
          "travelToNext": { "mode": "walk", "time": 15 }
        }
      ]
    }
  ]
}

Requirements:
1. Generate exactly ${partDays} days with correct sequential dates starting from ${partStart}
2. Each day should have 4-5 places/activities
3. Include mix of categories based on trip style
4. Provide realistic lat/lng coordinates for ${destinationStr}
5. Include realistic costs in the local currency, durations, and travel times between places (omit travelToNext on the last place of a day)
6. Keep each day in one area: stops at most about 30 minutes apart, and a day trip out of the main city only when it is under about 2 hours away (never a place that needs a flight or a long drive, such as a remote national park, in a city-based trip). Every place must be worth a visit or a meal: no hotel check-ins, stations, bus terminals or airports as places (put transfers in travelToNext and practical notes in tips), never the same attraction twice, and name specific well-known restaurants (e.g. "Kushikatsu Daruma", not "Shinsekai kushikatsu")
7. Keep every text field short: names as people search for them, one tip of at most 15 words, day titles under 8 words. Write the trip title, day titles and tips in ${langName}; write place names as their common English names (e.g. "Dotonbori"), never mixing scripts inside a word
8. Output ONLY valid JSON, no markdown or extra text
${detailedOutline ? `9. CRITICAL: Follow the DETAILED ITINERARY OUTLINE above closely. It was created from the user's full planning conversation and contains their exact preferences, must-visit places, and requirements. Convert it into the JSON structure faithfully.` : ''}
${mustVisit ? `${detailedOutline ? '10' : '9'}. MANDATORY: The user specifically requested to visit: ${mustVisit}. You MUST include ALL of these places/experiences in the itinerary.` : ''}
${mustAvoid ? `${detailedOutline ? '11' : '10'}. MANDATORY: The user specifically asked to AVOID: ${mustAvoid}. Do NOT include any of these.` : ''}
${preferences ? `${detailedOutline ? '12' : '11'}. PRIORITY: Focus the itinerary on the user's stated preferences: ${preferences}.` : ''}
${dietaryRestrictions ? `${detailedOutline ? '13' : '12'}. All restaurant/food recommendations MUST respect dietary restrictions: ${dietaryRestrictions}` : ''}`;

    // Models: Claude Haiku 5.5 primary, Gemini 3.5 Flash Lite fallback. Both are fast enough to finish a
    // 5-day trip well inside the edge function time limit (Sonnet 4.6 took ~70s per day and was cut off)
    // and cost a small fraction of Sonnet. The app only uses the fields in the schema above.
    const PRIMARY_MODEL = 'anthropic/claude-haiku-5.5';
    const FALLBACK_MODEL = 'google/gemini-3.5-flash-lite';
    // Scale max_tokens by trip size: ~2500 tokens/day for detailed itineraries
    // 3-day trip = 16K, 7-day trip = 20K, 14-day trip = 40K
    const MAX_TOKENS = Math.min(65000, Math.max(16000, partDays * 2800 + 8000));
    // Stop on our own before the worker's ~150 s limit (see WORKER_STARTED_AT and the day loop)
    const TIME_BUDGET_MS = 125_000;
    // Streaming keeps connection alive, so timeouts are generous (only for initial connection)
    const PRIMARY_TIMEOUT_MS = totalDays <= 5 ? 120_000 : totalDays <= 10 ? 180_000 : 240_000;
    const FALLBACK_TIMEOUT_MS = totalDays <= 5 ? 120_000 : totalDays <= 10 ? 180_000 : 240_000;

    // FIX #5: True streaming — use TransformStream to send SSE events as they're generated
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // A job run saves finished days in plan_jobs instead of streaming them (nobody reads its stream)
    let jobHalt = false; // the job was stopped, or another run saved this day: end the run
    let jobSaved = job ? (job.days ?? []).length : 0;
    const saveJobDay = async (index: number, day: any, title?: string) => {
      if (!job || jobHalt || index !== jobSaved) return; // days come in order; one already saved is skipped
      const { data: n, error } = await db.rpc('plan_job_add_day', { p_id: job.id, p_index: index, p_day: day, p_title: title ?? null });
      if (error) console.error('[generate-itinerary] job day save failed', error);
      if (typeof n !== 'number') { jobHalt = true; return; }
      jobSaved = n;
      if (n === 1) await incrementGuestGenerationUsage(job.owner); // the job's one free-trip count
    };
    const releaseJob = (error?: string) => db.from('plan_jobs')
      .update({ lease_until: null, updated_at: new Date().toISOString(), ...(error && { error }) })
      .eq('id', job!.id).eq('status', 'running');
    const writeSSE = async (type: string, data: any) => {
      if (!job) return void (await writer.write(encoder.encode(sseEvent(type, data))));
      if (type === 'day_complete') await saveJobDay(data.dayIndex, data.day);
      else if (type === 'complete') for (const [i, d] of (data.itinerary?.days ?? []).entries()) await saveJobDay(fromDay - 1 + i, d, data.itinerary?.title);
      else if (type === 'error') await releaseJob(String(data.error ?? 'error'));
    };

    // Start the async generation pipeline (runs in background, writes to stream)
    const generatePipeline = async () => {
      try {
        // Send initial progress
        await writeSSE('progress', {
          day: 0,
          totalPlaces: 0,
          currentPlace: '',
          message: `Generating ${totalDays}-day itinerary for ${destinationStr}...`,
        });

        // --- True Streaming: call OpenRouter with stream:true, accumulate JSON, emit progress per day ---
        const callOpenRouterStream = async (model: string, timeoutMs: number): Promise<Response> => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: openRouterHeaders,
              body: JSON.stringify({
                model,
                max_tokens: MAX_TOKENS,
                stream: true,
                messages: [
                  { role: 'system', content: 'You are an expert travel planner. Generate detailed, accurate travel itineraries in valid JSON format only. No markdown code blocks, no extra text — just raw JSON.' },
                  { role: 'user', content: prompt },
                ],
              }),
              signal: controller.signal,
            });
            return resp;
          } finally {
            clearTimeout(timeout);
          }
        };

        // --- Incremental day extraction from accumulated JSON ---
        // State for incremental parsing (avoids re-scanning from start on every token)
        let daysArrayStart = -1;          // char index after `"days": [`
        let scanCursor = 0;               // position within the days sub-string
        let scanDepth = 0;                // current brace depth in scanner
        let scanObjectStart = -1;         // start of current day object
        let scanInString = false;
        let scanEscaped = false;
        const dayObjects: string[] = [];  // completed raw day JSON strings

        // Incrementally scan for newly completed day objects (O(new_tokens) per call, not O(total))
        const scanForNewDays = (json: string): number => {
          // Find "days" array start once
          if (daysArrayStart < 0) {
            // Look for "days":[  outside of JSON strings by finding the pattern
            // that's NOT inside a string value. Simple heuristic: find first occurrence.
            const match = json.match(/"days"\s*:\s*\[/);
            if (!match) return dayObjects.length;
            daysArrayStart = json.indexOf(match[0]) + match[0].length;
            scanCursor = 0;
            scanDepth = 0;
            scanObjectStart = -1;
            scanInString = false;
            scanEscaped = false;
          }

          const sub = json.slice(daysArrayStart);
          const prevCount = dayObjects.length;

          // Resume scanning from where we left off
          for (let i = scanCursor; i < sub.length; i++) {
            const ch = sub[i];
            if (scanEscaped) { scanEscaped = false; continue; }
            if (ch === '\\') { scanEscaped = true; continue; }
            if (ch === '"') { scanInString = !scanInString; continue; }
            if (scanInString) continue;
            if (ch === '{') { if (scanDepth === 0) scanObjectStart = i; scanDepth++; }
            if (ch === '}') {
              scanDepth--;
              if (scanDepth === 0 && scanObjectStart >= 0) {
                dayObjects.push(sub.slice(scanObjectStart, i + 1));
                scanObjectStart = -1;
              }
            }
            if (ch === ']' && scanDepth === 0) break;
          }
          scanCursor = sub.length; // next time, start from where we stopped
          return dayObjects.length;
        };

        // Hydrate a single day object with date + place IDs, store IDs for reuse in final hydration
        const progressivePlaceIds = new Map<string, string>(); // key: "d{dayIdx}-p{placeIdx}" → id

        const hydrateSingleDay = (dayJson: string, dayIndex: number): any => {
          try {
            const day = JSON.parse(dayJson);
            const startDateObj = new Date(partStart);
            const currentDate = new Date(startDateObj);
            currentDate.setDate(currentDate.getDate() + dayIndex);
            day.date = currentDate.toISOString().split('T')[0];
            (day.places || []).forEach((p: any, pIdx: number) => {
              if (!p.id) {
                const placeId = `place-d${fromDay - 1 + dayIndex}-p${pIdx}-${crypto.randomUUID().slice(0, 8)}`;
                p.id = placeId;
                // Store for reuse in final hydrateSkeletonWithDates
                progressivePlaceIds.set(`d${dayIndex}-p${pIdx}`, placeId);
              }
            });
            return day;
          } catch {
            return null;
          }
        };

        console.log(`[generate-itinerary] JSON generation (streaming)${detailedOutline ? ' (with outline)' : ' (direct, no outline)'}`);
        let usedModel = PRIMARY_MODEL;
        let upstreamResponse: Response | null = null;

        // Try primary model
        try {
          console.log(`[generate-itinerary] Trying primary model (streaming): ${PRIMARY_MODEL}`);
          await writeSSE('progress', {
            day: 0, totalPlaces: 0, currentPlace: '',
            message: '🧠 Generating your itinerary...',
          });
          upstreamResponse = await callOpenRouterStream(PRIMARY_MODEL, PRIMARY_TIMEOUT_MS);
          if (!upstreamResponse.ok) {
            const errorText = await upstreamResponse.text();
            console.error(`[generate-itinerary] Primary ${PRIMARY_MODEL} failed:`, upstreamResponse.status, errorText);
            if (upstreamResponse.status === 429 || upstreamResponse.status === 402 || upstreamResponse.status === 401) {
              await writeSSE('error', { error: `AI API returned ${upstreamResponse.status}` });
              return;
            }
            upstreamResponse = null;
          }
        } catch (e) {
          console.error(`[generate-itinerary] Primary model stream error:`, e);
          upstreamResponse = null;
        }

        // Fallback
        if (!upstreamResponse) {
          try {
            console.log(`[generate-itinerary] Trying fallback model (streaming): ${FALLBACK_MODEL}`);
            await writeSSE('progress', {
              day: 0, totalPlaces: 0, currentPlace: '',
              message: '🔄 Switching models, hang tight...',
            });
            usedModel = FALLBACK_MODEL;
            upstreamResponse = await callOpenRouterStream(FALLBACK_MODEL, FALLBACK_TIMEOUT_MS);
            if (!upstreamResponse.ok) {
              const errorText = await upstreamResponse.text();
              console.error(`[generate-itinerary] Fallback ${FALLBACK_MODEL} also failed:`, upstreamResponse.status, errorText);
              await writeSSE('error', { error: 'Both AI models failed' });
              return;
            }
          } catch (e) {
            console.error(`[generate-itinerary] Fallback model stream error:`, e);
            await writeSSE('error', { error: 'AI service unreachable' });
            return;
          }
        }

        // --- Read the SSE stream from OpenRouter, accumulate JSON, emit day_complete per day ---
        const reader = upstreamResponse.body!.getReader();
        const streamDecoder = new TextDecoder();
        let accumulated = '';
        let lastEmittedDay = 0;
        let firstDayAt = 0;
        let finishReason = 'unknown';
        let sseLineBuffer = ''; // buffer for lines split across chunks
        let stoppedEarly = false;

        try {
          while (!stoppedEarly) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = streamDecoder.decode(value, { stream: true });
            // Prepend any leftover from previous chunk
            const fullChunk = sseLineBuffer + chunk;
            const lines = fullChunk.split('\n');
            // Last element may be incomplete — save for next iteration
            sseLineBuffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') { continue; }

              let parsed: any;
              try { parsed = JSON.parse(data); } catch { continue; }

              // Capture finish_reason from the final chunk
              const chunkFinish = parsed.choices?.[0]?.finish_reason;
              if (chunkFinish) finishReason = chunkFinish;

              const token = parsed.choices?.[0]?.delta?.content || '';
              if (!token) continue;
              accumulated += token;

              // Detect newly completed days → extract, hydrate, emit day_complete
              const completeDays = scanForNewDays(accumulated);
              while (lastEmittedDay < completeDays) {
                const dayIndex = lastEmittedDay; // 0-based within this call
                lastEmittedDay++;
                if (lastEmittedDay === 1) firstDayAt = Date.now();
                const dayNo = fromDay - 1 + lastEmittedDay; // day number in the whole trip
                const hydratedDay = hydrateSingleDay(dayObjects[dayIndex], dayIndex);
                if (hydratedDay) {
                  const places = hydratedDay.places || [];
                  console.log(`[generate-itinerary] Day ${dayNo} streamed: "${hydratedDay.title}", ${places.length} places`);

                  // Emit progress (for stepper UI)
                  await writeSSE('progress', {
                    day: dayNo,
                    totalPlaces: places.length,
                    currentPlace: hydratedDay.title || '',
                    message: `Planning Day ${dayNo}: ${hydratedDay.title || ''}`,
                    dayTitle: hydratedDay.title || '',
                  });

                  // Emit day_complete with full hydrated day data (for progressive rendering)
                  await writeSSE('day_complete', {
                    dayIndex: dayNo - 1,
                    day: hydratedDay,
                    totalDays,
                    destination: destinationStr,
                    tripStyle,
                    startDate: validatedData.startDate,
                    endDate: validatedData.endDate,
                  });
                }
              }

              // If the next day would run past the worker's time budget, end this call cleanly instead of being killed mid-day;
              // the job's next run (or a replan) makes the remaining days. The first day carries the AI's thinking (25-75 s seen),
              // later days come every few seconds, so time a day from the first finished one (20 s until there are two)
              const now = Date.now();
              const nextDayMs = lastEmittedDay >= 2 ? (now - firstDayAt) / (lastEmittedDay - 1) : 20_000;
              if (jobHalt || (lastEmittedDay > 0 && lastEmittedDay < partDays && now - WORKER_STARTED_AT + nextDayMs > TIME_BUDGET_MS)) {
                stoppedEarly = true;
                break;
              }
            }
          }
          if (stoppedEarly) await reader.cancel().catch(() => {}); // stops the AI from generating the rest
        } finally {
          reader.releaseLock();
        }

        if (stoppedEarly) {
          console.log(`[generate-itinerary] Stopped after day ${fromDay - 1 + lastEmittedDay} of ${totalDays} at ${Date.now() - startedAt} ms (worker age ${Date.now() - WORKER_STARTED_AT} ms) to stay inside the time limit`);
          // Continuations never count the trip, so its first call counts it now
          if (!job && !isContinuation && userId) await incrementGuestGenerationUsage(accountKey(userId));
          else if (!job && !isContinuation && deviceId) await incrementGuestGenerationUsage(deviceId);
          return; // no 'complete' event: the app sees the missing days and continues
        }

        // Flush remaining SSE buffer (last line without trailing newline)
        if (sseLineBuffer.startsWith('data: ')) {
          const data = sseLineBuffer.slice(6).trim();
          if (data && data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) accumulated += token;
              const chunkFinish = parsed.choices?.[0]?.finish_reason;
              if (chunkFinish) finishReason = chunkFinish;
            } catch { /* incomplete */ }
          }
        }

        console.log(`[generate-itinerary] Stream complete. Model: ${usedModel}, finish_reason: ${finishReason}, response length: ${accumulated.length}`);
        if (finishReason === 'length') {
          console.warn(`[generate-itinerary] AI response truncated at max_tokens (${MAX_TOKENS}) for ${totalDays}-day trip! JSON repair will be attempted.`);
        }

        // Parse the accumulated JSON — with truncation repair for large itineraries
        let itinerary: any;
        const fullJSON = accumulated;
        try {
          let jsonStr = fullJSON;
          // Handle markdown code blocks if present
          const jsonMatch = fullJSON.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
          if (jsonMatch) {
            jsonStr = jsonMatch[1];
          } else {
            const objectMatch = fullJSON.match(/\{[\s\S]*\}/);
            if (objectMatch) {
              jsonStr = objectMatch[0];
            }
          }
          itinerary = JSON.parse(jsonStr);
        } catch (firstParseErr) {
          // Attempt repair: AI may have been cut off mid-JSON (token limit)
          console.warn('[generate-itinerary] First parse failed, attempting JSON repair. Response length:', fullJSON.length);
          try {
            let jsonStr = fullJSON;
            const mdMatch = fullJSON.match(/```(?:json)?\n?([\s\S]*)/);
            if (mdMatch) jsonStr = mdMatch[1].replace(/\n?```\s*$/, '');

            const firstBrace = jsonStr.indexOf('{');
            if (firstBrace >= 0) jsonStr = jsonStr.substring(firstBrace);

            let braceCount = 0;
            let bracketCount = 0;
            let inString = false;
            let escaped = false;
            for (let i = 0; i < jsonStr.length; i++) {
              const ch = jsonStr[i];
              if (escaped) { escaped = false; continue; }
              if (ch === '\\') { escaped = true; continue; }
              if (ch === '"') { inString = !inString; continue; }
              if (inString) continue;
              if (ch === '{') braceCount++;
              if (ch === '}') braceCount--;
              if (ch === '[') bracketCount++;
              if (ch === ']') bracketCount--;
            }

            let repaired = jsonStr.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/, '');
            repaired = repaired.replace(/,\s*$/, '');
            for (let i = 0; i < bracketCount; i++) repaired += ']';
            for (let i = 0; i < braceCount; i++) repaired += '}';

            itinerary = JSON.parse(repaired);
            console.log('[generate-itinerary] JSON repair succeeded! Days:', itinerary.days?.length || 0);
          } catch (repairErr) {
            console.error('[generate-itinerary] JSON repair also failed:', repairErr,
              'Response length:', fullJSON.length,
              'First 500 chars:', fullJSON.substring(0, 500),
              'Last 200 chars:', fullJSON.substring(fullJSON.length - 200));
            await writeSSE('error', { error: 'Failed to parse AI response' });
            return;
          }
        }

        // Cache the skeleton (whole trips only: a continuation holds just the remaining days)
        if (useCache) try {
          const skeleton = stripPersonalData(itinerary);
          await supabase.from('itinerary_skeleton_cache').upsert({
            cache_key: cacheKey,
            skeleton: skeleton,
            created_at: new Date().toISOString(),
          }, { onConflict: 'cache_key' });
        } catch (cacheError) {
          console.log('Cache insertion error:', cacheError);
        }

        // Hydrate with actual dates
        const hydratedItinerary = hydrateSkeletonWithDates(
          itinerary,
          partStart,
          validatedData.endDate,
          totalDays,
          destinationStr,
          tripStyle
        );

        // Reuse place IDs from progressive rendering so frontend map pins don't flash/jump
        // when the final `complete` event replaces the progressively-rendered trip
        if (progressivePlaceIds.size > 0 && hydratedItinerary.days) {
          hydratedItinerary.days.forEach((day: any, dayIdx: number) => {
            (day.places || []).forEach((p: any, pIdx: number) => {
              const storedId = progressivePlaceIds.get(`d${dayIdx}-p${pIdx}`);
              if (storedId) p.id = storedId;
            });
          });
        }

        // Count the plan on the account or the device, and save a guest's trip (a continuation's trip was counted by its first call)
        if (isContinuation || job) {
          // nothing to count (a job counts its first saved day)
        } else if (userId) {
          await incrementGuestGenerationUsage(accountKey(userId));
        } else if (deviceId) {
          await saveGuestTrip(deviceId, hydratedItinerary);
          await incrementGuestGenerationUsage(deviceId);
        }

        // Send complete event with full itinerary
        await writeSSE('complete', { itinerary: hydratedItinerary, isGuest });

      } catch (error) {
        console.error('Pipeline error in generate-itinerary:', error);
        try {
          await writeSSE('error', { error: String(error) });
        } catch (_e) {
          // Writer may already be closed
        }
      } finally {
        if (job && !jobHalt) await releaseJob(); // the next tick continues whatever is still missing
        try {
          await writer.close();
        } catch (_e) {
          // Already closed
        }
      }
    };

    // A job run works on after this reply and saves days in plan_jobs; a stream starts now and is read by the caller
    if (job) {
      EdgeRuntime.waitUntil(generatePipeline());
      return json({ status: 'running', fromDay }, 202);
    }
    generatePipeline();

    return new Response(readable, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Unhandled error in generate-itinerary:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
