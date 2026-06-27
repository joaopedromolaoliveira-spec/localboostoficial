import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({ meta: [{ title: "Contatos & CRM — LocalBoost" }] }),
  component: () => <PlaceholderPage title="Contatos & CRM" description="Gerencie contatos, etapas do funil e tags. Disponível em breve." />,
});
