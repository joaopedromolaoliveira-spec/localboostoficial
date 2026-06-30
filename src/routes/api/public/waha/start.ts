import { createFileRoute } from "@tanstack/react-router";
import { getUserFromAuthHeader, publicCors, sessionNameForUser } from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ensureSessionReady, getWahaConfig } from "@/lib/waha.server";

export const Route = createFileRoute("/api/public/waha/start")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: publicCors() }),
      POST: async ({ request }) => {
        const cors = publicCors();
        const user = await getUserFromAuthHeader(request);
        if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

        let cfg;
        try { cfg = getWahaConfig(); } catch (e) {
          return new Response((e as Error).message, { status: 500, headers: cors });
        }

        const body = (await request.json().catch(() => ({}))) as { reset?: boolean };
        const sessionName = sessionNameForUser(user.id);
        const origin = new URL(request.url).origin;
        const webhookUrl = `${origin}/api/public/webhooks/waha`;

        await supabaseAdmin.from("whatsapp_sessions").upsert(
          { owner_id: user.id, name: "default", status: "connecting", qr_code: null, last_status_at: new Date().toISOString() },
          { onConflict: "owner_id,name" },
        );

        let result: Awaited<ReturnType<typeof ensureSessionReady>>;
        try {
          result = await ensureSessionReady(cfg, sessionName, webhookUrl, !!body.reset);
        } catch (e) {
          await supabaseAdmin.from("whatsapp_sessions").upsert(
            { owner_id: user.id, name: "default", status: "failed", last_status_at: new Date().toISOString() },
            { onConflict: "owner_id,name" },
          );
          return new Response(`Falha ao iniciar sessão: ${(e as Error).message}`, { status: 502, headers: cors });
        }

        await supabaseAdmin.from("whatsapp_sessions").upsert({
          owner_id: user.id, name: "default",
          status: result.status,
          qr_code: result.status === "working" ? null : result.qr,
          phone_number: result.phoneNumber,
          last_status_at: new Date().toISOString(),
        }, { onConflict: "owner_id,name" });

        return Response.json({ ok: true, status: result.status, has_qr: !!result.qr }, { headers: cors });
      },
    },
  },
});
