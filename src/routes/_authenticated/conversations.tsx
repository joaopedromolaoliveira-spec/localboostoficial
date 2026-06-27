import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Bot, MessageSquare } from "lucide-react";
import { formatPhone, initials } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/conversations")({
  head: () => ({ meta: [{ title: "Conversas — LocalBoost" }] }),
  component: ConversationsPage,
});

function ConversationsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const ch = supabase.channel("convs-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Conversas</h1>
        </header>
        <div className="grid h-[calc(100vh-3.5rem)] grid-cols-1 md:grid-cols-[320px_1fr]">
          <ConversationList selectedId={selectedId} onSelect={setSelectedId} />
          {selectedId ? <ChatPanel conversationId={selectedId} /> : (
            <div className="hidden items-center justify-center text-muted-foreground md:flex">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 opacity-30" />
                <p className="mt-3">Selecione uma conversa</p>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ConversationList({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const { data: convs = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, status, last_message_at, last_message_preview, unread_count, ai_enabled, contact:contacts(id, name, phone, avatar_url)")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  if (isLoading) return <div className="border-r p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <aside className="overflow-y-auto border-r">
      {convs.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma conversa ainda.</div>
      ) : convs.map((c) => {
        const active = c.id === selectedId;
        return (
          <button key={c.id} onClick={() => onSelect(c.id)}
            className={`flex w-full items-start gap-3 border-b p-3 text-left transition-colors hover:bg-accent ${active ? "bg-accent" : ""}`}>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 font-semibold text-primary">
              {initials(c.contact?.name ?? c.contact?.phone)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{c.contact?.name || formatPhone(c.contact?.phone)}</p>
                {c.ai_enabled && <Bot className="h-3 w-3 text-primary" />}
              </div>
              <p className="truncate text-xs text-muted-foreground">{c.last_message_preview || "Sem mensagens"}</p>
              {c.last_message_at && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: ptBR })}
                </p>
              )}
            </div>
            {c.unread_count > 0 && <Badge className="bg-primary">{c.unread_count}</Badge>}
          </button>
        );
      })}
    </aside>
  );
}

function ChatPanel({ conversationId }: { conversationId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conv } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      const { data } = await supabase.from("conversations")
        .select("*, contact:contacts(*)").eq("id", conversationId).maybeSingle();
      return data as any;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("messages")
        .select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`msgs-${conversationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, () => {
        qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, qc]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const send = useMutation({
    mutationFn: async () => {
      const body = text.trim();
      if (!body) return;
      const res = await fetch("/api/public/waha/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId, text: body }),
      });
      if (!res.ok) throw new Error(await res.text());
      setText("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAI = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("conversations").update({ ai_enabled: !conv?.ai_enabled }).eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversation", conversationId] }),
  });

  return (
    <section className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b p-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 font-semibold text-primary">
          {initials(conv?.contact?.name ?? conv?.contact?.phone)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{conv?.contact?.name || formatPhone(conv?.contact?.phone)}</p>
          <p className="text-xs text-muted-foreground">{formatPhone(conv?.contact?.phone)}</p>
        </div>
        <Button variant={conv?.ai_enabled ? "default" : "outline"} size="sm" onClick={() => toggleAI.mutate()} className="gap-2">
          <Bot className="h-4 w-4" /> IA {conv?.ai_enabled ? "ligada" : "desligada"}
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4">
        {messages.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma mensagem.</div>}
        {messages.map((m: any) => {
          const out = m.direction === "outbound";
          return (
            <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm ${out ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                {m.is_ai && <div className="mb-1 flex items-center gap-1 text-[10px] opacity-80"><Bot className="h-3 w-3" /> IA</div>}
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send.mutate(); }} className="flex gap-2 border-t p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite sua mensagem…" disabled={send.isPending} />
        <Button type="submit" disabled={send.isPending || !text.trim()} className="gap-2">
          {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </section>
  );
}
