import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Relatórios — LocalBoost" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [contacts, conversations, messages, campaigns] = await Promise.all([
        supabase.from("contacts").select("*", { count: "exact", head: true }),
        supabase.from("conversations").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("campaigns").select("*", { count: "exact", head: true }),
      ]);
      return {
        contacts: contacts.count ?? 0, conversations: conversations.count ?? 0,
        messages: messages.count ?? 0, campaigns: campaigns.count ?? 0,
      };
    },
  });

  async function exportCSV() {
    const { data: contacts } = await supabase.from("contacts").select("name,phone,email,stage,tags,created_at");
    if (!contacts) { toast.error("Sem dados"); return; }
    const header = "Nome,Telefone,E-mail,Etapa,Tags,Criado em\n";
    const rows = contacts.map((c) =>
      `"${c.name ?? ""}","${c.phone}","${c.email ?? ""}","${c.stage}","${(c.tags ?? []).join(";")}","${c.created_at}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `contatos-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Exportado");
  }

  const stats = [
    { label: "Total de contatos", value: data?.contacts },
    { label: "Conversas", value: data?.conversations },
    { label: "Mensagens trocadas", value: data?.messages },
    { label: "Campanhas", value: data?.campaigns },
  ];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Relatórios</h1>
        </header>
        <div className="p-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="shadow-card">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="mt-2 text-3xl font-bold">{s.value ?? 0}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="shadow-card">
            <CardHeader><CardTitle>Exportações</CardTitle></CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" /> Exportar contatos (CSV)</Button>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
