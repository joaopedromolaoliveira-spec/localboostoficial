// Inbound WhatsApp webhook from WhatsAble.
// Configure in WhatsAble dashboard to POST to:
//   https://<project>--<id>.lovable.app/api/public/webhooks/whatsable?owner=<USER_UUID>
import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/webhooks/whatsable")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const ownerId = url.searchParams.get("owner");
          if (!ownerId) return json({ error: "missing owner" }, 400);

          const payload = await request.json().catch(() => ({} as Record<string, unknown>));
          const from = extractPhone(payload);
          const body = extractText(payload);
          if (!from || !body) return json({ ok: true, ignored: true });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Upsert contact
          const { data: contact, error: cErr } = await supabaseAdmin
            .from("contacts")
            .upsert(
              { owner_id: ownerId, phone_number: from, last_interaction_at: new Date().toISOString() },
              { onConflict: "owner_id,phone_number" }
            )
            .select("id, phone_number")
            .single();
          if (cErr || !contact) return json({ error: cErr?.message ?? "contact upsert failed" }, 500);

          // Ensure conversation
          await supabaseAdmin.from("conversations").upsert(
            {
              owner_id: ownerId,
              contact_id: contact.id,
              last_user_message_at: new Date().toISOString(),
              last_user_message_text: body,
              session_open: true,
            },
            { onConflict: "contact_id" }
          );

          await supabaseAdmin.from("message_logs").insert({
            owner_id: ownerId, contact_id: contact.id,
            direction: "inbound", message_type: "text", content: body,
          });

          const { runAgentForInbound } = await import("@/lib/ai-router.server");
          await runAgentForInbound({ ownerId, contactId: contact.id, phone: from, incomingText: body });

          return json({ ok: true });
        } catch (err) {
          console.error("whatsable webhook error", err);
          return json({ error: String(err) }, 500);
        }
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function extractPhone(p: Record<string, unknown>): string | null {
  const v =
    (p.from as string | undefined) ??
    (p.phone as string | undefined) ??
    (p.sender as string | undefined) ??
    ((p.message as Record<string, unknown> | undefined)?.from as string | undefined) ??
    ((p.contact as Record<string, unknown> | undefined)?.phone as string | undefined);
  return v ? String(v).replace(/\D/g, "") : null;
}
function extractText(p: Record<string, unknown>): string | null {
  const msg = p.message as Record<string, unknown> | undefined;
  const v =
    (p.text as string | undefined) ??
    (p.body as string | undefined) ??
    (msg?.text as string | undefined) ??
    (msg?.body as string | undefined) ??
    ((msg?.content as Record<string, unknown> | undefined)?.text as string | undefined);
  return v ? String(v).trim() : null;
}
