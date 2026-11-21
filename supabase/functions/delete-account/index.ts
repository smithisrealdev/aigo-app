import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Deletes the signed-in user's account (R35; the App Store requires in-app deletion for apps that create accounts).
// POST with "Authorization: Bearer <access token>". Every public table that points at auth.users cascades or sets null
// (user_trips, profiles, credits...), except trip_templates.created_by, so the user's templates lose their author first.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  const token = (req.headers.get("Authorization") ?? "").split(" ")[1];
  if (!token) return json({ error: "Sign in first" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: "Sign in again" }, 401);
  const id = data.user.id;

  const { error: unlink } = await admin.from("trip_templates").update({ created_by: null }).eq("created_by", id);
  // the account's plan quota row in guest_sessions has no foreign key (see generate-itinerary accountKey)
  const { error: quota } = unlink ? { error: null } : await admin.from("guest_sessions").delete().eq("device_id", `user:${id}`);
  if (unlink || quota) {
    console.error("[delete-account] templates or quota", (unlink ?? quota)!.message);
    return json({ error: "Could not delete the account" }, 500);
  }
  const { error: removed } = await admin.auth.admin.deleteUser(id);
  if (removed) {
    console.error("[delete-account]", removed.message);
    return json({ error: "Could not delete the account" }, 500);
  }
  return json({ deleted: true });
});
