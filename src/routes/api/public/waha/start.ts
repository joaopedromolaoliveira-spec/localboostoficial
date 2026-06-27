import { createFileRoute } from "@tanstack/react-router";
import { getUserFromAuthHeader, publicCors, sessionNameForUser } from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { startSession, getQrImage, getSessionInfo, mapWahaStatus, chatIdToPhone, getEnvWahaConfig } from "@/lib/waha.server";

export const Route = createFileRoute("/api/public/waha/start")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: publicCors() }),
      POST: async ({ request }) => {
        const cors = publicCors();
        const user = await getUserFromAuthHeader(request);
        if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

        const cfg = getEnvWahaConfig();
        if (!cfg) return new Response("WhatsApp indisponível no momento. Tente novamente em instantes.", { status: 503, headers: cors });

        const sessionName = sessionNameForUser(user.id);
        const origin = new URL(request.url).origin;
        const webhookUrl = `${origin}/api/public/webhooks/waha`;

        // Mark connecting immediately for snappy UI
        await supabaseAdmin.from("whatsapp_sessions").upsert(
          { owner_id: user.id, name: "default", status: "connecting", last_status_at: new Date().toISOString() },
          { onConflict: "owner_id,name" },
        );

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
        let phone: string | null = null;
        try {
          const info = await getSessionInfo(cfg, sessionName);
          statusKey = mapWahaStatus(info.status);
          if (info.me?.id) phone = chatIdToPhone(info.me.id);
        } catch { /* ignore */ }

        if (statusKey !== "working") {
          try { qr = await getQrImage(cfg, sessionName); } catch { /* QR not ready yet */ }
        }

        await supabaseAdmin.from("whatsapp_sessions").upsert(
          {
            owner_id: user.id, name: "default",
            status: statusKey, qr_code: qr, phone_number: phone,
            last_status_at: new Date().toISOString(),
          },
          { onConflict: "owner_id,name" },
        );

        return Response.json({ ok: true, status: statusKey, has_qr: !!qr }, { headers: cors });
      },
    },
  },
});
