import { createFileRoute } from "@tanstack/react-router";
import { getUserFromAuthHeader, publicCors, sessionNameForUser } from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { startSession, getQrImage, getSessionInfo, mapWahaStatus, getWahaConfig } from "@/lib/waha.server";

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

        const sessionName = sessionNameForUser(user.id);
        const origin = new URL(request.url).origin;
        const webhookUrl = `${origin}/api/public/webhooks/waha`;

        try {
          await startSession(cfg, sessionName, webhookUrl);
        } catch (e) {
          await supabaseAdmin.from("whatsapp_sessions").upsert(
            { owner_id: user.id, name: "default", status: "failed", last_status_at: new Date().toISOString() },
            { onConflict: "owner_id,name" },
          );
          return new Response(`Falha ao iniciar sessão: ${(e as Error).message}`, { status: 502, headers: cors });
        }

        let qr: string | null = null;
        let statusKey: "scan_qr" | "working" | "connecting" | "failed" | "disconnected" = "scan_qr";
        try { qr = await getQrImage(cfg, sessionName); } catch { /* not ready */ }
        try {
          const info = await getSessionInfo(cfg, sessionName);
          statusKey = mapWahaStatus(info.status);
        } catch { /* ignore */ }

        await supabaseAdmin.from("whatsapp_sessions").upsert({
          owner_id: user.id, name: "default",
          status: statusKey, qr_code: qr, last_status_at: new Date().toISOString(),
        }, { onConflict: "owner_id,name" });

        return Response.json({ ok: true, status: statusKey, has_qr: !!qr }, { headers: cors });
      },
    },
  },
});
