import { createFileRoute } from "@tanstack/react-router";
import { publicCors } from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { chatIdToPhone, mapWahaStatus, sendText } from "@/lib/waha.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText } from "ai";

type WahaWebhook = {
  event?: string;
  session?: string;
  payload?: any;
};

// Public WAHA webhook. We identify the user via the session name (uXXXXXX...).
export const Route = createFileRoute("/api/public/webhooks/waha")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: publicCors() }),
      POST: async ({ request }) => {
        const cors = publicCors();
        const body = (await request.json().catch(() => null)) as WahaWebhook | null;
        if (!body || !body.session) return new Response("ok", { headers: cors });

        const sessionName = body.session;
        // Owner is encoded in the session name: u + UUID without dashes (32 hex chars).
        const m = /^u([0-9a-f]{32})$/i.exec(sessionName);
        if (!m) return new Response("ok", { headers: cors });
        const hex = m[1];
        const ownerId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
        const { data: sess } = await supabaseAdmin
          .from("whatsapp_sessions").select("owner_id").eq("owner_id", ownerId).eq("name", "default").maybeSingle();
        if (!sess) return new Response("ok", { headers: cors });

        const ev = body.event ?? "";

        if (ev === "session.status") {
          const status = mapWahaStatus(body.payload?.status);
          await supabaseAdmin.from("whatsapp_sessions").update({
            status: status as any,
            phone_number: body.payload?.me?.id ? chatIdToPhone(body.payload.me.id) : null,
            last_status_at: new Date().toISOString(),
            qr_code: status === "working" ? null : undefined,
          }).eq("owner_id", ownerId).eq("name", "default");
          return new Response("ok", { headers: cors });
        }

        if (ev === "message" || ev === "message.any") {
          const p = body.payload ?? {};
          if (p.fromMe) return new Response("ok", { headers: cors }); // ignore echoes
          const chatId: string = p.from ?? p.chatId ?? "";
          if (!chatId.endsWith("@c.us")) return new Response("ok", { headers: cors }); // skip groups for now
          const phone = chatIdToPhone(chatId);
          const text: string = p.body ?? p.text ?? "";
          const pushName: string | undefined = p._data?.notifyName ?? p.notifyName ?? undefined;

          // Upsert contact
          const { data: existingContact } = await supabaseAdmin
            .from("contacts").select("id, name").eq("owner_id", ownerId).eq("phone", phone).maybeSingle();
          let contactId = existingContact?.id;
          if (!contactId) {
            const ins = await supabaseAdmin.from("contacts").insert({
              owner_id: ownerId, phone, name: pushName ?? null, stage: "lead",
            }).select("id").single();
            contactId = ins.data?.id;
          } else if (!existingContact?.name && pushName) {
            await supabaseAdmin.from("contacts").update({ name: pushName }).eq("id", contactId);
          }
          if (!contactId) return new Response("ok", { headers: cors });

          // Upsert conversation
          const { data: existingConv } = await supabaseAdmin
            .from("conversations").select("id, ai_enabled, status")
            .eq("owner_id", ownerId).eq("contact_id", contactId).maybeSingle();
          let convId = existingConv?.id;
          let aiEnabled = existingConv?.ai_enabled ?? false;
          if (!convId) {
            const ins = await supabaseAdmin.from("conversations").insert({
              owner_id: ownerId, contact_id: contactId, status: "open", ai_enabled: true,
            }).select("id, ai_enabled").single();
            convId = ins.data?.id;
            aiEnabled = ins.data?.ai_enabled ?? true;
          }
          if (!convId) return new Response("ok", { headers: cors });

          // Insert inbound message
          await supabaseAdmin.from("messages").insert({
            conversation_id: convId,
            owner_id: ownerId,
            direction: "inbound",
            status: "delivered",
            kind: p.hasMedia ? "image" : "text",
            body: text,
            waha_id: p.id ?? null,
          });
          await supabaseAdmin.from("conversations").update({
            last_message_at: new Date().toISOString(),
            last_message_preview: text.slice(0, 120),
            unread_count: (existingConv as any)?.unread_count ? (existingConv as any).unread_count + 1 : 1,
          }).eq("id", convId);

          // Trigger automations (keyword match)
          const lower = text.toLowerCase();
          const { data: autos } = await supabaseAdmin
            .from("automations").select("id, trigger_type, trigger_config, steps, runs_count")
            .eq("owner_id", ownerId).eq("enabled", true);
          for (const a of autos ?? []) {
            const kw = (a.trigger_config as any)?.keyword?.toString().toLowerCase();
            if (a.trigger_type === "keyword" && kw && lower.includes(kw)) {
              const step = ((a.steps as any[]) ?? [])[0];
              if (step?.type === "send_text" && step.text) {
                await dispatchOutbound(ownerId, convId, step.text, false);
                await supabaseAdmin.from("automations").update({ runs_count: (a.runs_count ?? 0) + 1 }).eq("id", a.id);
                return new Response("ok", { headers: cors });
              }
            }
          }

          // AI auto-reply
          if (aiEnabled) {
            const { data: assistant } = await supabaseAdmin
              .from("ai_assistants").select("*").eq("owner_id", ownerId).maybeSingle();
            if (assistant && assistant.enabled) {
              try {
                const key = process.env.LOVABLE_API_KEY;
                if (!key) throw new Error("LOVABLE_API_KEY ausente");
                const gateway = createLovableAiGatewayProvider(key);
                const model = gateway(assistant.model || "google/gemini-3-flash-preview");

                // Load last 20 messages for context
                const { data: history } = await supabaseAdmin.from("messages")
                  .select("direction, body").eq("conversation_id", convId)
                  .order("created_at", { ascending: true }).limit(20);

                const system = `${assistant.system_prompt}\n\n--- BASE DE CONHECIMENTO ---\n${assistant.knowledge ?? ""}\n--- FIM ---\nResponda em português, de forma curta e clara. Se o cliente pedir um humano ou a situação for delicada, responda: "ESCALAR_HUMANO".`;

                const messages = (history ?? []).map((m) => ({
                  role: m.direction === "inbound" ? ("user" as const) : ("assistant" as const),
                  content: m.body ?? "",
                }));

                const { text: reply } = await generateText({ model, system, messages });

                if (reply.includes("ESCALAR_HUMANO")) {
                  await supabaseAdmin.from("conversations").update({ ai_enabled: false, status: "open" }).eq("id", convId);
                } else {
                  await dispatchOutbound(ownerId, convId, reply, true);
                }
              } catch (err) {
                console.error("[AI auto-reply]", (err as Error).message);
              }
            }
          }
        }

        return new Response("ok", { headers: cors });
      },
    },
  },
});

async function dispatchOutbound(ownerId: string, convId: string, text: string, isAi: boolean) {
  const { data: cfg } = await supabaseAdmin
    .from("waha_config").select("base_url, api_key").eq("owner_id", ownerId).maybeSingle();
  const { data: conv } = await supabaseAdmin
    .from("conversations").select("id, contact:contacts(phone)").eq("id", convId).maybeSingle();
  const phone = (conv?.contact as { phone: string } | null)?.phone;
  if (!cfg?.base_url || !phone) return;

  const { sessionNameForUser } = await import("@/lib/api-auth.server");
  const { sendText, phoneToChatId } = await import("@/lib/waha.server");

  const { data: inserted } = await supabaseAdmin.from("messages").insert({
    conversation_id: convId, owner_id: ownerId, direction: "outbound", status: "queued",
    kind: "text", body: text, is_ai: isAi,
  }).select("id").single();

  try {
    await sendText(cfg, sessionNameForUser(ownerId), phoneToChatId(phone), text);
    if (inserted) await supabaseAdmin.from("messages").update({ status: "sent" }).eq("id", inserted.id);
    await supabaseAdmin.from("conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: text.slice(0, 120),
    }).eq("id", convId);
  } catch (e) {
    if (inserted) await supabaseAdmin.from("messages").update({ status: "failed" }).eq("id", inserted.id);
    console.error("[outbound]", (e as Error).message);
  }
}
