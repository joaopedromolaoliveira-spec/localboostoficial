import { createFileRoute } from "@tanstack/react-router";
import { getUserFromAuthHeader, publicCors, sessionNameForUser } from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendText, phoneToChatId } from "@/lib/waha.server";

export const Route = createFileRoute("/api/public/campaigns/send")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: publicCors() }),
      POST: async ({ request }) => {
        const cors = publicCors();
        const user = await getUserFromAuthHeader(request);
        if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

        const { campaign_id } = (await request.json().catch(() => ({}))) as { campaign_id?: string };
        if (!campaign_id) return new Response("campaign_id obrigatório", { status: 400, headers: cors });

        const { data: campaign } = await supabaseAdmin
          .from("campaigns").select("*").eq("id", campaign_id).eq("owner_id", user.id).maybeSingle();
        if (!campaign) return new Response("Campanha não encontrada", { status: 404, headers: cors });

        const { data: cfg } = await supabaseAdmin
          .from("waha_config").select("base_url, api_key").eq("owner_id", user.id).maybeSingle();
        if (!cfg?.base_url) return new Response("Configure WAHA primeiro", { status: 400, headers: cors });

        // Audience: filter contacts by stage if specified, else all
        let query = supabaseAdmin.from("contacts").select("id, phone, name").eq("owner_id", user.id).not("phone", "is", null);
        const audience = (campaign as { audience?: { stage?: string } }).audience;
        if (audience?.stage) query = query.eq("stage", audience.stage as any);
        const { data: contacts } = await query;
        const list = contacts ?? [];

        await supabaseAdmin.from("campaigns").update({
          status: "sending", started_at: new Date().toISOString(), total_recipients: list.length,
        }).eq("id", campaign_id);

        const sessionName = sessionNameForUser(user.id);
        const template = (campaign as { message: string }).message ?? "";
        let sent = 0, failed = 0;

        // Best-effort sequential send with light throttle
        for (const c of list) {
          const text = template.replace(/\{\{\s*name\s*\}\}/gi, c.name ?? "");
          try {
            await sendText(cfg, sessionName, phoneToChatId(c.phone!), text);
            sent++;
          } catch {
            failed++;
          }
          await new Promise((r) => setTimeout(r, 600));
        }

        await supabaseAdmin.from("campaigns").update({
          status: "done", finished_at: new Date().toISOString(),
          sent_count: sent, failed_count: failed,
        }).eq("id", campaign_id);

        return Response.json({ ok: true, sent, failed }, { headers: cors });
      },
    },
  },
});
