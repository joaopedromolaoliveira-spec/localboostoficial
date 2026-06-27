import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, CreditCard, TrendingUp } from "lucide-react";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!data || data.length === 0) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Admin — LocalBoost" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [users, subs, contacts, messages] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("plan, status, amount_cents"),
        supabase.from("contacts").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
      ]);
      const mrr = (subs.data ?? []).filter((s) => s.status === "active").reduce((sum, s) => sum + (s.amount_cents ?? 0), 0);
      return {
        users: users.count ?? 0,
        contacts: contacts.count ?? 0,
        messages: messages.count ?? 0,
        mrr,
        arr: mrr * 12,
        activeSubs: (subs.data ?? []).filter((s) => s.status === "active").length,
      };
    },
  });

  const cards = [
    { label: "Usuários", value: data?.users ?? 0, icon: Users },
    { label: "Assinaturas ativas", value: data?.activeSubs ?? 0, icon: CreditCard },
    { label: "MRR", value: brl(data?.mrr ?? 0), icon: TrendingUp },
    { label: "ARR", value: brl(data?.arr ?? 0), icon: TrendingUp },
  ];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><Shield className="h-4 w-4 text-primary" /><h1 className="font-semibold">Painel Administrativo</h1>
        </header>
        <div className="p-6 space-y-6">
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
            <CardHeader><CardTitle>Atividade da plataforma</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-sm text-muted-foreground">Contatos totais</p><p className="text-2xl font-bold">{data?.contacts ?? 0}</p></div>
                <div><p className="text-sm text-muted-foreground">Mensagens totais</p><p className="text-2xl font-bold">{data?.messages ?? 0}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
