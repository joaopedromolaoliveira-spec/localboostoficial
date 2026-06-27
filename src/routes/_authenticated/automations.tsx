import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Workflow, Loader2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({ meta: [{ title: "Automações — LocalBoost" }] }),
  component: AutomationsPage,
});

const TRIGGER_LABEL: Record<string, string> = {
  keyword: "Palavra-chave", first_message: "Primeira mensagem", tag_added: "Tag adicionada",
  schedule: "Agendamento", webhook: "Webhook",
};

function AutomationsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["automations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("automations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("automations").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("automations").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Automação removida"); qc.invalidateQueries({ queryKey: ["automations"] }); },
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Automações</h1>
          <div className="ml-auto"><NewAutomationDialog /></div>
        </header>
        <div className="p-6 space-y-3">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> :
            data.length === 0 ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground">
                <Workflow className="mx-auto h-10 w-10 opacity-30" />
                <p className="mt-3">Nenhuma automação. Crie a primeira para responder automaticamente.</p>
              </CardContent></Card>
            ) : data.map((a: any) => (
              <Card key={a.id} className="shadow-card">
                <CardContent className="flex items-center gap-4 p-4">
                  <Switch checked={a.enabled} onCheckedChange={(v) => toggle.mutate({ id: a.id, enabled: v })} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{a.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{TRIGGER_LABEL[a.trigger_type]}</Badge>
                      {a.trigger_config?.keyword && <span>palavra: <code>{a.trigger_config.keyword}</code></span>}
                      <span>· {a.runs_count} execuções</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => del.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            ))}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function NewAutomationDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", trigger_type: "keyword", keyword: "", reply: "" });

  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      const { error } = await supabase.from("automations").insert({
        owner_id: user.id, name: form.name, trigger_type: form.trigger_type as any,
        trigger_config: { keyword: form.keyword },
        steps: [{ type: "send_text", text: form.reply }],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Automação criada");
      qc.invalidateQueries({ queryKey: ["automations"] });
      setOpen(false);
      setForm({ name: "", trigger_type: "keyword", keyword: "", reply: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2 shadow-glow"><Plus className="h-4 w-4" /> Nova automação</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova automação</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Gatilho</Label>
            <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword">Palavra-chave recebida</SelectItem>
                <SelectItem value="first_message">Primeira mensagem do contato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.trigger_type === "keyword" && (
            <div><Label>Palavra-chave (case-insensitive)</Label>
              <Input placeholder="preço, horário, ..." value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} /></div>
          )}
          <div><Label>Resposta automática</Label>
            <Textarea rows={4} value={form.reply} onChange={(e) => setForm({ ...form, reply: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
