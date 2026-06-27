import { createFileRoute } from "@tanstack/react-router";
import { getUserFromAuthHeader, publicCors, sessionNameForUser } from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { startSession, getQrImage, getSessionInfo, mapWahaStatus } from "@/lib/waha.server";

export const Route = createFileRoute("/api/public/waha/start")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: publicCors() }),
      POST: async ({ request }) => {
        const cors = publicCors();
        const user = await getUserFromAuthHeader(request);
        if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

        const { data: cfg } = await supabaseAdmin
          .from("waha_config").select("base_url, api_key").eq("owner_id", user.id).maybeSingle();
        if (!cfg?.base_url) {
          return new Response("Configure a URL do WAHA em WhatsApp > Configuração.", { status: 400, headers: cors });
        }

        const sessionName = sessionNameForUser(user.id);
        const origin = new URL(request.url).origin;
        const webhookUrl = `${origin}/api/public/webhooks/waha`;

        try {
          await startSession(cfg, sessionName, webhookUrl);
        } catch (e) {
          const msg = (e as Error).message;
          await supabaseAdmin.from("whatsapp_sessions").upsert(
            { owner_id: user.id, name: "default", status: "failed", last_status_at: new Date().toISOString() },
            { onConflict: "owner_id,name" },
          );
          return new Response(`Falha ao iniciar WAHA: ${msg}`, { status: 502, headers: cors });
        }

        // Try to fetch QR and current status (best-effort; some WAHA versions need a tick)
        let qr: string | null = null;
        let status: string = "scan_qr";
        try { qr = await getQrImage(cfg, sessionName); } catch { /* not ready yet */ }
        try {
          const info = await getSessionInfo(cfg, sessionName);
          status = mapWahaStatus(info.status);
        } catch { /* ignore */ }

        await supabaseAdmin.from("whatsapp_sessions").upsert(
          {
            owner_id: user.id,
            name: "default",
            status: status as any,
            qr_code: qr,
            session_id: sessionName,
            last_status_at: new Date().toISOString(),
          },
          { onConflict: "owner_id,name" },
        );

        return Response.json({ ok: true, status, has_qr: !!qr }, { headers: cors });
      },
    },
  },
});
