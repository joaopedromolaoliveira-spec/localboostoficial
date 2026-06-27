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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Megaphone, Loader2, Play } from "lucide-react";

export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({ meta: [{ title: "Campanhas — LocalBoost" }] }),
  component: CampaignsPage,
});

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-muted text-muted-foreground", scheduled: "bg-blue-500/15 text-blue-600",
  sending: "bg-amber-500/15 text-amber-600", done: "bg-primary/15 text-primary",
  canceled: "bg-muted text-muted-foreground", failed: "bg-destructive/15 text-destructive",
};

function CampaignsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const send = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/public/campaigns/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaign_id: id }) });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => { toast.success("Disparo iniciado"); qc.invalidateQueries({ queryKey: ["campaigns"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Campanhas</h1>
          <div className="ml-auto"><NewCampaignDialog /></div>
        </header>
        <div className="p-6 space-y-3">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> :
            data.length === 0 ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground">
                <Megaphone className="mx-auto h-10 w-10 opacity-30" />
                <p className="mt-3">Nenhuma campanha. Crie sua primeira difusão.</p>
              </CardContent></Card>
            ) : data.map((c: any) => (
              <Card key={c.id} className="shadow-card">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><p className="font-semibold">{c.name}</p>
                      <Badge className={STATUS_COLOR[c.status]}>{c.status}</Badge></div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Enviadas: {c.sent_count}/{c.total_count} · Falhas: {c.failed_count}</p>
                  </div>
                  {c.status === "draft" && (
                    <Button onClick={() => send.mutate(c.id)} disabled={send.isPending} className="gap-2">
                      <Play className="h-4 w-4" /> Disparar
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function NewCampaignDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", message: "", target_stage: "all" });
  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      const { error } = await supabase.from("campaigns").insert({
        owner_id: user.id, name: form.name, message: form.message,
        target_stage: form.target_stage === "all" ? null : (form.target_stage as any),
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Campanha criada"); qc.invalidateQueries({ queryKey: ["campaigns"] }); setOpen(false); setForm({ name: "", message: "", target_stage: "all" }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2 shadow-glow"><Plus className="h-4 w-4" /> Nova campanha</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova campanha</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Mensagem</Label><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <div><Label>Público</Label>
            <Select value={form.target_stage} onValueChange={(v) => setForm({ ...form, target_stage: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os contatos</SelectItem>
                <SelectItem value="lead">Apenas Leads</SelectItem>
                <SelectItem value="qualified">Apenas Qualificados</SelectItem>
                <SelectItem value="customer">Apenas Clientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
