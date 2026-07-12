import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Webhook, Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações" }] }),
  component: SettingsPage,
});

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function SettingsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Configurações</h1>
        </header>
        <div className="p-6 space-y-6 max-w-3xl">
          <ChatlingSection />
          <BotSection />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ChatlingSection() {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Webhook className="h-4 w-4" /> Widget de atendimento (Chatling)</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>O widget de chat da LocalBoost aparece automaticamente em todas as páginas do app.</p>
        <p>Para editar respostas, base de conhecimento e aparência, acesse o painel do Chatling.</p>
        <Button asChild variant="outline" size="sm" className="mt-2">
          <a href="https://app.chatling.ai/" target="_blank" rel="noopener noreferrer">Abrir Chatling <Copy className="ml-2 h-3.5 w-3.5" /></a>
        </Button>
      </CardContent>
    </Card>
  );
}

function BotSection() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["bot"],
    queryFn: async () => (await supabase.from("bot_settings").select("*").maybeSingle()).data,
  });
  const [form, setForm] = useState({ name: "", personality: "", system_prompt: "" });
  useEffect(() => { if (data) setForm({ name: data.name, personality: data.personality, system_prompt: data.system_prompt }); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      const { error } = await supabase.from("bot_settings").update(form).eq("owner_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Bot salvo"); qc.invalidateQueries({ queryKey: ["bot"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  return (
    <Card><CardHeader><CardTitle>Assistente</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Personalidade</Label><Textarea rows={2} value={form.personality} onChange={(e) => setForm({ ...form, personality: e.target.value })} /></div>
        <div><Label>Prompt do sistema</Label><Textarea rows={6} value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} /></div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar assistente"}</Button>
      </CardContent>
    </Card>
  );
}

