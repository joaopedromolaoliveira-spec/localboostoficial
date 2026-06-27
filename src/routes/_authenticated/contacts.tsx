import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Phone, Mail, Loader2, Trash2 } from "lucide-react";
import { STAGE_LABEL, formatPhone, initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({ meta: [{ title: "Contatos & CRM — LocalBoost" }] }),
  component: ContactsPage,
});

type Contact = { id: string; name: string | null; phone: string; email: string | null; stage: string; tags: string[]; notes: string | null; created_at: string };

function ContactsPage() {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string>("all");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", stage],
    queryFn: async (): Promise<Contact[]> => {
      let q = supabase.from("contacts").select("*").order("created_at", { ascending: false });
      if (stage !== "all") q = q.eq("stage", stage as any);
      const { data, error } = await q;
      if (error) throw error;
      return data as any;
    },
  });

  const filtered = contacts.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Contatos & CRM</h1>
          <div className="ml-auto"><NewContactDialog /></div>
        </header>
        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome, telefone, e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as etapas</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="qualified">Qualificado</SelectItem>
                <SelectItem value="customer">Cliente</SelectItem>
                <SelectItem value="lost">Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> :
            filtered.length === 0 ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground">Nenhum contato encontrado. Crie o primeiro.</CardContent></Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((c) => <ContactCard key={c.id} contact={c} />)}
              </div>
            )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("contacts").delete().eq("id", contact.id); if (error) throw error; },
    onSuccess: () => { toast.success("Contato removido"); qc.invalidateQueries({ queryKey: ["contacts"] }); },
  });
  return (
    <Card className="shadow-card transition-shadow hover:shadow-elevated">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 font-semibold text-primary">{initials(contact.name ?? contact.phone)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold">{contact.name || "Sem nome"}</p>
              <Badge variant="secondary" className="shrink-0">{STAGE_LABEL[contact.stage]}</Badge>
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {formatPhone(contact.phone)}</p>
            {contact.email && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {contact.email}</p>}
            {contact.tags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">{contact.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}</div>
            )}
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => del.mutate()} disabled={del.isPending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NewContactDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", stage: "lead", tags: "", notes: "" });

  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      const phone = form.phone.replace(/\D/g, "");
      if (phone.length < 10) throw new Error("Telefone inválido");
      const { error } = await supabase.from("contacts").insert({
        owner_id: user.id, name: form.name || null, phone, email: form.email || null,
        stage: form.stage as any, notes: form.notes || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contato criado");
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setOpen(false);
      setForm({ name: "", phone: "", email: "", stage: "lead", tags: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2 shadow-glow"><Plus className="h-4 w-4" /> Novo contato</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo contato</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Telefone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="5511999998888" /></div>
          <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Etapa</Label>
            <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="qualified">Qualificado</SelectItem>
                <SelectItem value="customer">Cliente</SelectItem>
                <SelectItem value="lost">Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Tags (separadas por vírgula)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
          <div><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar contato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
