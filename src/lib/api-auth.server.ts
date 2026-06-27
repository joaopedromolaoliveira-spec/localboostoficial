// Auth helpers shared by /api/public/* routes that act on behalf of a user.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getUserFromAuthHeader(req: Request) {
  const auth = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export function publicCors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

export function sessionNameForUser(userId: string) {
  // WAHA session name must be alnum/dash. Strip dashes from UUID.
  return `u${userId.replace(/-/g, "")}`;
}
