import { createFileRoute } from "@tanstack/react-router";
import { getUserFromAuthHeader, publicCors } from "@/lib/api-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText } from "ai";

export const Route = createFileRoute("/api/public/ai/test")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: publicCors() }),
      POST: async ({ request }) => {
        const cors = publicCors();
        const user = await getUserFromAuthHeader(request);
        if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

        const { message } = (await request.json().catch(() => ({}))) as { message?: string };
        const text = (message ?? "").trim();
        if (!text) return new Response("Mensagem vazia", { status: 400, headers: cors });

        const { data: a } = await supabaseAdmin
          .from("ai_assistants").select("*").eq("owner_id", user.id).maybeSingle();

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("LOVABLE_API_KEY ausente", { status: 500, headers: cors });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway(a?.model || "google/gemini-3-flash-preview");
        const system = `${a?.system_prompt ?? "Você é um atendente cordial."}\n\n--- BASE DE CONHECIMENTO ---\n${a?.knowledge ?? ""}\n--- FIM ---`;

        try {
          const { text: reply } = await generateText({ model, system, prompt: text });
          return Response.json({ text: reply }, { headers: cors });
        } catch (e) {
          return new Response(`Erro IA: ${(e as Error).message}`, { status: 502, headers: cors });
        }
      },
    },
  },
});
