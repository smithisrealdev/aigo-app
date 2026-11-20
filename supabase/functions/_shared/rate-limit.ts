import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// จำกัดจำนวนครั้งต่อช่วงเวลา ใช้กับผู้เยี่ยมชม กันคนยิงจนบิล AI พุ่ง (เลขเครื่องปลอมได้ จึงนับตาม IP ด้วย)
// ตารางและฟังก์ชันอยู่ใน supabase/rate_limits.sql

/** IP ของผู้เรียก (Supabase ส่งต่อมาใน x-forwarded-for) */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
}

/** นับหนึ่งครั้งแล้วบอกว่ายังไม่เกิน limit ในช่วงนี้ไหม; ฐานข้อมูลมีปัญหาให้ผ่าน เพราะวงเงินบน OpenRouter ยังกันบิลไว้อีกชั้น */
export async function allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await sb.rpc("hit_rate_limit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
  if (error) {
    console.error("[rate-limit]", error.message);
    return true;
  }
  return data === true;
}

export function tooMany(corsHeaders: Record<string, string>, message: string, retryAfterSeconds: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfterSeconds) },
  });
}
