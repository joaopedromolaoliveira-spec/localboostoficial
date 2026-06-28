import { createFileRoute } from "@tanstack/react-router";
import { getUserFromAuthHeader, publicCors, sessionNameForUser } from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendText, phoneToChatId, getWahaConfig } from "@/lib/waha.server";

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

        let cfg;
        try { cfg = getWahaConfig(); } catch (e) { return new Response((e as Error).message, { status: 500, headers: cors }); }

        let query = supabaseAdmin.from("contacts").select("id, phone, name").eq("owner_id", user.id).not("phone", "is", null);
        if (campaign.target_stage) query = query.eq("stage", campaign.target_stage);
        const { data: contacts } = await query;
        const list = contacts ?? [];

        await supabaseAdmin.from("campaigns").update({
          status: "sending", total_count: list.length,
        }).eq("id", campaign_id);

        const sessionName = sessionNameForUser(user.id);
        const template = campaign.message ?? "";
        let sent = 0, failed = 0;
        for (const c of list) {
          const text = template.replace(/\{\{\s*name\s*\}\}/gi, c.name ?? "");
          try { await sendText(cfg, sessionName, phoneToChatId(c.phone!), text); sent++; }
          catch { failed++; }
          await new Promise((r) => setTimeout(r, 600));
        }

        await supabaseAdmin.from("campaigns").update({
          status: "done", sent_count: sent, failed_count: failed,
        }).eq("id", campaign_id);

        return Response.json({ ok: true, sent, failed }, { headers: cors });
      },
    },
  },
});
