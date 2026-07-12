// AI router for Evolution API: turns inbound WhatsApp message into real LLM response
import { generateText } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { sendEvolutionMessage } from "@/lib/evolution-api.server";

export async function runAgentForInboundEvolution(params: {
  ownerId: string;
  contactId: string;
  phone: string;
  incomingText: string;
}) {
  const { ownerId, contactId, phone, incomingText } = params;

  // Fetch bot config, knowledge base, FAQ, and recent messages
  const [{ data: bot }, { data: faqItems }, { data: kbDocs }, { data: recentLogs }] = await Promise.all([
    supabaseAdmin.from("bot_settings").select("*").eq("owner_id", ownerId).maybeSingle(),
    supabaseAdmin.from("faq_items").select("*").eq("owner_id", ownerId).order("order_index", { ascending: true }),
    supabaseAdmin.from("knowledge_documents").select("*").eq("owner_id", ownerId).limit(10),
    supabaseAdmin.from("message_logs").select("direction,content,created_at").eq("contact_id", contactId).order("created_at", { ascending: false }).limit(20),
  ]);

  // Build knowledge base context
  const faqContext = (faqItems ?? [])
    .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
    .join("\n\n");

  const kbContext = (kbDocs ?? [])
    .map((doc) => `[${doc.title}]\n${doc.content}`)
    .join("\n\n");

  const conversationHistory = (recentLogs ?? [])
    .reverse()
    .map((m) => `${m.direction === "inbound" ? "Cliente" : "Assistente"}: ${m.content ?? ""}`)
    .join("\n");

  // Build system prompt with all context
  const systemPrompt = `${bot?.system_prompt ?? "Você é um assistente de atendimento ao cliente cordial e prestativo."}

PERSONALIDADE: ${bot?.personality ?? "Cordial, direto e prestativo. Responde em português."}
IDIOMA: ${bot?.language ?? "pt-BR"}
OBJETIVO: ${bot?.objective ?? "Ajudar o cliente de forma clara e eficiente."}

${faqContext ? `PERGUNTAS FREQUENTES (FAQ):\n${faqContext}\n` : ""}
${kbContext ? `BASE DE CONHECIMENTO:\n${kbContext}\n` : ""}

INSTRUÇÕES IMPORTANTES:
- Responda sempre em português brasileiro.
- Seja conciso e direto nas respostas.
- Se não souber a resposta, diga "Desculpe, não tenho essa informação disponível. Você poderia fornecer mais detalhes?"
- Não invente informações ou dados que não estão na base de conhecimento.
- Se o cliente solicitar falar com um atendente humano, responda: "Vou conectá-lo com um atendente. Por favor, aguarde."
- Mantenha o contexto da conversa e referência mensagens anteriores quando relevante.
- Seja empático e profissional em todas as interações.`;

  // Get LLM provider
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const gateway = createLovableAiGatewayProvider(key);

  // Generate response using real LLM
  let replyMessage: string;
  try {
    const { text } = await generateText({
      model: gateway(bot?.ai_model ?? "google/gemini-3-flash-preview"),
      system: systemPrompt,
      prompt: `Mensagem recebida: "${incomingText}"\n\nHistórico recente:\n${conversationHistory || "(sem histórico anterior)"}`,
      temperature: bot?.temperature ?? 0.7,
      maxTokens: bot?.max_tokens ?? 1024,
    });
    replyMessage = text;
  } catch (e) {
    console.error("LLM generation failed", e);
    replyMessage = "Desculpe, tive um problema técnico ao processar sua mensagem. Pode tentar novamente?";
  }

  // Send reply via Evolution API
  let sendResult: unknown = null;
  try {
    sendResult = await sendEvolutionMessage(
      `instance_${ownerId}`,
      phone,
      replyMessage
    );
  } catch (err) {
    console.error("evolution send failed", err);
    sendResult = { error: String(err) };
  }

  // Log outbound message
  await supabaseAdmin.from("message_logs").insert({
    owner_id: ownerId,
    contact_id: contactId,
    direction: "outbound",
    message_type: "text",
    content: replyMessage,
    whatsable_response: sendResult as never,
  });

  // Update conversation
  await supabaseAdmin.from("conversations").update({
    last_bot_message_at: new Date().toISOString(),
    last_bot_message_text: replyMessage,
  }).eq("contact_id", contactId);

  return { success: true, message: replyMessage };
}
