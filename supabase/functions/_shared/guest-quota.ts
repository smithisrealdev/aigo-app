/**
 * Guest device-based quota system
 * Tracks chat messages (10/week) and itinerary generation (1/week) per device_id
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface GuestQuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: string;
  deviceId: string;
}

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

/**
 * Extract device_id from request header (x-device-id)
 */
export function extractDeviceId(req: Request): string | null {
  return req.headers.get('x-device-id') || null;
}

/**
 * Check guest chat quota (10 messages/week per device)
 * Returns null if no device_id present (fall through to existing rate limiting)
 */
export async function checkGuestChatQuota(
  deviceId: string,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase.rpc('check_guest_chat_quota', {
      p_device_id: deviceId,
    });

    if (error) {
      console.error('[guest-quota] Chat quota check error:', error);
      // Fail open — allow the request
      return null;
    }

    const result = data?.[0];
    if (!result) return null;

    if (!result.allowed) {
      console.log(`[guest-quota] Device ${deviceId} chat quota exceeded: ${result.messages_used}/${result.messages_limit}`);
      return new Response(
        JSON.stringify({
          error: 'Guest chat limit reached. Sign up for free to continue!',
          code: 'GUEST_QUOTA_EXCEEDED',
          type: 'chat',
          used: result.messages_used,
          limit: result.messages_limit,
          resetAt: result.reset_at,
          requiresAuth: true,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[guest-quota] Device ${deviceId} chat: ${result.messages_used}/${result.messages_limit}`);
    return null;
  } catch (err) {
    console.error('[guest-quota] Chat check failed:', err);
    return null; // Fail open
  }
}

/**
 * Check guest generation quota (1 trip/week per device)
 */
export async function checkGuestGenerationQuota(
  deviceId: string,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase.rpc('check_guest_generation_quota', {
      p_device_id: deviceId,
    });

    if (error) {
      console.error('[guest-quota] Generation quota check error:', error);
      return null; // Fail open
    }

    const result = data?.[0];
    if (!result) return null;

    if (!result.allowed) {
      console.log(`[guest-quota] Device ${deviceId} generation quota exceeded: ${result.trips_used}/${result.trips_limit}`);
      return new Response(
        JSON.stringify({
          error: 'Guest trip generation limit reached. Sign up to create more trips!',
          code: 'GUEST_QUOTA_EXCEEDED',
          type: 'generation',
          used: result.trips_used,
          limit: result.trips_limit,
          resetAt: result.reset_at,
          requiresAuth: true,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[guest-quota] Device ${deviceId} generation: ${result.trips_used}/${result.trips_limit}`);
    return null;
  } catch (err) {
    console.error('[guest-quota] Generation check failed:', err);
    return null;
  }
}

/**
 * Increment guest chat usage AFTER a successful AI response.
 * Called separately from checkGuestChatQuota to avoid counting failed/retried requests.
 */
export async function incrementGuestChatUsage(deviceId: string): Promise<void> {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase.rpc('increment_guest_chat_usage', {
      p_device_id: deviceId,
    });
    if (error) {
      console.error('[guest-quota] Failed to increment chat usage:', error);
    } else {
      console.log(`[guest-quota] Incremented chat usage for device ${deviceId}`);
    }
  } catch (err) {
    console.error('[guest-quota] Increment chat usage error:', err);
  }
}

/**
 * Increment guest generation usage AFTER a successful itinerary generation.
 */
export async function incrementGuestGenerationUsage(deviceId: string): Promise<void> {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase.rpc('increment_guest_generation_usage', {
      p_device_id: deviceId,
    });
    if (error) {
      console.error('[guest-quota] Failed to increment generation usage:', error);
    } else {
      console.log(`[guest-quota] Incremented generation usage for device ${deviceId}`);
    }
  } catch (err) {
    console.error('[guest-quota] Increment generation usage error:', err);
  }
}

/**
 * Save a guest trip to guest_sessions for later migration
 */
export async function saveGuestTrip(deviceId: string, tripData: Record<string, unknown>): Promise<boolean> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc('save_guest_trip', {
      p_device_id: deviceId,
      p_trip_data: tripData,
    });

    if (error) {
      console.error('[guest-quota] Save guest trip error:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('[guest-quota] Save guest trip failed:', err);
    return false;
  }
}

/**
 * Get guest quota status (for frontend display)
 */
export async function getGuestQuotaStatus(deviceId: string): Promise<{
  chat: GuestQuotaResult;
  generation: GuestQuotaResult;
} | null> {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('guest_sessions')
      .select('chat_messages_used, chat_messages_limit, trips_generated, trips_limit, quota_reset_at')
      .eq('device_id', deviceId)
      .single();

    if (error || !data) return null;

    return {
      chat: {
        allowed: data.chat_messages_used < data.chat_messages_limit,
        used: data.chat_messages_used,
        limit: data.chat_messages_limit,
        resetAt: data.quota_reset_at,
        deviceId,
      },
      generation: {
        allowed: data.trips_generated < data.trips_limit,
        used: data.trips_generated,
        limit: data.trips_limit,
        resetAt: data.quota_reset_at,
        deviceId,
      },
    };
  } catch {
    return null;
  }
}
