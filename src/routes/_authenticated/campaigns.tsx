import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({ meta: [{ title: "Campanhas — LocalBoost" }] }),
  component: () => <PlaceholderPage title="Campanhas" description="Envios em massa segmentados via WhatsApp. Em breve." />,
});
