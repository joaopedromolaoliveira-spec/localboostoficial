import { createFileRoute } from "@tanstack/react-router";
import { getUserFromAuthHeader, publicCors } from "@/lib/api-auth.server";
import { getWahaConfig, getWahaKeyInfo, wahaRequest, WahaHttpError, logWahaError } from "@/lib/waha.server";

export const Route = createFileRoute("/api/public/waha/health")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: publicCors() }),
      GET: async ({ request }) => {
        const cors = publicCors();
        const user = await getUserFromAuthHeader(request);
        if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

        const key_info = getWahaKeyInfo();
        const base_url = (process.env.WAHA_BASE_URL ?? process.env.WAHA_URL ?? "").replace(/\/+$/, "");

        const result: {
          ok: boolean;
          base_url: string;
          key_source: string | null;
          key_length: number;
          key_masked: string;
          checks: { endpoint: string; ok: boolean; status: number | null; error?: string }[];
        } = {
          ok: false,
          base_url,
          key_source: key_info.source,
          key_length: key_info.length,
          key_masked: key_info.masked,
          checks: [],
        };

        if (!base_url) {
          result.checks.push({ endpoint: "(config)", ok: false, status: null, error: "WAHA_BASE_URL não configurado" });
          return Response.json(result, { headers: cors });
        }

        let cfg;
        try { cfg = getWahaConfig(); } catch (e) {
          result.checks.push({ endpoint: "(config)", ok: false, status: null, error: (e as Error).message });
          return Response.json(result, { headers: cors });
        }

        const endpoints = ["/api/version", "/api/sessions"];
        let anyOk = false;
        for (const ep of endpoints) {
          try {
            await wahaRequest(cfg, ep, { method: "GET" });
            result.checks.push({ endpoint: ep, ok: true, status: 200 });
            anyOk = true;
          } catch (e) {
            const err = e as WahaHttpError | Error;
            const status = err instanceof WahaHttpError ? err.status : null;
            const message = err.message ?? String(err);
            result.checks.push({ endpoint: ep, ok: false, status, error: message.slice(0, 300) });
            await logWahaError({
              owner_id: user.id, endpoint: ep, http_status: status, message, key_info: cfg.key_info,
            });
          }
        }
        result.ok = anyOk;
        return Response.json(result, { headers: cors });
      },
    },
  },
});
