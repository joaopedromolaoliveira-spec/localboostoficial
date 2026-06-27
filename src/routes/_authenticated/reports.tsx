import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Relatórios — LocalBoost" }] }),
  component: () => <PlaceholderPage title="Relatórios" description="Exporte métricas em PDF/Excel. Disponível na Fase 6." />,
});
