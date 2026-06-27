import { createFileRoute } from "@tanstack/react-router";
import { getUserFromAuthHeader, publicCors, sessionNameForUser } from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { stopSession } from "@/lib/waha.server";

export const Route = createFileRoute("/api/public/waha/stop")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: publicCors() }),
      POST: async ({ request }) => {
        const cors = publicCors();
        const user = await getUserFromAuthHeader(request);
        if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

        const { data: cfg } = await supabaseAdmin
          .from("waha_config").select("base_url, api_key").eq("owner_id", user.id).maybeSingle();
        if (cfg?.base_url) {
          try { await stopSession(cfg, sessionNameForUser(user.id)); } catch { /* ignore */ }
        }
        await supabaseAdmin.from("whatsapp_sessions").update({
          status: "disconnected", qr_code: null, phone_number: null, last_status_at: new Date().toISOString(),
        }).eq("owner_id", user.id).eq("name", "default");

        return Response.json({ ok: true }, { headers: cors });
      },
    },
  },
});
