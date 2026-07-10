import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({ meta: [{ title: "Agendamentos" }] }),
  component: AppointmentsPage,
});

const STATUS_COLOR: Record<string, string> = {
  PENDING_CONFIRMATION: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  CONFIRMED: "bg-green-500/15 text-green-700 dark:text-green-300",
  CANCELLED: "bg-red-500/15 text-red-700 dark:text-red-300",
  RESCHEDULE_REQUESTED: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
};

function AppointmentsPage() {
  const [filter, setFilter] = useState<string>("all");
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["appointments", filter],
    queryFn: async () => {
      let q = supabase.from("appointments").select("*, contact:contacts(name, phone_number)").order("start_time", { ascending: true });
      if (filter !== "all") q = q.eq("status", filter as "PENDING_CONFIRMATION");
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("appointments").update({ status: status as "CONFIRMED" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["appointments"] }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("appointments").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["appointments"] }); },
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Agendamentos</h1>
          <div className="ml-auto flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDING_CONFIRMATION">Pendentes</SelectItem>
                <SelectItem value="CONFIRMED">Confirmados</SelectItem>
                <SelectItem value="CANCELLED">Cancelados</SelectItem>
                <SelectItem value="RESCHEDULE_REQUESTED">Reagendar</SelectItem>
              </SelectContent>
            </Select>
            <NewAppointmentDialog />
          </div>
        </header>
        <div className="p-6 space-y-3">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> :
            data.length === 0 ? <Card><CardContent className="py-16 text-center text-muted-foreground">Nenhum agendamento.</CardContent></Card> :
            data.map((a) => (
              <Card key={a.id} className="shadow-card">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold">{a.contact?.name ?? a.contact?.phone_number ?? "—"}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(a.start_time), "EEE dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {a.subject ? ` · ${a.subject}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLOR[a.status] ?? ""}>{a.status}</Badge>
                    <Select value={a.status} onValueChange={(v) => updateStatus.mutate({ id: a.id, status: v })}>
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING_CONFIRMATION">Pendente</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmar</SelectItem>
                        <SelectItem value="CANCELLED">Cancelar</SelectItem>
                        <SelectItem value="RESCHEDULE_REQUESTED">Reagendar</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function NewAppointmentDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contact_id: "", start: "", duration: 60, subject: "", notes: "" });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-select"],
    queryFn: async () => (await supabase.from("contacts").select("id, name, phone_number").order("name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      if (!form.contact_id || !form.start) throw new Error("Preencha os campos");
      const start = new Date(form.start);
      const end = new Date(start.getTime() + form.duration * 60_000);
      const { error } = await supabase.from("appointments").insert({
        owner_id: user.id, contact_id: form.contact_id,
        start_time: start.toISOString(), end_time: end.toISOString(),
        subject: form.subject || null, notes: form.notes || null,
        status: "CONFIRMED",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Agendamento criado"); qc.invalidateQueries({ queryKey: ["appointments"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Novo</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo agendamento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Contato</Label>
            <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
              <SelectTrigger><SelectValue placeholder="Escolha…" /></SelectTrigger>
              <SelectContent>{contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name ?? c.phone_number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Data e hora</Label>
            <Input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
          <div><Label>Duração (min)</Label>
            <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></div>
          <div><Label>Assunto</Label>
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
