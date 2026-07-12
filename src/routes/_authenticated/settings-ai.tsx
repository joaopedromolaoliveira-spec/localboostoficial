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
import { Loader2, Plus, Trash2, FileText } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings-ai")({
  head: () => ({ meta: [{ title: "Configuração da IA" }] }),
  component: SettingsAIPage,
});

function SettingsAIPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <h1 className="font-semibold">Configuração da IA</h1>
        </header>
        <div className="p-6 space-y-6 max-w-4xl">
          <BotConfigSection />
          <FAQSection />
          <KnowledgeBaseSection />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function BotConfigSection() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["bot-config"],
    queryFn: async () => (await supabase.from("bot_settings").select("*").maybeSingle()).data,
  });

  const [form, setForm] = useState({
    name: "",
    objective: "",
    personality: "",
    system_prompt: "",
    language: "pt-BR",
    welcome_message: "",
    out_of_hours_message: "",
    ai_provider: "openai",
    ai_model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 1024,
    enable_human_handoff: true,
    enabled: false,
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name || "",
        objective: data.objective || "",
        personality: data.personality || "",
        system_prompt: data.system_prompt || "",
        language: data.language || "pt-BR",
        welcome_message: data.welcome_message || "",
        out_of_hours_message: data.out_of_hours_message || "",
        ai_provider: data.ai_provider || "openai",
        ai_model: data.ai_model || "gpt-4o-mini",
        temperature: data.temperature || 0.7,
        max_tokens: data.max_tokens || 1024,
        enable_human_handoff: data.enable_human_handoff ?? true,
        enabled: data.enabled ?? false,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      const { error } = await supabase.from("bot_settings").update(form).eq("owner_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração salva");
      qc.invalidateQueries({ queryKey: ["bot-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração do Assistente de IA</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Nome do Assistente</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Assistente LocalBoost"
          />
        </div>

        <div>
          <Label>Objetivo</Label>
          <Textarea
            rows={2}
            value={form.objective}
            onChange={(e) => setForm({ ...form, objective: e.target.value })}
            placeholder="Ex: Responder dúvidas dos clientes sobre produtos e serviços"
          />
        </div>

        <div>
          <Label>Personalidade</Label>
          <Textarea
            rows={2}
            value={form.personality}
            onChange={(e) => setForm({ ...form, personality: e.target.value })}
            placeholder="Ex: Cordial, prestativo, profissional"
          />
        </div>

        <div>
          <Label>Prompt do Sistema</Label>
          <Textarea
            rows={4}
            value={form.system_prompt}
            onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
            placeholder="Instruções detalhadas para o comportamento da IA"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Idioma</Label>
            <Input
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              placeholder="pt-BR"
            />
          </div>
          <div>
            <Label>Modelo de IA</Label>
            <Input
              value={form.ai_model}
              onChange={(e) => setForm({ ...form, ai_model: e.target.value })}
              placeholder="gpt-4o-mini"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Temperatura (0-1)</Label>
            <Input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <Label>Máximo de Tokens</Label>
            <Input
              type="number"
              value={form.max_tokens}
              onChange={(e) => setForm({ ...form, max_tokens: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <Label>Mensagem de Boas-vindas</Label>
          <Textarea
            rows={2}
            value={form.welcome_message}
            onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
            placeholder="Ex: Olá! Como posso ajudá-lo?"
          />
        </div>

        <div>
          <Label>Mensagem Fora do Horário</Label>
          <Textarea
            rows={2}
            value={form.out_of_hours_message}
            onChange={(e) => setForm({ ...form, out_of_hours_message: e.target.value })}
            placeholder="Ex: Estou fora do horário de atendimento..."
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enable_human_handoff}
              onChange={(e) => setForm({ ...form, enable_human_handoff: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Permitir transferência para atendente humano</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Ativar assistente</span>
          </label>
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}

function FAQSection() {
  const qc = useQueryClient();
  const { data: faqItems = [], isLoading } = useQuery({
    queryKey: ["faq-items"],
    queryFn: async () => {
      const { data } = await supabase
        .from("faq_items")
        .select("*")
        .order("order_index", { ascending: true });
      return data || [];
    },
  });

  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });

  const addFaq = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      const { error } = await supabase.from("faq_items").insert({
        owner_id: user.id,
        question: newFaq.question,
        answer: newFaq.answer,
        order_index: faqItems.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("FAQ adicionada");
      setNewFaq({ question: "", answer: "" });
      qc.invalidateQueries({ queryKey: ["faq-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteFaq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faq_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("FAQ removida");
      qc.invalidateQueries({ queryKey: ["faq-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perguntas Frequentes (FAQ)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {faqItems.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {faqItems.map((item: any) => (
              <div key={item.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm break-words">{item.question}</p>
                  <p className="text-xs text-muted-foreground break-words">{item.answer}</p>
                </div>
                <Button
                  onClick={() => deleteFaq.mutate(item.id)}
                  disabled={deleteFaq.isPending}
                  variant="ghost"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 border-t pt-4">
          <div>
            <Label>Pergunta</Label>
            <Input
              value={newFaq.question}
              onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
              placeholder="Ex: Qual é o horário de atendimento?"
            />
          </div>
          <div>
            <Label>Resposta</Label>
            <Textarea
              rows={2}
              value={newFaq.answer}
              onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
              placeholder="Ex: Atendemos de segunda a sexta, das 9h às 18h"
            />
          </div>
          <Button
            onClick={() => addFaq.mutate()}
            disabled={addFaq.isPending || !newFaq.question || !newFaq.answer}
            size="sm"
          >
            {addFaq.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Adicionar FAQ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function KnowledgeBaseSection() {
  const qc = useQueryClient();
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["knowledge-docs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("knowledge_documents")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const [newDoc, setNewDoc] = useState({ title: "", content: "", document_type: "general" });

  const addDoc = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      const { error } = await supabase.from("knowledge_documents").insert({
        owner_id: user.id,
        title: newDoc.title,
        content: newDoc.content,
        document_type: newDoc.document_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento adicionado à base de conhecimento");
      setNewDoc({ title: "", content: "", document_type: "general" });
      qc.invalidateQueries({ queryKey: ["knowledge-docs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("knowledge_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento removido");
      qc.invalidateQueries({ queryKey: ["knowledge-docs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Base de Conhecimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {docs.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {docs.map((doc: any) => (
              <div key={doc.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm break-words">{doc.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 break-words">{doc.content}</p>
                </div>
                <Button
                  onClick={() => deleteDoc.mutate(doc.id)}
                  disabled={deleteDoc.isPending}
                  variant="ghost"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 border-t pt-4">
          <div>
            <Label>Título do Documento</Label>
            <Input
              value={newDoc.title}
              onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
              placeholder="Ex: Política de Devoluções"
            />
          </div>
          <div>
            <Label>Conteúdo</Label>
            <Textarea
              rows={4}
              value={newDoc.content}
              onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
              placeholder="Adicione o conteúdo do documento aqui..."
            />
          </div>
          <div>
            <Label>Tipo de Documento</Label>
            <select
              value={newDoc.document_type}
              onChange={(e) => setNewDoc({ ...newDoc, document_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="general">Geral</option>
              <option value="policy">Política</option>
              <option value="product">Produto</option>
              <option value="service">Serviço</option>
            </select>
          </div>
          <Button
            onClick={() => addDoc.mutate()}
            disabled={addDoc.isPending || !newDoc.title || !newDoc.content}
            size="sm"
          >
            {addDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Adicionar Documento
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
