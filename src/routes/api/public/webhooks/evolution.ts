// Inbound WhatsApp webhook from Evolution API
// Configure in Evolution API dashboard to POST to:
//   https://<project>/api/public/webhooks/evolution?owner=<USER_UUID>
import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/webhooks/evolution")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const ownerId = url.searchParams.get("owner");
          if (!ownerId) return json({ error: "missing owner" }, 400);

          const payload = await request.json().catch(() => ({} as Record<string, unknown>));

          // Handle connection status updates
          if (payload.event === "connection.update") {
            const connectionData = payload.data as Record<string, unknown>;
            const status = connectionData.status as string | undefined;
            const phoneNumber = connectionData.phoneNumber as string | undefined;
            const profileName = connectionData.profileName as string | undefined;
            const profilePictureUrl = connectionData.profilePictureUrl as string | undefined;

            if (status && phoneNumber) {
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              const instanceName = `instance_${ownerId}`;

              // Map Evolution status to our enum
              const mappedStatus = mapEvolutionStatus(status);

              // Update instance in database
              const { error: updateErr } = await supabaseAdmin
                .from("evolution_instances")
                .update({
                  status: mappedStatus,
                  phone_number: phoneNumber,
                  profile_name: profileName,
                  profile_picture_url: profilePictureUrl,
                  last_status_update: new Date().toISOString(),
                })
                .eq("owner_id", ownerId)
                .eq("instance_name", instanceName);

              if (updateErr) console.error("Failed to update instance status", updateErr);
            }

            return json({ ok: true, event: "connection.update" });
          }

          // Handle incoming messages
          if (payload.event === "messages.upsert") {
            const messages = payload.data as Record<string, unknown> | undefined;
            if (!messages) return json({ ok: true, ignored: true });

            const message = messages.message as Record<string, unknown> | undefined;
            if (!message) return json({ ok: true, ignored: true });

            const from = extractPhone(message);
            const body = extractText(message);
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

            // Ensure conversation exists
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

            // Log inbound message
            await supabaseAdmin.from("message_logs").insert({
              owner_id: ownerId,
              contact_id: contact.id,
              direction: "inbound",
              message_type: "text",
              content: body,
            });

            // Run AI agent
            const { runAgentForInboundEvolution } = await import("@/lib/ai-router-evolution.server");
            await runAgentForInboundEvolution({
              ownerId,
              contactId: contact.id,
              phone: from,
              incomingText: body,
            });

            return json({ ok: true });
          }

          return json({ ok: true, ignored: true });
        } catch (err) {
          console.error("evolution webhook error", err);
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

function mapEvolutionStatus(status: string): "disconnected" | "connecting" | "scan_qr" | "connected" | "failed" | "reconnecting" {
  const statusMap: Record<string, "disconnected" | "connecting" | "scan_qr" | "connected" | "failed" | "reconnecting"> = {
    "DISCONNECTED": "disconnected",
    "CONNECTING": "connecting",
    "SCAN_QR": "scan_qr",
    "CONNECTED": "connected",
    "FAILED": "failed",
    "RECONNECTING": "reconnecting",
  };
  return statusMap[status.toUpperCase()] ?? "disconnected";
}

function extractPhone(msg: Record<string, unknown>): string | null {
  const key = msg.key as Record<string, unknown> | undefined;
  const from = key?.remoteJid as string | undefined;
  return from ? from.replace(/\D/g, "").slice(-12) : null;
}

function extractText(msg: Record<string, unknown>): string | null {
  const conversation = msg.conversation as string | undefined;
  if (conversation) return conversation.trim();

  const extendedText = msg.extendedTextMessage as Record<string, unknown> | undefined;
  if (extendedText) {
    const text = extendedText.text as string | undefined;
    if (text) return text.trim();
  }

  return null;
}
