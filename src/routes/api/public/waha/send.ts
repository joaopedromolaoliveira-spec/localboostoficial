import { createFileRoute } from "@tanstack/react-router";
import { getUserFromAuthHeader, publicCors, sessionNameForUser } from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendText, phoneToChatId } from "@/lib/waha.server";

export const Route = createFileRoute("/api/public/waha/send")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: publicCors() }),
      POST: async ({ request }) => {
        const cors = publicCors();
        const user = await getUserFromAuthHeader(request);
        if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

        const body = (await request.json().catch(() => ({}))) as {
          conversation_id?: string;
          text?: string;
          is_ai?: boolean;
        };
        const text = (body.text ?? "").trim();
        if (!text) return new Response("Texto obrigatório", { status: 400, headers: cors });
        if (!body.conversation_id) return new Response("conversation_id obrigatório", { status: 400, headers: cors });

        const { data: conv, error: convErr } = await supabaseAdmin
          .from("conversations")
          .select("id, owner_id, contact:contacts(phone)")
          .eq("id", body.conversation_id)
          .maybeSingle();
        if (convErr || !conv || conv.owner_id !== user.id) {
          return new Response("Conversa não encontrada", { status: 404, headers: cors });
        }

        const { data: cfg } = await supabaseAdmin
          .from("waha_config").select("base_url, api_key").eq("owner_id", user.id).maybeSingle();
        if (!cfg?.base_url) return new Response("Configure WAHA primeiro", { status: 400, headers: cors });

        const phone = (conv.contact as { phone: string } | null)?.phone;
        if (!phone) return new Response("Contato sem telefone", { status: 400, headers: cors });

        const chatId = phoneToChatId(phone);
        const sessionName = sessionNameForUser(user.id);

        // Insert outbound message as 'sending'
        const { data: inserted, error: insErr } = await supabaseAdmin.from("messages").insert({
          conversation_id: conv.id,
          owner_id: user.id,
          direction: "outbound",
          status: "sending",
          kind: "text",
          body: text,
          is_ai: !!body.is_ai,
        }).select("id").single();
        if (insErr) return new Response(insErr.message, { status: 500, headers: cors });

        try {
          await sendText(cfg, sessionName, chatId, text);
          await supabaseAdmin.from("messages").update({ status: "sent" }).eq("id", inserted!.id);
          await supabaseAdmin.from("conversations").update({
            last_message_at: new Date().toISOString(),
            last_message_preview: text.slice(0, 120),
          }).eq("id", conv.id);
          return Response.json({ ok: true }, { headers: cors });
        } catch (e) {
          await supabaseAdmin.from("messages").update({ status: "failed" }).eq("id", inserted!.id);
          return new Response(`Falha ao enviar: ${(e as Error).message}`, { status: 502, headers: cors });
        }
      },
    },
  },
});
