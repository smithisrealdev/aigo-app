import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// API names for tracking
export const API_NAMES = {
  GOOGLE_PLACES_FIND: 'google-places-find',
  GOOGLE_PLACES_DETAILS: 'google-places-details',
  GOOGLE_PLACES_PHOTO: 'google-places-photo',
  GOOGLE_DIRECTIONS: 'google-directions',
  GOOGLE_SEARCH: 'google-search',
  GOOGLE_GEOCODE: 'google-geocode',
  LOVABLE_AI: 'lovable-ai',
} as const;

export type ApiName = typeof API_NAMES[keyof typeof API_NAMES];

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  dailyLimit: number;
  currentUsage: number;
  message?: string;
}

// Create a Supabase client with service role for API usage tracking
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Check if API call is allowed based on rate limits
 */
export async function checkRateLimit(apiName: ApiName): Promise<RateLimitResult> {
  const supabase = getSupabaseClient();
  const today = new Date().toISOString().split('T')[0];

  try {
    // Get rate limit configuration
    const { data: limitConfig, error: limitError } = await supabase
      .from('api_rate_limits')
      .select('daily_limit, is_enabled')
      .eq('api_name', apiName)
      .maybeSingle();

    if (limitError) {
      console.error('[api-usage] Error fetching rate limit:', limitError);
      // Allow by default if config fetch fails
      return { allowed: true, remaining: -1, dailyLimit: -1, currentUsage: 0 };
    }

    // If no config or disabled, allow all
    if (!limitConfig || !limitConfig.is_enabled) {
      return { allowed: true, remaining: -1, dailyLimit: -1, currentUsage: 0 };
    }

    // Get current usage for today
    const { data: usageData, error: usageError } = await supabase
      .from('api_usage')
      .select('request_count')
      .eq('api_name', apiName)
      .eq('usage_date', today);

    if (usageError) {
      console.error('[api-usage] Error fetching usage:', usageError);
      return { allowed: true, remaining: -1, dailyLimit: limitConfig.daily_limit, currentUsage: 0 };
    }

    // Sum all requests for this API today
    const currentUsage = usageData?.reduce((sum, row) => sum + (row.request_count || 0), 0) || 0;
    const remaining = limitConfig.daily_limit - currentUsage;
    const allowed = currentUsage < limitConfig.daily_limit;

    return {
      allowed,
      remaining: Math.max(0, remaining),
      dailyLimit: limitConfig.daily_limit,
      currentUsage,
      message: allowed ? undefined : `Rate limit exceeded for ${apiName}. Daily limit: ${limitConfig.daily_limit}`,
    };
  } catch (error) {
    console.error('[api-usage] Rate limit check error:', error);
    // Allow by default on error
    return { allowed: true, remaining: -1, dailyLimit: -1, currentUsage: 0 };
  }
}

/**
 * Track an API call
 *
 * FIX: Previously used upsert which OVERWRITES request_count instead of incrementing.
 * Every row showed request_count: 1 regardless of actual usage.
 * Now uses RPC increment_api_usage as primary (atomic increment), with upsert as fallback
 * only for initial row creation.
 */
export async function trackApiUsage(
  apiName: ApiName,
  endpoint: string,
  count: number = 1
): Promise<void> {
  const supabase = getSupabaseClient();
  const today = new Date().toISOString().split('T')[0];

  try {
    // Get cost per request from config
    const { data: limitConfig } = await supabase
      .from('api_rate_limits')
      .select('cost_per_request')
      .eq('api_name', apiName)
      .maybeSingle();

    const costPerRequest = limitConfig?.cost_per_request || 0;
    const estimatedCost = costPerRequest * count;

    // Primary: Use RPC to atomically increment (correct behavior)
    const { error: rpcError } = await supabase.rpc('increment_api_usage', {
      p_api_name: apiName,
      p_endpoint: endpoint,
      p_usage_date: today,
      p_count: count,
      p_cost: estimatedCost,
    });

    if (rpcError) {
      // Fallback: insert new row if RPC fails (e.g., row doesn't exist yet)
      console.warn('[api-usage] RPC increment failed, trying upsert:', rpcError.message);
      const { error: upsertError } = await supabase
        .from('api_usage')
        .upsert(
          {
            api_name: apiName,
            endpoint: endpoint,
            usage_date: today,
            request_count: count,
            estimated_cost: estimatedCost,
          },
          {
            onConflict: 'api_name,endpoint,usage_date',
            ignoreDuplicates: false,
          }
        );

      if (upsertError) {
        console.error('[api-usage] Failed to track usage:', upsertError);
      }
    }

    console.log(`[api-usage] Tracked ${count} call(s) to ${apiName}/${endpoint}`);
  } catch (error) {
    console.error('[api-usage] Track usage error:', error);
    // Don't throw - tracking failure shouldn't block the main request
  }
}

/**
 * Combined check + track helper
 */
export async function checkAndTrackApiUsage(
  apiName: ApiName,
  endpoint: string
): Promise<RateLimitResult> {
  const result = await checkRateLimit(apiName);
  
  if (result.allowed) {
    // Track in background, don't await
    trackApiUsage(apiName, endpoint).catch(err => 
      console.error('[api-usage] Background track failed:', err)
    );
  }
  
  return result;
}

/**
 * Create rate limit exceeded response
 */
export function rateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      success: false,
      error: result.message || 'Rate limit exceeded',
      rateLimited: true,
      dailyLimit: result.dailyLimit,
      currentUsage: result.currentUsage,
    }),
    {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}
