import { createFileRoute } from "@tanstack/react-router";
import { getUserFromAuthHeader, publicCors, sessionNameForUser } from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requestPairingCode } from "@/lib/waha.server";

export const Route = createFileRoute("/api/public/waha/pair")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: publicCors() }),
      POST: async ({ request }) => {
        const cors = publicCors();
        const user = await getUserFromAuthHeader(request);
        if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

        const body = (await request.json().catch(() => ({}))) as { phone?: string };
        const phone = (body.phone ?? "").replace(/\D/g, "");
        if (phone.length < 10) return new Response("Telefone inválido", { status: 400, headers: cors });

        const { data: cfg } = await supabaseAdmin
          .from("waha_config").select("base_url, api_key").eq("owner_id", user.id).maybeSingle();
        if (!cfg?.base_url) return new Response("Configure WAHA primeiro", { status: 400, headers: cors });

        try {
          const result = await requestPairingCode(cfg, sessionNameForUser(user.id), phone);
          return Response.json({ ok: true, code: result.code }, { headers: cors });
        } catch (e) {
          return new Response(`Falha no pareamento: ${(e as Error).message}`, { status: 502, headers: cors });
        }
      },
    },
  },
});
