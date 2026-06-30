import { createFileRoute } from "@tanstack/react-router";
import { getUserFromAuthHeader, publicCors, sessionNameForUser } from "@/lib/api-auth.server";
import { ensureSessionReady, requestPairingCode, getWahaConfig } from "@/lib/waha.server";

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

        try {
          const cfg = getWahaConfig();
          const sessionName = sessionNameForUser(user.id);
          const origin = new URL(request.url).origin;
          await ensureSessionReady(cfg, sessionName, `${origin}/api/public/webhooks/waha`);
          const result = await requestPairingCode(cfg, sessionName, phone);
          return Response.json({ ok: true, code: result.code }, { headers: cors });
        } catch (e) {
          return new Response(`Falha no pareamento: ${(e as Error).message}`, { status: 502, headers: cors });
        }
      },
    },
  },
});
