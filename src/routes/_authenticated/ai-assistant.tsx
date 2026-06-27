import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
export const Route = createFileRoute("/_authenticated/ai-assistant")({
  head: () => ({ meta: [{ title: "Assistente IA — LocalBoost" }] }),
  component: () => <PlaceholderPage title="Assistente IA" description="Treine sua IA com base de conhecimento e responda 24/7." />,
});
