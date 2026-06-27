import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({ meta: [{ title: "Automações — LocalBoost" }] }),
  component: () => <PlaceholderPage title="Automações" description="Crie fluxos automáticos no estilo no-code. Em desenvolvimento." />,
});
