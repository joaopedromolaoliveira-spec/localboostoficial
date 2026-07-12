import { createFileRoute } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MessageSquare, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LocalBoost" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Visão geral</h1>
        </header>
        <div className="p-6 space-y-6 max-w-4xl">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> Seu agente de IA está ativo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>O assistente da LocalBoost está disponível no canto inferior direito de qualquer página. Clique na bolha de chat para conversar.</p>
              <p>Ele responde 24/7, em português, e usa o conhecimento configurado no painel Chatling.</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent p-2 text-accent-foreground"><Bot className="h-5 w-5" /></div>
                  <div>
                    <p className="font-semibold">Agente treinado</p>
                    <p className="text-xs text-muted-foreground">Personalizado para seu negócio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent p-2 text-accent-foreground"><MessageSquare className="h-5 w-5" /></div>
                  <div>
                    <p className="font-semibold">Widget global</p>
                    <p className="text-xs text-muted-foreground">Disponível em todas as páginas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
