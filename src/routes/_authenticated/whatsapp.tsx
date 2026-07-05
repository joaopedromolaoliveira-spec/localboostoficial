import { createFileRoute } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { WhatsAppProvider } from "@/contexts/WhatsAppContext";
import { WhatsAppStatus } from "@/components/whatsapp/WhatsAppStatus";
import { QRCodeCard } from "@/components/whatsapp/QRCodeCard";
import { SendMessageCard } from "@/components/whatsapp/SendMessageCard";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — LocalBoost" }] }),
  component: WhatsAppPage,
});

function WhatsAppPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center justify-between gap-3 border-b px-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <h1 className="font-semibold">WhatsApp</h1>
          </div>
          <WhatsAppProvider>
            <WhatsAppStatus />
          </WhatsAppProvider>
        </header>
        <WhatsAppProvider>
          <div className="flex flex-col items-center gap-6 p-6">
            <QRCodeCard />
            <SendMessageCard />
          </div>
        </WhatsAppProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
