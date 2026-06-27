import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/conversations")({
  head: () => ({ meta: [{ title: "Conversas — LocalBoost" }] }),
  component: () => <PlaceholderPage title="Conversas" description="Sua caixa de entrada unificada do WhatsApp será exibida aqui após a conexão na Fase 3." />,
});
