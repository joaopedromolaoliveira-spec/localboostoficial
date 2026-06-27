import { createFileRoute } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Users, Workflow, Send, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrialBanner } from "@/components/trial-banner";

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
          <SidebarTrigger />
          <h1 className="font-semibold">Visão geral</h1>
        </header>
        <div className="p-6 space-y-6">
          <TrialBanner />
          <DashboardContent />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function DashboardContent() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      // Placeholder until conversations/messages/contacts tables exist (Fase 3)
      const { count: contactsCount } = await supabase
        .from("profiles").select("*", { count: "exact", head: true }).eq("id", user.id);
      return {
        conversations: 0,
        messagesToday: 0,
        newContacts: contactsCount ?? 0,
        activeAutomations: 0,
      };
    },
  });

  const weekData = [
    { day: "Seg", msgs: 0 }, { day: "Ter", msgs: 0 }, { day: "Qua", msgs: 0 },
    { day: "Qui", msgs: 0 }, { day: "Sex", msgs: 0 }, { day: "Sáb", msgs: 0 }, { day: "Dom", msgs: 0 },
  ];

  const cards = [
    { label: "Conversas abertas", value: stats?.conversations ?? 0, icon: MessageSquare },
    { label: "Mensagens hoje", value: stats?.messagesToday ?? 0, icon: Send },
    { label: "Novos contatos", value: stats?.newContacts ?? 0, icon: Users },
    { label: "Automações ativas", value: stats?.activeAutomations ?? 0, icon: Workflow },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2 text-3xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Mensagens por dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="msgs" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Conecte seu WhatsApp para ver dados reais em tempo real.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
