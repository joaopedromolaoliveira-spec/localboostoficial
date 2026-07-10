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
import { Plus, Search, Phone, Mail, Loader2, Trash2 } from "lucide-react";
import { formatPhone, initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({ meta: [{ title: "Contatos" }] }),
  component: ContactsPage,
});

function ContactsPage() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => (await supabase.from("contacts").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const filtered = data.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone_number.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Contatos</h1>
          <div className="ml-auto"><NewContactDialog /></div>
        </header>
        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, telefone, e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> :
            filtered.length === 0 ? <Card><CardContent className="py-16 text-center text-muted-foreground">Nenhum contato ainda.</CardContent></Card> :
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => <ContactCard key={c.id} contact={c} />)}
            </div>}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ContactCard({ contact }: { contact: { id: string; name: string | null; phone_number: string; email: string | null; notes: string | null } }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("contacts").delete().eq("id", contact.id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["contacts"] }); },
  });
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 font-semibold text-primary">{initials(contact.name ?? contact.phone_number)}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{contact.name ?? "Sem nome"}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {formatPhone(contact.phone_number)}</p>
            {contact.email && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {contact.email}</p>}
            {contact.notes && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{contact.notes}</p>}
          </div>
          <Button size="icon" variant="ghost" onClick={() => del.mutate()}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NewContactDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone_number: "", email: "", notes: "" });

  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      const phone = form.phone_number.replace(/\D/g, "");
      if (phone.length < 10) throw new Error("Telefone inválido");
      const { error } = await supabase.from("contacts").insert({
        owner_id: user.id, name: form.name || null, phone_number: phone,
        email: form.email || null, notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contato criado");
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setOpen(false);
      setForm({ name: "", phone_number: "", email: "", notes: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Novo contato</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo contato</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Telefone (com DDI)</Label><Input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="5511999998888" /></div>
          <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
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
