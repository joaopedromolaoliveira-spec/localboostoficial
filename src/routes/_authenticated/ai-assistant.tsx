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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Bot, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ai-assistant")({
  head: () => ({ meta: [{ title: "Assistente IA — LocalBoost" }] }),
  component: AIAssistantPage,
});

function AIAssistantPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Assistente IA</h1>
        </header>
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_400px]">
          <AssistantForm />
          <TestPanel />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AssistantForm() {
  const qc = useQueryClient();
  const { data: assistant, isLoading } = useQuery({
    queryKey: ["ai-assistant"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("ai_assistants").select("*").eq("owner_id", user.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    name: "Assistente",
    provider: "lovable" as const,
    model: "google/gemini-2.5-flash",
    system_prompt: "Você é um atendente cordial e prestativo. Responda em português, de forma curta e clara.",
    knowledge: "",
    enabled: false,
  });

  useEffect(() => {
    if (assistant) setForm({
      name: assistant.name, provider: assistant.provider as any, model: assistant.model,
      system_prompt: assistant.system_prompt, knowledge: assistant.knowledge ?? "", enabled: assistant.enabled,
    });
  }, [assistant]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      const { error } = await supabase.from("ai_assistants").upsert({ owner_id: user.id, ...form }, { onConflict: "owner_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assistente salvo"); qc.invalidateQueries({ queryKey: ["ai-assistant"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> Configuração do Assistente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div><p className="font-medium">Responder automaticamente</p>
            <p className="text-xs text-muted-foreground">Quando ligado, a IA responde nas conversas marcadas.</p></div>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Provedor</Label>
            <Select value={form.provider} onValueChange={(v: any) => setForm({ ...form, provider: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable">Lovable AI (Gemini)</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Modelo</Label>
          <Select value={form.model} onValueChange={(v) => setForm({ ...form, model: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (rápido, grátis)</SelectItem>
              <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (avançado)</SelectItem>
              <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
              <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Prompt do sistema</Label>
          <Textarea rows={5} value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} /></div>
        <div><Label>Base de conhecimento</Label>
          <Textarea rows={6} placeholder="Cole aqui FAQ, horários, preços, regras..." value={form.knowledge} onChange={(e) => setForm({ ...form, knowledge: e.target.value })} /></div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2 shadow-glow">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Salvar assistente
        </Button>
      </CardContent>
    </Card>
  );
}

function TestPanel() {
  const [input, setInput] = useState("Olá, vocês estão abertos hoje?");
  const [output, setOutput] = useState("");
  const test = useMutation({
    mutationFn: async () => {
      setOutput("");
      const { authedFetch } = await import("@/lib/api-client");
      const res = await authedFetch("/api/public/ai/test", {
        method: "POST",
        body: JSON.stringify({ message: input }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOutput(data.text);
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card className="shadow-card h-fit">
      <CardHeader><CardTitle className="text-base">Testar resposta</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Textarea rows={3} value={input} onChange={(e) => setInput(e.target.value)} />
        <Button onClick={() => test.mutate()} disabled={test.isPending} className="w-full">
          {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
        </Button>
        {output && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{output}</div>
        )}
      </CardContent>
    </Card>
  );
}
