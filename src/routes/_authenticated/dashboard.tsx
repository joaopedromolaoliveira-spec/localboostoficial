import { createFileRoute } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Users, CheckCircle2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Agenda" }] }),
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
        <div className="p-6 space-y-6"><DashboardContent /></div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function DashboardContent() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const in7d = new Date(Date.now() + 7 * 86400_000).toISOString();
      const [contacts, upcoming, confirmed, msgs, next] = await Promise.all([
        supabase.from("contacts").select("*", { count: "exact", head: true }),
        supabase.from("appointments").select("*", { count: "exact", head: true }).gte("start_time", now).in("status", ["PENDING_CONFIRMATION", "CONFIRMED"]),
        supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "CONFIRMED").gte("start_time", now).lte("start_time", in7d),
        supabase.from("message_logs").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400_000).toISOString()),
        supabase.from("appointments").select("id, start_time, end_time, status, subject, contact:contacts(name, phone_number)").gte("start_time", now).order("start_time").limit(8),
      ]);
      return {
        contacts: contacts.count ?? 0,
        upcoming: upcoming.count ?? 0,
        confirmed: confirmed.count ?? 0,
        msgs24h: msgs.count ?? 0,
        next: (next.data ?? []) as Array<{ id: string; start_time: string; end_time: string; status: string; subject: string | null; contact: { name: string | null; phone_number: string } | null }>,
      };
    },
  });

  const cards = [
    { label: "Agendamentos futuros", value: data?.upcoming ?? 0, icon: Calendar },
    { label: "Confirmados (7 dias)", value: data?.confirmed ?? 0, icon: CheckCircle2 },
    { label: "Contatos", value: data?.contacts ?? 0, icon: Users },
    { label: "Mensagens 24h", value: data?.msgs24h ?? 0, icon: MessageSquare },
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
        <CardHeader><CardTitle className="text-base">Próximos agendamentos</CardTitle></CardHeader>
        <CardContent>
          {!data?.next.length ? (
            <p className="text-sm text-muted-foreground">Nenhum agendamento futuro.</p>
          ) : (
            <ul className="divide-y">
              {data.next.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{a.contact?.name ?? a.contact?.phone_number ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{a.subject ?? "Consulta"} · {a.status}</p>
                  </div>
                  <div className="text-sm text-right">
                    {format(new Date(a.start_time), "EEE dd/MM 'às' HH:mm", { locale: ptBR })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
