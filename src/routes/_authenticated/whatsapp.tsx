import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — LocalBoost" }] }),
  component: () => <PlaceholderPage title="Conexão WhatsApp" description="Escaneie o QR Code para conectar sua conta via WAHA. Em construção (Fase 3)." />,
});
