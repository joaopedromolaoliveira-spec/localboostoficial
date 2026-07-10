import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Loader2, MessageSquare } from "lucide-react";
import { formatPhone, initials } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/conversations")({
  head: () => ({ meta: [{ title: "Conversas" }] }),
  component: ConversationsPage,
});

function ConversationsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const ch = supabase.channel("logs-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_logs" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations-list"] });
        qc.invalidateQueries({ queryKey: ["conv-messages", selectedId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, selectedId]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Conversas</h1>
        </header>
        <div className="grid h-[calc(100vh-3.5rem)] grid-cols-1 md:grid-cols-[320px_1fr]">
          <ConversationList selectedId={selectedId} onSelect={setSelectedId} />
          {selectedId ? <MessagesPanel contactId={selectedId} /> : (
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
  const { data = [], isLoading } = useQuery({
    queryKey: ["conversations-list"],
    queryFn: async () => {
      const { data } = await supabase.from("conversations")
        .select("id, contact_id, last_user_message_at, last_user_message_text, last_bot_message_text, contact:contacts(id, name, phone_number)")
        .order("last_user_message_at", { ascending: false, nullsFirst: false })
        .limit(100);
      return data ?? [];
    },
  });

  if (isLoading) return <div className="border-r p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return (
    <aside className="overflow-y-auto border-r">
      {data.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma conversa ainda. As mensagens do WhatsApp aparecerão aqui.</div>
      ) : data.map((c) => {
        const active = c.contact_id === selectedId;
        const preview = c.last_user_message_text ?? c.last_bot_message_text ?? "";
        return (
          <button key={c.id} onClick={() => onSelect(c.contact_id)}
            className={`flex w-full items-start gap-3 border-b p-3 text-left hover:bg-accent ${active ? "bg-accent" : ""}`}>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 font-semibold text-primary">
              {initials(c.contact?.name ?? c.contact?.phone_number)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{c.contact?.name ?? formatPhone(c.contact?.phone_number)}</p>
              <p className="truncate text-xs text-muted-foreground">{preview}</p>
              {c.last_user_message_at && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.last_user_message_at), { addSuffix: true, locale: ptBR })}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </aside>
  );
}

function MessagesPanel({ contactId }: { contactId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["conv-messages", contactId],
    queryFn: async () => (await supabase.from("message_logs").select("*").eq("contact_id", contactId).order("created_at")).data ?? [],
  });
  return (
    <section className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4">
        {data.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma mensagem.</div>}
        {data.map((m) => {
          const out = m.direction === "outbound";
          return (
            <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${out ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                <div className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
