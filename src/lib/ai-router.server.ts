// AI router: turns an inbound WhatsApp message into a DB action + reply text.
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { getAvailableSlots } from "@/lib/scheduling.server";
import { sendWhatsAbleMessage } from "@/lib/whatsable.server";

const ActionSchema = z.object({
  action: z.enum(["book", "confirm", "cancel", "reschedule", "info"]),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  subject: z.string().nullable(),
  notes: z.string().nullable(),
  reply_message: z.string(),
});

export async function runAgentForInbound(params: {
  ownerId: string;
  contactId: string;
  phone: string;
  incomingText: string;
}) {
  const { ownerId, contactId, phone, incomingText } = params;

  const [{ data: bot }, { data: sched }, { data: appts }, { data: recentLogs }] = await Promise.all([
    supabaseAdmin.from("bot_settings").select("*").eq("owner_id", ownerId).maybeSingle(),
    supabaseAdmin.from("schedule_settings").select("*").eq("owner_id", ownerId).maybeSingle(),
    supabaseAdmin.from("appointments").select("*").eq("contact_id", contactId).order("start_time", { ascending: true }),
    supabaseAdmin.from("message_logs").select("direction,content,created_at").eq("contact_id", contactId).order("created_at", { ascending: false }).limit(12),
  ]);

  const slots = await getAvailableSlots(ownerId, 7);
  const tz = sched?.timezone ?? "Europe/Madrid";
  const nowIso = new Date().toISOString();
  const history = (recentLogs ?? []).reverse().map((m) => `${m.direction === "inbound" ? "Cliente" : "Assistente"}: ${m.content ?? ""}`).join("\n");
  const upcoming = (appts ?? []).filter((a) => new Date(a.start_time).getTime() > Date.now()).map((a) => `- ${a.id} | ${a.status} | ${a.start_time} → ${a.end_time} | ${a.subject ?? ""}`).join("\n") || "(nenhum)";
  const slotsStr = slots.slice(0, 12).map((s) => `- ${s.start} → ${s.end}`).join("\n") || "(sem horários disponíveis nos próximos 7 dias)";

  const system = `${bot?.system_prompt ?? "Você é um assistente de agendamento."}
Personalidade: ${bot?.personality ?? "Cordial e prestativo."}
Fuso horário: ${tz}. Data/hora atual: ${nowIso}.

REGRAS:
- Só ofereça horários da lista "HORÁRIOS DISPONÍVEIS".
- Ao marcar/reagendar, preencha start_time e end_time no formato ISO 8601 UTC.
- Confirme dia/hora ao cliente em linguagem natural (ex.: "terça 14/07 às 10h").
- Para cancelar ou confirmar um agendamento existente, use um dos IDs de "AGENDAMENTOS DO CLIENTE".
- action "info" quando for apenas responder pergunta sem alterar agendamento.

HORÁRIOS DISPONÍVEIS (próximos 7 dias, UTC):
${slotsStr}

AGENDAMENTOS DO CLIENTE:
${upcoming}

HISTÓRICO RECENTE:
${history}`;

  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const gateway = createLovableAiGatewayProvider(key);

  let result: z.infer<typeof ActionSchema>;
  try {
    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: ActionSchema }),
      system,
      prompt: `Mensagem recebida: "${incomingText}"`,
    });
    result = output;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) {
      result = { action: "info", start_time: null, end_time: null, subject: null, notes: null,
        reply_message: "Desculpe, tive um problema técnico. Pode repetir sua solicitação?" };
    } else { throw e; }
  }

  // Execute action
  try {
    if (result.action === "book" && result.start_time && result.end_time) {
      await supabaseAdmin.from("appointments").insert({
        owner_id: ownerId, contact_id: contactId,
        start_time: result.start_time, end_time: result.end_time,
        subject: result.subject, notes: result.notes,
        status: "PENDING_CONFIRMATION", timezone: tz,
      });
    } else if (result.action === "cancel") {
      const target = (appts ?? []).find((a) => new Date(a.start_time).getTime() > Date.now());
      if (target) await supabaseAdmin.from("appointments").update({ status: "CANCELLED" }).eq("id", target.id);
    } else if (result.action === "confirm") {
      const target = (appts ?? []).find((a) => a.status === "PENDING_CONFIRMATION" && new Date(a.start_time).getTime() > Date.now());
      if (target) await supabaseAdmin.from("appointments").update({ status: "CONFIRMED" }).eq("id", target.id);
    } else if (result.action === "reschedule" && result.start_time && result.end_time) {
      const target = (appts ?? []).find((a) => new Date(a.start_time).getTime() > Date.now());
      if (target) await supabaseAdmin.from("appointments").update({
        start_time: result.start_time, end_time: result.end_time, status: "CONFIRMED",
      }).eq("id", target.id);
    }
  } catch (err) {
    console.error("appointment mutation failed", err);
  }

  // Send reply
  let sendResult: unknown = null;
  try {
    sendResult = await sendWhatsAbleMessage(phone, result.reply_message);
  } catch (err) {
    console.error("whatsable send failed", err);
    sendResult = { error: String(err) };
  }

  // Log outbound
  await supabaseAdmin.from("message_logs").insert({
    owner_id: ownerId, contact_id: contactId, direction: "outbound",
    message_type: "text", content: result.reply_message,
    whatsable_response: sendResult as never,
  });
  await supabaseAdmin.from("conversations").update({
    last_bot_message_at: new Date().toISOString(),
    last_bot_message_text: result.reply_message,
  }).eq("contact_id", contactId);

  return result;
}
