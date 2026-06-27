import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Assinatura — LocalBoost" }] }),
  component: () => <PlaceholderPage title="Assinatura" description="Gerencie seu plano e pagamentos via Stripe. Disponível na Fase 4." />,
});
