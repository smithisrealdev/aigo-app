/**
 * User credit quota middleware for Edge Functions
 * Consolidated: uses user_credits table + deduct_credits RPC (single source of truth).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type OperationType =
  | 'generate_itinerary'
  | 'trip_chat'
  | 'itinerary_chat'
  | 'flight_chat'
  | 'hotel_chat'
  | 'extract_trip_info'
  | 'optimize_trip';

// Credit cost per operation type (must match src/lib/creditCosts.ts)
const OPERATION_CREDIT_COSTS: Record<OperationType, number> = {
  generate_itinerary: 15,
  trip_chat: 10,
  itinerary_chat: 3,
  flight_chat: 2,
  hotel_chat: 2,
  extract_trip_info: 1,
  optimize_trip: 5,
};

export interface QuotaCheckResult {
  hasQuota: boolean;
  tier: string;
  remaining: number;
  monthlyLimit: number;
  currentUsage: number;
  resetAt: string;
}

export interface QuotaError {
  error: string;
  code: 'QUOTA_EXCEEDED' | 'QUOTA_ERROR';
  remaining: number;
  monthlyLimit: number;
  resetAt: string;
}

/**
 * Check if user has remaining credits for AI operations
 */
export async function checkUserQuota(userId: string): Promise<{ data: QuotaCheckResult | null; error: string | null }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[quota] Supabase configuration missing');
    return { data: null, error: 'Server configuration error' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('balance, monthly_allowance, plan_id, cycle_end')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.warn('[quota] user_credits lookup failed:', error?.message);
      // Fail open: allow request if credits table not available
      return {
        data: {
          hasQuota: true,
          tier: 'free',
          remaining: 75,
          monthlyLimit: 75,
          currentUsage: 0,
          resetAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        },
        error: null,
      };
    }

    const remaining = data.balance;
    const monthlyLimit = data.monthly_allowance;
    const currentUsage = Math.max(0, monthlyLimit - remaining);

    return {
      data: {
        hasQuota: remaining > 0,
        tier: data.plan_id || 'free',
        remaining,
        monthlyLimit,
        currentUsage,
        resetAt: data.cycle_end || new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      error: null,
    };
  } catch (err) {
    console.error('[quota] Exception checking credits:', err);
    return { data: null, error: 'Failed to check credits' };
  }
}

// Model-specific credit costs for trip_chat (must match src/lib/aiModels.ts)
// Costs reflect relative API pricing: cheaper models = fewer credits
const MODEL_CREDIT_COSTS: Record<string, number> = {
  'deepseek/deepseek-v3.2': 1,
  'google/gemini-3.1-flash-lite-preview': 1,
  'google/gemini-3-flash-preview': 1,
  'google/gemini-3.1-pro-preview': 5,
  'openai/gpt-5.4': 3,
  'anthropic/claude-haiku-4-5': 2,
  'anthropic/claude-sonnet-4.6': 3,
  'anthropic/claude-opus-4.6': 15,
};

/**
 * Calculate dynamic credit cost for itinerary generation based on trip size.
 * Must match src/lib/creditCosts.ts calculateItineraryCredits()
 * Formula: base 10 + 2 per day beyond 3 days (min 10 credits).
 */
function calculateItineraryCredits(totalDays: number): number {
  const base = 10;
  const extraDays = Math.max(0, totalDays - 3);
  return base + extraDays * 2;
}

/**
 * Deduct credits after successful AI operation (replaces increment_user_usage)
 * @param modelId - Optional OpenRouter model ID for dynamic pricing (trip_chat only)
 * @param metadata - Optional extra info (e.g. { totalDays } for generate_itinerary)
 */
export async function incrementUserUsage(
  userId: string,
  operationType: OperationType,
  _tokensUsed: number = 0,
  modelId?: string,
  metadata?: { totalDays?: number }
): Promise<{ success: boolean; remaining: number; error: string | null }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[quota] Supabase configuration missing');
    return { success: false, remaining: 0, error: 'Server configuration error' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Dynamic cost calculation:
  // - generate_itinerary: based on trip totalDays (min 10)
  // - trip_chat: based on AI model
  // - everything else: static lookup
  let cost: number;
  if (operationType === 'generate_itinerary' && metadata?.totalDays) {
    cost = calculateItineraryCredits(metadata.totalDays);
    console.log(`[quota] generate_itinerary dynamic cost: ${cost} credits for ${metadata.totalDays} days`);
  } else if (operationType === 'trip_chat' && modelId && MODEL_CREDIT_COSTS[modelId]) {
    cost = MODEL_CREDIT_COSTS[modelId];
  } else {
    cost = OPERATION_CREDIT_COSTS[operationType] || 1;
  }

  try {
    const { data, error } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: cost,
      p_action: operationType,
      p_description: `Edge function: ${operationType}`,
    });

    if (error) {
      console.error('[quota] Error deducting credits:', error);
      return { success: false, remaining: 0, error: 'Failed to deduct credits' };
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (result?.success) {
      return {
        success: true,
        remaining: result.new_balance ?? 0,
        error: null,
      };
    } else {
      return {
        success: false,
        remaining: 0,
        error: result?.error_message || 'Failed to deduct credits',
      };
    }
  } catch (err) {
    console.error('[quota] Exception deducting credits:', err);
    return { success: false, remaining: 0, error: 'Failed to deduct credits' };
  }
}

/**
 * Create a quota exceeded response with proper headers
 */
export function quotaExceededResponse(
  quotaInfo: QuotaCheckResult,
  corsHeaders: Record<string, string>
): Response {
  const error: QuotaError = {
    error: `Monthly credit limit reached. You've used ${quotaInfo.currentUsage}/${quotaInfo.monthlyLimit} credits. Upgrade for more.`,
    code: 'QUOTA_EXCEEDED',
    remaining: quotaInfo.remaining,
    monthlyLimit: quotaInfo.monthlyLimit,
    resetAt: quotaInfo.resetAt,
  };

  return new Response(
    JSON.stringify(error),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': quotaInfo.monthlyLimit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': quotaInfo.resetAt,
      }
    }
  );
}

/**
 * Middleware to check credits before processing request.
 * Returns null if credits available, or a Response if exhausted.
 */
export async function checkQuotaMiddleware(
  userId: string,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  const { data: quotaInfo, error } = await checkUserQuota(userId);

  if (error) {
    console.error('[quota] Middleware error:', error);
    // On check error, allow the request (fail open for better UX)
    return null;
  }

  if (!quotaInfo) {
    return null;
  }

  if (!quotaInfo.hasQuota) {
    console.log(`[quota] User ${userId} out of credits: ${quotaInfo.currentUsage}/${quotaInfo.monthlyLimit}`);
    return quotaExceededResponse(quotaInfo, corsHeaders);
  }

  console.log(`[quota] User ${userId} has credits: ${quotaInfo.remaining}/${quotaInfo.monthlyLimit} remaining`);
  return null;
}
